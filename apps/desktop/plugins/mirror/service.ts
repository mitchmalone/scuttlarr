/**
 * Journal mirror (docs/PLUGINS.md reference, tick mode): every `interval`
 * seconds, rsync another machine's Codex / Claude Code journals into
 * ~/.local/share/scuttlarr/mirrors/<host>/{codex,claude}/ — the directories
 * usage.rs scans by convention alongside the local ones. The network is the
 * plugin's, over the user's own ssh to their own machine; scuttlarr itself
 * still makes no requests (invariant 2, the widgets carve-out).
 */
import { type Outcome, jobs, rsyncArgs, view } from './model'

if (import.meta.main) {
  const home = process.env.HOME ?? ''
  const host = process.env.MIRROR_HOST?.trim() ?? ''
  const outcomes: Outcome[] = []
  for (const job of jobs(process.env, home)) {
    await Bun.$`mkdir -p ${job.dest}`.quiet()
    const proc = Bun.spawnSync(['rsync', ...rsyncArgs(job)], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const err = proc.stderr.toString().trim().split('\n').at(-1) ?? ''
    outcomes.push({
      provider: job.provider,
      ok: proc.exitCode === 0,
      detail:
        proc.exitCode === 0 ? 'synced' : err || `rsync exit ${proc.exitCode}`,
    })
  }
  process.stdout.write(`${JSON.stringify(view(host, outcomes, new Date()))}\n`)
}
