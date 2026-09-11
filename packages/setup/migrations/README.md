# migrations

One-shot changes to a machine that a base change needs, run once each by
`scuttlarr migrate` (and by `update`, once it exists). A base change that alters
user-visible state ships with its migration in the same commit (`docs/SETUP.md`).

## Naming

`YYYY-MM-DD-slug.zsh` — the date prefix is the sequence; files run in sorted
order. Only `*.zsh` files count; this README is ignored.

## How each one runs

- Sourced once, in a subshell, with `lib/` already loaded: `sc_log`, `sc_default`,
  `sc_file_generated`, `sc_manifest_*`, `sc_adopted_path` and the rest are all
  available, as are `$SCUTTLARR_BASE`, `$SCUTTLARR_OVERLAY` and `$SCUTTLARR_STATE`.
- `err_exit` and `no_unset` are on: the first failing command fails the
  migration. `exit` ends the migration, not the run.
- On success its filename is appended to `$SCUTTLARR_STATE/migrations` and it
  never runs again. On failure the run stops there and nothing after it runs
  until the next `scuttlarr migrate`.

## Rules

- Idempotent. A migration that half-ran and failed will run again from the top.
- Never edit or rename a migration that has shipped; add a new one.
- Anything it writes outside the overlay goes through the manifest
  (`sc_file_generated`, `sc_manifest_add`), so `doctor` and `remove` know.

Tests point `SCUTTLARR_MIGRATIONS_DIR` at fixtures; nothing real ships here yet.
