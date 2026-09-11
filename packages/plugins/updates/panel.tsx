import {
  KeyHints,
  ListRow,
  Panel,
  SectionHeader,
  useListNav,
} from '@scuttlarr/tui'
import type { PluginPanelProps } from '@scuttlarr/tui/plugins'
import { Package } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  type UpdatesReport,
  checkedAgo,
  panelRows,
  totalUpdates,
  upgradeFailed,
  upgradeLine,
  upgradeRunning,
} from './model'

/** Output lines shown under the run headline — enough to see what's going on. */
const TAIL_SHOWN = 12

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
 * command dim on the right), a `ListRow` per pending item. `↵` upgrades the
 * selected source in the panel (`a` everything) — the run's headline and
 * output tail sit at the top while it goes; `x` cancels. `t` hands the
 * selected source to the terminal instead (a tty for sudo). `r` refreshes,
 * `c` copies the command, `↑↓` via `useListNav`, Esc closes.
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

  const running = upgradeRunning(state)

  const upgradeSelected = (selIndex: number) => {
    const row = rows[selectableIndexes[selIndex] ?? -1]
    if (!row || running) return
    host.send({ upgrade: row.sourceId })
  }

  const terminalSelected = (selIndex: number) => {
    const row = rows[selectableIndexes[selIndex] ?? -1]
    if (!row) return
    host.send({ upgradeInTerminal: row.sourceId })
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
          if (!running) host.send({ upgrade: 'all' })
        } else if (e.key === 't') {
          e.preventDefault()
          terminalSelected(nav.index)
        } else if (e.key === 'x') {
          e.preventDefault()
          if (running) host.send({ cancelUpgrade: true })
        } else {
          nav.onKeyDown(e)
        }
      }}
      footer={
        <KeyHints
          hints={
            running
              ? [
                  { keys: 'x', label: 'cancel' },
                  { keys: 'r', label: 'refresh' },
                  { keys: 'esc', label: 'back' },
                ]
              : [
                  { keys: '↵', label: 'upgrade' },
                  { keys: 'a', label: 'upgrade all' },
                  { keys: 't', label: 'in terminal' },
                  { keys: 'c', label: 'copy command' },
                  { keys: 'r', label: 'refresh' },
                  { keys: 'esc', label: 'back' },
                ]
          }
        />
      }
    >
      {state.upgrade && (
        <>
          <SectionHeader
            label={upgradeLine(state, state.upgrade, nowSecs)}
            right={
              upgradeFailed(state.upgrade)
                ? 't to retry in the terminal'
                : state.upgrade.command
            }
          />
          {state.upgrade.tail.slice(-TAIL_SHOWN).map((line, i) => (
            <ListRow key={`tail-${i}`} dim label={line} />
          ))}
        </>
      )}
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
