import {
  type Row,
  clipRows,
  emojiRows,
  launchRows,
  quicklinkRows,
  scriptRows,
} from '@scuttlarr/core/rows'
import type { Clip, IndexItem, ScriptItem } from '@scuttlarr/core/types'

import '../launcher.css'
import { defineStories } from '../story'
import type { AskTurn } from './ask'
import { Launcher, launcherPrompt } from './launcher'

/* A fake index shaped like `get_index` (indexer.rs): app ids are bundle
 * paths, icons are null so rows fall back to their kind glyph. */
const app = (name: string, hint = 'app'): IndexItem => ({
  id: `/Applications/${name}.app`,
  name,
  kind: 'app',
  path: `/Applications/${name}.app`,
  hint,
  icon: null,
  aliases: [],
})
const INDEX: IndexItem[] = [
  app('Ghostty'),
  app('GitHub Desktop'),
  app('Google Chrome'),
  app('Safari'),
  app('Visual Studio Code'),
  app('Slack'),
  {
    id: 'settings:com.apple.Network-Settings.extension',
    name: 'Network',
    kind: 'settings',
    path: 'x-apple.systempreferences:com.apple.Network-Settings.extension',
    hint: 'system settings',
    icon: null,
    aliases: ['wifi', 'ethernet'],
  },
]
const FRECENCY = { '/Applications/Ghostty.app': 9 }
const FALLBACK = 'https://www.google.com/search?q={query}'

const CLIPS: Clip[] = [
  { id: 41, content: 'pnpm --filter @scuttlarr/desktop tauri dev', ts: 0 },
  {
    id: 40,
    content: 'https://github.com/mitchmalone/scuttlarr/pull/42',
    ts: 0,
  },
  { id: 39, content: 'export SCUTTLARR_LOG=debug', ts: 0 },
  { id: 38, content: '192.168.1.199', ts: 0 },
]

/* What the bundled `ip` script answers (src-tauri/scripts/ip.ts). */
const IP_ITEMS: ScriptItem[] = [
  {
    title: '192.168.1.199',
    subtitle: 'en0 · copy',
    action: { type: 'copy', value: '192.168.1.199' },
  },
  {
    title: '10.0.0.42',
    subtitle: 'en1 · copy',
    action: { type: 'copy', value: '10.0.0.42' },
  },
]

const ANSWER = `Quicklinks are **links with a trigger word**: type the trigger, a space, then a query.

- \`gh tauri\` opens a GitHub search for *tauri*
- paste a URL and pick **Add quicklink…** to make one`

const glyph = (row: Row) => <span className="icon glyph">{row.glyph}</span>

/** One launcher state: the app's own sigil/placeholder rules over sample rows. */
function prompt({
  mode = 'launch',
  value = '',
  rows = [],
  altHeld = false,
  toast = null,
  askTurns = [],
  askBusy = false,
}: {
  mode?: string
  value?: string
  rows?: Row[]
  altHeld?: boolean
  toast?: string | null
  askTurns?: AskTurn[]
  askBusy?: boolean
}) {
  const chrome = launcherPrompt({
    mode,
    draftStep: null,
    loremMenu: false,
    askActive: mode === 'ask' && askTurns.length > 0,
    askBusy,
    sigil: '❯',
    bangSigil: '$',
  })
  return (
    <Launcher
      mode={mode}
      sigil={chrome.sigil}
      placeholder={chrome.placeholder}
      value={value}
      toast={toast}
      askTurns={askTurns}
      askBusy={askBusy}
      askPrompt={mode === 'ask' ? value : ''}
      bangCommand={mode === 'bang' ? value : ''}
      terminal="Ghostty"
      rows={rows}
      selected={0}
      altHeld={altHeld}
      renderIcon={glyph}
    />
  )
}

export const launcherStories = defineStories('Launcher prompt', [
  {
    name: 'empty prompt (first-run summon)',
    notes:
      'What ⌥Space shows on an empty prompt, and what first run summons once: the placeholder is the only hint.',
    keys: 'type search · ! bang · ? ask · : emoji · esc dismiss',
    render: () => prompt({}),
  },
  {
    name: 'app results with match highlighting',
    notes: 'launchRows over a fake index; matched letters wear the accent.',
    keys: '↑↓ select · ⏎ launch · ⌘1-8 jump · ⌥⏎ secondary',
    render: () =>
      prompt({
        value: 'gh',
        rows: launchRows('gh', INDEX, FRECENCY, FALLBACK),
      }),
  },
  {
    name: 'bang mode — !git status',
    notes: '`!` is consumed as the mode key; the sigil turns to $.',
    keys: '⏎ run in terminal · esc back to search',
    render: () => prompt({ mode: 'bang', value: 'git status' }),
  },
  {
    name: 'bang mode — empty command',
    render: () => prompt({ mode: 'bang' }),
  },
  {
    name: 'math result',
    keys: '⏎ copy result',
    render: () =>
      prompt({
        value: '1600*1200/2',
        rows: launchRows('1600*1200/2', INDEX, FRECENCY, FALLBACK),
      }),
  },
  {
    name: 'emoji results — :fire',
    notes:
      '`:` is consumed as the mode key; the user’s own emoji are the only ones scuttlarr shows.',
    keys: '⏎ copy emoji',
    render: () =>
      prompt({ mode: 'emoji', value: 'fire', rows: emojiRows('fire') }),
  },
  {
    name: 'clip — clipboard history inline',
    keys: '⏎ paste clip · ⌥⏎ delete',
    render: () =>
      prompt({ mode: 'trigger', value: 'clip ', rows: clipRows('', CLIPS) }),
  },
  {
    name: 'quicklink with {query} — gh tauri',
    keys: '⏎ open · ⌥⏎ copy url',
    render: () =>
      prompt({
        mode: 'trigger',
        value: 'gh tauri',
        rows: quicklinkRows(
          {
            name: 'GitHub',
            url: 'https://github.com/search?q={query}',
            trigger: 'gh',
          },
          'tauri',
        ),
      }),
  },
  {
    name: 'script trigger — ip',
    notes:
      'A script joins the grammar with its own trigger word (docs/SCRIPTS.md).',
    keys: '⏎ script action',
    render: () =>
      prompt({ mode: 'trigger', value: 'ip', rows: scriptRows(IP_ITEMS) }),
  },
  {
    name: 'secondary action — ⌥ held',
    notes: 'While ⌥ is down, rows with an alt action show its label.',
    keys: '⌥⏎ reveal in finder',
    render: () =>
      prompt({
        value: 'saf',
        rows: launchRows('saf', INDEX, FRECENCY, FALLBACK),
        altHeld: true,
      }),
  },
  {
    name: 'search fallback — nothing matched',
    render: () =>
      prompt({
        value: 'rust lifetimes',
        rows: launchRows('rust lifetimes', INDEX, FRECENCY, FALLBACK),
      }),
  },
  {
    name: 'nothing on the horizon',
    render: () => prompt({ mode: 'trigger', value: 'clip zzz' }),
  },
  {
    name: 'toast — copy confirmation',
    render: () =>
      prompt({ value: 'lorem', toast: 'Copied 2 paragraphs of lorem ipsum' }),
  },
  {
    name: 'ask mode — before the question',
    notes: '`?` is consumed as the mode key; gated by agents.askMode.',
    keys: '⏎ ask · esc back to search',
    render: () => prompt({ mode: 'ask', value: 'what are quicklinks' }),
  },
  {
    name: 'ask mode — conversation',
    notes:
      'First question pinned in the header, transcript below, follow-up prompt at the bottom.',
    keys: '⏎ follow up · esc ends',
    render: () =>
      prompt({
        mode: 'ask',
        askTurns: [
          { prompt: 'what are quicklinks?', answer: ANSWER, done: true },
        ],
      }),
  },
  {
    name: 'ask mode — waiting for the answer',
    render: () =>
      prompt({
        mode: 'ask',
        askBusy: true,
        askTurns: [
          { prompt: 'what are quicklinks?', answer: ANSWER, done: true },
          { prompt: 'how do I add one?', answer: '', done: false },
        ],
      }),
  },
])
