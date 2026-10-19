import { normalizeDesktop } from '@scuttlarr/core/desktop'

import { prettyAccelerator } from './accelerator'
import type { Config } from './config'
import { appearanceOf } from './theme'

/**
 * The first-launch setup (`setup ⏎`, and on its own when a fresh config says
 * `setupPending`): one question per screen, nothing written until the last Enter,
 * and then only the keys Settings itself writes. Pure, so every rule here is
 * tested; SetupPanelContainer owns the I/O.
 */

export const SETUP_STEPS = [
  'welcome',
  'hotkey',
  'bar',
  'agents',
  'theme',
  'tiling',
  'ready',
  'done',
] as const
export type SetupStep = (typeof SETUP_STEPS)[number]

/** The six steps the progress pips count (welcome and done sit outside). */
export const COUNTED_STEPS: readonly SetupStep[] = SETUP_STEPS.slice(1, 7)

export type SetupChoices = {
  hotkey: string
  bar: boolean
  agents: boolean
  /** Account limits: the usage monitor plus Claude creds (a Keychain read, later). */
  limits: boolean
  theme: string
  /** The theme rung: Ghostty, tmux and editors follow the theme. */
  match: boolean
  tiling: boolean
}

/** `pickTheme` from appearance-ui, injected so this module stays pure. */
export type ThemePick = (
  config: Config,
  theme: string,
) => Pick<Config, 'theme' | 'appearance'>

export function choicesFrom(config: Config): SetupChoices {
  return {
    hotkey: config.hotkey,
    bar: config.bar.enabled,
    agents: config.agents.monitor,
    limits: config.agents.usage && config.agents.claudeCreds,
    theme: config.theme,
    match: appearanceOf(config).everywhere,
    tiling: normalizeDesktop(config.desktop).tiling.enabled,
  }
}

/** A fresh install starts on the suggested answers; a re-run starts where you are. */
export function recommendedChoices(config: Config): SetupChoices {
  const current = choicesFrom(config)
  return config.setupPending
    ? { ...current, agents: true, match: true }
    : current
}

export function stepAfter(step: SetupStep): SetupStep {
  const i = SETUP_STEPS.indexOf(step)
  return SETUP_STEPS[Math.min(i + 1, SETUP_STEPS.length - 1)] ?? step
}

export function stepBefore(step: SetupStep): SetupStep {
  const i = SETUP_STEPS.indexOf(step)
  return SETUP_STEPS[Math.max(i - 1, 0)] ?? step
}

const STEP_FIELDS: Partial<Record<SetupStep, (keyof SetupChoices)[]>> = {
  hotkey: ['hotkey'],
  bar: ['bar'],
  agents: ['agents', 'limits'],
  theme: ['theme', 'match'],
  tiling: ['tiling'],
}

/** Esc on a question: that step keeps its starting answer. */
export function skipStep(
  step: SetupStep,
  choices: SetupChoices,
  base: SetupChoices,
): SetupChoices {
  const next = { ...choices }
  for (const field of STEP_FIELDS[step] ?? []) {
    Object.assign(next, { [field]: base[field] })
  }
  return next
}

/** The config the final Enter writes. */
export function applySetup(
  config: Config,
  choices: SetupChoices,
  pick: ThemePick,
): Config {
  const limits = choices.agents && choices.limits
  const picked =
    choices.theme === config.theme
      ? config
      : { ...config, ...pick(config, choices.theme) }
  const desktop = normalizeDesktop(config.desktop)
  return {
    ...picked,
    hotkey: choices.hotkey,
    bar: { ...config.bar, enabled: choices.bar },
    agents: {
      ...config.agents,
      monitor: choices.agents,
      usage: limits || config.agents.usage,
      claudeCreds: limits,
    },
    appearance: {
      ...appearanceOf(picked),
      everywhere: choices.match,
      editors: choices.match,
    },
    desktop: {
      ...desktop,
      tiling: { ...desktop.tiling, enabled: choices.tiling },
    },
    setupPending: false,
  }
}

/** "Alt+Space" → ["⌥", "Space"]: the keycaps, modifiers first. */
export function hotkeyKeys(accel: string): string[] {
  const pretty = prettyAccelerator(accel)
  const mods = [...pretty].filter((ch) => '⌃⌥⇧⌘'.includes(ch))
  return [...mods, pretty.slice(mods.length)]
}

export type RecapLine = { on: boolean; text: string }

export function recapLines(c: SetupChoices): RecapLine[] {
  const keys = hotkeyKeys(c.hotkey)
  return [
    {
      on: true,
      text: `${keys.slice(0, -1).join('')} ${keys.at(-1)} opens scuttlarr`,
    },
    c.bar
      ? { on: true, text: 'The scuttlarr menu bar' }
      : { on: false, text: 'The macOS menu bar stays' },
    c.agents
      ? {
          on: true,
          text: c.limits
            ? 'Watching your agents, with usage limits'
            : 'Watching your agents',
        }
      : { on: false, text: 'Agent tracking off' },
    c.match
      ? { on: true, text: `${c.theme} in Ghostty, tmux and your editors` }
      : { on: true, text: `${c.theme}, in scuttlarr only` },
    c.tiling
      ? { on: true, text: 'Tiling with AeroSpace' }
      : { on: false, text: 'No tiling' },
  ]
}
