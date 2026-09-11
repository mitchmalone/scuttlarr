# core.zsh — paths, logging, small shared helpers. Sourced first by bin/scuttlarr
# and by every test. Everything else in lib/ assumes this is loaded.
#
# Every location is overridable through the environment so tests (and a curious
# user) can point the CLI at a scratch tree: nothing here hard-codes $HOME.

: "${SCUTTLARR_BASE:=${${(%):-%x}:A:h:h}}"
: "${SCUTTLARR_STATE:=${XDG_STATE_HOME:-$HOME/.local/state}/scuttlarr}"
: "${SCUTTLARR_OVERLAY:=${XDG_CONFIG_HOME:-$HOME/.config}/scuttlarr}"
# The `defaults` binary — tests substitute a fake that keeps a flat store.
: "${SCUTTLARR_DEFAULTS_BIN:=/usr/bin/defaults}"
export SCUTTLARR_BASE SCUTTLARR_STATE SCUTTLARR_OVERLAY SCUTTLARR_DEFAULTS_BIN

SCUTTLARR_VERSION="0.0.0-dev"

# ---- logging -----------------------------------------------------------------

# Colour only when stderr is a terminal and NO_COLOR is unset.
if [[ -t 2 && -z "${NO_COLOR-}" ]]; then
  typeset -g _sc_c_dim=$'\e[2m' _sc_c_ok=$'\e[32m' _sc_c_warn=$'\e[33m' \
    _sc_c_err=$'\e[31m' _sc_c_acc=$'\e[35m' _sc_c_off=$'\e[0m'
else
  typeset -g _sc_c_dim='' _sc_c_ok='' _sc_c_warn='' _sc_c_err='' _sc_c_acc='' _sc_c_off=''
fi

sc_log()  { print -r -- "${_sc_c_dim}·${_sc_c_off} $*" >&2; }
sc_ok()   { print -r -- "${_sc_c_ok}✓${_sc_c_off} $*" >&2; }
sc_warn() { print -r -- "${_sc_c_warn}!${_sc_c_off} $*" >&2; }
sc_err()  { print -r -- "${_sc_c_err}✗${_sc_c_off} $*" >&2; }
sc_head() { print -r -- "${_sc_c_acc}${(U)1}${_sc_c_off}" >&2; }
sc_die()  { sc_err "$@"; exit 1; }

# ---- helpers -----------------------------------------------------------------

# Ensure the state directory exists (first write creates it).
sc_state_init() {
  [[ -d "$SCUTTLARR_STATE" ]] || mkdir -p "$SCUTTLARR_STATE"
}

# `~`-shorten a path for display.
sc_tilde() {
  local p="$1"
  [[ "$p" == "$HOME"/* ]] && p="~${p#$HOME}"
  print -r -- "$p"
}

# sha256 of a file, hex only. shasum ships with macOS and Linux alike.
sc_hash() {
  shasum -a 256 -- "$1" | cut -d' ' -f1
}

# Write stdin to a file atomically (same directory, then rename).
sc_write_atomic() {
  local target="$1" tmp
  tmp="$(mktemp "${target:h}/.sc.XXXXXX")" || return 1
  cat > "$tmp" && mv -f "$tmp" "$target"
}
