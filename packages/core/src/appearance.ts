/**
 * Theme policy (DECISIONS 2026-09-11, plan phase 4): *which* theme is active now.
 * Pure — Rust reports the inputs (active macOS Focus, system appearance) and the
 * panel window resolves and writes `config.theme`. Omarchy has no such layer; a
 * theme there is picked by hand. Here a manual pick still wins until the next
 * input change, because a pick writes the pair's current-mode slot too.
 *
 * Resolution order: Focus mapping (if the active Focus has one) → pair; then
 * mode picks the light or dark half: `system` follows macOS, `schedule` a clock,
 * `light`/`dark` fixed.
 */

export type AppearanceMode = 'system' | 'light' | 'dark' | 'schedule'

export type ThemePair = { light: string; dark: string }

/** A Focus maps to one theme (both modes) or a pair. Keyed by mode identifier
 * (`com.apple.focus.work`), which survives renames — the name is for display. */
export type FocusMapping = string | ThemePair

export type AppearancePolicy = {
  mode: AppearanceMode
  /** `HH:MM` local, 24h. Dark from `dark` until `light`, wrapping midnight. */
  schedule: { light: string; dark: string }
  pair: ThemePair
  focus: Record<string, FocusMapping>
}

export const DEFAULT_POLICY: AppearancePolicy = {
  mode: 'system',
  schedule: { light: '07:00', dark: '19:00' },
  pair: { light: 'solarized-light', dark: 'scuttlarr' },
  focus: {},
}

export type PolicyInputs = {
  /** Active macOS Focus mode identifier, or null. */
  focusMode: string | null
  /** macOS appearance right now. */
  systemDark: boolean
  /** Local wall clock, for `schedule`. */
  now: { hour: number; minute: number }
}

export type Resolution = {
  theme: string
  dark: boolean
  /** Which rule chose the pair (or single theme). */
  via: 'focus' | 'pair'
  /** Which rule chose light vs dark. */
  by: AppearanceMode
}

export function parseClock(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Dark between `dark` and `light`, wrapping midnight. Equal times → never dark. */
export function isDarkBySchedule(
  schedule: AppearancePolicy['schedule'],
  now: PolicyInputs['now'],
): boolean {
  const light = parseClock(schedule.light) ?? 7 * 60
  const dark = parseClock(schedule.dark) ?? 19 * 60
  const t = now.hour * 60 + now.minute
  if (light === dark) return false
  return light < dark ? t >= dark || t < light : t >= dark && t < light
}

export function isDark(
  policy: AppearancePolicy,
  inputs: PolicyInputs,
): boolean {
  switch (policy.mode) {
    case 'light':
      return false
    case 'dark':
      return true
    case 'schedule':
      return isDarkBySchedule(policy.schedule, inputs.now)
    default:
      return inputs.systemDark
  }
}

export function resolveAppearance(
  policy: AppearancePolicy,
  inputs: PolicyInputs,
): Resolution {
  const dark = isDark(policy, inputs)
  const mapping = inputs.focusMode ? policy.focus[inputs.focusMode] : undefined
  if (mapping !== undefined) {
    const theme =
      typeof mapping === 'string' ? mapping : mapping[dark ? 'dark' : 'light']
    return { theme, dark, via: 'focus', by: policy.mode }
  }
  return {
    theme: policy.pair[dark ? 'dark' : 'light'],
    dark,
    via: 'pair',
    by: policy.mode,
  }
}

/** A manual pick sticks: write it into the slot the policy is currently reading. */
export function withPick(
  policy: AppearancePolicy,
  inputs: PolicyInputs,
  theme: string,
): AppearancePolicy {
  const res = resolveAppearance(policy, inputs)
  return withPickSlot(policy, inputs, theme, res.dark ? 'dark' : 'light')
}

/** Write a theme into one half — the reading one (`withPick`) or the other, so
 * you can choose tonight's dark theme while it is still light (⌥⏎). Under a
 * mapped Focus the mapping is what changes; a single-theme mapping becomes a
 * pair when the other half is set. */
export function withPickSlot(
  policy: AppearancePolicy,
  inputs: PolicyInputs,
  theme: string,
  slot: 'light' | 'dark',
): AppearancePolicy {
  const res = resolveAppearance(policy, inputs)
  const reading = res.dark ? 'dark' : 'light'
  if (res.via === 'focus' && inputs.focusMode) {
    const current = policy.focus[inputs.focusMode]
    let next: FocusMapping
    if (current === undefined) next = theme
    else if (typeof current === 'string')
      next =
        slot === reading
          ? theme
          : ({ [reading]: current, [slot]: theme } as ThemePair)
    else next = { ...current, [slot]: theme }
    return { ...policy, focus: { ...policy.focus, [inputs.focusMode]: next } }
  }
  return { ...policy, pair: { ...policy.pair, [slot]: theme } }
}

/** "Toggle Dark Mode" while the policy owns light/dark: light ↔ dark; under
 * `schedule`, pin the opposite of what the clock says (a fixed mode) — the
 * user's intent wins until they set the mode back. Under `system` the caller
 * flips the OS instead, and this returns the policy unchanged. */
export function toggleMode(
  policy: AppearancePolicy,
  inputs: PolicyInputs,
): AppearancePolicy {
  if (policy.mode === 'system') return policy
  const dark = isDark(policy, inputs)
  return { ...policy, mode: dark ? 'light' : 'dark' }
}

/** Minutes until the next schedule boundary (for a wake-up timer); null when unscheduled. */
export function minutesToNextBoundary(
  policy: AppearancePolicy,
  now: PolicyInputs['now'],
): number | null {
  if (policy.mode !== 'schedule') return null
  const t = now.hour * 60 + now.minute
  const marks = [
    parseClock(policy.schedule.light),
    parseClock(policy.schedule.dark),
  ]
    .filter((m): m is number => m !== null)
    .map((m) => (m > t ? m - t : m + 24 * 60 - t))
  return marks.length ? Math.min(...marks) : null
}
