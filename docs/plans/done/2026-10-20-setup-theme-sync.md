---
title: Setup follows the theme
status: done
created: 2026-10-20
updated: 2026-10-20
links:
  - plans/done/2026-10-19-first-launch-setup.md
  - DECISIONS 2026-10-19 "First-launch setup"; 2026-10-20 "Setup owns the panel theme while it is open"
---

# Setup follows the theme

## Goal

Setup's pixel field and the panel around it always wear the same theme, including when
the theme changes while setup is open, and applying setup never writes back a theme the
user didn't pick.

## Context

- Bug: "Setup goes dark-on-light when the theme changes." The field colours come from
  `choices.theme`, read once when setup opens; App re-applies `config.theme` to the
  panel on every config change. A theme change mid-setup (appearance policy, Settings,
  a Focus, a `config.json` edit) moves the panel and not the field: cream plates on a
  navy field under a light theme.
- A fresh install on a light-mode Mac hits it unprompted: the fresh config says
  `scuttlarr`, the policy writes `solarized-light` just after setup opens (JOURNAL
  2026-10-19, the gate that never holds).
- Second symptom: `applySetup` compared the stale `choices.theme` against the fresh
  config and called `pickTheme` with it, so applying put `scuttlarr` back over the
  policy's light choice.
- Repro: theme scuttlarr, `setup ⏎`, hotkey screen, write `"theme": "solarized-light"`
  into `~/.config/scuttlarr/config.json`.

## Approach

`choices.theme` stays the one source for both the field and the panel, and it follows
the config until the user picks a theme on the theme screen:

- `SetupChoices.themePicked`: set by a theme pick (`chooseSetup`), cleared by Esc on the
  theme screen (it is one of that step's fields, so `skipStep` restores it).
- `followConfig(choices, config)`: an unpicked theme takes the config's. The container
  listens to `config-changed` and runs it over both `choices` and `base` (so Esc on the
  theme screen puts back the theme in force now, not the one setup opened on).
- `applySetup` writes the theme only when it was picked; otherwise the config's own
  theme (fresh, read inside the atomic writer) stands and `pickTheme` never runs.
- App stops applying `config.theme` to the panel while the setup tenant is open; setup
  owns the panel theme for its lifetime (preview, follow, restore on close), and App
  takes it back when setup closes. Without this, a config change during a preview
  stomps the preview, and child-before-parent effect order makes "re-apply after App"
  unreliable.

Alternative considered: pass App's config down as a prop instead of a second listener.
Rejected: the container already reads config itself (one read on open), and the
registry renders tenants with `onClose` only; one more `config-changed` listener is
local and costs nothing.

## Steps

- [x] Tests first in `lib/onboarding.test.ts` (follow, pick, skip, apply)
- [x] `lib/onboarding.ts`: `themePicked`, `chooseSetup`, `followConfig`, apply rule
- [x] Container: `config-changed` listener, `chooseSetup` on every choice
- [x] App: no panel theme apply while setup is open
- [x] `pnpm verify`
- [x] Hands-check (below)

## Acceptance criteria

- [x] scuttlarr, `setup ⏎`, hotkey screen, config edit to `solarized-light`: field and
      panel both go light; every screen reads.
- [x] Reverse (solarized-light to scuttlarr mid-setup): both go dark.
- [x] A theme picked on the theme screen survives a config theme change and is what
      apply writes; an unpicked theme is never written back.
- [x] Fresh config with macOS in light mode: light from the first screen, config keeps
      `solarized-light` after apply.
- [x] `pnpm verify` green.
- [x] Memory: no process, window, watcher or cache added (one event listener in a
      tenant that is already mounted); no `mem.sh` reading needed.

## Hands-check (2026-10-20, Mac Mini, ad hoc signed build in ~/Applications)

Screenshots: `~/.openclaw/workspace/projects/scuttlarr/shots/fix-setup-theme-sync/`.

- Repro (scuttlarr, `setup ⏎`, hotkey screen, config edit to solarized-light): field and
  panel both light (02 → 03). Pass.
- Reverse mid-setup: both dark (04). Pass.
- Dark pass over bar, agents, theme, tiling, recap (05-09); light pass over recap,
  tiling, theme, agents, bar, hotkey, welcome after a flip on the recap screen (10-16).
  No new contrast or background issues.
- Pick `synthwave`, then config edit to scuttlarr: the pick holds in field and panel,
  apply writes `synthwave` through `pickTheme` (17-19). Pass.
- Untouched theme, flipped to solarized-light mid-setup, apply: config stays
  `solarized-light` (20-22). Pass.
- Fresh config, macOS in light mode: config resolves to `solarized-light` before the
  first summon; setup light from welcome; apply keeps `solarized-light` (26-28). Pass.
  Setup did not open by itself on the first summon here (23-25): the launch toast for a
  resumed awake hold clears the panel mode (JOURNAL 2026-10-20). Not this change; a real
  fresh install has no hold to resume.

## Out of scope

- The theme policy gate itself (JOURNAL 2026-10-19; its own ticket).
- `theme ⏎`'s preview, which has the same shape of race with App's apply; not reported.

## Risks / open questions

- A pick that equals the current theme still counts as a pick; it wins over a later
  policy flip, as any explicit choice should.
