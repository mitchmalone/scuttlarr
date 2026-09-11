#!/bin/zsh
source "${0:A:h}/harness.zsh"

target="$HOME/Library/KeyBindings/DefaultKeyBinding.dict"
content=$'{\n  "~ " = ("insertText:", " ");\n}\n'

# plan: absent → create, nothing written
SC_MODE=plan; sc_files_reset
print -rn -- "$content" | sc_file_generated "$target" keyboard 2>/dev/null
assert_eq 1 "$SC_FILES_CHANGED" "plan: would create"
assert_no_file "$target" "plan wrote nothing"

# apply: create + manifest
SC_MODE=apply; sc_files_reset
print -rn -- "$content" | sc_file_generated "$target" keyboard 2>/dev/null
assert_file "$target" "created"
assert_eq "${content}x" "$(cat "$target"; print -n x)" "content exact incl. trailing newline"
assert_eq generated "$(sc_manifest_mode "$target")" "manifest: generated"
assert_eq "$(sc_hash "$target")" "${${(s:	:)$(sc_manifest_get "$target")}[3]}" "manifest hash"

# apply again: unchanged
sc_files_reset
print -rn -- "$content" | sc_file_generated "$target" keyboard 2>/dev/null
assert_eq 0 "$SC_FILES_CHANGED" "idempotent"

# check: edited by hand → drift
print "tampered" >> "$target"
SC_MODE=check; sc_files_reset
print -rn -- "$content" | sc_file_generated "$target" keyboard 2>/dev/null
assert_eq 1 "$SC_FILES_CHANGED" "check sees the edit"

# adopt: a foreign file is moved aside, never overwritten
other="$HOME/.config/foo/config"
mkdir -p "${other:h}"; print "theirs" > "$other"
SC_MODE=apply; sc_files_reset
print "ours" | sc_file_generated "$other" foo 2>/dev/null
assert_eq "ours" "$(cat "$other")" "ours in place"
assert_eq "theirs" "$(cat "$SCUTTLARR_STATE/adopted/.config/foo/config")" "theirs parked under adopted/"
assert_eq generated "$(sc_manifest_mode "$other")" "final mode is generated"

t_done
