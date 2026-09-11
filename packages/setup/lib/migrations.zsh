# migrations.zsh — one-shot base changes, each run once (docs/SETUP.md, `update`).
#
# The base ships migrations/YYYY-MM-DD-slug.zsh; state/migrations lists, one
# name per line, the ones that have run. sc_migrate sources every unrun file
# in sorted order (the date prefix is the sequence) in a subshell with lib/
# loaded and err_exit on: success appends the name, failure stops the run
# so the rest wait for a fix. SCUTTLARR_MIGRATIONS_DIR points tests at fixtures.

typeset -gi SC_MIGRATIONS_RAN=0 SC_MIGRATIONS_DONE=0 SC_MIGRATIONS_PENDING=0

sc_migrations_dir()    { print -r -- "${SCUTTLARR_MIGRATIONS_DIR:-$SCUTTLARR_BASE/migrations}"; }
sc_migrations_record() { print -r -- "$SCUTTLARR_STATE/migrations"; }

# sc_migration_done <name> → status 0 if recorded.
sc_migration_done() {
  local file; file="$(sc_migrations_record)"
  [[ -f "$file" ]] && grep -qxF -- "$1" "$file"
}

# sc_migration_mark <name>
sc_migration_mark() {
  sc_state_init
  print -r -- "$1" >> "$(sc_migrations_record)"
}

sc_migrate() {
  emulate -L zsh
  local f name
  local -a files pending
  local -i rc
  SC_MIGRATIONS_RAN=0 SC_MIGRATIONS_DONE=0 SC_MIGRATIONS_PENDING=0
  files=("$(sc_migrations_dir)"/*.zsh(N))
  for f in "${files[@]}"; do
    if sc_migration_done "${f:t}"; then (( SC_MIGRATIONS_DONE++ )); else pending+=("$f"); fi
  done
  SC_MIGRATIONS_PENDING=${#pending}
  for f in "${pending[@]}"; do
    name="${f:t}"
    sc_log "$name: running"
    ( setopt err_exit no_unset; source "$f" )
    rc=$?
    if (( rc != 0 )); then
      sc_err "$name: failed (exit $rc) — stopped, $(( SC_MIGRATIONS_PENDING - SC_MIGRATIONS_RAN - 1 )) later migration(s) not run"
      return 1
    fi
    sc_migration_mark "$name"
    (( SC_MIGRATIONS_RAN++ ))
    sc_ok "$name: done"
  done
  if (( ${#files} == 0 )); then
    sc_ok "migrations: none to run"
  else
    sc_ok "migrations: ${SC_MIGRATIONS_RAN} ran, ${SC_MIGRATIONS_DONE} already done"
  fi
  return 0
}
