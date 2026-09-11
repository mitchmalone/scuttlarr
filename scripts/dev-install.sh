#!/usr/bin/env bash
# Install the working-tree build over /Applications/scuttlarr.app and relaunch,
# without Finder or the app grabbing the screen (Mitch, 2026-09-10).
#
#   scripts/dev-install.sh          swap in the last `tauri build` and relaunch
#   scripts/dev-install.sh --build  build first
#
# Not a release: that is scripts/release.sh (signed, notarised, via the tap).
# Brew cannot do this step — the cask installs the released version, not
# target/release — so this is the one sanctioned way to run a local build.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILT="$ROOT/apps/desktop/src-tauri/target/release/bundle/macos/scuttlarr.app"
DEST="/Applications/scuttlarr.app"

if [[ "${1:-}" == "--build" ]]; then
  (cd "$ROOT" && pnpm --filter @scuttlarr/desktop tauri build)
fi
[[ -d "$BUILT" ]] || { echo "no build at $BUILT — run with --build" >&2; exit 1; }

# Quit politely (SIGTERM lets the tray icon and panel go away cleanly), then
# make sure. `open` on a running instance would only re-activate it (LEARNINGS).
for proc in scuttlarr launcharr; do
  if pgrep -x "$proc" >/dev/null; then
    pkill -TERM -x "$proc" || true
    for _ in $(seq 1 20); do pgrep -x "$proc" >/dev/null || break; sleep 0.1; done
    pkill -KILL -x "$proc" 2>/dev/null || true
  fi
done

# The pre-rename bundle (DECISIONS 2026-09-11): two launchers would fight over
# the hotkey. Moved to the Trash, not deleted — the tap reinstalls it if wanted.
if [[ -d /Applications/launcharr.app ]]; then
  mv /Applications/launcharr.app "$HOME/.Trash/launcharr.app.$(date +%s)"
  echo "moved the old /Applications/launcharr.app to the Trash"
fi

# ditto replaces the bundle's contents in place: no delete-then-copy that
# Finder notices, resource forks and permissions kept.
ditto "$BUILT" "$DEST"

# -g: launch without bringing it to the foreground. scuttlarr is an accessory
# app anyway, but a fresh bundle's first launch otherwise steals focus.
open -g "$DEST"
echo "installed $(plutil -extract CFBundleShortVersionString raw "$DEST/Contents/Info.plist") → $DEST (relaunched in the background)"
