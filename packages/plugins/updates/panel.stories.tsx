import { defineStories } from '@scuttlarr/tui'
import { NOOP_HOST } from '@scuttlarr/tui/plugins'

import { UPDATES_PLUGIN, updatesReportAt } from './fixtures'
import type { UpdatesReport } from './model'
import UpdatesPanel from './panel'

const noop = () => {}

/* The panel ticks "checked N ago" off the real clock, so the report is
 * stamped at render time rather than at the fixture's fixed instant. */
const nowSecs = () => Math.floor(Date.now() / 1000)

function panel(state: UpdatesReport | null) {
  return (
    <UpdatesPanel
      plugin={{ ...UPDATES_PLUGIN, state }}
      state={state}
      settings={{}}
      host={NOOP_HOST}
      onClose={noop}
    />
  )
}

export const updatesPanelStories = defineStories('UpdatesPanel (plugin)', [
  {
    name: 'pending updates, nothing running',
    notes: 'One header per source, a row per item; mise’s check failed.',
    keys: '↑↓ item · ⏎ upgrade · a all · t terminal · r refresh · c copy · esc back',
    render: () => panel({ ...updatesReportAt(nowSecs()), upgrade: null }),
  },
  {
    name: 'upgrade running in the panel',
    keys: 'x cancel · esc back',
    render: () => panel(updatesReportAt(nowSecs())),
  },
  {
    name: 'upgrade finished',
    render: () => {
      const t = nowSecs()
      const r = updatesReportAt(t)
      return panel({
        ...r,
        upgrade: {
          ...r.upgrade!,
          finishedAt: t - 2,
          exitCode: 0,
          tail: [...r.upgrade!.tail, '==> Upgraded gcc, vips, repobar'],
        },
      })
    },
  },
  {
    name: 'upgrade failed',
    render: () => {
      const t = nowSecs()
      const r = updatesReportAt(t)
      return panel({
        ...r,
        upgrade: {
          ...r.upgrade!,
          finishedAt: t - 2,
          exitCode: 1,
          tail: [...r.upgrade!.tail, 'Error: gcc: checksum mismatch'],
        },
      })
    },
  },
  {
    name: 'refreshing',
    render: () =>
      panel({ ...updatesReportAt(nowSecs()), refreshing: true, upgrade: null }),
  },
  {
    name: 'everything up to date',
    render: () => {
      const r = updatesReportAt(nowSecs())
      return panel({
        ...r,
        upgrade: null,
        sources: r.sources.map((s) => ({ ...s, items: [], error: null })),
      })
    },
  },
  {
    name: 'before the first check',
    render: () => panel(null),
  },
])
