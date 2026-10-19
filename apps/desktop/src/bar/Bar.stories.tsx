import { usageReportAt } from '@scuttlarr/plugins/usage/fixtures'
import {
  Bar,
  type BarSnapshot,
  defineStories,
  foldUsageBarState,
  usageCardHeight,
} from '@scuttlarr/tui'
import '@scuttlarr/tui/bar.css'

import {
  type BarZones,
  DEFAULT_AGENTS_CONFIG,
  DEFAULT_BAR_LAYOUT,
} from '../lib/config'
import {
  BATTERY,
  WIFI,
  awakeStatus,
  held,
  noop,
  nowSecs,
  snapshot,
} from './fixtures'
import { type BarModulesConfig, barZoneNodes } from './modules'

/* Every module in the layout: the default zones plus the widget and the two
 * extra plugins, so one strip shows each kind of cell. */
const FULL_LAYOUT: BarZones = {
  ...DEFAULT_BAR_LAYOUT,
  right: [
    { id: 'widget:github-actions', enabled: true },
    { id: 'plugin:weather', enabled: true },
    { id: 'plugin:updates', enabled: true },
    ...DEFAULT_BAR_LAYOUT.right,
  ],
}

const config = (
  layout: BarZones = FULL_LAYOUT,
  notchedLayout: BarZones | null = null,
): BarModulesConfig => ({
  bar: { enabled: true, layout, notchedLayout },
  agents: DEFAULT_AGENTS_CONFIG,
  widgets: {},
})

function strip({
  snap = snapshot(),
  cfg = config(),
  notched = false,
  hovered = null,
  room = 0,
}: {
  snap?: BarSnapshot | null
  cfg?: BarModulesConfig
  notched?: boolean
  hovered?: string | null
  /** Space under the strip for an open card (the app grows its window). */
  room?: number
}) {
  return (
    <div style={{ paddingBottom: room }}>
      <Bar
        {...barZoneNodes({
          snap,
          now: new Date(),
          cfg,
          notched,
          hover: held(hovered),
          batteryDetail: hovered === 'battery' ? BATTERY : null,
          wifiDetail: hovered === 'wifi' ? WIFI : null,
          awakeStatus: hovered === 'awake' ? awakeStatus() : null,
          actions: {
            switchWorkspace: noop,
            jumpAgent: noop,
            openWifiSettings: noop,
            openBatterySettings: noop,
            releaseAwake: noop,
            runWidgetAction: noop,
          },
        })}
      />
    </div>
  )
}

export const barStories = defineStories('Bar (app)', [
  {
    name: 'full strip — every kind of cell',
    notes:
      'Workspaces, agent cells, front app, clock, a user widget, a data-only plugin, updates, wifi, awake, usage, battery. Use the bar strip viewport.',
    render: () => strip({}),
  },
  {
    name: 'default layout',
    notes: 'DEFAULT_BAR_LAYOUT with the bundled plugins only.',
    render: () =>
      strip({
        cfg: config(DEFAULT_BAR_LAYOUT),
        snap: snapshot({ widgets: [] }),
      }),
  },
  {
    name: 'notched display — center folds into the right',
    notes:
      'No center zone under a notch: the derived notched layout moves the clock to the head of the right zone.',
    render: () => strip({ notched: true }),
  },
  {
    name: 'notched display — explicit notchedLayout',
    render: () =>
      strip({
        notched: true,
        cfg: config(FULL_LAYOUT, {
          left: [
            { id: 'workspaces', enabled: true },
            { id: 'frontApp', enabled: true },
          ],
          center: [],
          right: [
            { id: 'agents', enabled: true },
            { id: 'clock', enabled: true },
            { id: 'plugin:usage', enabled: true },
            { id: 'battery', enabled: true },
          ],
        }),
      }),
  },
  {
    name: 'custom zones — agents centred, status left',
    notes:
      'Zones are explicit (Settings → Menubar board); any module in any zone.',
    render: () =>
      strip({
        cfg: config({
          left: [
            { id: 'workspaces', enabled: true },
            { id: 'wifi', enabled: true },
            { id: 'battery', enabled: true },
          ],
          center: [
            { id: 'agents', enabled: true },
            { id: 'plugin:usage', enabled: true },
          ],
          right: [
            { id: 'frontApp', enabled: true },
            { id: 'awake', enabled: false },
            { id: 'clock', enabled: true },
          ],
        }),
      }),
  },
  {
    name: 'charging, nothing armed, no agents',
    render: () =>
      strip({
        snap: snapshot({
          agents: [],
          batteryPct: 41,
          onAc: true,
          charging: true,
          awake: null,
        }),
      }),
  },
  {
    name: 'low battery, wifi poor',
    render: () =>
      strip({
        snap: snapshot({
          batteryPct: 8,
          wifi: { online: true, ssid: 'Cafe Guest', rssi: -84 },
        }),
      }),
  },
  {
    name: 'offline, desktop Mac (no battery)',
    render: () =>
      strip({
        snap: snapshot({
          batteryPct: null,
          onAc: true,
          wifi: { online: false, ssid: null, rssi: null },
        }),
      }),
  },
  {
    name: 'first paint — before the first snapshot',
    notes: 'Only the clock renders until bar_snapshot answers.',
    render: () => strip({ snap: null }),
  },
])

export const barCardStories = defineStories('Bar hover cards (app)', [
  {
    name: 'battery card — on battery',
    render: () => strip({ hovered: 'battery', room: 280 }),
  },
  {
    name: 'battery card — charging to the limit',
    render: () =>
      strip({
        snap: snapshot({ batteryPct: 72, onAc: true, charging: true }),
        hovered: 'battery',
        room: 280,
      }),
  },
  {
    name: 'wifi card',
    render: () => strip({ hovered: 'wifi', room: 200 }),
  },
  {
    name: 'awake card — held while agents work',
    render: () => strip({ hovered: 'awake', room: 220 }),
  },
  {
    name: 'agent card — working with a subagent',
    render: () => strip({ hovered: 'agent:a1', room: 200 }),
  },
  {
    name: 'agent card — needs attention',
    render: () => strip({ hovered: 'agent:a2', room: 200 }),
  },
  {
    name: 'usage card',
    render: () =>
      strip({
        hovered: 'usage',
        room: usageCardHeight(foldUsageBarState(usageReportAt(nowSecs()))) + 20,
      }),
  },
  {
    name: 'updates card',
    render: () => strip({ hovered: 'plugin:updates', room: 260 }),
  },
  {
    name: 'widget card — GitHub Actions',
    render: () => strip({ hovered: 'widget:github-actions', room: 200 }),
  },
  {
    name: 'plugin card — data-only plugin',
    render: () => strip({ hovered: 'widget:weather', room: 160 }),
  },
])
