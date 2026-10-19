---
title: Docs tell the truth, copy fixes, workbench stories for every Core surface
status: done
created: 2026-10-19
updated: 2026-10-19
links:
  - ../done/2026-10-19-cleanup-bugs-and-guardrails.md
  - ../../STATUS.md
---

# Docs tell the truth, copy fixes, workbench stories

## Goal

Docs describe what shipped; small copy bugs fixed; a workbench story for every Core
surface so an external script can screenshot each by title. No product behaviour change.
Rule: when a doc and the code disagree, the code is the fact.

## Findings so far (code is the fact)

### Defaults (config.rs `Config::default`, core/desktop.ts `DEFAULT_DESKTOP`)

| Rung / opt-in                              | Default in code                                                                       | Where                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------- |
| Launcher (⌥Space)                          | on                                                                                    | `hotkey: "Alt+Space"`                  |
| Bar                                        | **off**                                                                               | `BarConfig::default().enabled = false` |
| Desktop: tiling                            | **on, managed** (writes aerospace.toml if AeroSpace is installed and no foreign file) | `DEFAULT_DESKTOP.tiling`               |
| Desktop: borders                           | off                                                                                   | `DEFAULT_DESKTOP.borders`              |
| Theme rung (`appearance.everywhere`)       | off                                                                                   | `AppearanceConfig::default`            |
| `appearance.macos`                         | on                                                                                    | same                                   |
| Hot editors / Ghostty reload               | off / off                                                                             | same                                   |
| Machine                                    | off                                                                                   | `MachineConfig::default`               |
| `?` ask mode                               | off                                                                                   | `AgentsConfig.ask_mode`                |
| Agent monitor / usage / creds              | off                                                                                   | `AgentsConfig`                         |
| Bookmarks                                  | off                                                                                   | `index_bookmarks`                      |
| Colour loupe                               | off                                                                                   | `color_loupe`                          |
| Self-update check                          | on                                                                                    | `UpdatesConfig.check_self`             |
| Bundled plugins (usage, calendar, updates) | on (`plugins.disabled = []`)                                                          | `PluginsConfig`                        |
| Launch at login                            | on                                                                                    | `launch_at_login`                      |
| Terminal                                   | Ghostty                                                                               | `Terminal::Ghostty`                    |

Contradictions with stated intent (install = bar + launcher; Desktop/Theme/Machine opt-in)
— **not flipped, for Mitch**:

1. Bar defaults **off** — README/AGENTS/PRD say install gets the bar.
2. Desktop tiling defaults **on and managed** — the README says Desktop is opt-in.
3. Theme policy engine is never inert: `config.appearance` is a non-optional struct in
   Rust, `read_config` always returns it, so `policyConfigured()` (theme.ts) is always
   true and the default pair `{solarized-light, scuttlarr}` with mode `system` applies.
   A fresh install in macOS light mode switches the app theme to solarized-light — the
   exact JOURNAL 2026-09-11 failure the gate was meant to prevent. Needs a fix (make the
   field `Option` / `skip_serializing_if`), which is behaviour, so not done here.
4. Bar default layout differs: Rust `right: [wifi, battery]`, TS `DEFAULT_BAR_LAYOUT`
   `right: [wifi, awake, plugin:usage, battery]`.

### Custom shortcuts (step 5)

Work end to end for index items: `shortcut::sync` registers `config.shortcuts` at boot
and on config change; `shortcut::handle` → `commands::launch_by_name` (exact name, then
prefix) → `open <path>`. Apps, settings panes, links and bookmarks work. **Broken for
`scuttlarr — …` rows** (Theme switcher, Settings, Next wallpaper, …): their `path` is
empty, so `open ""` fails. The unify plan 4.4 and STATUS claim the Theme switcher row is
bindable "via Settings → General ▸ Shortcuts" — neither the binding nor that UI exists.
Link `browser` is ignored on the shortcut path. Not fixed (behaviour).

### Invariant 3 (step 3)

`generate_handler!` in `lib.rs` registers **82** commands. Proposal for Mitch: reword to
"**A deliberate IPC surface.** Every Tauri command is thin, typed, and recorded in
DECISIONS when added; the count is a liability to be justified, not a handful — a
command that could be an event, a field on an existing snapshot, or a plugin `host.send`
message should be that instead." AGENTS.md left unchanged. PRD §6.2 still lists the v1
five as "the" surface.

### launcharr leftovers (step 7) — 16 files

Keep (intentional): rename.rs, config.rs migration, lib.rs comment, plugins.rs +
plugins/components.tsx `@launcharr/tui` alias, desktop.rs legacy marker, theme.ts +
tui themes.ts/themes.test.ts theme-name alias, dev-install.sh old-process kill,
release.sh `launcharr-notary` keychain profile. Fix: comments in setup
`defaults/{deshine,menubar,keyboard,dock}.zsh`; `lib/doctor.zsh:90` checks
`/Applications/launcharr.app` (should be scuttlarr.app). bar.rs header still says
"v0.5 spike".

### Other doc-vs-code

- README title carries an emoji (invariant 14); lights-plugin plan too.
- README Themes paragraph: user themes, `theme install`, wallpapers shipped (v0.7.0).
- README "Nothing above the first is on by default" vs "Install gets you the bar".
- updates manifest description still lists npm (dropped, updates.rs header).
- PRD: §4.2 "Light mode can wait"; §4.4 iTerm2 as bang target (Ghostty via
  herdr/tmux is default, `effective_terminal` falls back); §4.5 "no network calls" (self
  update check on by default); §5.4 "no settings UI" (Settings window exists, terminal
  list misses Ghostty); §6.2 menubar icon as only presence (the bar exists, tray stays);
  §10 lists user themes and shell base as open (shipped); §11 Q2 settled (`bangNewWindow`).
- apps/www demo.tsx retypes the launcher prompt rather than importing it (invariant 10).

### Plans (step 8)

- unify-into-scuttlarr: done (1.5 cask + 1.7 release in v0.7.0, 2.5 repo deleted).
  Carry 3.7 light mode first-class and the live proofs to ROADMAP/STATUS; then done/.
- ghostty-handoff: done; carry "`!echo hi` lands in a tmux window" hands-check; done/.
- updates-upgrade-in-panel: done; carry the `↵` Homebrew hands-check; done/.
- awake: slice E superseded by F (`sleep_override.rs`); carry tray-Quit, authrestart,
  agents-run release hands-checks; done/.
- lights-plugin: still waiting on Mitch's shortcuts; stays active.
- opensource-readiness-review: not done (no report written); stays active, launcharr-era
  framing to update.

## Steps

- [x] Research: defaults, shortcuts, invariant 3 count, leftovers, plans, PRD drift
- [x] README: Themes shipped, rungs line + Defaults table + Custom shortcuts, permissions
      principle, emoji out of the title
- [x] PRD §4–§11, ROADMAP (v0.5–v0.7 shipped, awake, unify, PRD pass), AGENTS repo table;
      emoji markers out of docs (invariant 14)
- [x] AwakePanel copy: "Ends at 1:38 pm (1h 20m left)" / "Runs until agents idle",
      "Releases if the battery drops below 20% on battery power.", "ended at the
      battery floor"; core `endsLabel` wifi case "until you leave <ssid>"; panel sweep
      found nothing else awkward; updates manifest no longer lists npm
- [x] launcharr leftovers: setup comments and `doctor.zsh`'s app check; bar.rs header;
      stale `plans/active/` paths in Rust comments
- [x] `docs/releases/v0.2.0.md`, marked reconstructed
- [x] Plans: unify, ghostty-handoff, updates-upgrade-in-panel, awake → done/ with closing
      notes; lights and readiness updated; STATUS rewritten (140 lines); travel setup and
      the appearance-gate finding to JOURNAL
- [x] Workbench stories (step 9): `Launcher` + `launcherPrompt()` extracted to
      `packages/tui` (`launcher.css` entry), bar zone mapping to
      `apps/desktop/src/bar/modules.tsx`, presentational `PluginsPanel`; workbench globs
      `packages/plugins`
- [x] `pnpm verify` green; one commit

## Acceptance criteria

- [x] `pnpm verify` green
- [x] Every doc-vs-code contradiction resolved toward the code, or listed for Mitch
- [x] No open STATUS item lost (moved to the new cursor, a plan or JOURNAL)
- [x] Every Core surface has a story with a stable title

## Out of scope

Flipping any default; fixing the appearance gate or scuttlarr-row shortcuts.

## Story titles (screenshot keys)

- **Launcher prompt**: empty prompt (first-run summon) · app results with match
  highlighting · bang mode — !git status · bang mode — empty command · math result ·
  emoji results — :fire · clip — clipboard history inline · quicklink with {query} — gh
  tauri · script trigger — ip · secondary action — ⌥ held · search fallback — nothing
  matched · nothing on the horizon · toast — copy confirmation · ask mode — before the
  question · ask mode — conversation · ask mode — waiting for the answer
- **Bar (app)**: full strip — every kind of cell · default layout · notched display —
  center folds into the right · notched display — explicit notchedLayout · custom zones —
  agents centred, status left · charging, nothing armed, no agents · low battery, wifi
  poor · offline, desktop Mac (no battery) · first paint — before the first snapshot
- **Bar hover cards (app)**: battery card — on battery · battery card — charging to the
  limit · wifi card · awake card — held while agents work · agent card — working with a
  subagent · agent card — needs attention · usage card · updates card · widget card —
  GitHub Actions · plugin card — data-only plugin
- **UpdatesPanel (plugin)**: pending updates, nothing running · upgrade running in the
  panel · upgrade finished · upgrade failed · refreshing · everything up to date · before
  the first check
- **PluginsPanel (app)**: gallery — bundled, data-only, broken and off · broken build
  selected · after a restart · none installed

Also found: there is no first-run hint line (`lib.rs` just shows the panel once); README
and PRD §4.5 corrected.
