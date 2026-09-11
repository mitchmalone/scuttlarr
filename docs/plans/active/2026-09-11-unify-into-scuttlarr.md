---
title: Unify launcharr + scuttlarr into one product, scuttlarr
status: active
created: 2026-09-11
updated: 2026-09-11
links:
  - ../../DECISIONS.md 2026-09-11
  - ../../THEMES.md (design for packages/theme, moved 2026-09-11)
  - ../../SETUP.md (design for packages/setup + manifest rule, moved 2026-09-11)
  - ROADMAP.md "scuttlarr contract" (retired by this plan)
---

# Unify into scuttlarr

## Goal

One repo, one app, one name. launcharr's monorepo absorbs scuttlarr and is renamed
**scuttlarr**: an Omarchy-like experience for macOS — bar, launcher, universal theming,
keyboard-first — where the launcher is a feature, not a brand. Install gets you the bar and
launcher; everything else is a toggle. This unblocks the theme switcher (Focus modes,
light/dark by time), which has been stalled on "who owns themes".

## Context

- launcharr (this repo) is the runtime: Tauri app, bar, panels, 12-token theme model in
  `packages/tui/src/themes.ts` (14 built-ins, one light), desktop layer that already writes
  `aerospace.toml` + borders flags from theme tokens. Signed releases, shared tap
  (`mitchmalone/tap`, `Casks/launcharr.rb`), launcharr.com.
- scuttlarr is a zsh CLI with `lib/` (core, manifest, snapshot, defaults, files, doctor),
  nine `defaults/*.zsh`, hermetic tests under `test/`, a Next.js site, and two design docs
  (THEMES, ARCHITECTURE) that were never built: palette → templates → committed renders;
  base/overlay/state with a manifest and adopt-never-overwrite.
- The runtime-vs-provisioning boundary between them kept moving (bar, tiling, borders,
  dark mode, and now theme policy all drifted to whichever side was resident). Decided
  2026-09-11 (Mitch): fold, rename to scuttlarr, sunk cost in the launcharr name is
  irrelevant.
- Omarchy's current model (4.x, verified from source 2026-09-11): a theme is
  `colors.toml` + a few hand files; everything else is rendered from templates into a
  state dir (`~/.local/state/omarchy/current/theme/`) that app configs import from;
  `theme-set` stages, atomically swaps, then fans out per-app reloads. We adopt this
  shape, then adjust.

## Approach

The old repo boundary becomes package boundaries inside this monorepo:

| Package          | Role                                                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/desktop`   | The runtime, unchanged in role: bar, launcher, panels, settings, live reloads, theme policy                                                                                   |
| `packages/theme` | New. The Omarchy model: `themes/<name>/colors.toml` (+ optional hand files), `templates/*.tpl`, a pure TS renderer, committed renders. `@launcharr/tui` tokens derive from it |
| `packages/setup` | New. scuttlarr's `lib/` + `defaults/` + tests, ported as-is (zsh). Install, defaults, Brewfile, shell, Caps→Hyper, duti, migrations, remove, manifest. Curl-installable       |
| `packages/core`  | Unchanged                                                                                                                                                                     |
| `apps/www`       | Becomes scuttlarr.com; launcharr.com redirects                                                                                                                                |

Ordering principle: **rename first, then port, then build.** Renaming last would leave
every new file, decision, and migration carrying the wrong name. Renaming first costs one
release with an adopt-old-paths migration, which the app already knows how to do
(`config_dir()` moved once before; `TomlState` adopt-or-leave exists).

Alternative considered: keep two repos and make scuttlarr a thin installer that only
depends on launcharr. Rejected 2026-09-11 — it is the boundary that stalled progress.

## Steps

### Phase 0 — Record (half a day)

- [x] 0.1 DECISIONS entry here: fold + rename, the package table above, "everything above
      the launcher is a toggle", and the retirement of the "scuttlarr contract" section in
      ROADMAP and the "anything distro-shaped" non-goal in PRD/AGENTS.
- [x] 0.2 Mirror entry in scuttlarr's DECISIONS; scuttlarr README gains a "folded into
      launcharr → scuttlarr" banner. Repo archived on GitHub after phase 2 lands.
- [x] 0.3 Move `docs/THEMES.md` and `docs/ARCHITECTURE.md` from scuttlarr into this repo's
      `docs/` (rewritten to the package names; ARCHITECTURE's manifest rule becomes a
      repo invariant, below).
- [x] 0.4 AGENTS.md: rename, package table, new invariant **"a path outside our config
      has one owner, recorded in the manifest; adopt moves, never overwrites"**, applying
      to app-side writes (`aerospace.toml`, borders, hooks, theme renders) as much as
      to setup. DEVIATIONS gains scuttlarr's zsh-5.9 entry.

### Phase 1 — Rename (one release)

- [ ] 1.1 Repo `mitchmalone/launcharr` → `mitchmalone/scuttlarr` (GitHub redirect keeps
      old clones working). Package scopes `@launcharr/*` → `@scuttlarr/*`; app name,
      `productName`, window titles, panel hint, README, PRD.
- [ ] 1.2 Identifiers with a migration in Rust, run once at startup, tested as pure
      functions over paths: bundle id `com.mitchmalone.launcharr` → `.scuttlarr`
      (Application Support dir: SQLite + icon cache moved); `~/.config/launcharr` →
      `~/.config/scuttlarr` (config, scripts, plugins, hooks); LaunchAgent
      `launcharr.plist` → `scuttlarr.plist` (unload old, load new); login item re-registered.
- [ ] 1.3 Hook adapter: `hooks/claude-status.py` installs to the new path; `SIGNATURES` in
      `hooks.rs` keeps both old and new suffixes so existing `~/.claude*/settings.json`
      entries stay recognised and are rewritten in place.
- [ ] 1.4 Files we generate outside our config (`aerospace.toml` marker
      `# generated by launcharr`, borders): accept both markers, write the new one.
- [ ] 1.5 Release pipeline: `scripts/release.sh`, tap cask `Casks/scuttlarr.rb` with the
      old cask left as a deprecated alias (`brew` `deprecate!` + `replacement`), signing
      identity unchanged, `release.json` shape unchanged.
- [ ] 1.6 Site: `apps/www` copy and `site.ts` constants; scuttlarr.com becomes the
      canonical domain (Vercel project already exists as `scuttlarr-web`); launcharr.com
      301 → scuttlarr.com. scuttlarr's `apps/www` landing copy (manifesto, curl line)
      merges in; its repo's site is retired.
- [ ] 1.7 Ship as v0.x with release notes: "launcharr is now scuttlarr; paths moved, nothing
      to do". Verify on the primary Mac via `scripts/dev-install.sh` first (quiet install).

### Phase 2 — Port setup (packages/setup)

- [ ] 2.1 Move scuttlarr `bin/`, `lib/`, `defaults/`, `test/`, `scripts/test.zsh` into
      `packages/setup/` unchanged; wire its test runner into `pnpm verify`. State dir
      `~/.local/state/scuttlarr/` (manifest, defaults.before, adopted/, migrations,
      theme name) as already designed.
- [ ] 2.2 Rename the CLI entry to `scuttlarr` under `packages/setup/bin`, shipped inside
      the app bundle and symlinked on PATH by the app (`open_path`-style, no sudo), so
      "the CLI" and "the app" are one install.
- [ ] 2.3 Curl installer `install/install.sh` per scuttlarr's ROADMAP: preflight → brew
      → `brew install mitchmalone/tap/scuttlarr` → launch app → app offers the
      "Machine" rung. Served at scuttlarr.com/install.
- [ ] 2.4 Migrations runner + `update`/`doctor`/`remove` per ARCHITECTURE, now callable
      from the app (`setup ⏎` panel; Settings → Machine) and from the CLI. The app never
      runs `defaults write` silently: rung 5 asks once with the plan, as designed.
- [ ] 2.5 Retire the scuttlarr repo: archive with the banner from 0.2.

### Phase 3 — Theme package (packages/theme), Omarchy model

- [ ] 3.1 Format decision (DECISIONS): adopt Omarchy's `colors.toml` key names verbatim
      (`mode`, `accent`, `selection`, `muted`, `background`/`dark_background`/…,
      `foreground`/…, 8 named colours + `bright_*`) so Omarchy themes port by copying the
      file. Our extra tokens (glass, sigil, bang, selected) are derived, overridable in a
      `[launcher]` table.
- [ ] 3.2 Pure TS renderer in `packages/theme` (TDD): parse + derive (mix, luminance →
      mode, legacy aliases), `{{ key }}` / `{{ key_rgb }}` / `{{ mix a b n% }}`
      substitution, no logic in templates. `BUILTIN_THEMES` in `@launcharr/tui` becomes
      generated from `themes/*/colors.toml` at build time — one source of truth, the site
      demo keeps importing tokens.
- [ ] 3.3 Templates for v1 surfaces: ghostty, tmux (colours + OSC payload), p10k, bat
      tmTheme, delta, borders/aerospace (replaces the ad-hoc `bordersArgs` colour inputs),
      macOS (`accent`, `highlight`, appearance), wallpaper pointer, Claude Code
      (`~/.claude/themes/<name>.json`, as Omarchy does), VS Code/Cursor name only.
- [ ] 3.4 Committed renders under `themes/<name>/` (usable without the CLI, publishable
      standalone). `pnpm verify` fails if renders are stale.
- [ ] 3.5 `theme set` in the app (Rust command, thin): stage into
      `~/.local/state/scuttlarr/next-theme/`, atomic swap to `current/theme/`, write
      `theme.name`, then fan out reloads in parallel: own windows (hot, exists), borders
      re-apply (exists), `killall -SIGUSR2 ghostty` (verify on macOS; fallback: Ghostty
      reload-config keybind is not scriptable, document), tmux OSC into every pane +
      SIGWINCH, `osascript` for appearance/accent/wallpaper, `theme-set.d/` user hooks.
      Base configs shipped by setup import from the state path (Ghostty `config-file`,
      tmux `source-file`, zsh sources p10k colours).
- [ ] 3.6 User themes: `~/.config/scuttlarr/themes/<name>/` overlays file-by-file on a
      same-named built-in; `theme install <git-url>` with Omarchy's name rules and the
      staging filter (drop symlinks and executable-shaped files from cloned themes).
- [ ] 3.7 Light mode first-class: Solarized Light and Catppuccin Latte render every
      surface; `mode` drives `color-scheme`, macOS appearance, and the bar's alert tones.
      Retires the light-mode roadmap item.

### Phase 4 — Theme policy + switcher (the original ask)

- [ ] 4.1 Theme pairs: `colors.toml` may name a `pair = "<theme>"` counterpart; config
      `appearance.theme = { light, dark }`.
- [ ] 4.2 `appearance.mode`: `system` (default; observe `AppleInterfaceThemeChangedNotification`
      via objc2 in a small unsafe module, letting macOS own sunrise/sunset), `light`,
      `dark`, `schedule` (`{ light: "07:00", dark: "19:00" }`, app-side timer).
- [ ] 4.3 macOS Focus: watch `~/Library/DoNotDisturb/DB/Assertions.json` (FSEvents, no
      permissions; verified readable 2026-09-11), read mode names from
      `ModeConfigurations.json`; `appearance.focus.<mode-id>` maps to a theme or a pair.
      Resolution order: manual override → Focus mapping → mode → default pair.
- [ ] 4.4 Switcher: `theme ⏎` panel (fuzzy list with swatch, Enter applies, ⌥⏎ sets as
      light/dark half of the pair), global hotkey default ⌥⌃⇧Space mirroring Omarchy,
      bar cell showing current theme optional. Settings → Appearance mirrors all of it.
      "Toggle Dark Mode" system command becomes "flip `appearance.mode`", never a naive
      AppleScript flip.
- [ ] 4.5 Wallpaper: Omarchy model — `themes/<name>/backgrounds/`, `background next`
      cycles, theme switch advances. Adjust later.

### Phase 5 — Docs close-out

- [ ] STATUS, ROADMAP (retire "scuttlarr contract", add rungs), PRD non-goals, README
      ("install, then enable more" ladder), CONTRIBUTING (overlay model), `docs/THEMES.md`
      rewritten against what shipped.

## Acceptance criteria

- [ ] One repo named scuttlarr; scuttlarr repo archived with a pointer; `pnpm verify`
      green including the ported zsh tests.
- [ ] Upgrading from the last launcharr release migrates config, caches, plist, hooks, and
      generated-file markers with no user action; `brew upgrade` follows the cask rename.
- [ ] launcharr.com redirects; scuttlarr.com serves the site and `/install`.
- [ ] `theme set dracula` retints app windows, borders, Ghostty, tmux, prompt, macOS
      accent and appearance, wallpaper, and Claude Code in one action; committed renders
      match the renderer.
- [ ] Solarized Light passes the same check; nothing assumes dark.
- [ ] Turning on the Work Focus switches the theme within a second, with no permission
      prompt; toggling macOS appearance switches the pair.
- [ ] `theme ⏎` and the hotkey open the switcher; Esc restores focus (invariant 6 holds).
- [ ] Performance budgets unchanged: theme work is off the summon/keystroke/launch paths;
      numbers recorded in this file before phase 4 closes.

## Out of scope

- Redesigning the bar or launcher. The fold changes ownership, not features.
- A theme editor UI. `colors.toml` is the editor.
- Bundling AeroSpace or JankyBorders (licence decisions 2026-08-17 stand).
- Notifications / Focus _defaults_ (still plist-hostile; only Focus _detection_ ships).
- Intel.

## Risks / open questions

- **Ghostty reload on macOS.** Omarchy uses `SIGUSR2`; unverified that macOS Ghostty
  honours it. If not, the terminal retints on next window until upstream offers a CLI
  reload. Verify in 3.5 before promising it.
- **Rename lands on a busy main.** Plugin permissions work shipped 2026-09-10; do 1.x as
  one PR with `dev-install.sh` smoke on the primary Mac, and nothing else in flight.
- **Cask rename and Homebrew.** `deprecate!`/`replacement` handles `brew upgrade`; a user
  with both installed ends up with two apps. Release notes say so.
- **Hook rewrite in `~/.claude*/settings.json`.** Editing a file we don't own is exactly
  the manifest case; 1.3 must go through adopt-and-record, not a blind `sed`.
- **Omarchy key names vs our token names.** Adopting theirs means two vocabularies inside
  `@launcharr/tui` for a while (`bg` vs `background`). Accept; the derived map is one
  function and the compatibility win (copying Omarchy themes) is worth it.
- **`packages/setup` stays zsh.** It runs before the app exists and must not need Rust or
  Node. Two languages in one repo is already true (Rust + TS); this is a third. Recorded
  in DEVIATIONS; revisit only if the CLI outgrows shell.
- **Scope of "one action".** Phase 3.5 fans out to a dozen processes; failures must be
  fail-visible per surface (a toast listing what didn't reload), never a half-applied
  theme with no message.
