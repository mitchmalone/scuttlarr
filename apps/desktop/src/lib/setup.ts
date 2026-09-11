import { invoke } from '@tauri-apps/api/core'

/** Mirrors `SetupVerb` in src-tauri/src/setup.rs (kebab-case on the wire). */
export type SetupVerb =
  | 'doctor'
  | 'defaults-plan'
  | 'defaults-apply'
  | 'link'
  | 'unlink'
  | 'migrate'
  | 'version'

export type SetupOutput = {
  ok: boolean
  output: string
  base: string
}

/** Run one verb of the bundled setup CLI. Never interactive. */
export function runSetup(verb: SetupVerb): Promise<SetupOutput> {
  return invoke<SetupOutput>('setup_run', { verb })
}
