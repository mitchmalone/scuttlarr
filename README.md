# scuttlarr 🏴‍☠️

> _An app launcher for pirates._

scuttlarr is a macOS launcher for terminal nerds. Where Alfred and Raycast dress up as
polished macOS utility apps, scuttlarr dresses up as a shell prompt: summon it with a
hotkey, type into something that looks and feels like a REPL, and either launch an app or
fling a command at your terminal without breaking flow.

Two values govern every decision:

1. **Lightweight.** Idles invisibly (~90MB), summons instantly (<100ms budget, measured in
   single-digit ms). When a feature and the weight budget conflict, the feature loses.
2. **Hackable.** Extending scuttlarr feels like scripting, not app development. Drop an
   executable in a folder; its trigger word is live before you switch back to the panel.

## What it does

- **⌥Space** — non-activating floating panel; Esc returns focus exactly where it was
- **Launch** apps and System Settings panes, fuzzy-matched (fzf-family scoring),
  frecency-ranked from your actual usage
- **`!git status ⏎`** — bang mode hands the command to Ghostty (or iTerm2/Terminal.app), verbatim
- **[Scripts](docs/SCRIPTS.md)** — executables in `~/.config/scuttlarr/scripts/` join the
  grammar with their own trigger words; bundled: `lorem`, `json`, `ip`
- **`clip`** — clipboard history (text, 200 items, concealed types never recorded);
  Enter copies — no Accessibility permission, ever
- **`2*(14.5+3)`** — inline math, Enter copies; **`:fire`** — emoji picker
- **URLs** — type one to open it, or add it as a quicklink (name, browser, favicon)
  in-panel; `{query}` templates make Raycast-style quicklinks (`yt cute otters ⏎`; a bare trigger opens the site itself)
- **Search fallback** — dead-end queries offer "Search Google for …" (engine configurable)
- **System commands** — sleep displays, lock, empty trash, dark mode, caffeinate…
- **⌥⏎** — secondary actions: reveal app in Finder, copy URL, delete clip
- **Bookmarks** _(opt-in)_ — index Chrome-family/Safari bookmarks as results
- **Settings** — a real settings window _and_ a hand-editable
  `~/.config/scuttlarr/config.json` (watched, hot-applied); both stay in sync

## Principles

- **Zero granted permissions.** No Accessibility, no Full Disk Access. The only prompts
  you'll ever see are macOS's standard Automation consents (first terminal hand-off,
  first Finder/System Events command).
- **No telemetry.** scuttlarr talks to the network only to do what you asked — fetch a
  favicon, read your usage limits, check for app updates. Nothing phones home about you.
- **The prompt is the product.** The menubar icon is a courtesy; everything it does, the
  panel does too (type `scuttlarr`).

## Install

Build from source (Apple Silicon; requires Rust stable + pnpm):

```sh
git clone git@github.com:mitchmalone/scuttlarr.git
cd scuttlarr
pnpm install
pnpm --filter @scuttlarr/desktop tauri build
cp -R apps/desktop/src-tauri/target/release/bundle/macos/scuttlarr.app /Applications/
open /Applications/scuttlarr.app
```

Or via Homebrew: `brew install mitchmalone/tap/scuttlarr`.

First run: the panel appears once with the hint line, a default config is written to
`~/.config/scuttlarr/config.json`, and scuttlarr registers as a login item (toggle in
settings). Signed releases: see [docs/RELEASING.md](docs/RELEASING.md).

## Hacking

`docs/SCRIPTS.md` is the plugin API. The repo is a pnpm monorepo — `apps/desktop` (the
app), `apps/www` ([scuttlarr.com](https://scuttlarr.com)), `packages/core` (the shared
matcher/grammar/ranking engine). The repo docs (`docs/`) carry the full decision log,
architecture (`AGENTS.md`), and per-task plans. Performance budgets are requirements, not
aspirations — instrumentation logs `[scuttlarr perf]` lines to stderr and the webview
console.

## Uninstall

```sh
rm -rf /Applications/scuttlarr.app \
       ~/.config/scuttlarr \
       ~/Library/Application\ Support/com.mitchmalone.scuttlarr \
       ~/Library/LaunchAgents/scuttlarr.plist
```

If you enabled agent monitoring, the hook entries in `~/.claude*/settings.json` still
point at `~/.config/scuttlarr/hooks/claude-status.py`; they're inert once it's gone —
delete them if you want a clean file.

---

_scuttlarr: because the apps won't launch themselves. Yarr._
