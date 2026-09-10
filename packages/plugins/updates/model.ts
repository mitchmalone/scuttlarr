import type { CellTone } from '@launcharr/tui'

/**
 * The updates plugin's logic, pure and tested apart from React — the
 * `Model.js` convention `calendar` established, kept here for the same
 * reason: the cell and panel stay presentational and this is what the tests
 * pin. Mirrors `updates.rs`'s `UpdatesReport`; keep the pair adjacent in
 * naming.
 */

export interface UpdatesReport {
  /** Epoch secs of the last completed refresh; 0 = never. */
  generatedAt: number
  /** A refresh is in flight (the cell can show it). */
  refreshing: boolean
  /** Only present sources, in the table order (docs/plans). */
  sources: UpdateSource[]
  /** The panel-owned upgrade run, live or last finished; absent until the first. */
  upgrade?: UpgradeRun | null
}

/** Mirrors `updates.rs`'s `UpgradeRun`. */
export interface UpgradeRun {
  /** Source id, or 'all'. */
  source: UpdateSource['id'] | 'all'
  command: string
  startedAt: number
  /** 0 while running. */
  finishedAt: number
  /** null while running or when killed. */
  exitCode: number | null
  cancelled: boolean
  /** Last lines of stdout+stderr, oldest first. */
  tail: string[]
}

export interface UpdateSource {
  id: 'brew' | 'mas' | 'pnpm' | 'mise'
  label: string
  upgradeCommand: string
  /** Epoch secs; 0 if the first check hasn't finished. */
  checkedAt: number
  /** Last line of stderr / "timed out after 60s"; null when healthy. */
  error: string | null
  /** [] when up to date. */
  items: UpdateItem[]
}

export interface UpdateItem {
  name: string
  installed: string
  available: string
  kind?: 'formula' | 'cask'
}

/** The number of pending updates across every present source. */
export function totalUpdates(report: UpdatesReport): number {
  return report.sources.reduce((sum, s) => sum + s.items.length, 0)
}

/** Whether any source's last check failed. */
export function hasErrors(report: UpdatesReport): boolean {
  return report.sources.some((s) => s.error != null)
}

/**
 * The bar convention (Linux's `apt` indicator): a quiet strip. Hidden while
 * there's no report yet, no refresh has ever completed, or every present
 * source is clean and healthy.
 */
export function cellVisible(report: UpdatesReport | null): boolean {
  if (!report) return false
  if (report.generatedAt === 0) return false
  return report.sources.some((s) => s.items.length > 0 || s.error != null)
}

/** `warn` when any source errored; `normal` otherwise. */
export function cellTone(report: UpdatesReport): CellTone {
  return hasErrors(report) ? 'warn' : 'normal'
}

/** "Homebrew · 3" / "App Store · up to date" / "mise · error: …". */
export function sourceLine(source: UpdateSource): string {
  if (source.error != null) return `${source.label} · error: ${source.error}`
  if (source.items.length === 0) return `${source.label} · up to date`
  return `${source.label} · ${source.items.length}`
}

/** Whether a panel-owned upgrade is in flight. */
export function upgradeRunning(report: UpdatesReport | null): boolean {
  return report?.upgrade != null && report.upgrade.finishedAt === 0
}

/** The label of what a run is upgrading: a source's label, or "everything". */
export function upgradeTarget(report: UpdatesReport, run: UpgradeRun): string {
  if (run.source === 'all') return 'everything'
  return report.sources.find((s) => s.id === run.source)?.label ?? run.source
}

/** "3s" / "1 min 12s" / "2 h 5 min" — a duration in seconds, terse. */
export function duration(secs: number): string {
  const s = Math.max(0, Math.floor(secs))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)} min ${s % 60}s`
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`
}

/**
 * The run's headline: "upgrading Homebrew · 12s" while running, then
 * "Homebrew upgraded · 1 min 3s" / "Homebrew upgrade failed · exit 1" /
 * "Homebrew upgrade cancelled".
 */
export function upgradeLine(
  report: UpdatesReport,
  run: UpgradeRun,
  nowSecs: number,
): string {
  const target = upgradeTarget(report, run)
  if (run.finishedAt === 0) {
    return `upgrading ${target} · ${duration(nowSecs - run.startedAt)}`
  }
  if (run.cancelled) return `${target} upgrade cancelled`
  const took = duration(run.finishedAt - run.startedAt)
  if (run.exitCode === 0) return `${target} upgraded · ${took}`
  const exit = run.exitCode == null ? 'killed' : `exit ${run.exitCode}`
  return `${target} upgrade failed · ${exit}`
}

/** Whether a finished run ended badly — the panel points at `t` (terminal) then. */
export function upgradeFailed(run: UpgradeRun): boolean {
  return run.finishedAt !== 0 && !run.cancelled && run.exitCode !== 0
}

/** "checked just now" / "checked 12 min ago" / "checked 3 h ago" / "never checked". */
export function checkedAgo(generatedAt: number, nowSecs: number): string {
  if (generatedAt === 0) return 'never checked'
  const diff = Math.max(0, nowSecs - generatedAt)
  if (diff < 60) return 'checked just now'
  if (diff < 3600) return `checked ${Math.floor(diff / 60)} min ago`
  return `checked ${Math.floor(diff / 3600)} h ago`
}

/** A row in the flattened, keyboard-selectable panel list. */
export type PanelRow =
  | {
      kind: 'header'
      sourceId: UpdateSource['id']
      label: string
      count: number
      upgradeCommand: string
      selectable: false
    }
  | {
      kind: 'item'
      sourceId: UpdateSource['id']
      name: string
      installed: string
      available: string
      upgradeCommand: string
      selectable: true
    }
  | {
      kind: 'clean'
      sourceId: UpdateSource['id']
      upgradeCommand: string
      selectable: true
    }
  | {
      kind: 'error'
      sourceId: UpdateSource['id']
      error: string
      upgradeCommand: string
      selectable: true
    }

/**
 * Flatten the report's sources into one selectable row list: a
 * non-selectable section header per source, then its items (sorted by
 * name), a single dim "up to date" row for a clean source, or a single
 * danger row for an errored one.
 */
export function panelRows(report: UpdatesReport): PanelRow[] {
  const rows: PanelRow[] = []
  for (const source of report.sources) {
    rows.push({
      kind: 'header',
      sourceId: source.id,
      label: source.label,
      count: source.items.length,
      upgradeCommand: source.upgradeCommand,
      selectable: false,
    })
    if (source.error != null) {
      rows.push({
        kind: 'error',
        sourceId: source.id,
        error: source.error,
        upgradeCommand: source.upgradeCommand,
        selectable: true,
      })
      continue
    }
    if (source.items.length === 0) {
      rows.push({
        kind: 'clean',
        sourceId: source.id,
        upgradeCommand: source.upgradeCommand,
        selectable: true,
      })
      continue
    }
    const sorted = [...source.items].sort((a, b) =>
      a.name.localeCompare(b.name),
    )
    for (const item of sorted) {
      rows.push({
        kind: 'item',
        sourceId: source.id,
        name: item.name,
        installed: item.installed,
        available: item.available,
        upgradeCommand: source.upgradeCommand,
        selectable: true,
      })
    }
  }
  return rows
}
