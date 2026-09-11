import { describe, expect, it } from 'vitest'

import {
  type AppearancePolicy,
  DEFAULT_POLICY,
  isDarkBySchedule,
  minutesToNextBoundary,
  parseClock,
  resolveAppearance,
  toggleMode,
  withPick,
  withPickSlot,
} from './appearance'

const at = (hour: number, minute = 0) => ({ hour, minute })
const inputs = (
  over: Partial<Parameters<typeof resolveAppearance>[1]> = {},
) => ({
  focusMode: null,
  systemDark: true,
  now: at(12),
  ...over,
})

describe('parseClock', () => {
  it('reads HH:MM and rejects junk', () => {
    expect(parseClock('07:00')).toBe(420)
    expect(parseClock('7:05')).toBe(425)
    expect(parseClock('24:00')).toBeNull()
    expect(parseClock('noon')).toBeNull()
  })
})

describe('isDarkBySchedule', () => {
  const s = { light: '07:00', dark: '19:00' }
  it('is dark from dark until light, wrapping midnight', () => {
    expect(isDarkBySchedule(s, at(19))).toBe(true)
    expect(isDarkBySchedule(s, at(23, 59))).toBe(true)
    expect(isDarkBySchedule(s, at(3))).toBe(true)
    expect(isDarkBySchedule(s, at(6, 59))).toBe(true)
    expect(isDarkBySchedule(s, at(7))).toBe(false)
    expect(isDarkBySchedule(s, at(18, 59))).toBe(false)
  })
  it('handles a light time after the dark time (night shift) and equal times', () => {
    expect(isDarkBySchedule({ light: '19:00', dark: '07:00' }, at(12))).toBe(
      true,
    )
    expect(isDarkBySchedule({ light: '19:00', dark: '07:00' }, at(22))).toBe(
      false,
    )
    expect(isDarkBySchedule({ light: '09:00', dark: '09:00' }, at(9))).toBe(
      false,
    )
  })
  it('falls back to 07:00/19:00 on unparsable times', () => {
    expect(isDarkBySchedule({ light: 'x', dark: 'y' }, at(20))).toBe(true)
  })
})

describe('resolveAppearance', () => {
  it('follows the system by default', () => {
    expect(
      resolveAppearance(DEFAULT_POLICY, inputs({ systemDark: true })),
    ).toEqual({
      theme: 'scuttlarr',
      dark: true,
      via: 'pair',
      by: 'system',
    })
    expect(
      resolveAppearance(DEFAULT_POLICY, inputs({ systemDark: false })).theme,
    ).toBe('solarized-light')
  })
  it('fixed modes ignore the system', () => {
    expect(
      resolveAppearance(
        { ...DEFAULT_POLICY, mode: 'light' },
        inputs({ systemDark: true }),
      ).theme,
    ).toBe('solarized-light')
    expect(
      resolveAppearance(
        { ...DEFAULT_POLICY, mode: 'dark' },
        inputs({ systemDark: false }),
      ).theme,
    ).toBe('scuttlarr')
  })
  it('schedule picks by the clock', () => {
    const p: AppearancePolicy = { ...DEFAULT_POLICY, mode: 'schedule' }
    expect(
      resolveAppearance(p, inputs({ systemDark: true, now: at(12) })).dark,
    ).toBe(false)
    expect(
      resolveAppearance(p, inputs({ systemDark: false, now: at(22) })).dark,
    ).toBe(true)
  })
  it('a Focus mapping wins: single theme in both modes, or its own pair', () => {
    const p: AppearancePolicy = {
      ...DEFAULT_POLICY,
      focus: {
        'com.apple.donotdisturb.mode.default': 'terminal',
        'com.apple.focus.work': {
          light: 'solarized-light',
          dark: 'tokyo-night',
        },
      },
    }
    expect(
      resolveAppearance(
        p,
        inputs({ focusMode: 'com.apple.donotdisturb.mode.default' }),
      ),
    ).toMatchObject({ theme: 'terminal', via: 'focus' })
    expect(
      resolveAppearance(
        p,
        inputs({
          focusMode: 'com.apple.donotdisturb.mode.default',
          systemDark: false,
        }),
      ).theme,
    ).toBe('terminal')
    expect(
      resolveAppearance(
        p,
        inputs({ focusMode: 'com.apple.focus.work', systemDark: true }),
      ).theme,
    ).toBe('tokyo-night')
    expect(
      resolveAppearance(p, inputs({ focusMode: 'com.apple.focus.sleep' })).via,
    ).toBe('pair')
  })
})

describe('withPick', () => {
  it('writes the pair slot the policy is reading right now', () => {
    const p = withPick(DEFAULT_POLICY, inputs({ systemDark: true }), 'dracula')
    expect(p.pair).toEqual({ light: 'solarized-light', dark: 'dracula' })
    expect(
      withPick(DEFAULT_POLICY, inputs({ systemDark: false }), 'nord').pair
        .light,
    ).toBe('nord')
  })
  it('under a mapped Focus, writes that mapping instead', () => {
    const base: AppearancePolicy = {
      ...DEFAULT_POLICY,
      focus: { work: { light: 'a', dark: 'b' }, dnd: 'terminal' },
    }
    expect(
      withPick(base, inputs({ focusMode: 'work', systemDark: false }), 'x')
        .focus.work,
    ).toEqual({ light: 'x', dark: 'b' })
    expect(
      withPick(base, inputs({ focusMode: 'dnd' }), 'amber').focus.dnd,
    ).toBe('amber')
    // An unmapped Focus falls through to the pair.
    expect(
      withPick(base, inputs({ focusMode: 'sleep' }), 'amber').pair.dark,
    ).toBe('amber')
  })
})

describe('minutesToNextBoundary', () => {
  it('is null unless scheduled, else the nearest upcoming mark', () => {
    expect(minutesToNextBoundary(DEFAULT_POLICY, at(12))).toBeNull()
    const p: AppearancePolicy = { ...DEFAULT_POLICY, mode: 'schedule' }
    expect(minutesToNextBoundary(p, at(12))).toBe(7 * 60)
    expect(minutesToNextBoundary(p, at(20))).toBe(11 * 60)
    expect(minutesToNextBoundary(p, at(6, 30))).toBe(30)
  })
})

describe('withPickSlot', () => {
  it('writes the other half without touching the reading one', () => {
    const p = withPickSlot(
      DEFAULT_POLICY,
      inputs({ systemDark: false }),
      'nord',
      'dark',
    )
    expect(p.pair).toEqual({ light: 'solarized-light', dark: 'nord' })
  })
  it('turns a single-theme Focus mapping into a pair when the other half is set', () => {
    const base: AppearancePolicy = {
      ...DEFAULT_POLICY,
      focus: { dnd: 'terminal' },
    }
    expect(
      withPickSlot(
        base,
        inputs({ focusMode: 'dnd', systemDark: true }),
        'amber',
        'light',
      ).focus.dnd,
    ).toEqual({ dark: 'terminal', light: 'amber' })
    expect(
      withPickSlot(
        base,
        inputs({ focusMode: 'dnd', systemDark: true }),
        'amber',
        'dark',
      ).focus.dnd,
    ).toBe('amber')
  })
})

describe('toggleMode', () => {
  it('flips fixed modes, pins the opposite under schedule, leaves system alone', () => {
    expect(
      toggleMode({ ...DEFAULT_POLICY, mode: 'light' }, inputs()).mode,
    ).toBe('dark')
    expect(toggleMode({ ...DEFAULT_POLICY, mode: 'dark' }, inputs()).mode).toBe(
      'light',
    )
    expect(
      toggleMode(
        { ...DEFAULT_POLICY, mode: 'schedule' },
        inputs({ now: at(22) }),
      ).mode,
    ).toBe('light')
    expect(
      toggleMode(
        { ...DEFAULT_POLICY, mode: 'schedule' },
        inputs({ now: at(12) }),
      ).mode,
    ).toBe('dark')
    expect(toggleMode(DEFAULT_POLICY, inputs()).mode).toBe('system')
  })
})
