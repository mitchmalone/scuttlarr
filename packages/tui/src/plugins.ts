import type { ComponentType } from 'react'

import type {
  BarHoverApi,
  WidgetAuth,
  WidgetRequire,
  WidgetSetting,
} from './bar/types'

/**
 * The plugin contract (docs/PLUGINS.md, DECISIONS 2026-08-27): what a plugin's
 * `cell.tsx` and `panel.tsx` receive, and what the app tells everyone about a
 * plugin. Pure types — this entry point has no React barrel behind it, so a
 * plugin's `import type` from `@launcharr/tui/plugins` costs nothing at run
 * time and the website's server components can read the same shapes.
 *
 * These mirror plugins.rs; keep the pairs adjacent in naming.
 */

/** Mirrors PanelMeta in plugins.rs — how `panel.tsx` joins the launcher. */
export interface PluginPanelMeta {
  title?: string | null
  hint?: string | null
  triggers?: string[]
  aliases?: string[]
}

/** `manifest.json` (mirrors PluginManifest in plugins.rs). */
export interface PluginManifest {
  schemaVersion?: number
  id: string
  name?: string
  version?: string
  description?: string
  /** `bar-widget` | `panel` | `service`. */
  kinds?: string[]
  zone?: 'left' | 'center' | 'right'
  /** lucide icon name (kebab-case). */
  icon?: string
  /** Present → tick mode (`service tick` every N seconds); absent → stream. */
  interval?: number
  timeout?: number
  settings?: WidgetSetting[]
  auth?: WidgetAuth
  requires?: WidgetRequire[]
  panel?: PluginPanelMeta
  /** First-party only: the Rust state provider. */
  native?: string
}

/** Mirrors PluginState in plugins.rs — a plugin as every surface sees it. */
export interface PluginState {
  id: string
  name: string
  version: string
  description: string
  kinds: string[]
  zone: string
  icon: string | null
  /** Bundled with the app: UI static, state from a Rust provider. */
  firstParty: boolean
  enabled: boolean
  hasCell: boolean
  hasPanel: boolean
  hasService: boolean
  interval: number | null
  /** Epoch seconds of the last `bun build` — the loader's cache key. */
  builtAt: number | null
  buildError: string | null
  /** The last state the service emitted; shape is the plugin's own. */
  state: unknown
  error: string | null
  lastOk: number | null
  updatedAt: number | null
  restarts: number
  running: boolean
  settings?: WidgetSetting[]
  auth?: WidgetAuth | null
  requires?: WidgetRequire[]
  needs?: string[]
  panel: PluginPanelMeta | null
}

/**
 * What plugin UI may ask the app to do — the whole surface, on purpose
 * (AGENTS invariant 3). No `invoke`, no filesystem, no network: those live in
 * the plugin's service, out of the webview.
 */
export interface PluginHost {
  /** URL, file, or app via `open`. */
  open: (target: string) => void
  copy: (text: string) => void
  /** One JSON line on the service's stdin (stream services only). */
  send: (message: unknown) => void
  /** Summon a panel — this plugin's by default. */
  openPanel: (id?: string) => void
}

export interface PluginCellProps<S = unknown> {
  plugin: PluginState
  /** The service's latest state, or null before the first one. */
  state: S | null
  /** Plain settings the manifest declared, as the user set them. */
  settings: Record<string, string>
  /** The bar's 1 Hz clock. */
  now: Date
  /** Hover feed for a cell that opens a card; absent where there is none
   * (the gallery, a static render). */
  hover?: BarHoverApi
  host: PluginHost
}

export interface PluginPanelProps<S = unknown> {
  plugin: PluginState
  state: S | null
  settings: Record<string, string>
  host: PluginHost
  onClose: () => void
}

export type PluginCellComponent<S = unknown> = ComponentType<PluginCellProps<S>>
export type PluginPanelComponent<S = unknown> = ComponentType<
  PluginPanelProps<S>
>

/** A host that does nothing — fixtures, stories, the website. */
export const NOOP_HOST: PluginHost = {
  open: () => {},
  copy: () => {},
  send: () => {},
  openPanel: () => {},
}

/** Layout slot for a plugin's cell (`bar.layout` records module ids). */
export const pluginModuleId = (id: string) => `plugin:${id}`
export const isPluginModuleId = (id: string) => id.startsWith('plugin:')
export const pluginIdOf = (moduleId: string) =>
  isPluginModuleId(moduleId) ? moduleId.slice('plugin:'.length) : null

/** Row copy for a plugin's panel: manifest `panel` first, plugin name else. */
export function pluginPanelInfo(p: PluginState): {
  id: string
  title: string
  hint: string
  triggers: string[]
  aliases: string[]
} | null {
  if (!p.kinds.includes('panel') && !p.hasPanel) return null
  return {
    id: p.id,
    title: p.panel?.title || p.name,
    hint: p.panel?.hint || `${p.name.toLowerCase()} ▸`,
    triggers: p.panel?.triggers ?? [],
    aliases: p.panel?.aliases ?? [],
  }
}
