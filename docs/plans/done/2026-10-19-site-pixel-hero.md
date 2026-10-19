---
title: Site pixel hero
status: done
created: 2026-10-19
updated: 2026-10-19
links:
  - ../../DECISIONS.md (2026-10-19 · The site hero is a pixel field in the picked app theme)
  - Claude Design project "Launcharr landing page design", file "Pixel Hero" (option 2c)
---

# Site pixel hero

## Goal

Give scuttlarr.com a hero with its own identity: a pixel field in the app's theme that
reacts to typing, keyboard-first as an interaction rather than a claim.

## Context

Designed first in Claude Design (three rounds: 1a–1c, 2a–2d, 3a–3b); Mitch picked 2c.
The demo already renders in app theme tokens with its own picker (invariant 8 exception).

## Approach

Pure engine in `apps/www/src/lib/hero-field.ts` (ramp, noise, dither, pulses, typist,
`paintFrame`), a client component `components/hero-field.tsx` for canvas, clock and
listeners, and `lib/app-theme.ts` so the demo picker and the hero share one theme.

## Steps

- [x] Engine + unit tests (`hero-field.test.ts`, 28 cases)
- [x] `HeroField` / `HeroPrompt` component, page tokens scoped to the theme
- [x] Shared app-theme store; demo picker uses it
- [x] Hero restructured: band (headline, prompt, CTAs, version), long copy below
- [x] Invariant 8 exception + DECISIONS entry

## Acceptance criteria

- [x] `apps/www` typecheck, lint, prettier, vitest green; static export builds
- [ ] Hands-check (Mitch): field renders, hover + type pulses, Enter rings, idle typing,
      demo picker retints the band, reduced motion shows a still frame,
      mobile width
- [ ] Full `pnpm verify` and CI on push

## Out of scope

Desktop app (no change to the app, so no performance-budget or mem.sh impact). The jolly
roger cursor (3a/3b). A theme default that follows the site's light/dark mode.

## Risks / open questions

- Light site mode is gone (2026-10-20, `2026-10-20-site-theme-picker.md`): the whole
  page now wears the app theme, so the band no longer scopes tokens of its own.
