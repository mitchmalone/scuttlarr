#!/bin/zsh
source "${0:A:h}/harness.zsh"
cli="$SCUTTLARR_BASE/bin/scuttlarr"
theme="$HOME/.local/state/scuttlarr/current/theme"
zshrc="$HOME/.zshrc"
p10k="$HOME/.p10k.zsh"
ghostty="$HOME/.config/ghostty/config"
tmux="$HOME/.config/tmux/tmux.conf"
gitours="$HOME/.config/git/scuttlarr.gitconfig"
gitcfg="$HOME/.config/git/config"
plugins="$HOME/.local/share/zsh/plugins"

# ---- plan on an empty home: creates listed, nothing written ----
out="$("$cli" shell 2>&1)"; rc=$?
assert_eq 0 "$rc" "plan exits 0"
assert_match "plan: zshrc" "$out" "~/.zshrc: create"
assert_match "plan: p10k" "$out" "~/.p10k.zsh: create"
assert_match "plan: ghostty" "$out" "~/.config/ghostty/config: create"
assert_match "plan: tmux" "$out" "~/.config/tmux/tmux.conf: create"
assert_match "plan: gitconfig" "$out" "~/.config/git/scuttlarr.gitconfig: create"
assert_match "plan: include stanza" "$out" "~/.config/git/config: create with the scuttlarr include"
assert_match "plan: plugins" "$out" "powerlevel10k: clone"
assert_match "plan says how to apply" "$out" "--apply"
assert_no_file "$zshrc" "plan wrote nothing"
assert_no_file "$(sc_manifest_path)" "plan touched no manifest"

# ---- a foreign ~/.zshrc and a user git config are in the way ----
print "their zshrc" > "$zshrc"
mkdir -p "${gitcfg:h}"; print -- $'[user]\n\tname = Them\n' > "$gitcfg"
mkdir -p "$SCUTTLARR_OVERLAY/zsh"
print "MARK_OVERLAY=1" > "$SCUTTLARR_OVERLAY/zsh/10-mine.zsh"
print "font-size = 99" > "$SCUTTLARR_OVERLAY/ghostty"
print 'set -g mouse off' > "$SCUTTLARR_OVERLAY/tmux.conf"
out="$("$cli" shell 2>&1)"
assert_match "plan: adopt zshrc" "$out" "~/.zshrc: exists and isn't ours → adopt"
assert_match "plan: append stanza" "$out" "~/.config/git/config: append the scuttlarr include"

# ---- apply ----
out="$("$cli" shell --apply --yes 2>&1)"; rc=$?
assert_eq 0 "$rc" "apply exits 0"
for f in "$zshrc" "$p10k" "$ghostty" "$tmux" "$gitours"; do
  assert_file "$f" "written: $f"
  assert_eq generated "$(sc_manifest_mode "$f")" "manifest generated: $f"
done
assert_eq "their zshrc" "$(cat "$(sc_adopted_path "$zshrc")")" "foreign zshrc parked under adopted/"
assert_match "says it adopted" "$out" ".zshrc: adopted"

# zshrc: instant prompt first, then base, overlay, local
zshrc_content="$(cat "$zshrc")"
assert_match "zshrc: instant prompt" "$zshrc_content" "p10k-instant-prompt"
assert_match "zshrc: base path baked in" "$zshrc_content" "$SCUTTLARR_BASE/shell"
assert_match "zshrc: overlay zsh sourced" "$zshrc_content" "$SCUTTLARR_OVERLAY/zsh"
assert_match "zshrc: local.zsh last" "$zshrc_content" "zsh/local.zsh"
assert_eq 0 "$(grep -c '@@' "$zshrc")" "zshrc: no placeholders left"
# and it actually runs: the overlay fragment is sourced
got="$(cd "$HOME" && PATH=/usr/bin:/bin zsh -f -c 'source "$HOME/.zshrc" >/dev/null 2>&1; print -r -- "${MARK_OVERLAY-unset}"')"
assert_eq 1 "$got" "zshrc sources the overlay fragment"

# p10k: theme colours imported, Dracula fallback inline, host = accent
p10k_content="$(cat "$p10k")"
assert_match "p10k: sources theme colours" "$p10k_content" "scuttlarr/current/theme/p10k-colors.zsh"
assert_match "p10k: dracula fallback" "$p10k_content" "#bd93f9"
assert_eq 0 "$(grep -ci 'dracula pro\|#9580FF' "$p10k")" "p10k: no Dracula Pro"

# ghostty: theme include, no theme = line, opinions kept, overlay appended
ghostty_content="$(cat "$ghostty")"
assert_match "ghostty: theme include" "$ghostty_content" "config-file = ?~/.local/state/scuttlarr/current/theme/ghostty"
assert_eq 0 "$(grep -c '^theme = ' "$ghostty")" "ghostty: no theme = line"
assert_match "ghostty: font" "$ghostty_content" "font-family = JetBrainsMono Nerd Font"
assert_eq "font-size = 99" "$(tail -n 1 "$ghostty")" "ghostty: overlay appended last"

# tmux: no hard-coded colours, overlay in, theme source last
assert_eq 0 "$(grep -c '#[0-9A-Fa-f]\{6\}' "$tmux")" "tmux: no hex colours"
assert_match "tmux: overlay in" "$(cat "$tmux")" "set -g mouse off"
assert_match "tmux: sesh keys kept" "$(cat "$tmux")" "sesh"
assert_eq "source-file -q ~/.local/state/scuttlarr/current/theme/tmux.conf" "$(tail -n 1 "$tmux")" "tmux: ends with the theme source"

# git: our file has the delta include; the user's config got the stanza once
assert_match "git: theme include" "$(cat "$gitours")" "path = ~/.local/state/scuttlarr/current/theme/delta.gitconfig"
assert_match "git: diff opinions" "$(cat "$gitours")" "algorithm = histogram"
assert_match "git: stanza appended" "$(cat "$gitcfg")" "path = ~/.config/git/scuttlarr.gitconfig"
assert_match "git: user's lines kept" "$(cat "$gitcfg")" "name = Them"
assert_eq 1 "$(grep -c 'scuttlarr.gitconfig' "$gitcfg")" "git: stanza once"
assert_eq touched "$(sc_manifest_mode "$gitcfg")" "manifest: touched"
assert_file "$SCUTTLARR_STATE/touched/.config/git/config" "git: pre-touch copy kept"

# plugins: cloned through git, once each
assert_eq 5 "$(wc -l < "$FAKE_GIT_LOG" | tr -d ' ')" "five plugins cloned"
assert_ok "p10k cloned" test -d "$plugins/powerlevel10k"
assert_ok "autosuggestions cloned" test -d "$plugins/zsh-autosuggestions"

# ---- second apply: no-op ----
out="$("$cli" shell --apply --yes 2>&1)"
assert_match "second apply is a no-op" "$out" "already as rendered"
assert_eq 5 "$(wc -l < "$FAKE_GIT_LOG" | tr -d ' ')" "no re-clone"
assert_eq 1 "$(grep -c 'scuttlarr.gitconfig' "$gitcfg")" "stanza still once"
"$cli" defaults --apply --yes >/dev/null 2>&1
assert_ok "doctor clean after shell apply" "$cli" doctor 2>/dev/null

# ---- drift: a hand edit is reported by check and by doctor ----
print "# tampered" >> "$tmux"
sc_shell_run check 2>/dev/null
assert_eq 1 "$SC_SHELL_CHANGED" "check sees the edit"
out="$("$cli" doctor 2>&1)"
assert_match "doctor names the file" "$out" "tmux.conf: content differs"
# the stanza going missing is drift too
cp "$SCUTTLARR_STATE/touched/.config/git/config" "$gitcfg"
sc_shell_run check 2>/dev/null
assert_eq 2 "$SC_SHELL_CHANGED" "check sees the stripped stanza"
"$cli" shell --apply --yes >/dev/null 2>&1
assert_eq 1 "$(grep -c 'scuttlarr.gitconfig' "$gitcfg")" "re-apply puts the stanza back once"
sc_shell_run check 2>/dev/null
assert_eq 0 "$SC_SHELL_CHANGED" "clean again"

# ---- no delta on PATH: the pager lines stay out, and say so ----
out="$(PATH=/usr/bin:/bin "$cli" shell 2>&1)"
assert_match "plan warns about delta" "$out" "delta"

# ---- remove reverses it all: originals back, stanza stripped ----
"$cli" remove --yes >/dev/null 2>&1
assert_eq "their zshrc" "$(cat "$zshrc")" "original zshrc restored"
assert_no_file "$p10k" "p10k removed"
assert_no_file "$ghostty" "ghostty removed"
assert_no_file "$tmux" "tmux removed"
assert_no_file "$gitours" "our gitconfig removed"
assert_eq $'[user]\n\tname = Them' "$(cat "$gitcfg")" "stanza stripped, user's config intact"
assert_no_file "$SCUTTLARR_STATE/touched" "touched/ copies gone"
assert_no_file "$(sc_manifest_path)" "manifest gone"

# a git config that we created from nothing goes away entirely on remove
rm -f "$gitcfg"
"$cli" shell --apply --yes >/dev/null 2>&1
assert_match "created with the stanza" "$(cat "$gitcfg")" "scuttlarr.gitconfig"
"$cli" remove --yes >/dev/null 2>&1
assert_no_file "$gitcfg" "empty-after-strip config deleted"

t_done
