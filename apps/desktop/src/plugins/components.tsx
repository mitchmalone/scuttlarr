import { FIRST_PARTY } from '@scuttlarr/plugins'
import * as Tui from '@scuttlarr/tui'
import {
  type BarHoverApi,
  type BarWidget,
  BarWidgetCell,
  KeyHints,
  ListRow,
  Panel,
  type WidgetAction,
  type WidgetView,
} from '@scuttlarr/tui'
import type {
  PluginCellComponent,
  PluginCellProps,
  PluginPanelComponent,
  PluginPanelProps,
  PluginState,
} from '@scuttlarr/tui/plugins'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import * as Lucide from 'lucide-react'
import { AlertTriangle } from 'lucide-react'
import * as React from 'react'
import { Component, type ReactNode, useEffect, useMemo, useState } from 'react'
import * as ReactDOM from 'react-dom'
import * as JsxDevRuntime from 'react/jsx-dev-runtime'
import * as JsxRuntime from 'react/jsx-runtime'

import { makeHost } from './host'
import { importPluginModule, registerShared } from './loader'

/**
 * Hosts for plugin UI in the app: resolve a plugin's cell/panel component
 * (first-party from the bundle, third-party through the loader), hand it the
 * contract props, and fence it with an error boundary so a broken plugin
 * paints its own cell red and nothing else changes (docs/PLUGINS.md).
 */

// The app's single React, kit, and icon set — what a built plugin imports.
// Names match plugins.rs SHARED_MODULES. Lucide is shared because a plugin
// dir has no node_modules to resolve it from (and the bar already carries
// lucide's dynamic-icon set for widgets; measured 2026-08-27: no RSS delta).
registerShared({
  react: React,
  'react/jsx-runtime': JsxRuntime,
  'react/jsx-dev-runtime': JsxDevRuntime,
  'react-dom': ReactDOM,
  '@scuttlarr/tui': Tui,
  'lucide-react': Lucide,
})

type Resolved<C> = { component: C | null; error: string | null }

/**
 * The plugin's component for `file`: bundled for first-party, imported from
 * the build dir otherwise. Re-resolves when `builtAt` moves (hot-swap).
 */
function usePluginComponent<C>(
  plugin: PluginState,
  file: 'cell' | 'panel',
): Resolved<C> {
  const bundled = plugin.firstParty ? FIRST_PARTY[plugin.id]?.[file] : undefined
  const has = file === 'cell' ? plugin.hasCell : plugin.hasPanel
  const [resolved, setResolved] = useState<Resolved<C>>({
    component: (bundled as C | undefined) ?? null,
    error: null,
  })
  const wanted = !plugin.firstParty && has ? (plugin.builtAt ?? 0) : null
  useEffect(() => {
    if (wanted === null) return
    if (plugin.buildError) {
      setResolved({ component: null, error: plugin.buildError })
      return
    }
    if (!wanted) {
      setResolved({ component: null, error: null })
      return
    }
    let live = true
    importPluginModule(plugin.id, file, wanted, () =>
      invoke<string>('plugin_module', { id: plugin.id, file }),
    )
      .then((m) => {
        if (!live) return
        const c = m.default
        if (typeof c !== 'function') {
          setResolved({
            component: null,
            error: `${file}.tsx has no default export`,
          })
        } else {
          setResolved({ component: c as C, error: null })
        }
      })
      .catch((e: unknown) => {
        if (live) setResolved({ component: null, error: String(e) })
      })
    return () => {
      live = false
    }
  }, [plugin.id, file, wanted, plugin.buildError, plugin.firstParty])
  if (plugin.firstParty) {
    return { component: (bundled as C | undefined) ?? null, error: null }
  }
  return resolved
}

/** Catches a render-time throw from plugin code; reports it upward. */
class PluginBoundary extends Component<
  {
    onError: (message: string) => void
    resetKey: unknown
    children: ReactNode
  },
  { failed: boolean; key: unknown }
> {
  state = { failed: false, key: this.props.resetKey }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  static getDerivedStateFromProps(
    props: { resetKey: unknown },
    state: { failed: boolean; key: unknown },
  ) {
    // A rebuild (new resetKey) gets a fresh chance.
    return props.resetKey !== state.key
      ? { failed: false, key: props.resetKey }
      : null
  }
  componentDidCatch(error: Error) {
    this.props.onError(error.message || String(error))
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Does the state look like a data-only widget's `WidgetView`? */
function asWidgetView(state: unknown): WidgetView | null {
  if (!state || typeof state !== 'object') return null
  const s = state as Record<string, unknown>
  const keys = ['icon', 'label', 'tone', 'click', 'card', 'setup', 'hidden']
  return keys.some((k) => k in s) ? (s as WidgetView) : null
}

/** A plugin in the generic widget cell's shape — the no-UI and the broken case. */
function asBarWidget(plugin: PluginState, error: string | null): BarWidget {
  return {
    id: plugin.id,
    name: plugin.name,
    zone: plugin.zone,
    icon: plugin.icon,
    view: error ? null : asWidgetView(plugin.state),
    error: error ?? plugin.error,
    lastOk: plugin.lastOk,
    updatedAt: plugin.updatedAt,
    settings: plugin.settings,
    auth: plugin.auth,
    requires: plugin.requires,
    needs: plugin.needs,
  }
}

/**
 * One plugin's bar cell. With `cell.tsx`: the plugin's component. Without:
 * the generic widget cell over the state. On a build/load/render failure:
 * the generic cell in its error tone carrying the message — the plugin
 * paints itself red, the bar stays up.
 */
export function PluginCellHost({
  plugin,
  now,
  hover,
  settings,
  onAction,
}: {
  plugin: PluginState
  now: Date
  hover?: BarHoverApi
  settings: Record<string, string>
  onAction?: (action: WidgetAction) => void
}) {
  const { component: Cell, error: loadError } =
    usePluginComponent<PluginCellComponent>(plugin, 'cell')
  const [renderError, setRenderError] = useState<string | null>(null)
  const host = useMemo(() => makeHost(plugin.id), [plugin.id])
  const error = loadError ?? renderError
  if (error || !Cell) {
    // No cell for a panel-only plugin that isn't broken.
    if (!error && !plugin.kinds.includes('bar-widget')) return null
    if (!error && !plugin.hasService && !plugin.state) return null
    return (
      <BarWidgetCell
        widget={asBarWidget(plugin, error)}
        now={now}
        hover={hover}
        onAction={onAction}
      />
    )
  }
  const props: PluginCellProps = {
    plugin,
    state: plugin.state ?? null,
    settings,
    now,
    hover,
    host,
  }
  return (
    <PluginBoundary onError={setRenderError} resetKey={plugin.builtAt}>
      <Cell {...props} />
    </PluginBoundary>
  )
}

/**
 * One plugin's state while its panel is open: re-pulled the moment the
 * service emits (`plugin-state`, plugins.rs), with a 1 s poll as the floor
 * for health fields that change without a state line.
 */
function useLivePlugin(id: string, initial: PluginState | null) {
  const [plugin, setPlugin] = useState<PluginState | null>(initial)
  useEffect(() => {
    let live = true
    const pull = () =>
      invoke<PluginState | null>('plugin_state', { id })
        .then((p) => live && p && setPlugin(p))
        .catch(console.error)
    pull()
    const un = listen<string>('plugin-state', (e) => {
      if (e.payload === id) pull()
    })
    const t = window.setInterval(pull, 1000)
    return () => {
      live = false
      window.clearInterval(t)
      un.then((f) => f()).catch(console.error)
    }
  }, [id])
  return plugin
}

function PanelNote({
  title,
  note,
  onClose,
}: {
  title: string
  note: string
  onClose: () => void
}) {
  return (
    <Panel
      autoFocus
      icon={<AlertTriangle size={17} strokeWidth={2} aria-hidden />}
      title={title}
      subtitle="plugin"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
      footer={<KeyHints hints={[{ keys: 'esc', label: 'back' }]} />}
    >
      <ListRow dim label={note} />
    </Panel>
  )
}

/**
 * One plugin's `id ⏎` panel: the plugin's component over its live state,
 * or a note when it has no panel, failed to build, or threw.
 */
export function PluginPanelHost({
  id,
  settings,
  onClose,
}: {
  id: string
  settings: Record<string, string>
  onClose: () => void
}) {
  const plugin = useLivePlugin(id, null)
  if (!plugin) return null
  return (
    <PluginPanelBody plugin={plugin} settings={settings} onClose={onClose} />
  )
}

function PluginPanelBody({
  plugin,
  settings,
  onClose,
}: {
  plugin: PluginState
  settings: Record<string, string>
  onClose: () => void
}) {
  const { component: PanelComponent, error: loadError } =
    usePluginComponent<PluginPanelComponent>(plugin, 'panel')
  const [renderError, setRenderError] = useState<string | null>(null)
  const host = useMemo(() => makeHost(plugin.id), [plugin.id])
  const error = loadError ?? renderError
  if (error) {
    return <PanelNote title={plugin.name} note={error} onClose={onClose} />
  }
  if (!PanelComponent) {
    return (
      <PanelNote
        title={plugin.name}
        note={
          plugin.hasPanel
            ? 'building the panel…'
            : 'this plugin has no panel.tsx'
        }
        onClose={onClose}
      />
    )
  }
  const props: PluginPanelProps = {
    plugin,
    state: plugin.state ?? null,
    settings,
    host,
    onClose,
  }
  return (
    <PluginBoundary onError={setRenderError} resetKey={plugin.builtAt}>
      <PanelComponent {...props} />
    </PluginBoundary>
  )
}
