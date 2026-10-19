import { describe, expect, it } from 'vitest'

import { mix, ramp } from './field'

describe('the field palette', () => {
  it('mixes one colour toward another', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('rgb(0,0,0)')
    expect(mix('#000000', '#ffffff', 1)).toBe('rgb(255,255,255)')
    expect(mix('#000000', '#ff0000', 0.5)).toBe('rgb(128,0,0)')
  })

  it('builds every step from background, accent and bright alone', () => {
    const r = ramp({ bg: '#000000', accent: '#ff0000', bright: '#ffffff' })
    expect(r.bg).toBe('#000000')
    expect(r.lit).toBe('#ff0000')
    expect(r.dim).toBe('rgb(77,0,0)')
    expect(r.crest).toBe('rgb(255,199,199)')
  })
})
