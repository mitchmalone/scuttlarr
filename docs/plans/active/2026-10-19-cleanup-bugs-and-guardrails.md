---
title: Cleanup pass 1 — confirmed bugs + drift guardrails
status: active
created: 2026-10-19
updated: 2026-10-19
links:
  - STATUS.md (idle-memory miss, 2026-09-16)
  - AGENTS.md invariants 5, 7, 10, 12; Rust standards; definition of done
---

# Cleanup pass 1 — confirmed bugs + drift guardrails

## Goal

Fix the three bugs a 2026-10-19 code-health review confirmed against the source, and add
the cheap tooling that turns today's trusted-by-convention rules into checked ones, so
the clean-up that follows (helpers, god-file splits, memory) can't drift back.
This is steps 1–2 of the review's order. Steps 3–5 (memory shrink, shared helpers +
splits, invariant/docs honesty pass) need product calls from Mitch and are out of scope.

## Context

The review (four parallel reads of Rust, TS, core/theme/setup + tooling, and product/docs)
found ~180 commits since August with 2 refactors. Gate green: 262 Rust, ~600 Vitest.
The bugs below were each re-read in source before this plan was written.

1. **Bar off isn't off (invariant 12).** `bar.rs:331` `push_loop` calls `push` → `snapshot()`
   every second; `snapshot` spawns `aerospace list-workspaces`, reads the front app and
   battery. The visibility check (`bar.rs:353`) runs only after the snapshot is built. The
   support threads (`THREADS_STARTED`, `bar.rs:170`) never stop once the bar has been on:
   `watch` (5 s re-sync), `watch_mouse` (8 Hz), `bar_modules::start` (20 s wifi via
   ipconfig/networksetup), `widgets::start` (1 Hz scheduler + dir watcher). The comment at
   `bar.rs:124` claims they "idle harmlessly" — true of the eval, false of the work.
   `push` is also poked from agents.rs and widgets.rs.
2. **`add_quicklink` can wipe config.json.** `commands.rs:579` parses with
   `unwrap_or_default()`, then writes the result back — a hand-edit typo becomes defaults
   - one link. It is a second writer beside `write_config` (`commands.rs:600`) and
     `config::load_or_create` (`config.rs:418`); none is atomic (plain `fs::write`), and all
     three `unwrap()` the serialisation.
3. **Frontend config writes clobber each other.** Writers: Settings autosave
   (`SettingsApp.tsx:152`, whole object — it is the editor, acceptable),
   `ThemePanelContainer.tsx:47` (spreads a config read **once at mount**),
   `use-appearance-policy.ts:71,108` (spreads a cached `latest.current`). A theme switch
   from the panel can revert anything changed in Settings since the panel opened.
4. **Plugin panels remount every 5 s.** `use-plugins.ts:18` sets a fresh array every poll;
   `App.tsx:186-205` rebuilds `PANELS`, and each plugin entry's `component` is a new inline
   arrow, so `<Active/>` (`App.tsx:914`) is a new component type → unmount/remount (lost
   selection/scroll, PluginPanelHost's own poll restarts). Also re-runs the `panelItems`,
   `triggers` and `rows` memos every 5 s while hidden.

Tooling gaps confirmed:

- `cargo fmt --check` runs only in lefthook pre-commit (skipped from agent shells with
  `LEFTHOOK=0`); not in `verify` or CI.
- No coverage measurement anywhere; "matcher is the most-tested code" is unverified.
- Layer rules (core under tui; www never imports desktop internals; invariant 10) rest on
  one ESLint import pattern in core; nothing checks tui, www or plugins.
- CI never builds `apps/www`, so invariant 7 (static export) is checked only by Vercel.
- The core purity lint bans `setTimeout`/`fetch` but not the clock or randomness
  (`Date.now`, `new Date()`, `Math.random`, `performance`, `crypto`); `lorem.ts:200`
  defaults `rng = Math.random`. `packages/theme/src` claims purity with no lint at all.
- `scripts/*.sh` and `install/install.sh` aren't shellchecked (2 notes in `release.sh`).

## Approach

Three independent streams, each a Sonnet subagent in its own git worktree (no shared
files, so no mid-edit interference with each other's `verify`), each committing to its
own branch. The lead reviews every diff, merges to main, runs the full gate, updates
STATUS + this plan, and pushes.

- **A — Rust (bugs 1, 2).** Gate on `bar::ENABLED`: `push` returns before `snapshot()`
  when off; the 5 s/8 Hz loops skip their work when off; the wifi poll and the widgets
  scheduler skip ticks when off (after confirming widgets feed only the bar — if anything
  else reads `widgets::` state live, gate only the bar-facing part and say so). No thread
  teardown: hidden-not-destroyed stays (JOURNAL 2026-08-16 crash). Add one
  `config::save(&Config)` that serialises (no unwrap) and writes atomically (tmp + rename
  in the same dir); route `write_config`, `add_quicklink` and `load_or_create` through it.
  `add_quicklink` refuses on a parse error (typed `CmdError`, message names the file) —
  never writes defaults over a user file. Pull the "append link to raw config" step into a
  pure, tested function.
- **B — Frontend (bugs 3, 4).** `usePlugins` keeps the previous array when the payload is
  structurally equal. Plugin panel entries get a stable component per id (a module-level
  `PluginPanel` that takes `id` + `settings` via props, or a memoised per-id cache) so the
  component identity never changes while the panel is open. One small
  `lib/config-write.ts` `updateConfig(mutate)`: `read_config` fresh, apply a narrow
  mutation, `write_config`, serialised through a per-window promise queue.
  ThemePanelContainer and use-appearance-policy switch to it with field-level mutations.
  Settings' autosave stays a whole-object write (it is the editor). No new Tauri command —
  a merge-on-Rust `patch_config` would be the full fix but is an IPC addition; recorded
  below as an open question.
- **C — Tooling.** `cargo fmt --check` first in `verify:rust`. `@vitest/coverage-v8` with a
  `verify:coverage` script: thresholds for `packages/core` and `packages/theme` set at
  the measured floor (rounded down), report-only elsewhere. `dependency-cruiser` with a
  `verify:deps` script encoding the layers as they are today (core imports no workspace
  package; theme imports none but core if it does now; tui only core/theme; plugins only
  core/tui/theme; www never `apps/desktop`; nothing imports `apps/*`). The current graph
  must pass, or each violation is listed in the commit for the lead. ESLint: extend the
  core purity block to ban the clock/randomness, and give `packages/theme/src` the same
  purity rules; fix what that flags (inject the rng/clock, matching the "readings arrive
  as parameters" pattern). shellcheck on `scripts/*.sh` + `install/install.sh` as a
  `verify:sh` step, fixing the 2 notes. CI: `pnpm --filter @scuttlarr/www build` in the
  node job; the new verify steps run in CI wherever `verify:node` / `verify:rust` do.

## Steps

- [ ] Plan written and committed (this file)
- [ ] A: bar gating — `push` early-return, loops gated, wifi + widgets scheduler gated
- [ ] A: `config::save` atomic + no-unwrap; three writers routed through it
- [ ] A: `add_quicklink` refuses on parse error; pure append fn + tests
- [ ] A: correct the "idle harmlessly" comment at `bar.rs:124`
- [ ] B: `usePlugins` structural-equality skip
- [ ] B: stable plugin panel component identity; test that it survives a re-poll
- [ ] B: `updateConfig(mutate)` + queue; ThemePanel and appearance policy use it; tests
- [ ] C: `cargo fmt --check` in `verify:rust`
- [ ] C: coverage-v8 + `verify:coverage` with core/theme thresholds (numbers recorded here)
- [ ] C: dependency-cruiser + `verify:deps`
- [ ] C: purity lint for clock/random in core + theme; violations fixed
- [ ] C: shellcheck `verify:sh`; release.sh notes fixed
- [ ] C: CI builds `apps/www`
- [ ] Lead: review each diff, merge, full `pnpm verify` green, CI green
- [ ] Lead: STATUS updated; plan → `done/` in the closing commit
- [ ] Dev-install + hands-check (only once Mitch confirms he's back at the desk — the away
      hold runs in this app; relaunching drops it)

## Acceptance criteria

- [ ] With `bar.enabled` toggled off at runtime, no `aerospace`/`ipconfig`/`networksetup`
      spawn from scuttlarr and no widget ticks run (checked with `ps`/`log` over 30 s)
- [ ] A malformed `config.json` + `add_quicklink` → error surfaced, file byte-identical
- [ ] config writes are tmp+rename; no `unwrap()` on serialisation in config paths
- [ ] An open `usage` panel keeps its selection across a 5 s poll
- [ ] Theme switch from the panel doesn't revert a Settings change made after it opened
- [ ] `pnpm verify` runs fmt-check, coverage thresholds, dependency rules, shellcheck; green
- [ ] CI builds the site; green on main
- [ ] Memory: no process/window/watcher/cache added; bar-off should lower idle work. A
      `scripts/mem.sh` reading is taken at the hands-check, not required for merge

## Out of scope

Idle-memory shrink (needs a target decision); the shared Rust `util` module and frontend
`usePolled`/`useTauriEvent`/`useConfig` hooks; SettingsApp/App splits; the 140
`lock().unwrap()`s and stringly module errors; agents-socket and updates gating when off;
Rust → TS formatting moves; invariant 1/3 rewrites; www demo de-duplication (invariant 10);
knip, fast-check, cargo-deny/machete, gitleaks; STATUS/ROADMAP/PRD rewrite.

## Risks / open questions

- **Full fix for config races is Rust-side merge** (`patch_config(path, value)` or a
  read-modify-write under a mutex). That adds an IPC command → a DECISIONS entry. This
  pass narrows the window instead; Settings vs panel in two webviews can still race in
  the few ms between read and write.
- Gating the widgets scheduler means Settings' widget inventory shows stale status while
  the bar is off. That is "off means off" working as stated.
- Coverage thresholds at today's floor only prevent regressions; raising them is later
  work (matcher property tests).
- Merging: three branches touch disjoint files except possibly `pnpm-lock.yaml` (C only)
  and Prettier reflow; the lead resolves.
