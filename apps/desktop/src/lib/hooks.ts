import { invoke } from '@tauri-apps/api/core'

/**
 * The Claude Code hook adapter scuttlarr owns (hooks.rs): installed to
 * `~/.config/scuttlarr/hooks/claude-status.py`, registered in every Claude
 * config dir's `settings.json`. Rust does the surgery; this is the typed view.
 */

/** Mirrors `HookState` in hooks.rs. */
export type HookState = 'registered' | 'stale' | 'partial' | 'missing'

/** Mirrors `HookAccount` in hooks.rs. */
export interface HookAccount {
  dir: string
  state: HookState
}

/** Mirrors `HooksStatus` in hooks.rs. */
export interface HooksStatus {
  scriptPath: string
  scriptCurrent: boolean
  accounts: HookAccount[]
}

export const hooksStatus = () => invoke<HooksStatus>('hooks_status')
export const hooksInstall = () => invoke<HooksStatus>('hooks_install')

/** Everything is installed and every account runs it — nothing to do. */
export const hooksSettled = (s: HooksStatus) =>
  s.scriptCurrent && s.accounts.every((a) => a.state === 'registered')

export const HOOK_STATE_LABEL: Record<HookState, string> = {
  registered: 'registered',
  stale: 'stale path',
  partial: 'some events',
  missing: 'not registered',
}
