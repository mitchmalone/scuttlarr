import {
  BUILTIN_THEME_SOURCES,
  type RenderedTheme,
  TEMPLATES,
  renderTheme,
} from '@scuttlarr/theme'
import { invoke } from '@tauri-apps/api/core'

import {
  type AppearanceConfig,
  type Config,
  DEFAULT_APPEARANCE,
} from './config'
import { type UserTheme, userThemes } from './user-themes'

/**
 * The theme rung (DECISIONS 2026-09-11): render the active theme through the
 * package's templates and hand the bytes to Rust (`theme_apply`), which stages,
 * swaps `~/.local/state/scuttlarr/current/theme/`, and fans out reloads.
 * Rendering is pure and lives in `@scuttlarr/theme`; this file is the seam.
 */

/** Mirrors `ThemeResult` in theme.rs. */
export type ThemeResult = {
  path: string
  reloaded: string[]
  failed: [string, string][]
  /** Editors not installed or not running — nothing to do. */
  skipped: string[]
}

/** The pre-rename default theme name still found in configs (`resolveTheme` aliases it too). */
const ALIASES: Record<string, string> = { launcharr: 'scuttlarr' }

/** Merged with defaults. Until the user has touched the policy (`config.appearance`
 * absent) the pair is seeded with the current theme on both halves, so turning the
 * engine on changes nothing until a light or dark theme is actually chosen. */
export function appearanceOf(config: Config): AppearanceConfig {
  const a: Partial<AppearanceConfig> = config.appearance ?? {}
  const seeded = config.appearance
    ? DEFAULT_APPEARANCE.pair
    : { light: config.theme, dark: config.theme }
  return {
    ...DEFAULT_APPEARANCE,
    ...a,
    schedule: { ...DEFAULT_APPEARANCE.schedule, ...(a.schedule ?? {}) },
    pair: { ...seeded, ...(a.pair ?? {}) },
    focus: { ...(a.focus ?? {}) },
  }
}

/** The engine only runs once the user has a policy on disk (Settings → General ▸
 * Theme or `theme ⏎` write one). An upgrade must never restyle a machine by itself
 * (JOURNAL 2026-09-11). */
export function policyConfigured(config: Config): boolean {
  return config.appearance !== undefined
}

/** Flip macOS with the theme only when *we* decide light/dark. In `system` mode the
 * OS is the source and flipping it back would loop. */
export function flipsMacos(config: Config): boolean {
  const a = appearanceOf(config)
  return a.macos && a.mode !== 'system'
}

/** Render the named theme: a user `colors.toml` (`~/.config/scuttlarr/themes/<name>/`,
 * hand files honoured) wins over a built-in of the same name. Token-only custom
 * themes (`config.themes`) have no palette to render surfaces from. */
export function renderNamed(
  themeName: string,
  user: UserTheme[] = [],
): RenderedTheme {
  const name = ALIASES[themeName] ?? themeName
  const mine = user.find((t) => t.name === name)
  if (mine) {
    return renderTheme({
      name,
      text: mine.text,
      templates: TEMPLATES,
      handFiles: mine.handFiles,
    })
  }
  const text = BUILTIN_THEME_SOURCES[name]
  if (!text) {
    throw new Error(
      `theme "${themeName}" has no colors.toml — only the app windows can wear it`,
    )
  }
  return renderTheme({ name, text, templates: TEMPLATES })
}

/** @deprecated alias kept for tests; built-ins only. */
export const renderBuiltin = (name: string) => renderNamed(name)

/** Apply `config.theme` everywhere the rung reaches. Fail-visible per surface. */
export async function applyThemeEverywhere(
  config: Config,
): Promise<ThemeResult> {
  const user = await userThemes().catch(() => [] as UserTheme[])
  const rendered = renderNamed(config.theme, user)
  const backgrounds =
    user.find((t) => t.name === rendered.name)?.backgrounds ?? []
  return invoke<ThemeResult>('theme_apply', {
    req: { ...themeApplyRequest(rendered, config), backgrounds },
  })
}

/** Mirrors `ThemeApply` in theme.rs. */
export type ThemeApply = {
  name: string
  mode: 'light' | 'dark'
  files: Record<string, string>
  osc: string
  appearance: boolean
  claude: string | null
  /** Absolute image paths the theme ships; Rust cycles through them. */
  backgrounds: string[]
  editors: boolean
  vscode: string | null
  zed: string | null
  btop: string | null
  neovimColorscheme: string | null
  helixTheme: string | null
}

/** Files that live outside the state dir go in their own slots; the rest is the
 * theme dir. The editor payloads ride along only when `appearance.editors` is on
 * (`neovim.lua` stays in the dir either way — it's a file to source, not a reload). */
export function themeApplyRequest(
  rendered: RenderedTheme,
  config: Config,
): ThemeApply {
  const {
    'claude.json': claude,
    'vscode-theme.json': vscode,
    'zed-theme.json': zed,
    'btop.theme': btop,
    ...files
  } = rendered.files
  const editors = appearanceOf(config).editors
  return {
    name: rendered.name,
    mode: rendered.mode,
    files,
    osc: rendered.osc,
    appearance: flipsMacos(config),
    claude: claude ?? null,
    backgrounds: [],
    editors,
    vscode: (editors && vscode) || null,
    zed: (editors && zed) || null,
    btop: (editors && btop) || null,
    neovimColorscheme: editors ? rendered.editors.neovim_colorscheme : null,
    helixTheme: editors ? rendered.editors.helix_theme : null,
  }
}

export function themeCurrent(): Promise<string | null> {
  return invoke<string | null>('theme_current')
}
