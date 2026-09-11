import { describe, expect, it } from 'vitest'

import {
  PALETTE_KEYS,
  PaletteError,
  parsePalette,
  parseThemeFile,
  resolve,
} from './palette.ts'

const TOKYO = `
mode = "dark"
accent = "#7aa2f7"
selection = "#292e42"
muted = "#414868"
background = "#1a1b26"
dark_background = "#13141c"
darker_background = "#0e0e14"
lighter_background = "#24283b"
foreground = "#a9b1d6"
dark_foreground = "#565f89"
light_foreground = "#b4bee6"
bright_foreground = "#c0caf5"
red = "#f7768e"
yellow = "#e0af68"
orange = "#eb927b"
green = "#9ece6a"
cyan = "#449dab"
blue = "#7aa2f7"
magenta = "#ad8ee6"
brown = "#75493d"
bright_red = "#ff7a93"
bright_yellow = "#ff9e64"
bright_green = "#b9f27c"
bright_cyan = "#0db9d7"
bright_blue = "#7da6ff"
bright_magenta = "#bb9af7"
`

const MINIMAL = `
background = "#1a1b26"
foreground = "#a9b1d6"
red = "#f7768e"
yellow = "#e0af68"
green = "#9ece6a"
cyan = "#449dab"
blue = "#7aa2f7"
magenta = "#ad8ee6"
`

describe('parsePalette', () => {
  it('returns the root keys verbatim as strings', () => {
    const p = parsePalette(TOKYO)
    expect(p.mode).toBe('dark')
    expect(p.background).toBe('#1a1b26')
    expect(Object.keys(p)).toHaveLength(26)
  })

  it('parseThemeFile splits out the [launcher] table and rejects unknown tokens', () => {
    const file = parseThemeFile(
      `${MINIMAL}\n[launcher]\nglass = "rgba(0, 0, 0, 0.93)"`,
    )
    expect(file.launcher).toEqual({ glass: 'rgba(0, 0, 0, 0.93)' })
    expect(file.palette.launcher).toBeUndefined()
    expect(() =>
      parseThemeFile(`${MINIMAL}\n[launcher]\nnope = "#fff"`),
    ).toThrow(/no token named "nope"/)
  })
})

describe('resolve', () => {
  it('keeps every explicit key untouched for a complete palette', () => {
    const raw = parsePalette(TOKYO)
    const r = resolve(raw)
    for (const [k, v] of Object.entries(raw)) expect(r[k], k).toBe(v)
  })

  it('fills every canonical key from a minimal palette', () => {
    const r = resolve(parsePalette(MINIMAL))
    for (const key of PALETTE_KEYS) expect(r[key], key).toBeTruthy()
  })

  it('derives shades with Omarchy mixes', () => {
    const r = resolve(parsePalette(MINIMAL))
    expect(r.dark_background).toBe('#14141d') // mix(bg, #000, 25%)
    expect(r.darker_background).toBe('#0d0e13') // mix(bg, #000, 50%)
    expect(r.bright_red).toBe('#f991a5') // mix(red, #fff, 20%)
    expect(r.orange).toBe(r.yellow)
    expect(r.brown).toBe('#705834') // mix(orange=#e0af68, #000, 50%)
  })

  it('cascades the foreground and selection fallbacks', () => {
    const r = resolve(parsePalette(MINIMAL))
    expect(r.light_foreground).toBe('#a9b1d6')
    expect(r.bright_foreground).toBe('#a9b1d6')
    expect(r.cursor).toBe(r.bright_foreground)
    expect(r.lighter_background).toBe('#1a1b26')
    expect(r.dark_foreground).toBe('#a9b1d6')
    expect(r.muted).toBe('#a9b1d6')
    expect(r.selection).toBe('#1a1b26')
    expect(r.selection_background).toBe(r.selection)
    expect(r.selection_foreground).toBe(r.bright_foreground)
    expect(r.accent).toBe(r.blue)
  })

  it('prefers selection_background for selection and keeps an explicit selection_foreground', () => {
    const r = resolve(
      parsePalette(
        `${MINIMAL}\nselection_background = "#333333"\nselection_foreground = "#ffffff"`,
      ),
    )
    expect(r.selection).toBe('#333333')
    expect(r.selection_foreground).toBe('#ffffff')
  })

  it('accepts a legacy colorN palette and maps it both ways', () => {
    const r = resolve(
      parsePalette(`
        color0 = "#000000"
        color1 = "#ff0000"
        color2 = "#00ff00"
        color3 = "#ffff00"
        color4 = "#0000ff"
        color5 = "#ff00ff"
        color6 = "#00ffff"
        color7 = "#cccccc"
        color8 = "#555555"
        color15 = "#ffffff"
      `),
    )
    expect(r.background).toBe('#000000')
    expect(r.foreground).toBe('#cccccc')
    expect(r.red).toBe('#ff0000')
    expect(r.muted).toBe('#555555')
    expect(r.dark_foreground).toBe('#555555')
    expect(r.selection).toBe('#555555')
    expect(r.bright_foreground).toBe('#ffffff')
    expect(r.bright_red).toBe('#ff3333') // mix(#ff0000, #fff, 20%)
    expect(r.color9).toBe('#ff3333')
    expect(r.bg).toBe('#000000')
    expect(r.purple).toBe('#ff00ff')
  })

  it('accepts legacy short names and purple', () => {
    const r = resolve(
      parsePalette(`
        bg = "#101010"
        fg = "#eeeeee"
        red = "#f00000"
        yellow = "#f0f000"
        green = "#00f000"
        cyan = "#00f0f0"
        blue = "#0000f0"
        purple = "#f000f0"
      `),
    )
    expect(r.background).toBe('#101010')
    expect(r.magenta).toBe('#f000f0')
    expect(r.bright_purple).toBe(r.bright_magenta)
  })

  it('detects mode from background luminance when absent, and honours theme_type', () => {
    expect(resolve(parsePalette(MINIMAL)).mode).toBe('dark')
    expect(
      resolve(parsePalette(MINIMAL.replace('#1a1b26', '#fdf6e3'))).mode,
    ).toBe('light')
    const legacy = resolve(parsePalette(`${MINIMAL}\ntheme_type = "light"`))
    expect(legacy.mode).toBe('light')
    expect(legacy.theme_type).toBe('light')
  })

  it('throws a PaletteError naming the missing base key', () => {
    expect(() => resolve({ background: '#000000' })).toThrow(PaletteError)
    expect(() => resolve({ background: '#000000' })).toThrow(
      /missing "foreground"/,
    )
  })
})
