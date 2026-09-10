---
title: Plugin permissions — declare, ask first, block on denial
status: done
created: 2026-09-10
updated: 2026-09-10
links:
  - DECISIONS 2026-09-10 (permissions), 2026-09-10 (Bluetooth usage string)
  - docs/PLUGINS.md `permissions`
  - plans/done/amaran-plugin-bluetooth.md (the plugin that forced it)
---

# Plugin permissions

## Goal

A plugin that needs a macOS privacy permission gets it or fails visibly — never a helper
killed by TCC with no prompt. Generic across classes, since plugins will want many.

## Context

`NS…UsageDescription` strings live only in the bundle's Info.plist, read by TCC for the
_responsible_ app (launcharr.app) whatever the child. So recovery cannot mean acquiring the
string at run time; it means shipping the strings, asking at a predictable moment, and
showing a denial as state with a fix.

## Approach

`permissions.rs` (enum + usage keys + TCC query + request + Privacy-pane URL), a
`permissions` manifest field validated on parse, `PluginState.permissions` mirrored in
`@launcharr/tui/plugins`, supervisor gate reusing the `needs` path, signal-death handling
in `run_stream`, `plugin_permission_fix` command, a `PluginPermissions` block in
Settings → Plugins. Info.plist carries all nine classes.

## Steps

- [x] `permissions.rs` with tests (names, list parsing, usage-key check, enum mapping, URLs)
- [x] Manifest + state + supervisor + signal handling in `plugins.rs`
- [x] TS mirror types; Settings row with ask / open-privacy buttons
- [x] Info.plist: nine classes, eleven keys (calendars/reminders old + new)
- [x] `pnpm verify` green; app built
- [x] amaran manifest declares `bluetooth`
- [x] Hands-check (Mitch): reinstall → `asked macOS for Bluetooth` in the log → prompt at start → cell
      connects (2026-09-10). Deny-then-allow path not yet exercised.

## Acceptance criteria

- [x] Unknown permission name fails the manifest with the known list
- [x] Denied or missing-string permission keeps the service from starting, cell dim, row explains
- [x] Prompt appears in launcharr's name at service start, once

## Out of scope

Accessibility and Full Disk Access (invariant 1 — never); Screen Recording (the loupe's
own opt-in); revoking or auditing what an undeclared plugin touches.

## Risks / open questions

- `+[CBCentralManager authorization]` and friends are queried via dynamic class lookup;
  a framework missing on some macOS reads as `unknown` and does not block.
- Local network has no query API: `unknown`, prompts on first use.
