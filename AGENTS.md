# AGENTS.md — scuttlarr

scuttlarr is an opinionated macOS distro for developers: one install, one theme
everywhere, a lifecycle (update/migrate/doctor), and a user overlay that survives it all.
Sibling of launcharr, which it installs as the launcher/bar/tiling layer.

## Standard

This project was stamped from the [jig](https://github.com/mitchmalone/jig). Its standard lives **in this repo** at `docs/STANDARDS.md` (vendored at stamp time) — that copy governs; do not consult or "upgrade to" the jig's current version mid-task. This file carries **deltas only** — identity, stack, invariants — never restatements. Divergences live in `DEVIATIONS.md` with a justification. Refreshing `docs/STANDARDS.md` from the jig is a deliberate reconciliation, done as its own change.

## Docs system

Living state is in `docs/` — see the standard for roles and discipline. Session protocol: orient on `docs/STATUS.md` and `docs/plans/active/` → plan before non-trivial work → record decisions/gotchas as they happen → close out docs in the same commit as the code.

## Stack

| Surface         | Choice                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------- |
| Installer + CLI | zsh 5.9 (ships with every supported macOS; no bootstrap dependency). See DEVIATIONS.          |
| Tests           | zsh test scripts under `test/`, run by `scripts/test.zsh`; `zsh -n` on every script as floor  |
| Themes          | `themes/<name>/palette.toml` is the source; per-app files rendered by `scuttlarr theme build` |
| macOS defaults  | `defaults/*.sh`, one file per concern, idempotent                                             |
| Desktop layer   | launcharr (via the shared Homebrew tap) → AeroSpace, bar, JankyBorders                        |
| Packages        | Homebrew; `Brewfile` (base) + `~/.config/scuttlarr/Brewfile` (overlay)                        |
| Site            | `apps/www` — Next.js static, serves `scuttlarr.com/install`                                   |
| Release         | tag → GitHub release with notes; the install URL always resolves to the latest tag            |
| Supported       | Apple Silicon, current macOS and one back                                                     |

## Invariants

1. **The base is never edited on a user's machine.** Anything a user changes lives in `~/.config/scuttlarr/`. If a feature needs the user to touch a base file, the feature is wrong.
2. **Every script is idempotent.** `install`, `update`, `theme set`, every `defaults/*.sh` — running twice is a no-op.
3. **One opinion per surface.** A surface (launcher, bar, terminal, prompt, tiling, theme format) has exactly one choice in the base. Alternatives are overlays, never flags.
4. **A base change that alters user-visible state ships with a migration**, in the same commit. Migrations run once, are recorded, and are idempotent too.
5. **No permissions beyond the standard Automation consents.** The base never requires Accessibility or Full Disk Access. The one known exception (`com.apple.universalaccess`) is documented in the install output, not silently skipped.
6. **Themes are data.** A theme is a palette plus rendered files. No theme contains logic; rendering is the CLI's job and the rendered files are committed so every theme dir is usable without the CLI.
7. **launcharr is a dependency, not a vendored copy.** scuttlarr configures it through its public `config.json`; anything launcharr can't express is a launcharr feature request, not a scuttlarr workaround.
8. **Never redistribute what we don't have the licence for.** Dracula Pro and any paid theme are overlay-only.

## Commands

| Command         | What                                                              |
| --------------- | ----------------------------------------------------------------- |
| `pnpm dev`      | Run the site                                                      |
| `pnpm verify`   | The gate: shell syntax + shell tests + site typecheck/lint/format |
| `bin/scuttlarr` | The CLI, runnable from the checkout                               |

## Definition of done

- `pnpm verify` green.
- New behavior has tests, written first (red/green/refactor).
- User-visible base change → migration in the same commit.
- `docs/STATUS.md` updated and the plan moved to `done/` in the same commit.
