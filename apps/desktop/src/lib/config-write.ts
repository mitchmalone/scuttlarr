import { invoke } from '@tauri-apps/api/core'

import type { Config } from './config'

// Writers in this window queue here so overlapping updates never interleave.
let chain: Promise<unknown> = Promise.resolve()

/**
 * Read-modify-write on config.json: re-reads the file fresh, applies `mutate`
 * to that copy, writes it back. Callers patch fields instead of spreading a
 * config they read earlier, so a Settings autosave (or any other writer) that
 * landed in between is never clobbered. Calls are serialised: a second update
 * sees the first one's write. Resolves with the config that was written.
 */
export function updateConfig(mutate: (c: Config) => Config): Promise<Config> {
  const run = async () => {
    const fresh = await invoke<Config>('read_config')
    const next = mutate(fresh)
    await invoke('write_config', { config: next })
    return next
  }
  const result = chain.then(run, run)
  // A failed write must not poison the queue for the next caller.
  chain = result.catch(() => undefined)
  return result
}
