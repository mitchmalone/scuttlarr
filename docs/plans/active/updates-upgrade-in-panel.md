---
title: Updates: upgrade from the panel, terminal hand-off fixed
status: active
created: 2026-09-10
updated: 2026-09-10
links:
  - ../done/app-updates-plugin.md
  - ../../JOURNAL.md (2026-09-10 entries)
---

# Updates: upgrade from the panel, terminal hand-off fixed

## Goal

`updates ⏎` → `↵`/`a` actually upgrades something, visibly, without leaving the panel; the
terminal hand-off (still the answer for sudo-prompting cask installs, and for bang mode)
runs the command in the user's real shell environment and lands in the tmux client they're
looking at.

## Context

Two bugs made "upgrade" look like a no-op (JOURNAL 2026-09-10): the tmux window inherited
the accessory app's bare PATH (`brew: not found`, then a fresh login shell — the error
scrolled off), and the window went to the most-recently-active tmux session rather than the
focused one. Bang mode shares the first bug. The updates checks already run with an
augmented environment (`updates::check_path`/`pnpm_home`); upgrades can reuse it.

## Approach

1. **Terminal hand-off in a login shell.** `tmux new-window` runs `$SHELL -lic '<cmd>; exec
$SHELL -l'` — the shape the fresh-Ghostty-instance path already uses — so PATH/PNPM_HOME
   come from the user's rc files, not from launcharr.
2. **Target the focused tmux client** (`#{client_focused}`, tmux ≥ 3.2 with `focus-events`),
   falling back to the most recent `client_activity` as before.
3. **Panel-owned upgrade.** `updates::upgrade(source)` spawns `/bin/sh -c <command>` with the
   check environment, stdin null, both streams merged into a bounded tail on the report
   (`UpdatesReport.upgrade: UpgradeRun`). The panel (1 Hz poll) shows the run: source, elapsed,
   last lines, exit status; `x` cancels; `t` hands the same source to the terminal for the
   cases a non-interactive run can't do (sudo). A finished run kicks a re-check.

## Steps

- [x] Login-shell wrap in `tmux_window_command` + test
- [x] `client_focused` in `tmux_clients` parse/plan + tests
- [x] `UpgradeRun` + `upgrade()`/`cancel_upgrade()` in updates.rs + tests
- [x] plugins.rs messages: `upgrade` (panel), `upgradeInTerminal`, `cancelUpgrade`
- [x] model.ts/panel.tsx/cell.tsx: run section, keys, cell hint
- [x] DECISIONS + JOURNAL + STATUS

## Acceptance criteria

- [x] `pnpm verify` green
- [ ] From the installed (LaunchAgent) app: `↵` on Homebrew runs the upgrade with live output
      in the panel and the count drops on the follow-up check — **Mitch's hands-check**
- [x] `t` opens the upgrade in the focused Ghostty tmux client with brew found (the tmux
      argv verified live from a bare environment: brew, pnpm and `PNPM_HOME` resolve)

## Out of scope

- A PTY for interactive prompts (sudo) — `t` covers it.
- Per-item upgrades (`brew upgrade <formula>`); the source-level command stays.

## Risks / open questions

- `client_focused` is only set when the terminal sends focus events; empty means fall back.
- A cask needing sudo fails fast (`sudo: a terminal is required`) — shown as the run's exit
  line with the `t` hint, not hung: stdin is null.
