---
title: usage — every account, in the menubar
status: done
created: 2026-08-27
updated: 2026-08-27
links:
  - plans/done/usage-panel.md, plans/done/agents-settings-and-limits.md (what this extends)
  - CodexBar (https://github.com/steipete/CodexBar) — design reference only, never mechanics
  - docs/DECISIONS.md 2026-08-27 (account discovery convention; usage rides the bar push)
---

# usage — every account, in the menubar

## Goal

1. **Menubar.** A `usage` bar cell — CodexBar's "tiny usage meter" in our style: a
   small meter glyph + the % of the tightest active window across every account, tiered
   warn/danger like battery. Hover card = one tile per account (windows, reset
   countdowns, staleness); click opens `usage ⏎`.
2. **Every Claude sub.** Mitch runs `~/.claude` (personal) and `~/.claude-psyke` (work,
   via `CLAUDE_CONFIG_DIR`). Both are monitored: local journals split per account,
   limits fetched per account.
3. **Looks great.** The panel gets an _All_ overview (account tiles) plus per-account
   detail; the panel moves into `@launcharr/tui` so the site demos the real thing
   (invariant 10 — the www stub was a replica).

## Approach

- **Account discovery is a directory convention, zero config**: `~/.claude` plus every
  `~/.claude-*` directory (that is how `CLAUDE_CONFIG_DIR` users split subs). Identity
  comes from that dir's `.claude.json` → `oauthAccount` (`~/.claude.json` for the
  default dir): label = organizationName, or the email when the org is the personal
  `<email>'s Organization`; fallback = dir name. `agents.claudeAccounts` overrides
  labels / hides dirs (hackable in config.json).
- **Credentials per account**: `<dir>/.credentials.json` first (silent), else the
  keychain item Claude Code names by config dir — `Claude Code-credentials` for the
  default dir, `Claude Code-credentials-<sha256(dir)[..8]>` otherwise (verified against
  the live keychain 2026-08-27: `/Users/mitch/.claude-psyke` → `4051cf21`). One consent
  (`claudeCreds`) covers all Claude accounts; each keychain item prompts once.
- **Report shape**: `ProviderUsage` gains `id` (the panel/bar key — `claude`,
  `claude-psyke`, `codex`), `provider` (kind), `label`, `account` (email). `LAST_GOOD` is
  keyed by id. `usage::bar_state()` folds the cached report into a compact
  `UsageBarState` on the 1 Hz `BarSnapshot` — no new IPC command; the bar's presence
  keeps the 60 s refresh alive so the cell is never stale.
- **Kit**: `UsagePanel` + `BarUsageCell`/`BarUsageCard` + a `UsageMeterIcon` in
  `packages/tui`; desktop and www import them.

## Steps

- [x] usage.rs: account discovery + identity (tested), per-account creds/keychain
      service (tested), report ids/labels, `bar_state`
- [x] config: `claudeAccounts` overrides (Rust + TS mirror)
- [x] tui: types, `UsagePanel` (All tiles + account detail), bar cell/card/icon, CSS,
      stories
- [x] desktop: container/registry, bar module `usage` (+ defaults, labels), settings
      (accounts list), `open_panel` click-through
- [x] www: import the kit panel + cell; fictional data in the real shape
- [x] verify; rebuild + relaunch; DECISIONS/STATUS/JOURNAL
- [ ] hands-check against claude.ai/settings/usage for both accounts (Mitch)

## Acceptance criteria

- [ ] Bar shows one usage cell; hover lists Personal + Psyke + Codex tiles with live
      windows; tightest window drives the cell's % and tone
- [ ] `usage ⏎` All view tiles every account; ←→ walks All → accounts; per-account
      tokens by day/model come from that account's journals only
- [x] Fresh config: unchanged from outside (usage off → no cell, no scan, no network)
- [x] `pnpm verify` green; no token refresh code paths

## Out of scope

- Threshold notifications; dollar cost estimation
- launcharr-owned sign-in; multiple Codex accounts (single auth.json today)

## Field notes (2026-08-27)

- Keychain naming + `.claude.json` location per config dir: JOURNAL 2026-08-27.
- Real-home scan with both accounts (ignored test `scan_real_home`): 700 ms cold, 30 ms
  warm; personal 7d ≈ 228M tokens, psyke ≈ 484M — the work account is the heavier one.
- Hands-check on Mitch: hover the cell → two Claude tiles + Codex; `usage ⏎` → All tiles,
  ←→ into each account; Settings → Agents → Usage lists both dirs with rename/hide.
