import { PluginPanelHost } from './components'

/** Props every panel component receives; static panels ignore `id`/`settings`. */
export type PanelProps = {
  onClose: () => void
  /** Plugin panels: which plugin, and its `widgets.<id>` settings. */
  id?: string
  settings?: Record<string, string>
}

/**
 * One component for every plugin panel. Its identity never changes, so React
 * keeps the open panel mounted while the plugin list or settings rebuild —
 * `id` and `settings` flow in as props instead of being closed over.
 */
export function PluginPanel({ id, settings, onClose }: PanelProps) {
  if (!id) return null
  return <PluginPanelHost id={id} settings={settings ?? {}} onClose={onClose} />
}

/** The PANELS entry for a plugin: data only, over the shared component. */
export function pluginPanelEntry(
  p: { id: string; icon?: string | null },
  info: {
    title: string
    hint: string
    aliases: string[]
    triggers: string[]
  },
  settings: Record<string, string>,
) {
  return {
    title: info.title,
    hint: info.hint,
    icon: p.icon,
    aliases: info.aliases,
    triggers: info.triggers,
    component: PluginPanel,
    props: { id: p.id, settings },
  }
}
