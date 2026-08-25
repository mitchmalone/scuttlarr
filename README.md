# scuttlarr 🏴‍☠️

> _Scuttle the ship. Sail the wreck._

scuttlarr is an opinionated macOS distro for developers who live in agents. One command
turns a fresh Mac into a fast, quiet, keyboard-first machine: the Liquid Glass shine
scraped off, the Dock parked, windows tiled, one launcher, one menu bar, one theme across
everything, Claude Code and the agent tooling wired in — and a lifecycle to keep it that
way.

It's for people who look at [Omarchy](https://omarchy.org) and want that — an opinionated,
AI-first developer setup — without taking on Linux to get it.

It is not a dotfiles manager. Dotfiles are the residue of a person; nobody installs
someone else's. scuttlarr is a **base with a lifecycle** — you don't write dotfiles, you
override a distro.

```sh
curl -fsSL https://scuttlarr.com/install | sh
```

## What you get

- **De-shined macOS.** Reduced transparency and motion, Stage Manager and Apple's own
  tiling off, no desktop icons, Dock parked out of sight, Siri out of the menu bar, no
  press-and-hold accents, no autocorrect anywhere, no quarantine nagging.
- **Tiling + launcher + bar** — [launcharr](https://github.com/mitchmalone/launcharr)
  is the launcher, the menu bar, and owns AeroSpace tiling. Zero granted permissions.
- **One theme, everywhere.** A theme is one palette rendered into the terminal, the
  shell prompt, launcharr, the bar, window borders, wallpaper, and the macOS accent
  colour. `scuttlarr theme set dracula` changes all of them. Ships Dracula, Solarized
  Light/Dark, Tokyo Night, Catppuccin, Gruvbox, Nord — bring your own too.
- **Caps Lock → Hyper.** Esc on tap, a fifth modifier on hold. No Karabiner, no
  Accessibility permission — `hidutil` and a LaunchAgent.
- **Default apps, declared.** Which app opens `.md`, `.json`, `.mp4`, `http://` — one
  file, applied with `duti`.
- **A fast shell.** zsh, fzf, zoxide, ripgrep, bat, eza, fd, delta, tmux + sesh.
- **Agent-ready.** Claude Code installed and configured, agent status in the bar and in
  tmux, a shell that behaves under non-interactive agents, project conventions
  (`AGENTS.md`) stamped by default. The runtime half of this is launcharr's; scuttlarr
  provisions it.
- **A lifecycle.** `scuttlarr update` pulls the base and runs migrations; `doctor`
  tells you what drifted; your overlay in `~/.config/scuttlarr/` survives all of it.

## The overlay model

The base is scuttlarr's and you never edit it. Everything of yours lives in
`~/.config/scuttlarr/`:

```
~/.config/scuttlarr/
├── Brewfile         # your extra apps and tools
├── defaults.sh      # defaults you flip back or add
├── zsh/*.zsh        # sourced after the base shell config
├── duti             # your default-app overrides
└── themes/<name>/   # private themes (Dracula Pro lives here, not in the distro)
```

Base changes an opinion → a migration ships with it → `scuttlarr update` applies it once.
That's the piece dotfiles never had, and why they rot.

## Principles

1. **Opinionated is the feature.** One choice per surface. Alternatives are an overlay,
   not a config flag.
2. **Raw over shiny.** If macOS added it to look nice, it's off by default.
3. **Zero permissions where possible.** No Accessibility, no Full Disk Access for the
   base install; the one exception (Reduce transparency) is called out, not hidden.
4. **Hackable.** The distro is shell scripts and plain config files in directories. Read
   them, fork them, drop a file in the overlay.
5. **Updatable.** A distro you can't update is a snapshot. Migrations are first-class.

## Status

Pre-alpha. See [`docs/STATUS.md`](docs/STATUS.md), [`docs/ROADMAP.md`](docs/ROADMAP.md),
and the theme model in [`docs/THEMES.md`](docs/THEMES.md). Decisions and their reasoning
are in [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Hacking

Repo layout: `bin/` (the `scuttlarr` CLI), `lib/` (shell library), `install/` (the
curl-able bootstrap), `defaults/` (macOS defaults, by concern), `themes/` (one directory
per theme), `migrations/`, `apps/www` ([scuttlarr.com](https://scuttlarr.com)). Standards
in `docs/STANDARDS.md`; where this project diverges, `DEVIATIONS.md` says why.

## Credit

The shape is [Omarchy](https://omarchy.org)'s — an opinionated base with themes and a
lifecycle, made for a platform that doesn't have one. Themes follow the
[Dracula](https://draculatheme.com) model: one palette, shipped into every app.
