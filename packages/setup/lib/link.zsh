# link.zsh — `scuttlarr` on PATH: ~/.local/bin/scuttlarr → base/bin/scuttlarr.
#
# One symlink, owned like any other path: a `symlink` line (layer cli) in the
# manifest, so doctor checks it and remove takes it away. Whatever already
# sits there and isn't ours is adopted (moved under state/adopted/), never
# overwritten — the rule files.zsh follows.
#
#   sc_link_run   <plan|apply>   create / relink / adopt+link / unchanged
#   sc_unlink_run <plan|apply>   remove the link, put an adopted original back

typeset -gi SC_LINK_CHANGED=0

sc_link_path()   { print -r -- "$HOME/.local/bin/scuttlarr"; }
sc_link_source() { print -r -- "$SCUTTLARR_BASE/bin/scuttlarr"; }

# The link is no use if its directory isn't on PATH; say so.
sc_link_path_hint() {
  local dir="$HOME/.local/bin"
  (( ${path[(Ie)$dir]} )) && return 0
  sc_warn "$(sc_tilde "$dir") is not on PATH — add \`path=(\$HOME/.local/bin \$path)\` to your zshrc"
}

sc_link_run() {
  emulate -L zsh
  local mode="${1:-plan}" target source shown
  target="$(sc_link_path)"; source="$(sc_link_source)"; shown="$(sc_tilde "$target")"
  SC_LINK_CHANGED=0
  local owned=0; sc_manifest_get "$target" >/dev/null && owned=1

  # What's there now?
  local state=absent
  if [[ -e "$target" || -L "$target" ]]; then
    if (( owned )); then state=owned; else state=foreign; fi
  fi
  local same=0
  [[ -L "$target" && "${target:A}" == "${source:A}" ]] && same=1

  case "$mode" in
    plan)
      case "$state" in
        absent)  (( SC_LINK_CHANGED++ )); sc_log "$shown: link → $(sc_tilde "$source")" ;;
        foreign)
          (( SC_LINK_CHANGED++ ))
          if (( same )); then
            sc_log "$shown: already links to base but isn't in the manifest → record"
          else
            sc_log "$shown: exists and isn't ours → adopt (move to $(sc_tilde "$(sc_adopted_path "$target")")), then link"
          fi ;;
        owned)   (( same )) || { (( SC_LINK_CHANGED++ )); sc_log "$shown: relink → $(sc_tilde "$source")"; } ;;
      esac ;;
    apply)
      if [[ "$state" == owned && $same -eq 1 ]]; then
        sc_ok "$shown: unchanged"
        sc_link_path_hint
        return 0
      fi
      if [[ "$state" == foreign && $same -eq 0 ]]; then
        local dest; dest="$(sc_adopted_path "$target")"
        mkdir -p "${dest:h}"
        mv -f "$target" "$dest"
        sc_manifest_add adopted "$target" "$dest" cli
        sc_log "$shown: adopted → $(sc_tilde "$dest")"
      fi
      mkdir -p "${target:h}"
      sc_symlink_atomic "$source" "$target" || return 1
      sc_manifest_add symlink "$target" "$source" cli
      (( SC_LINK_CHANGED++ ))
      sc_ok "$shown → $(sc_tilde "$source")"
      sc_link_path_hint ;;
    *) sc_die "mode must be plan or apply (got '$mode')" ;;
  esac
  return 0
}

sc_unlink_run() {
  emulate -L zsh
  local mode="${1:-plan}" target shown
  target="$(sc_link_path)"; shown="$(sc_tilde "$target")"
  SC_LINK_CHANGED=0
  if ! sc_manifest_get "$target" >/dev/null; then
    if [[ -e "$target" || -L "$target" ]]; then
      sc_warn "$shown: exists but isn't ours — left alone"
      return 1
    fi
    sc_log "$shown: nothing to unlink"
    return 0
  fi
  case "$mode" in
    plan)
      (( SC_LINK_CHANGED++ ))
      [[ -L "$target" ]] && sc_log "$shown: remove link"
      sc_adopted_has "$target" && sc_log "$shown: restore original from $(sc_tilde "$(sc_adopted_path "$target")")" ;;
    apply)
      [[ -L "$target" ]] && rm -f "$target"
      if sc_adopted_has "$target"; then
        sc_adopted_restore "$target" && sc_log "$shown: original restored"
      fi
      sc_manifest_remove "$target"
      (( SC_LINK_CHANGED++ ))
      sc_ok "$shown: unlinked" ;;
    *) sc_die "mode must be plan or apply (got '$mode')" ;;
  esac
  return 0
}
