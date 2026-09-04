import {
  BarCard,
  BarCardDim,
  BarCardHint,
  BarCardLine,
  BarCardTitle,
  BarCell,
  BarHoverCell,
  ICON_PROPS,
  toneClass,
} from '@launcharr/tui'
import type { PluginCellProps } from '@launcharr/tui/plugins'
import { Package } from 'lucide-react'

import {
  type UpdatesReport,
  cellTone,
  cellVisible,
  checkedAgo,
  sourceLine,
  totalUpdates,
} from './model'

/** Header line + one line per present source, plus the dim "checked …" line. */
const cardHeight = (sourceCount: number) => 44 + sourceCount * 18

/**
 * The updates cell: the Linux `apt`-indicator convention — hidden while
 * every present source is clean and healthy, otherwise the package glyph
 * and a total count, `warn` toned when a source errored. Hover breaks the
 * total down per source; click opens `updates ⏎`.
 */
export default function UpdatesCell({
  plugin,
  state,
  now,
  hover,
  host,
}: PluginCellProps<UpdatesReport>) {
  if (!cellVisible(state)) return null
  const report = state as UpdatesReport
  const total = totalUpdates(report)
  const title = `${total} update${total === 1 ? '' : 's'}`
  const className = toneClass(cellTone(report))
  const body = (
    <>
      <Package {...ICON_PROPS} />
      {total}
    </>
  )
  if (!hover) {
    return (
      <BarCell className={className} title={title}>
        {body}
      </BarCell>
    )
  }
  return (
    <BarHoverCell
      id={`plugin:${plugin.id}`}
      cardHeight={cardHeight(report.sources.length)}
      hover={hover}
      className={className}
      onClick={() => host.openPanel()}
      card={
        <BarCard cardRef={hover.cardRef}>
          <BarCardTitle>{title}</BarCardTitle>
          {report.sources.map((source) => (
            <BarCardLine key={source.id}>{sourceLine(source)}</BarCardLine>
          ))}
          <BarCardDim>
            {checkedAgo(report.generatedAt, Math.floor(now.getTime() / 1000))}
          </BarCardDim>
          <BarCardHint>click for the list ⏎</BarCardHint>
        </BarCard>
      }
    >
      {body}
    </BarHoverCell>
  )
}
