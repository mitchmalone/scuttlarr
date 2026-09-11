# manifest.zsh — every path scuttlarr owns, and how (docs/ARCHITECTURE.md).
#
#   <mode>\t<path>\t<source-or-hash>\t<layer>
#
# One line per path; adding a path that is already listed replaces its line.
# Modes: symlink (→ base), generated (rendered; hash recorded), adopted (the
# original was moved to state/adopted/), touched (a marker-bounded stanza we
# appended to a file that stays the user's; the stanza's hash is recorded and
# remove strips it). This file is the whole basis for
# `doctor` and `remove` — a write that isn't here didn't happen, as far as
# scuttlarr is concerned.

sc_manifest_path() { print -r -- "$SCUTTLARR_STATE/manifest"; }

# sc_manifest_add <mode> <path> <source> <layer>
sc_manifest_add() {
  emulate -L zsh
  local mode="$1" target="$2" source="$3" layer="$4" file
  file="$(sc_manifest_path)"
  sc_state_init
  {
    if [[ -f "$file" ]]; then
      local line
      while IFS= read -r line; do
        [[ "${${(s:	:)line}[2]}" == "$target" ]] || print -r -- "$line"
      done < "$file"
    fi
    print -r -- "${mode}	${target}	${source}	${layer}"
  } | sc_write_atomic "$file"
}

# sc_manifest_get <path> → the line, or status 1.
sc_manifest_get() {
  emulate -L zsh
  local file line
  file="$(sc_manifest_path)"
  [[ -f "$file" ]] || return 1
  while IFS= read -r line; do
    if [[ "${${(s:	:)line}[2]}" == "$1" ]]; then
      print -r -- "$line"
      return 0
    fi
  done < "$file"
  return 1
}

# sc_manifest_mode <path> → symlink | generated | adopted | touched, or status 1.
sc_manifest_mode() {
  local line
  line="$(sc_manifest_get "$1")" || return 1
  print -r -- "${${(s:	:)line}[1]}"
}

# sc_manifest_remove <path>
sc_manifest_remove() {
  emulate -L zsh
  local file line
  file="$(sc_manifest_path)"
  [[ -f "$file" ]] || return 0
  {
    while IFS= read -r line; do
      [[ "${${(s:	:)line}[2]}" == "$1" ]] || print -r -- "$line"
    done < "$file"
  } | sc_write_atomic "$file"
}

# sc_manifest_list → every line (may be empty).
sc_manifest_list() {
  local file
  file="$(sc_manifest_path)"
  [[ -f "$file" ]] && cat "$file"
  return 0
}
