import { FIRST_PARTY } from '@scuttlarr/plugins'
import {
  UPDATES_PLUGIN,
  updatesReportAt,
} from '@scuttlarr/plugins/updates/fixtures'
import { USAGE_PLUGIN, usageReportAt } from '@scuttlarr/plugins/usage/fixtures'
import { defineStories } from '@scuttlarr/tui'
import type { PluginState } from '@scuttlarr/tui/plugins'

import { PluginCellHost } from '../plugins/components'
import { PluginsPanel } from './PluginsPanel'

/* Plugins as plugins.rs lists them. Cells go through the app's own
 * PluginCellHost: bundled components for first-party, the generic widget
 * cell for a data-only plugin and for a broken build. */

const calendarManifest = FIRST_PARTY.calendar!.manifest

const nowSecs = () => Math.floor(Date.now() / 1000)

const base = {
  firstParty: false,
  enabled: true,
  hasCell: false,
  hasPanel: false,
  hasService: true,
  interval: null,
  builtAt: null,
  buildError: null,
  error: null,
  lastOk: null,
  updatedAt: null,
  restarts: 0,
  running: true,
  panel: null,
} satisfies Partial<PluginState>

function plugins(): PluginState[] {
  const t = nowSecs()
  return [
    { ...USAGE_PLUGIN, state: usageReportAt(t) },
    { ...UPDATES_PLUGIN, state: updatesReportAt(t) },
    {
      ...base,
      id: calendarManifest.id,
      name: calendarManifest.name ?? 'Calendar',
      version: calendarManifest.version ?? '',
      description: calendarManifest.description ?? '',
      kinds: calendarManifest.kinds ?? [],
      zone: calendarManifest.zone ?? 'center',
      icon: calendarManifest.icon ?? null,
      firstParty: true,
      hasCell: true,
      hasPanel: true,
      hasService: false,
      running: false,
      state: null,
      panel: calendarManifest.panel ?? null,
    },
    {
      ...base,
      id: 'weather',
      name: 'Weather',
      version: '0.2.0',
      description: 'Current conditions — a tick plugin without UI.',
      kinds: ['bar-widget'],
      zone: 'right',
      icon: 'cloud-sun',
      interval: 600,
      state: { icon: 'cloud-sun', label: '18°' },
      lastOk: t,
      updatedAt: t,
    },
    {
      ...base,
      id: 'lights',
      name: 'Lights',
      version: '0.3.0',
      description:
        'Every light in one cell — amaran over Bluetooth, Home over Shortcuts.',
      kinds: ['bar-widget', 'panel'],
      zone: 'right',
      icon: 'lightbulb',
      hasCell: true,
      hasPanel: true,
      builtAt: t - 60,
      buildError: 'cell.tsx:14: Could not resolve "@scuttlarr/tui/bar"',
      state: null,
      running: false,
    },
    {
      ...base,
      id: 'hello',
      name: 'Hello',
      version: '0.1.0',
      description:
        'The reference plugin: a Bun service streaming state, a cell with a card, a panel — copy this directory to start yours.',
      kinds: ['bar-widget', 'panel'],
      zone: 'right',
      icon: 'hand',
      enabled: false,
      hasCell: true,
      hasPanel: true,
      running: false,
      state: null,
    },
  ]
}

const noop = () => {}

function panel(list: PluginState[], note: string | null = null) {
  const now = new Date()
  return (
    <PluginsPanel
      plugins={list}
      renderCell={(p) => (
        <PluginCellHost key={p.id} plugin={p} now={now} settings={{}} />
      )}
      note={note}
      onOpen={noop}
      onRestart={noop}
      onClose={noop}
    />
  )
}

export const pluginsPanelStories = defineStories('PluginsPanel (app)', [
  {
    name: 'gallery — bundled, data-only, broken and off',
    notes:
      'The strip renders every enabled bar plugin through PluginCellHost; a failed build paints its own cell red.',
    keys: '↑↓ plugin · ⏎ panel · r restart · esc back',
    render: () => panel(plugins()),
  },
  {
    name: 'broken build selected',
    render: () => {
      const list = plugins()
      const broken = list.filter((p) => p.id === 'lights')
      return panel([...broken, ...list.filter((p) => p.id !== 'lights')])
    },
  },
  {
    name: 'after a restart',
    render: () => {
      const list = plugins()
      const weather = list.filter((p) => p.id === 'weather')
      return panel(
        [...weather, ...list.filter((p) => p.id !== 'weather')],
        'weather restarted',
      )
    },
  },
  {
    name: 'none installed',
    render: () => panel([]),
  },
])
