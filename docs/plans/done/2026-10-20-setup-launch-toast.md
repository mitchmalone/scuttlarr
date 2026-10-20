---
title: Setup survives a launch toast
status: done
created: 2026-10-20
updated: 2026-10-20
links:
  - plans/done/2026-10-19-first-launch-setup.md
---

# Setup survives a launch toast

## Goal

A fresh install opens setup on the first summon even when something toasts at launch.

## Context

Ticket: "Setup doesn't open on a fresh install." On launch, `power::resume` re-arms a
kept awake hold and, 1.5 s later, `panel::flash` emits `toast` (`src-tauri/src/lib.rs`).
App.tsx's `toast` listener set `panelMode` to `null`, wiping the owed setup that the
`setupPending` effect had just set. Any launch toast did the same. The `panel-shown`
listener already kept setup.

## Approach

Two pure functions in `lib/onboarding.ts`, tested first: `summonedMode` (what
`panel-shown` already did) and `toastedMode`. Under setup a toast keeps setup and drops
the toast row: setup's screen renders no toast, and the toast timer's `hide_panel` would
pull the panel out from under someone mid-setup. The listeners are registered once at
mount, so App reads the live mode through `panelModeRef`.

## Steps

- [x] Failing tests for `summonedMode` / `toastedMode`
- [x] Implement; wire both listeners; `SETUP_PANEL` moves to `lib/onboarding.ts`
- [x] `pnpm verify`
- [ ] Hands-check (below)

## Acceptance criteria

- [ ] With an awake hold armed, five fresh-config launches each open setup on the first
      summon (hands-check pending)
- [x] A toast outside setup still replaces the panel and auto-hides (unit test)
- [x] `pnpm verify` green

## Hands-check

Pending. 2026-10-20: the release `.app` built (`tauri build --bundles app`), but the Mac
Mini's console was locked (`IOConsoleLocked` true), so no UI check ran and the installed
app was left as it was. To run: back up `~/.config/scuttlarr`; install the build to
`~/Applications/scuttlarr.app` (ad-hoc sign, clear quarantine); arm an awake hold; five
times, delete `config.json` and launch: setup opens on the first summon; screenshots in
light and dark; Esc out of setup (don't apply its defaults); restore the config.

## Out of scope

Announcing a resumed hold while setup is owed (the toast is dropped; the awake cell and
panel still show the hold).
