# STATUS

> The cursor: where we are, what needs hands, what's next. A snapshot, not a history —
> history lives in git, `plans/done/`, `releases/` and `JOURNAL.md`.
>
> Last updated: 2026-10-20 (site theme picker; site pixel hero; defaults flip: bar on, tiling off; invariant 3 reworded)

## Where we are

- **Released: v0.7.0** (2026-10-01), the first release as scuttlarr
  (`releases/v0.7.0.md`). Tap has `Casks/scuttlarr.rb`; `launcharr.rb` is the deprecated
  alias.
- **On main, unreleased:** per-source update-check intervals (2026-10-18); cleanup pass 1
  (`plans/done/2026-10-19-cleanup-bugs-and-guardrails.md`: bar off means off, one atomic
  config writer, plugin panels keep identity, verify gate gains fmt, coverage floors,
  layering, purity lint, shellcheck); the docs-truth pass
  (`plans/done/2026-10-19-docs-truth-and-stories.md`: README/PRD/ROADMAP match the code,
  defaults table in README, awake copy, v0.2.0 notes reconstructed, workbench stories);
  the defaults flip (`plans/done/2026-10-19-defaults-flip.md`: the bar defaults on,
  Desktop tiling off, upgraders pinned to what they had via `defaultsVersion`).
  The site pixel hero (`plans/done/2026-10-19-site-pixel-hero.md`: a typing-reactive
  pixel field in the demo's picked theme; hands-check pending). The site theme picker
  (`plans/done/2026-10-20-site-theme-picker.md`: the whole site in any of the 14 app
  themes, light/dark switch and next-themes gone; hands-checked).
- **Workbench story titles are stable** (an external screenshot script keys on them):
  rename a story only with Mitch.
- **Active plans:** `lights-plugin.md` (waiting on Mitch's Home.app shortcuts),
  `opensource-readiness-review.md` (not started).
- **Daily use on the primary Mac:** bar, launcher, panels, agents, usage, updates, awake,
  desktop layer and the theme rung (`appearance.everywhere`, `editors`, `ghostty` on).
- **Memory is over budget:** first `scripts/mem.sh` reading 157–177 MB app idle against
  the 120 MB ceiling; borders 370–460 MB (JOURNAL 2026-09-16). The shrink is its own task.

## Needs Mitch (decisions)

- **Next tickets (decided, not started):** the theme policy gate never holds
  (JOURNAL 2026-10-19; confirmed by the `it.fails` test in `lib/theme.test.ts`: a file
  with no `appearance` key reaches the webview with one, so a fresh install in light mode
  switches to `solarized-light`); hotkeys bound to built-in `scuttlarr — …` rows do
  nothing (empty `path`; link `browser` also ignored on that path); the `tauri build`
  DMG step.
- **apps/www demo retypes the launcher prompt** (invariant 10): the launcher view is now
  in `packages/tui`; switch the demo to import it.
- **Cleanup review steps 3–5**: memory target, shared helpers + god-file splits, where
  away mode lives.
- **Rust and TS bar default layouts differ** (`config.rs` right = wifi, battery;
  `DEFAULT_BAR_LAYOUT` right = wifi, awake, usage, battery).
- Usage pace thresholds (±15/25 pts) and worst-across-accounts for the cell.
- Whether "hidden when clean" is right for the updates cell.
- p10k dir colour: follow the theme or the host?
- Widget OAuth stays dormant until a scuttlarr OAuth App client id exists.
- `opensource-readiness-review`: run before the next feature phase or not.

## Needs Mitch (hands-checks)

Back from travel:

- Turn Rapid Security Responses back on (`CriticalUpdateInstall`) and Tailscale
  auto-update (JOURNAL 2026-10-19).
- Dev-install main, then cleanup pass 1's unchecked acceptance items.

Releases and update path:

- Self-update live proof at the next signed release (`updates ⏎` offers it, `↵` installs).
- `tauri build`'s DMG step failed locally ("create-dmg: Not enough arguments"); dev
  installs use `--bundles app`. Next ticket; must be fixed before the next release.
- `apps/www` install copy says the bar is off by default (and mentions a hint line):
  update it with the release that ships the defaults flip.

Theme:

- Ghostty windows outside tmux take the colours on a switch; VS Code retints live; the
  Claude Code theme reads well; the tmux retint; an editor retint.
- A Focus flip and a macOS appearance toggle change the theme within a second; "apply
  now"; Solarized Light on every surface; `theme ⏎` Esc path.
- The shell base on a real home — reconcile the chezmoi dotfiles first (the include lines
  there are **uncommitted**), or the next `chezmoi apply` fights it.

awake:

- Tray Quit stays quit (exit 0 is not relaunched); a hold survives
  `sudo fdesetup authrestart`; an agents hold releases within ~1 min of the last agent
  idling; the "awake resumed" toast.

Terminal and updates:

- `!echo hi ⏎` lands as a new tmux window in Ghostty; updates `a` too.
- `↵` on Homebrew in `updates ⏎` upgrades with live output and the count drops; the cell
  count against `brew outdated`; the card and keys. Cell click → panel was reported dead
  (`open_panel` now logs `panel: open_panel <id>`).

Agents, usage, plugins:

- Settings → Agents shows both Claude accounts registered; a Claude turn paints a cell.
- Usage limits against claude.ai/settings/usage for both accounts; the Codex tile
  includes beebee's sessions (mirror plugin).
- Hover a cell while a session runs a subagent (subagent lines).
- Agent monitoring: attention pulse; cell click / `agents ⏎` Enter lands in the right
  tmux pane; `⌫` dismisses a row (the 2026-08-18 orphan is still in the store).
- hello cell + card + `hello ⏎` (`r` resets), `cal ⏎`, Settings → Plugins, `plugins ⏎`.
- Custom widgets sub-tab and install from URL; trmnl hidden until its key resolves.

Bar and displays:

- The new workbench stories (launcher, bar, hover cards, Updates, Plugins) have not been
  looked at in a browser: render check and clipping.

- Battery/wifi glyphs at 17 px (or 16/18); a charging battery under 90 % readable; wifi
  arcs at 14 px against the theme; bar icons legible in all themes.
- ⌥Space with the mouse on the built-in; hover cards on the second bar; unplug/replug.
- Zone board: drag between zones, retire/restore via the tray, notched vs external, bar
  off/on survives.

Launcher and panels:

- Focus: summon → `wifi ⏎` → connect → Esc → Esc restores focus exactly, also over a
  full-screen app.
- `colorpicker ⏎` (Apple sampler by default; loupe after granting Screen Recording;
  Esc copies nothing); `lorem` toast; `?` keeps the input focused across turns; Settings
  → Agents sub-tabs and About links.
- wifi `s` scan + secured join; audio slider steps + device switch; clipboard
  copy-on-Enter dismisses; help filter.
- 0.4.0 leftovers: Settings → Desktop "use my own config…" / "save a copy…" dialogs;
  `ss ⏎` → ⌘V into claude.ai and Claude Code; a one-minute eyeball of the fresh profile.

Waiting on Mitch elsewhere:

- lights plugin: create the `lights/<light>/…` shortcuts, then measure `shortcuts run`
  latency and slider drag in a card.
- Dotfiles: commit the aerospace.toml triggers change; prune the sketchybar config.

## Next

- **Light mode first-class** (ROADMAP, unify step 3.7).
- **Memory**: get the app under 120 MB idle; lazy-load plugin panels if plugins hold it
  over; borders' footprint.
- **Plugins slice G** (rolling): awake, agents, wifi, audio, battery panels move to
  `packages/plugins/` as they are touched. Also: fold `widgets.rs` into `plugins.rs`, a
  curated plugin index on scuttlarr.com, per-plugin stderr in the logbook, the hello
  plugin's `import.meta.main` guard under Node.
- **Theme gaps**: bar theme cell, macOS accent colour, bat beyond `ansi`, plugin clones
  in the manifest.
- **Kit**: `ListRow` danger tone (updates error rows are plain text).
- **Panels and bar** (ROADMAP v0.5 list): `sysinfo`; settings into panels + drill-down
  menu; per-workspace app hints; bluetooth glyph; NSWorkspace front-app observer;
  per-monitor workspaces; a screen-parameters observer instead of the 5 s heartbeat.
- **Loose threads, not chased**: the 23 zombie children in a long-lived instance
  (JOURNAL 2026-08-26); amaran status replies arriving in one run of four.
