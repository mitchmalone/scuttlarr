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
} from '@scuttlarr/tui'
import type { PluginCellProps } from '@scuttlarr/tui/plugins'
import { Package } from 'lucide-react'

import {
  type UpdatesReport,
  cellTone,
  cellVisible,
  checkedAgo,
  sourceLine,
  totalUpdates,
  upgradeLine,
  upgradeRunning,
} from './model'

/** Header line + one line per present source (+ the run line), plus the dim "checked …" line. */
const cardHeight = (lines: number) => 44 + lines * 18

/**
 * The updates cell: the Linux `apt`-indicator convention — hidden while
 * every present source is clean and healthy, otherwise the package glyph
 * and a total count, `warn` toned when a source errored. Hover breaks the
 * total down per source; click opens `updates ⏎`. While a panel upgrade
 * runs the cell stays put (the count only moves on the re-check) and the
 * card's first line says so.
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
  const nowSecs = Math.floor(now.getTime() / 1000)
  const running = upgradeRunning(report)
  const title =
    running && report.upgrade
      ? upgradeLine(report, report.upgrade, nowSecs)
      : `${total} update${total === 1 ? '' : 's'}`
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
      cardHeight={cardHeight(report.sources.length + (running ? 1 : 0))}
      hover={hover}
      className={className}
      onClick={() => host.openPanel()}
      card={
        <BarCard cardRef={hover.cardRef}>
          <BarCardTitle>{title}</BarCardTitle>
          {running && report.upgrade && (
            <BarCardLine>{report.upgrade.tail.at(-1) ?? '…'}</BarCardLine>
          )}
          {report.sources.map((source) => (
            <BarCardLine key={source.id}>{sourceLine(source)}</BarCardLine>
          ))}
          <BarCardDim>{checkedAgo(report.generatedAt, nowSecs)}</BarCardDim>
          <BarCardHint>click for the list ⏎</BarCardHint>
        </BarCard>
      }
    >
      {body}
    </BarHoverCell>
  )
}
