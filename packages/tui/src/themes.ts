/**
 * Themes: a flat map of the color tokens both windows already style with. Built-ins live
 * here; user themes are plain JSON in config.json under `themes` (name → partial token
 * map), overlaying the scuttlarr defaults — or, when named after a built-in, that
 * built-in. Selection is `config.theme`; unknown names fall back to `scuttlarr` so a
 * hand-edit can't blank the UI.
 *
 * Reachable as `@scuttlarr/tui/themes` as well as through the barrel, and that second
 * entry point is load-bearing: this module is pure data, so a React Server Component
 * (apps/www) can import the tokens directly. Going through `.` instead drags in
 * `components/controls.tsx`, whose hooks fail a server build. Keep it free of React.
 */
import type { ThemeTokens } from '@scuttlarr/theme/tokens'

import { BUILTIN_THEMES } from './themes.generated'

/**
 * The token shape is owned by `@scuttlarr/theme` (packages/theme/src/theme-tokens.ts); the
 * built-in map is generated from `packages/theme/themes/<name>/colors.toml` — edit the
 * palette, then `pnpm --filter @scuttlarr/theme build`. Never hand-edit the map.
 */
export type { ThemeTokens }
export { BUILTIN_THEMES }

const DEFAULT_THEME = 'scuttlarr'

/** Names that meant something before the 2026-09-11 rename; configs still carry them. */
const THEME_ALIASES: Record<string, string> = { launcharr: 'scuttlarr' }

export type CustomThemes = Record<string, Partial<ThemeTokens>> | undefined

/** Resolve a theme name against built-ins + config-defined customs. */
export function resolveTheme(name: string, themes: CustomThemes): ThemeTokens {
  const custom = themes?.[name]
  const canonical = custom ? name : (THEME_ALIASES[name] ?? name)
  const base = BUILTIN_THEMES[canonical] ?? BUILTIN_THEMES[DEFAULT_THEME]!
  return custom ? { ...base, ...custom } : base
}

/** Selectable theme names: built-ins first, then customs, deduped, stable order. */
export function themeNames(themes: CustomThemes): string[] {
  const builtin = Object.keys(BUILTIN_THEMES)
  const custom = Object.keys(themes ?? {}).filter((n) => !BUILTIN_THEMES[n])
  return [...builtin, ...custom]
}

/** Whether a #rgb/#rrggbb color reads as light (drives `color-scheme`). Non-hex → dark. */
export function isLightColor(color: string): boolean {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return false
  const hex = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join('') : m[1]!
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 140
}

/** The flat checkmark as a data URI in the theme's fg color (CSS vars can't reach into url()). */
function checkUrl(fg: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2.5 6.5l2.5 2.5 4.5-5' fill='none' stroke='${fg}' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/** CSS variable map for one window kind; each window applies its own. */
export function themeVars(
  t: ThemeTokens,
  kind: 'panel' | 'settings',
): Record<string, string> {
  const shared = {
    '--border': t.border,
    '--fg': t.fg,
    '--dim': t.dim,
    '--accent': t.accent,
    '--sigil': t.sigil,
    // Alert tiers: the bar (a panel-kind window) and settings both reach for them.
    '--warn': t.warn,
    '--danger': t.danger,
  }
  if (kind === 'panel') {
    return {
      ...shared,
      '--bg': t.glass,
      '--bang': t.bang,
      '--selected': t.selected,
    }
  }
  return {
    ...shared,
    '--bg': t.bg,
    '--panel': t.surface,
    '--check': checkUrl(t.fg),
  }
}

/** Apply a theme to the current document. */
export function applyTheme(
  theme: string,
  themes: CustomThemes,
  kind: 'panel' | 'settings',
): void {
  const tokens = resolveTheme(theme, themes)
  const vars = themeVars(tokens, kind)
  for (const [k, v] of Object.entries(vars)) {
    document.documentElement.style.setProperty(k, v)
  }
  // Native widgets (scrollbars, selects) must match the theme's polarity.
  document.documentElement.style.colorScheme = isLightColor(tokens.bg)
    ? 'light'
    : 'dark'
}
