import type {
  AgentSession,
  BatteryDetail,
  UsageBarAccount,
  UsageBarState,
} from './types'

/** Pure formatting and grouping for the bar. No React, no environment. */

/** The strip's height in points — bar.css `.bar { height }`, bar.rs BAR_HEIGHT and
 * the AeroSpace top gap all agree on this one number. */
export const BAR_STRIP_HEIGHT = 30

/** User-facing state names where the wire name reads wrong. Shapes live in
 * agent-icons.tsx; `read` is the store's own post-visit state (agents.rs). */
export const AGENT_STATE_LABELS: Record<string, string> = {
  attention: 'needs you',
  done: 'done · unread',
  read: 'done · read',
}

export const agentStateLabel = (state: string) =>
  AGENT_STATE_LABELS[state] ?? state

/** Compact age for a cell's right edge: 45s, 12m, 3h, 2d. */
export function agentAge(updatedAt: number, now: Date): string {
  const s = Math.max(0, Math.floor(now.getTime() / 1000) - updatedAt)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.round(s / 60)}m`
  if (s < 86_400) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86_400)}d`
}

/** A duration in its two largest units: 42s, 2m 40s, 1h 12m, 2d 3h. */
export function agentDuration(secs: number): string {
  const s = Math.max(0, Math.floor(secs))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  if (s < 86_400)
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  return `${Math.floor(s / 86_400)}d ${Math.floor((s % 86_400) / 3600)}h`
}

/** The card's "doing" line, assembled from the adapter's `Tool object` detail. */
export interface AgentDoing {
  /** A lucide icon name, or null when the detail isn't a tool we know. */
  icon: string | null
  verb: string
  object: string
}

/** Claude's tool names → lucide icon, present verb, past verb. */
const TOOL_VERBS: Record<string, [string, string, string]> = {
  Edit: ['pencil', 'editing', 'edited'],
  MultiEdit: ['pencil', 'editing', 'edited'],
  NotebookEdit: ['pencil', 'editing', 'edited'],
  Write: ['file-plus', 'writing', 'wrote'],
  Read: ['file-text', 'reading', 'read'],
  Bash: ['terminal', 'running', 'ran'],
  Grep: ['search', 'searching', 'searched'],
  Glob: ['search', 'searching', 'searched'],
  LS: ['folder', 'listing', 'listed'],
  WebFetch: ['globe', 'fetching', 'fetched'],
  WebSearch: ['globe', 'searching', 'searched'],
  Agent: ['git-fork', 'delegating', 'delegated'],
  Task: ['git-fork', 'delegating', 'delegated'],
  Skill: ['book-open', 'using', 'used'],
  TodoWrite: ['list-checks', 'planning', 'planned'],
  AskUserQuestion: ['message-circle-question', 'asking', 'asked'],
}

/** States where the detail describes the last thing done, not the current. */
const QUIET_STATES = new Set(['done', 'read', 'idle'])

/** Claude Code hook event names — the pre-2026-10-28 hook put these in detail. */
const CLAUDE_EVENTS = new Set([
  'SessionStart',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'PermissionRequest',
  'Notification',
  'Stop',
  'SessionEnd',
  'SubagentStart',
  'SubagentStop',
])

/**
 * What the agent is doing, in words: `Edit format.ts` → pencil, "editing",
 * `format.ts`; in a quiet state the verb turns past ("last edited"). A
 * `permission …` detail gets the lock, `thinking` the brain. Anything the kit
 * can't parse — herdr's detail, a notification's text, a legacy
 * `PostToolUse · Edit` with no object — is shown as it came, without an icon.
 * Null when there is nothing to say.
 */
export function agentDoing(state: string, detail: string): AgentDoing | null {
  let text = detail.trim()
  if (!text) return null
  const legacy = text.split(' · ')
  if (legacy.length === 2 && CLAUDE_EVENTS.has(legacy[0]!)) {
    text = legacy[1]!.trim()
  } else if (legacy.length === 1 && CLAUDE_EVENTS.has(text)) {
    return null
  }
  const past = QUIET_STATES.has(state)
  const [head = '', ...rest] = text.split(/\s+/)
  const object = rest.join(' ')
  if (head === 'permission') {
    return { icon: 'lock', verb: past ? 'asked for' : 'permission', object }
  }
  if (head === 'thinking') {
    return { icon: 'brain', verb: past ? 'thought' : 'thinking', object: '' }
  }
  const tool = TOOL_VERBS[head]
  if (tool) {
    return { icon: tool[0], verb: past ? `last ${tool[2]}` : tool[1], object }
  }
  return { icon: null, verb: '', object: text }
}

/**
 * The card's clock line: how long the state has held (a turn, a wait, a rest)
 * and how old the session is, then the agent's name. Records from before the
 * clocks existed fall back to the last event's time.
 */
export function agentMeta(a: AgentSession, nowSecs: number): string[] {
  const held = agentDuration(nowSecs - (a.stateSince || a.updatedAt))
  const age = agentDuration(nowSecs - (a.startedAt || a.updatedAt))
  const state =
    a.state === 'working'
      ? `turn ${held}`
      : a.state === 'attention'
        ? `waiting ${held}`
        : a.state === 'done' || a.state === 'read'
          ? `finished ${held} ago`
          : `${a.state} ${held}`
  return [state, `session ${age}`, a.agent]
}

/** The card's location line, or its no-pane fallback. Reads as a place, not a
 * fault: since liveness is checked by process too (agents.rs), an agent with no
 * pane is simply one running outside a multiplexer. */
export function agentLocation(a: AgentSession): string {
  return agentCrumbs(a).join(' · ')
}

/** The same location as crumbs — session, tab, window — in tmux's own order. */
export function agentCrumbs(a: AgentSession): string[] {
  if (!a.muxGroup) return [a.mux ? `in ${a.mux}` : 'outside a multiplexer']
  const crumbs = [a.muxGroup, `tab ${a.muxIndex}`]
  if (a.muxLabel) crumbs.push(a.muxLabel)
  return crumbs
}

/**
 * Multiplexer groups — tmux session or herdr workspace, ordered by name, cells
 * by tab index — plus loose cells for agents in no multiplexer at all;
 * invocation order never decides placement. The caller boxes the loose ones too
 * (dashed): an ungrouped glyph floating beside the boxes read as breakage
 * rather than as "not in one".
 */
export function groupAgents(agents: AgentSession[]): {
  groups: [string, AgentSession[]][]
  loose: AgentSession[]
} {
  const byName = new Map<string, AgentSession[]>()
  const loose: AgentSession[] = []
  for (const a of agents) {
    if (a.muxGroup) {
      const list = byName.get(a.muxGroup) ?? []
      list.push(a)
      byName.set(a.muxGroup, list)
    } else {
      loose.push(a)
    }
  }
  for (const list of byName.values()) {
    list.sort(
      (x, y) =>
        (x.muxIndex ?? 0) - (y.muxIndex ?? 0) ||
        x.session.localeCompare(y.session),
    )
  }
  loose.sort((x, y) => x.session.localeCompare(y.session))
  const groups = [...byName.entries()].sort(([a], [b]) => a.localeCompare(b))
  return { groups, loose }
}

/** Sketchybar parity: "Sat 16 Aug 07:45". */
export function formatBarClock(now: Date): string {
  const date = now
    .toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    .replace(',', '')
  const hh = now.getHours().toString().padStart(2, '0')
  const mm = now.getMinutes().toString().padStart(2, '0')
  return `${date} ${hh}:${mm}`
}

/** "4h 58m" / "58m" — the same shape macOS puts in its own battery menu. */
export function timeLeft(minutes: number): string {
  const h = Math.floor(minutes / 60)
  return h > 0 ? `${h}h ${minutes % 60}m` : `${minutes}m`
}

/** The lead line under "Battery": what the pack is doing right now. */
export function batteryState(d: BatteryDetail): string {
  if (d.charging) return 'charging'
  if (d.onAc) return d.fullyCharged ? 'charged' : 'AC attached · not charging'
  return 'discharging'
}

/**
 * Alert tiers for a right-zone cell. `.bar-warn`/`.bar-danger` are scoped under
 * `.bar-right` in CSS so they outrank `.bar-cell` (JOURNAL 2026-08-16).
 */
export type CellTone = 'normal' | 'warn' | 'danger'

export const toneClass = (tone: CellTone) =>
  tone === 'normal' ? 'bar-cell' : `bar-cell bar-${tone}`

/**
 * "Adjusted charge": with a charge limit set (Battery → "Limit to 80 %"), the
 * limit is what full means — 80 % on a limited pack reads as 100 %. The card
 * keeps the true percentage; only the strip's glyph is judged against it.
 */
export function adjustedPct(pct: number, chargeLimit: number | null): number {
  if (chargeLimit == null || chargeLimit <= 0 || chargeLimit >= 100) return pct
  return Math.min(100, Math.round((pct / chargeLimit) * 100))
}

export type BatteryGlyph = 'charging' | 'full' | 'medium' | 'low' | 'warning'
/** Cell colour: charging is blue, healthy green, running down amber, empty red. */
export type BatteryTone = 'charging' | 'good' | 'warn' | 'danger'

export interface BatteryLook {
  glyph: BatteryGlyph
  tone: BatteryTone
  /** Judged against the charge limit — what the strip is drawn from. */
  adjusted: number
  /** Only the red tier prints its number next to the glyph. */
  showPct: boolean
}

/**
 * What the strip draws for a battery, from the adjusted charge (2026-08-19):
 * charging → blue (the charging glyph from 90 %, else the level glyph);
 * otherwise full ≥ 50 % green, medium < 50 % and low < 25 % amber,
 * warning < 10 % red with the percentage. Plugged in counts as charging
 * for the strip: at the charge limit macOS reports "AC attached; not
 * charging", and Mitch still wants the cell to read as on power (2026-08-19)
 * — the card keeps the charging/held distinction.
 */
export function batteryLook(
  pct: number,
  charging: boolean,
  chargeLimit: number | null,
  onAc = false,
): BatteryLook {
  const adjusted = adjustedPct(pct, chargeLimit)
  charging = charging || onAc
  const level: BatteryGlyph =
    adjusted >= 50
      ? 'full'
      : adjusted >= 25
        ? 'medium'
        : adjusted >= 10
          ? 'low'
          : 'warning'
  if (charging) {
    return {
      glyph: adjusted >= 90 ? 'charging' : level,
      tone: 'charging',
      adjusted,
      showPct: false,
    }
  }
  const tone: BatteryTone =
    level === 'full' ? 'good' : level === 'warning' ? 'danger' : 'warn'
  return { glyph: level, tone, adjusted, showPct: level === 'warning' }
}

/** Wi-Fi bars from RSSI (dBm): 4 = full, 1 = poor; unknown reads as full so a
 * missing reading never looks like a bad link. Thresholds follow the usual
 * client bands (≥ −60 excellent, −60…−70 good, −70…−80 fair, below poor). */
export function wifiBars(rssi: number | null): 1 | 2 | 3 | 4 {
  if (rssi == null) return 4
  if (rssi >= -60) return 4
  if (rssi >= -70) return 3
  if (rssi >= -80) return 2
  return 1
}

/**
 * Cell tone for the wifi glyph (2026-08-19): offline is danger, a poor link
 * (1 bar, below −80 dBm) is warn, anything better is plain fg — "fair" still
 * works, and the arcs already say it's not full.
 */
export function wifiTone(online: boolean, rssi: number | null): CellTone {
  if (!online) return 'danger'
  return wifiBars(rssi) <= 1 ? 'warn' : 'normal'
}

/** "−66 dBm · good" for the card; empty when unknown. */
export function wifiSignalLabel(rssi: number | null): string {
  if (rssi == null) return ''
  const word = ['', 'poor', 'fair', 'good', 'excellent'][wifiBars(rssi)]
  return `${rssi} dBm · ${word}`
}

/* ---- widgets ---------------------------------------------------------- */

/** The tones a widget may name (docs/WIDGETS.md); anything else is plain. */
export const WIDGET_TONES = ['ok', 'warn', 'error', 'muted', 'accent'] as const

/** `bar-tone-<tone>` for a known tone, '' for none/unknown — cells and dots. */
export function widgetToneClass(tone: string | null | undefined): string {
  return tone && (WIDGET_TONES as readonly string[]).includes(tone)
    ? `bar-tone-${tone}`
    : ''
}

/**
 * The card's health line for a failing widget: what went wrong and when it
 * last worked. Healthy widgets get null (no line).
 */
export function widgetHealth(
  error: string | null,
  lastOk: number | null,
  now: Date,
): string | null {
  if (!error) return null
  return lastOk == null
    ? error
    : `${error} · last ok ${agentAge(lastOk, now)} ago`
}

/* ---- usage ----------------------------------------------------------- */

/** The bar's fold of a usage report: per-account windows, histograms
 * dropped, plus today's tokens across every account (the card's subtitle). */
export function foldUsageBarState(report: {
  generatedAt?: number
  providers: (UsageBarAccount & { days?: { tokens: number }[] })[]
}): UsageBarState {
  const accounts = report.providers.map(
    ({ id, provider, label, account, limits, limitsNote }) => ({
      id,
      provider,
      label,
      account,
      limits,
      limitsNote,
    }),
  )
  // `days` runs oldest first, today last.
  const tokensToday = report.providers.reduce(
    (sum, p) => sum + (p.days?.at(-1)?.tokens ?? 0),
    0,
  )
  return { tokensToday, accounts }
}
