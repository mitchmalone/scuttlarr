---
title: Agent liveness — the process outranks the multiplexer
status: done
created: 2026-08-26
updated: 2026-08-26
links:
  - ../plans/done/agent-liveness.md
  - ../JOURNAL.md (2026-08-26)
  - ../DECISIONS.md (2026-08-26)
---

# Agent liveness — the process outranks the multiplexer

## Goal

A launcharr that cannot read tmux must lose pane _grouping_, never the agents
themselves. Today a bad pane read empties the bar: every Claude session here
lives in a tmux pane, so one wrong answer from `tmux list-panes -a` deletes the
entire fleet the instant a hook event lands.

## Context

Field bug, 2026-08-26: no agent cells at all, `agents.json` permanently `[]`,
monitoring on, hooks firing, socket bound. Diagnosis by injecting events on
`agents.sock`: a session carrying **any** pane id was reaped microseconds after
it was recorded, while the _same_ session without a pane survived and kept its
`pidComm`. Adding `"tmux":"%11"` to a live, surviving session killed it; removing
it brought the session back.

Cause: `tmux_layout()` returned an empty map marked `layout_fresh = true` — a
_successful but empty_ pane read — and `reap()` treats a trusted layout as
proof of death (`agents.rs`, pane branch, before the pid branch). Why the read
came back empty is process-local rot in that instance (it was also carrying 23
zombie children); tmux itself answered correctly from an identical environment,
a GUI launchd context and with no controlling terminal, and an unreachable
server exits 1, not 0.

## Approach

Two changes, both in `agents.rs`, neither dependent on knowing why that read
went wrong:

1. **Reorder `reap()` so the process gets a say.** A live pane still short-
   circuits as proof of life (and still costs no `ps` sweep). What changes is
   the _reaping_ direction: a pane missing from a trusted layout no longer
   reaps on its own — the pid is consulted first, and a live pid whose `comm`
   still matches keeps the session. Only a session with no pid, or a pid that
   is gone/recycled, can be reaped by a missing pane.
2. **Distrust an empty layout.** A running tmux server always has at least one
   pane, so a zero-pane success is a broken read, not an empty world: mark it
   untrusted and don't cache it, which routes it into the existing
   "ignorance keeps the session" path.

Alternative considered and rejected: pid-first ordering outright. It would have
flipped the documented 2026-08-18 rule that a live pane outranks a missing
process, and it costs a `ps` sweep on every tick in the all-tmux case.

## Steps

- [x] Test first: a live process survives a trusted layout that lost its pane
- [x] Test first: a successful-but-empty layout is not trusted
- [x] Move the `layout_fresh` reap out of the pane branch, below the pid branch
- [x] `trusted_layout()` helper: `Some(empty)` → untrusted, not cached
- [x] JOURNAL + DECISIONS entries; STATUS cursor
- [x] `pnpm verify`; rebuild + relaunch; confirm cells return

## Acceptance criteria

- [x] With a deliberately empty pane layout, a hook-fed session with a live pid
      stays in the store (unit test)
- [x] Existing reap tests unchanged and green — a live pane still outranks a
      missing process
- [x] `pnpm verify` green (cargo test + clippy `-D warnings` included)
- [x] Live: agent cells present in the bar after relaunch — this session's own
      cell, grouped `gogogo` / window `Launcharr`

## Out of scope

- The zombie children / why that instance's `tmux` read came back empty. Worth
  its own look (`.spawn()` without a wait somewhere); not this fix.
- Any change to the hook adapter or the wire protocol.

## Risks / open questions

- A pane that is genuinely gone while its agent process lives on now keeps its
  cell (pane-less, so it loses its group border and its jump target). That is
  the intended trade: a stale border beats a vanished agent.
