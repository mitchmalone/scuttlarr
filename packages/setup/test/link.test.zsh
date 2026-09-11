#!/bin/zsh
source "${0:A:h}/harness.zsh"
cli="$SCUTTLARR_BASE/bin/scuttlarr"
link="$HOME/.local/bin/scuttlarr"
base_bin="$SCUTTLARR_BASE/bin/scuttlarr"

# plan on a fresh home: would create, writes nothing
sc_link_run plan 2>/dev/null
assert_eq 1 "$SC_LINK_CHANGED" "plan: would create"
assert_no_file "$link" "plan wrote nothing"
assert_no_file "$(sc_manifest_path)" "plan touched no manifest"

# link: dir made, symlink to base, manifest records symlink/cli
out="$("$cli" link 2>&1)"
assert_ok "link is a symlink" test -L "$link"
assert_eq "${base_bin:A}" "${link:A}" "points at base"
assert_eq "symlink	$link	$base_bin	cli" "$(sc_manifest_get "$link")" "manifest line"
assert_match "hints when ~/.local/bin is off PATH" "$out" "not on PATH"
assert_eq "$SCUTTLARR_VERSION" "$("$link" version)" "linked cli runs"

# second run: unchanged, one manifest line
out="$("$cli" link 2>&1)"
assert_match "idempotent" "$out" "unchanged"
assert_eq 1 "$(sc_manifest_list | wc -l | tr -d ' ')" "still one line"
sc_link_run plan 2>/dev/null
assert_eq 0 "$SC_LINK_CHANGED" "plan: nothing to do"

# no hint once the directory is on PATH
out="$(PATH="$HOME/.local/bin:$PATH" "$cli" link 2>&1)"
assert_eq "$out" "${out/not on PATH/}" "no hint when on PATH"

# unlink: link and manifest line gone; twice is a no-op
"$cli" unlink 2>/dev/null
assert_no_file "$link" "link removed"
assert_fails "manifest line gone" sc_manifest_get "$link"
out="$("$cli" unlink 2>&1)"
assert_match "unlink twice" "$out" "nothing to unlink"

# a foreign file is adopted, never overwritten; unlink puts it back
mkdir -p "${link:h}"; print "theirs" > "$link"
out="$("$cli" link 2>&1)"
assert_ok "symlink now" test -L "$link"
assert_match "says it adopted" "$out" "adopted"
assert_eq "theirs" "$(cat "$(sc_adopted_path "$link")")" "original parked under adopted/"
assert_eq symlink "$(sc_manifest_mode "$link")" "final mode is symlink"
"$cli" unlink 2>/dev/null
assert_ok "original is a plain file again" test -f "$link" -a ! -L "$link"
assert_eq "theirs" "$(cat "$link")" "original content back"
assert_no_file "$(sc_adopted_path "$link")" "nothing left parked"

# a foreign symlink pointing elsewhere is adopted too
rm -f "$link"; ln -s /usr/bin/true "$link"
"$cli" link 2>/dev/null
assert_eq "${base_bin:A}" "${link:A}" "relinked to base"
assert_ok "foreign symlink parked" test -L "$(sc_adopted_path "$link")"
"$cli" unlink 2>/dev/null
assert_eq /usr/bin/true "$(readlink "$link")" "foreign symlink restored"

# a foreign symlink already pointing at base is just recorded
rm -f "$link"; ln -s "$base_bin" "$link"
out="$("$cli" link 2>&1)"
assert_eq symlink "$(sc_manifest_mode "$link")" "recorded"
assert_no_file "$(sc_adopted_path "$link")" "nothing to adopt"
"$cli" unlink 2>/dev/null

# unlink leaves a foreign path alone
print "theirs" > "$link"
assert_fails "unlink refuses a foreign file" "$cli" unlink 2>/dev/null
assert_eq "theirs" "$(cat "$link")" "foreign file untouched"

t_done
