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

/** Alert tiers shared by the panel meters and the bar cell: amber from 70%,
 * red from 90% — the same thresholds a battery cell uses in reverse. */
export type UsageTone = 'ok' | 'warn' | 'danger'
export function usageTone(pct: number | null): UsageTone {
  if (pct == null) return 'ok'
  if (pct >= 90) return 'danger'
  if (pct >= 70) return 'warn'
  return 'ok'
}

/** The window nearest its limit, or null when the account reports none. */
export function tightestWindow(limits: LimitWindow[]): LimitWindow | null {
  let best: LimitWindow | null = null
  for (const l of limits) {
    if (best == null || l.usedPercent > best.usedPercent) best = l
  }
  return best
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

/** Short reset for tight spaces (bar card): "4d" / "7h" / "12m" / "soon". */
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

const toneFor = (pct: number): 'warn' | 'danger' | null => {
  const t = usageTone(pct)
  return t === 'ok' ? null : t
}

/** One account's windows as thin meters; the tile head names the account and
 * carries its tightest window. Selectable tiles are the overview's drill-in. */
export function UsageTile({
  usage,
  nowSecs,
  onSelect,
}: {
  usage: UsageBarAccount
  nowSecs: number
  onSelect?: (id: string) => void
}) {
  const tight = tightestWindow(usage.limits)
  const tone = usageTone(tight?.usedPercent ?? null)
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
        {tight && (
          <span className={`tui-usage-tile-headline tui-tone-${tone}`}>
            {Math.round(tight.usedPercent)}%
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
          tone={toneFor(l.usedPercent)}
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
  const fold = report ? foldUsageBarState(report) : null
  const subtitle = scanning
    ? 'scanning journals…'
    : active
      ? `${fmtTokens(windowTotal)} tokens · 7 days`
      : fold?.tightest != null
        ? `tightest window ${Math.round(fold.tightest)}% · ${fmtTokens(
            windowTotal,
          )} tokens · 7 days`
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
              emphasis={l.usedPercent >= 80}
              tone={toneFor(l.usedPercent)}
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
