import { describe, expect, it } from 'vitest'

import { parseThemeFile, resolve } from './palette.ts'
import { rgba, toTokens } from './tokens.ts'

const TOKYO = `
mode = "dark"
accent = "#7aa2f7"
selection = "#292e42"
muted = "#414868"
background = "#1a1b26"
lighter_background = "#24283b"
foreground = "#a9b1d6"
dark_foreground = "#565f89"
bright_foreground = "#c0caf5"
red = "#f7768e"
yellow = "#e0af68"
green = "#9ece6a"
cyan = "#449dab"
blue = "#7aa2f7"
magenta = "#ad8ee6"
`

describe('rgba', () => {
  it('formats with CSS spacing', () => {
    expect(rgba('#1a1b26', 0.96)).toBe('rgba(26, 27, 38, 0.96)')
  })
})

describe('toTokens', () => {
  it('derives the default mapping from the palette', () => {
    const { palette } = parseThemeFile(TOKYO)
    expect(toTokens(resolve(palette))).toEqual({
      bg: '#1a1b26',
      surface: '#24283b',
      glass: 'rgba(26, 27, 38, 0.96)',
      border: '#292e42',
      fg: '#a9b1d6',
      dim: '#565f89',
      accent: '#7aa2f7',
      sigil: '#9ece6a',
      bang: '#e0af68',
      selected: 'rgba(122, 162, 247, 0.14)',
      warn: '#e0af68',
      danger: '#f7768e',
    })
  })

  it('applies [launcher] overrides verbatim without cascading', () => {
    const { palette, launcher } = parseThemeFile(
      `${TOKYO}\n[launcher]\nfg = "#c0caf5"\naccent = "#ff0000"\nglass = "rgba(0, 0, 0, 0.93)"`,
    )
    const t = toTokens(resolve(palette), launcher)
    expect(t.fg).toBe('#c0caf5')
    expect(t.accent).toBe('#ff0000')
    expect(t.glass).toBe('rgba(0, 0, 0, 0.93)')
    expect(t.selected).toBe('rgba(122, 162, 247, 0.14)')
  })
})
