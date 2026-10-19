import type { AwakeSpec, AwakeStatus } from '@scuttlarr/core/awake'
import {
  UPDATES_PLUGIN,
  updatesReportAt,
} from '@scuttlarr/plugins/updates/fixtures'
import { USAGE_PLUGIN, usageReportAt } from '@scuttlarr/plugins/usage/fixtures'
import {
  type AgentSession,
  Bar,
  type BarHoverApi,
  type BarSnapshot,
  type BatteryDetail,
  type WifiDetail,
  defineStories,
  foldUsageBarState,
  usageCardHeight,
} from '@scuttlarr/tui'
import '@scuttlarr/tui/bar.css'
import type { PluginState } from '@scuttlarr/tui/plugins'

import {
  type BarZones,
  DEFAULT_AGENTS_CONFIG,
  DEFAULT_BAR_LAYOUT,
} from '../lib/config'
import { type BarModulesConfig, barZoneNodes } from './modules'

/* Sample data shaped like bar.rs's 1 Hz push and the hover-only commands
 * (`bar_battery_detail`, `wifi_status`, `awake_status`). Stamped at render
 * time, because the cells age agents and count down holds off the clock. */

const nowSecs = () => Math.floor(Date.now() / 1000)

const agent = (
  over: Partial<AgentSession> & Pick<AgentSession, 'session' | 'state'>,
): AgentSession => ({
  agent: 'claude',
  title: '',
  detail: '',
  mux: 'tmux',
  muxTarget: '%1',
  updatedAt: nowSecs() - 30,
  muxGroup: 'scuttlarr',
  muxIndex: 1,
  muxLabel: 'main',
  pid: null,
  pidComm: null,
  subagents: [],
  ...over,
})

function agents(): AgentSession[] {
  const t = nowSecs()
  return [
    agent({
      session: 'a1',
      state: 'working',
      title: 'extract the launcher into the kit',
      detail: 'Edit packages/tui/src/components/launcher.tsx',
      updatedAt: t - 12,
      subagents: [
        {
          id: 'sub1',
          kind: 'Explore',
          description: 'map the story call sites',
          startedAt: t - 40,
        },
      ],
    }),
    agent({
      session: 'a2',
      state: 'attention',
      title: 'release v0.8.0 — awaiting approval',
      detail: 'permission needed: scripts/release.sh',
      muxTarget: '%2',
      muxIndex: 2,
      muxLabel: 'release',
      updatedAt: t - 47,
    }),
    agent({
      session: 'a3',
      agent: 'codex',
      state: 'done',
      title: 'usage panel — tests green',
      detail: '14 passed, 0 failed',
      muxTarget: '%3',
      muxGroup: 'www',
      muxIndex: 1,
      muxLabel: 'panels',
      updatedAt: t - 184,
    }),
    agent({
      session: 'a4',
      state: 'idle',
      detail: 'waiting for a task',
      muxTarget: '%4',
      muxGroup: 'www',
      muxIndex: 2,
      updatedAt: t - 900,
    }),
  ]
}

const AWAKE_SPEC: AwakeSpec = {
  screen: false,
  disks: false,
  until: { kind: 'agents' },
  floor: 20,
}

/** A data-only third-party plugin (no `cell.tsx`): the generic widget cell
 * paints its state, as PluginCellHost does for any plugin without UI. */
const WEATHER_PLUGIN: PluginState = {
  id: 'weather',
  name: 'Weather',
  version: '0.2.0',
  description: 'Current conditions from the BOM — a tick plugin without UI.',
  kinds: ['bar-widget'],
  zone: 'right',
  icon: 'cloud-sun',
  firstParty: false,
  enabled: true,
  hasCell: false,
  hasPanel: false,
  hasService: true,
  interval: 600,
  builtAt: null,
  buildError: null,
  state: {
    icon: 'cloud-sun',
    label: '18°',
    card: {
      title: 'Sydney',
      subtitle: 'partly cloudy',
      rows: [
        { text: 'feels like 16°' },
        { text: 'rain 20%', hint: 'this afternoon' },
      ],
    },
  },
  error: null,
  lastOk: 1_800_000_000,
  updatedAt: 1_800_000_000,
  restarts: 0,
  running: true,
  panel: null,
}

function snapshot(over: Partial<BarSnapshot> = {}): BarSnapshot {
  const t = nowSecs()
  return {
    workspaces: ['1', '2', '3', 'T', 'W'],
    focused: '2',
    frontApp: 'Ghostty',
    batteryPct: 64,
    onAc: false,
    charging: false,
    chargeLimit: 80,
    wifi: { online: true, ssid: 'RamenAmok', rssi: -58 },
    agents: agents(),
    awake: {
      armed: true,
      display: false,
      disks: false,
      elapsedSeconds: 2 * 3600 + 14 * 60,
      untilEpochMs: null,
      batteryFloor: 20,
      spec: JSON.stringify(AWAKE_SPEC),
      released: null,
      resumed: false,
    },
    widgets: [
      {
        id: 'github-actions',
        name: 'GitHub Actions',
        zone: 'right',
        icon: 'git-branch',
        view: {
          icon: 'circle-check',
          label: '3',
          tone: 'ok',
          card: {
            title: 'GitHub Actions',
            subtitle: 'mitchmalone/scuttlarr',
            rows: [
              { dot: 'ok', text: 'verify', hint: 'main · 4m' },
              { dot: 'ok', text: 'release', hint: 'v0.7.0 · 18d' },
              { dot: 'warn', text: 'www preview', hint: 'queued' },
            ],
          },
        },
        error: null,
        lastOk: t,
        updatedAt: t,
      },
    ],
    plugins: [
      { ...USAGE_PLUGIN, state: usageReportAt(t) },
      { ...UPDATES_PLUGIN, state: updatesReportAt(t) },
      WEATHER_PLUGIN,
    ],
    ...over,
  }
}

const BATTERY: BatteryDetail = {
  pct: 64,
  onAc: false,
  charging: false,
  fullyCharged: false,
  chargeLimit: 80,
  cycleCount: 212,
  capacityWh: 66.4,
  designWh: 72.6,
  healthPct: 91,
  minutesRemaining: 287,
  batteryWatts: -7.9,
  systemWatts: null,
  powerMode: 'automatic',
}

const WIFI: WifiDetail = {
  iface: 'en0',
  online: true,
  ssid: 'RamenAmok',
  ip: '192.168.1.199',
  router: '192.168.1.1',
  dns: '1.1.1.1',
}

function awakeStatus(): AwakeStatus {
  return {
    state: {
      armed: true,
      display: false,
      disks: false,
      away: false,
      elapsedSeconds: 2 * 3600 + 14 * 60,
      untilEpochMs: null,
      batteryFloor: 20,
      spec: JSON.stringify(AWAKE_SPEC),
      released: null,
      resumed: false,
      sleepOff: true,
    },
    others: [
      { app: 'zoom.us', seconds: 1260, display: true },
      { app: 'Music', seconds: 380, display: false },
    ],
    away: { installed: true, screenReady: false, others: [] },
  }
}

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

/** The workbench's hover feed: one card held open, nothing else moves. */
const held = (hovered: string | null = null): BarHoverApi => ({
  hovered,
  enter: () => {},
  leave: () => {},
  stay: () => {},
  cardRef: () => {},
})

const noop = () => {}

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
