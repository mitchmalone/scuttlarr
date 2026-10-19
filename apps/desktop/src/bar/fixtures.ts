import type { AwakeSpec, AwakeStatus } from '@scuttlarr/core/awake'
import {
  UPDATES_PLUGIN,
  updatesReportAt,
} from '@scuttlarr/plugins/updates/fixtures'
import { USAGE_PLUGIN, usageReportAt } from '@scuttlarr/plugins/usage/fixtures'
import type {
  AgentSession,
  BarHoverApi,
  BarSnapshot,
  BatteryDetail,
  WifiDetail,
} from '@scuttlarr/tui'
import type { PluginState } from '@scuttlarr/tui/plugins'

/* Sample data shaped like bar.rs's 1 Hz push and the hover-only commands
 * (`bar_battery_detail`, `wifi_status`, `awake_status`). Stamped at render
 * time, because the cells age agents and count down holds off the clock. */

export const nowSecs = () => Math.floor(Date.now() / 1000)

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

export function agents(): AgentSession[] {
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

export function snapshot(over: Partial<BarSnapshot> = {}): BarSnapshot {
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

export const BATTERY: BatteryDetail = {
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

export const WIFI: WifiDetail = {
  iface: 'en0',
  online: true,
  ssid: 'RamenAmok',
  ip: '192.168.1.199',
  router: '192.168.1.1',
  dns: '1.1.1.1',
}

export function awakeStatus(): AwakeStatus {
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

/** The workbench's hover feed: one card held open, nothing else moves. */
export const held = (hovered: string | null = null): BarHoverApi => ({
  hovered,
  enter: () => {},
  leave: () => {},
  stay: () => {},
  cardRef: () => {},
})

export const noop = () => {}
