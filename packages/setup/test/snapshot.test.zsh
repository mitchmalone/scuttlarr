#!/bin/zsh
source "${0:A:h}/harness.zsh"

assert_fails "nothing recorded" sc_snapshot_has com.apple.dock autohide -
sc_snapshot_record com.apple.dock autohide - 0
assert_ok "recorded" sc_snapshot_has com.apple.dock autohide -
assert_eq 0 "$(sc_snapshot_get com.apple.dock autohide -)" "value"

# First observation wins.
sc_snapshot_record com.apple.dock autohide - 1
assert_eq 0 "$(sc_snapshot_get com.apple.dock autohide -)" "not overwritten"

# Absent marker and host are part of the identity.
sc_snapshot_record NSGlobalDomain com.apple.mouse.tapBehavior currentHost "$SC_ABSENT"
assert_eq "$SC_ABSENT" "$(sc_snapshot_get NSGlobalDomain com.apple.mouse.tapBehavior currentHost)" "absent recorded"
assert_fails "other host not recorded" sc_snapshot_has NSGlobalDomain com.apple.mouse.tapBehavior -

# Multi-line values survive the round trip.
sc_snapshot_record com.apple.terminal StringEncodings - $'(\n    4\n)'
assert_eq $'(\n    4\n)' "$(sc_snapshot_get com.apple.terminal StringEncodings -)" "multiline"

t_done
