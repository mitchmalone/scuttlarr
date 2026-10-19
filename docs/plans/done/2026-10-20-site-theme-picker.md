---
title: Site theme picker
status: done
created: 2026-10-20
updated: 2026-10-20
links:
  - ../../DECISIONS.md (2026-10-20 · The site wears the picked app theme, whole)
  - Claude Design project "Launcharr landing page design", file "Theme Selector" (option 1a)
---

# Site theme picker

## Goal

Switch scuttlarr.com between entire app themes, not just light and dark. scuttlarr by
default.

## Context

The site had a light/system/dark switch (`next-themes`) over a hand-typed two-mode
palette; the demo and hero already rendered in app theme tokens via `lib/app-theme.ts`.
Designed first (1a dropdown, 1b strip, 1c typeahead, 1d sheet); Mitch picked 1a: closed
chip shows the palette only, menu shows names, hover-open and stay-open on desktop,
tap-open and pick-closes on touch.

## Approach

`lib/page-theme.ts` maps theme tokens to page vars (pure, tested) and builds the inline
boot script from the same mapping. `lib/app-theme.ts` applies vars to `<html>` and
persists. `components/theme-picker.tsx` replaces `theme-switch.tsx` in both headers.

## Steps

- [x] `pageVars` + `themeBootScript` + tests (`page-theme.test.ts`)
- [x] Store applies to `<html>`, persists, starts from the boot script's choice
- [x] Layout renders scuttlarr vars and runs the boot script; `globals.css` palette and
      `next-themes` removed
- [x] Hero drops its band scope (the page already wears the theme)
- [x] `ThemePicker` in site and docs headers; demo dropdown unchanged, same store
- [x] Invariant 8, DECISIONS, STATUS

## Acceptance criteria

- [x] `apps/www` typecheck, lint, prettier, vitest green; static export builds
- [x] Hands-check (Mitch, 2026-10-20): no flash on reload, iPad tap/pick/outside-tap
      right, themes read fine; follow-up applied: full display names, no "light" tag
- [ ] Full `pnpm verify` and CI on push

## Out of scope

Desktop app (no change). Custom user themes on the site. A `t` shortcut.

## Risks / open questions

- terminal and amber are monochrome, so headline, CTA and stats share one hue.
