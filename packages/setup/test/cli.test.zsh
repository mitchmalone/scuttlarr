#!/bin/zsh
source "${0:A:h}/harness.zsh"
cli="$SCUTTLARR_BASE/bin/scuttlarr"

assert_eq "$SCUTTLARR_VERSION" "$("$cli" version)" "version"
assert_ok "help exits 0" "$cli" help
assert_fails "unknown command" "$cli" nope >/dev/null 2>&1

# Fresh scratch machine: doctor reports drift, plan lists keys, nothing written.
assert_fails "doctor drifts on a fresh machine" "$cli" doctor 2>/dev/null
out="$("$cli" defaults 2>&1)"
assert_match "plan mentions the dock" "$out" "com.apple.dock autohide"
assert_match "plan mentions the keybinding file" "$out" "DefaultKeyBinding.dict: create"
assert_match "plan says how to apply" "$out" "--apply"
assert_no_file "$(sc_snapshot_path)" "plan is read-only"

# Apply, then doctor is clean and a second apply changes nothing.
"$cli" defaults --apply --yes >/dev/null 2>&1
assert_ok "doctor clean after apply" "$cli" doctor 2>/dev/null
assert_file "$(sc_snapshot_path)" "snapshot taken"
assert_file "$(sc_manifest_path)" "manifest written"
assert_eq 1 "$(t_read read com.apple.dock autohide)" "a key landed"
out="$("$cli" defaults --apply --yes 2>&1)"
assert_match "second apply is a no-op" "$out" "already as declared"

# Drift after the fact is reported.
"$SCUTTLARR_DEFAULTS_BIN" write com.apple.dock tilesize -int 96
assert_fails "doctor sees drift" "$cli" doctor 2>/dev/null
out="$("$cli" doctor 2>&1)"
assert_match "names the key" "$out" "com.apple.dock tilesize: expected 48, is 96"

t_done
