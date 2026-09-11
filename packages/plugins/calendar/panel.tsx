import {
  Calendar,
  KeyHints,
  MeterRow,
  Panel,
  stepMonth,
  yearProgress,
} from '@scuttlarr/tui'
import type { PluginPanelProps } from '@scuttlarr/tui/plugins'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'

import { type ClockState, longDate, monthTitle, stateDate } from './model'

/**
 * `cal ⏎`: the kit's month grid with ←→ stepping, today boxed, the year's
 * progress above it. The panel a data-only widget could never express — the
 * reason plugins own their UI (DECISIONS 2026-08-27).
 */
export default function CalendarPanel({
  state,
  onClose,
}: PluginPanelProps<ClockState>) {
  const today = stateDate(state, new Date())
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const step = (delta: number) =>
    setView((v) => stepMonth(v.year, v.month, delta))
  return (
    <Panel
      autoFocus
      icon={<CalendarDays size={17} strokeWidth={2} aria-hidden />}
      title={longDate(today)}
      subtitle={monthTitle(view.year, view.month)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          step(-1)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          step(1)
        } else if (e.key === 't' || e.key === 'Home') {
          e.preventDefault()
          setView({ year: today.getFullYear(), month: today.getMonth() })
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      }}
      footer={
        <KeyHints
          hints={[
            { keys: '←→', label: 'month' },
            { keys: 't', label: 'today' },
            { keys: 'esc', label: 'back' },
          ]}
        />
      }
    >
      <MeterRow
        label={String(today.getFullYear())}
        value={yearProgress(today)}
        right={`${Math.round(yearProgress(today) * 100)}%`}
      />
      <Calendar
        year={view.year}
        month={view.month}
        selected={{
          year: today.getFullYear(),
          month: today.getMonth(),
          date: today.getDate(),
        }}
        onStep={step}
      />
    </Panel>
  )
}
