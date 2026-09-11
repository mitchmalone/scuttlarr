import type { UsageReport } from '@scuttlarr/tui'
import type { PluginState } from '@scuttlarr/tui/plugins'

import manifest from './manifest.json'

/**
 * Fictional usage in the shape usage.rs emits — two Claude subscriptions plus
 * Codex. The cell, tiles, and panel are the real components; only these
 * numbers are made up (AGENTS invariant 10). Shared by the website's demo and
 * the kit's stories.
 */
export function usageReportAt(nowSecs: number): UsageReport {
  const t = nowSecs
  return {
    generatedAt: t,
    providers: [
      {
        id: 'claude',
        provider: 'claude',
        label: 'Personal',
        account: 'blackbeard@example.com',
        limits: [
          { name: '5h session', usedPercent: 38, resetsAt: t + 5400 },
          { name: 'weekly', usedPercent: 62, resetsAt: t + 172_800 },
          {
            name: 'weekly · opus',
            usedPercent: 21,
            resetsAt: t + 172_800,
          },
        ],
        limitsNote: null,
        days: [
          { label: 'Fri', tokens: 1_200_000 },
          { label: 'Sat', tokens: 400_000 },
          { label: 'Sun', tokens: 150_000 },
          { label: 'Mon', tokens: 2_100_000 },
          { label: 'Tue', tokens: 1_850_000 },
          { label: 'Wed', tokens: 2_400_000 },
          { label: 'Thu', tokens: 900_000 },
        ],
        models: [
          { model: 'claude-fable-5', tokens: 6_200_000 },
          { model: 'claude-opus-5', tokens: 2_100_000 },
          { model: 'claude-haiku-4-5', tokens: 700_000 },
        ],
      },
      {
        id: 'claude-psyke',
        provider: 'claude',
        label: 'Psyke',
        account: 'captain@psyke.example',
        limits: [
          { name: '5h session', usedPercent: 91, resetsAt: t + 1800 },
          { name: 'weekly', usedPercent: 74, resetsAt: t + 259_200 },
        ],
        limitsNote: null,
        days: [
          { label: 'Fri', tokens: 300_000 },
          { label: 'Sat', tokens: 0 },
          { label: 'Sun', tokens: 0 },
          { label: 'Mon', tokens: 1_400_000 },
          { label: 'Tue', tokens: 2_900_000 },
          { label: 'Wed', tokens: 3_100_000 },
          { label: 'Thu', tokens: 1_700_000 },
        ],
        models: [
          { model: 'claude-fable-5', tokens: 8_400_000 },
          { model: 'claude-sonnet-5', tokens: 1_000_000 },
        ],
      },
      {
        id: 'codex',
        provider: 'codex',
        label: 'Codex',
        account: null,
        limits: [
          { name: '5h', usedPercent: 12, resetsAt: t + 9000 },
          { name: 'weekly', usedPercent: 33, resetsAt: t + 400_000 },
        ],
        limitsNote: null,
        days: [
          { label: 'Fri', tokens: 80_000 },
          { label: 'Sat', tokens: 0 },
          { label: 'Sun', tokens: 20_000 },
          { label: 'Mon', tokens: 310_000 },
          { label: 'Tue', tokens: 120_000 },
          { label: 'Wed', tokens: 260_000 },
          { label: 'Thu', tokens: 90_000 },
        ],
        models: [{ model: 'gpt-5-codex', tokens: 880_000 }],
      },
    ],
  }
}

/** The report at a fixed instant — stories and tests want determinism. */
export const USAGE_REPORT: UsageReport = usageReportAt(1_800_000_000)

/** The usage plugin as plugins.rs would list it, carrying the fixture. */
export const USAGE_PLUGIN: PluginState = {
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
  state: USAGE_REPORT,
  error: null,
  lastOk: USAGE_REPORT.generatedAt,
  updatedAt: USAGE_REPORT.generatedAt,
  restarts: 0,
  running: false,
  panel: manifest.panel,
}
