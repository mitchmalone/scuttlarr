#!/usr/bin/env bash
# Install the working-tree build over /Applications/launcharr.app and relaunch,
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
BUILT="$ROOT/apps/desktop/src-tauri/target/release/bundle/macos/launcharr.app"
DEST="/Applications/launcharr.app"

if [[ "${1:-}" == "--build" ]]; then
  (cd "$ROOT" && pnpm --filter @launcharr/desktop tauri build)
fi
[[ -d "$BUILT" ]] || { echo "no build at $BUILT — run with --build" >&2; exit 1; }

# Quit politely (SIGTERM lets the tray icon and panel go away cleanly), then
# make sure. `open` on a running instance would only re-activate it (LEARNINGS).
if pgrep -x launcharr >/dev/null; then
  pkill -TERM -x launcharr || true
  for _ in $(seq 1 20); do pgrep -x launcharr >/dev/null || break; sleep 0.1; done
  pkill -KILL -x launcharr 2>/dev/null || true
fi

# ditto replaces the bundle's contents in place: no delete-then-copy that
# Finder notices, resource forks and permissions kept.
ditto "$BUILT" "$DEST"

# -g: launch without bringing it to the foreground. launcharr is an accessory
# app anyway, but a fresh bundle's first launch otherwise steals focus.
open -g "$DEST"
echo "installed $(plutil -extract CFBundleShortVersionString raw "$DEST/Contents/Info.plist") → $DEST (relaunched in the background)"
