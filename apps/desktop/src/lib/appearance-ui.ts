/**
 * The theme policy's UI half, shared by Settings → General ▸ Theme and the
 * `theme ⏎` panel: turning Rust's inputs into `PolicyInputs`, a manual pick
 * into a config patch, and a Focus mapping into a select value and back.
 * Pure — the tauri calls stay in the callers.
 */
import {
  type AppearancePolicy,
  type FocusMapping,
  type PolicyInputs,
  parseClock,
  withPick,
} from '@scuttlarr/core/appearance'

import type { Config } from './config'
import { appearanceOf } from './theme'
import type { AppearanceInputs } from './use-appearance-policy'

export const clockNow = (): PolicyInputs['now'] => {
  const d = new Date()
  return { hour: d.getHours(), minute: d.getMinutes() }
}

/** Rust's inputs plus the wall clock — what the policy resolves against. */
export function policyInputs(
  inputs: AppearanceInputs | null,
  now: PolicyInputs['now'] = clockNow(),
): PolicyInputs {
  return {
    focusMode: inputs?.focusMode ?? null,
    systemDark: inputs?.systemDark ?? false,
    now,
  }
}

/** A manual pick: `config.theme` plus the policy slot it should stick in. */
export function pickTheme(
  config: Config,
  inputs: AppearanceInputs | null,
  theme: string,
  now?: PolicyInputs['now'],
): Pick<Config, 'theme' | 'appearance'> {
  const appearance = appearanceOf(config)
  return {
    theme,
    appearance: {
      ...appearance,
      ...withPick(appearance, policyInputs(inputs, now), theme),
    },
  }
}

/** The Focus select: `''` = use the pair, `'own'` = its own pair, else a theme name. */
export const FOCUS_USE_PAIR = ''
export const FOCUS_OWN_PAIR = 'own'

export function focusChoice(mapping: FocusMapping | undefined): string {
  if (mapping === undefined) return FOCUS_USE_PAIR
  return typeof mapping === 'string' ? mapping : FOCUS_OWN_PAIR
}

/** Apply a Focus select change; "use the pair" removes the key. An "own pair"
 * choice seeds from the global pair (or keeps a single theme for both halves). */
export function withFocusChoice(
  policy: AppearancePolicy,
  id: string,
  choice: string,
): AppearancePolicy {
  const focus = { ...policy.focus }
  if (choice === FOCUS_USE_PAIR) {
    delete focus[id]
  } else if (choice === FOCUS_OWN_PAIR) {
    const current = focus[id]
    focus[id] =
      typeof current === 'string'
        ? { light: current, dark: current }
        : (current ?? { ...policy.pair })
  } else {
    focus[id] = choice
  }
  return { ...policy, focus }
}

/** Set one half of a Focus's own pair (no-op when it maps to a single theme). */
export function withFocusHalf(
  policy: AppearancePolicy,
  id: string,
  half: 'light' | 'dark',
  theme: string,
): AppearancePolicy {
  const current = policy.focus[id]
  if (current === undefined || typeof current === 'string') return policy
  return {
    ...policy,
    focus: { ...policy.focus, [id]: { ...current, [half]: theme } },
  }
}

/** Same rule as `parseClock`; the settings field shows an error otherwise. */
export const isClock = (hhmm: string): boolean => parseClock(hhmm) !== null
