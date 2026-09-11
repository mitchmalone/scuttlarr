import { describe, expect, it } from 'vitest'

import {
  ColorError,
  isHex6,
  isLight,
  luminance,
  mix,
  parseAmount,
  parseHex,
  strip,
  toHex,
  toRgb,
} from './color.ts'

describe('parseHex / toHex', () => {
  it('parses six-digit hex with or without the hash', () => {
    expect(parseHex('#1e1e2e')).toEqual({ r: 30, g: 30, b: 46 })
    expect(parseHex('1E1E2E')).toEqual({ r: 30, g: 30, b: 46 })
  })

  it('expands three-digit hex', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseHex('#a1c')).toEqual({ r: 170, g: 17, b: 204 })
  })

  it('rejects anything else with a ColorError', () => {
    expect(() => parseHex('rgba(0,0,0,1)')).toThrow(ColorError)
    expect(() => parseHex('#12345')).toThrow('not a hex colour')
  })

  it('round-trips through toHex in lowercase', () => {
    expect(toHex(parseHex('#ABCDEF'))).toBe('#abcdef')
    expect(toHex({ r: 0, g: 5, b: 255 })).toBe('#0005ff')
  })

  it('isHex6 only accepts the strict #rrggbb form', () => {
    expect(isHex6('#1a1b26')).toBe(true)
    expect(isHex6('1a1b26')).toBe(false)
    expect(isHex6('#fff')).toBe(false)
  })
})

describe('parseAmount', () => {
  it('reads percentages, fractions, and bare integers like the awk', () => {
    expect(parseAmount('30%')).toBe(0.3)
    expect(parseAmount('0.3')).toBe(0.3)
    expect(parseAmount('30')).toBe(0.3)
    expect(parseAmount(0.3)).toBe(0.3)
    expect(parseAmount(30)).toBe(0.3)
  })

  it('clamps to the unit range', () => {
    expect(parseAmount('150%')).toBe(1)
    expect(parseAmount('-5%')).toBe(0)
  })

  it('rejects garbage', () => {
    expect(() => parseAmount('lots')).toThrow(ColorError)
  })
})

describe('mix', () => {
  // Values computed by hand from Omarchy's awk: int(s*(1-a) + e*a + 0.5).
  it('derives tokyo-night dark_background as mix(background, #000000, 25%)', () => {
    // 26*.75=19.5→20, 27*.75=20.25→20, 38*.75=28.5→29
    expect(mix('#1a1b26', '#000000', '25%')).toBe('#14141d')
  })

  it('derives darker_background at 50%', () => {
    // 26*.5=13, 27*.5=13.5→14, 38*.5=19
    expect(mix('#1a1b26', '#000000', '50%')).toBe('#0d0e13')
  })

  it('derives bright_red as mix(red, #ffffff, 20%)', () => {
    // 247*.8+51=248.6→249, 118*.8+51=145.4→145, 142*.8+51=164.6→165
    expect(mix('#f7768e', '#ffffff', '20%')).toBe('#f991a5')
  })

  it('derives brown as mix(orange, #000000, 50%)', () => {
    // 235*.5=117.5→118, 146*.5=73, 123*.5=61.5→62
    expect(mix('#eb927b', '#000000', '50%')).toBe('#76493e')
  })

  it('returns the start at 0 and the end at 100%', () => {
    expect(mix('#123456', '#abcdef', '0%')).toBe('#123456')
    expect(mix('#123456', '#abcdef', '100%')).toBe('#abcdef')
  })
})

describe('toRgb / strip', () => {
  it('formats decimal rgb without spaces, as Omarchy does', () => {
    expect(toRgb('#1e1e2e')).toBe('30,30,46')
  })

  it('strips only a leading hash', () => {
    expect(strip('#1e1e2e')).toBe('1e1e2e')
    expect(strip('dark')).toBe('dark')
  })
})

describe('luminance / isLight', () => {
  it('sums the channels and applies the 382 threshold', () => {
    expect(luminance('#1a1b26')).toBe(26 + 27 + 38)
    expect(isLight('#1a1b26')).toBe(false)
    expect(isLight('#fdf6e3')).toBe(true)
    // Boundary: exactly 382 is dark.
    expect(isLight('#7f7f80')).toBe(false)
    expect(isLight('#7f7f81')).toBe(true)
  })
})
