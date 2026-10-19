---
title: Defaults flip — install gets the bar and the launcher
status: done
created: 2026-10-19
updated: 2026-10-19
links:
  - ../../DECISIONS.md (2026-10-19 defaults flip; invariant 3)
  - 2026-10-19-docs-truth-and-stories.md (where the contradiction was found)
---

# Defaults flip

## Goal

Make the code match the stated product: a fresh install gets the bar and the launcher;
Desktop, Theme and Machine are opt-in. Upgraders keep exactly what they had.

## Context

The docs-truth pass found `bar.enabled` defaulting off and `desktop.tiling.enabled`
defaulting on (managed), the reverse of AGENTS.md, the PRD and the README's old intro.
Defaults only fill missing keys, so a flip alone would silently change any upgrader
without explicit keys.

## Approach

- `BarConfig::default().enabled = true` (config.rs); `DEFAULT_DESKTOP.tiling.enabled =
false` (core). The app's placeholder config follows.
- `defaultsVersion` in `config.json` (current: 2). `migrate_defaults` runs on the raw
  JSON at load: a file without the key gets `bar.enabled: false` and
  `desktop.tiling.enabled: true` inserted where absent, is stamped 2, and is written back
  as the user's own JSON plus those keys (not the full serialised `Config`). Explicit
  values are never touched. A broken file is neither migrated nor written.
- A Settings write without the key deserialises to the current version (struct default),
  so a webview round-trip can't re-trigger the pin.
- `applyDesktop` doesn't call `desktop_status` while tiling is off (no `aerospace
--version` spawn, invariant 12); the apply itself still runs so borders stop.

Alternative rejected: detecting old files by shape. A fresh file's `desktop` is `{}` too,
so a fresh install would get tiling pinned on at its second launch.

## Steps

- [x] Rust default + migration + tests (fresh, upgrade, explicit values kept, broken file,
      Settings write)
- [x] TS default + `applyDesktop` probe guard + tests (`lib/desktop.test.ts`)
- [x] README intro and Defaults table, PRD §5 presence line; AGENTS.md already agreed
- [x] DECISIONS 2026-10-19 (defaults flip; invariant 3 at 82 commands), AGENTS.md
      invariant 3 reworded
- [x] Theme-policy regression test: a config with no `appearance` key in the webview
      never switches (passes); the shape Rust delivers for that file does switch, pinned
      as `it.fails` in `lib/theme.test.ts` until the fix lands
- [x] Dev-install; Mitch's config gained only `"defaultsVersion": 2` (both keys were
      explicit)

## Acceptance criteria

- [x] Fresh install: bar on, no `aerospace.toml`, no AeroSpace probe (tests)
- [x] Upgrade: old effective values pinned once, later edits respected (tests)
- [x] `pnpm verify` green
- [x] Memory: `scripts/mem.sh`, bar on in both readings (Mitch's config had it on):

| Reading                                  | scuttlarr | + plugins (bun ×2, ble-helper) | borders | total |
| ---------------------------------------- | --------- | ------------------------------ | ------- | ----- |
| Before, v0.7.0+main, 25 h uptime         | 240 MB    | 80 MB                          | 330 MB  | 650   |
| Before, same build, ~2 min after restart | 120 MB    | 68 MB                          | 325 MB  | 513   |
| After, this build, ~1 min after install  | 157 MB    | 68 MB                          | 318 MB  | 542   |
| After, this build, ~3 min idle           | 143 MB    | 68 MB                          | 318 MB  | 528   |

The app alone is at or over the 120 MB ceiling with the bar on, and it grows with uptime
(240 MB after a day). This change adds no process or window for an install that already
had the bar; for a fresh install the bar's webview is the new cost. No bar-off reading was
taken (it would have meant flipping Mitch's live config). The shrink stays its own task
(STATUS "Next").

## Out of scope

- The theme policy gate (fresh install in light mode switches to `solarized-light`):
  pinned by the `it.fails` test, fix is the next ticket.
- Hotkeys bound to built-in rows; the `tauri build` DMG step.
- `apps/www` install copy still says the bar is off by default and mentions a hint line;
  true of the released v0.7.0, so it changes with the next release.

## Risks / open questions

- borders was restarted three times in the first ~90 s after launch (PIDs 7528 → 8824 →
  9481), then stayed up. Not chased; possibly the boot-time theme/config settles each
  re-sending different borders args.
