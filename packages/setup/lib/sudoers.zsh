# sudoers.zsh — scuttlarr's one root-owned path: a sudoers rule that lets the
# app's `awake` switch macOS sleep off while a hold is armed, and back on
# (DECISIONS 2026-10-01). Exactly two commands, for this user only, no
# password; nothing else gains root. The app runs `sudo -n`, so without this
# file it never asks — it just holds on power assertions alone.
#
# Installed 0444 (root-owned, never writable but readable) so `doctor` can
# check its hash without sudo. Recorded in the manifest as mode `root`, which
# `remove` undoes with one more sudo.

sc_sudoers_path() { print -r -- "${SCUTTLARR_SUDOERS_PATH:-/etc/sudoers.d/scuttlarr}"; }

# sudo, or the test fixture standing in for it.
_sc_sudo() { "${SCUTTLARR_SUDO_BIN:-/usr/bin/sudo}" "$@"; }

sc_sudoers_rule() {
  local user="${USER:-$(id -un)}"
  cat <<RULE
# Written by \`scuttlarr sudoers on\`; \`scuttlarr sudoers off\` removes it.
# Lets scuttlarr's awake switch macOS sleep off while a hold is armed, and back on.
Cmnd_Alias SCUTTLARR_SLEEP = /usr/bin/pmset -a disablesleep 1, /usr/bin/pmset -a disablesleep 0
${user} ALL=(root) NOPASSWD: SCUTTLARR_SLEEP
RULE
}

# on | off | status
sc_sudoers() {
  emulate -L zsh
  local verb="${1:-status}" target tmp want
  target="$(sc_sudoers_path)"
  case "$verb" in
    on)
      tmp="$(mktemp "${TMPDIR:-/tmp}/scuttlarr-sudoers.XXXXXX")"
      sc_sudoers_rule > "$tmp"
      want="$(sc_hash "$tmp")"
      if [[ -f "$target" && "$(sc_hash "$target")" == "$want" ]]; then
        rm -f "$tmp"
        sc_manifest_add root "$target" "$want" awake
        sc_ok "$target: already in place"
        return 0
      fi
      if ! "${SCUTTLARR_VISUDO_BIN:-/usr/sbin/visudo}" -cf "$tmp" >/dev/null; then
        rm -f "$tmp"
        sc_die "the rule failed visudo's check — nothing installed"
      fi
      sc_log "installing $target (sudo asks for your password once)"
      if ! _sc_sudo /usr/bin/install -m 0444 -o root -g wheel "$tmp" "$target"; then
        rm -f "$tmp"
        sc_die "install refused — nothing changed"
      fi
      rm -f "$tmp"
      sc_manifest_add root "$target" "$want" awake
      sc_ok "$target: awake can now switch macOS sleep off while it holds" ;;
    off)
      if [[ ! -e "$target" ]]; then
        sc_manifest_remove "$target"
        sc_ok "$target: not installed"
        return 0
      fi
      sc_log "removing $target (sudo may ask for your password)"
      _sc_sudo /bin/rm -f "$target" || sc_die "remove refused — left in place"
      sc_manifest_remove "$target"
      sc_ok "$target: removed; awake holds on power assertions alone" ;;
    status)
      if [[ ! -f "$target" ]]; then
        sc_log "off — awake can't switch macOS sleep off (\`scuttlarr sudoers on\`)"
        return 1
      fi
      tmp="$(mktemp "${TMPDIR:-/tmp}/scuttlarr-sudoers.XXXXXX")"
      sc_sudoers_rule > "$tmp"
      want="$(sc_hash "$tmp")"; rm -f "$tmp"
      if [[ "$(sc_hash "$target" 2>/dev/null)" == "$want" ]]; then
        sc_ok "on — $target"
      else
        sc_warn "$target differs from the rule scuttlarr writes — \`scuttlarr sudoers on\` rewrites it"
        return 1
      fi ;;
    *) sc_die "sudoers: on | off | status" ;;
  esac
}
