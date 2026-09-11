#!/bin/zsh
source "${0:A:h}/harness.zsh"
cli="$SCUTTLARR_BASE/bin/scuttlarr"
log="$T/migrations.log"

# the shipped directory holds only the README; the run is clean and empty
assert_file "$SCUTTLARR_BASE/migrations/README.md" "README ships"
shipped=("$SCUTTLARR_BASE"/migrations/*.zsh(N))
assert_eq 0 "${#shipped}" "no real migration ships yet"
out="$("$cli" migrate 2>&1)"; rc=$?
assert_eq 0 "$rc" "empty base dir exits 0"
assert_match "says none" "$out" "none to run"
assert_no_file "$(sc_migrations_record)" "no record for nothing"

# fixtures under $T from here on
export SCUTTLARR_MIGRATIONS_DIR="$T/migrations"
assert_ok "missing dir is fine" "$cli" migrate 2>/dev/null
mkdir -p "$SCUTTLARR_MIGRATIONS_DIR"
assert_ok "empty dir is fine" "$cli" migrate 2>/dev/null

# sorted order, lib loaded, each recorded
cat > "$SCUTTLARR_MIGRATIONS_DIR/2026-01-02-second.zsh" <<'M'
print -r -- "second $(sc_tilde "$HOME/x")" >> "$MIGRATION_LOG"
M
cat > "$SCUTTLARR_MIGRATIONS_DIR/2026-01-01-first.zsh" <<'M'
sc_state_init
print -r -- "first" >> "$MIGRATION_LOG"
exit 0   # a subshell: this must not end the run
M
export MIGRATION_LOG="$log"
out="$("$cli" migrate 2>&1)"; rc=$?
assert_eq 0 "$rc" "two migrations exit 0"
assert_eq $'first\nsecond ~/x' "$(cat "$log")" "ran in sorted order with lib loaded"
assert_eq $'2026-01-01-first.zsh\n2026-01-02-second.zsh' "$(cat "$(sc_migrations_record)")" "record lists both"
assert_match "counts" "$out" "2 ran, 0 already done"

# second run: nothing re-runs
out="$("$cli" migrate 2>&1)"
assert_eq $'first\nsecond ~/x' "$(cat "$log")" "nothing re-ran"
assert_match "counts again" "$out" "0 ran, 2 already done"

# a failure stops the run, is not recorded, and later ones wait
cat > "$SCUTTLARR_MIGRATIONS_DIR/2026-01-03-broken.zsh" <<'M'
print -r -- "broken" >> "$MIGRATION_LOG"
false
print -r -- "unreachable" >> "$MIGRATION_LOG"
M
cat > "$SCUTTLARR_MIGRATIONS_DIR/2026-01-04-later.zsh" <<'M'
print -r -- "later" >> "$MIGRATION_LOG"
M
out="$("$cli" migrate 2>&1)"; rc=$?
assert_eq 1 "$rc" "failure exits 1"
assert_match "names the culprit" "$out" "2026-01-03-broken.zsh: failed"
assert_eq $'first\nsecond ~/x\nbroken' "$(cat "$log")" "err_exit inside, later one not run"
assert_fails "broken not recorded" sc_migration_done 2026-01-03-broken.zsh
assert_fails "later not recorded" sc_migration_done 2026-01-04-later.zsh

# fix it; the rerun picks up where it stopped
print 'print -r -- "fixed" >> "$MIGRATION_LOG"' > "$SCUTTLARR_MIGRATIONS_DIR/2026-01-03-broken.zsh"
assert_ok "rerun succeeds" "$cli" migrate 2>/dev/null
assert_eq $'first\nsecond ~/x\nbroken\nfixed\nlater' "$(cat "$log")" "resumed in order"
assert_eq 4 "$(wc -l < "$(sc_migrations_record)" | tr -d ' ')" "four recorded"

t_done
