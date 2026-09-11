import {
  KeyHints,
  ListRow,
  Panel,
  USAGE_ALL,
  UsagePanel,
  type UsageReport,
} from '@scuttlarr/tui'
import type { PluginPanelProps } from '@scuttlarr/tui/plugins'
import { Gauge } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Unix seconds, ticking — reset countdowns count down while the panel is open. */
function useNowSecs(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

/**
 * `usage ⏎`: the kit's UsagePanel over the plugin's state. A null state is
 * the monitor switched off (Settings → Agents), and the panel says so instead
 * of scanning forever.
 */
export default function UsagePanelPlugin({
  state,
  onClose,
}: PluginPanelProps<UsageReport>) {
  const [selected, setSelected] = useState(USAGE_ALL)
  const now = useNowSecs()
  if (!state) {
    return (
      <Panel
        autoFocus
        icon={<Gauge size={17} strokeWidth={2} aria-hidden />}
        title="Usage"
        subtitle="monitor off"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
        footer={<KeyHints hints={[{ keys: 'esc', label: 'back' }]} />}
      >
        <ListRow dim label="Turn on the usage monitor in Settings → Agents." />
      </Panel>
    )
  }
  return (
    <UsagePanel
      report={state}
      selected={selected}
      nowSecs={now}
      onSelect={setSelected}
      onClose={onClose}
    />
  )
}
