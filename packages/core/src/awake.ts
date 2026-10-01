/**
 * The awake feature's product brain: what a keep-awake session *is*, how the
 * grammar spells one, every user-facing string, and the pure trigger reducer
 * that decides when a session lets go. No I/O — Rust holds the assertions and
 * supplies readings; this module only decides and describes.
 *
 * Copy rules (plans/active/awake.md): say what the user observes, never what
 * we hold; every option states how it ends; limitations sit inline at the
 * option they limit.
 */

/** What a session holds and when it ends — serialized verbatim through Rust
 * (`awake_arm { spec }`), which stores it without interpreting it. */
export type AwakeSpec = {
  /** Keep the display lit too (else it sleeps/locks as configured). */
  screen: boolean
  /** Also keep external drives spinning. */
  disks: boolean
  until: AwakeUntil
  /** Release when the battery falls to this percent (off AC). null = no rail. */
  floor: number | null
}

export type AwakeUntil =
  | { kind: 'manual' }
  | { kind: 'timer'; minutes: number }
  | { kind: 'clock'; hour: number; minute: number }
  | AwakeDate
  | { kind: 'agents' }
  | { kind: 'app'; app: string }
  | { kind: 'power' }
  | { kind: 'wifi'; ssid: string }
  | { kind: 'display' }
  | { kind: 'busy' }

/** A calendar date: `until oct 16`. Month 1–12. No year = its next
 * occurrence; no time = held to the end of that day (23:59), because "until
 * the 16th" means through it, not up to its first minute. */
export type AwakeDate = {
  kind: 'date'
  year?: number
  month: number
  day: number
  hour?: number
  minute?: number
}

export const DEFAULT_FLOOR = 20

/** One sample of the world, as `awake_readings` reports it. Fields the Rust
 * side didn't bother gathering (not needed by the armed spec) come as null. */
export interface AwakeReading {
  nowMs: number
  onAc: boolean
  batteryPct: number | null
  ssid: string | null
  agentStates: string[]
  runningApps: string[] | null
  externalDisplay: boolean | null
  /** 1-minute load average and core count for the busy trigger. */
  load1: number | null
  cores: number
  /** Cumulative network bytes (in+out); the reducer derives a rate. */
  netBytes: number | null
}

/** Mirrors AwakeState in power.rs. */
export interface AwakeState {
  armed: boolean
  display: boolean
  disks: boolean
  elapsedSeconds: number
  untilEpochMs: number | null
  batteryFloor: number | null
  /** The AwakeSpec JSON handed to `awake_arm`, stored verbatim by Rust. */
  spec: string | null
  /** Why the last session ended without the user asking ('floor' | 'deadline'). */
  released: string | null
  /** Re-armed at launch from the previous run's persisted hold. */
  resumed: boolean
  /** macOS's own sleep is switched off for this hold (needs the sudoers rule). */
  sleepOff: boolean
}

/** Mirrors OtherHolder in power.rs. */
export interface OtherHolder {
  app: string
  seconds: number
  display: boolean
}

/** Mirrors AwakeStatus in power.rs — what `awake_status` returns. */
export interface AwakeStatus {
  state: AwakeState
  others: OtherHolder[]
}

export function parseSpec(json: string | null): AwakeSpec | null {
  if (!json) return null
  try {
    const spec = JSON.parse(json) as AwakeSpec
    return spec && typeof spec === 'object' && spec.until ? spec : null
  } catch {
    return null
  }
}

/* ---- trigger reducer -------------------------------------------------- */

/** Conditions Rust can't end on its own (timer/clock deadlines and the
 * battery floor are mechanical and live in Rust's watchdog). */
export function needsWatching(until: AwakeUntil): boolean {
  return !['manual', 'timer', 'clock', 'date'].includes(until.kind)
}

/** Which expensive readings the watcher should ask Rust to gather. */
export function neededReadings(until: AwakeUntil): {
  apps: boolean
  display: boolean
  net: boolean
} {
  return {
    apps: until.kind === 'app',
    display: until.kind === 'display',
    net: until.kind === 'busy',
  }
}

/** Release only after the condition has been false this long — a Mac must
 * not flap awake/asleep on a wifi roam or a breather between agent turns. */
const GRACE_MS: Record<string, number> = {
  agents: 60_000,
  app: 10_000,
  power: 10_000,
  wifi: 60_000,
  display: 15_000,
  busy: 300_000,
}

/** Load per core above this counts as "the Mac is busy". */
const BUSY_LOAD_PER_CORE = 0.25
/** Network throughput above this counts as busy (bytes/second). */
const BUSY_NET_BPS = 150_000

/** Reducer state carried between evaluations of one armed session. */
export interface TriggerState {
  /** Last time the condition held (or evaluation started). */
  lastHeldMs: number
  netPrev: { bytes: number; atMs: number } | null
}

export interface TriggerVerdict {
  release: boolean
  state: TriggerState
}

/** An agent waiting on you still counts as working; a finished (done) or
 * idle agent doesn't — holding on done-unread would keep a Mac up all night
 * over work that already ended. */
export function agentsWorking(states: string[]): boolean {
  return states.some((s) => s === 'working' || s === 'attention')
}

/**
 * One evaluation step: `(reading, prev) -> verdict`. Pure. Missing data
 * fails toward holding — releasing early loses the user's session, holding
 * too long only costs power (and the battery rail caps that).
 */
export function evaluate(
  until: AwakeUntil,
  reading: AwakeReading,
  prev: TriggerState | null,
): TriggerVerdict {
  const now = reading.nowMs
  const state: TriggerState = prev ?? { lastHeldMs: now, netPrev: null }

  let netRate: number | null = null
  if (reading.netBytes != null) {
    const p = state.netPrev
    if (p && reading.netBytes >= p.bytes && now > p.atMs) {
      netRate = ((reading.netBytes - p.bytes) / (now - p.atMs)) * 1000
    }
    state.netPrev = { bytes: reading.netBytes, atMs: now }
  }

  const held = satisfied(until, reading, netRate)
  if (held !== false) {
    // true, or unknown (null): both hold.
    return { release: false, state: { ...state, lastHeldMs: now } }
  }
  const grace = GRACE_MS[until.kind] ?? 0
  return { release: now - state.lastHeldMs >= grace, state }
}

/** Is the condition true right now? null = can't tell from this reading. */
function satisfied(
  until: AwakeUntil,
  r: AwakeReading,
  netRate: number | null,
): boolean | null {
  switch (until.kind) {
    case 'manual':
    case 'timer':
    case 'clock':
    case 'date':
      return true // ended by the user or Rust's deadline, never by us
    case 'agents':
      return agentsWorking(r.agentStates)
    case 'app':
      if (r.runningApps == null) return null
      return r.runningApps.some(
        (a) => a.toLowerCase() === until.app.toLowerCase(),
      )
    case 'power':
      return r.onAc
    case 'wifi':
      return r.ssid == null ? null : r.ssid === until.ssid
    case 'display':
      return r.externalDisplay
    case 'busy': {
      const loadBusy =
        r.load1 != null && r.cores > 0
          ? r.load1 / r.cores > BUSY_LOAD_PER_CORE
          : null
      const netBusy = netRate != null ? netRate > BUSY_NET_BPS : null
      if (loadBusy === null && netBusy === null) return null
      return loadBusy === true || netBusy === true
    }
  }
}

/* ---- deadlines -------------------------------------------------------- */

/** Timer/clock/date specs become an absolute deadline Rust enforces. A date
 * already past (or one that can't exist) has none. */
export function untilDeadline(until: AwakeUntil, now: Date): number | null {
  if (until.kind === 'timer') return now.getTime() + until.minutes * 60_000
  if (until.kind === 'date') return dateDeadline(until, now)
  if (until.kind === 'clock') {
    const at = new Date(now)
    at.setHours(until.hour, until.minute, 0, 0)
    if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1)
    return at.getTime()
  }
  return null
}

function dateDeadline(d: AwakeDate, now: Date): number | null {
  const at = (year: number): Date | null => {
    const t = new Date(year, d.month - 1, d.day, d.hour ?? 23, d.minute ?? 59)
    return t.getMonth() === d.month - 1 && t.getDate() === d.day ? t : null
  }
  if (d.year != null) {
    const t = at(d.year)
    return t && t.getTime() > now.getTime() ? t.getTime() : null
  }
  // Next occurrence; eight years always reaches a leap year for 29 Feb.
  for (let y = now.getFullYear(); y <= now.getFullYear() + 8; y++) {
    const t = at(y)
    if (t && t.getTime() > now.getTime()) return t.getTime()
  }
  return null
}

/** Could this day exist in some year? (29 Feb can; 30 Feb can't.) */
function possibleDay(month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false
  return new Date(2024, month - 1, day).getMonth() === month - 1
}

/* ---- grammar ---------------------------------------------------------- */

/** `awake <args>` → what to do; null = unrecognized (offer the panel). */
export type AwakeCommand = { kind: 'off' } | { kind: 'arm'; until: AwakeUntil }

const DURATION = /^(?:(\d+)h)?\s*(?:(\d+)m)?$/

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]

/** `oct`, `october`, `sept` → 1–12; anything else → null. */
function monthOf(word: string): number | null {
  const i = MONTHS.indexOf(word.slice(0, 3))
  if (i < 0) return null
  const full = new Date(2024, i, 1)
    .toLocaleString('en', { month: 'long' })
    .toLowerCase()
  return full.startsWith(word) || word === 'sept' ? i + 1 : null
}

/** `9am`, `6:30 pm`, `18:15` → 24h; null when it isn't a time. */
function parseTime(text: string): { hour: number; minute: number } | null {
  const m = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!m) return null
  let hour = Number(m[1])
  const minute = Number(m[2] ?? 0)
  if (m[3] === 'pm' && hour < 12) hour += 12
  if (m[3] === 'am' && hour === 12) hour = 0
  return hour < 24 && minute < 60 ? { hour, minute } : null
}

/** The date half of `until …`: `oct 16`, `16 oct 2026`, `2026-10-16`, each
 * optionally followed by `[at] <time>`. undefined = not a date at all;
 * null = shaped like a date but impossible. */
function parseDate(text: string): AwakeDate | null | undefined {
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(?:at\s+)?(.+))?$/)
  const monthFirst = text.match(
    /^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?(?:\s+(?:at\s+)?(.+))?$/,
  )
  const dayFirst = text.match(
    /^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?(?:\s+(?:at\s+)?(.+))?$/,
  )
  let year: number | undefined
  let month: number | null
  let day: number
  let time: string | undefined
  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
    time = iso[4]
  } else if (monthFirst && monthOf(monthFirst[1]!) != null) {
    month = monthOf(monthFirst[1]!)
    day = Number(monthFirst[2])
    year = monthFirst[3] ? Number(monthFirst[3]) : undefined
    time = monthFirst[4]
  } else if (dayFirst && monthOf(dayFirst[2]!) != null) {
    month = monthOf(dayFirst[2]!)
    day = Number(dayFirst[1])
    year = dayFirst[3] ? Number(dayFirst[3]) : undefined
    time = dayFirst[4]
  } else {
    return undefined
  }
  if (month == null || !possibleDay(month, day)) return null
  const date: AwakeDate = { kind: 'date', month, day }
  if (year != null) date.year = year
  if (time != null) {
    const t = parseTime(time)
    if (!t) return null
    date.hour = t.hour
    date.minute = t.minute
  }
  return date
}

export function parseAwakeArgs(args: string): AwakeCommand | null {
  const text = args.trim().toLowerCase()
  if (!text) return null
  if (text === 'off' || text === 'stop') return { kind: 'off' }

  const dur = text.match(DURATION)
  if (dur && (dur[1] || dur[2])) {
    const minutes = Number(dur[1] ?? 0) * 60 + Number(dur[2] ?? 0)
    if (minutes > 0) return { kind: 'arm', until: { kind: 'timer', minutes } }
  }

  const until_ = text.match(/^until\s+(.+)$/)
  if (until_) {
    const rest = until_[1]!.trim()
    const date = parseDate(rest)
    if (date) return { kind: 'arm', until: date }
    if (date === null) return null
    const t = parseTime(rest)
    return t ? { kind: 'arm', until: { kind: 'clock', ...t } } : null
  }

  const while_ = text.match(/^while\s+(.+)$/)
  if (while_) {
    const what = while_[1]!.trim()
    if (what === 'agents' || what === 'agents are working') {
      return { kind: 'arm', until: { kind: 'agents' } }
    }
    if (what === 'plugged in' || what === 'on ac' || what === 'charging') {
      return { kind: 'arm', until: { kind: 'power' } }
    }
    if (what === 'busy') return { kind: 'arm', until: { kind: 'busy' } }
    // Anything else names an app; original casing from the raw args.
    const raw = args.trim().replace(/^while\s+/i, '')
    return { kind: 'arm', until: { kind: 'app', app: raw } }
  }
  return null
}

/* ---- the words -------------------------------------------------------- */

/** How a session ends, stated in the same breath as its start. */
export function untilLabel(until: AwakeUntil): string {
  switch (until.kind) {
    case 'manual':
      return 'until you turn it off'
    case 'timer':
      return `for ${formatMinutes(until.minutes)}`
    case 'clock':
      return `until ${formatClock(until.hour, until.minute)}`
    case 'date':
      return until.hour == null
        ? `until the end of ${formatDate(until)}`
        : `until ${formatDate(until)}, ${formatClock(until.hour, until.minute ?? 0)}`
    case 'agents':
      return 'while agents are working'
    case 'app':
      return `while ${until.app} is running`
    case 'power':
      return `while plugged in`
    case 'wifi':
      return `while on ${until.ssid}`
    case 'display':
      return 'while an external display is attached'
    case 'busy':
      return 'while the Mac is busy'
  }
}

/** Compact end-state for the armed header and the bar card. */
export function endsLabel(until: AwakeUntil, deadline: number | null): string {
  if (deadline != null) {
    const at = new Date(deadline)
    const clock = formatClock(at.getHours(), at.getMinutes())
    if (until.kind !== 'date') return `until ${clock}`
    const day = formatDate({ month: at.getMonth() + 1, day: at.getDate() })
    return `until ${day}, ${clock}`
  }
  switch (until.kind) {
    case 'manual':
      return 'until turned off'
    case 'agents':
      return 'until agents idle'
    case 'app':
      return `until ${until.app} quits`
    case 'power':
      return 'until unplugged'
    case 'wifi':
      return `until off ${until.ssid}`
    case 'display':
      return 'until the display detaches'
    case 'busy':
      return 'until the Mac goes quiet'
    default:
      return 'until turned off'
  }
}

/** What stays on, as the user observes it. */
export function holdLabel(screen: boolean, disks: boolean): string {
  const base = screen ? 'Mac and screen both on' : 'Mac awake, screen can sleep'
  return disks ? `${base} · drives spinning` : base
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return formatMinutes(Math.round(seconds / 60))
}

export function formatClock(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const mm = minute.toString().padStart(2, '0')
  return `${h12}:${mm} ${hour < 12 ? 'am' : 'pm'}`
}

/** `16 Oct`, or `2 Jan 2027` when a year was given. */
export function formatDate(d: {
  year?: number
  month: number
  day: number
}): string {
  const mon = MONTHS[d.month - 1]!
  const label = `${d.day} ${mon[0]!.toUpperCase()}${mon.slice(1)}`
  return d.year != null ? `${label} ${d.year}` : label
}
