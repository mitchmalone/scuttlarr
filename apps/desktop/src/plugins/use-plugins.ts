import type { PluginState } from '@launcharr/tui/plugins'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'

/**
 * The plugin list as plugins.rs sees it: one pull on mount, refreshed on the
 * `plugins-changed` event (discovery, install, remove, rebuild) and on a slow
 * poll so build results and service health land in windows that weren't
 * told — an in-memory read Rust-side.
 */
export function usePlugins(pollMs = 5000): PluginState[] {
  const [plugins, setPlugins] = useState<PluginState[]>([])
  useEffect(() => {
    let live = true
    const pull = () =>
      invoke<PluginState[]>('plugins_list')
        .then((p) => live && setPlugins(p))
        .catch(console.error)
    pull()
    const un = listen('plugins-changed', pull)
    const t = window.setInterval(pull, pollMs)
    return () => {
      live = false
      window.clearInterval(t)
      un.then((f) => f())
    }
  }, [pollMs])
  return plugins
}
