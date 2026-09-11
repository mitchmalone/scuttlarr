#!/bin/zsh
source "${0:A:h}/harness.zsh"

assert_eq "" "$(sc_manifest_list)" "empty manifest lists nothing"
assert_fails "get on empty" sc_manifest_get /x

sc_manifest_add generated "$HOME/.zshrc" abc123 shell
sc_manifest_add symlink "$HOME/.config/tmux/tmux.conf" "$SCUTTLARR_BASE/shell/tmux.conf" terminal
assert_eq "generated	$HOME/.zshrc	abc123	shell" "$(sc_manifest_get "$HOME/.zshrc")" "get returns the line"
assert_eq generated "$(sc_manifest_mode "$HOME/.zshrc")" "mode"
assert_eq symlink "$(sc_manifest_mode "$HOME/.config/tmux/tmux.conf")" "second entry"
assert_eq 2 "$(sc_manifest_list | wc -l | tr -d ' ')" "two lines"

# Re-adding a path replaces, never duplicates.
sc_manifest_add generated "$HOME/.zshrc" def456 shell
assert_eq 2 "$(sc_manifest_list | wc -l | tr -d ' ')" "still two lines"
assert_eq "generated	$HOME/.zshrc	def456	shell" "$(sc_manifest_get "$HOME/.zshrc")" "replaced"

sc_manifest_remove "$HOME/.zshrc"
assert_fails "removed" sc_manifest_get "$HOME/.zshrc"
assert_eq 1 "$(sc_manifest_list | wc -l | tr -d ' ')" "one left"
sc_manifest_remove /never/there   # no-op, no error

t_done
