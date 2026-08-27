---
title: Plugins — cells and panels as React, service in Bun
status: done
created: 2026-08-27
updated: 2026-08-27
links:
  - ../../ROADMAP.md (v0.5 — plugins)
  - ../../DECISIONS.md (2026-08-27 · Plugins are code; 2026-08-19 · widgets are data — superseded)
  - ../../WIDGETS.md (the data-only contract this extends; stays valid as the no-UI case)
  - ../done/widgets.md, ../done/widget-settings.md, ../done/usage-accounts-and-bar.md
---

# Plugins — cells and panels as React, service in Bun

## Goal

A plugin can own its bar cell and its panel as React components built on
`@launcharr/tui`, fed by a long-lived Bun service — instead of squeezing everything
through the data-only `tick` JSON. First-party panels move onto the same API so it is
dogfooded, and third-party plugins get exactly what we use. Widgets with no UI files keep
working unchanged.

## Context

- **What exists.** `docs/WIDGETS.md`: an executable answers `manifest` / `tick` with JSON;
  Rust `widgets.rs` runs ticks on a schedule under `runtime.rs` (Bun, Node fallback) and
  ships the last view in `BarSnapshot.widgets`; one generic `BarWidgetCell` /
  `BarWidgetCard` in `packages/tui` renders every widget. Settings/secrets/auth are
  manifest-declared (`widget_secret_*`, `widget_auth*` commands). Scripts (`docs/SCRIPTS.md`)
  are the same shape pointed at the launcher (`trigger` / `query`).
- **The ceiling.** The card is a title + dot-rows. Anything richer — the usage meters, a
  month grid, a chart — is a hand-written first-party panel in `apps/desktop/src/panels/`
  (`*Panel.tsx` + `*PanelContainer.tsx`, listed in `panels/registry.ts` and the component
  map in `App.tsx`). Every new need becomes a launcharr PR.
- **Why now.** The Omarchy Quattro plugin model was studied (DECISIONS 2026-08-27,
  "Omarchy plugins on macOS: rejected"): a plugin is `manifest.json` + UI files on a shared
  component library (`qs.Ui`) + OS primitives (`Process`, `FileView`, `IpcHandler`), and
  first-party panels are plugins too. Their runtime is Qt/Quickshell; ours is WKWebView +
  React + `@launcharr/tui`. Same shape, no runtime to add. The only thing in the way is
  the "widgets are data, never code" rule, which Mitch has called overstated (2026-08-27).
- **Usage as the proving case.** `UsagePanel` just moved into `@launcharr/tui`
  (plans/done/usage-accounts-and-bar.md) with `BarUsageCell` in the bar and
  `UsagePanelContainer` doing the wiring — a cell + panel + data feed, already split the
  way a plugin would be. It becomes the first plugin under `apps/desktop/plugins/`.

## Approach

A plugin is a directory (git-cloneable), progressive from today's widget:

```
~/.config/launcharr/plugins/<id>/     (first-party: apps/desktop/plugins/<id>/)
  manifest.json    id, name, version, kinds, settings, requires, auth  (today's widget manifest + kinds)
  service.ts       optional · long-lived Bun process; prints JSON lines = state events
  cell.tsx         optional · bar cell; default: generic BarWidgetCell over the state
  panel.tsx        optional · hover card / dropdown / `id ⏎` panel; default: generic card
  model.ts         plain logic, Vitest-tested (Omarchy's Model.js convention)
```

**Two runtimes, one rule each.**

- **Logic runs out of the webview, in Bun.** `service.ts` is kept alive by Rust (today's
  `widgets.rs` thread model, minus the schedule); each stdout JSON line replaces the
  plugin's state and is pushed with the bar snapshot. A `tick`-style widget is the
  degenerate case — the host wraps `tick` output as a state event every `interval`
  seconds, so `docs/WIDGETS.md` files run unmodified. Shell-outs, file watches, network,
  credentials live here and only here (invariant 2 carve-out unchanged: still the
  plugin's requests, not launcharr's).
- **UI runs in the webview as React.** `cell.tsx` / `panel.tsx` default-export components
  receiving `{ state, settings, host }`; they import from `@launcharr/tui` and
  `@launcharr/core` only. `host` is the Quickshell-primitives equivalent and stays tiny:
  `open(url)`, `copy(text)`, `send(msg)` (→ the service's stdin), `openPanel(id)`. No
  direct Tauri `invoke` from plugin code.

**Loader.** On install/change, Rust runs `bun build` (external: react, `@launcharr/*`) to
ESM under `~/.config/launcharr/.build/<id>/`, served over a custom `launcharr-plugin://`
URI scheme so the webview can `import()` it; the tui package and React are provided via an
import map so plugins share the app's single React instance. Bun is already the widget
runtime, so no new dependency; Node-only users get the generic cell (no `.tsx` support —
say so in Settings).

**Kinds** (Omarchy's vocabulary, mapped onto what launcharr has):

- `bar-widget` — cell + panel (this plan)
- `service` — background Bun process, no UI
- `command` — today's scripts: `trigger` + `query`; a plugin may carry both a cell and a
  trigger (`usage ⏎` opens its panel)
- `panel` — an `id ⏎` panel with no cell (later: overlays/pickers on `useListNav`/`useGridNav`)

**Styling.** Components and theme tokens only. No plugin CSS in v1; if allowed later, the
loader scopes it under `[data-plugin=<id>]`.

**Trust.** Plugins are code (same posture as Omarchy, Raycast, VS Code): installing a git
URL runs it. Same-origin in the webview, gated by the `host` API surface rather than an
iframe — cells must be cheap, and an iframe per cell is not. Revisit iframe isolation only
if a real need appears.

**Site.** A plugin's `cell.tsx`/`panel.tsx` renders on launcharr.com with a fixture `state`
and a no-op `host` — invariant 10 holds, and improves: Omarchy structurally cannot demo a
plugin in a browser. Plugin READMEs can embed a live cell.

Alternatives rejected: a richer declarative layout JSON (a worse React with a schema we
maintain forever — the ceiling we're at now); Web Components / a second component system
(`@launcharr/tui` is the library, and plugins looking native depends on it being the only
option); Qt/Quickshell on macOS (DECISIONS 2026-08-27).

## Outcome (2026-08-27)

A–F built in one session, verified live (`~/Library/Logs/launcharr.log`: `3 plugin(s):
usage, calendar, hello → hello: built → service started → first state → webview loaded
cell.js`; an edit to `cell.tsx` rebuilt and hot-swapped within the second). Deviations:

- **D — usage's service stayed Rust.** `usage.rs` (journal scan, keychain, limit fetch)
  is now the `usage` _native provider_ behind `manifest.native`; the plugin's `cell.tsx`
  and `panel.tsx` are the real contract surface and the website imports them. Rewriting
  1,400 lines of just-shipped Rust into a Bun service for purity would have been
  regression for nothing (DECISIONS 2026-08-27, host API entry). The service side of the
  contract is proven by the reference `hello` plugin and by legacy tick widgets.
- **Loader is blob-URL shims, not a URI scheme + import map** — fewer moving parts, unit-
  testable halves, proved in WebKit before the app.
- **lucide is shared** (a plugin dir has no `node_modules`); it was suspected of the
  memory rise and cleared by measurement. Memory numbers in STATUS.
- **G is rolling**, not done: awake/agents/wifi/audio/battery migrate as touched.
- **No `launcharr plugin add` CLI** — `git clone` into the plugins dir _is_ the CLI (the
  watcher picks it up); Settings has the URL field.

## Steps

Slices, each shippable; the plan stays `active` only for the slice in flight.

- [x] **A — Contract.** Write `docs/PLUGINS.md`: directory shape, manifest (`kinds`,
      `schemaVersion: 1`, existing widget fields), state-event protocol for `service.ts`,
      the `cell.tsx`/`panel.tsx` props, the `host` API, the rules (tui-only imports, no
      CSS, no invoke). `docs/WIDGETS.md` becomes "the no-UI plugin" and links here. Record
      the host API in DECISIONS (invariant 3: every host call is an IPC command).
- [x] **B — Service runtime.** `plugins.rs` (grows out of `widgets.rs`): discover
      `plugins/<id>/manifest.json`, keep `service.ts` alive with restart backoff, parse JSON
      lines into per-plugin state, push via the bar snapshot; wrap legacy `tick` widgets as
      services. Stdin channel for `host.send`. Tests: manifest parse, line framing, backoff,
      legacy wrap.
- [x] **C — Loader.** `bun build` on install/change → `.build/<id>/{cell,panel}.js`;
      `launcharr-plugin://` scheme in Tauri; import map for `react`, `react/jsx-runtime`,
      `@launcharr/tui`, `@launcharr/core`; `PluginCell`/`PluginPanel` wrappers with an error
      boundary (a throwing plugin paints its cell red with the message, never breaks the
      bar). Measure: idle memory before/after with three plugins loaded (118 MB of a 120 MB
      budget today — this slice is where it moves).
- [x] **D — Usage becomes a plugin** (UI; state stays native — see Outcome). `apps/desktop/plugins/usage/`: `service.ts` (the
      account discovery + limit fetch, moved out of `usage.rs` where it is plain logic;
      what must stay Rust — keychain reads — stays behind a host call), `cell.tsx`
      (`BarUsageCell`), `panel.tsx` (`UsagePanel`), `model.ts` + tests. Delete
      `UsagePanelContainer.tsx` and the `usage` special-cases in `bar/main.tsx` and
      `App.tsx`. Site demo imports the plugin's cell/panel with fixture state.
- [x] **E — Settings + install.** Settings → Menubar → Custom widgets becomes Plugins:
      install from git URL / file, enable/disable, per-plugin settings from the manifest
      (already built for widgets), health (last event, restarts, build errors). `launcharr
plugin add <git-url>` in `scripts/` mirrors it for the terminal.
- [x] **F — Dev loop.** `dev` plugin dir watch → rebuild → hot-swap the module; a
      `plugins ⏎` gallery panel showing every plugin's cell and panel in every theme
      (Omarchy's `dev-gallery`). Reference third-party plugin in `apps/desktop/plugins/`
      (calendar month grid on `@launcharr/tui` `Calendar` is the obvious one — it is the
      example the data-only contract cannot express).
- [ ] **G — Migrate the rest** (rolling). Each `apps/desktop/src/panels/*Panel*` that is a cell +
      panel + feed (awake, agents, wifi, audio, battery…) moves to `apps/desktop/plugins/`
      one at a time as touched; `panels/registry.ts` reads plugin manifests. Not a big-bang.

## Acceptance criteria

- [x] A directory with `manifest.json` + `cell.tsx` + `service.ts` dropped into
      `~/.config/launcharr/plugins/` shows its cell in the bar, no restart.
- [x] Every `docs/WIDGETS.md` reference widget runs unmodified through the service wrapper.
- [x] Usage is a plugin; no `usage` special-case remains in `bar/main.tsx` / `App.tsx`;
      the site demo renders the plugin's cell and panel from fixture state.
- [x] A plugin that throws on render or emits bad JSON paints its own cell red and nothing
      else changes.
- [ ] Idle memory with usage + two reference plugins loaded ≤ 120 MB; summon and keystroke
      budgets unchanged (numbers in this file).
- [x] `pnpm verify` green; `docs/PLUGINS.md` is the single source for the contract.

## Out of scope

- Plugin CSS, iframe sandboxing, a hosted registry (a curated static JSON index in
  `apps/www` comes with slice E at most), overlays/pickers (`panel` kind beyond `id ⏎`),
  Node-only users getting `.tsx` plugins, running Omarchy QML plugins (rejected).

## Risks / open questions

- **React as a public API.** `@launcharr/tui` bumps can break plugins. Semver the package,
  `schemaVersion` in the manifest, and the gallery to see breakage before release.
- **Memory.** Loaded plugin modules and their component trees are resident while the bar
  is. Slice C measures before D commits; if three plugins push past 120 MB, the fix is lazy
  panel modules (cell resident, panel imported on hover), not a smaller plugin API.
- **What stays Rust.** Keychain, AppKit, process launch — a plugin reaches them only via a
  host call, and every host call is a recorded IPC command. If usage's service needs more
  than `keychain read`, that's the signal the host API is too small, decided in slice D.
- **Two-process debugging.** A service's stderr should land in `logbook` per plugin, not be
  ignored as scripts' is today.
