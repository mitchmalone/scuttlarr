/**
 * Loads a third-party plugin's built `cell.js` / `panel.js` into the webview.
 *
 * Rust builds each plugin with `bun build --external <shared>` (plugins.rs),
 * so the output still says `import { useState } from "react"` and
 * `import { BarCell } from "@scuttlarr/tui"`. Those must resolve to the
 * *app's* React and kit — a second React instance breaks hooks; a second kit
 * breaks theming — and a Vite-bundled app has no bare `react` to offer. So:
 *
 * 1. the app registers its own module namespaces under
 *    `globalThis.__scuttlarrShared` (`registerShared`),
 * 2. each shared name gets a tiny generated ESM shim that re-exports from
 *    that global, served as a blob: URL,
 * 3. the plugin's source has its shared specifiers rewritten to those blob
 *    URLs (`rewriteImports`) and is itself imported as a blob: URL.
 *
 * No custom protocol, no import map, no CSP change: everything is an
 * ordinary `import()` of a blob. The pure halves are unit-tested; the
 * `import()` itself is proven in the app.
 */

declare global {
  var __scuttlarrShared: Record<string, object> | undefined
}

const IDENT = /^[A-Za-z_$][\w$]*$/

/** Make the app's module namespaces reachable from generated shims. */
export function registerShared(modules: Record<string, object>) {
  globalThis.__scuttlarrShared = {
    ...(globalThis.__scuttlarrShared ?? {}),
    ...modules,
  }
}

/**
 * An ESM module that re-exports `globalThis.__scuttlarrShared[name]` under
 * every export name the real module has — static `export const` per name, as
 * ESM demands, generated from the namespace at run time.
 */
export function shimSource(name: string, exportNames: string[]): string {
  const key = JSON.stringify(name)
  const lines = [
    `const m = globalThis.__scuttlarrShared?.[${key}];`,
    `if (!m) throw new Error("scuttlarr: shared module " + ${key} + " is not registered");`,
    `export default ("default" in m ? m.default : m);`,
  ]
  for (const n of exportNames) {
    if (n === 'default' || !IDENT.test(n)) continue
    lines.push(`export const ${n} = m[${JSON.stringify(n)}];`)
  }
  return lines.join('\n')
}

/**
 * Rewrite `from "spec"`, `import "spec"`, and `import("spec")` for every
 * specifier `resolve` knows; everything else is left alone (bun bundled it).
 */
export function rewriteImports(
  source: string,
  resolve: (spec: string) => string | undefined,
): string {
  return source.replace(
    /(\bfrom\s*|\bimport\s*\(?\s*)(["'])([^"'\n]+)\2/g,
    (whole, lead: string, quote: string, spec: string) => {
      const url = resolve(spec)
      return url ? `${lead}${quote}${url}${quote}` : whole
    },
  )
}

const shimUrls = new Map<string, string>()

/** The blob: URL of `name`'s shim, generated once per session. */
function shimUrl(name: string): string | undefined {
  const cached = shimUrls.get(name)
  if (cached) return cached
  const mod = globalThis.__scuttlarrShared?.[name]
  if (!mod) return undefined
  const url = URL.createObjectURL(
    new Blob([shimSource(name, Object.keys(mod))], {
      type: 'text/javascript',
    }),
  )
  shimUrls.set(name, url)
  return url
}

export interface LoadedModule {
  default?: unknown
  [key: string]: unknown
}

interface CacheEntry {
  builtAt: number
  url: string
  promise: Promise<LoadedModule>
}

const modules = new Map<string, CacheEntry>()

/**
 * Import a plugin module from its built source. `builtAt` is the cache key:
 * a rebuild (source edit) yields a fresh blob and a fresh import, so the
 * cell/panel hot-swaps without a restart.
 */
export function importPluginModule(
  id: string,
  file: 'cell' | 'panel',
  builtAt: number,
  fetchSource: () => Promise<string>,
): Promise<LoadedModule> {
  const key = `${id}/${file}`
  const hit = modules.get(key)
  if (hit && hit.builtAt === builtAt) return hit.promise
  if (hit) URL.revokeObjectURL(hit.url)
  let url = ''
  const promise = fetchSource().then((source) => {
    const rewritten = rewriteImports(source, shimUrl)
    url = URL.createObjectURL(
      new Blob([rewritten], { type: 'text/javascript' }),
    )
    const entry = modules.get(key)
    if (entry) entry.url = url
    return import(/* @vite-ignore */ url) as Promise<LoadedModule>
  })
  modules.set(key, { builtAt, url, promise })
  return promise
}

/** Forget a plugin's modules (removed plugin). */
export function forgetPluginModules(id: string) {
  for (const file of ['cell', 'panel'] as const) {
    const key = `${id}/${file}`
    const hit = modules.get(key)
    if (hit) {
      URL.revokeObjectURL(hit.url)
      modules.delete(key)
    }
  }
}
