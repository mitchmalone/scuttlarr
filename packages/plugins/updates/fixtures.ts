import type { PluginState } from '@launcharr/tui/plugins'

import manifest from './manifest.json'
import type { UpdatesReport } from './model'

/**
 * Fictional updates in the shape `updates.rs` emits — Homebrew (two
 * formulae and a cask), one App Store title, a clean pnpm, and npm's check
 * failing. The cell, card, and panel are the real components; only these
 * numbers are made up (AGENTS invariant 10). Shared by the website's demo.
 */
export function updatesReportAt(nowSecs: number): UpdatesReport {
  return {
    generatedAt: nowSecs,
    refreshing: false,
    sources: [
      {
        id: 'brew',
        label: 'Homebrew',
        upgradeCommand: 'brew upgrade',
        checkedAt: nowSecs,
        error: null,
        items: [
          { name: 'gcc', installed: '16.1.0', available: '16.2.0' },
          { name: 'vips', installed: '8.18.5_1', available: '8.18.6' },
          {
            name: 'repobar',
            installed: '0.6.1',
            available: '0.8.7',
            kind: 'cask',
          },
        ],
      },
      {
        id: 'mas',
        label: 'App Store',
        upgradeCommand: 'mas upgrade',
        checkedAt: nowSecs,
        error: null,
        items: [{ name: 'Xcode', installed: '26.0', available: '26.1' }],
      },
      {
        id: 'pnpm',
        label: 'pnpm',
        upgradeCommand: 'pnpm update -g',
        checkedAt: nowSecs,
        error: null,
        items: [],
      },
      {
        id: 'mise',
        label: 'mise',
        upgradeCommand: 'mise upgrade',
        checkedAt: nowSecs,
        error: 'registry timed out',
        items: [],
      },
    ],
    upgrade: {
      source: 'brew',
      command: 'brew upgrade',
      startedAt: nowSecs - 8,
      finishedAt: 0,
      exitCode: null,
      cancelled: false,
      tail: [
        '==> Upgrading 3 outdated packages:',
        'gcc 16.1.0 -> 16.2.0',
        'vips 8.18.5_1 -> 8.18.6',
        '==> Fetching gcc',
        '==> Downloading https://ghcr.io/v2/homebrew/core/gcc/manifests/16.2.0',
      ],
    },
  }
}

/** The report at a fixed instant — stories and tests want determinism. */
export const UPDATES_REPORT: UpdatesReport = updatesReportAt(1_800_000_000)

/** The updates plugin as plugins.rs would list it, carrying the fixture. */
export const UPDATES_PLUGIN: PluginState = {
  id: manifest.id,
  name: manifest.name,
  version: manifest.version,
  description: manifest.description,
  kinds: manifest.kinds,
  zone: manifest.zone,
  icon: manifest.icon,
  firstParty: true,
  enabled: true,
  hasCell: true,
  hasPanel: true,
  hasService: false,
  interval: null,
  builtAt: null,
  buildError: null,
  state: UPDATES_REPORT,
  error: null,
  lastOk: UPDATES_REPORT.generatedAt,
  updatedAt: UPDATES_REPORT.generatedAt,
  restarts: 0,
  running: false,
  panel: manifest.panel,
}
