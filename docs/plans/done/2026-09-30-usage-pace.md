---
title: Usage pace, not percent
status: done
created: 2026-09-30
updated: 2026-09-30
links:
  - DECISIONS 2026-09-30 · The usage cell shows pace, not percent
  - plans/done/usage-accounts-and-bar.md
  - https://github.com/mitchmalone/scuttlarr/pull/3
---

# Usage pace, not percent

## Goal

The bar's usage cell warns before you run out, instead of reporting how much is spent:
green when there's headroom to spin up agents, red when usage outruns the clock.

## Context

The cell showed the tightest window's percent, which ignores where in the window you
are — 80% an hour before reset is fine, 80% a day into the week is not. Builds on the
usage monitor (`usage.rs`, `packages/plugins/usage`, `components/usage.tsx`).

## Approach

Judge each window's percent used against how far through it "now" is
(`windowPace`); worst judged window wins per account and for the cell. The window's
length comes from the provider (`LimitWindow.windowSecs`). Colour carries the signal;
the percent leaves the cell and card (hover a row for it) and stays in the panel.
Alternatives in DECISIONS.

## Steps

- [x] `windowSecs` in usage.rs (Claude flat fields fixed, `limits[]` from whole words
      of `group`/`kind`, Codex `limit_window_seconds`)
- [x] Pace functions + tests, including Mitch's three cases
- [x] `good` theme token (palette green) across all 14 themes
- [x] Card redesign after Mitch's reference: pace tile, tokens today, provider marks
      (official SVGs), "now" tick, two-unit countdowns
- [x] Bar dropdown ceiling = display height (the taller card clipped at 480px)
- [x] Review (PR #3): early-window burst guard, stale resets and unknown-length windows
      sit out the fold, whole glyph fill, word-boundary window matching

## Acceptance criteria

- [x] 10% @ 20% → normal, 50% @ 55% → normal, 80% @ 30% → alert (unit tests)
- [x] `pnpm verify` green
- [x] Dev-installed; card hands-checked by Mitch (spacing, icons, no clipping)
- [x] Memory: no new process, window, watcher or cache — `scripts/mem.sh` not needed

## Out of scope

Knowing which account is active (the cell can't yet follow only the one in use); a
projected run-out time.

## Risks / open questions

- Thresholds (±15/25 pts, 15% early stretch, 40-pt sprint) are first guesses — tune
  from daily use.
- Worst-across-accounts: an exhausted secondary account keeps the cell red.
