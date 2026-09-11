/**
 * The mirror plugin's pure half (docs/PLUGINS.md): what to sync and what the
 * cell says about it. rsync itself lives in service.ts.
 */
import type { WidgetView } from '@scuttlarr/tui/bar/types'

export interface MirrorJob {
  /** ssh host alias. */
  host: string
  /** `codex` | `claude` — the mirror dir scuttlarr's usage scan looks for. */
  provider: 'codex' | 'claude'
  /** Remote path, relative to the remote home unless absolute. */
  remote: string
  /** Local destination: ~/.local/share/scuttlarr/mirrors/<host>/<provider>/ */
  dest: string
}

export function jobs(
  env: Record<string, string | undefined>,
  home: string,
): MirrorJob[] {
  const host = env.MIRROR_HOST?.trim()
  if (!host) return []
  const base = `${home}/.local/share/scuttlarr/mirrors/${host}`
  return [
    {
      host,
      provider: 'codex',
      remote: env.MIRROR_CODEX?.trim() || '.codex/sessions',
      dest: `${base}/codex/`,
    },
    {
      host,
      provider: 'claude',
      remote: env.MIRROR_CLAUDE?.trim() || '.claude/projects',
      dest: `${base}/claude/`,
    },
  ]
}

/** `rsync` argv for one job — archive, delete, only journals, batch ssh. */
export function rsyncArgs(job: MirrorJob): string[] {
  return [
    '-az',
    '--delete',
    '--include=*/',
    '--include=*.jsonl',
    '--exclude=*',
    '-e',
    'ssh -o BatchMode=yes -o ConnectTimeout=10',
    `${job.host}:${job.remote}/`,
    job.dest,
  ]
}

export interface Outcome {
  provider: string
  ok: boolean
  detail: string
}

/**
 * Hidden while every sync succeeds — a healthy mirror has nothing to say in
 * the strip. A failure paints the cell with the host and the rsync tail.
 */
export function view(host: string, outcomes: Outcome[], at: Date): WidgetView {
  const failed = outcomes.filter((o) => !o.ok)
  if (failed.length === 0) return { hidden: true }
  return {
    icon: 'refresh-cw-off',
    tone: 'error',
    label: String(failed.length),
    card: {
      title: `Mirror · ${host}`,
      subtitle: `${failed.length} of ${outcomes.length} syncs failed · ${at.toLocaleTimeString()}`,
      rows: outcomes.map((o) => ({
        dot: o.ok ? 'ok' : 'error',
        text: o.provider,
        hint: o.detail,
      })),
      hint: 'ssh -o BatchMode=yes <host> true — then restart the plugin',
    },
  }
}
