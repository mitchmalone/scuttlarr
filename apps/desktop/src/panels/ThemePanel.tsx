/**
 * Theme panel, presentational half (Omarchy's theme switcher as a tenant):
 * every theme name with a swatch of its tokens, the current one marked; ⏎
 * applies, esc closes, typing filters. Pure props + @scuttlarr/tui + the core
 * matcher — no tauri imports.
 */
import { fuzzyMatch } from '@scuttlarr/core/matcher'
import {
  type CustomThemes,
  KeyHints,
  ListRow,
  Panel,
  SectionHeader,
  TextPrompt,
  useListNav,
} from '@scuttlarr/tui'
import { resolveTheme, themeNames } from '@scuttlarr/tui/themes'
import { Palette } from 'lucide-react'
import { useMemo, useState } from 'react'

export interface ThemePanelProps {
  /** `config.theme`. */
  current: string
  /** `config.themes` — user-defined overlays join the built-ins. */
  themes: CustomThemes
  /** Policy mode, for the header line. */
  mode: string
  /** Which half the policy is reading right now. */
  dark: boolean
  /** Active macOS Focus name, if any. */
  focusName: string | null
  onPick: (name: string, how: 'now' | 'other') => void
  onClose: () => void
}

/** Three of the theme's tokens as a tiny inline strip: bg, accent, fg. */
function Swatch({ name, themes }: { name: string; themes: CustomThemes }) {
  const t = resolveTheme(name, themes)
  const cell = (color: string) => (
    <span
      style={{
        display: 'inline-block',
        width: '0.45em',
        height: '1em',
        background: color,
      }}
    />
  )
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        border: '1px solid var(--_border, currentColor)',
        borderRadius: 2,
        overflow: 'hidden',
        verticalAlign: 'middle',
      }}
    >
      {cell(t.bg)}
      {cell(t.accent)}
      {cell(t.fg)}
    </span>
  )
}

export function ThemePanel({
  current,
  themes,
  mode,
  dark,
  focusName,
  onPick,
  onClose,
}: ThemePanelProps) {
  const other = dark ? 'light theme' : 'dark theme'
  const [filter, setFilter] = useState('')
  const names = useMemo(() => themeNames(themes), [themes])
  const visible = useMemo(() => {
    const q = filter.trim()
    return q ? names.filter((n) => fuzzyMatch(q, n) !== null) : names
  }, [names, filter])

  const nav = useListNav(visible.length, {
    onActivate: (i, event) => {
      const name = visible[i]
      if (name) onPick(name, event.altKey ? 'other' : 'now')
    },
    onBack: () => (filter ? setFilter('') : onClose()),
  })

  const subtitle = [
    current,
    `mode: ${mode}`,
    focusName ? `focus: ${focusName}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Panel
      icon={<Palette size={17} strokeWidth={2} aria-hidden />}
      title="Theme"
      subtitle={subtitle}
      footer={
        <KeyHints
          hints={[
            { keys: '↑↓', label: 'move' },
            { keys: '⏎', label: 'apply' },
            { keys: '⌥⏎', label: `set as ${other}` },
            { keys: 'esc', label: 'close' },
          ]}
        />
      }
    >
      <TextPrompt
        autoFocus
        value={filter}
        onChange={(v) => {
          setFilter(v)
          nav.setIndex(0)
        }}
        placeholder="Filter themes…"
        onKeyDown={nav.onKeyDown}
      />
      <div className="tui-scroll">
        <SectionHeader label="themes" right={`${visible.length}`} />
        {visible.length === 0 && <ListRow dim label="no matches" />}
        {visible.map((name, i) => (
          <ListRow
            key={name}
            icon={<Swatch name={name} themes={themes} />}
            label={name}
            right={name === current ? '● current' : undefined}
            selected={i === nav.index}
            onClick={() => onPick(name, 'now')}
            onHover={() => nav.setIndex(i)}
          />
        ))}
      </div>
    </Panel>
  )
}
