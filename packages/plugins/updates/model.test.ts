import { describe, expect, it } from 'vitest'

import {
  type UpdatesReport,
  type UpgradeRun,
  cellTone,
  cellVisible,
  checkedAgo,
  duration,
  hasErrors,
  panelRows,
  sourceLine,
  totalUpdates,
  upgradeFailed,
  upgradeLine,
  upgradeRunning,
  upgradeTarget,
} from './model'

const cleanSource = {
  id: 'pnpm' as const,
  label: 'pnpm',
  upgradeCommand: 'pnpm update -g',
  checkedAt: 1_800_000_000,
  error: null,
  items: [],
}

const brewSource = {
  id: 'brew' as const,
  label: 'Homebrew',
  upgradeCommand: 'brew upgrade',
  checkedAt: 1_800_000_000,
  error: null,
  items: [
    { name: 'gcc', installed: '16.1.0', available: '16.2.0' },
    { name: 'vips', installed: '8.18.5_1', available: '8.18.6' },
    {
      name: 'repobar',
      installed: '0.6.1',
      available: '0.8.7',
      kind: 'cask' as const,
    },
  ],
}

const masSource = {
  id: 'mas' as const,
  label: 'App Store',
  upgradeCommand: 'mas upgrade',
  checkedAt: 1_800_000_000,
  error: null,
  items: [{ name: 'Xcode', installed: '26.0', available: '26.1' }],
}

const miseSource = {
  id: 'mise' as const,
  label: 'mise',
  upgradeCommand: 'mise upgrade',
  checkedAt: 1_800_000_000,
  error: 'registry timed out',
  items: [],
}

function report(overrides: Partial<UpdatesReport> = {}): UpdatesReport {
  return {
    generatedAt: 1_800_000_000,
    refreshing: false,
    sources: [brewSource, masSource, cleanSource, miseSource],
    ...overrides,
  }
}

describe('updates model', () => {
  describe('totalUpdates', () => {
    it('sums items across every source', () => {
      expect(totalUpdates(report())).toBe(4)
    })

    it('is zero when every source is clean', () => {
      expect(totalUpdates(report({ sources: [cleanSource] }))).toBe(0)
    })
  })

  describe('hasErrors', () => {
    it('is true when any source errored', () => {
      expect(hasErrors(report())).toBe(true)
    })

    it('is false when no source errored', () => {
      expect(hasErrors(report({ sources: [brewSource, cleanSource] }))).toBe(
        false,
      )
    })
  })

  describe('cellVisible', () => {
    it('is hidden for a null report', () => {
      expect(cellVisible(null)).toBe(false)
    })

    it('is hidden when generatedAt is 0 (never checked)', () => {
      expect(cellVisible(report({ generatedAt: 0 }))).toBe(false)
    })

    it('is hidden when every source is clean and error-free', () => {
      expect(cellVisible(report({ sources: [cleanSource] }))).toBe(false)
    })

    it('is visible when a source has updates', () => {
      expect(cellVisible(report({ sources: [brewSource] }))).toBe(true)
    })

    it('is visible when a source errored, even with no updates', () => {
      expect(cellVisible(report({ sources: [miseSource] }))).toBe(true)
    })
  })

  describe('cellTone', () => {
    it('is warn when any source errored', () => {
      expect(cellTone(report())).toBe('warn')
    })

    it('is normal when nothing errored', () => {
      expect(cellTone(report({ sources: [brewSource] }))).toBe('normal')
    })
  })

  describe('sourceLine', () => {
    it('shows the count when updates exist', () => {
      expect(sourceLine(brewSource)).toBe('Homebrew · 3')
    })

    it('shows "up to date" when clean', () => {
      expect(sourceLine(cleanSource)).toBe('pnpm · up to date')
    })

    it('shows the error when a source errored', () => {
      expect(sourceLine(miseSource)).toBe('mise · error: registry timed out')
    })
  })

  describe('checkedAgo', () => {
    it('says never checked at 0', () => {
      expect(checkedAgo(0, 1_800_000_100)).toBe('never checked')
    })

    it('says just now under a minute', () => {
      expect(checkedAgo(1_800_000_000, 1_800_000_030)).toBe('checked just now')
    })

    it('says minutes under an hour', () => {
      expect(checkedAgo(1_800_000_000, 1_800_000_720)).toBe(
        'checked 12 min ago',
      )
    })

    it('says hours at or beyond an hour', () => {
      expect(checkedAgo(1_800_000_000, 1_800_010_800)).toBe('checked 3 h ago')
    })
  })

  describe('panelRows', () => {
    it('flattens sources into headers plus selectable rows, sorted by name', () => {
      const rows = panelRows(report({ sources: [brewSource, cleanSource] }))
      expect(rows.map((r) => r.kind)).toEqual([
        'header',
        'item',
        'item',
        'item',
        'header',
        'clean',
      ])
      const items = rows.filter((r) => r.kind === 'item')
      expect(items.map((r) => (r.kind === 'item' ? r.name : ''))).toEqual([
        'gcc',
        'repobar',
        'vips',
      ])
    })

    it('yields one danger row for an errored source', () => {
      const rows = panelRows(report({ sources: [miseSource] }))
      expect(rows).toHaveLength(2)
      expect(rows[1]).toMatchObject({
        kind: 'error',
        error: 'registry timed out',
        upgradeCommand: 'mise upgrade',
      })
    })

    it('carries the source upgradeCommand on every item row', () => {
      const rows = panelRows(report({ sources: [brewSource] }))
      const item = rows.find((r) => r.kind === 'item')
      expect(item).toMatchObject({ upgradeCommand: 'brew upgrade' })
    })

    it('header rows are not selectable, item/clean/error rows are', () => {
      const rows = panelRows(report())
      for (const row of rows) {
        expect(row.selectable).toBe(row.kind !== 'header')
      }
    })
  })

  describe('upgrade run', () => {
    const run = (overrides: Partial<UpgradeRun> = {}): UpgradeRun => ({
      source: 'brew',
      command: 'brew upgrade',
      startedAt: 1_800_000_000,
      finishedAt: 0,
      exitCode: null,
      cancelled: false,
      tail: [],
      ...overrides,
    })

    it('knows when a run is in flight', () => {
      expect(upgradeRunning(null)).toBe(false)
      expect(upgradeRunning(report())).toBe(false)
      expect(upgradeRunning(report({ upgrade: run() }))).toBe(true)
      expect(
        upgradeRunning(report({ upgrade: run({ finishedAt: 1_800_000_010 }) })),
      ).toBe(false)
    })

    it('names the target by source label, or "everything"', () => {
      expect(upgradeTarget(report(), run())).toBe('Homebrew')
      expect(upgradeTarget(report(), run({ source: 'all' }))).toBe('everything')
    })

    it('formats durations tersely', () => {
      expect(duration(3)).toBe('3s')
      expect(duration(72)).toBe('1 min 12s')
      expect(duration(7500)).toBe('2 h 5 min')
      expect(duration(-4)).toBe('0s')
    })

    it('headlines running, succeeded, failed, killed and cancelled runs', () => {
      const r = report()
      expect(upgradeLine(r, run(), 1_800_000_012)).toBe(
        'upgrading Homebrew · 12s',
      )
      expect(
        upgradeLine(r, run({ finishedAt: 1_800_000_063, exitCode: 0 }), 0),
      ).toBe('Homebrew upgraded · 1 min 3s')
      expect(
        upgradeLine(r, run({ finishedAt: 1_800_000_001, exitCode: 1 }), 0),
      ).toBe('Homebrew upgrade failed · exit 1')
      expect(upgradeLine(r, run({ finishedAt: 1_800_000_001 }), 0)).toBe(
        'Homebrew upgrade failed · killed',
      )
      expect(
        upgradeLine(r, run({ finishedAt: 1_800_000_001, cancelled: true }), 0),
      ).toBe('Homebrew upgrade cancelled')
    })

    it('flags failures but not cancels or running', () => {
      expect(upgradeFailed(run())).toBe(false)
      expect(upgradeFailed(run({ finishedAt: 1, exitCode: 0 }))).toBe(false)
      expect(upgradeFailed(run({ finishedAt: 1, exitCode: 2 }))).toBe(true)
      expect(upgradeFailed(run({ finishedAt: 1, cancelled: true }))).toBe(false)
    })
  })
})
