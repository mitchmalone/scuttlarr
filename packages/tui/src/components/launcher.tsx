import type { Row } from '@scuttlarr/core/rows'
import type React from 'react'
import type { ReactNode, Ref } from 'react'

import { AskPinned, AskSurface, type AskTurn } from './ask'

/**
 * The prompt's sigil and placeholder for the state it is in: the quicklink
 * draft (`+`), the lorem volume menu, a mode's own sigil, or the configured
 * launch/bang sigils.
 */
export function launcherPrompt({
  mode,
  draftStep,
  loremMenu,
  askActive,
  askBusy,
  sigil,
  bangSigil,
}: {
  mode: string
  /** The add-quicklink draft's step, null when no draft is open. */
  draftStep: 'name' | 'browser' | null
  loremMenu: boolean
  askActive: boolean
  askBusy: boolean
  sigil: string
  bangSigil: string
}): { sigil: string; placeholder: string } {
  return {
    sigil: draftStep
      ? '+'
      : loremMenu
        ? '¶'
        : mode === 'ask'
          ? '?'
          : mode === 'emoji'
            ? ':'
            : mode === 'bang'
              ? bangSigil
              : sigil,
    placeholder: draftStep
      ? draftStep === 'name'
        ? 'name this quicklink…'
        : 'choose a browser (↑↓ then ⏎)'
      : loremMenu
        ? 'how much lorem? (↑↓ then ⏎)'
        : askActive
          ? askBusy
            ? 'waiting for the answer…'
            : 'ask a follow-up… (Esc ends)'
          : 'Search for apps and commands…',
  }
}

/**
 * The launcher prompt: input row, then whichever body the mode calls for —
 * the confirmation toast, a `?` conversation, the ask/bang hint row, the
 * result list, or the empty line. Pure presentation: the app owns grammar,
 * rows, keys and every IPC call, and hands the outcome in as props.
 * Styles: `@scuttlarr/tui/launcher.css` (its class names are the launcher
 * window's own, so only consumers that render a launcher import it).
 */
export function Launcher({
  mode,
  sigil,
  placeholder,
  value,
  inputRef,
  onChange,
  onKeyDown,
  onKeyUp,
  onBlur,
  toast = null,
  askTurns = [],
  askBusy = false,
  askScrollRef,
  askPrompt = '',
  bangCommand = '',
  terminal,
  rows,
  selected,
  altHeld = false,
  renderIcon,
  onRowMouseDown,
}: {
  /** The grammar's mode (`launch`, `trigger`, `bang`, `emoji`, `ask`) — a class on the panel. */
  mode: string
  sigil: ReactNode
  placeholder: string
  value: string
  inputRef?: Ref<HTMLInputElement>
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onKeyUp?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onBlur?: () => void
  /** A one-row confirmation that replaces the body. */
  toast?: string | null
  /** `?` mode turns; non-empty means a conversation is on screen. */
  askTurns?: AskTurn[]
  askBusy?: boolean
  askScrollRef?: Ref<HTMLDivElement>
  /** `?` mode's typed question, before the first turn. */
  askPrompt?: string
  /** `!` mode's typed command. */
  bangCommand?: string
  /** Where `!` sends the command, e.g. Ghostty. */
  terminal: string
  rows: Row[]
  selected: number
  /** ⌥ held: rows with a secondary action show its label in the hint column. */
  altHeld?: boolean
  /** A row's icon: the app resolves file icons and panel glyphs. */
  renderIcon: (row: Row) => ReactNode
  onRowMouseDown?: (row: Row, e: React.MouseEvent<HTMLLIElement>) => void
}) {
  const askActive = mode === 'ask' && askTurns.length > 0
  return (
    <div className={`panel ${mode}${askActive ? ' ask-active' : ''}`}>
      {askActive && (
        <div className="ask-header">
          <AskPinned prompt={askTurns[0]?.prompt ?? ''} busy={askBusy} />
        </div>
      )}
      <div className="input-row">
        <span className="sigil">{askActive ? '❯' : sigil}</span>
        <input
          ref={inputRef}
          className="prompt"
          type="text"
          value={value}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          autoFocus
          placeholder={placeholder}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={onBlur}
        />
      </div>

      {toast ? (
        <div className="row toast-row">
          <span className="toast-check">✓</span>
          <span className="toast-text">{toast}</span>
        </div>
      ) : askActive ? (
        <AskSurface turns={askTurns} scrollRef={askScrollRef} />
      ) : mode === 'ask' ? (
        <div className="row bang-row">
          <span className="bang-action">ask claude ▸</span>
          <span className="bang-command">
            {askPrompt || 'type a question, Enter to send'}
          </span>
        </div>
      ) : mode === 'bang' ? (
        <div className="row bang-row">
          <span className="bang-action">run in {terminal} ▸</span>
          <span className="bang-command">{bangCommand || 'new window'}</span>
        </div>
      ) : rows.length > 0 ? (
        <ul className="results">
          {rows.map((row, i) => (
            <li
              key={row.key}
              className={`row result ${i === selected ? 'selected' : ''}`}
              onMouseDown={(e) => onRowMouseDown?.(row, e)}
            >
              {renderIcon(row)}
              <span className="name">
                {row.title.split('').map((ch, j) => (
                  <span
                    key={j}
                    className={row.positions.includes(j) ? 'hit' : ''}
                  >
                    {ch}
                  </span>
                ))}
              </span>
              <span className="hint">
                {i < 8 ? <kbd>⌘{i + 1}</kbd> : null}
                {altHeld && row.alt ? `⌥⏎ ${row.alt.label}` : row.hint}
              </span>
            </li>
          ))}
        </ul>
      ) : value ? (
        <div className="row empty">nothing on the horizon</div>
      ) : null}
    </div>
  )
}
