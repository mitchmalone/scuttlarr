# doctor.zsh — what differs from base ⊕ overlay. Read-only, always.
#
# Walks: the defaults files in check mode (drift per key), every manifest entry
# (symlink intact? generated file present and unchanged? adopted original still
# parked?), and the presence of the desktop layer. Exit 1 on any drift so it
# can gate `update`.

sc_doctor() {
  emulate -L zsh
  local -i problems=0

  sc_head "scuttlarr"
  sc_log "base    $(sc_tilde "$SCUTTLARR_BASE")"
  if [[ -d "$SCUTTLARR_OVERLAY" ]]; then
    sc_log "overlay $(sc_tilde "$SCUTTLARR_OVERLAY")"
  else
    sc_log "overlay $(sc_tilde "$SCUTTLARR_OVERLAY") (none — that's fine)"
  fi
  if [[ -f "$(sc_manifest_path)" ]]; then
    sc_log "state   $(sc_tilde "$SCUTTLARR_STATE") ($(sc_manifest_list | wc -l | tr -d ' ') owned paths)"
  else
    sc_log "state   $(sc_tilde "$SCUTTLARR_STATE") (nothing applied yet)"
  fi

  # Defaults: every key in base + overlay, checked.
  sc_defaults_run check
  if (( SC_DEFAULTS_CHANGED == 0 )); then
    sc_ok "defaults: ${SC_DEFAULTS_SEEN} keys as declared"
  else
    sc_warn "defaults: ${SC_DEFAULTS_CHANGED} of ${SC_DEFAULTS_SEEN} keys differ — \`scuttlarr defaults\` shows the plan, \`--apply\` fixes"
    (( problems += SC_DEFAULTS_CHANGED ))
  fi

  # Shell layer: every generated config, re-rendered and compared.
  sc_shell_run check
  if (( SC_SHELL_CHANGED == 0 )); then
    sc_ok "shell: ${SC_SHELL_SEEN} files as rendered"
  else
    local plugins=''; (( SC_SHELL_PLUGINS )) && plugins=", ${SC_SHELL_PLUGINS} plugin(s) not cloned"
    sc_warn "shell: $(( SC_SHELL_CHANGED - SC_SHELL_PLUGINS )) of ${SC_SHELL_SEEN} files differ${plugins} — \`scuttlarr shell\` shows the plan, \`--apply\` fixes"
    (( problems += SC_SHELL_CHANGED ))
  fi

  # Manifest: every owned path.
  sc_head "owned paths"
  local -i before=$problems
  local line parts mode target source block
  local -i checked=0
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    parts=("${(s:	:)line}"); mode="$parts[1]"; target="$parts[2]"; source="$parts[3]"
    (( checked++ ))
    case "$mode" in
      symlink)
        if [[ ! -L "$target" ]]; then
          sc_warn "$(sc_tilde "$target"): should be a symlink to base, isn't"; (( problems++ ))
        elif [[ "${target:A}" != "${source:A}" ]]; then
          sc_warn "$(sc_tilde "$target"): links to ${target:A}, not $(sc_tilde "$source")"; (( problems++ ))
        fi ;;
      generated)
        if [[ ! -f "$target" ]]; then
          sc_warn "$(sc_tilde "$target"): missing (generated)"; (( problems++ ))
        elif [[ "$(sc_hash "$target")" != "$source" ]]; then
          sc_warn "$(sc_tilde "$target"): edited since scuttlarr wrote it"; (( problems++ ))
        fi ;;
      adopted)
        if [[ ! -e "$source" ]]; then
          sc_warn "$(sc_tilde "$target"): its adopted original is gone from $(sc_tilde "$source")"; (( problems++ ))
        fi ;;
      touched)
        if ! block="$(sc_touched_block "$target")"; then
          sc_warn "$(sc_tilde "$target"): the scuttlarr include is gone"; (( problems++ ))
        elif [[ "$(print -r -- "$block" | shasum -a 256 | cut -d' ' -f1)" != "$source" ]]; then
          sc_warn "$(sc_tilde "$target"): the scuttlarr include was edited"; (( problems++ ))
        fi ;;
      *) sc_warn "$(sc_tilde "$target"): unknown manifest mode '$mode'"; (( problems++ )) ;;
    esac
  done < <(sc_manifest_list)
  (( checked == 0 )) && sc_log "none yet"
  (( checked > 0 && problems == before )) && sc_ok "$checked owned paths intact"

  # Desktop layer.
  sc_head "desktop layer"
  if [[ -d /Applications/launcharr.app ]]; then sc_ok "launcharr installed"; else sc_log "launcharr not installed (the install step will add it)"; fi
  if command -v aerospace >/dev/null 2>&1; then sc_ok "aerospace on PATH"; else sc_log "aerospace not found"; fi

  print >&2
  if (( problems == 0 )); then
    sc_ok "no drift"
    return 0
  else
    sc_warn "$problems thing(s) differ from base ⊕ overlay"
    return 1
  fi
}
