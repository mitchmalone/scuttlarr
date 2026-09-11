# Test harness. Each test file is a zsh script that sources this, runs
# assertions, and ends with t_done. Everything runs against a scratch tree:
# HOME, state, overlay and the fake `defaults` all live under $T.

emulate -L zsh
setopt no_unset pipe_fail

typeset -gi T_PASS=0 T_FAIL=0
T_NAME="${ZSH_ARGZERO:t}"
_t_nl=$'\n'
T="$(mktemp -d "${TMPDIR:-/tmp}/scuttlarr-test.XXXXXX")"
export T
export HOME="$T/home"
export SCUTTLARR_BASE="${SCUTTLARR_BASE:-${${(%):-%x}:A:h:h}}"
export SCUTTLARR_STATE="$T/state"
export SCUTTLARR_OVERLAY="$T/overlay"
export SCUTTLARR_DEFAULTS_BIN="$SCUTTLARR_BASE/test/fixtures/bin/defaults"
export FAKE_DEFAULTS_STORE="$T/defaults.store"
export SCUTTLARR_GIT_BIN="$SCUTTLARR_BASE/test/fixtures/bin/git"
export FAKE_GIT_LOG="$T/git.log"
# The shell layer resolves XDG paths itself; keep them under $T's HOME.
unset XDG_CONFIG_HOME XDG_DATA_HOME XDG_STATE_HOME XDG_CACHE_HOME ZDOTDIR
export SCUTTLARR_NO_KILLALL=1
export NO_COLOR=1
mkdir -p "$HOME"

source "$SCUTTLARR_BASE/lib/core.zsh"
source "$SCUTTLARR_BASE/lib/manifest.zsh"
source "$SCUTTLARR_BASE/lib/snapshot.zsh"
source "$SCUTTLARR_BASE/lib/defaults.zsh"
source "$SCUTTLARR_BASE/lib/files.zsh"
source "$SCUTTLARR_BASE/lib/doctor.zsh"
source "$SCUTTLARR_BASE/lib/link.zsh"
source "$SCUTTLARR_BASE/lib/migrations.zsh"
source "$SCUTTLARR_BASE/lib/shell.zsh"
source "$SCUTTLARR_BASE/lib/remove.zsh"

_t_where() { print -r -- "${funcfiletrace[2]:-?}"; }

# assert_eq <expected> <actual> <label>
assert_eq() {
  if [[ "$1" == "$2" ]]; then (( T_PASS++ )); else
    (( T_FAIL++ ))
    print -r -- "  FAIL $3 ($(_t_where))" >&2
    print -r -- "       expected: ${1//$_t_nl/⏎}" >&2
    print -r -- "       actual:   ${2//$_t_nl/⏎}" >&2
  fi
}
# assert_ok <label> <command...>   (status 0)
assert_ok() { local label="$1"; shift; if "$@"; then (( T_PASS++ )); else (( T_FAIL++ )); print -r -- "  FAIL $label: expected success ($(_t_where))" >&2; fi; }
# assert_fails <label> <command...> (status non-zero)
assert_fails() { local label="$1"; shift; if "$@"; then (( T_FAIL++ )); print -r -- "  FAIL $label: expected failure ($(_t_where))" >&2; else (( T_PASS++ )); fi; }
# assert_match <label> <haystack> <needle>
assert_match() { if [[ "$2" == *"$3"* ]]; then (( T_PASS++ )); else (( T_FAIL++ )); print -r -- "  FAIL $1: '$3' not in output ($(_t_where))" >&2; print -r -- "$2" | sed 's/^/       | /' >&2; fi; }
assert_file() { if [[ -f "$1" ]]; then (( T_PASS++ )); else (( T_FAIL++ )); print -r -- "  FAIL $2: $1 missing ($(_t_where))" >&2; fi; }
assert_no_file() { if [[ ! -e "$1" ]]; then (( T_PASS++ )); else (( T_FAIL++ )); print -r -- "  FAIL $2: $1 exists ($(_t_where))" >&2; fi; }

# Seed the fake defaults store directly: t_seed [-currentHost] domain key rawvalue
t_seed() {
  local host='-'
  if [[ "$1" == -currentHost ]]; then host=currentHost; shift; "$SCUTTLARR_DEFAULTS_BIN" -currentHost delete "$1" "$2"; else "$SCUTTLARR_DEFAULTS_BIN" delete "$1" "$2"; fi
  print -r -- "${host}	$1	$2	$3" >> "$FAKE_DEFAULTS_STORE"
}
t_read() { "$SCUTTLARR_DEFAULTS_BIN" "$@" 2>/dev/null; }

t_done() {
  rm -rf "$T"
  local name="$T_NAME"
  if (( T_FAIL == 0 )); then
    print -r -- "ok   ${name} (${T_PASS})"
    exit 0
  else
    print -r -- "FAIL ${name} (${T_FAIL} failed, ${T_PASS} passed)"
    exit 1
  fi
}
