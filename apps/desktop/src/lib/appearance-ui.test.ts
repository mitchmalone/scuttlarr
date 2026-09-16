import { DEFAULT_POLICY } from '@scuttlarr/core/appearance'
import { describe, expect, it } from 'vitest'

import {
  FOCUS_OWN_PAIR,
  FOCUS_USE_PAIR,
  focusChoice,
  isClock,
  pickTheme,
  pickThemeOther,
  policyInputs,
  withFocusChoice,
  withFocusHalf,
} from './appearance-ui'
import type { Config } from './config'

const NOON = { hour: 12, minute: 0 }
const WORK = 'com.apple.focus.work'

const config = (appearance?: Config['appearance']): Config =>
  ({ theme: 'scuttlarr', themes: {}, appearance }) as unknown as Config

describe('policyInputs', () => {
  it('defaults missing inputs to no Focus, light', () => {
    expect(policyInputs(null, NOON)).toEqual({
      focusMode: null,
      systemDark: false,
      now: NOON,
    })
  })
  it('passes Rust inputs through', () => {
    expect(
      policyInputs({ focusMode: WORK, systemDark: true, modes: [] }, NOON),
    ).toMatchObject({ focusMode: WORK, systemDark: true })
  })
})

describe('pickTheme', () => {
  it('writes the theme and the pair slot the policy is reading', () => {
    const out = pickTheme(
      config(),
      { focusMode: null, systemDark: true, modes: [] },
      'dracula',
      NOON,
    )
    expect(out.theme).toBe('dracula')
    // No policy on disk yet: the pair was seeded from the current theme, and the
    // pick fills the half the policy is reading (dark, the Mac is dark).
    expect(out.appearance?.pair).toEqual({
      light: config().theme,
      dark: 'dracula',
    })
    expect(out.appearance?.everywhere).toBe(false)
  })
  it('writes the active Focus mapping when one exists', () => {
    const out = pickTheme(
      config({
        everywhere: false,
        macos: true,
        editors: false,
        ghostty: false,
        ...DEFAULT_POLICY,
        focus: { [WORK]: 'terminal' },
      }),
      { focusMode: WORK, systemDark: false, modes: [] },
      'dracula',
      NOON,
    )
    expect(out.appearance?.focus[WORK]).toBe('dracula')
    expect(out.appearance?.pair).toEqual(DEFAULT_POLICY.pair)
  })
})

describe('focusChoice', () => {
  it('maps undefined → use the pair, string → itself, pair → own', () => {
    expect(focusChoice(undefined)).toBe(FOCUS_USE_PAIR)
    expect(focusChoice('dracula')).toBe('dracula')
    expect(focusChoice({ light: 'a', dark: 'b' })).toBe(FOCUS_OWN_PAIR)
  })
})

describe('withFocusChoice', () => {
  it('"use the pair" removes the key', () => {
    const p = { ...DEFAULT_POLICY, focus: { [WORK]: 'dracula' } }
    expect(withFocusChoice(p, WORK, FOCUS_USE_PAIR).focus).toEqual({})
  })
  it('a theme name stores a string', () => {
    expect(withFocusChoice(DEFAULT_POLICY, WORK, 'dracula').focus).toEqual({
      [WORK]: 'dracula',
    })
  })
  it('"own pair" seeds from the global pair', () => {
    expect(withFocusChoice(DEFAULT_POLICY, WORK, FOCUS_OWN_PAIR).focus).toEqual(
      { [WORK]: DEFAULT_POLICY.pair },
    )
  })
  it('"own pair" from a single theme keeps it for both halves', () => {
    const p = { ...DEFAULT_POLICY, focus: { [WORK]: 'dracula' } }
    expect(withFocusChoice(p, WORK, FOCUS_OWN_PAIR).focus[WORK]).toEqual({
      light: 'dracula',
      dark: 'dracula',
    })
  })
  it('does not mutate the input', () => {
    const p = { ...DEFAULT_POLICY, focus: { [WORK]: 'dracula' } }
    withFocusChoice(p, WORK, FOCUS_USE_PAIR)
    expect(p.focus[WORK]).toBe('dracula')
  })
})

describe('withFocusHalf', () => {
  it('sets one half of an own pair', () => {
    const p = {
      ...DEFAULT_POLICY,
      focus: { [WORK]: { light: 'a', dark: 'b' } },
    }
    expect(withFocusHalf(p, WORK, 'dark', 'c').focus[WORK]).toEqual({
      light: 'a',
      dark: 'c',
    })
  })
  it('is a no-op for a single-theme or missing mapping', () => {
    const p = { ...DEFAULT_POLICY, focus: { [WORK]: 'a' } }
    expect(withFocusHalf(p, WORK, 'dark', 'c')).toBe(p)
    expect(withFocusHalf(DEFAULT_POLICY, WORK, 'dark', 'c')).toBe(
      DEFAULT_POLICY,
    )
  })
})

describe('isClock', () => {
  it('accepts HH:MM and rejects the rest', () => {
    expect(isClock('07:00')).toBe(true)
    expect(isClock('7:05')).toBe(true)
    expect(isClock('24:00')).toBe(false)
    expect(isClock('7')).toBe(false)
    expect(isClock('')).toBe(false)
  })
})

describe('pickThemeOther', () => {
  it('sets the half not being read and leaves the active theme alone', () => {
    const out = pickThemeOther(
      config(),
      { focusMode: null, systemDark: true, modes: [] },
      'solarized-light',
      NOON,
    )
    expect('theme' in out).toBe(false)
    expect(out.appearance?.pair).toEqual({
      light: 'solarized-light',
      dark: config().theme,
    })
  })
})
