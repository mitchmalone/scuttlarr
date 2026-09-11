import {
  BarCard,
  BarCardDim,
  BarCardHint,
  BarCardLine,
  BarCardTitle,
  BarHoverCell,
  ICON_PROPS,
} from '@scuttlarr/tui'
import type { PluginCellProps } from '@scuttlarr/tui/plugins'
import { Hand } from 'lucide-react'

import type { HelloState } from './model'

/**
 * The reference cell (docs/PLUGINS.md): a glyph and the tick count, a hover
 * card, click opens the panel. Only kit components — the theme, the fonts,
 * the card chrome are scuttlarr's, so the plugin looks native everywhere,
 * scuttlarr.com included.
 */
export default function HelloCell({
  plugin,
  state,
  hover,
  host,
}: PluginCellProps<HelloState>) {
  const body = (
    <>
      <Hand {...ICON_PROPS} />
      {state?.ticks ?? '…'}
    </>
  )
  if (!hover) return <span className="bar-cell">{body}</span>
  return (
    <BarHoverCell
      id={`plugin:${plugin.id}`}
      cardHeight={90}
      hover={hover}
      onClick={() => host.openPanel()}
      card={
        <BarCard cardRef={hover.cardRef}>
          <BarCardTitle>{state?.greeting ?? 'starting…'}</BarCardTitle>
          <BarCardLine>{state?.ticks ?? 0} ticks since start</BarCardLine>
          <BarCardDim>{state?.lastMessage ?? 'no messages yet'}</BarCardDim>
          <BarCardHint>click for the panel ⏎</BarCardHint>
        </BarCard>
      }
    >
      {body}
    </BarHoverCell>
  )
}
