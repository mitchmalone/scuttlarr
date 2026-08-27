import { KeyHints, ListRow, Panel, SectionHeader } from '@launcharr/tui'
import type { PluginPanelProps } from '@launcharr/tui/plugins'
import { Hand } from 'lucide-react'

import type { HelloState } from './model'

/**
 * The reference panel (docs/PLUGINS.md): the state, and `host.send()` back
 * to the service — `r` resets the counter, the service confirms on its next
 * line. Esc closes; the kit's Panel owns the keyboard.
 */
export default function HelloPanel({
  state,
  settings,
  host,
  onClose,
}: PluginPanelProps<HelloState>) {
  return (
    <Panel
      autoFocus
      icon={<Hand size={17} strokeWidth={2} aria-hidden />}
      title={state?.greeting ?? 'Hello'}
      subtitle="the reference plugin"
      onKeyDown={(e) => {
        if (e.key === 'r') {
          e.preventDefault()
          host.send({ reset: true })
        } else if (e.key === 'o') {
          e.preventDefault()
          host.open('https://launcharr.com/')
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      }}
      footer={
        <KeyHints
          hints={[
            { keys: 'r', label: 'reset' },
            { keys: 'o', label: 'open site' },
            { keys: 'esc', label: 'back' },
          ]}
        />
      }
    >
      <SectionHeader label="state" />
      <ListRow label="ticks" right={String(state?.ticks ?? 0)} />
      <ListRow label="last message" right={state?.lastMessage ?? '—'} dim />
      <ListRow
        label="started"
        right={
          state ? new Date(state.startedAt * 1000).toLocaleTimeString() : '—'
        }
        dim
      />
      <SectionHeader label="settings" />
      <ListRow label="HELLO_NAME" right={settings.HELLO_NAME ?? 'unset'} dim />
    </Panel>
  )
}
