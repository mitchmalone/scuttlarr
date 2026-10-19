import {
  endsLabel,
  formatSeconds,
  holdLabel,
  parseSpec,
} from '@scuttlarr/core/awake'
import type { AwakeStatus } from '@scuttlarr/core/awake'
import {
  BarAgents,
  BarAwakeCard,
  BarAwakeCell,
  BarBatteryCell,
  BarClock,
  BarFrontApp,
  type BarHoverApi,
  type BarSnapshot,
  BarWidgetCell,
  BarWifiCell,
  BarWorkspaces,
  type BatteryDetail,
  type WidgetAction,
  type WifiDetail,
  formatBarClock,
} from '@scuttlarr/tui'
import { pluginIdOf } from '@scuttlarr/tui/plugins'
import type { ReactNode } from 'react'

import {
  type BarZones,
  type Config,
  DEFAULT_BAR_LAYOUT,
  type WidgetHome,
  isWidgetModuleId,
  normalizeBarZones,
  notchedZones,
} from '../lib/config'
import { PluginCellHost } from '../plugins/components'

/** The slice of config the strip reads. */
export type BarModulesConfig = Pick<Config, 'bar' | 'agents' | 'widgets'>

/** What a cell click does — the bar window wires each to a Tauri command. */
export interface BarActions {
  switchWorkspace: (ws: string) => void
  jumpAgent: (session: string) => void
  openWifiSettings: () => void
  openBatterySettings: () => void
  releaseAwake: () => void
  runWidgetAction: (action: WidgetAction) => void
}

/** This display's zones: the notched arrangement (explicit or derived) when
 * this bar sits under a notch, else the main layout — normalized, with the
 * live widget set (docs/WIDGETS.md) joining in their manifest zones. */
function displayZones(
  cfg: BarModulesConfig | null,
  notched: boolean,
  widgets: WidgetHome[],
): BarZones {
  const bar = cfg?.bar ?? { enabled: false, layout: DEFAULT_BAR_LAYOUT }
  return notched
    ? notchedZones(bar, widgets)
    : normalizeBarZones(bar.layout, widgets)
}

/**
 * The strip's zones as nodes, from one snapshot and the config: each enabled
 * module rendered by its kit cell, arranged left/center/right. Shared by the
 * bar window (live snapshot, Tauri actions) and the workbench (sample data).
 */
export function barZoneNodes({
  snap,
  now,
  cfg,
  notched,
  hover,
  batteryDetail,
  wifiDetail,
  awakeStatus,
  actions,
}: {
  snap: BarSnapshot | null
  now: Date
  cfg: BarModulesConfig | null
  notched: boolean
  hover: BarHoverApi
  /** Hover-only detail, fetched by the consumer while that card is open. */
  batteryDetail: BatteryDetail | null
  wifiDetail: WifiDetail | null
  awakeStatus: AwakeStatus | null
  actions: BarActions
}): { left: ReactNode[]; center: ReactNode[] | undefined; right: ReactNode[] } {
  // Each widget as a node; order and toggles come from config (Settings →
  // Menubar), arranged into left/center/right zones.
  const moduleNode = (id: string): ReactNode => {
    if (!snap && id !== 'clock') return null
    switch (id) {
      case 'workspaces':
        return (
          <BarWorkspaces
            key={id}
            workspaces={snap!.workspaces}
            focused={snap!.focused}
            onSwitch={actions.switchWorkspace}
          />
        )
      case 'agents':
        return (
          <BarAgents
            key={id}
            agents={
              cfg?.agents.showIdle === false
                ? snap!.agents.filter((a) => a.state !== 'idle')
                : snap!.agents
            }
            now={now}
            hover={hover}
            onJump={actions.jumpAgent}
          />
        )
      case 'frontApp':
        return snap!.frontApp ? (
          <BarFrontApp key={id} name={snap!.frontApp} />
        ) : null
      case 'wifi':
        return (
          <BarWifiCell
            key={id}
            online={snap!.wifi.online}
            ssid={snap!.wifi.ssid}
            rssi={snap!.wifi.rssi}
            hover={hover}
            detail={wifiDetail}
            onClick={actions.openWifiSettings}
          />
        )
      case 'awake': {
        const a = snap!.awake
        const spec = a?.spec ? parseSpec(a.spec) : null
        const remaining =
          a?.untilEpochMs != null
            ? `${formatSeconds(
                Math.max(0, Math.round((a.untilEpochMs - Date.now()) / 1000)),
              )} left`
            : null
        return (
          <BarAwakeCell
            key={id}
            armed={a?.armed ?? false}
            hover={hover}
            onRelease={actions.releaseAwake}
            card={
              <BarAwakeCard
                armed={a?.armed ?? false}
                holdLabel={
                  spec
                    ? holdLabel(spec.screen, spec.disks, spec.away ?? false)
                    : null
                }
                endsLabel={
                  spec ? endsLabel(spec.until, a?.untilEpochMs ?? null) : null
                }
                elapsed={a?.armed ? formatSeconds(a.elapsedSeconds) : null}
                remaining={remaining}
                others={awakeStatus?.others ?? []}
                cardRef={hover.cardRef}
              />
            }
          />
        )
      }
      case 'battery':
        return (
          <BarBatteryCell
            key={id}
            pct={snap!.batteryPct}
            onAc={snap!.onAc}
            charging={snap!.charging}
            chargeLimit={snap!.chargeLimit}
            detail={batteryDetail}
            hover={hover}
            onClick={actions.openBatterySettings}
          />
        )
      case 'clock':
        return <BarClock key={id}>{formatBarClock(now)}</BarClock>
      default: {
        // A plugin's cell (docs/PLUGINS.md): its own component, or the
        // generic widget cell over its state.
        const pid = pluginIdOf(id)
        if (pid) {
          const p = snap!.plugins?.find((p) => p.id === pid)
          return p?.enabled ? (
            <PluginCellHost
              key={id}
              plugin={p}
              now={now}
              hover={hover}
              settings={cfg?.widgets?.[pid] ?? {}}
              onAction={actions.runWidgetAction}
            />
          ) : null
        }
        if (!isWidgetModuleId(id)) return null
        const w = snap!.widgets?.find((w) => `widget:${w.id}` === id)
        return w ? (
          <BarWidgetCell
            key={id}
            widget={w}
            now={now}
            hover={hover}
            onAction={actions.runWidgetAction}
          />
        ) : null
      }
    }
  }

  // Zones are explicit (Settings → Menubar board); a notched display renders
  // no center zone — the camera housing owns it.
  const homes: WidgetHome[] = [
    ...(snap?.widgets ?? []).map((w) => ({ id: w.id, zone: w.zone })),
    ...(snap?.plugins ?? [])
      .filter((p) => p.enabled && p.kinds.includes('bar-widget'))
      .map((p) => ({ id: p.id, zone: p.zone, kind: 'plugin' as const })),
  ]
  const zones = displayZones(cfg, notched, homes)
  const render = (list: { id: string; enabled: boolean }[]) =>
    list.filter((m) => m.enabled).map((m) => moduleNode(m.id))
  return {
    left: render(zones.left),
    center: notched ? undefined : render(zones.center).filter(Boolean),
    right: render(zones.right),
  }
}
