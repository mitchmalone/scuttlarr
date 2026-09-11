# Contributing

Thanks for your interest. Before opening a PR:

1. Read `AGENTS.md` and `docs/STANDARDS.md` — they're the rules this repo actually runs on (TDD, conventional commits, the verify gate).
2. Open an issue first for anything non-trivial.
3. `pnpm install` sets up git hooks via lefthook. Don't bypass them (`--no-verify` is never acceptable).
4. Every change: failing test first, then the fix, then `verify` green.
5. One logical change per PR, conventional-commit title, description covering what/why/how-to-test.

One product note. scuttlarr is opinionated: one choice per surface, and the rungs above the
launcher and bar (Desktop, Theme, Machine — see `README.md`) are toggles, not forks. Don't PR
your preference — overlay it in `~/.config/scuttlarr/` (a theme is a `colors.toml`, a script
is a file in `scripts/`, a plugin is a directory in `plugins/`; `docs/THEMES.md`,
`docs/SCRIPTS.md`, `docs/PLUGINS.md`). A PR that changes a default should argue why the
default is wrong for everyone, not just for you.
