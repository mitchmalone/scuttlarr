---
title: Bootstrap scuttlarr
status: active
created: 2026-08-25
updated: 2026-08-25
links: [docs/THEMES.md, docs/DECISIONS.md]
---

# Bootstrap scuttlarr

## Goal

A working `curl … | sh` that takes a fresh Apple Silicon Mac to the de-shined,
launcharr-driven, single-theme setup, with `scuttlarr update`/`doctor`/`theme set`
functional and Mitch's machine running from it with a small overlay.

## Context

Extracted from private dotfiles (see DECISIONS founding entry). The dotfiles tidy on
2026-08-25 left `.macos` as the best current statement of the defaults; the Brewfile is
still a personal inventory to be split into base vs overlay.

## Approach

Build bottom-up, each layer idempotent and tested before the next:
`lib/` helpers → `defaults/` → `bin/scuttlarr doctor|defaults` → Brewfile split →
overlay loader → theme build/set (Dracula) → launcharr wiring → `install/install.sh` →
migrations → Caps→Hyper → duti → second theme (Solarized Light) → reconcile dotfiles.

## Steps

- [ ] Repo skeleton: `bin/`, `lib/`, `install/`, `defaults/`, `themes/`, `templates/`, `migrations/`, `test/`; `pnpm verify` runs `scripts/test.zsh` + `zsh -n`
- [ ] `lib/log.zsh`, `lib/defaults.zsh` (idempotent `defaults write` wrapper with read-back), tests
- [ ] `defaults/{deshine,keyboard,finder,dock,security,screenshots}.sh` extracted from `.macos`
- [ ] `bin/scuttlarr doctor` — reports what differs from base (defaults, brew, theme, overlay presence)
- [ ] Base `Brewfile` vs overlay; `scuttlarr apps` = `brew bundle` over both
- [ ] Overlay loader and `~/.config/scuttlarr/` layout documented in README (done) and enforced in code
- [ ] `themes/dracula/palette.toml` + `templates/` + `scuttlarr theme build` (token substitution), tests
- [ ] `scuttlarr theme set` — launcharr config merge, macOS accent/appearance, wallpaper, terminal
- [ ] `install/install.sh` end to end on a clean VM/user
- [ ] Migrations runner + state; first migration is a no-op that proves the mechanism
- [ ] Caps→Hyper LaunchAgent (after Phase 0 verification)
- [ ] `duti` declarations + `scuttlarr apps defaults`
- [ ] `themes/solarized-light` — proves light + `appearance` switching
- [ ] Dotfiles reconciliation: Mac opinions deleted from dotfiles, overlay created

## Acceptance criteria

- Fresh user account → one command → de-shined, tiled, themed machine; re-running is a no-op.
- `scuttlarr theme set solarized-light` then `dracula` round-trips every surface in THEMES.md.
- Mitch's dotfiles Mac layer is under ~50 lines of overlay.
- `pnpm verify` green; CI green.

## Out of scope

- The site beyond a placeholder (Phase 2). Linux. Intel. VS Code theming.

## Risks / open questions

- Terminal/shell decision (Phase 0) — templates for prompt/terminal wait on it.
- `com.apple.universalaccess` needs FDA; decide whether `install` prompts for it or prints the manual step (current lean: print).
- Esc-on-tap for Caps→Hyper may need a tiny helper beyond `hidutil`; if it needs Accessibility, ship hold-only.
