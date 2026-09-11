/**
 * Omarchy's `colors.toml` model: the raw keys verbatim, plus `resolve()`, a port of
 * the alias/derivation cascade in `omarchy-theme-color` so every consumer sees the
 * same palette an Omarchy template would.
 */
import { isHex6, isLight, mix } from './color.ts'
import type { ThemeTokens } from './tokens.ts'
import { parseToml } from './toml.ts'

/** Raw palette keys → values, exactly as written in the file (values as strings). */
export type Palette = Record<string, string>

export const PALETTE_KEYS = [
  'mode',
  'accent',
  'selection',
  'selection_background',
  'selection_foreground',
  'muted',
  'background',
  'dark_background',
  'darker_background',
  'lighter_background',
  'foreground',
  'dark_foreground',
  'light_foreground',
  'bright_foreground',
  'cursor',
  'red',
  'yellow',
  'orange',
  'green',
  'cyan',
  'blue',
  'magenta',
  'brown',
  'bright_red',
  'bright_yellow',
  'bright_green',
  'bright_cyan',
  'bright_blue',
  'bright_magenta',
] as const

export type PaletteKey = (typeof PALETTE_KEYS)[number]

/** Every canonical key present, plus the legacy aliases (`color0..15`, `bg`, `purple`…). */
export type ResolvedPalette = Record<PaletteKey, string> & {
  mode: 'light' | 'dark'
} & Record<string, string>

/** A whole `colors.toml`: the palette and the optional `[launcher]` token overrides. */
export type ThemeFile = { palette: Palette; launcher: Partial<ThemeTokens> }

export class PaletteError extends Error {}

export const TOKEN_KEYS = [
  'bg',
  'surface',
  'glass',
  'border',
  'fg',
  'dim',
  'accent',
  'sigil',
  'bang',
  'selected',
  'warn',
  'danger',
] as const satisfies ReadonlyArray<keyof ThemeTokens>

/** Parse the root table of a `colors.toml` into a raw palette. */
export function parsePalette(text: string): Palette {
  return parseThemeFile(text).palette
}

/** Parse a `colors.toml` including its `[launcher]` table. */
export function parseThemeFile(text: string): ThemeFile {
  const doc = parseToml(text)
  const palette: Palette = {}
  for (const [key, value] of Object.entries(doc.root))
    palette[key] = String(value)

  const launcher: Partial<ThemeTokens> = {}
  for (const [key, value] of Object.entries(doc.tables.launcher ?? {})) {
    if (!(TOKEN_KEYS as ReadonlyArray<string>).includes(key)) {
      throw new PaletteError(
        `[launcher] has no token named ${JSON.stringify(key)}`,
      )
    }
    launcher[key as keyof ThemeTokens] = String(value)
  }
  return { palette, launcher }
}

const LEGACY_PALETTE_ALIAS: Record<string, string> = {
  background: 'bg',
  dark_background: 'dark_bg',
  darker_background: 'darker_bg',
  lighter_background: 'lighter_bg',
  foreground: 'fg',
  dark_foreground: 'dark_fg',
  light_foreground: 'light_fg',
  bright_foreground: 'bright_fg',
}

const LEGACY_ANSI_ALIAS: Record<string, string> = {
  red: 'color1',
  green: 'color2',
  yellow: 'color3',
  blue: 'color4',
  magenta: 'color5',
  cyan: 'color6',
  bright_red: 'color9',
  bright_green: 'color10',
  bright_yellow: 'color11',
  bright_blue: 'color12',
  bright_magenta: 'color13',
  bright_cyan: 'color14',
}

const ANSI_ALIAS: Record<string, string> = {
  color0: 'background',
  color1: 'red',
  color2: 'green',
  color3: 'yellow',
  color4: 'blue',
  color5: 'magenta',
  color6: 'cyan',
  color7: 'foreground',
  color8: 'muted',
  color9: 'bright_red',
  color10: 'bright_green',
  color11: 'bright_yellow',
  color12: 'bright_blue',
  color13: 'bright_magenta',
  color14: 'bright_cyan',
  color15: 'bright_foreground',
}

const REQUIRED = [
  'background',
  'foreground',
  'red',
  'yellow',
  'green',
  'cyan',
  'blue',
  'magenta',
]

/**
 * Fill every derived key the way `omarchy-theme-color` does. Order matters and is
 * preserved from the script: legacy short names → colorN fallbacks → foreground and
 * selection cascades → mixed shades → ANSI back-aliases → mode.
 */
export function resolve(raw: Palette): ResolvedPalette {
  const c: Record<string, string> = { ...raw }
  const has = (k: string) => c[k] !== undefined && c[k] !== ''
  const alias = (key: string, fallback: string) => {
    if (!has(key) && has(fallback)) c[key] = c[fallback]!
  }
  const first = (...keys: string[]) => keys.find(has)
  const need = (key: string): string => {
    const v = c[key]
    if (!v) throw new PaletteError(`palette is missing ${JSON.stringify(key)}`)
    return v
  }
  const mixed = (key: string, a: string, b: string, amount: string) => {
    if (has(key)) return
    const start = need(a)
    if (!isHex6(start)) {
      throw new PaletteError(
        `cannot derive ${key}: ${a} is not #rrggbb (${start})`,
      )
    }
    c[key] = mix(start, b, amount)
  }

  for (const [key, legacy] of Object.entries(LEGACY_PALETTE_ALIAS))
    alias(key, legacy)

  alias('background', 'color0')
  alias('foreground', 'color7')
  if (has('background')) c.color0 = c.background!
  if (has('foreground')) c.color7 = c.foreground!

  for (const [key, legacy] of Object.entries(LEGACY_ANSI_ALIAS))
    alias(key, legacy)
  alias('magenta', 'purple')
  alias('bright_magenta', 'bright_purple')

  for (const key of REQUIRED) need(key)

  if (!has('light_foreground'))
    c.light_foreground = c[first('color7', 'foreground')!]!
  if (!has('bright_foreground'))
    c.bright_foreground = c[first('color15', 'foreground')!]!
  c.cursor = c.bright_foreground!
  if (!has('lighter_background'))
    c.lighter_background = c[first('color0', 'background')!]!
  if (!has('dark_foreground'))
    c.dark_foreground = c[first('color8', 'foreground')!]!
  if (!has('muted')) c.muted = c[first('color8', 'dark_foreground')!]!
  if (!has('selection')) {
    c.selection =
      c[first('selection_background', 'color8', 'color0', 'background')!]!
  }
  alias('selection_background', 'selection')
  alias('selection_foreground', 'bright_foreground')
  alias('orange', 'yellow')
  mixed('brown', 'orange', '#000000', '50%')
  // Extension: Omarchy leaves a missing accent unresolved (templates keep the raw
  // placeholder); the launcher needs one, and blue is what Omarchy's own themes pick.
  alias('accent', 'blue')

  mixed('dark_background', 'background', '#000000', '25%')
  mixed('darker_background', 'background', '#000000', '50%')
  mixed('bright_red', 'red', '#ffffff', '20%')
  mixed('bright_yellow', 'yellow', '#ffffff', '20%')
  mixed('bright_green', 'green', '#ffffff', '20%')
  mixed('bright_cyan', 'cyan', '#ffffff', '20%')
  mixed('bright_blue', 'blue', '#ffffff', '20%')
  mixed('bright_magenta', 'magenta', '#ffffff', '20%')
  alias('purple', 'magenta')
  alias('bright_purple', 'bright_magenta')

  for (const [key, semantic] of Object.entries(ANSI_ALIAS)) alias(key, semantic)
  for (const [key, legacy] of Object.entries(LEGACY_PALETTE_ALIAS)) {
    if (has(key)) c[legacy] = c[key]!
  }

  c.mode = resolveMode(c)
  c.theme_type = c.mode

  return c as ResolvedPalette
}

function resolveMode(c: Record<string, string>): 'light' | 'dark' {
  const declared = c.mode || c.theme_type
  if (declared === 'light' || declared === 'dark') return declared
  if (declared)
    throw new PaletteError(`mode must be "light" or "dark", got ${declared}`)
  const bg = c.background
  return bg && isHex6(bg) && isLight(bg) ? 'light' : 'dark'
}
