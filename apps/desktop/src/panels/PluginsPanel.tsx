/**
 * Plugins panel, presentational half — `plugins ⏎`, the gallery: every
 * plugin's live cell in a strip, its health, and the keys to open its panel
 * or restart it. Pure props + @scuttlarr/tui — no tauri imports; the
 * container hands in the plugin list and how a cell renders.
 */
import {
  KeyHints,
  ListRow,
  Panel,
  SectionHeader,
  useListNav,
} from '@scuttlarr/tui'
import '@scuttlarr/tui/bar.css'
import type { PluginState } from '@scuttlarr/tui/plugins'
import { Puzzle } from 'lucide-react'
import type { ReactNode } from 'react'

export interface PluginsPanelProps {
  plugins: PluginState[]
  /** A plugin's bar cell, as the bar would render it. */
  renderCell: (plugin: PluginState) => ReactNode
  /** The last restart's outcome, if any. */
  note: string | null
  onOpen: (plugin: PluginState) => void
  onRestart: (plugin: PluginState) => void
  onClose: () => void
}

export function PluginsPanel({
  plugins,
  renderCell,
  note,
  onOpen,
  onRestart,
  onClose,
}: PluginsPanelProps) {
  const nav = useListNav(plugins.length, {
    onBack: onClose,
    onActivate: (i) => {
      const p = plugins[i]
      if (p?.hasPanel && p.enabled) onOpen(p)
    },
  })
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
          onRestart(selected)
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
          .map(renderCell)}
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
