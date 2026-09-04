---
title: App updates in the menubar (`updates` plugin)
status: done
created: 2026-09-04
updated: 2026-09-04
links:
  - docs/PLUGINS.md (bundled plugins, native providers)
  - plans/done/plugins-react-cells-and-panels.md
  - plans/done/usage-accounts-and-bar.md (the native-provider precedent)
  - DECISIONS 2026-09-04 (zero-network retired)
---

# App updates in the menubar

## Goal

A bar cell that says "N updates available" across every package manager that has
installed software on this Mac — the `apt` indicator Linux desktops have, for macOS.
Hover for the per-source breakdown, `updates ⏎` for the package list and the upgrade
command per source.

## Context

- The bar is plugin-shaped (DECISIONS 2026-08-27). First-party plugins live in
  `packages/plugins/<id>/` (manifest + `cell.tsx` + `panel.tsx` + `model.ts` + `fixtures.ts`),
  Vite-bundled, state from a Rust **native provider** named by `manifest.native`
  (`plugins.rs::native_state`). `usage` (usage.rs, cached read + background scan) and
  `calendar` (`clock`) are the two existing ones. This is the third.
- Rust owns shell-outs (AGENTS "Rust owns the OS"); the TypeScript half is presentation
  and pure formatting, tested.
- Invariant 10: launcharr.com imports the same cell/panel; a bundled plugin needs a
  fixture (`fixtures.ts`) shaped like the real payload.
- Measured on Mitch's machine 2026-09-04: `brew outdated --json=v2` 1.7 s (refreshes
  brew's API cache itself), `mas outdated` 0.6 s, `pnpm outdated -g --json` 0.2 s,
  `npm outdated -g --json`, `mise outdated --json` — all fast, all JSON except mas.

## Approach

**Bundled plugin `updates`** (`packages/plugins/updates/`, `"native": "updates"`) +
**`updates.rs`** provider, modelled exactly on usage.rs: a cached report, a background
refresh on a long TTL (default **6 h**, plus one at launch), never blocking the 1 Hz
snapshot. Refresh on demand via `touch ~/.config/launcharr/triggers/plugin.updates`
(`poke` learns the Native arm) and `r` in the panel (`host.send({refresh:true})` —
`send()` learns the Native arm: for `updates` it kicks a refresh; anything else is an
error as today). No new Tauri commands.

**Sources (v1)** — a source is "present" when its binary resolves on PATH (the login
shell's PATH, since launcharr is a LaunchAgent-style accessory app: reuse whatever
helper `deps.rs`/`runtime.rs` already use to find `bun`/`aerospace`; mise-shimmed
binaries live in `~/.local/share/mise/shims` and `~/.local/bin`):

| id     | detect | check command             | parse                                                                                                                              | upgrade hint     |
| ------ | ------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `brew` | `brew` | `brew outdated --json=v2` | `formulae[]` + `casks[]`: `name`, `installed_versions[0]`, `current_version`, skip `pinned`                                        | `brew upgrade`   |
| `mas`  | `mas`  | `mas outdated`            | lines `<id> <Name> (<installed> -> <available>)`; empty = none                                                                     | `mas upgrade`    |
| `pnpm` | `pnpm` | `pnpm outdated -g --json` | object keyed by name: `current`, `latest`; `{}` = none; stdout may carry a `[WARN]` line before the JSON — take from the first `{` | `pnpm update -g` |
| `npm`  | `npm`  | `npm outdated -g --json`  | object keyed by name: `current`, `latest` (npm exits 1 when outdated — not an error)                                               | `npm update -g`  |
| `mise` | `mise` | `mise outdated --json`    | object keyed by tool: `current`, `latest`                                                                                          | `mise upgrade`   |

Each source runs in its own thread with a 60 s timeout, all in parallel; a failing source
is **fail-visible** (its `error` string in the report, the cell goes `warn`), never a
blank. Sources whose binary is absent are omitted from the report entirely.

**Wire type** (Rust `UpdatesReport` ↔ TS `UpdatesReport`, camelCase):

```ts
interface UpdatesReport {
  generatedAt: number // epoch secs of the last completed refresh; 0 = never
  refreshing: boolean // a refresh is in flight (cell can show it)
  sources: UpdateSource[] // only present sources, in the table order above
}
interface UpdateSource {
  id: 'brew' | 'mas' | 'pnpm' | 'npm' | 'mise'
  label: string // "Homebrew", "App Store", "pnpm", "npm", "mise"
  upgradeCommand: string // "brew upgrade" …
  checkedAt: number // epoch secs; 0 if the first check hasn't finished
  error: string | null // last line of stderr / "timed out after 60s"
  items: UpdateItem[] // [] when up to date
}
interface UpdateItem {
  name: string
  installed: string
  available: string
  kind?: 'formula' | 'cask'
}
```

**UI** (kit only, `model.ts` pure + tested):

- **Cell** — hidden while every present source is clean and healthy (a quiet strip; the
  Linux convention). Otherwise the lucide `package` glyph (`ICON_PROPS`) + total count;
  tone `fg` when updates exist, `warn` when any source errored. `refreshing` with no
  report yet → hidden.
- **Card** (`BarHoverCell`, id `plugin:updates`) — title "N updates", one line per
  present source ("Homebrew · 3", "App Store · up to date", "npm · error: …"), dim
  "checked 12 min ago", hint "click for the list ⏎". Click → `host.openPanel()`.
- **Panel `updates ⏎`** (aliases `outdated`, `upgrade`, `brew`) — `Panel` with a
  `SectionHeader` per source (label · count · dim upgrade command), a `ListRow` per
  item (`name` left, `installed → available` right, casks/formulae mixed, sorted by
  name), "up to date" dim row for clean sources, error rows in danger tone. Keys:
  `r` refresh (`host.send({refresh:true})`), `c` copy the upgrade command of the
  section the selection is in (`host.copy`), `↑↓` via `useListNav`, `esc` close.
  Footer `KeyHints` + "checked HH:MM".
- **Fixture** `fixtures.ts`: `UPDATES_REPORT` (brew 3 incl. a cask, mas 1, pnpm 0,
  npm error) + `UPDATES_PLUGIN` like `USAGE_PLUGIN`; www demo bar strip and panels
  import it (same pattern as usage).

## Steps

- [x] **A · Rust provider** — `updates.rs` (report cache + background refresh + parsers
      with unit tests on captured output), `plugins.rs` (`FIRST_PARTY` manifest, `native_state`
      arm, Native arms in `poke`/`send`), `lib.rs` mod, launch-time kick. Verify the new
      first-party plugin gets a slot in the bar layout without hand-editing config.
- [x] **B · TS plugin** — `packages/plugins/updates/{manifest.json,model.ts,model.test.ts,cell.tsx,panel.tsx,fixtures.ts}`,
      `packages/plugins/index.ts` + `package.json` exports, `apps/www` demo imports.
- [x] **C · Integrate + prove live** — `pnpm verify`; `tauri build --bundles app`,
      `pkill launcharr`, relaunch; log shows the refresh; cell shows real counts (this
      machine has brew, mas, npm, mise updates today); `touch triggers/plugin.updates`
      refreshes; `updates ⏎` lists them; `r`/`c` work. Idle RSS noted.
- [x] **D · Docs** — DECISIONS 2026-09-04 (network stance), PLUGINS.md bundled list,
      STATUS.md cursor, JOURNAL gotchas, this plan → `done/`, one commit with the code.

## Acceptance criteria

- [x] `pnpm verify` green (typecheck, lint, format, Vitest incl. new model tests, cargo
      test incl. parser tests, clippy `-D warnings`).
- [x] Cell appears with the right total on this machine; hidden when everything is clean
      (prove with a fixture story or by temporarily returning empty).
- [x] A source that fails (e.g. `PATH` without `mas`) is omitted; one that errors shows
      `warn` + the error in card and panel; the others still report.
- [x] Refresh never runs on the snapshot thread; the strip stays at 1 Hz during a check.
- [x] Bundled plugin renders from `fixtures.ts` on launcharr.com's demo (invariant 10).
- [x] No new Tauri commands (invariant 3).

## Out of scope

- Running the upgrade from launcharr (copy the command; bang mode already flings it).
- `softwareupdate -l` (macOS updates: 10–30 s, and it phones Apple every time),
  `rustup check`, `cargo install-update`, `uv tool`, `gem outdated`, `go` — later
  sources; the source table is designed to grow one row at a time.
- Per-source on/off settings, interval setting in Settings — config key
  `updates.intervalSecs` is fine if it falls out cheaply, no UI for it in v1.
- Notifications.

## Risks / open questions

- Network: no constraint (zero-network retired, DECISIONS 2026-09-04). The plugin ships on.
- `brew outdated` refreshes brew's JSON API cache (its own 450 s auto-update window);
  this is what makes the answer fresh without `brew update`. Git-based taps still need a
  `brew update` to notice new versions — accepted.
- PATH inside the accessory app: brew/mas are under `/opt/homebrew/bin`; pnpm under
  `~/.local/bin`; npm under mise. Resolve via the login shell PATH helper the app
  already has, or fall back to a known-dirs list — never hardcode a user path.
- Memory: five short-lived child processes every 6 h — nothing resident. Note RSS anyway.

## Receipts (2026-09-04)

- `pnpm verify` green: 187 cargo tests (10 new parser/timeout tests), 26 new Vitest model
  tests, clippy `-D warnings` clean.
- Live on Mitch's machine after `tauri build --bundles app` + relaunch: cell reads **7**;
  independently counted brew 4 · mas 0 · pnpm 0 · npm 2 · mise 1 = 7. Layout slot
  `plugin:updates` adopted into the right zone automatically (`normalizeBarZones` appends
  unseen plugin ids to their manifest zone — no config edit).
- RSS 189 MB right after the first relaunch, 170 MB after the second, five plugins on; the
  plugins-era watch item (STATUS) stands — not attributable to this plugin, which holds
  nothing resident between refreshes.
- Kit gap: `ListRow` has no danger tone — error rows in `updates ⏎` are plain text.
- Hands-check pending: hover card, `updates ⏎` keys (`r`, `c`), "hidden when clean".

## Follow-up 2026-09-04

Added the missing "actually run the upgrade" action, keeping the IPC surface unchanged
(no new Tauri commands — `host.send` → `plugins.rs::native_send`, same route as `refresh`):

- `updates.rs::upgrade_command(source)`: looks up a source's `upgrade_command` from
  `SOURCES`, or for `"all"` joins every _present_ source's command (binary locates) with
  `&&` in table order; `None` for an unknown id. Unit-tested (known id, unknown id,
  and the `all` join mirrored against `locate`).
- `plugins.rs::native_send` gained `{"upgrade":"<sourceId>|all"}`: resolves the command,
  hands it to `terminal::run` exactly like `commands.rs::run_bang` does (same
  `effective_terminal` + `bang_new_window` new-window/tab behaviour), and drops a
  `updates: upgrade <id> → <terminal>` logbook breadcrumb. `send`/`plugin_send` now
  thread `Config` through so the native handler can reach `terminal`/`bang_new_window`
  without a new command. Unknown source → `Err`.
- `updates ⏎`: Enter on any row (item/clean/error) sends `{upgrade: row.sourceId}` and
  closes the panel; `a` sends `{upgrade: 'all'}` and closes; `c` still copies the
  upgrade command; footer hints updated (`↵ upgrade`, `a upgrade all`, `c copy command`,
  `r refresh`, `esc back`). `model.ts`'s `PanelRow` already carried `sourceId` on every
  row kind, so no model change was needed.
- Diagnosis aid: `commands.rs::open_panel` now drops a
  `panel: open_panel <id>` breadcrumb so a bar-cell click is visible in
  `~/Library/Logs/launcharr.log` even when nothing visibly happens. Investigated the
  full click path (bar's `BarHoverCell` → `host.openPanel()` → `open_panel` →
  `panel::show` + `open-panel` emit → `App.tsx`'s `panel-shown`/`open-panel` listeners)
  against the working battery/wifi cells (`invoke('open_path', …)` — a single in-window
  command, no cross-webview event hand-off) — no definite bug found, so no behaviour
  change beyond the breadcrumb; see the session notes for the full citation trail.
