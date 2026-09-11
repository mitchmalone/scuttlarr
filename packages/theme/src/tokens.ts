/**
 * The default derivation from a resolved Omarchy palette onto the launcher's tokens
 * (`ThemeTokens`, defined import-free in theme-tokens.ts). A theme's `[launcher]`
 * table overrides any token verbatim (no cascading: `selected` is derived from the
 * palette accent even when `accent` itself is pinned).
 */
import { parseHex } from './color.ts'
import type { ResolvedPalette } from './palette.ts'
import type { ThemeTokens } from './theme-tokens.ts'

export type { ThemeTokens }

export const GLASS_ALPHA = 0.96
export const SELECTED_ALPHA = 0.14

/** `#rrggbb` + alpha → `rgba(r, g, b, a)` in the CSS spacing the tokens use. */
export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function toTokens(
  palette: ResolvedPalette,
  launcher: Partial<ThemeTokens> = {},
): ThemeTokens {
  return {
    bg: palette.background,
    surface: palette.lighter_background,
    glass: rgba(palette.background, GLASS_ALPHA),
    border: palette.selection,
    fg: palette.foreground,
    dim: palette.dark_foreground,
    accent: palette.accent,
    sigil: palette.green,
    bang: palette.yellow,
    selected: rgba(palette.accent, SELECTED_ALPHA),
    warn: palette.yellow,
    danger: palette.red,
    ...launcher,
  }
}
