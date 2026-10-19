import {
  BUILTIN_THEMES,
  type ThemeTokens,
  isLightColor,
} from '@scuttlarr/tui/themes'

import { mixHex } from './hero-field'

/**
 * The whole page in an app theme. Every page token (`--bg`, `--fg`, `--cta`, …) is
 * derived from the picked theme's tokens, never hand-typed (invariant 8, DECISIONS
 * 2026-10-20), so the site wears exactly the palette the app does.
 *
 * Pure: the component side (`lib/app-theme.ts`) writes these onto `<html>`, and
 * `themeBootScript` does the same before first paint for a returning visitor.
 */

export const DEFAULT_THEME = 'scuttlarr'
export const THEME_STORAGE_KEY = 'scuttlarr-theme'

export function themeTokens(name: string): ThemeTokens {
  return BUILTIN_THEMES[name] ?? BUILTIN_THEMES[DEFAULT_THEME]!
}

/** A theme's display name: the slug title-cased (`tokyo-night` → Tokyo Night); scuttlarr stays lowercase. */
export function themeLabel(name: string): string {
  if (name === DEFAULT_THEME) return name
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function pageVars(t: ThemeTokens): Record<string, string> {
  const light = isLightColor(t.bg)
  // light themes' own fg is tuned for 13px panel rows; headlines want more contrast
  const fg = light ? mixHex(t.fg, '#000000', 0.3) : t.fg
  return {
    '--bg': t.bg,
    '--bg2': mixHex(t.bg, '#000000', light ? 0.035 : 0.22),
    '--panel': t.glass,
    '--chip': t.surface,
    '--border': t.border,
    '--hair': mixHex(t.bg, t.border, 0.6),
    '--fg': fg,
    '--body': mixHex(fg, t.dim, 0.3),
    '--muted': mixHex(fg, t.dim, 0.55),
    '--dim': t.dim,
    '--dim2': mixHex(t.dim, t.bg, 0.2),
    // the page's own `accent` is the max-contrast ink (links, hover borders), not the theme accent
    '--accent': mixHex(fg, light ? '#000000' : '#ffffff', 0.5),
    '--accent2': fg,
    '--green': t.good,
    '--amber': t.warn,
    '--danger': t.danger,
    '--cta': t.accent,
    '--cta-hover': mixHex(t.accent, light ? '#000000' : fg, 0.2),
    '--cta-fg': t.bg,
    '--sel': t.selected,
    '--logo': light ? 'none' : 'invert(1)',
    '--shadow': light
      ? '0 24px 60px rgba(31, 35, 40, 0.14)'
      : '0 24px 60px rgba(0, 0, 0, 0.55)',
    'color-scheme': light ? 'light' : 'dark',
  }
}

/**
 * Inline `<head>` script: applies a stored theme before first paint, so a returning
 * visitor never sees scuttlarr flash first. The vars are precomputed here at build
 * time, so the mapping above stays the only copy.
 */
export function themeBootScript(): string {
  const vars = Object.fromEntries(
    Object.entries(BUILTIN_THEMES).map(([name, t]) => [name, pageVars(t)]),
  )
  return `(function(){try{var v=${JSON.stringify(vars)},n=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}),t=n&&v[n];if(!t)return;var d=document.documentElement;for(var k in t)d.style.setProperty(k,t[k]);d.dataset.appTheme=n}catch(e){}})()`
}
