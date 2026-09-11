import {
  type PolicyInputs,
  minutesToNextBoundary,
  resolveAppearance,
} from '@scuttlarr/core/appearance'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useRef } from 'react'

import type { Config } from './config'
import { appearanceOf, policyConfigured } from './theme'

/** Mirrors `AppearanceInputs` in appearance.rs. */
export type AppearanceInputs = {
  focusMode: string | null
  systemDark: boolean
  modes: { id: string; name: string }[]
}

export function appearanceInputs(): Promise<AppearanceInputs> {
  return invoke<AppearanceInputs>('appearance_inputs')
}

const clock = () => {
  const d = new Date()
  return { hour: d.getHours(), minute: d.getMinutes() }
}

/**
 * The policy engine's runtime half, for the one window that lives all session
 * (the panel). Inputs arrive from Rust (`appearance-input`: Focus changed,
 * macOS appearance changed) and from a timer at the next schedule boundary;
 * each time, resolve and — only if the answer differs — write `config.theme`.
 * Everything downstream (windows, borders, the "everywhere" fan-out) already
 * follows a theme change, so this hook has exactly one side effect.
 */
export function useAppearancePolicy(config: Config, loaded: boolean): void {
  const latest = useRef(config)
  latest.current = config
  const inputs = useRef<AppearanceInputs | null>(null)
  const settleRef = useRef<() => void>(() => {})
  // A policy edit in Settings (mode, pair, a Focus mapping) must take effect
  // without waiting for the next Focus/appearance change.
  const policyKey = JSON.stringify(config.appearance ?? null)
  useEffect(() => {
    if (loaded) settleRef.current()
  }, [loaded, policyKey])

  useEffect(() => {
    if (!loaded) return
    let timer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const settle = () => {
      const cfg = latest.current
      if (!policyConfigured(cfg)) return
      const policy = appearanceOf(cfg)
      const seen = inputs.current
      if (!seen) return
      const pin: PolicyInputs = {
        focusMode: seen.focusMode,
        systemDark: seen.systemDark,
        now: clock(),
      }
      const res = resolveAppearance(policy, pin)
      if (res.theme !== cfg.theme) {
        console.warn(
          `[scuttlarr appearance] ${cfg.theme} → ${res.theme} (${res.via}, ${res.by})`,
        )
        invoke('write_config', { config: { ...cfg, theme: res.theme } }).catch(
          (e) => console.error('[scuttlarr appearance] write failed:', e),
        )
      }
      // Re-check at the next schedule boundary (plus a few seconds of slack).
      if (timer) clearTimeout(timer)
      const mins = minutesToNextBoundary(policy, pin.now)
      if (mins !== null) {
        timer = setTimeout(settle, mins * 60_000 + 5_000)
      }
    }

    settleRef.current = settle
    appearanceInputs()
      .then((i) => {
        if (disposed) return
        inputs.current = i
        settle()
      })
      .catch((e) => console.error('[scuttlarr appearance] inputs failed:', e))
    const un = listen<AppearanceInputs>('appearance-input', (e) => {
      inputs.current = e.payload
      settle()
    })
    return () => {
      disposed = true
      settleRef.current = () => {}
      if (timer) clearTimeout(timer)
      un.then((f) => f())
    }
    // `config` is read through the ref: re-subscribing on every settings keystroke
    // would be waste. Policy edits re-settle through `policyKey` above.
  }, [loaded])
}
