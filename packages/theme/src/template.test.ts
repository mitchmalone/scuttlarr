import { describe, expect, it } from 'vitest'

import { parsePalette, resolve } from './palette.ts'
import { TemplateError, render } from './template.ts'

const palette = resolve(
  parsePalette(`
    mode = "dark"
    accent = "#7aa2f7"
    background = "#1a1b26"
    foreground = "#a9b1d6"
    red = "#f7768e"
    yellow = "#e0af68"
    green = "#9ece6a"
    cyan = "#449dab"
    blue = "#7aa2f7"
    magenta = "#ad8ee6"
  `),
)

describe('render', () => {
  it('substitutes plain keys, including derived and legacy ones', () => {
    expect(
      render('bg={{ background }} m={{ mode }} t={{ theme_type }}', palette),
    ).toBe('bg=#1a1b26 m=dark t=dark')
    expect(render('{{ color1 }} {{ bright_red }}', palette)).toBe(
      '#f7768e #f991a5',
    )
  })

  it('supports _strip and _rgb suffixes', () => {
    expect(render('{{ background_strip }}', palette)).toBe('1a1b26')
    expect(render('{{ background_rgb }}', palette)).toBe('26,27,38')
  })

  it('mixes two keys by percentage or fraction', () => {
    // 26*.94+169*.06 = 34.58→35, 27*.94+177*.06=36, 38*.94+214*.06=48.56→49
    expect(render('{{ mix background foreground 6% }}', palette)).toBe(
      '#232431',
    )
    expect(render('{{ mix background foreground 0.06 }}', palette)).toBe(
      '#232431',
    )
    expect(render('{{ mix_strip background foreground 6% }}', palette)).toBe(
      '232431',
    )
    expect(render('{{ mix_rgb background foreground 6% }}', palette)).toBe(
      '35,36,49',
    )
  })

  it('accepts literal hex as a mix operand', () => {
    expect(render('{{ mix background #000000 25% }}', palette)).toBe('#14141d')
  })

  it('tolerates loose whitespace and leaves non-placeholder text alone', () => {
    expect(render('a {{background}} b {{  accent  }} {c}', palette)).toBe(
      'a #1a1b26 b #7aa2f7 {c}',
    )
  })

  it('throws naming an unknown key', () => {
    expect(() => render('{{ nope }}', palette)).toThrow(TemplateError)
    expect(() => render('{{ nope }}', palette)).toThrow('unknown key: nope')
    expect(() => render('{{ nope_rgb }}', palette)).toThrow('unknown key: nope')
    expect(() => render('{{ mix nope red 10% }}', palette)).toThrow(
      'unknown key: nope',
    )
  })

  it('refuses _rgb on a non-hex value', () => {
    expect(() => render('{{ mode_rgb }}', palette)).toThrow(
      /mode_rgb needs #rrggbb/,
    )
  })
})
