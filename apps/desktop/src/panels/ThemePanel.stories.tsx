import { defineStories } from '@scuttlarr/tui'

import { ThemePanel } from './ThemePanel'

const noop = () => {}

export const themePanelStories = defineStories('ThemePanel (app)', [
  {
    name: 'system mode',
    keys: '↑↓ move · ⏎ apply · esc close · type to filter',
    render: () => (
      <ThemePanel
        current="scuttlarr"
        themes={{}}
        mode="system"
        focusName={null}
        onPick={noop}
        onClose={noop}
      />
    ),
  },
  {
    name: 'in a Focus, with a custom theme',
    render: () => (
      <ThemePanel
        current="dracula"
        themes={{ mine: { accent: '#ff79c6', bg: '#101014' } }}
        mode="schedule"
        focusName="Work"
        onPick={noop}
        onClose={noop}
      />
    ),
  },
])
