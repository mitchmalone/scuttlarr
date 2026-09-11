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

/** Render the named built-in. Token-only custom themes (`config.themes`) have no
 * palette to render surfaces from — that needs a `colors.toml` overlay (plan 3.6). */
export function renderBuiltin(themeName: string): RenderedTheme {
  const name = ALIASES[themeName] ?? themeName
  const text = BUILTIN_THEME_SOURCES[name]
  if (!text) {
    throw new Error(
      `theme "${themeName}" has no colors.toml — only the app windows can wear it`,
    )
  }
  return renderTheme({ name, text, templates: TEMPLATES })
}

/** Apply `config.theme` everywhere the rung reaches. Fail-visible per surface. */
export async function applyThemeEverywhere(
  config: Config,
): Promise<ThemeResult> {
  const rendered = renderBuiltin(config.theme)
  const { 'claude.json': claude, ...files } = rendered.files
  return invoke<ThemeResult>('theme_apply', {
    req: {
      name: rendered.name,
      mode: rendered.mode,
      files,
      osc: rendered.osc,
      appearance: flipsMacos(config),
      claude: claude ?? null,
      wallpaper: null,
    },
  })
}

export function themeCurrent(): Promise<string | null> {
  return invoke<string | null>('theme_current')
}
