# defaults.zsh — the idempotent `defaults write` with read-back.
#
# A defaults file in defaults/ (or the overlay's defaults.sh) is a list of
#
#   sc_default [-currentHost] <domain> <key> <type> <value...>
#
# calls. The same file serves three verbs through $SC_MODE:
#   plan   print what would change, write nothing        (install step 3)
#   apply  snapshot the key if unseen, write, read back  (install step 5)
#   check  report drift                                  (doctor)
#
# sc_default always returns 0; outcomes accumulate in the counters below so a
# file of forty keys reads as one report, not forty exit codes.

typeset -gi SC_DEFAULTS_SEEN=0 SC_DEFAULTS_CHANGED=0 SC_DEFAULTS_FAILED=0
typeset -gA SC_DEFAULTS_TOUCHED   # domain → 1, for the post-apply killall

# Base ⊕ overlay is "last declaration wins": sc_defaults_run collects every
# sc_default call first (SC_COLLECT=1), then evaluates each key once with its
# final declaration. Called directly (tests, ad-hoc), sc_default acts at once.
typeset -gA _sc_decl              # id → host\tdomain\tkey\ttype\tvalues(NUL-joined)
typeset -ga _sc_decl_order

sc_defaults_reset() {
  SC_DEFAULTS_SEEN=0 SC_DEFAULTS_CHANGED=0 SC_DEFAULTS_FAILED=0
  SC_DEFAULTS_TOUCHED=()
}

# Read a key; prints the value or the absent marker. Never fails.
sc_defaults_read() {
  emulate -L zsh
  local host="$1" domain="$2" key="$3" out
  if [[ "$host" == currentHost ]]; then
    out="$("$SCUTTLARR_DEFAULTS_BIN" -currentHost read "$domain" "$key" 2>/dev/null)" || { print -r -- "$SC_ABSENT"; return 0; }
  else
    out="$("$SCUTTLARR_DEFAULTS_BIN" read "$domain" "$key" 2>/dev/null)" || { print -r -- "$SC_ABSENT"; return 0; }
  fi
  print -r -- "$out"
}

# Normalise a value for comparison. `defaults read` prints booleans as 1/0,
# floats as written (0.1, 1000), arrays as a parenthesised block.
_sc_norm() {
  emulate -L zsh
  local type="$1" value="$2"
  case "$type" in
    bool)
      case "${(L)value}" in
        true|yes|1) print -r -- 1 ;;
        false|no|0) print -r -- 0 ;;
        *) print -r -- "$value" ;;
      esac ;;
    array)
      # "(\n    4,\n    5\n)" → "4 5"
      value="${value//[(),]/ }"
      print -r -- "${(j: :)${=value}}" ;;
    *) print -r -- "$value" ;;
  esac
}

# Equal for the type: numeric types compare as numbers (0 == 0.0), else exact.
_sc_same() {
  emulate -L zsh
  local type="$1" a="$2" b="$3"
  [[ "$a" == "$SC_ABSENT" || "$b" == "$SC_ABSENT" ]] && { [[ "$a" == "$b" ]]; return }
  case "$type" in
    int|float|bool)
      if [[ "$a" =~ '^-?[0-9]+(\.[0-9]+)?$' && "$b" =~ '^-?[0-9]+(\.[0-9]+)?$' ]]; then
        # Floats come back from CFPreferences as binary approximations
        # (0.1 reads as 0.1000000014901161); a millionth is plenty.
        (( a - b < 0.000001 && b - a < 0.000001 ))
      else
        [[ "$a" == "$b" ]]
      fi ;;
    *) [[ "$a" == "$b" ]] ;;
  esac
}

# The `defaults write` argument list for a type.
_sc_write_args() {
  emulate -L zsh
  local type="$1"; shift
  case "$type" in
    bool)   print -rl -- "-bool" "$1" ;;
    int)    print -rl -- "-int" "$1" ;;
    float)  print -rl -- "-float" "$1" ;;
    string) print -rl -- "-string" "$1" ;;
    array)  print -rl -- "-array" "$@" ;;
    *)      return 1 ;;
  esac
}

sc_default() {
  emulate -L zsh
  local host='-'
  if [[ "$1" == -currentHost ]]; then host=currentHost; shift; fi
  local domain="$1" key="$2" type="$3"; shift 3
  local -a value=("$@")
  if [[ -n "${SC_COLLECT-}" ]]; then
    local id="${host}|${domain}|${key}"
    (( ${+_sc_decl[$id]} )) || _sc_decl_order+=("$id")
    _sc_decl[$id]="${host}	${domain}	${key}	${type}	${(pj:\0:)value}"
    return 0
  fi
  local mode="${SC_MODE:-plan}" current expected label
  (( SC_DEFAULTS_SEEN++ ))

  current="$(sc_defaults_read "$host" "$domain" "$key")"
  expected="$(_sc_norm "$type" "${(j: :)value}")"
  label="${domain} ${key}"
  [[ "$host" == currentHost ]] && label="${label} (currentHost)"

  if _sc_same "$type" "$(_sc_norm "$type" "$current")" "$expected"; then
    [[ "$mode" == check && -n "${SC_VERBOSE-}" ]] && sc_ok "$label = ${expected}"
    return 0
  fi

  case "$mode" in
    plan)
      (( SC_DEFAULTS_CHANGED++ ))
      sc_log "$label: ${current//$_sc_nl/ } → ${expected}" ;;
    check)
      (( SC_DEFAULTS_CHANGED++ ))
      sc_warn "$label: expected ${expected}, is ${current//$_sc_nl/ }" ;;
    apply)
      sc_snapshot_record "$domain" "$key" "$host" "$current"
      local -a args
      args=("${(@f)$(_sc_write_args "$type" "${value[@]}")}")
      if (( ${#args} < 2 )); then sc_err "$label: unknown type '$type'"; (( SC_DEFAULTS_FAILED++ )); return 0; fi
      local -a cmd=("$SCUTTLARR_DEFAULTS_BIN")
      [[ "$host" == currentHost ]] && cmd+=(-currentHost)
      if ! "${cmd[@]}" write "$domain" "$key" "${args[@]}" 2>/dev/null; then
        (( SC_DEFAULTS_FAILED++ ))
        _sc_write_failed "$domain" "$label"
        return 0
      fi
      local after
      after="$(_sc_norm "$type" "$(sc_defaults_read "$host" "$domain" "$key")")"
      if _sc_same "$type" "$after" "$expected"; then
        (( SC_DEFAULTS_CHANGED++ ))
        SC_DEFAULTS_TOUCHED[$domain]=1
        sc_ok "$label: ${current//$_sc_nl/ } → ${expected}"
      else
        (( SC_DEFAULTS_FAILED++ ))
        _sc_write_failed "$domain" "$label"
      fi ;;
    *) sc_die "SC_MODE must be plan, apply or check (got '$mode')" ;;
  esac
  return 0
}

_sc_write_failed() {
  local domain="$1" label="$2"
  if [[ "$domain" == com.apple.universalaccess ]]; then
    sc_err "$label: write refused — needs Full Disk Access for this terminal (System Settings → Privacy & Security), or flip it by hand under Accessibility → Display"
  else
    sc_err "$label: write did not stick"
  fi
}

# Source every defaults file (base, then overlay) under a mode. Prints a summary.
# sc_defaults_run <plan|apply|check>
sc_defaults_run() {
  emulate -L zsh
  local mode="$1" f
  sc_defaults_reset
  sc_files_reset 2>/dev/null
  _sc_decl=(); _sc_decl_order=()
  SC_MODE="$mode"
  # Files (sc_file_generated) act as they're sourced; defaults are collected.
  SC_COLLECT=1
  for f in "$SCUTTLARR_BASE"/defaults/*.zsh(N); do
    source "$f"
  done
  if [[ -r "$SCUTTLARR_OVERLAY/defaults.sh" ]]; then
    source "$SCUTTLARR_OVERLAY/defaults.sh"
  fi
  unset SC_COLLECT
  local id parts
  local -a values
  for id in "${_sc_decl_order[@]}"; do
    parts=("${(s:	:)_sc_decl[$id]}")
    values=("${(ps:\0:)parts[5]}")
    if [[ "$parts[1]" == currentHost ]]; then
      sc_default -currentHost "$parts[2]" "$parts[3]" "$parts[4]" "${values[@]}"
    else
      sc_default "$parts[2]" "$parts[3]" "$parts[4]" "${values[@]}"
    fi
  done
  unset SC_MODE
  if [[ "$mode" == apply ]]; then
    _sc_defaults_restart_apps
  fi
}

# The apps that only pick up their defaults on relaunch.
_sc_defaults_restart_apps() {
  emulate -L zsh
  [[ -n "${SCUTTLARR_NO_KILLALL-}" ]] && return 0
  local domain
  for domain in "${(k)SC_DEFAULTS_TOUCHED[@]}"; do
    case "$domain" in
      com.apple.dock)   killall Dock 2>/dev/null ;;
      com.apple.finder) killall Finder 2>/dev/null ;;
      com.apple.menuextra.*|com.apple.menubar.*) killall SystemUIServer 2>/dev/null ;;
    esac
  done
  return 0
}
