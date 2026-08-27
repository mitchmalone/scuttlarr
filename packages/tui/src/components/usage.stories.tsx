import { useState } from 'react'

import { defineStories } from '../story'
import { USAGE_ALL, UsagePanel, type UsageReport } from './usage'

const NOW = 1_800_000_000

const days = (tokens: number[]) =>
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'].map((label, i) => ({
    label,
    tokens: tokens[i] ?? 0,
  }))

/** Two Claude subscriptions plus Codex — the shape usage.rs emits. */
export const USAGE_FIXTURE: UsageReport = {
  generatedAt: NOW,
  providers: [
    {
      id: 'claude',
      provider: 'claude',
      label: 'Personal',
      account: 'mitch@example.com',
      days: days([
        169_799_887, 271_782_498, 141_464_960, 92_420_456, 110_119_941,
        26_440_629, 114_553_427,
      ]),
      models: [
        { model: 'claude-fable-5', tokens: 732_787_128 },
        { model: 'claude-opus-5', tokens: 193_794_670 },
      ],
      limits: [
        { name: '5h session', usedPercent: 62.5, resetsAt: NOW + 3 * 3600 },
        {
          name: 'weekly · all models',
          usedPercent: 41,
          resetsAt: NOW + 3 * 86_400,
        },
        { name: 'weekly · Fable', usedPercent: 88, resetsAt: NOW + 2 * 86_400 },
      ],
      limitsNote: null,
    },
    {
      id: 'claude-psyke',
      provider: 'claude',
      label: 'Psyke',
      account: 'mitch@psyke.example',
      days: days([
        40_211_002, 88_120_339, 120_004_118, 61_338_207, 95_022_940, 0,
        52_901_113,
      ]),
      models: [
        { model: 'claude-opus-5', tokens: 263_291_568 },
        { model: 'claude-fable-5', tokens: 194_306_151 },
      ],
      limits: [
        { name: '5h session', usedPercent: 93, resetsAt: NOW + 40 * 60 },
        {
          name: 'weekly · all models',
          usedPercent: 27,
          resetsAt: NOW + 5 * 86_400,
        },
      ],
      limitsNote: 'as of 14m ago — network unreachable',
    },
    {
      id: 'codex',
      provider: 'codex',
      label: 'Codex',
      account: null,
      days: days([0, 0, 2_964_211, 0, 0, 0, 0]),
      models: [{ model: 'gpt-5.5', tokens: 2_964_211 }],
      limits: [
        { name: 'weekly', usedPercent: 8, resetsAt: NOW + 4 * 86_400 },
        { name: '5h', usedPercent: 40, resetsAt: NOW + 2 * 3600 },
      ],
      limitsNote: null,
    },
  ],
}

const noop = () => {}

function Live({ initial }: { initial: string }) {
  const [selected, setSelected] = useState(initial)
  return (
    <UsagePanel
      report={USAGE_FIXTURE}
      selected={selected}
      nowSecs={NOW}
      onSelect={setSelected}
      onClose={noop}
    />
  )
}

export const usagePanelStories = defineStories('UsagePanel', [
  {
    name: 'all accounts — tiles',
    keys: '←→ account · click tile · esc back',
    render: () => <Live initial={USAGE_ALL} />,
  },
  {
    name: 'personal — limits, tokens by day/model',
    keys: '←→ account · esc back',
    render: () => <Live initial="claude" />,
  },
  {
    name: 'work — 5h nearly spent, stale fetch',
    keys: '←→ account · esc back',
    render: () => <Live initial="claude-psyke" />,
  },
  {
    name: 'scanning — first open',
    keys: 'esc back',
    render: () => (
      <UsagePanel
        report={null}
        selected={USAGE_ALL}
        nowSecs={NOW}
        onSelect={noop}
        onClose={noop}
      />
    ),
  },
])
