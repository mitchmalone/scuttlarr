import {
  BarCard,
  BarCardDim,
  BarCardHint,
  BarCardLine,
  BarCardTitle,
  BarCell,
  BarHoverCell,
  ICON_PROPS,
} from '@scuttlarr/tui'
import type { PluginCellProps } from '@scuttlarr/tui/plugins'
import { CalendarDays } from 'lucide-react'

import {
  type ClockState,
  cellLabel,
  dateFacts,
  longDate,
  stateDate,
} from './model'

const CARD_HEIGHT = 96

/**
 * The calendar cell: a glyph and "Thu 27". Hover shows the long date and the
 * year's progress; click opens the month grid (`cal ⏎`). The reference for a
 * plugin cell with a card — everything visual is the kit's.
 */
export default function CalendarCell({
  plugin,
  state,
  now,
  hover,
  host,
}: PluginCellProps<ClockState>) {
  const date = stateDate(state, now)
  const body = (
    <>
      <CalendarDays {...ICON_PROPS} />
      {cellLabel(date)}
    </>
  )
  if (!hover) {
    return (
      <BarCell className="bar-cell" title={longDate(date)}>
        {body}
      </BarCell>
    )
  }
  const facts = dateFacts(date)
  return (
    <BarHoverCell
      id={`plugin:${plugin.id}`}
      cardHeight={CARD_HEIGHT}
      hover={hover}
      onClick={() => host.openPanel()}
      card={
        <BarCard cardRef={hover.cardRef}>
          <BarCardTitle>{longDate(date)}</BarCardTitle>
          <BarCardLine>
            week {facts.week} · day {facts.dayOfYear}
          </BarCardLine>
          <BarCardDim>{facts.yearPct}% of the year gone</BarCardDim>
          <BarCardHint>click for the month ⏎</BarCardHint>
        </BarCard>
      }
    >
      {body}
    </BarHoverCell>
  )
}
