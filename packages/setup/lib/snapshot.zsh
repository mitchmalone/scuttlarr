# snapshot.zsh — what every defaults key was before scuttlarr touched it.
#
#   <domain>\t<key>\t<host>\t<value>
#
# host is `currentHost` or `-`; value is the raw `defaults read` output with
# newlines escaped, or the marker `<absent>`. A key is recorded once, the first
# time apply is about to write it — never updated afterwards, so `remove` can
# put the machine back the way it was found (docs/ARCHITECTURE.md, "the
# snapshot precedes the first write").

SC_ABSENT='<absent>'
_sc_nl=$'\n'

sc_snapshot_path() { print -r -- "$SCUTTLARR_STATE/defaults.before"; }

# sc_snapshot_has <domain> <key> <host>
sc_snapshot_has() {
  emulate -L zsh
  local file line parts
  file="$(sc_snapshot_path)"
  [[ -f "$file" ]] || return 1
  while IFS= read -r line; do
    parts=("${(s:	:)line}")
    [[ "$parts[1]" == "$1" && "$parts[2]" == "$2" && "$parts[3]" == "$3" ]] && return 0
  done < "$file"
  return 1
}

# sc_snapshot_get <domain> <key> <host> → value (or the absent marker), status 1 if not recorded.
sc_snapshot_get() {
  emulate -L zsh
  local file line parts
  file="$(sc_snapshot_path)"
  [[ -f "$file" ]] || return 1
  while IFS= read -r line; do
    parts=("${(s:	:)line}")
    if [[ "$parts[1]" == "$1" && "$parts[2]" == "$2" && "$parts[3]" == "$3" ]]; then
      print -r -- "${parts[4]//\\n/$_sc_nl}"
      return 0
    fi
  done < "$file"
  return 1
}

# sc_snapshot_record <domain> <key> <host> <current-value-or-absent>
# No-op if already recorded: the first observation is the one that counts.
sc_snapshot_record() {
  emulate -L zsh
  local domain="$1" key="$2" host="$3" value="$4"
  sc_snapshot_has "$domain" "$key" "$host" && return 0
  sc_state_init
  print -r -- "${domain}	${key}	${host}	${value//$_sc_nl/\\n}" >> "$(sc_snapshot_path)"
}
