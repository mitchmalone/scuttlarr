#!/bin/zsh
source "${0:A:h}/harness.zsh"
cli="$SCUTTLARR_BASE/bin/scuttlarr"

# Nothing applied yet: nothing to remove.
out="$("$cli" remove --yes 2>&1)"; rc=$?
assert_eq 0 "$rc" "fresh machine exits 0"
assert_match "fresh machine" "$out" "nothing to remove"

# ---- build a machine with all three modes, an adopted original, a snapshot ----
dict="$HOME/Library/KeyBindings/DefaultKeyBinding.dict"
mkdir -p "${dict:h}"; print "their dict" > "$dict"          # adopted, then generated
t_seed com.apple.dock tilesize 47                            # snapshot holds 47
"$cli" defaults --apply --yes >/dev/null 2>&1
"$cli" link >/dev/null 2>&1                                  # symlink
link="$HOME/.local/bin/scuttlarr"
adopted="$HOME/.config/foo/rc"                               # a bare `adopted` line
mkdir -p "${adopted:h}"; print "ours" > "$adopted"
mkdir -p "$(sc_adopted_path "$adopted")"; rmdir "$(sc_adopted_path "$adopted")"
print "theirs" > "$(sc_adopted_path "$adopted")"
sc_manifest_add adopted "$adopted" "$(sc_adopted_path "$adopted")" foo
print -r -- "2026-01-01-first.zsh" > "$(sc_migrations_record)"
mkdir -p "$SCUTTLARR_OVERLAY"; print "mine" > "$SCUTTLARR_OVERLAY/defaults.sh"
print "{}" > "$SCUTTLARR_STATE/awake.json"; : > "$SCUTTLARR_STATE/agents.sock"

assert_eq generated "$(sc_manifest_mode "$dict")" "setup: dict generated"
assert_eq "their dict" "$(cat "$(sc_adopted_path "$dict")")" "setup: their dict parked"
assert_eq symlink "$(sc_manifest_mode "$link")" "setup: link owned"
assert_eq 1 "$(t_read read com.apple.dock autohide)" "setup: autohide written"
assert_eq 48 "$(t_read read com.apple.dock tilesize)" "setup: tilesize written"
assert_eq "$SC_ABSENT" "$(sc_snapshot_get com.apple.dock autohide -)" "setup: autohide was absent"

# ---- plan: reported, counted, nothing changed ----
sc_remove_run plan 2>/dev/null
assert_eq 3 "$SC_REMOVE_PATHS" "plan: three owned paths"
assert_eq 2 "$SC_REMOVE_RESTORED" "plan: two originals"
assert_ok "plan: defaults counted" test "$SC_REMOVE_DEFAULTS" -gt 60
assert_ok "plan: link still there" test -L "$link"
assert_file "$dict" "plan: dict still there"
assert_file "$(sc_manifest_path)" "plan: manifest still there"
assert_eq 48 "$(t_read read com.apple.dock tilesize)" "plan: default untouched"

# Without --yes and no tty, the question is declined: nothing changes.
out="$("$cli" remove 2>&1 </dev/null)"
assert_match "plan names the link" "$out" "$(sc_tilde "$link"): remove link"
assert_match "plan names the dict" "$out" "DefaultKeyBinding.dict: remove"
assert_match "plan names the restore" "$out" "restore original"
assert_match "plan counts" "$out" "3 owned path(s)"
assert_match "declined" "$out" "left as is"
assert_file "$(sc_manifest_path)" "declined: manifest still there"

# ---- apply ----
out="$("$cli" remove --yes 2>&1)"; rc=$?
assert_eq 0 "$rc" "remove exits 0"
assert_no_file "$link" "symlink removed"
assert_eq "their dict" "$(cat "$dict")" "generated removed, adopted original back"
assert_eq "theirs" "$(cat "$adopted")" "adopted-mode original back"
assert_no_file "$SCUTTLARR_STATE/adopted" "adopted/ tree gone"
assert_eq 47 "$(t_read read com.apple.dock tilesize)" "default restored from snapshot"
assert_fails "absent-before key deleted" t_read read com.apple.dock autohide
assert_no_file "$(sc_manifest_path)" "manifest gone"
assert_no_file "$(sc_snapshot_path)" "snapshot gone"
assert_no_file "$(sc_migrations_record)" "migrations record gone"
assert_eq "mine" "$(cat "$SCUTTLARR_OVERLAY/defaults.sh")" "overlay untouched"
assert_file "$SCUTTLARR_STATE/awake.json" "app state untouched"
assert_ok "app socket untouched" test -e "$SCUTTLARR_STATE/agents.sock"

# Twice: nothing to do.
out="$("$cli" remove --yes 2>&1)"
assert_match "second remove" "$out" "nothing to remove"

t_done
