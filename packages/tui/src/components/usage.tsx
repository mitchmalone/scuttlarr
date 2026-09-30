/**
 * Agent usage — the `usage ⏎` panel and its account tiles. CodexBar is the
 * design reference (provider tiles, meters, reset countdowns) rendered in the
 * kit's Omarchy-flat idiom. Pure props: the desktop container polls
 * `usage_status`; the site hands in fictional data in the same shape
 * (invariant 10 — the site never re-types this panel).
 */
import { Gauge } from 'lucide-react'
import type { KeyboardEvent } from 'react'

import { foldUsageBarState } from '../bar/format'
import type { LimitWindow, UsageBarAccount, UsageBarState } from '../bar/types'
import { MeterRow, SegmentedControl } from './controls'
import { KeyHints, Panel, SectionHeader } from './primitives'

export type { LimitWindow, UsageBarAccount, UsageBarState }
export { foldUsageBarState }

/** Mirrors usage.rs (UsageReport et al). */
export interface DayUsage {
  label: string
  tokens: number
}
export interface ModelUsage {
  model: string
  tokens: number
}
export interface ProviderUsage extends UsageBarAccount {
  /** Oldest first, today last; seven entries. */
  days: DayUsage[]
  /** Window total per model, largest first. */
  models: ModelUsage[]
}
export interface UsageReport {
  /** Unix seconds of the finished scan; 0 = never scanned. */
  generatedAt: number
  providers: ProviderUsage[]
}

/** The "all accounts" overview's selection key. */
export const USAGE_ALL = 'all'

const PROVIDER_NAMES: Record<string, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
}

/** "Claude Code" / "Codex" for a provider kind; the kind itself otherwise. */
export const providerName = (kind: string) => PROVIDER_NAMES[kind] ?? kind

/**
 * Pace: is usage running ahead of the clock? A window's percent used means
 * little alone — 80% with an hour to reset is fine, 80% a day into a week is
 * not. Judged against how far through the window "now" is:
 *
 * - `alert` — used runs ≥ PACE_ALERT points ahead of elapsed, or ≥ 90% used
 *   whatever the clock says: slow down. In the window's first PACE_EARLY
 *   percent a burst after a reset is normal, so only a sprint (≥ PACE_SPRINT
 *   points ahead) or the 90% wall alerts there.
 * - `go` — used trails elapsed by ≥ PACE_GO points: headroom, spin up agents.
 * - `normal` — roughly on pace.
 *
 * A window whose length is unknown, or whose reset has already passed (a
 * stale cached reading), can't be judged: `windowPace` calls it normal and
 * the folds leave it out, so it can't hold the cell off green.
 */
export type UsagePace = 'go' | 'normal' | 'alert'

export const PACE_ALERT = 15
export const PACE_GO = 25
export const PACE_EARLY = 15
export const PACE_SPRINT = 40
const PACE_HARD_LIMIT = 90
const PACE_RANK: Record<UsagePace, number> = { go: 0, normal: 1, alert: 2 }

/** How far through its window "now" is, 0–100; null when the length or the
 * reset is unknown, or the reset has passed (the reading predates it). */
export function windowElapsed(l: LimitWindow, nowSecs: number): number | null {
  if (l.resetsAt == null || !l.windowSecs) return null
  const left = l.resetsAt - nowSecs
  if (left <= 0) return null
  const pct = (1 - left / l.windowSecs) * 100
  return Math.max(0, Math.min(100, pct))
}

/** Whether the window's reading is stale: its reset has already happened. */
const resetPassed = (l: LimitWindow, nowSecs: number) =>
  l.resetsAt != null && l.resetsAt <= nowSecs

export function windowPace(l: LimitWindow, nowSecs: number): UsagePace {
  if (resetPassed(l, nowSecs)) return 'normal'
  if (l.usedPercent >= PACE_HARD_LIMIT) return 'alert'
  const elapsed = windowElapsed(l, nowSecs)
  if (elapsed == null) return 'normal'
  const ahead = l.usedPercent - elapsed
  const alertAt = elapsed < PACE_EARLY ? PACE_SPRINT : PACE_ALERT
  if (ahead >= alertAt) return 'alert'
  if (ahead <= -PACE_GO) return 'go'
  return 'normal'
}

/** Whether a window has a say in the folds: judgeable, or at the wall. */
const judged = (l: LimitWindow, nowSecs: number) =>
  !resetPassed(l, nowSecs) &&
  (windowElapsed(l, nowSecs) != null || l.usedPercent >= PACE_HARD_LIMIT)

/** Worst pace wins: one window running hot is the account's bottleneck, and
 * "go" only holds when every judged window has headroom. Windows that can't
 * be judged sit out; with windows but none judged it's `normal`, with none
 * at all null. */
export function worstPace(
  limits: LimitWindow[],
  nowSecs: number,
): UsagePace | null {
  let worst: UsagePace | null = null
  for (const l of limits) {
    if (!judged(l, nowSecs)) continue
    const p = windowPace(l, nowSecs)
    if (worst == null || PACE_RANK[p] > PACE_RANK[worst]) worst = p
  }
  return worst ?? (limits.length > 0 ? 'normal' : null)
}

/** The bar cell's pace across every account — worst wins, as per account. */
export function usagePace(
  accounts: UsageBarAccount[],
  nowSecs: number,
): UsagePace | null {
  return worstPace(
    accounts.flatMap((a) => a.limits),
    nowSecs,
  )
}

export const PACE_LABEL: Record<UsagePace, string> = {
  go: 'go go go',
  normal: 'on pace',
  alert: 'slow down',
}

/** A window's display name: the headline windows get one word ("5h session"
 * / "5h" → "Session", "weekly · all models" / "weekly" → "Weekly"); the rest
 * keep their scope, capitalised ("weekly · opus" → "Weekly · opus"). */
export function windowLabel(name: string): string {
  const n = name.trim()
  if (/^5h( session)?$/i.test(n)) return 'Session'
  if (/^weekly( · all models)?$/i.test(n)) return 'Weekly'
  return n.charAt(0).toUpperCase() + n.slice(1)
}

/** 218234567 → "218.2M", 927000000 → "927M", 1600 → "1.6k", 42 → "42". */
export function fmtTokens(n: number): string {
  const scaled = (value: number, unit: string) => {
    const s = value.toFixed(1).replace(/\.0$/, '')
    return `${s}${unit}`
  }
  if (n >= 1e9) return scaled(n / 1e9, 'B')
  if (n >= 1e6) return scaled(n / 1e6, 'M')
  if (n >= 1e3) return scaled(n / 1e3, 'k')
  return String(n)
}

/** Seconds until reset → "resets in 4d" / "resets in 7h" / "resets soon". */
export function fmtReset(resetsAt: number | null, nowSecs: number): string {
  if (resetsAt == null) return ''
  const s = resetsAt - nowSecs
  if (s <= 0) return 'resets soon'
  if (s < 3600) return `resets in ${Math.max(1, Math.round(s / 60))}m`
  if (s < 86_400) return `resets in ${Math.round(s / 3600)}h`
  return `resets in ${Math.round(s / 86_400)}d`
}

/** Two-unit countdown for the bar card: "4d 12h" / "4h 42m" / "12m" /
 * "soon". */
export function fmtCountdown(resetsAt: number | null, nowSecs: number): string {
  if (resetsAt == null) return ''
  const s = resetsAt - nowSecs
  if (s <= 0) return 'soon'
  const m = Math.max(1, Math.floor(s / 60))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

/** Short reset for tight spaces: "4d" / "7h" / "12m" / "soon". */
export function fmtResetShort(
  resetsAt: number | null,
  nowSecs: number,
): string {
  if (resetsAt == null) return ''
  const s = resetsAt - nowSecs
  if (s <= 0) return 'soon'
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`
  if (s < 86_400) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86_400)}d`
}

/** Segmented-control labels: the account's label, disambiguated by provider
 * when two accounts share one ("Personal" twice → "Personal · claude-work"). */
export function accountOptions(providers: UsageBarAccount[]) {
  const counts = new Map<string, number>()
  for (const p of providers) counts.set(p.label, (counts.get(p.label) ?? 0) + 1)
  return providers.map((p) => ({
    value: p.id,
    label: (counts.get(p.label) ?? 0) > 1 ? `${p.label} · ${p.id}` : p.label,
  }))
}

/** A window's pace as a meter tone; "on pace" is the untinted rest state. */
const toneFor = (l: LimitWindow, nowSecs: number): 'good' | 'danger' | null => {
  const pace = windowPace(l, nowSecs)
  return pace === 'go' ? 'good' : pace === 'alert' ? 'danger' : null
}

/** A window's elapsed share as a meter marker (0–1), null when unknown. */
const markerFor = (l: LimitWindow, nowSecs: number): number | null => {
  const elapsed = windowElapsed(l, nowSecs)
  return elapsed == null ? null : elapsed / 100
}

/** One account's windows as thin meters; the tile head names the account and
 * carries its pace. Selectable tiles are the overview's drill-in. */
export function UsageTile({
  usage,
  nowSecs,
  onSelect,
}: {
  usage: UsageBarAccount
  nowSecs: number
  onSelect?: (id: string) => void
}) {
  const pace = worstPace(usage.limits, nowSecs)
  const sub = [providerName(usage.provider), usage.account]
    .filter(Boolean)
    .join(' · ')
  return (
    <div
      className={`tui-usage-tile ${onSelect ? 'tui-usage-tile-selectable' : ''}`}
      onClick={onSelect ? () => onSelect(usage.id) : undefined}
      role={onSelect ? 'button' : undefined}
    >
      <div className="tui-usage-tile-head">
        <span className="tui-usage-tile-name">{usage.label}</span>
        <span className="tui-usage-tile-sub">{sub}</span>
        {pace && (
          <span className={`tui-usage-tile-headline tui-pace-${pace}`}>
            {PACE_LABEL[pace]}
          </span>
        )}
      </div>
      {usage.limits.map((l) => (
        <MeterRow
          key={l.name}
          label={l.name}
          value={l.usedPercent}
          max={100}
          right={`${Math.round(l.usedPercent)}%${
            l.resetsAt != null ? ` · ${fmtResetShort(l.resetsAt, nowSecs)}` : ''
          }`}
          tone={toneFor(l, nowSecs)}
          marker={markerFor(l, nowSecs)}
        />
      ))}
      {usage.limits.length === 0 && !usage.limitsNote && (
        <div className="tui-usage-note">no limits reported</div>
      )}
      {usage.limitsNote && (
        <div className="tui-usage-note" title={usage.limitsNote}>
          {usage.limitsNote}
        </div>
      )}
    </div>
  )
}

export interface UsagePanelProps {
  report: UsageReport | null
  /** `USAGE_ALL` for the overview, else a provider id. */
  selected: string
  /** Unix seconds "now", injected so stories render deterministic countdowns. */
  nowSecs: number
  onSelect: (id: string) => void
  onClose: () => void
}

/**
 * `usage ⏎`: an *All* overview of every account as tiles, then one view per
 * account with its limits, tokens by day, and tokens by model. ←→ walks
 * All → accounts; Esc closes.
 */
export function UsagePanel({
  report,
  selected,
  nowSecs,
  onSelect,
  onClose,
}: UsagePanelProps) {
  const providers = report?.providers ?? []
  const scanning = report == null || report.generatedAt === 0
  const keys = [USAGE_ALL, ...providers.map((p) => p.id)]
  const current = keys.includes(selected) ? selected : USAGE_ALL
  const active =
    current === USAGE_ALL
      ? null
      : (providers.find((p) => p.id === current) ?? null)

  const cycle = (step: number) => {
    const i = keys.indexOf(current)
    const next = keys[(i + step + keys.length) % keys.length]
    if (next) onSelect(next)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault()
      cycle(-1)
    } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault()
      cycle(1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const windowTotal = (active ? [active] : providers).reduce(
    (sum, p) => sum + p.days.reduce((s, d) => s + d.tokens, 0),
    0,
  )
  const pace = usagePace(providers, nowSecs)
  const subtitle = scanning
    ? 'scanning journals…'
    : active
      ? `${fmtTokens(windowTotal)} tokens · 7 days`
      : pace
        ? `${PACE_LABEL[pace]} · ${fmtTokens(windowTotal)} tokens · 7 days`
        : `${fmtTokens(windowTotal)} tokens · 7 days`

  const dayMax = Math.max(1, ...(active?.days.map((d) => d.tokens) ?? []))
  const modelMax = Math.max(1, ...(active?.models.map((m) => m.tokens) ?? []))

  return (
    <Panel
      autoFocus
      icon={<Gauge size={17} strokeWidth={2} aria-hidden />}
      title="Usage"
      subtitle={subtitle}
      onKeyDown={onKeyDown}
      footer={
        <KeyHints
          hints={[
            { keys: '←→', label: 'account' },
            { keys: 'esc', label: 'back' },
          ]}
        />
      }
    >
      <SegmentedControl
        options={[
          { value: USAGE_ALL, label: 'All' },
          ...accountOptions(providers),
        ]}
        value={current}
        onChange={onSelect}
      />
      {!active && (
        <div className="tui-usage-tiles">
          {providers.map((p) => (
            <UsageTile
              key={p.id}
              usage={p}
              nowSecs={nowSecs}
              onSelect={onSelect}
            />
          ))}
          {providers.length === 0 && !scanning && (
            <div className="tui-usage-note">no accounts found</div>
          )}
        </div>
      )}
      {active && (
        <>
          <SectionHeader
            label="Limits"
            right={[providerName(active.provider), active.account]
              .filter(Boolean)
              .join(' · ')}
          />
          {active.limits.map((l) => (
            <MeterRow
              key={l.name}
              label={l.name}
              value={l.usedPercent}
              max={100}
              right={`${Math.round(l.usedPercent)}%${
                l.resetsAt != null ? ` · ${fmtReset(l.resetsAt, nowSecs)}` : ''
              }`}
              tone={toneFor(l, nowSecs)}
              marker={markerFor(l, nowSecs)}
            />
          ))}
          {active.limitsNote && (
            <MeterRow label={active.limitsNote} value={0} right="" />
          )}
          <SectionHeader label="Tokens by day" />
          {active.days.map((d) => (
            <MeterRow
              key={d.label}
              label={d.label}
              value={d.tokens}
              max={dayMax}
              right={fmtTokens(d.tokens)}
              emphasis={d.label === 'Today'}
            />
          ))}
          <SectionHeader label="Tokens by model" />
          {active.models.length === 0 ? (
            <MeterRow label="no usage in the last 7 days" value={0} right="" />
          ) : (
            active.models.map((m) => (
              <MeterRow
                key={m.model}
                label={m.model}
                value={m.tokens}
                max={modelMax}
                right={fmtTokens(m.tokens)}
              />
            ))
          )}
        </>
      )}
    </Panel>
  )
}
