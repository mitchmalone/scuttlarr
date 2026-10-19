import {
  type AwakeStatus,
  needsWatching,
  parseSpec,
} from '@scuttlarr/core/awake'
import {
  Bar,
  type BarSnapshot,
  type BatteryDetail,
  type WidgetAction,
  type WifiDetail,
} from '@scuttlarr/tui'
import '@scuttlarr/tui/bar.css'
// Kit controls inside plugin cards (BarCardControls) — every rule is scoped to `.tui`.
import '@scuttlarr/tui/styles.css'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { awakeWatchTick, freshAwakeMemory } from '../lib/awake'
import type { Config } from '../lib/config'
import { applyTheme } from '../lib/themes'
import { useMergedThemes } from '../lib/user-themes'
import './bar.css'
import { useBarHover } from './hover'
import { barZoneNodes } from './modules'

const EMPTY_THEMES = { themes: {} }

/**
 * The bar window: a thin container around `@scuttlarr/tui`'s bar components.
 *
 * Everything visual — the strip, cells, cards, CSS — lives in the kit, because
 * scuttlarr.com renders the same bar and the website may never hold a second
 * copy (AGENTS invariant 10). What stays here is everything the kit must not
 * know about: Rust snapshot delivery, `invoke` calls and `window.__notched`.
 * Config-driven zone resolution and the module → cell mapping are in
 * `modules.tsx`, which the workbench stories render too.
 */

declare global {
  interface Window {
    /** Rust pushes snapshots here via webview eval (see bar.rs push()). */
    __barPush?: (snap: BarSnapshot) => void
    /** Injected by bar.rs before page scripts: does this display carry a notch? */
    __notched?: boolean
    /** Rust re-announces the notch when this window is re-framed onto another display. */
    __barNotched?: (notched: boolean) => void
  }
}

/** Notchedness starts from the injected flag and follows Rust's `sync` when
 * the window lands on a different display (dock/undock reorders screens). */
function useNotched(): boolean {
  const [notched, setNotched] = useState(window.__notched === true)
  useEffect(() => {
    window.__barNotched = setNotched
    return () => {
      delete window.__barNotched
    }
  }, [])
  return notched
}

/** The bar wears the panel theme and renders module order/toggles from
 * config, following edits live. */
function useBarConfig(): Config | null {
  const [cfg, setCfg] = useState<Config | null>(null)
  // User colors.toml themes: the first paint uses built-ins (fast); this
  // re-applies once the list is known or changes.
  const merged = useMergedThemes(cfg ?? EMPTY_THEMES)
  useEffect(() => {
    if (cfg) applyTheme(cfg.theme, merged, 'panel')
  }, [cfg, merged])
  useEffect(() => {
    const apply = (c: Config) => {
      applyTheme(c.theme, c.themes, 'panel')
      setCfg(c)
    }
    invoke<Config>('read_config').then(apply).catch(console.error)
    const un = listen<Config>('config-changed', (e) => apply(e.payload))
    return () => {
      un.then((f) => f())
    }
  }, [])
  return cfg
}

/**
 * The webview is a pure listener — no JS timers. WKWebView throttles timers in
 * never-focused windows (the bar went stale/blank); Rust pushes a snapshot
 * every second and on trigger events, and event delivery isn't throttled.
 * The clock rides the same 1 Hz push.
 */
function useSnapshot(): [
  BarSnapshot | null,
  Date,
  (update: (prev: BarSnapshot) => BarSnapshot) => void,
] {
  const [snap, setSnap] = useState<BarSnapshot | null>(null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let live = true
    const absorb = (s: BarSnapshot) => {
      if (!live) return
      setNow(new Date())
      setSnap((prev) => ({
        ...s,
        // Sticky focus: a snapshot caught mid-switch reports none — keep
        // showing the last known workspace rather than blinking out.
        focused: s.focused ?? prev?.focused ?? null,
      }))
    }
    // One pull for first paint; everything after arrives by Rust eval-push.
    invoke<BarSnapshot>('bar_snapshot').then(absorb).catch(console.error)
    window.__barPush = absorb
    return () => {
      live = false
      delete window.__barPush
    }
  }, [])
  const patch = (update: (prev: BarSnapshot) => BarSnapshot) =>
    setSnap((prev) => (prev ? update(prev) : prev))
  return [snap, now, patch]
}

/** Wifi detail (IP/router/DNS — what `dns ⏎` shows) spawns `ipconfig` and
 * friends, so it is fetched on hover only, like the battery detail below. */
function useWifiDetail(open: boolean): WifiDetail | null {
  const [detail, setDetail] = useState<WifiDetail | null>(null)
  useEffect(() => {
    if (!open) return
    let live = true
    invoke<WifiDetail>('wifi_status')
      .then((d) => live && setDetail(d))
      .catch(console.error)
    return () => {
      live = false
    }
  }, [open])
  return open ? detail : null
}

/** Battery detail is slow (spawns `ioreg` + `pmset`), so it is fetched on hover
 * only — never on the 1 Hz snapshot path. */
function useBatteryDetail(open: boolean): BatteryDetail | null {
  const [detail, setDetail] = useState<BatteryDetail | null>(null)
  useEffect(() => {
    if (!open) return
    let live = true
    invoke<BatteryDetail>('bar_battery_detail')
      .then((d) => live && setDetail(d))
      .catch(console.error)
    return () => {
      live = false
    }
  }, [open])
  return open ? detail : null
}

/** The holders list is a `pmset` spawn — fetched on card-open only. */
function useAwakeStatus(open: boolean): AwakeStatus | null {
  const [status, setStatus] = useState<AwakeStatus | null>(null)
  useEffect(() => {
    if (!open) return
    let live = true
    invoke<AwakeStatus>('awake_status')
      .then((s) => live && setStatus(s))
      .catch(console.error)
    return () => {
      live = false
    }
  }, [open])
  return open ? status : null
}

function BarWindow() {
  const [snap, now, patch] = useSnapshot()
  const cfg = useBarConfig()
  const notched = useNotched()
  // One owner of the Rust mouse feed for the whole bar — every hoverable cell
  // shares it (see hover.ts).
  const hover = useBarHover()
  const batteryDetail = useBatteryDetail(hover.hovered === 'battery')
  const wifiDetail = useWifiDetail(hover.hovered === 'wifi')
  const awakeStatus = useAwakeStatus(hover.hovered === 'awake')

  // Primary awake-trigger watcher: evaluate on each Rust-pushed snapshot
  // while a conditional session is armed. Costs nothing when idle — the
  // gate below reads the snapshot the push already delivered.
  const awakeMem = useRef(freshAwakeMemory())
  useEffect(() => {
    const a = snap?.awake
    if (!a?.armed || !a.spec) {
      awakeMem.current = freshAwakeMemory()
      return
    }
    const spec = parseSpec(a.spec)
    if (!spec || !needsWatching(spec.until)) return
    awakeWatchTick(awakeMem.current).catch(console.error)
  }, [snap])

  return (
    <Bar
      {...barZoneNodes({
        snap,
        now,
        cfg,
        notched,
        hover,
        batteryDetail,
        wifiDetail,
        awakeStatus,
        actions: {
          switchWorkspace: (ws) => {
            // Optimistic: highlight now, aerospace catches up off the main thread.
            patch((prev) => ({ ...prev, focused: ws }))
            invoke('bar_switch_workspace', { ws }).catch(console.error)
          },
          jumpAgent: (session) =>
            invoke('agent_jump', { session }).catch(console.error),
          openWifiSettings: () =>
            invoke('open_path', { target: 'wifi-settings' }).catch(
              console.error,
            ),
          openBatterySettings: () =>
            invoke('open_path', { target: 'battery-settings' }).catch(
              console.error,
            ),
          releaseAwake: () => invoke('awake_release').catch(console.error),
          // Widget clicks reuse the scripts action runner: open/copy/none.
          runWidgetAction: (action: WidgetAction) =>
            invoke('script_action', { action }).catch(console.error),
        },
      })}
    />
  )
}

createRoot(document.getElementById('root')!).render(<BarWindow />)
