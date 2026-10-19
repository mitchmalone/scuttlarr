---
title: First-launch setup
status: done
created: 2026-10-19
updated: 2026-10-19
links:
  - Notion ticket "Set up scuttlarr on first launch" (Feature Backlog, Next)
  - Claude Design project "scuttlarr first-launch setup", file `Onboarding Pixel.dc.html` (turn 3a)
  - Launcharr landing page design, Pixel Hero 2c (the field's visual language)
---

# First-launch setup

## Goal

The first time scuttlarr opens, a short setup in the launcher panel walks through the
choices that matter (hotkey, bar, agents, theme, tiling), ends on one summary of what
will change, and applies it with one Enter. Today first run is an empty prompt and every
rung is found by reading docs or digging through Settings.

## Context

- PRD §4.5 said "no onboarding wizard"; this replaces that line and the shipped
  first-run hint (DECISIONS 2026-10-19, "First-launch setup").
- Rust already knows first run (`load_or_create` returns it), but the webview was never
  told. Config is plain JSON, written by the one atomic writer (`write_config`), hot-applied
  by the config watcher.
- Design: Claude Design turn 3a. One question per screen, a calm dithered field behind
  it that answers the keyboard, the real bar (not a drawing) on the bar and agents screens.

## Approach

- **`setupPending` config key.** Only a freshly created file says true
  (`load_or_create_at`); a missing key is false, so upgraders and a broken hand-edit's
  fallback never see setup. No new IPC command, survives a quit mid-setup.
- **A panel tenant, `setup`.** Registered like `theme ⏎` (trigger + fuzzy row), rendered
  bare (no breadcrumb) at 640 x 500. App opens it when the loaded config has
  `setupPending`, and keeps it across hide/show so the hotkey step can be tried.
- **Pure logic in `lib/onboarding.ts`** (tested; `lib/setup.ts` is the machine-rung CLI): steps, choices from config, skip,
  `applySetup` writing exactly the keys Settings writes (`hotkey`, `bar.enabled`,
  `agents.monitor/usage/claudeCreds`, `pickTheme`, `appearance.everywhere/editors`,
  `desktop.tiling.enabled`, `setupPending`).
- **Real bar previews**: the Bar stories' sample data moves to `bar/fixtures.ts` and both
  the stories and setup render `barZoneNodes` from it.
- **The field**: `onboarding/field.ts`, a canvas behind the panel UI while setup is open.
  30 fps cap, paused while the panel is hidden, one still frame under reduced motion,
  torn down on close.

## Steps

- [x] Rust: `setup_pending`, set only on a fresh file; test.
- [x] `lib/onboarding.ts` + tests (red first).
- [x] `bar/fixtures.ts` extracted from `Bar.stories.tsx` (story titles unchanged).
- [x] `onboarding/field.ts` (+ palette tests), `OnboardingPanel.tsx` (pure, owns keys and
      the field), `OnboardingBars.tsx` (real bar), `OnboardingPanelContainer.tsx`,
      `onboarding.css`, `OnboardingPanel.stories.tsx` ("OnboardingPanel (app)").
- [x] App wiring: registry entry (`setup`, Ship icon), 500 px height, bare render,
      auto-open on `setupPending`, kept across hide/show.
- [x] Docs: PRD §4.5, README first run, DECISIONS, STATUS.
- [x] Workbench screenshots of every step (headless Chrome): clean, no console errors.
- [x] `pnpm verify` green.

## Acceptance criteria

- [ ] A fresh install opens setup on first launch; reaching a working bar and launcher
      takes under a minute without opening Settings.
- [x] Every step writes the same config keys Settings does; nothing is written before
      the final Enter (`applySetup` tests).
- [x] An upgrader never sees it unless they run `setup ⏎` (config.rs test).
- [x] Esc skips a step (`skipStep` tests); Esc on the welcome or recap screen puts setup off
      (clears the flag).
- [x] No dialogs, no new windows, no emoji; the Keychain read is an opt-in checkbox and
      prompts only later, from macOS, on the first usage scan.
- [x] `pnpm verify` green.
- [ ] Hands-check (Mitch): fresh-install path on a clean user; hotkey try (hide, return);
      theme preview restores on Esc; field pauses while hidden.
- [x] Memory: setup adds no process, window, watcher or resident cache; the canvas lives
      only while setup is open (no `scripts/mem.sh` reading needed by the DoD rule).

## Out of scope

- A separate onboarding window (the ticket keeps it in the launcher panel).
- Installing AeroSpace from setup (the cask depends on it; Settings → Desktop installs it
  otherwise, and setup says so).
- Fixing the appearance policy gate (STATUS "Next tickets"); setup writes `appearance`
  through `pickTheme` exactly as Settings and `theme ⏎` do.

## Risks / open questions

- The hotkey step's "try it" relies on hide then show while setup is open; a click outside
  also hides the panel and would count. Acceptable: it still proves the panel comes back.
