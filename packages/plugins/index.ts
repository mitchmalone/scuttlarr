import type {
  PluginCellComponent,
  PluginManifest,
  PluginPanelComponent,
} from '@scuttlarr/tui/plugins'

import CalendarCell from './calendar/cell'
import calendarManifest from './calendar/manifest.json'
import CalendarPanel from './calendar/panel'
import UpdatesCell from './updates/cell'
import updatesManifest from './updates/manifest.json'
import UpdatesPanel from './updates/panel'
import UsageCell from './usage/cell'
import usageManifest from './usage/manifest.json'
import UsagePanel from './usage/panel'

/**
 * The plugins bundled with scuttlarr, keyed by id. Same contract as a plugin
 * in `~/.config/scuttlarr/plugins/` (docs/PLUGINS.md); the difference is that
 * these are Vite-bundled with the app and take their state from a Rust
 * provider (`manifest.native`), so the app never needs Bun for its own
 * panels. plugins.rs embeds the same manifests (`FIRST_PARTY`) — keep the two
 * lists in step.
 */
export interface FirstPartyPlugin {
  manifest: PluginManifest
  // Components are typed loosely here: each plugin narrows its own state.
  cell?: PluginCellComponent<never>
  panel?: PluginPanelComponent<never>
}

export const FIRST_PARTY: Record<string, FirstPartyPlugin> = {
  usage: {
    manifest: usageManifest as PluginManifest,
    cell: UsageCell as PluginCellComponent<never>,
    panel: UsagePanel as PluginPanelComponent<never>,
  },
  calendar: {
    manifest: calendarManifest as PluginManifest,
    cell: CalendarCell as PluginCellComponent<never>,
    panel: CalendarPanel as PluginPanelComponent<never>,
  },
  updates: {
    manifest: updatesManifest as PluginManifest,
    cell: UpdatesCell as PluginCellComponent<never>,
    panel: UpdatesPanel as PluginPanelComponent<never>,
  },
}
