# AGENTS.md — scuttlarr

<!-- One line: what this product is and who it's for. -->

scuttlarr is …

## Standard

This project was stamped from the [jig](https://github.com/mitchmalone/jig). Its standard lives **in this repo** at `docs/STANDARDS.md` (vendored at stamp time) — that copy governs; do not consult or "upgrade to" the jig's current version mid-task. This file carries **deltas only** — identity, stack, invariants — never restatements. Divergences live in `DEVIATIONS.md` with a justification. Refreshing `docs/STANDARDS.md` from the jig is a deliberate reconciliation, done as its own change.

## Docs system

Living state is in `docs/` — see the standard for roles and discipline. Session protocol: orient on `docs/STATUS.md` and `docs/plans/active/` → plan before non-trivial work → record decisions/gotchas as they happen → close out docs in the same commit as the code.

## Stack

<!-- Table or short list: runtime, frameworks, data, deploy target. Delete what doesn't apply. -->

| Surface | Choice |
| ------- | ------ |
| …       | …      |

## Invariants

<!-- Numbered, non-negotiable, product-specific. Decided once — don't relitigate here; that's DECISIONS.md's job. Exemplars of the right altitude, from a real project:
"**`packages/<core>` is pure.** No I/O, no network, no direct `Date.now()` — time is injected. Every behaviour is unit-tested. If you're tempted to import anything with a side effect, you're in the wrong package."
"Sync state transitions, never ticks — nothing that runs every second may touch the network." -->

1. …

<!-- Optional, for perf-sensitive products — budgets are requirements:

## Performance budgets

| Metric                       | Budget                  |
| ---------------------------- | ----------------------- |
| e.g. keystroke → new results | < 16 ms (one frame)     |
| e.g. idle memory             | < 120 MB ceiling        |

A budget miss cuts or flags the offending feature. Measure before claiming;
record numbers in the plan file or JOURNAL. Release notes carry a
"Performance receipts" table; the release gate refuses while `_ ms`/`_ MB`
placeholders remain. -->

## Commands

| Command       | What                                             |
| ------------- | ------------------------------------------------ |
| `pnpm dev`    | Run all apps in parallel                         |
| `pnpm verify` | The gate: typecheck + lint + format check + test |

## Definition of done

- `pnpm verify` green.
- New behavior has tests, written first (red/green/refactor).
- `docs/STATUS.md` updated and the plan moved to `done/` in the same commit.
