#!/usr/bin/env bash
# Resident memory of the running scuttlarr and everything it spawned — the number
# the definition of done asks for (AGENTS.md).
#
#   scripts/mem.sh          one reading
#   scripts/mem.sh --watch  a reading every 5 s (Ctrl-C to stop)
#
# The budget is idle resident < 120 MB with the panel hidden. Helpers (plugin
# services, Bun, the setup CLI) count: they're ours. Reads `ps`, needs nothing.
set -euo pipefail

reading() {
  local root
  root=$(pgrep -x scuttlarr | head -1 || true)
  if [[ -z "$root" ]]; then
    echo "scuttlarr is not running"
    return 1
  fi
  local total=0
  printf '%-8s %8s  %s\n' PID 'RSS MB' COMMAND
  # The app plus every descendant (plugin services and their helpers).
  for pid in "$root" $(pgrep -P "$root" || true) $(for c in $(pgrep -P "$root" || true); do pgrep -P "$c" || true; done); do
    local rss cmd
    rss=$(ps -o rss= -p "$pid" 2>/dev/null | tr -d ' ' || echo 0)
    [[ -n "$rss" ]] || continue
    cmd=$(ps -o comm= -p "$pid" 2>/dev/null | sed 's|.*/||')
    printf '%-8s %8.1f  %s\n' "$pid" "$(echo "$rss / 1024" | bc -l)" "$cmd"
    total=$((total + rss))
  done
  printf '%-8s %8.1f  %s\n' total "$(echo "$total / 1024" | bc -l)" "(budget: idle < 120 MB, panel hidden)"
}

if [[ "${1:-}" == "--watch" ]]; then
  while true; do
    clear
    date '+%H:%M:%S'
    reading || true
    sleep 5
  done
else
  reading
fi
