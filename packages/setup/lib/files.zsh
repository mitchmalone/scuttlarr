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

# Is an original parked for <path>?
sc_adopted_has() {
  local orig; orig="$(sc_adopted_path "$1")"
  [[ -e "$orig" || -L "$orig" ]]
}

# Put a parked original back: state/adopted/<path> → <path>. Never overwrites
# whatever is at <path> now. Status 1 if nothing is parked, 2 if in the way.
sc_adopted_restore() {
  emulate -L zsh
  local target="$1" orig
  orig="$(sc_adopted_path "$target")"
  [[ -e "$orig" || -L "$orig" ]] || return 1
  if [[ -e "$target" || -L "$target" ]]; then
    sc_warn "$(sc_tilde "$target"): something is there, original left at $(sc_tilde "$orig")"
    return 2
  fi
  mkdir -p "${target:h}"
  mv -f "$orig" "$target"
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

# ---- touched: a stanza in a file that stays the user's ------------------------
#
#   sc_file_touched <path> <layer>  < stanza
#
# For a file we must not own (the user's git config): append the stanza once,
# bounded by markers, and record `touched` + the stanza's hash. The first
# append keeps a copy of the file under state/touched/<relative path>; remove
# strips the block (and deletes the file if that leaves it empty).

SC_TOUCH_BEGIN='# scuttlarr: begin (scuttlarr remove strips this block)'
SC_TOUCH_END='# scuttlarr: end'

sc_touched_copy_path() {
  local p="$1"
  [[ "$p" == "$HOME"/* ]] && p="${p#$HOME/}"
  print -r -- "$SCUTTLARR_STATE/touched/${p#/}"
}

# The block currently in <path>, markers included; status 1 if none.
sc_touched_block() {
  emulate -L zsh
  local file="$1"
  [[ -f "$file" ]] || return 1
  local -a lines; lines=("${(@f)$(<"$file")}")
  local -i b e
  b=${lines[(ie)$SC_TOUCH_BEGIN]}; (( b <= ${#lines} )) || return 1
  e=${lines[(ieb:b:)$SC_TOUCH_END]}; (( e <= ${#lines} )) || return 1
  print -rl -- "${(@)lines[b,e]}"
}

# <path> without the block. Prints the remainder; status 1 if there was no block.
sc_touched_strip() {
  emulate -L zsh
  local file="$1"
  [[ -f "$file" ]] || return 1
  local -a lines; lines=("${(@f)$(<"$file")}")
  local -i b e
  b=${lines[(ie)$SC_TOUCH_BEGIN]}; (( b <= ${#lines} )) || return 1
  e=${lines[(ieb:b:)$SC_TOUCH_END]}; (( e <= ${#lines} )) || return 1
  # the blank line we put before the block goes with it
  (( b > 1 )) && [[ -z "${lines[b-1]}" ]] && (( b-- ))
  lines[b,e]=()
  (( ${#lines} )) && print -rl -- "${(@)lines}"
  return 0
}

sc_file_touched() {
  emulate -L zsh
  local target="$1" layer="$2" mode="${SC_MODE:-plan}" stanza block
  stanza="$(cat)"
  block="${SC_TOUCH_BEGIN}"$'\n'"${stanza}"$'\n'"${SC_TOUCH_END}"
  (( SC_FILES_SEEN++ ))
  local shown; shown="$(sc_tilde "$target")"
  local have=''; have="$(sc_touched_block "$target")" || have=''
  local same=0; [[ "$have" == "$block" ]] && same=1
  local owned=0; sc_manifest_get "$target" >/dev/null && owned=1

  case "$mode" in
    plan)
      if (( same )); then :
      elif [[ -n "$have" ]]; then (( SC_FILES_CHANGED++ )); sc_log "$shown: update the scuttlarr include"
      elif [[ -e "$target" ]]; then (( SC_FILES_CHANGED++ )); sc_log "$shown: append the scuttlarr include (yours otherwise; a copy goes to $(sc_tilde "$(sc_touched_copy_path "$target")"))"
      else (( SC_FILES_CHANGED++ )); sc_log "$shown: create with the scuttlarr include"
      fi ;;
    check)
      if [[ -z "$have" ]]; then
        (( SC_FILES_CHANGED++ )); sc_warn "$shown: the scuttlarr include is missing"
      elif (( ! same )); then
        (( SC_FILES_CHANGED++ )); sc_warn "$shown: the scuttlarr include differs from base"
      fi ;;
    apply)
      if (( same && owned )); then return 0; fi
      local copy; copy="$(sc_touched_copy_path "$target")"
      if [[ -f "$target" && ! -f "$copy" ]]; then
        mkdir -p "${copy:h}"; cp -p "$target" "$copy"
      fi
      local rest=''
      if [[ -n "$have" ]]; then
        rest="$(sc_touched_strip "$target"; print -n x)"; rest="${rest%x}"
      elif [[ -f "$target" ]]; then
        rest="$(cat "$target"; print -n x)"; rest="${rest%x}"
      fi
      mkdir -p "${target:h}"
      {
        if [[ -n "$rest" ]]; then
          print -rn -- "$rest"
          [[ "$rest" == *$'\n' ]] || print
          print
        fi
        print -r -- "$block"
      } | sc_write_atomic "$target"
      sc_manifest_add touched "$target" "$(print -r -- "$block" | shasum -a 256 | cut -d' ' -f1)" "$layer"
      (( SC_FILES_CHANGED++ ))
      sc_ok "$shown: scuttlarr include in place" ;;
    *) sc_die "SC_MODE must be plan, apply or check (got '$mode')" ;;
  esac
  return 0
}

# Take the block out again (remove). Deletes the file if only whitespace is
# left and we made it; drops the pre-touch copy. Status 1 if there was no block.
sc_touched_revert() {
  emulate -L zsh
  local target="$1" rest copy
  copy="$(sc_touched_copy_path "$target")"
  rest="$(sc_touched_strip "$target"; print -n x)" || { rm -f "$copy"; return 1; }
  rest="${rest%x}"
  if [[ -z "${rest//[[:space:]]/}" ]]; then
    rm -f "$target"
  else
    print -rn -- "$rest" | sc_write_atomic "$target"
  fi
  rm -f "$copy"
  return 0
}
