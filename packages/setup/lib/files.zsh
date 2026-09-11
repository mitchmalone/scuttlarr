# files.zsh — owned files: generated content, adopt-never-overwrite.
#
#   sc_file_generated <path> <layer>  < content
#
# plan:  say what would happen (create / adopt+write / rewrite / unchanged)
# apply: adopt a foreign file (move it to state/adopted/<relative path>),
#        write the content, record `generated` + hash in the manifest
# check: drift if missing or its hash differs from the manifest's record

typeset -gi SC_FILES_SEEN=0 SC_FILES_CHANGED=0

sc_files_reset() { SC_FILES_SEEN=0 SC_FILES_CHANGED=0; }

# Where a pre-existing file goes: state/adopted/<path relative to $HOME>, or
# the absolute path under adopted/ for anything outside $HOME.
sc_adopted_path() {
  local p="$1"
  [[ "$p" == "$HOME"/* ]] && p="${p#$HOME/}"
  print -r -- "$SCUTTLARR_STATE/adopted/${p#/}"
}

sc_file_generated() {
  emulate -L zsh
  local target="$1" layer="$2" mode="${SC_MODE:-plan}" content tmp
  content="$(cat; print -n x)"; content="${content%x}"   # keep trailing newlines
  (( SC_FILES_SEEN++ ))
  local shown; shown="$(sc_tilde "$target")"
  local owned=0; sc_manifest_get "$target" >/dev/null && owned=1

  # What's there now?
  local state=absent
  if [[ -e "$target" || -L "$target" ]]; then
    if (( owned )); then state=owned; else state=foreign; fi
  fi
  local same=0
  if [[ "$state" != absent && -f "$target" ]] && [[ "$(cat "$target"; print -n x)" == "${content}x" ]]; then same=1; fi

  case "$mode" in
    plan)
      case "$state" in
        absent)  (( SC_FILES_CHANGED++ )); sc_log "$shown: create" ;;
        foreign) (( SC_FILES_CHANGED++ )); sc_log "$shown: exists and isn't ours → adopt (move to $(sc_tilde "$(sc_adopted_path "$target")")), then write" ;;
        owned)   (( same )) || { (( SC_FILES_CHANGED++ )); sc_log "$shown: rewrite" ; } ;;
      esac ;;
    check)
      if [[ "$state" == absent ]]; then
        (( SC_FILES_CHANGED++ )); sc_warn "$shown: missing"
      elif (( ! owned )); then
        (( SC_FILES_CHANGED++ )); sc_warn "$shown: exists but not in the manifest"
      elif (( ! same )); then
        (( SC_FILES_CHANGED++ )); sc_warn "$shown: content differs from base"
      fi ;;
    apply)
      if [[ "$state" == owned && $same -eq 1 ]]; then return 0; fi
      if [[ "$state" == foreign ]]; then
        local dest; dest="$(sc_adopted_path "$target")"
        mkdir -p "${dest:h}"
        mv -f "$target" "$dest"
        sc_manifest_add adopted "$target" "$dest" "$layer"
        sc_log "$shown: adopted → $(sc_tilde "$dest")"
      fi
      mkdir -p "${target:h}"
      print -rn -- "$content" | sc_write_atomic "$target"
      sc_manifest_add generated "$target" "$(sc_hash "$target")" "$layer"
      (( SC_FILES_CHANGED++ ))
      sc_ok "$shown: written" ;;
    *) sc_die "SC_MODE must be plan, apply or check (got '$mode')" ;;
  esac
  return 0
}
