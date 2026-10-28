---
title: Agent dots — states by shape, honest liveness, a card worth hovering
status: done
created: 2026-10-28
updated: 2026-10-28
links:
  - Notion backlog "Agent states you can read by shape" (Feature Backlog, Area Agents)
  - Claude Design "scuttlarr agent dots" cb5181e2-18df-4a67-a5d6-c9fb70b9b04d (v2 is the signed-off file)
  - DECISIONS 2026-08-19 (bar colours are theme tokens only), 2026-08-18 (liveness is observed)
---

# Agent dots

## Goal

The bar's agent cells tell working, needs-you, done-unread, done-read and idle apart by
shape, not colour alone; an agent stays on the strip for as long as its tmux pane or
process is alive; the hover card says what state, what it is doing and where it is, in
words, with the same icons.

## Context

- Field report 2026-10-28: 9 Claude sessions in tmux panes, 5 cells on the bar. The four
  missing had been silent for over 12 h. `reap()` ran the `pruneHours` sweep _before_ the
  pane/pid liveness checks, so "idle for a while" was read as "dead". `apply()` ran the
  same sweep on every event.
- `AGENT_GLYPHS` drew working and done as the same `●`; `AgentsPanel.tsx` had its own copy
  of the table (a second source, against invariant 10's spirit).
- The subagent shoulder count never worked reliably and looked wrong on the site. Retired
  (Mitch, 2026-10-28).
- The psyke Claude config dir had 7 of 10 hook events registered: `boot()` repairs paths
  but never adds events, so events added after an install were missing there.

## Approach

Design signed off in Claude Design v2 (strip option A, single-agent cards, no subagent
indicator). Shapes are inline SVG components in `packages/tui` (lucide sizing, ICON_PROPS)
imported by the bar, the card, the panel and the site. Colour rule unchanged except
attention moves `danger` → `warn`. Rust gains `started_at`/`state_since` so the card can
show turn and session durations, and a `read` state so done-read has its own shape. The
hook emits a `Tool object` detail (`Edit format.ts`, `Bash pnpm verify`) that the kit
translates into a verb plus icon.

## Steps

- [x] Rust: reap order (pane/pid beat the silence sweep), no sweep in `apply`, `started_at`,
      `state_since`, `read` state on jump, drop `subagents`; tests
- [x] Rust: `boot()` registers missing events where our hook is already installed
- [x] Hook: `detail` = `Tool object`; PermissionRequest/Notification keep the message
- [x] Kit: `AgentStateIcon`, `agentDoing`, state labels; retire `AGENT_GLYPHS`/`agentGlyph`
- [x] Kit: bar cell + card redesign (bar.css); spinner/breathe + Reduce Motion
- [x] Desktop: panel uses the kit icon; `showIdle` hides `read` too; fixtures/stories
- [x] Site: legend and demo data follow the kit; no subagents
- [x] `pnpm verify`; dev-install; docs
- [ ] Hands-check the strip and card (STATUS → Needs Mitch)

## Acceptance criteria

- [ ] With 9 agents in tmux panes and 4 silent > 12 h, all 9 show (after their next event) — hands-check
- [x] Each of working / attention / done / read / idle / unknown has a distinct shape at 14px
- [x] Only the working ring and attention ring move; both stop under Reduce Motion (CSS; hands-check the macOS toggle)
- [x] No subagent count anywhere; no second glyph table anywhere
- [x] `pnpm verify` green; no new process, window or watcher (no mem.sh needed)

## Out of scope

- A tmux reconcile that adopts panes running an agent without a hook event (would need a
  known-agent-name list, which DECISIONS 2026-08-18 deliberately avoided). Missing agents
  return on their next hook event.
- Group hover card (designed in v1, parked).
- `agents ⏎` panel layout beyond swapping the icon.

## Risks / open questions

- `read` is a new store state; adapters never emit it. Any event overwrites it. Fine.
- `started_at` is 0 for records persisted before this change; the card falls back to
  `updated_at`.
