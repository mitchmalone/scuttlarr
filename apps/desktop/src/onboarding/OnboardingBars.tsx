import { USAGE_PLUGIN, usageReportAt } from '@scuttlarr/plugins/usage/fixtures'
import { Bar } from '@scuttlarr/tui'
import '@scuttlarr/tui/bar.css'

import { held, noop, nowSecs, snapshot } from '../bar/fixtures'
import { type BarModulesConfig, barZoneNodes } from '../bar/modules'
import {
  BAR_MODULE_IDS,
  type BarZones,
  DEFAULT_AGENTS_CONFIG,
} from '../lib/config'

/* The real bar, not a drawing: the bar window's own components over the stories'
 * sample data, themed by the same panel tokens the bar window applies. */

const ACTIONS = {
  switchWorkspace: noop,
  jumpAgent: noop,
  openWifiSettings: noop,
  openBatterySettings: noop,
  releaseAwake: noop,
  runWidgetAction: noop,
}

/** Exactly these modules: normalizeBarZones appends any known module a layout
 * leaves out, so every other one is listed, switched off. */
function only(left: string[], center: string[], right: string[]): BarZones {
  const on = (ids: string[]) => ids.map((id) => ({ id, enabled: true }))
  const shown = new Set([...left, ...center, ...right])
  const off = BAR_MODULE_IDS.filter((id) => !shown.has(id)).map((id) => ({
    id,
    enabled: false,
  }))
  return { left: on(left), center: on(center), right: [...on(right), ...off] }
}

const cfg = (layout: BarZones): BarModulesConfig => ({
  bar: { enabled: true, layout, notchedLayout: null },
  agents: { ...DEFAULT_AGENTS_CONFIG, monitor: true },
  widgets: {},
})

/** The bar on a fresh Mac: workspaces, the front app, the clock, wifi, battery. */
const BAR_LAYOUT = only(
  ['workspaces', 'frontApp'],
  ['clock'],
  ['wifi', 'battery'],
)

/** With agents, notched (the clock folds right) so the cluster and its card have room. */
const agentsLayout = (usage: boolean) =>
  only(
    ['workspaces', 'agents'],
    ['clock'],
    usage ? ['wifi', 'plugin:usage', 'battery'] : ['wifi', 'battery'],
  )

const WORKSPACES = { workspaces: ['1', '2', '3', '4'], focused: '1' }

function Strip({
  layout,
  notched,
  withUsage,
  hovered,
}: {
  layout: BarZones
  notched: boolean
  withUsage: boolean
  hovered: string | null
}) {
  const snap = snapshot({
    ...WORKSPACES,
    widgets: [],
    plugins: withUsage
      ? [{ ...USAGE_PLUGIN, state: usageReportAt(nowSecs()) }]
      : [],
  })
  return (
    <Bar
      {...barZoneNodes({
        snap,
        now: new Date(),
        cfg: cfg(layout),
        notched,
        hover: held(hovered),
        batteryDetail: null,
        wifiDetail: null,
        awakeStatus: null,
        actions: ACTIONS,
      })}
    />
  )
}

export function BarPreview({ off }: { off: boolean }) {
  return (
    <div className={`ob-bar${off ? ' ob-off' : ''}`}>
      <Strip
        layout={BAR_LAYOUT}
        notched={false}
        withUsage={false}
        hovered={null}
      />
    </div>
  )
}

/** The agent cluster with the blocked session's card held open, as the bar shows it. */
export function AgentsPreview({
  off,
  usage,
}: {
  off: boolean
  usage: boolean
}) {
  return (
    <div className="ob-agents">
      <div className={`ob-bar${off ? ' ob-off' : ''}`}>
        <Strip
          layout={agentsLayout(usage)}
          notched
          withUsage={usage}
          hovered="agent:a2"
        />
      </div>
    </div>
  )
}
