import { describe, expect, it } from 'vitest'

import { cellLabel, dateFacts, longDate, monthTitle, stateDate } from './model'

const aug27 = new Date(2026, 7, 27, 14, 30)

describe('calendar model', () => {
  it('labels the cell glyph-first: weekday and day only', () => {
    expect(cellLabel(aug27)).toBe('Thu 27')
    expect(cellLabel(new Date(2026, 0, 1))).toBe('Thu 1')
  })

  it('spells the long date and month title', () => {
    expect(longDate(aug27)).toBe('Thursday 27 August 2026')
    expect(monthTitle(2026, 7)).toBe('August 2026')
    expect(monthTitle(2027, 0)).toBe('January 2027')
  })

  it('computes the card facts', () => {
    const f = dateFacts(aug27)
    expect(f.short).toBe('27 Aug')
    expect(f.week).toBe(35)
    expect(f.dayOfYear).toBe(239)
    expect(f.yearPct).toBe(65)
    expect(dateFacts(new Date(2026, 0, 1)).dayOfYear).toBe(1)
  })

  it('prefers the provider epoch, falling back to the bar clock', () => {
    expect(stateDate({ epoch: 1_800_000_000 }, aug27).getTime()).toBe(
      1_800_000_000_000,
    )
    expect(stateDate(null, aug27)).toBe(aug27)
    expect(stateDate({ epoch: 0 }, aug27)).toBe(aug27)
  })
})
