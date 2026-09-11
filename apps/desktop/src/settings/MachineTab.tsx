import { useCallback, useEffect, useState } from 'react'

import type { Config } from '../lib/config'
import { type SetupOutput, type SetupVerb, runSetup } from '../lib/setup'

/**
 * Settings → Machine: the rung above theme (DECISIONS 2026-09-11). Everything
 * here is the bundled setup CLI (`packages/setup`) run with a fixed verb —
 * the tab is a front for `scuttlarr doctor | defaults | link | migrate`, not
 * a second implementation. `remove` stays terminal-only on purpose.
 */

type SetFn = <K extends keyof Config>(key: K, value: Config[K]) => void

export default function MachineTab({
  config,
  set,
}: {
  config: Config
  set: SetFn
}) {
  const machine = config.machine ?? { enabled: false }
  const [busy, setBusy] = useState<SetupVerb | null>(null)
  const [last, setLast] = useState<{
    verb: SetupVerb
    out: SetupOutput
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [planned, setPlanned] = useState(false)

  const run = useCallback(async (verb: SetupVerb) => {
    setBusy(verb)
    setError(null)
    try {
      const out = await runSetup(verb)
      setLast({ verb, out })
      if (verb === 'defaults-plan') setPlanned(out.ok)
      if (verb === 'defaults-apply') setPlanned(false)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }
  }, [])

  // Opening the tab shows the doctor's view first — read-only, cheap.
  useEffect(() => {
    void run('doctor')
  }, [run])

  const enable = (enabled: boolean) => {
    set('machine', { ...machine, enabled })
    if (enabled) void run('link').then(() => run('migrate'))
  }

  return (
    <>
      <p className="hint lead">
        The machine rung: macOS defaults with the shine scraped off, a manifest
        of every file scuttlarr writes outside its own config, adopt never
        overwrite, and a way back. Everything below is the{' '}
        <code>scuttlarr</code> CLI, shipped inside the app.
      </p>

      <label className="check">
        <input
          type="checkbox"
          checked={machine.enabled}
          onChange={(e) => enable(e.target.checked)}
        />
        Enable the machine rung
      </label>
      <p className="hint">
        Puts <code>scuttlarr</code> on your PATH (<code>~/.local/bin</code>,
        recorded in the manifest) and runs pending migrations at every launch.
        Nothing else changes until you apply defaults below.
      </p>

      <div className="buttonrow">
        <button
          className="ghost"
          disabled={busy !== null}
          onClick={() => run('doctor')}
        >
          {busy === 'doctor' ? 'checking…' : 'doctor'}
        </button>
        <button
          className="ghost"
          disabled={busy !== null}
          onClick={() => run('defaults-plan')}
        >
          {busy === 'defaults-plan' ? 'planning…' : 'plan defaults'}
        </button>
        <button
          className="ghost"
          disabled={busy !== null || !planned}
          title={
            planned
              ? 'Apply the plan above (a snapshot is taken first)'
              : 'Plan first — apply only ever follows a plan you have seen'
          }
          onClick={() => run('defaults-apply')}
        >
          {busy === 'defaults-apply' ? 'applying…' : 'apply defaults'}
        </button>
        <button
          className="ghost"
          disabled={busy !== null}
          onClick={() => run(machine.enabled ? 'link' : 'unlink')}
        >
          {machine.enabled ? 'relink CLI' : 'unlink CLI'}
        </button>
      </div>

      {error && <p className="hint error">{error}</p>}
      {last && (
        <>
          <p className="hint tiny">
            <code>scuttlarr {last.verb.replace('-', ' ')}</code>
            {last.out.ok ? '' : ' — exited with an error'} · from{' '}
            <code>{last.out.base}</code>
          </p>
          <pre className="setup-output">{last.out.output || '(no output)'}</pre>
        </>
      )}
      <p className="hint tiny">
        Undo everything: <code>scuttlarr remove</code> in a terminal — it walks
        the manifest in reverse and restores the defaults snapshot. It is not a
        button here on purpose.
      </p>
    </>
  )
}
