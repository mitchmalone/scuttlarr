import { isoWeek, yearProgress } from '@launcharr/tui'

/**
 * The calendar plugin's logic, pure and tested apart from React — the
 * `Model.js` convention Omarchy plugins settled on, kept here for the same
 * reason: the cell and panel stay presentational and this is what the tests
 * pin.
 */

/** State the `clock` native provider emits: nothing but the moment. */
export interface ClockState {
  epoch: number
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** The strip is glyph-first: "Thu 27", nothing more. */
export function cellLabel(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate()}`
}

/** "Thursday 27 August 2026" for the card and panel title. */
export function longDate(d: Date): string {
  const day = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][d.getDay()]
  return `${day} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

/** "August 2026" — the panel's month heading. */
export function monthTitle(year: number, month: number): string {
  return `${MONTHS_LONG[month]} ${year}`
}

/** "27 Aug · W35 · day 239 · 65% of 2026" — the card's one line of facts. */
export function dateFacts(d: Date): {
  short: string
  week: number
  dayOfYear: number
  yearPct: number
} {
  const start = new Date(d.getFullYear(), 0, 1)
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayOfYear =
    Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1
  return {
    short: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
    week: isoWeek(d),
    dayOfYear,
    yearPct: Math.round(yearProgress(d) * 100),
  }
}

/** The moment the plugin's state describes; the bar clock when there is none. */
export function stateDate(state: ClockState | null, now: Date): Date {
  return state?.epoch ? new Date(state.epoch * 1000) : now
}
