---
title: Live theme switch across terminals (the Omarchy moment on macOS)
status: done
created: 2026-09-16
updated: 2026-09-16
links:
  - ../../THEMES.md
  - 2026-09-11-unify-into-scuttlarr.md (phase 3.5, "live proof of the tmux retint")
  - ../../JOURNAL.md (2026-09-11, Ghostty 1.3 AppleScript dictionary)
---

# Live theme switch across terminals

## Goal

Pick a theme in scuttlarr and every open terminal changes on the spot — Ghostty windows
inside and outside tmux, Terminal.app, whatever is showing a shell — plus VS Code, with
no permission prompt for the baseline. The mechanism built 2026-09-11 was never switched
on on the primary Mac, and its live retint only reached tmux panes.

## Context

- `theme.rs` stages + swaps `~/.local/state/scuttlarr/current/theme/` and fans out. The
  retint wrote OSC 10/11/12/17/19/4 into tmux panes' ttys only (`retint_tmux`).
- Ghostty on macOS has no signal reload (SIGUSR2 kills it, JOURNAL 2026-09-11) but 1.3.1
  grew an AppleScript dictionary with `perform action "reload_config"` — one Automation
  consent prompt.
- On this machine: `config.appearance.everywhere` was false, nothing imported the state
  path (Ghostty/tmux/p10k/git are chezmoi-managed in `~/Developer/mitch/dotfiles`), VS
  Code sat on Light Modern.

## Approach

Two layers, in this order at every apply:

1. **OSC into every pty the user owns** — always on with "Everywhere", zero permission.
   `user_ttys()` lists `/dev/ttysNNN` owned by the user (owner = the home dir's uid, no
   libc crate); union with tmux's pane ttys; write, SIGWINCH the foreground group. Covers
   Ghostty outside tmux and Terminal.app for free. Palette only — the rest of the Ghostty
   template waits for a new window.
2. **Ghostty config reload over AppleScript** — opt-in `appearance.ghostty`, beside "Also
   retint editors". `tell application "Ghostty" to perform action "reload_config"` only
   when a Ghostty process exists (the `tell` would otherwise launch one). Full fidelity for
   every open Ghostty window at the price of one consent prompt, first time.

The include lines go into the chezmoi sources, not the home files, so chezmoi stays the
single owner (invariant 11); `scuttlarr shell --apply` is not run here.

## Steps

- [x] `theme.rs`: `pick_ttys` (pure, tested) + `user_ttys`, `retint_terminals` replaces
      `retint_tmux`, `reload_ghostty` behind `ThemeApply.ghostty_reload`, run last;
      every `osascript` bounded to 8 s (JOURNAL 2026-09-16)
- [x] `config.rs` / `config.ts`: `appearance.ghostty` (default false)
- [x] `theme.ts`: pass the flag; test
- [x] Settings → General ▸ Theme: the toggle + copy; Everywhere hint says "every terminal"
- [x] Docs: THEMES.md Surfaces (Ghostty row, rule), AGENTS.md invariant 1 wording, DECISIONS
- [x] Dotfiles (chezmoi sources, uncommitted): Ghostty `config-file` (Dracula Pro stays
      as the fallback), tmux `source-file` last, p10k `source` after the palette (the
      per-host dir colour still wins), git `[include]` inside the delta block; applied
      to the four targets, each validated
- [x] This Mac: `appearance.everywhere/editors/ghostty` on
- [x] Claude Code `custom:scuttlarr` (`~/.claude/settings.json`, `.bak-scuttlarr` beside it)
- [x] Rebuild, dev-install, two switches read back from disk (STATUS); hands-check is Mitch's

## Acceptance criteria

- [x] `pnpm verify` green (245 Rust, 235 core, 110 theme, 87 tui, 68 desktop)
- [x] Switching theme retints every open shell (tmux or not) with no prompt — 13 ttys written, tmux status restyled; the look in Ghostty is the hands-check
- [x] With `appearance.ghostty` on, the reload returns true once consent is given (blocked on the dialog the first time — JOURNAL)
- [x] VS Code: extension installed, `workbench.colorTheme` switched (live repaint is the hands-check)
- [x] Memory: no new process, window, watcher or cache — nothing to measure

## Out of scope

- Terminal.app profile colours over AppleScript (OSC already reaches its open windows)
- `scuttlarr shell --apply` adopting chezmoi-managed files

## Risks / open questions

- The p10k `host` colour is per-machine by design in the dotfiles; the theme's accent is
  sourced first and the per-host line still wins. Mitch's call whether the theme should.
- `perform action` needs its `on terminal` target even for app-wide actions: the bare form
  errors `-1701`, `on first terminal` returns true (verified 2026-09-16).
