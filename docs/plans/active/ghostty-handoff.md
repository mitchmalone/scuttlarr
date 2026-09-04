---
title: Ghostty hand-off (bang mode, upgrades, agent jump)
status: active
created: 2026-09-04
updated: 2026-09-04
links:
  - ROADMAP "Ghostty hand-off" (v0.5 list)
  - DECISIONS 2026-08-25 (Ghostty named as a scuttlarr contract item)
  - plans/done/app-updates-plugin.md (the upgrade hand-off reuses `terminal::run`)
---

# Ghostty hand-off

## Goal

`!cmd ⏎`, the updates panel's `↵`/`a`, and the agent jump land in **Ghostty**, the
stack's only terminal (scuttlarr AGENTS: "Terminal: Ghostty"). Today `Terminal` is
`iTerm2 | Terminal` and Mitch's config still says iTerm2, so everything goes to iTerm.

## Findings (2026-09-04, Ghostty 1.3.1)

- Ghostty has **no AppleScript dictionary** and `ghostty +new-window` prints
  "not supported on this platform" on macOS.
- `open -na Ghostty.app --args -e …` starts a **second Ghostty instance** (two processes,
  two menu bars) — unusable. `open -a Ghostty.app --args …` without `-n` delivers nothing
  to a running instance.
- Therefore the only way into a running Ghostty without Accessibility is **through the
  multiplexer the Ghostty window is already showing**: tmux (`tmux new-window`) or herdr
  (`herdr tab create` / `herdr pane run` over its socket). Both are already stack
  citizens: launcharr reads herdr's socket (`herdr.rs`) and tmux's layout (`agents.rs`).
- On this machine right now: one tmux client, session `gogogo`, tty `/dev/ttys001`,
  `TERM=xterm-ghostty`, hosted by the Ghostty process. herdr server not running.

## Approach

Add `Terminal::Ghostty` (`"Ghostty"` on the wire) and make it the **default**. Ghostty
mechanics live in `terminal.rs` as plain functions with tests; nothing else learns about
Ghostty except the settings picker and the copy.

**`run(Ghostty, cmd, new_window)`** — first route that applies:

1. **herdr server running** (`~/.config/herdr/herdr.sock` connectable, same probe
   `herdr.rs` uses): create a tab in the focused workspace running `cmd` — use the herdr
   CLI (`herdr tab create …` / `herdr pane run …`; read `herdr tab create --help` and
   `herdr pane run --help` for the exact flags; prefer the socket request if `herdr.rs`
   already has a request helper you can reuse). Then `open -a Ghostty`.
2. **A tmux client is attached** (`tmux list-clients -F '#{session_name} #{client_tty}'`
   non-empty): `tmux new-window -t <session of the most recently active client>
"<cmd>; exec ${SHELL:-/bin/zsh} -l"` (empty `cmd` → plain `tmux new-window`). Then
   `open -a Ghostty`. `new_window=false` (bang "same window" preference) still means a
   new tmux _window_ — a tab, which is what "same window" means in a multiplexer.
3. **Ghostty not running**: `open -na Ghostty.app --args -e ${SHELL} -lic "<cmd>; exec
${SHELL} -l"` — the first instance is fine to start this way.
4. **Ghostty running, no multiplexer**: raise it (`open -a Ghostty`), copy `cmd` to the
   pasteboard, and return `Err(CmdError::Terminal("Ghostty is open without tmux or herdr —
command copied, paste it"))` so the panel shows why (fail-visible; there is no way in).

**`raise_tty(Ghostty, tty)`** — `open -a Ghostty` (Ghostty can't address a window by tty;
tmux/herdr already selected the pane, and Mitch runs one window per multiplexer).

**`effective_terminal`** — Ghostty if `/Applications/Ghostty.app` (or `~/Applications`)
exists, else iTerm2 if installed, else Terminal.app. Default config value: `Ghostty`.

**No osascript on the Ghostty path** → no Automation consent (invariant 1 gets simpler:
the consent prompt is now "iTerm2/Terminal.app only").

## Steps

- [x] `config.rs`: `Terminal::Ghostty` (`rename = "Ghostty"`), default → Ghostty, tests.
- [x] `terminal.rs`: routes above as pure `plan_*` functions returning a small enum
      (`HandOff::{Herdr(..), Tmux{session, argv}, OpenNew(argv), RaiseAndCopy}`) that
      `run` executes — the planner is unit-tested with fake probes; the executor is thin.
- [x] `plugins.rs` (`upgrade_in_terminal` label), `commands.rs` if it names the terminal.
- [x] TS: `apps/desktop/src/lib/config.ts` union, `SettingsApp.tsx` picker option
      (Ghostty first), `App.tsx` default + help copy, `HelpPanel.stories.tsx`,
      `apps/www` page copy + demo `TERMINAL`.
- [x] Docs: AGENTS.md (line 7 blurb, stack table row, invariant 1 wording), README bang
      bullet, PRD §4.4 sentence, ROADMAP tick the Ghostty item, JOURNAL entry for the
      `open -na` second-instance gotcha, DECISIONS entry (Ghostty via the multiplexer).
- [x] Set `"terminal": "Ghostty"` in `~/.config/launcharr/config.json` (Mitch's request).
- [ ] Prove live: `!echo hi ⏎` lands as a new tmux window in Ghostty; updates `a` too;
      log shows `upgrade all → Ghostty`.

## Acceptance criteria

- [x] `pnpm verify` green; planner tests cover all four routes + empty command.
- [x] No second Ghostty instance is ever spawned while one is running (`plan_ghostty`
      only reaches `OpenNewInstance` when `ghostty_running` is false; verified by the
      planner tests — not yet proved against a live Ghostty).
- [x] iTerm2 and Terminal.app paths unchanged (their tests still pass).

## Out of scope

- A Ghostty-native new-window API (revisit when Ghostty ships `+new-window` on macOS or
  a control socket — then route 1/2 become optional).
- Per-hand-off choice of tmux window vs split.
