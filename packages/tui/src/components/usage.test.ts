import { describe, expect, it } from 'vitest'

import {
  type UsageReport,
  accountOptions,
  fmtReset,
  fmtResetShort,
  fmtTokens,
  foldUsageBarState,
  tightestWindow,
  usageTone,
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
  limits: limits.map((l) => ({ ...l, resetsAt: null })),
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

describe('usageTone', () => {
  it('tiers at 70 and 90', () => {
    expect(usageTone(null)).toBe('ok')
    expect(usageTone(69.9)).toBe('ok')
    expect(usageTone(70)).toBe('warn')
    expect(usageTone(89.9)).toBe('warn')
    expect(usageTone(90)).toBe('danger')
  })
})

describe('tightestWindow + foldUsageBarState', () => {
  const report: UsageReport = {
    generatedAt: 1,
    providers: [
      account('claude', 'Personal', [
        { name: '5h', usedPercent: 12 },
        { name: 'weekly', usedPercent: 41 },
      ]),
      account('claude-psyke', 'Psyke', [{ name: '5h', usedPercent: 88.5 }]),
      account('codex', 'Codex', []),
    ],
  }
  it('picks the window nearest its limit', () => {
    expect(tightestWindow(report.providers[0]!.limits)?.name).toBe('weekly')
    expect(tightestWindow([])).toBeNull()
  })
  it('folds like usage.rs: tightest across accounts, histograms dropped', () => {
    const state = foldUsageBarState(report)
    expect(state.tightest).toBe(88.5)
    expect(state.accounts.map((a) => a.id)).toEqual([
      'claude',
      'claude-psyke',
      'codex',
    ])
    expect('days' in state.accounts[0]!).toBe(false)
    expect(
      foldUsageBarState({ generatedAt: 0, providers: [] }).tightest,
    ).toBeNull()
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
