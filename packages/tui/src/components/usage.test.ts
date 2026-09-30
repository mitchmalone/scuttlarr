import { describe, expect, it } from 'vitest'

import {
  type UsageReport,
  accountOptions,
  fmtCountdown,
  fmtReset,
  fmtResetShort,
  fmtTokens,
  foldUsageBarState,
  usagePace,
  windowElapsed,
  windowLabel,
  windowPace,
  worstPace,
} from './usage'

const account = (
  id: string,
  label: string,
  limits: { name: string; usedPercent: number }[],
) => ({
  id,
  provider: id.startsWith('claude') ? 'claude' : 'codex',
  label,
  account: null,
  limits: limits.map((l) => ({ ...l, resetsAt: null, windowSecs: null })),
  limitsNote: null,
  days: [],
  models: [],
})

describe('fmtTokens', () => {
  it('scales with one decimal, trimming .0', () => {
    expect(fmtTokens(42)).toBe('42')
    expect(fmtTokens(1600)).toBe('1.6k')
    expect(fmtTokens(218_234_567)).toBe('218.2M')
    expect(fmtTokens(927_000_000)).toBe('927M')
    expect(fmtTokens(1_250_000_000)).toBe('1.3B')
  })
})

describe('fmtReset', () => {
  const now = 1_800_000_000
  it('rounds to the natural unit', () => {
    expect(fmtReset(null, now)).toBe('')
    expect(fmtReset(now - 5, now)).toBe('resets soon')
    expect(fmtReset(now + 90, now)).toBe('resets in 2m')
    expect(fmtReset(now + 3 * 3600, now)).toBe('resets in 3h')
    expect(fmtReset(now + 4 * 86_400, now)).toBe('resets in 4d')
  })
  it('has a short form for the bar card', () => {
    expect(fmtResetShort(now + 3 * 3600, now)).toBe('3h')
    expect(fmtResetShort(now - 1, now)).toBe('soon')
    expect(fmtResetShort(null, now)).toBe('')
  })
})

describe('windowLabel', () => {
  it('gives the headline windows one word and capitalises the rest', () => {
    expect(windowLabel('5h session')).toBe('Session')
    expect(windowLabel('5h')).toBe('Session')
    expect(windowLabel('weekly · all models')).toBe('Weekly')
    expect(windowLabel('weekly')).toBe('Weekly')
    expect(windowLabel('weekly · opus')).toBe('Weekly · opus')
    expect(windowLabel('5h · this device')).toBe('5h · this device')
  })
})

describe('fmtCountdown', () => {
  const now = 1_800_000_000
  it('gives two units above an hour', () => {
    expect(fmtCountdown(null, now)).toBe('')
    expect(fmtCountdown(now, now)).toBe('soon')
    expect(fmtCountdown(now + 30, now)).toBe('1m')
    expect(fmtCountdown(now + 42 * 60, now)).toBe('42m')
    expect(fmtCountdown(now + 4 * 3600 + 42 * 60, now)).toBe('4h 42m')
    expect(fmtCountdown(now + 4 * 86_400 + 12 * 3600 + 59, now)).toBe('4d 12h')
  })
})

describe('pace', () => {
  const now = 1_800_000_000
  const WEEK = 7 * 86_400
  /** A weekly window `elapsed`% through with `used`% used. */
  const week = (used: number, elapsed: number) => ({
    name: 'weekly',
    usedPercent: used,
    resetsAt: now + Math.round(WEEK * (1 - elapsed / 100)),
    windowSecs: WEEK,
  })

  it('places now inside the window', () => {
    expect(windowElapsed(week(0, 30), now)).toBeCloseTo(30)
    expect(windowElapsed({ ...week(0, 30), windowSecs: null }, now)).toBeNull()
    expect(windowElapsed({ ...week(0, 30), resetsAt: null }, now)).toBeNull()
    // A reset already past means the reading predates it: unknown.
    expect(windowElapsed({ ...week(0, 0), resetsAt: now - 5 }, now)).toBeNull()
    // A window longer than advertised clamps.
    expect(
      windowElapsed({ ...week(0, 0), resetsAt: now + 2 * WEEK }, now),
    ).toBe(0)
  })

  it("judges Mitch's cases against the clock, not the percent", () => {
    expect(windowPace(week(10, 20), now)).toBe('normal')
    expect(windowPace(week(50, 55), now)).toBe('normal')
    expect(windowPace(week(80, 30), now)).toBe('alert')
  })

  it('goes green with real headroom, red running ahead or near the wall', () => {
    expect(windowPace(week(20, 60), now)).toBe('go')
    expect(windowPace(week(35, 60), now)).toBe('go')
    expect(windowPace(week(36, 60), now)).toBe('normal')
    expect(windowPace(week(74, 60), now)).toBe('normal')
    expect(windowPace(week(75, 60), now)).toBe('alert')
    // 90% is a wall even an hour before reset.
    expect(windowPace(week(92, 99), now)).toBe('alert')
  })

  it('forgives a burst early in the window, not a sprint', () => {
    const session = (used: number, elapsed: number) => ({
      ...week(used, elapsed),
      name: '5h session',
      resetsAt: now + Math.round(5 * 3600 * (1 - elapsed / 100)),
      windowSecs: 5 * 3600,
    })
    // 10 minutes into a session, 20% used; day one of a week, 30% used.
    expect(windowPace(session(20, 3), now)).toBe('normal')
    expect(windowPace(week(30, 14), now)).toBe('normal')
    // Past the early stretch the ordinary gap applies again.
    expect(windowPace(week(31, 15), now)).toBe('alert')
    // A sprint alerts even early; so does the wall.
    expect(windowPace(week(50, 10), now)).toBe('alert')
    expect(windowPace(session(92, 3), now)).toBe('alert')
  })

  it('ignores a stale reading whose reset has passed', () => {
    const stale = { ...week(91, 0), resetsAt: now - 60 }
    expect(windowPace(stale, now)).toBe('normal')
    expect(worstPace([stale, week(10, 60)], now)).toBe('go')
  })

  it('reads unknown-length windows as normal unless at the wall', () => {
    const unknown = {
      name: 'promo',
      usedPercent: 60,
      resetsAt: null,
      windowSecs: null,
    }
    expect(windowPace(unknown, now)).toBe('normal')
    expect(windowPace({ ...unknown, usedPercent: 95 }, now)).toBe('alert')
    // …and they sit out the fold, so they can't hold the cell off green.
    expect(worstPace([unknown, week(10, 60)], now)).toBe('go')
    expect(
      worstPace([{ ...unknown, usedPercent: 95 }, week(10, 60)], now),
    ).toBe('alert')
    expect(worstPace([unknown], now)).toBe('normal')
  })

  it('lets the worst window speak for the account and the bar', () => {
    expect(worstPace([], now)).toBeNull()
    expect(worstPace([week(5, 50), week(10, 60)], now)).toBe('go')
    expect(worstPace([week(5, 50), week(50, 55)], now)).toBe('normal')
    expect(worstPace([week(5, 50), week(80, 30)], now)).toBe('alert')
    const acct = (limits: ReturnType<typeof week>[]) => ({
      ...account('claude', 'Personal', []),
      limits,
    })
    expect(usagePace([acct([week(5, 50)]), acct([week(80, 30)])], now)).toBe(
      'alert',
    )
    expect(usagePace([acct([])], now)).toBeNull()
  })
})

describe('foldUsageBarState', () => {
  const report: UsageReport = {
    generatedAt: 1,
    providers: [
      account('claude', 'Personal', [
        { name: '5h', usedPercent: 12 },
        { name: 'weekly', usedPercent: 41 },
      ]),
      {
        ...account('claude-psyke', 'Psyke', [
          { name: '5h', usedPercent: 88.5 },
        ]),
        days: [
          { label: 'Wed', tokens: 9_000 },
          { label: 'Today', tokens: 1_000 },
        ],
      },
      {
        ...account('codex', 'Codex', []),
        days: [{ label: 'Today', tokens: 500 }],
      },
    ],
  }
  it('folds: today summed, histograms dropped', () => {
    const state = foldUsageBarState(report)
    expect(state.tokensToday).toBe(1_500)
    expect(state.accounts.map((a) => a.id)).toEqual([
      'claude',
      'claude-psyke',
      'codex',
    ])
    expect('days' in state.accounts[0]!).toBe(false)
    expect(
      foldUsageBarState({ generatedAt: 0, providers: [] }).tokensToday,
    ).toBe(0)
  })
})

describe('accountOptions', () => {
  it('disambiguates duplicate labels with the id', () => {
    const opts = accountOptions([
      account('claude', 'Personal', []),
      account('claude-work', 'Personal', []),
      account('codex', 'Codex', []),
    ])
    expect(opts.map((o) => o.label)).toEqual([
      'Personal · claude',
      'Personal · claude-work',
      'Codex',
    ])
  })
})
