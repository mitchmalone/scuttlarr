import { BUILTIN_THEMES } from '@scuttlarr/tui/themes'
import { describe, expect, it } from 'vitest'

import {
  CELL,
  HERO_PHRASES,
  type Painter,
  applyKey,
  fieldRamp,
  glowAt,
  keyPulse,
  mixHex,
  noise,
  paintFrame,
  pulseAt,
  ringPulse,
  stepTypist,
  threshold,
  typist,
} from './hero-field'

const HEX = /^#[0-9a-f]{6}$/

function painter(): Painter & { rects: number } {
  return {
    fillStyle: '',
    rects: 0,
    fillRect() {
      this.rects++
    },
  }
}

describe('fieldRamp', () => {
  it('mixes at the ends', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#fff', '#000', 0.5)).toBe('#808080')
  })

  it.each(Object.keys(BUILTIN_THEMES))(
    'derives a valid ramp from %s',
    (name) => {
      const t = BUILTIN_THEMES[name]!
      const ramp = fieldRamp(t)
      expect(ramp.bg).toBe(t.bg)
      expect(ramp.lit).toBe(t.accent)
      for (const step of [ramp.dim, ramp.mid, ramp.hover, ramp.crest])
        expect(step).toMatch(HEX)
    },
  )

  it('every built-in theme has hex bg/fg/accent for the mix to read', () => {
    for (const t of Object.values(BUILTIN_THEMES)) {
      for (const c of [t.bg, t.fg, t.accent])
        expect(c).toMatch(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
    }
  })
})

describe('noise and dither', () => {
  it('stays in range', () => {
    for (let i = 0; i < 500; i++) {
      const n = noise(i * 0.37, i * 0.91)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(1)
      const th = threshold(i, i * 3)
      expect(th).toBeGreaterThanOrEqual(0)
      expect(th).toBeLessThan(1)
    }
  })

  it('is deterministic across calls', () => {
    expect(noise(3.3, 7.7)).toBe(noise(3.3, 7.7))
    expect(threshold(5, 9)).toBe(threshold(5, 9))
  })
})

describe('pulses', () => {
  const cell = CELL

  it('a key pulse runs along its own row, not the rows above', () => {
    const p = keyPulse(400, 200, 0, 0.5)
    // halfway through its life it has travelled most of its reach
    const t = p.life * 500
    const reach = p.reach * (1 - 0.5 ** 3)
    expect(pulseAt([p], 400 + reach * cell, 200, t, cell)).toBeGreaterThan(0.3)
    expect(pulseAt([p], 400 - reach * cell, 200, t, cell)).toBeGreaterThan(0.3)
    expect(pulseAt([p], 400 + reach * cell, 200 - 10 * cell, t, cell)).toBe(0)
  })

  it('a ring is round', () => {
    const p = ringPulse(0, 0, 0, 1)
    const t = p.life * 500
    const r = p.reach * (1 - 0.5 ** 3) * cell
    const east = pulseAt([p], r, 0, t, cell)
    const south = pulseAt([p], 0, r, t, cell)
    expect(east).toBeGreaterThan(0)
    expect(south).toBeCloseTo(east)
    expect(pulseAt([p], 0, 0, t, cell)).toBe(0)
  })

  it('is silent before birth and after death', () => {
    const p = keyPulse(0, 0, 1000, 1)
    expect(pulseAt([p], 0, 0, 999, cell)).toBe(0)
    expect(pulseAt([p], 0, 0, 1000 + p.life * 1000, cell)).toBe(0)
  })
})

describe('glowAt', () => {
  it('peaks at the pointer and vanishes past its reach', () => {
    const c = { x: 100, y: 100, strength: 1 }
    expect(glowAt(c, 100, 100, CELL)).toBeCloseTo(0.5)
    expect(glowAt(c, 100 + 8 * CELL, 100, CELL)).toBe(0)
    expect(glowAt(undefined, 100, 100, CELL)).toBe(0)
  })
})

describe('typist', () => {
  it('types a phrase, presses Enter, then starts the next', () => {
    let s = typist()
    let now = 0
    const keys: string[] = []
    for (let i = 0; i < HERO_PHRASES[0].length + 2; i++) {
      const step = stepTypist(s, now, () => 0)
      expect(step).not.toBeNull()
      keys.push(step!.key)
      s = step!.state
      now = s.next
    }
    expect(keys.join('')).toBe(`${HERO_PHRASES[0]}Enter${HERO_PHRASES[1][0]}`)
  })

  it('waits for its next beat', () => {
    const step = stepTypist(typist(), 0, () => 0)!
    expect(stepTypist(step.state, step.state.next - 1, () => 0)).toBeNull()
  })

  it('pauses longer after Enter than between keys', () => {
    const typed = stepTypist({ phrase: 0, index: 0, next: 0 }, 0, () => 1)!
    const entered = stepTypist(
      { phrase: 0, index: HERO_PHRASES[0].length, next: 0 },
      0,
      () => 1,
    )!
    expect(entered.key).toBe('Enter')
    expect(entered.state.next).toBeGreaterThan(typed.state.next)
  })
})

describe('applyKey', () => {
  it('appends, deletes, caps and ignores named keys', () => {
    expect(applyKey('ab', 'c')).toBe('abc')
    expect(applyKey('ab', 'Backspace')).toBe('a')
    expect(applyKey('', 'Backspace')).toBe('')
    expect(applyKey('x'.repeat(28), 'y')).toBe('x'.repeat(28))
    expect(applyKey('ab', 'Shift')).toBe('ab')
  })
})

describe('paintFrame', () => {
  const base = {
    ramp: fieldRamp(BUILTIN_THEMES.scuttlarr!),
    width: 1200,
    height: 700,
    dpr: 1,
    seconds: 20,
    now: 0,
  }

  it('keeps the centre clear and the edges busy', () => {
    const lit: [number, number][] = []
    const ctx: Painter = {
      fillStyle: '',
      fillRect(x, y, w) {
        if (w === CELL) lit.push([x, y])
      },
    }
    paintFrame({ ...base, ctx, pulses: [] })
    const centre = lit.filter(
      ([x, y]) => Math.abs(x - 600) < 200 && Math.abs(y - 350) < 120,
    )
    const corners = lit.filter(
      ([x, y]) => (x < 200 || x > 1000) && (y < 200 || y > 500),
    )
    expect(centre.length).toBe(0)
    expect(corners.length).toBeGreaterThan(100)
  })

  it('a pulse lights cells it would otherwise leave dark', () => {
    const quiet = painter()
    const loud = painter()
    const quietLit = paintFrame({ ...base, ctx: quiet, pulses: [] })
    const p = keyPulse(600, 350, 0, 1)
    const loudLit = paintFrame({
      ...base,
      ctx: loud,
      now: p.life * 300,
      pulses: [p],
    })
    expect(loudLit).toBeGreaterThan(quietLit)
  })
})
