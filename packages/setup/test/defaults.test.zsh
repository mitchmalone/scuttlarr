#!/bin/zsh
source "${0:A:h}/harness.zsh"

# ---- plan: reports, never writes ----
t_seed com.apple.dock autohide 0
t_seed com.apple.dock tilesize 48
SC_MODE=plan
sc_defaults_reset
sc_default com.apple.dock autohide bool true 2>/dev/null
sc_default com.apple.dock tilesize int 48 2>/dev/null
sc_default com.apple.dock autohide-delay float 1000 2>/dev/null
assert_eq 3 "$SC_DEFAULTS_SEEN" "plan saw three"
assert_eq 2 "$SC_DEFAULTS_CHANGED" "plan: two differ (one absent)"
assert_eq 0 "$(t_read read com.apple.dock autohide)" "plan wrote nothing"
assert_no_file "$(sc_snapshot_path)" "plan took no snapshot"

# ---- apply: snapshot, write, read back ----
SC_MODE=apply
sc_defaults_reset
sc_default com.apple.dock autohide bool true 2>/dev/null
sc_default com.apple.dock tilesize int 48 2>/dev/null
sc_default com.apple.dock autohide-delay float 1000 2>/dev/null
assert_eq 2 "$SC_DEFAULTS_CHANGED" "apply changed two"
assert_eq 0 "$SC_DEFAULTS_FAILED" "apply failed none"
assert_eq 1 "$(t_read read com.apple.dock autohide)" "bool written as 1"
assert_eq 1000 "$(t_read read com.apple.dock autohide-delay)" "float written"
assert_eq 0 "$(sc_snapshot_get com.apple.dock autohide -)" "snapshot has the prior value"
assert_eq "$SC_ABSENT" "$(sc_snapshot_get com.apple.dock autohide-delay -)" "snapshot has absent"
assert_fails "unchanged key not snapshotted" sc_snapshot_has com.apple.dock tilesize -
assert_eq 1 "${SC_DEFAULTS_TOUCHED[com.apple.dock]-}" "dock touched"

# Second apply is a no-op.
sc_defaults_reset
sc_default com.apple.dock autohide bool true 2>/dev/null
sc_default com.apple.dock autohide-delay float 1000 2>/dev/null
assert_eq 0 "$SC_DEFAULTS_CHANGED" "idempotent"

# ---- normalisation ----
SC_MODE=check
t_seed NSGlobalDomain QLPanelAnimationDuration 0
sc_defaults_reset
sc_default NSGlobalDomain QLPanelAnimationDuration float 0 2>/dev/null
assert_eq 0 "$SC_DEFAULTS_CHANGED" "0 == 0 (float)"
t_seed com.apple.dock expose-animation-duration 0.1000000014901161
sc_defaults_reset
sc_default com.apple.dock expose-animation-duration float 0.1 2>/dev/null
assert_eq 0 "$SC_DEFAULTS_CHANGED" "0.1 == 0.1000000014901161 (float tolerance)"
t_seed com.apple.dock tilesize 47
sc_defaults_reset
sc_default com.apple.dock tilesize int 48 2>/dev/null
assert_eq 1 "$SC_DEFAULTS_CHANGED" "47 != 48 still differs"
t_seed com.apple.finder ShowPathbar 1
sc_defaults_reset
sc_default com.apple.finder ShowPathbar bool true 2>/dev/null
assert_eq 0 "$SC_DEFAULTS_CHANGED" "true == 1 (bool)"
t_seed com.apple.terminal StringEncodings $'(\\n    4\\n)'
sc_defaults_reset
sc_default com.apple.terminal StringEncodings array 4 2>/dev/null
assert_eq 0 "$SC_DEFAULTS_CHANGED" "array block == 4"
t_seed com.apple.finder FXPreferredViewStyle Nlsv
sc_defaults_reset
sc_default com.apple.finder FXPreferredViewStyle string icnv 2>/dev/null
assert_eq 1 "$SC_DEFAULTS_CHANGED" "string differs"

# ---- currentHost is a separate key ----
t_seed -currentHost NSGlobalDomain com.apple.mouse.tapBehavior 1
sc_defaults_reset
sc_default -currentHost NSGlobalDomain com.apple.mouse.tapBehavior int 1 2>/dev/null
sc_default NSGlobalDomain com.apple.mouse.tapBehavior int 1 2>/dev/null
assert_eq 1 "$SC_DEFAULTS_CHANGED" "global copy absent, currentHost fine"

# ---- the runner sources base then overlay ----
mkdir -p "$SCUTTLARR_OVERLAY"
print 'sc_default com.apple.dock tilesize int 64' > "$SCUTTLARR_OVERLAY/defaults.sh"
sc_defaults_run plan 2>/dev/null
assert_ok "base keys counted" test "$SC_DEFAULTS_SEEN" -gt 60
sc_defaults_run apply 2>/dev/null
assert_eq 64 "$(t_read read com.apple.dock tilesize)" "overlay wins (last declaration)"
assert_eq 47 "$(sc_snapshot_get com.apple.dock tilesize -)" "snapshot holds the pre-scuttlarr value"
sc_defaults_run check 2>/dev/null
assert_eq 0 "$SC_DEFAULTS_CHANGED" "after apply, check is clean"

t_done
