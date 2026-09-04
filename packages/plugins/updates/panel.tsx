import {
  KeyHints,
  ListRow,
  Panel,
  SectionHeader,
  useListNav,
} from '@launcharr/tui'
import type { PluginPanelProps } from '@launcharr/tui/plugins'
import { Package } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  type UpdatesReport,
  checkedAgo,
  panelRows,
  totalUpdates,
} from './model'

/** Unix seconds, ticking — "checked N ago" stays live while the panel is open. */
function useNowSecs(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

/**
 * `updates ⏎`: a `SectionHeader` per source (label · count, the upgrade
 * command dim on the right), a `ListRow` per pending item. `r` kicks a
 * refresh, `c`/Enter copies the selected row's upgrade command, `↑↓` via
 * `useListNav`, Esc closes.
 */
export default function UpdatesPanel({
  state,
  host,
  onClose,
}: PluginPanelProps<UpdatesReport>) {
  const nowSecs = useNowSecs()

  // Hooks run unconditionally: `rows` is [] before the first report, so
  // `useListNav` below always sees a stable count for this render.
  const rows = state ? panelRows(state) : []
  const selectableIndexes = rows
    .map((row, i) => (row.selectable ? i : -1))
    .filter((i) => i >= 0)

  const copySelected = (selIndex: number) => {
    const row = rows[selectableIndexes[selIndex] ?? -1]
    if (row) host.copy(row.upgradeCommand)
  }

  const upgradeSelected = (selIndex: number) => {
    const row = rows[selectableIndexes[selIndex] ?? -1]
    if (!row) return
    host.send({ upgrade: row.sourceId })
    onClose()
  }

  const nav = useListNav(selectableIndexes.length, {
    onActivate: upgradeSelected,
    onBack: onClose,
  })

  if (!state) {
    return (
      <Panel
        autoFocus
        icon={<Package size={17} strokeWidth={2} aria-hidden />}
        title="Updates"
        subtitle="checking…"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
        footer={<KeyHints hints={[{ keys: 'esc', label: 'back' }]} />}
      >
        <ListRow dim label="checking…" />
      </Panel>
    )
  }

  const total = totalUpdates(state)

  return (
    <Panel
      autoFocus
      icon={<Package size={17} strokeWidth={2} aria-hidden />}
      title="Updates"
      subtitle={`${total} update${total === 1 ? '' : 's'} · ${checkedAgo(state.generatedAt, nowSecs)}`}
      onKeyDown={(e) => {
        if (e.key === 'r') {
          e.preventDefault()
          host.send({ refresh: true })
        } else if (e.key === 'c') {
          e.preventDefault()
          copySelected(nav.index)
        } else if (e.key === 'a') {
          e.preventDefault()
          host.send({ upgrade: 'all' })
          onClose()
        } else {
          nav.onKeyDown(e)
        }
      }}
      footer={
        <KeyHints
          hints={[
            { keys: '↵', label: 'upgrade' },
            { keys: 'a', label: 'upgrade all' },
            { keys: 'c', label: 'copy command' },
            { keys: 'r', label: 'refresh' },
            { keys: 'esc', label: 'back' },
          ]}
        />
      }
    >
      {rows.map((row, i) => {
        if (row.kind === 'header') {
          return (
            <SectionHeader
              key={`h-${row.sourceId}`}
              label={`${row.label} · ${row.count}`}
              right={row.upgradeCommand}
            />
          )
        }
        const selIndex = selectableIndexes.indexOf(i)
        const selected = selIndex >= 0 && selIndex === nav.index
        if (row.kind === 'item') {
          return (
            <ListRow
              key={`${row.sourceId}-${row.name}`}
              label={row.name}
              right={`${row.installed} → ${row.available}`}
              selected={selected}
              onHover={() => nav.setIndex(selIndex)}
              onClick={() => {
                nav.setIndex(selIndex)
                host.copy(row.upgradeCommand)
              }}
            />
          )
        }
        if (row.kind === 'clean') {
          return (
            <ListRow
              key={`clean-${row.sourceId}`}
              dim
              label="up to date"
              selected={selected}
              onHover={() => nav.setIndex(selIndex)}
              onClick={() => nav.setIndex(selIndex)}
            />
          )
        }
        return (
          <ListRow
            key={`error-${row.sourceId}`}
            label={`error: ${row.error}`}
            selected={selected}
            onHover={() => nav.setIndex(selIndex)}
            onClick={() => nav.setIndex(selIndex)}
          />
        )
      })}
    </Panel>
  )
}
