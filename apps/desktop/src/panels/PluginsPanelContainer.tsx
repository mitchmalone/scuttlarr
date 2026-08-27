import {
  KeyHints,
  ListRow,
  Panel,
  SectionHeader,
  useListNav,
} from '@launcharr/tui'
import '@launcharr/tui/bar.css'
import type { PluginState } from '@launcharr/tui/plugins'
import { invoke } from '@tauri-apps/api/core'
import { Puzzle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { PluginCellHost } from '../plugins/components'
import { usePlugins } from '../plugins/use-plugins'

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
  const nav = useListNav(plugins.length, {
    onBack: onClose,
    onActivate: (i) => {
      const p = plugins[i]
      if (p?.hasPanel && p.enabled) {
        invoke('open_panel', { id: p.id }).catch(console.error)
      }
    },
  })
  const restart = (p: PluginState) => {
    setNote(`restarting ${p.id}…`)
    invoke('plugin_restart', { id: p.id })
      .then(() => setNote(`${p.id} restarted`))
      .catch((e) => setNote(String(e)))
  }
  const selected = plugins[nav.index]

  return (
    <Panel
      autoFocus
      icon={<Puzzle size={17} strokeWidth={2} aria-hidden />}
      title="Plugins"
      subtitle={
        plugins.length
          ? `${plugins.length} installed · ${plugins.filter((p) => p.enabled).length} on`
          : 'none installed'
      }
      onKeyDown={(e) => {
        if (e.key === 'r' && selected && !selected.firstParty) {
          e.preventDefault()
          restart(selected)
          return
        }
        nav.onKeyDown(e)
      }}
      footer={
        <KeyHints
          hints={[
            { keys: '↑↓', label: 'plugin' },
            { keys: '⏎', label: 'panel' },
            { keys: 'r', label: 'restart' },
            { keys: 'esc', label: 'back' },
          ]}
        />
      }
    >
      <SectionHeader label="strip" />
      <div
        className="bar"
        style={{ justifyContent: 'flex-start', gap: 14, borderRadius: 4 }}
      >
        {plugins
          .filter((p) => p.enabled && p.kinds.includes('bar-widget'))
          .map((p) => (
            <PluginCellHost key={p.id} plugin={p} now={now} settings={{}} />
          ))}
      </div>
      <SectionHeader label="installed" />
      {plugins.map((p, i) => (
        <ListRow
          key={p.id}
          selected={i === nav.index}
          label={`${p.name}${p.version ? ` v${p.version}` : ''}`}
          right={galleryStatus(p)}
          dim={!p.enabled}
          onClick={() => nav.setIndex(i)}
        />
      ))}
      {selected && (
        <p className="tui-panel-subtitle">
          {selected.description || `${selected.kinds.join(', ')}`}
          {selected.buildError ? ` — build: ${selected.buildError}` : ''}
          {selected.error ? ` — ${selected.error}` : ''}
        </p>
      )}
      {note && <p className="tui-panel-subtitle">{note}</p>}
    </Panel>
  )
}

function galleryStatus(p: PluginState): string {
  if (!p.enabled) return 'off'
  if (p.buildError) return 'build failed'
  if (p.error) return 'error'
  if (p.firstParty) return 'bundled'
  if (p.running) return 'running'
  if (p.interval) return `every ${p.interval}s`
  if (!p.hasService) return 'ui'
  return 'starting'
}
