#!/bin/zsh
source "${0:A:h}/harness.zsh"

cli="$SCUTTLARR_BASE/bin/scuttlarr"

export SCUTTLARR_SUDOERS_PATH="$T/sudoers.d/scuttlarr"
export SCUTTLARR_SUDO_BIN="$SCUTTLARR_BASE/test/fixtures/bin/sudo"
export FAKE_SUDO_LOG="$T/sudo.log"
mkdir -p "$T/sudoers.d"
target="$SCUTTLARR_SUDOERS_PATH"

# The rule names exactly the two pmset commands, for this user, no password.
rule="$(sc_sudoers_rule)"
assert_match "rule allows disablesleep 1" "$rule" "/usr/bin/pmset -a disablesleep 1"
assert_match "rule allows disablesleep 0" "$rule" "/usr/bin/pmset -a disablesleep 0"
assert_match "rule is for this user" "$rule" "${USER:-$(id -un)} ALL=(root) NOPASSWD: SCUTTLARR_SLEEP"
print -r -- "$rule" > "$T/rule"
assert_ok "visudo accepts the rule" /usr/sbin/visudo -cf "$T/rule"

assert_fails "status is off before install" "$cli" sudoers status 2>/dev/null
"$cli" sudoers on >/dev/null 2>&1
assert_file "$target" "rule installed"
assert_eq "$rule" "$(cat "$target")" "installed rule is the rule"
assert_eq "r--r--r--" "$(stat -f %Sp "$target" | cut -c2-)" "installed read-only"
assert_eq "root" "$(sc_manifest_mode "$target")" "manifest records it as root"
assert_match "install went through sudo" "$(cat "$FAKE_SUDO_LOG")" "/usr/bin/install -m 0444 -o root -g wheel"
assert_ok "status is on after install" "$cli" sudoers status 2>/dev/null

: > "$FAKE_SUDO_LOG"
"$cli" sudoers on >/dev/null 2>&1
assert_eq "" "$(cat "$FAKE_SUDO_LOG")" "a second on asks nothing"

# remove undoes it with sudo.
"$cli" remove --yes >/dev/null 2>&1
assert_no_file "$target" "remove deletes the rule"
assert_match "remove went through sudo" "$(cat "$FAKE_SUDO_LOG")" "/bin/rm -f $target"

"$cli" sudoers on >/dev/null 2>&1
"$cli" sudoers off >/dev/null 2>&1
assert_no_file "$target" "off deletes the rule"
assert_fails "manifest forgets it" sc_manifest_mode "$target"

t_done
