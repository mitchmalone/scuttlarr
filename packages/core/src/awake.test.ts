import { describe, expect, it } from 'vitest'

import {
  type AwakeReading,
  type AwakeUntil,
  agentsWorking,
  endsLabel,
  evaluate,
  formatClock,
  formatMinutes,
  formatSeconds,
  holdLabel,
  neededReadings,
  needsWatching,
  parseAwakeArgs,
  parseSpec,
  untilDeadline,
  untilLabel,
} from './awake'

const T0 = 1_000_000_000_000

function reading(over: Partial<AwakeReading> = {}): AwakeReading {
  return {
    nowMs: T0,
    onAc: true,
    batteryPct: 80,
    ssid: 'RamenAmok',
    agentStates: [],
    runningApps: null,
    externalDisplay: null,
    load1: null,
    cores: 8,
    netBytes: null,
    ...over,
  }
}

/** Run a sequence of readings through the reducer, returning each verdict. */
function run(until: AwakeUntil, readings: AwakeReading[]): boolean[] {
  let state = null as ReturnType<typeof evaluate>['state'] | null
  const out: boolean[] = []
  for (const r of readings) {
    const v = evaluate(until, r, state)
    state = v.state
    out.push(v.release)
  }
  return out
}

describe('agents trigger', () => {
  it('holds while any agent works or waits on the user', () => {
    expect(agentsWorking(['working', 'idle'])).toBe(true)
    expect(agentsWorking(['attention'])).toBe(true)
  })

  it('a finished (done) or idle agent does not hold', () => {
    expect(agentsWorking(['done', 'idle'])).toBe(false)
    expect(agentsWorking([])).toBe(false)
    expect(agentsWorking(['unknown'])).toBe(false)
  })

  it('releases only after a full quiet minute', () => {
    const until: AwakeUntil = { kind: 'agents' }
    const verdicts = run(until, [
      reading({ agentStates: ['working'], nowMs: T0 }),
      reading({ agentStates: [], nowMs: T0 + 30_000 }),
      reading({ agentStates: [], nowMs: T0 + 59_000 }),
      reading({ agentStates: [], nowMs: T0 + 61_000 }),
    ])
    expect(verdicts).toEqual([false, false, false, true])
  })

  it('an agent resuming resets the quiet clock', () => {
    const until: AwakeUntil = { kind: 'agents' }
    const verdicts = run(until, [
      reading({ agentStates: [], nowMs: T0 }),
      reading({ agentStates: ['working'], nowMs: T0 + 50_000 }),
      reading({ agentStates: [], nowMs: T0 + 100_000 }),
      reading({ agentStates: [], nowMs: T0 + 111_000 }),
    ])
    expect(verdicts).toEqual([false, false, false, true])
  })

  it('grace counts from the first observation when nothing was ever working', () => {
    const until: AwakeUntil = { kind: 'agents' }
    const verdicts = run(until, [
      reading({ agentStates: [], nowMs: T0 }),
      reading({ agentStates: [], nowMs: T0 + 61_000 }),
    ])
    expect(verdicts).toEqual([false, true])
  })
})

describe('app trigger', () => {
  const until: AwakeUntil = { kind: 'app', app: 'Ghostty' }

  it('holds while the app runs, case-insensitively', () => {
    const verdicts = run(until, [
      reading({ runningApps: ['Finder', 'ghostty'], nowMs: T0 }),
      reading({ runningApps: ['Finder'], nowMs: T0 + 5_000 }),
      reading({ runningApps: ['Finder'], nowMs: T0 + 16_000 }),
    ])
    expect(verdicts).toEqual([false, false, true])
  })

  it('a missing app list holds rather than releasing', () => {
    const verdicts = run(until, [
      reading({ runningApps: null, nowMs: T0 }),
      reading({ runningApps: null, nowMs: T0 + 600_000 }),
    ])
    expect(verdicts).toEqual([false, false])
  })
})

describe('power / wifi / display triggers', () => {
  it('power releases shortly after unplugging', () => {
    const until: AwakeUntil = { kind: 'power' }
    expect(
      run(until, [
        reading({ onAc: true, nowMs: T0 }),
        reading({ onAc: false, nowMs: T0 + 5_000 }),
        reading({ onAc: false, nowMs: T0 + 11_000 }),
      ]),
    ).toEqual([false, false, true])
  })

  it('wifi survives a roam shorter than its grace', () => {
    const until: AwakeUntil = { kind: 'wifi', ssid: 'RamenAmok' }
    expect(
      run(until, [
        reading({ ssid: 'RamenAmok', nowMs: T0 }),
        reading({ ssid: null, nowMs: T0 + 30_000 }), // hidden mid-roam: unknown holds
        reading({ ssid: 'RamenAmok', nowMs: T0 + 40_000 }),
        reading({ ssid: 'Elsewhere', nowMs: T0 + 50_000 }),
        reading({ ssid: 'Elsewhere', nowMs: T0 + 101_000 }),
      ]),
    ).toEqual([false, false, false, false, true])
  })

  it('display releases after the detach grace', () => {
    const until: AwakeUntil = { kind: 'display' }
    expect(
      run(until, [
        reading({ externalDisplay: true, nowMs: T0 }),
        reading({ externalDisplay: false, nowMs: T0 + 5_000 }),
        reading({ externalDisplay: false, nowMs: T0 + 16_000 }),
      ]),
    ).toEqual([false, false, true])
  })
})

describe('busy trigger', () => {
  const until: AwakeUntil = { kind: 'busy' }
  const MIN5 = 300_000

  it('holds on processor load and releases after five quiet minutes', () => {
    expect(
      run(until, [
        reading({ load1: 6, cores: 8, nowMs: T0 }),
        reading({ load1: 0.5, cores: 8, nowMs: T0 + MIN5 - 1000 }),
        reading({ load1: 0.5, cores: 8, nowMs: T0 + 2 * MIN5 }),
      ]),
    ).toEqual([false, false, true])
  })

  it('network throughput alone keeps it busy', () => {
    // 10 MB over 10 s = 1 MB/s — well over the threshold.
    expect(
      run(until, [
        reading({ load1: 0.1, netBytes: 0, nowMs: T0 }),
        reading({ load1: 0.1, netBytes: 10_000_000, nowMs: T0 + 10_000 }),
        // Quiet from here; the release needs 5 minutes of it.
        reading({ load1: 0.1, netBytes: 10_000_100, nowMs: T0 + 20_000 }),
        reading({
          load1: 0.1,
          netBytes: 10_000_200,
          nowMs: T0 + 20_000 + MIN5,
        }),
      ]),
    ).toEqual([false, false, false, true])
  })

  it('holds when no reading is available at all', () => {
    expect(
      run(until, [
        reading({ load1: null, netBytes: null, nowMs: T0 }),
        reading({ load1: null, netBytes: null, nowMs: T0 + 2 * MIN5 }),
      ]),
    ).toEqual([false, false])
  })

  it('a counter reset (interface bounce) does not fake a huge rate', () => {
    expect(
      run(until, [
        reading({ load1: 0.1, netBytes: 5_000_000, nowMs: T0 }),
        // Counter went backwards: rate is unknown for this step, which holds.
        reading({ load1: 0.1, netBytes: 100, nowMs: T0 + 10_000 }),
      ]),
    ).toEqual([false, false])
  })
})

describe('manual and deadline kinds', () => {
  it('never release from the reducer', () => {
    for (const until of [
      { kind: 'manual' } as const,
      { kind: 'timer', minutes: 5 } as const,
      { kind: 'clock', hour: 18, minute: 0 } as const,
    ]) {
      expect(
        run(until, [reading(), reading({ nowMs: T0 + 86_400_000 })]),
      ).toEqual([false, false])
    }
  })

  it('needsWatching is false for them and true for conditions', () => {
    expect(needsWatching({ kind: 'manual' })).toBe(false)
    expect(needsWatching({ kind: 'timer', minutes: 5 })).toBe(false)
    expect(needsWatching({ kind: 'clock', hour: 6, minute: 0 })).toBe(false)
    expect(needsWatching({ kind: 'agents' })).toBe(true)
    expect(needsWatching({ kind: 'busy' })).toBe(true)
  })

  it('declares which expensive readings each condition needs', () => {
    expect(neededReadings({ kind: 'app', app: 'X' })).toEqual({
      apps: true,
      display: false,
      net: false,
    })
    expect(neededReadings({ kind: 'busy' }).net).toBe(true)
    expect(neededReadings({ kind: 'agents' })).toEqual({
      apps: false,
      display: false,
      net: false,
    })
  })
})

describe('deadlines', () => {
  it('timer becomes now + minutes', () => {
    const now = new Date('2026-08-16T10:00:00')
    expect(untilDeadline({ kind: 'timer', minutes: 120 }, now)).toBe(
      now.getTime() + 2 * 3600_000,
    )
  })

  it('clock picks today when still ahead, tomorrow when passed', () => {
    const now = new Date('2026-08-16T10:00:00')
    const today = new Date(
      untilDeadline({ kind: 'clock', hour: 18, minute: 0 }, now)!,
    )
    expect(today.getDate()).toBe(16)
    expect(today.getHours()).toBe(18)
    const tomorrow = new Date(
      untilDeadline({ kind: 'clock', hour: 9, minute: 0 }, now)!,
    )
    expect(tomorrow.getDate()).toBe(17)
  })

  it('a date without a year is its next occurrence, held to the end of that day', () => {
    const now = new Date('2026-10-01T12:00:00')
    const oct16 = new Date(
      untilDeadline({ kind: 'date', month: 10, day: 16 }, now)!,
    )
    expect([oct16.getFullYear(), oct16.getMonth(), oct16.getDate()]).toEqual([
      2026, 9, 16,
    ])
    expect([oct16.getHours(), oct16.getMinutes()]).toEqual([23, 59])
    const sep1 = new Date(
      untilDeadline({ kind: 'date', month: 9, day: 1 }, now)!,
    )
    expect(sep1.getFullYear()).toBe(2027)
  })

  it('a date takes an explicit time and year', () => {
    const now = new Date('2026-10-01T12:00:00')
    const at = new Date(
      untilDeadline(
        { kind: 'date', year: 2026, month: 10, day: 16, hour: 9, minute: 30 },
        now,
      )!,
    )
    expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([16, 9, 30])
    // Today, with the time still ahead, is today.
    const today = new Date(
      untilDeadline({ kind: 'date', month: 10, day: 1, hour: 18 }, now)!,
    )
    expect([today.getFullYear(), today.getDate()]).toEqual([2026, 1])
  })

  it('a date already past, or impossible, has no deadline', () => {
    const now = new Date('2026-10-01T12:00:00')
    expect(
      untilDeadline({ kind: 'date', year: 2026, month: 9, day: 1 }, now),
    ).toBeNull()
    // 29 Feb resolves to the next leap year rather than rolling into March.
    const leap = new Date(
      untilDeadline({ kind: 'date', month: 2, day: 29 }, now)!,
    )
    expect([leap.getFullYear(), leap.getMonth(), leap.getDate()]).toEqual([
      2028, 1, 29,
    ])
  })

  it('conditions have no deadline', () => {
    expect(untilDeadline({ kind: 'agents' }, new Date())).toBeNull()
    expect(untilDeadline({ kind: 'manual' }, new Date())).toBeNull()
  })
})

describe('grammar', () => {
  it('parses durations', () => {
    expect(parseAwakeArgs('2h')).toEqual({
      kind: 'arm',
      until: { kind: 'timer', minutes: 120 },
    })
    expect(parseAwakeArgs('45m')).toEqual({
      kind: 'arm',
      until: { kind: 'timer', minutes: 45 },
    })
    expect(parseAwakeArgs('1h 30m')).toEqual({
      kind: 'arm',
      until: { kind: 'timer', minutes: 90 },
    })
  })

  it('parses clock times', () => {
    expect(parseAwakeArgs('until 6pm')).toEqual({
      kind: 'arm',
      until: { kind: 'clock', hour: 18, minute: 0 },
    })
    expect(parseAwakeArgs('until 6:30 am')).toEqual({
      kind: 'arm',
      until: { kind: 'clock', hour: 6, minute: 30 },
    })
    expect(parseAwakeArgs('until 18:15')).toEqual({
      kind: 'arm',
      until: { kind: 'clock', hour: 18, minute: 15 },
    })
    expect(parseAwakeArgs('until 12am')).toEqual({
      kind: 'arm',
      until: { kind: 'clock', hour: 0, minute: 0 },
    })
  })

  it('parses dates, either order, optional year and time', () => {
    const oct16 = { kind: 'date', month: 10, day: 16 }
    expect(parseAwakeArgs('until oct 16')).toEqual({
      kind: 'arm',
      until: oct16,
    })
    expect(parseAwakeArgs('until 16 Oct')).toEqual({
      kind: 'arm',
      until: oct16,
    })
    expect(parseAwakeArgs('until october 16')).toEqual({
      kind: 'arm',
      until: oct16,
    })
    expect(parseAwakeArgs('until 16 oct 2026')).toEqual({
      kind: 'arm',
      until: { ...oct16, year: 2026 },
    })
    expect(parseAwakeArgs('until 2026-10-16')).toEqual({
      kind: 'arm',
      until: { ...oct16, year: 2026 },
    })
    expect(parseAwakeArgs('until oct 16 9am')).toEqual({
      kind: 'arm',
      until: { ...oct16, hour: 9, minute: 0 },
    })
    expect(parseAwakeArgs('until 16 oct at 6:30pm')).toEqual({
      kind: 'arm',
      until: { ...oct16, hour: 18, minute: 30 },
    })
  })

  it('rejects impossible dates', () => {
    expect(parseAwakeArgs('until oct 32')).toBeNull()
    expect(parseAwakeArgs('until feb 30')).toBeNull()
    expect(parseAwakeArgs('until 2026-13-01')).toBeNull()
    expect(parseAwakeArgs('until oct 16 25:00')).toBeNull()
    // A bare number stays a clock time.
    expect(parseAwakeArgs('until 16')).toEqual({
      kind: 'arm',
      until: { kind: 'clock', hour: 16, minute: 0 },
    })
  })

  it('parses conditions, with agents winning over an app of that name', () => {
    expect(parseAwakeArgs('while agents')).toEqual({
      kind: 'arm',
      until: { kind: 'agents' },
    })
    expect(parseAwakeArgs('while plugged in')).toEqual({
      kind: 'arm',
      until: { kind: 'power' },
    })
    expect(parseAwakeArgs('while Ghostty')).toEqual({
      kind: 'arm',
      until: { kind: 'app', app: 'Ghostty' },
    })
  })

  it('parses off and rejects noise', () => {
    expect(parseAwakeArgs('off')).toEqual({ kind: 'off' })
    expect(parseAwakeArgs('')).toBeNull()
    expect(parseAwakeArgs('sideways')).toBeNull()
    expect(parseAwakeArgs('until 99pm')).toBeNull()
    expect(parseAwakeArgs('0m')).toBeNull()
  })
})

describe('labels', () => {
  it('states how every option ends', () => {
    expect(untilLabel({ kind: 'manual' })).toBe('until you turn it off')
    expect(untilLabel({ kind: 'timer', minutes: 120 })).toBe('for 2h')
    expect(untilLabel({ kind: 'clock', hour: 18, minute: 0 })).toBe(
      'until 6:00 pm',
    )
    expect(untilLabel({ kind: 'app', app: 'Ghostty' })).toBe(
      'while Ghostty is running',
    )
  })

  it('compact ends for the armed header', () => {
    expect(endsLabel({ kind: 'agents' }, null)).toBe('until agents idle')
    expect(
      endsLabel(
        { kind: 'timer', minutes: 60 },
        new Date('2026-08-16T18:00:00').getTime(),
      ),
    ).toBe('until 6:00 pm')
    expect(
      endsLabel(
        { kind: 'date', month: 10, day: 16 },
        new Date('2026-10-16T23:59:00').getTime(),
      ),
    ).toBe('until 16 Oct, 11:59 pm')
  })

  it('states how a date ends', () => {
    expect(untilLabel({ kind: 'date', month: 10, day: 16 })).toBe(
      'until the end of 16 Oct',
    )
    expect(
      untilLabel({ kind: 'date', year: 2027, month: 1, day: 2, hour: 9 }),
    ).toBe('until 2 Jan 2027, 9:00 am')
  })

  it('formats durations and clocks', () => {
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(90)).toBe('1h 30m')
    expect(formatSeconds(42)).toBe('42s')
    expect(formatSeconds(252 * 60)).toBe('4h 12m')
    expect(formatClock(0, 5)).toBe('12:05 am')
    expect(formatClock(12, 0)).toBe('12:00 pm')
  })

  it('describes what stays on', () => {
    expect(holdLabel(false, false)).toBe('Mac awake, screen can sleep')
    expect(holdLabel(true, true)).toBe(
      'Mac and screen both on · drives spinning',
    )
  })

  it('round-trips a spec through JSON', () => {
    const spec = {
      screen: false,
      disks: false,
      until: { kind: 'agents' as const },
      floor: 20,
    }
    expect(parseSpec(JSON.stringify(spec))).toEqual(spec)
    expect(parseSpec(null)).toBeNull()
    expect(parseSpec('not json')).toBeNull()
    expect(parseSpec('42')).toBeNull()
  })
})
