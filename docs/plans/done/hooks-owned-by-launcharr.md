---
title: Claude hook adapter owned by launcharr
status: done
created: 2026-08-28
updated: 2026-08-28
links:
  - ../DECISIONS.md (2026-08-28 · hooks live at a stable path launcharr installs)
  - ../DECISIONS.md (2026-08-16 · agent monitoring absorbed)
  - apps/desktop/src-tauri/src/hooks.rs
---

# Claude hook adapter owned by launcharr

## Goal

Agent monitoring must survive the repo moving. The Claude Code hook adapter is
installed by launcharr at a stable path and registered by launcharr, instead of
being pointed at a git checkout by hand.

## Context

Since 2026-08-16 every Claude hook group in `~/.claude*/settings.json` was an absolute
path into `apps/desktop/hooks/claude-status.py` in the checkout. Moving the repo to
`stackarr/launcharr` on 2026-08-28 broke all sixteen entries at once (`Stop hook
error: … No such file or directory`) — silently as far as the bar was concerned: the
cells simply stopped updating. The boundary agreed with scuttlarr the same day ("files
on disk are provisionable") wants a stable, documented path too.

## Approach

`include_str!` the script into the binary; install it to
`~/.config/launcharr/hooks/claude-status.py` (mode 0755, rewritten only when it
differs). `hooks.rs` edits `settings.json` in every Claude config dir (`~/.claude`,
`~/.claude-*`, the account convention usage.rs already uses) with `serde_json`
`preserve_order` so the user's file keeps its shape. Two verbs: `boot` (monitor on:
keep the file fresh + **repair** entries recognised as ours — signature is the file
name `…/hooks/claude-status.{py,sh}` — never add) and `install` (Settings → Agents:
register every event in every account; one-time `settings.json.bak-launcharr`). Two
commands, `hooks_status` and `hooks_install`. `HooksRow` in Settings → Agents → Local
monitoring lists accounts with `registered | stale path | some events | not
registered` and offers the button until everything is settled.

Alternative considered: a Tauri bundle resource. Rejected — `include_str!` is smaller,
needs no resource path resolution, and the installed copy is the contract, not the
bundle.

## Steps

- [x] `hooks.rs`: pure `classify`/`repair`/`register` on `Value`, TDD (9 tests)
- [x] `install_script_at`, `claude_config_dirs`, `status`/`install`/`boot`
- [x] Commands `hooks_status`, `hooks_install`; boot repair thread when monitor on
- [x] `serde_json` `preserve_order` (settings.json key order survives)
- [x] `lib/hooks.ts` + `HooksRow.tsx`; hint copy; CSS
- [x] Script docstring, DECISIONS, STATUS

## Acceptance criteria

- [x] `cargo test hooks::` green; `pnpm verify` green
- [x] Fresh Mac: Settings → Agents → install → every event in every account points at
      `~/.config/launcharr/hooks/claude-status.py`; second click is a no-op
- [x] Moving the checkout again changes nothing
- [x] Proved live 2026-08-28: boot repair rewrote 16 entries in both accounts on first launch
- [ ] Hands-check (Mitch): Settings → Agents shows both accounts registered; a Claude
      turn paints a cell

## Out of scope

Codex hooks (no hook system). Removing registrations (uninstall) — the README's
uninstall section lists the file; the entries are inert without it.

## Risks / open questions

Boot rewrites a user's `settings.json` when it finds our stale path. Scoped to our own
entries, backed up once, and the alternative is silent breakage — accepted.
