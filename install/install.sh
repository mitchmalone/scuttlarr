#!/bin/sh
# scuttlarr — scuttle the ship, sail the wreck.
#
#   curl -fsSL https://scuttlarr.com/install | sh
#
# What this does, in order, and nothing else:
#   1. preflight — Apple Silicon, macOS 14+, Xcode Command Line Tools (installs
#      them if missing: one Apple dialog), Homebrew (installs it if missing: the
#      one `sudo` you will see, Homebrew's own).
#   2. brew install --cask mitchmalone/tap/scuttlarr — the app, signed and
#      notarised, from the shared tap.
#   3. open scuttlarr — it registers the hotkey and shows the panel once.
#
# It does NOT change a single macOS default, shell file, or dotfile. Those are
# the machine rung: Settings → Machine, or `scuttlarr defaults` in a terminal,
# both of which show you a plan and ask once. The install is `brew uninstall`
# reversible; the rung is `scuttlarr remove` reversible.
#
# POSIX sh on purpose: this runs before anything scuttlarr provides exists.
set -eu

CASK="mitchmalone/tap/scuttlarr"
APP="/Applications/scuttlarr.app"

say()  { printf '\033[2m·\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$*"; }
fail() { printf '\033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# 1. preflight ---------------------------------------------------------------
[ "$(uname -s)" = "Darwin" ] || fail "scuttlarr is macOS only"
[ "$(uname -m)" = "arm64" ] || fail "scuttlarr is Apple Silicon only (Intel: never, unless someone maintains it)"
major="$(sw_vers -productVersion | cut -d. -f1)"
[ "$major" -ge 14 ] || fail "macOS 14 or newer required (found $(sw_vers -productVersion))"
ok "macOS $(sw_vers -productVersion) on Apple Silicon"

if ! xcode-select -p >/dev/null 2>&1; then
  say "installing Xcode Command Line Tools (Apple will ask once)…"
  xcode-select --install >/dev/null 2>&1 || true
  until xcode-select -p >/dev/null 2>&1; do sleep 5; done
fi
ok "Xcode Command Line Tools"

if ! command -v brew >/dev/null 2>&1; then
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  else
    say "installing Homebrew (its installer asks for your password)…"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
fi
ok "Homebrew $(brew --version | head -1 | cut -d' ' -f2)"

# 2. the app -------------------------------------------------------------------
if [ -d "$APP" ]; then
  say "$APP already present — upgrading if the tap has something newer"
  brew upgrade --cask "$CASK" >/dev/null 2>&1 || true
else
  say "brew install --cask $CASK"
  brew install --cask "$CASK"
fi
[ -d "$APP" ] || fail "install finished but $APP is missing — see brew's output above"
ok "installed $(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$APP/Contents/Info.plist" 2>/dev/null || echo scuttlarr)"

# 3. run -----------------------------------------------------------------------
open -g "$APP"
ok "scuttlarr is running — ⌥Space summons it"
say "want the rest (tiling, themes everywhere, the de-shined machine)? Settings → Desktop / Appearance / Machine. Each is a toggle and each shows a plan first."
