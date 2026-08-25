# Roadmap

Phases and backlog. Deferred items carry triggers, not dates.

## Phase 0 — Decide (in progress)

- Terminal + shell stack trial (Ghostty, no OMZ/zplug, prompt). One week on the primary machine, then DECISIONS.
- Confirm Caps→Hyper mechanism works without permissions on current macOS (`hidutil` + LaunchAgent; Esc-on-tap needs a helper — verify what's achievable permission-free).

## Phase 1 — The ship

- `install/install.sh` — Xcode CLT → Homebrew → base Brewfile → defaults → shell → launcharr → theme → overlay. Idempotent; re-run is `update`.
- `bin/scuttlarr` with `install`, `update`, `doctor`, `theme {list,set,build}`, `defaults`, `apps`.
- `defaults/` extracted from the dotfiles `.macos` (de-shine, keyboard, finder, dock, security, screenshots), one file per concern.
- Base `Brewfile`: core CLI set + launcharr + one mono font + one UI font. Everything else is overlay.
- Overlay loader: `~/.config/scuttlarr/{Brewfile,defaults.sh,zsh/,duti,themes/}`.
- Migrations runner + state file.
- Theme system per `docs/THEMES.md`, Dracula first, Solarized Light second (proves light).
- Caps→Hyper.
- `duti` default-app declarations.
- Agent provisioning: Claude Code via brew, `claude-tmux-status` plugin, agent-safe shell defaults (no interactive prompts under `CI`/non-tty, predictable `PS1`), the jig available for new projects.
- launcharr contract (see DECISIONS 2026-08-25, boundary): scuttlarr writes only `~/.config/launcharr/config.json` — theme block + typed `desktop` block. Blocked on launcharr items: light-mode support, Ghostty hand-off target, typed `desktop` schema, dark-mode command delegation.
- Mitch's dotfiles reconciled: Mac opinions moved here, overlay left behind.

## Phase 2 — Shipped

- scuttlarr.com: manifesto + `curl … | sh` + theme gallery.
- Tagged release, notes, install URL pinned to latest tag.
- Remaining v1 themes rendered.
- Public: CONTRIBUTING reflects the overlay model ("don't PR your preference, overlay it").

## Backlog (deferred, with triggers)

- Unbind ⌘Space from Spotlight — when launcharr's ⌥Space has been muscle memory for a month.
- Notifications / Focus defaults — when a sane declarative mechanism exists (currently plist-hostile).
- `brew install scuttlarr` for the CLI alone — when existing installs need CLI updates faster than base updates.
- Per-app theme publishing as standalone repos (Dracula-style satellites) — when a second person asks for a theme without the distro.
- Intel support — never, unless someone with an Intel Mac maintains it.
