import { BarUsageCell, type UsageReport } from '@scuttlarr/tui'
import { foldUsageBarState } from '@scuttlarr/tui/bar'
import type { PluginCellProps } from '@scuttlarr/tui/plugins'

/**
 * The usage cell: the tiny meter plus the tightest window's percent across
 * every account. State is usage.rs's `UsageReport` (the `usage` native
 * provider); null means the monitor is off — no cell. Click summons the
 * panel. First-party, but written to the plugin contract exactly as a
 * third-party cell would be (docs/PLUGINS.md).
 */
export default function UsageCell({
  state,
  now,
  hover,
  host,
}: PluginCellProps<UsageReport>) {
  if (!state) return null
  return (
    <BarUsageCell
      usage={foldUsageBarState(state)}
      nowSecs={Math.floor(now.getTime() / 1000)}
      hover={hover}
      onClick={() => host.openPanel()}
    />
  )
}
