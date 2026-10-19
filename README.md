# scuttlarr

> _Scuttle the ship. Sail the wreck._

scuttlarr is an opinionated desktop for developers who live in the terminal, on macOS.
One app gives you a menubar replacement, a launcher that looks like a shell prompt, one
theme rendered into everything, and a keyboard-first way of working — with the rest of
the machine (tiling, de-shined defaults, a fast shell) a toggle away. It is for people who
look at [Omarchy](https://omarchy.org) and want that without taking on Linux to get it.

Install gets you the launcher; the bar and everything above it is a toggle. Want more?
Enable it.

Two values govern every decision:

1. **Lightweight.** Idles invisibly (~90MB), summons instantly (<100ms budget, measured in
   single-digit ms). When a feature and the weight budget conflict, the feature loses.
2. **Hackable.** Extending scuttlarr feels like scripting, not app development. A script
   is an executable in a folder; a theme is one text file; a plugin is a directory.

## The rungs

Each is a toggle in Settings and a key in `~/.config/scuttlarr/config.json`. What a fresh
install actually has on is in [Defaults](#defaults) below.

1. **Launcher** — ⌥Space summons a non-activating panel; Esc returns focus exactly where
   it was. Fuzzy-launch apps and System Settings panes, frecency-ranked. `!git status ⏎`
   flings a command at Ghostty. `clip`, inline math, `:emoji`, quicklinks with `{query}`
   (and `{clipboard}`, `{date}`, `{time}`),
   system commands, ⌥⏎ secondary actions, [scripts](docs/SCRIPTS.md) that join the grammar
   with their own trigger words.
2. **Bar** — the menubar replacement: workspaces, front app, clock, wifi, battery, agent
   sessions, [widgets](docs/WIDGETS.md) and [plugins](docs/PLUGINS.md). Every cell opens a
   panel in the launcher; there is nothing the bar does that the keyboard can't.
3. **Desktop** — AeroSpace tiling and JankyBorders, configured from Settings and rendered
   from your theme. Wrapped, never rebuilt; hand your own `aerospace.toml` back any time.
4. **Theme** — one palette, [Omarchy's `colors.toml` format](docs/THEMES.md) verbatim, so
   any Omarchy theme ports by copying one file. It styles the app, then — when you turn
   the rung on — Ghostty, tmux, your prompt, delta, Claude Code, and (one more toggle)
   VS Code, Cursor, Zed, Neovim, Helix and btop, running instances retinting on the
   spot. A light/dark **pair** follows macOS (sunrise and sunset included) or a
   schedule of your own; a **macOS Focus** can have its own theme or pair. `theme ⏎` is
   the switcher; your own themes and wallpapers live in `~/.config/scuttlarr/themes/`.
5. **Machine** — the setup CLI shipped inside the app: macOS defaults with the shine
   scraped off, a manifest of every file scuttlarr writes outside its own config, adopt
   never overwrite, migrations, and `scuttlarr remove` to put it all back. It shows you a
   plan and asks once. Details in [docs/SETUP.md](docs/SETUP.md).

### Defaults

What `Config::default()` (`apps/desktop/src-tauri/src/config.rs`) and `DEFAULT_DESKTOP`
(`packages/core/src/desktop.ts`) give a fresh install:

| Rung or opt-in                                         | Key                                   | Default            |
| ------------------------------------------------------ | ------------------------------------- | ------------------ |
| Launcher                                               | `hotkey`                              | on, `Alt+Space`    |
| Bar                                                    | `bar.enabled`                         | off                |
| Desktop: AeroSpace tiling (managed `aerospace.toml`)   | `desktop.tiling.enabled` / `.managed` | on / on            |
| Desktop: JankyBorders                                  | `desktop.borders.enabled`             | off                |
| Theme rung (Ghostty, tmux, prompt, delta, Claude Code) | `appearance.everywhere`               | off                |
| Theme: flip macOS light/dark with the theme            | `appearance.macos`                    | on                 |
| Theme: hot editors                                     | `appearance.editors`                  | off                |
| Theme: reload Ghostty's config                         | `appearance.ghostty`                  | off                |
| App theme                                              | `theme`                               | `scuttlarr`        |
| Machine                                                | `machine.enabled`                     | off                |
| `?` ask mode                                           | `agents.askMode`                      | off                |
| Agent monitoring / usage monitor                       | `agents.monitor` / `agents.usage`     | off / off          |
| Browser bookmarks in results                           | `indexBookmarks`                      | off                |
| Colour picker loupe (Screen Recording)                 | `colorLoupe`                          | off                |
| Bundled plugins (usage, calendar, updates)             | `plugins.disabled`                    | on (none disabled) |
| scuttlarr update check                                 | `updates.checkSelf`                   | on                 |
| Launch at login                                        | `launchAtLogin`                       | on                 |
| Bang-mode terminal                                     | `terminal`                            | `Ghostty`          |

Tiling only writes `aerospace.toml` when AeroSpace is installed and no file of your own
is there.

### Custom shortcuts

`shortcuts` in `config.json` maps extra global hotkeys to an item by name, hot-applied on
save (there is no Settings tab for it since v0.5.0):

```json
"shortcuts": { "Cmd+Shift+S": "Safari", "Alt+Ctrl+B": "Bluetooth" }
```

The name matches an indexed app, System Settings pane, link or bookmark (exact name
first, then prefix). The built-in `scuttlarr — …` rows (Theme switcher, Settings, Next
wallpaper) can't be bound yet.

## Principles

- **Zero granted permissions.** No Accessibility, no Full Disk Access. A prompt only
  ever follows a toggle you flipped, and Settings names it: Automation for the iTerm2
  fallback or the Ghostty reload, Screen Recording for the colour loupe, a privacy class
  a plugin declares. Focus detection and appearance tracking read files macOS already
  lets you read.
- **No telemetry.** scuttlarr talks to the network only to do what you asked — fetch a
  favicon, read your usage limits, check for app updates — its own included: `updates ⏎`
  offers the newest release and installs it after verifying it is code we signed. Nothing
  phones home about you.
- **The prompt is the product.** The menubar icon is a courtesy; everything it does, the
  panel does too (type `scuttlarr`).
- **One owner per file.** Anything written outside `~/.config/scuttlarr` is recorded in a
  manifest; a file that was yours is moved aside, never overwritten.
- **Opinionated is the feature.** One choice per surface. Alternatives are an overlay in
  `~/.config/scuttlarr/`, not a config flag.

## Install

```sh
curl -fsSL https://scuttlarr.com/install | sh
```

That runs preflight (Apple Silicon, macOS 14+, Xcode CLT, Homebrew), then
`brew install --cask mitchmalone/tap/scuttlarr`, then opens the app. It changes no defaults
and touches no dotfiles; those are the Machine rung. Or build from source (Rust stable +
pnpm):

```sh
git clone git@github.com:mitchmalone/scuttlarr.git
cd scuttlarr
pnpm install
pnpm --filter @scuttlarr/desktop tauri build
cp -R apps/desktop/src-tauri/target/release/bundle/macos/scuttlarr.app /Applications/
open /Applications/scuttlarr.app
```

First run: the panel appears once with an empty prompt, a default config is written to
`~/.config/scuttlarr/config.json`, and scuttlarr registers as a login item (toggle in
settings). Upgrading from launcharr: paths, caches, hooks and the login item migrate on
first launch; nothing to do. Signed releases: [docs/RELEASING.md](docs/RELEASING.md).

## Themes

A theme is `colors.toml` — Omarchy's keys, unchanged. Fourteen ship (dracula, catppuccin,
gruvbox, nord, tokyo-night, rose-pine, solarized light and dark, …). Rendered files land
in `~/.local/state/scuttlarr/current/theme/` and your configs import from there — see
[docs/THEMES.md](docs/THEMES.md) for the include lines and the surfaces. Your own themes
(and paid ones like Dracula Pro) live in `~/.config/scuttlarr/themes/<name>/`, overlaying
a same-named built-in file by file and watched for edits; `theme install <git-url>` clones
one in (Omarchy's naming rules, symlinks and executables filtered out), with update and
remove beside it. A theme's `backgrounds/` folder is its wallpapers: each apply advances
to the next, and the "Next wallpaper" row cycles them. Shipped in v0.7.0.

## Hacking

The repo is a pnpm monorepo:

| Path             | What it is                                                                |
| ---------------- | ------------------------------------------------------------------------- |
| `apps/desktop`   | The app — Tauri 2 shell (Rust) + React UI (WKWebView)                     |
| `apps/www`       | [scuttlarr.com](https://scuttlarr.com), static Next.js; serves `/install` |
| `packages/core`  | Grammar, fuzzy matcher, ranking, theme policy — pure TypeScript           |
| `packages/tui`   | The UI kit both apps render: components, bar, theme tokens                |
| `packages/theme` | Palettes, derivation, templates, the OSC and token generators             |
| `packages/setup` | The Machine rung: zsh CLI, macOS defaults, manifest, migrations, remove   |

`docs/SCRIPTS.md`, `docs/WIDGETS.md` and `docs/PLUGINS.md` are the extension APIs.
`AGENTS.md` carries the architecture and invariants; `docs/` the decision log, journal,
and per-task plans. Performance budgets are requirements, not aspirations — the app logs
`[scuttlarr perf]` lines to stderr and the webview console. One gate: `pnpm verify`.

## Uninstall

`scuttlarr remove` first if you enabled the Machine rung (it restores every default and
file it touched, and asks before doing so). Then:

```sh
brew uninstall --cask scuttlarr   # or: rm -rf /Applications/scuttlarr.app
rm -rf ~/.config/scuttlarr \
       ~/.local/state/scuttlarr \
       ~/.local/share/scuttlarr \
       ~/Library/Application\ Support/com.mitchmalone.scuttlarr \
       ~/Library/LaunchAgents/scuttlarr.plist
```

If you enabled agent monitoring, the hook entries in `~/.claude*/settings.json` still
point at `~/.config/scuttlarr/hooks/claude-status.py`; they're inert once it's gone —
delete them if you want a clean file.

## Credit

The shape is Omarchy's — an opinionated base with themes and a lifecycle — for a platform
that doesn't have one. Themes follow the [Dracula](https://draculatheme.com) model: one
palette, shipped into every app. scuttlarr began life as launcharr, an app launcher for
pirates; the launcher is still in there. Yarr.
