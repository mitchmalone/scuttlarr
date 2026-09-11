# remove.zsh — leave the machine the way it was found (docs/SETUP.md, "Reversal").
#
# The manifest in reverse: symlinks unlinked, generated files deleted, adopted
# originals moved back. Then every defaults key back to its snapshot (a key
# that had no value is deleted). Then the manifest, the snapshot and the
# migrations record go. The overlay is never touched — it's yours — and the
# app's own files in the state directory stay. Homebrew, the app and the base
# checkout are out of scope here.
#
#   sc_remove_run <plan|apply>

typeset -gi SC_REMOVE_PATHS=0 SC_REMOVE_RESTORED=0 SC_REMOVE_DEFAULTS=0 SC_REMOVE_CHANGED=0

sc_remove_reset() { SC_REMOVE_PATHS=0 SC_REMOVE_RESTORED=0 SC_REMOVE_DEFAULTS=0 SC_REMOVE_CHANGED=0; }

sc_remove_run() {
  emulate -L zsh
  local mode="${1:-plan}"
  [[ "$mode" == plan || "$mode" == apply ]] || sc_die "mode must be plan or apply (got '$mode')"
  sc_remove_reset
  _sc_remove_paths "$mode"
  _sc_remove_defaults "$mode"
  _sc_remove_state "$mode"
  return 0
}

# Owned paths, newest first, so a path written over an adopted original is
# cleared before the original goes back.
_sc_remove_paths() {
  emulate -L zsh
  local mode="$1" line parts m target source shown note
  local -a lines
  local -i i
  lines=("${(@f)$(sc_manifest_list)}")
  for (( i = ${#lines}; i >= 1; i-- )); do
    line="$lines[i]"; [[ -n "$line" ]] || continue
    parts=("${(s:	:)line}"); m="$parts[1]"; target="$parts[2]"; source="$parts[3]"
    shown="$(sc_tilde "$target")"
    case "$m" in
      symlink)
        if [[ -L "$target" ]]; then
          (( SC_REMOVE_PATHS++, SC_REMOVE_CHANGED++ ))
          if [[ "$mode" == apply ]]; then rm -f "$target"; sc_ok "$shown: link removed"; else sc_log "$shown: remove link"; fi
        elif [[ -e "$target" ]]; then
          sc_warn "$shown: no longer a symlink — left alone"
        fi ;;
      generated)
        if [[ -f "$target" && ! -L "$target" ]]; then
          (( SC_REMOVE_PATHS++, SC_REMOVE_CHANGED++ ))
          note=''; [[ "$(sc_hash "$target")" == "$source" ]] || note=' (edited since scuttlarr wrote it)'
          if [[ "$mode" == apply ]]; then rm -f "$target"; sc_ok "$shown: removed${note}"; else sc_log "$shown: remove${note}"; fi
        fi ;;
      adopted)
        if [[ -L "$target" || -f "$target" ]]; then
          (( SC_REMOVE_PATHS++, SC_REMOVE_CHANGED++ ))
          if [[ "$mode" == apply ]]; then rm -f "$target"; sc_ok "$shown: removed"; else sc_log "$shown: remove"; fi
        fi ;;
      *) sc_warn "$shown: unknown manifest mode '$m' — left alone" ;;
    esac
    if sc_adopted_has "$target"; then
      (( SC_REMOVE_RESTORED++, SC_REMOVE_CHANGED++ ))
      if [[ "$mode" == apply ]]; then
        sc_adopted_restore "$target" && sc_ok "$shown: original restored"
      else
        sc_log "$shown: restore original from $(sc_tilde "$(sc_adopted_path "$target")")"
      fi
    fi
    [[ "$mode" == apply ]] && sc_manifest_remove "$target"
  done
  return 0
}

# Every snapshotted key back to what it was. The snapshot holds `defaults read`
# output, not a type, so the write is untyped: `defaults` parses the value as
# a plist fragment, which is how it printed it.
_sc_remove_defaults() {
  emulate -L zsh
  local mode="$1" file line parts domain key host value label
  local -a cmd
  file="$(sc_snapshot_path)"
  [[ -f "$file" ]] || return 0
  SC_DEFAULTS_TOUCHED=()
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    parts=("${(s:	:)line}"); domain="$parts[1]"; key="$parts[2]"; host="$parts[3]"
    value="${parts[4]-}"; value="${value//\\n/$_sc_nl}"
    label="${domain} ${key}"; [[ "$host" == currentHost ]] && label="${label} (currentHost)"
    cmd=("$SCUTTLARR_DEFAULTS_BIN"); [[ "$host" == currentHost ]] && cmd+=(-currentHost)
    (( SC_REMOVE_DEFAULTS++, SC_REMOVE_CHANGED++ ))
    if [[ "$value" == "$SC_ABSENT" ]]; then
      if [[ "$mode" == apply ]]; then
        "${cmd[@]}" delete "$domain" "$key" 2>/dev/null || true   # already gone is fine
        sc_ok "$label: deleted (had no value)"
      else
        sc_log "$label: delete (had no value)"
      fi
    else
      if [[ "$mode" == apply ]]; then
        if "${cmd[@]}" write "$domain" "$key" "$value" 2>/dev/null; then
          sc_ok "$label: → ${value//$_sc_nl/ }"
        else
          sc_err "$label: could not restore ${value//$_sc_nl/ }"
        fi
      else
        sc_log "$label: → ${value//$_sc_nl/ }"
      fi
    fi
    SC_DEFAULTS_TOUCHED[$domain]=1
  done < "$file"
  [[ "$mode" == apply ]] && _sc_defaults_restart_apps
  return 0
}

# The CLI's own records. Only these: the app keeps its files in the same directory.
_sc_remove_state() {
  emulate -L zsh
  local mode="$1" f
  for f in "$(sc_manifest_path)" "$(sc_snapshot_path)" "$(sc_migrations_record)"; do
    [[ -f "$f" ]] || continue
    (( SC_REMOVE_CHANGED++ ))
    if [[ "$mode" == apply ]]; then rm -f "$f"; sc_ok "$(sc_tilde "$f"): removed"; else sc_log "$(sc_tilde "$f"): remove"; fi
  done
  # adopted/ is empty once every original is back; drop the empty tree.
  if [[ "$mode" == apply && -d "$SCUTTLARR_STATE/adopted" ]]; then
    find "$SCUTTLARR_STATE/adopted" -type d -empty -delete 2>/dev/null || true
  fi
  return 0
}
