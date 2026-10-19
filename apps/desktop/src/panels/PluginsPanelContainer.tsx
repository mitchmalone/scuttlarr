import type { PluginState } from '@scuttlarr/tui/plugins'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'

import { PluginCellHost } from '../plugins/components'
import { usePlugins } from '../plugins/use-plugins'
import { PluginsPanel } from './PluginsPanel'

/**
 * `plugins ⏎` — the gallery (Omarchy has a dev-gallery; this is ours): every
 * plugin with its live cell rendered in a strip, its health, and the keys to
 * open its panel, restart it, or switch it off. The place to look while
 * writing one: edit `cell.tsx`, watch the strip hot-swap.
 */
export function PluginsPanelContainer({ onClose }: { onClose: () => void }) {
  const plugins = usePlugins(1000)
  const [note, setNote] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const restart = (p: PluginState) => {
    setNote(`restarting ${p.id}…`)
    invoke('plugin_restart', { id: p.id })
      .then(() => setNote(`${p.id} restarted`))
      .catch((e) => setNote(String(e)))
  }

  return (
    <PluginsPanel
      plugins={plugins}
      renderCell={(p) => (
        <PluginCellHost key={p.id} plugin={p} now={now} settings={{}} />
      )}
      note={note}
      onOpen={(p) => invoke('open_panel', { id: p.id }).catch(console.error)}
      onRestart={restart}
      onClose={onClose}
    />
  )
}
