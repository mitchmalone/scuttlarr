import { type CustomThemes, resolveTheme, themeNames } from '@scuttlarr/tui'
import { type KeyboardEvent, type Ref, useEffect, useMemo, useRef } from 'react'

import { acceleratorFromEvent } from '../lib/accelerator'
import {
  COUNTED_STEPS,
  type SetupChoices,
  type SetupStep,
  hotkeyKeys,
  recapLines,
} from '../lib/onboarding'
import { AgentsPreview, BarPreview } from './OnboardingBars'
import { type Field, type PulseKind, mountField } from './field'
import './onboarding.css'

export type OnboardingPanelProps = {
  step: SetupStep
  choices: SetupChoices
  themes: CustomThemes
  /** The summon hotkey hid the panel and brought it back during this step. */
  hotkeyTried: boolean
  /** New keys were recorded; they take over on apply. */
  hotkeyChanged: boolean
  aerospaceMissing: boolean
  /** The panel is on screen; the field sleeps while it is not. */
  visible: boolean
  /** Fail-visible lines from applying (a hook that didn't register, say). */
  notes: string[]
  rootRef?: Ref<HTMLDivElement>
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  onChoose: (patch: Partial<SetupChoices>) => void
  onTryHotkey: () => void
}

const LEVEL: Record<SetupStep, number> = {
  welcome: 0.9,
  hotkey: 0.6,
  bar: 0.65,
  agents: 0.7,
  theme: 0.8,
  tiling: 0.8,
  ready: 0.9,
  done: 0.3,
}

const CTA: Record<SetupStep, string> = {
  welcome: 'Get started',
  hotkey: 'Keep these keys',
  bar: 'Continue',
  agents: 'Continue',
  theme: 'Use this theme',
  tiling: 'Continue',
  ready: 'Apply and start',
  done: 'Start',
}

const ESC: Partial<Record<SetupStep, string>> = {
  welcome: 'set up later',
  ready: 'leave as is',
}

/** The keys a step answers to: ⏎ on, ← → choose, space ticks, ⌫ back, esc skip. */
function handleKey(e: KeyboardEvent, p: OnboardingPanelProps, names: string[]) {
  const { step, choices, onChoose } = p
  if (step === 'hotkey' && (e.metaKey || e.ctrlKey || e.altKey)) {
    const accel = acceleratorFromEvent(e)
    if (accel) {
      e.preventDefault()
      onChoose({ hotkey: accel })
    }
    return
  }
  const cycle = (d: number) => {
    if (step === 'bar') onChoose({ bar: !choices.bar })
    if (step === 'agents') onChoose({ agents: !choices.agents })
    if (step === 'tiling') onChoose({ tiling: !choices.tiling })
    if (step === 'theme') {
      const i = names.indexOf(choices.theme)
      onChoose({
        theme: names[(i + d + names.length) % names.length] ?? choices.theme,
      })
    }
  }
  const actions: Record<string, () => void> = {
    Enter: p.onNext,
    Escape: p.onSkip,
    Backspace: p.onBack,
    ArrowRight: () => cycle(1),
    ArrowDown: () => cycle(1),
    ArrowLeft: () => cycle(-1),
    ArrowUp: () => cycle(-1),
    ' ': () => {
      if (step === 'agents' && choices.agents)
        onChoose({ limits: !choices.limits })
      if (step === 'theme') onChoose({ match: !choices.match })
    },
  }
  const action = e.key === 'Tab' && e.shiftKey ? p.onBack : actions[e.key]
  if (!action) return
  e.preventDefault()
  action()
}

/** The field behind the panel, and the pulses that answer each change. */
function useField(
  step: SetupStep,
  choices: SetupChoices,
  themes: CustomThemes,
  visible: boolean,
) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const field = useRef<Field | null>(null)
  const tokens = resolveTheme(choices.theme, themes)
  const palette = useMemo(
    () => ({ bg: tokens.bg, accent: tokens.accent, bright: tokens.fg }),
    [tokens.bg, tokens.accent, tokens.fg],
  )

  useEffect(() => {
    if (!canvas.current) return
    field.current = mountField(canvas.current, palette)
    return () => {
      field.current?.destroy()
      field.current = null
    }
    // Mount once; tokens and level flow in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    field.current?.setTokens(palette)
  }, [palette])

  useEffect(() => {
    if (visible) field.current?.resume()
    else field.current?.pause()
  }, [visible])

  const pulse = (selector: string, kind: PulseKind) =>
    field.current?.pulse(
      canvas.current?.parentElement?.querySelector(selector) ?? null,
      kind,
    )

  const lastStep = useRef(step)
  useEffect(() => {
    field.current?.setLevel(LEVEL[step])
    if (lastStep.current === step) return
    const forward =
      COUNTED_STEPS.indexOf(step) >= COUNTED_STEPS.indexOf(lastStep.current)
    lastStep.current = step
    if (step === 'done') pulse('.ob-h', 'big')
    else pulse(forward ? '.ob-cta' : '.ob-back', forward ? 'ring' : 'key')
  }, [step])

  const lastChoices = useRef(choices)
  useEffect(() => {
    const before = lastChoices.current
    lastChoices.current = choices
    if (before === choices) return
    if (before.theme !== choices.theme) pulse('.ob-theme-name', 'key')
    else if (before.limits !== choices.limits || before.match !== choices.match)
      pulse('.ob-check', 'key')
    else if (before.hotkey !== choices.hotkey) pulse('.ob-keys', 'ring')
    else pulse('.ob-choice.on', 'key')
  }, [choices])

  return { canvas, field, pulse }
}

export function OnboardingPanel(p: OnboardingPanelProps) {
  const { step, choices, themes } = p
  const names = useMemo(() => themeNames(themes), [themes])
  const { canvas, pulse } = useField(step, choices, themes, p.visible)

  useEffect(() => {
    if (p.hotkeyTried) pulse('.ob-keys', 'ring')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.hotkeyTried])

  const counted = COUNTED_STEPS.indexOf(step)
  return (
    <div
      ref={p.rootRef}
      className="ob"
      tabIndex={-1}
      onKeyDown={(e) => handleKey(e, p, names)}
    >
      <canvas ref={canvas} className="ob-field" aria-hidden="true" />
      <div className="ob-ui">
        <div className="ob-top">
          {step !== 'done' && (
            <>
              <div className="ob-plate ob-progress">
                <div className="ob-pips">
                  {COUNTED_STEPS.map((s, i) => (
                    <i
                      key={s}
                      className={
                        i < counted ? 'done' : i === counted ? 'on' : ''
                      }
                    />
                  ))}
                </div>
                <span>
                  {counted >= 0 ? `setup · ${counted + 1} of 6` : 'setup'}
                </span>
              </div>
              <button
                type="button"
                className="ob-plate ob-esc"
                onClick={p.onSkip}
              >
                <b>esc</b> {ESC[step] ?? 'skip'}
              </button>
            </>
          )}
        </div>
        <div className="ob-mid">
          <Step {...p} names={names} />
        </div>
        <div className="ob-bottom">
          {counted >= 0 && (
            <button type="button" className="ob-back" onClick={p.onBack}>
              <kbd>⌫</kbd>Back
            </button>
          )}
          <button type="button" className="ob-cta" onClick={p.onNext}>
            <kbd>⏎</kbd>
            {CTA[step]}
          </button>
        </div>
      </div>
    </div>
  )
}

function Choice({
  on,
  title,
  sub,
  onPick,
}: {
  on: boolean
  title: string
  sub: string
  onPick: () => void
}) {
  return (
    <button
      type="button"
      className={`ob-choice${on ? ' on' : ''}`}
      onClick={onPick}
    >
      <span className="ob-choice-title">{title}</span>
      <span className="ob-choice-sub">{sub}</span>
    </button>
  )
}

function Check({
  on,
  disabled = false,
  onToggle,
  children,
}: {
  on: boolean
  disabled?: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`ob-plate ob-check${on ? ' on' : ''}`}
      disabled={disabled}
      onClick={onToggle}
    >
      <i />
      <span>{children}</span>
    </button>
  )
}

function Step(p: OnboardingPanelProps & { names: string[] }) {
  const { step, choices, onChoose } = p
  switch (step) {
    case 'welcome':
      return (
        <div className="ob-step">
          <div className="ob-plate ob-prompt">
            <span className="ob-sigil">❯</span>
            <span>setup</span>
            <span className="ob-caret" />
          </div>
          <div className="ob-plate ob-h">Welcome aboard.</div>
          <p className="ob-plate ob-sub">
            Five choices about your desktop, about a minute. Nothing changes
            until the end, and you can run it again any time with <b>setup ⏎</b>
            .
          </p>
        </div>
      )
    case 'hotkey':
      return (
        <div className="ob-step">
          <div className="ob-keys">
            {hotkeyKeys(choices.hotkey).map((k, i) => (
              <span key={`${k}-${i}`} className="ob-keycaps">
                {i > 0 && <span className="ob-plus">+</span>}
                <span
                  className={`ob-key${k.length > 1 ? ' wide' : ''}${p.hotkeyTried ? ' ok' : ''}`}
                >
                  {k.toLowerCase() === 'space' ? 'space' : k}
                </span>
              </span>
            ))}
          </div>
          {p.hotkeyChanged ? (
            <span className="ob-plate ob-note">
              New keys. They take over when you apply.
            </span>
          ) : p.hotkeyTried ? (
            <span className="ob-plate ob-ok">
              That&apos;s the one. scuttlarr hid and came back.
            </span>
          ) : (
            <button
              type="button"
              className="ob-plate ob-note"
              onClick={p.onTryHotkey}
            >
              Press it now: once to hide scuttlarr, once to bring it back.
            </button>
          )}
          <div className="ob-plate ob-h">Summon it from anywhere.</div>
          <p className="ob-plate ob-sub">
            Rather use different keys? Press them here instead.
          </p>
        </div>
      )
    case 'bar':
      return (
        <div className="ob-step">
          <BarPreview off={!choices.bar} />
          <div className="ob-plate ob-h">A menu bar that works for you.</div>
          <p className="ob-plate ob-sub">
            Workspaces, the time and the things you track, in your theme. It
            replaces the macOS menu bar.
          </p>
          <div className="ob-choices">
            <Choice
              on={choices.bar}
              title="Use the scuttlarr bar"
              sub="recommended"
              onPick={() => onChoose({ bar: true })}
            />
            <Choice
              on={!choices.bar}
              title="Keep the macOS bar"
              sub="switch any time"
              onPick={() => onChoose({ bar: false })}
            />
          </div>
        </div>
      )
    case 'agents':
      return (
        <div className="ob-step">
          <AgentsPreview off={!choices.agents} usage={choices.limits} />
          <div className="ob-plate ob-h">Keep an eye on your agents.</div>
          <p className="ob-plate ob-sub">
            Working, waiting on you, or done, at a glance.
          </p>
          <div className="ob-choices">
            <Choice
              on={choices.agents}
              title="Watch my agents"
              sub="reads session files only"
              onPick={() => onChoose({ agents: true })}
            />
            <Choice
              on={!choices.agents}
              title="Not now"
              sub="nothing runs"
              onPick={() => onChoose({ agents: false, limits: false })}
            />
          </div>
          <Check
            on={choices.agents && choices.limits}
            disabled={!choices.agents}
            onToggle={() => onChoose({ limits: !choices.limits })}
          >
            <b>Show usage limits too</b> (reads Keychain)
          </Check>
        </div>
      )
    case 'theme': {
      const i = p.names.indexOf(choices.theme)
      const go = (d: number) =>
        onChoose({
          theme:
            p.names[(i + d + p.names.length) % p.names.length] ?? choices.theme,
        })
      return (
        <div className="ob-step">
          <div className="ob-theme">
            <button
              type="button"
              className="ob-plate ob-arrow"
              onClick={() => go(-1)}
              aria-label="previous theme"
            >
              ‹
            </button>
            <span className="ob-plate ob-theme-name">{choices.theme}</span>
            <button
              type="button"
              className="ob-plate ob-arrow"
              onClick={() => go(1)}
              aria-label="next theme"
            >
              ›
            </button>
          </div>
          <div className="ob-plate ob-swatches">
            {p.names.map((name) => {
              const t = resolveTheme(name, p.themes)
              return (
                <button
                  type="button"
                  key={name}
                  title={name}
                  className={`ob-swatch${name === choices.theme ? ' on' : ''}`}
                  style={{ background: t.bg }}
                  onClick={() => onChoose({ theme: name })}
                >
                  <i style={{ background: t.accent }} />
                </button>
              )
            })}
          </div>
          <div className="ob-plate ob-h">One theme, everywhere.</div>
          <p className="ob-plate ob-sub">
            ← → to try them. This panel changes as you go.
          </p>
          <Check
            on={choices.match}
            onToggle={() => onChoose({ match: !choices.match })}
          >
            <b>Match Ghostty, tmux and my editors</b>
          </Check>
        </div>
      )
    }
    case 'tiling':
      return (
        <div className="ob-step">
          <div className="ob-tiles" aria-hidden="true">
            <i className="focus" />
            <div>
              <i />
              <i />
            </div>
          </div>
          <div className="ob-plate ob-h">Tile your windows?</div>
          <p className="ob-plate ob-sub">
            AeroSpace snaps windows into a layout you drive from the keyboard.
            It changes how your Mac feels, so it&apos;s off unless you want it.
          </p>
          <div className="ob-choices">
            <Choice
              on={!choices.tiling}
              title="Not now"
              sub="windows stay as they are"
              onPick={() => onChoose({ tiling: false })}
            />
            <Choice
              on={choices.tiling}
              title="Tile my windows"
              sub={
                p.aerospaceMissing
                  ? 'install AeroSpace in Settings first'
                  : 'uses AeroSpace'
              }
              onPick={() => onChoose({ tiling: true })}
            />
          </div>
        </div>
      )
    case 'ready':
      return (
        <div className="ob-step">
          <div className="ob-recap">
            {recapLines(choices).map((line) => (
              <div key={line.text} className={line.on ? '' : 'off'}>
                <span>{line.on ? '✓' : '–'}</span>
                {line.text}
              </div>
            ))}
          </div>
          <div className="ob-plate ob-h">You&apos;re set.</div>
          <p className="ob-plate ob-sub">
            That&apos;s everything that will change. Change it later in
            Settings, or run <b>setup ⏎</b> again.
          </p>
          {p.notes.map((note) => (
            <p key={note} className="ob-plate ob-warn">
              {note}
            </p>
          ))}
        </div>
      )
    case 'done':
      return (
        <div className="ob-step">
          <div className="ob-plate ob-prompt">
            <span className="ob-sigil">❯</span>
            <span className="ob-caret" />
          </div>
          <div className="ob-plate ob-h">You&apos;re aboard.</div>
          <p className="ob-plate ob-sub">
            Press <b>{hotkeyKeys(choices.hotkey).join(' ')}</b> any time. Type
            an app name, start with <b>!</b> for a shell command, or <b>?</b> to
            ask your agent.
          </p>
          {p.notes.map((note) => (
            <p key={note} className="ob-plate ob-warn">
              {note}
            </p>
          ))}
        </div>
      )
  }
}
