# JOURNAL

> Append-only dated log of learnings and gotchas, **newest first** — short and factual, written
> as they happen. Durable facts get promoted to `../LEARNINGS.md` (per-topic) and removed from
> active relevance here; decisions go to `DECISIONS.md`, not here.

---

### 2026-09-11 · Ghostty 1.3 grew an AppleScript dictionary — and SIGUSR2 reload is Linux-only

DECISIONS 2026-09-04 said Ghostty "has no AppleScript dictionary". True for 1.2; 1.3.1
(installed here) ships an sdef: `application`, `window`, `tab`, `terminal` classes and
`new window`, `new tab`, `split`, `input text`, `send key`, `perform action`, `focus`.
`perform action "reload_config"` is therefore a way to make Ghostty re-read its config
from outside, at the price of one Automation consent prompt. Omarchy's
`killall -SIGUSR2 ghostty` is GTK-only (1.2.0 release notes) — never send it on macOS
without checking the handler exists; an unhandled SIGUSR2 terminates the process, and
that process is every terminal the user has open. The terminal hand-off decision stands
(herdr/tmux first); the new dictionary is an option for `!` and for theme reload, not a
default.

### 2026-09-11 · A blanket rename sed rewrote the _legacy_ path too — the one string that had to stay

The launcharr → scuttlarr rename (DECISIONS 2026-09-11) was a global `s/launcharr/scuttlarr/`
over every tracked non-docs file. It also rewrote `legacy_config_dir()` in `config.rs`
from `~/.launcharr` to `~/.scuttlarr` — a path that never existed — which would have
silently disabled the 2026-08-10 home migration. Same trap for the keychain notary
profile name in `release.sh` (a local identifier, not a product string). Rule for any
future rename: after the sed, grep the diff for every _historical_ identifier
(old paths, markers, profile names, `plans/done/` links) and put the ones that name the
past back. `rename.rs` carries the old names as constants on purpose.

### 2026-09-10 · A plugin panel lagged its own toggle by up to a second — the panel polled, the bar was pushed

The amaran panel's switch felt broken from the launcher and instant from the bar
(Mitch, 2026-09-10). Every service state line called `bar::push`, so the cell repainted at
once; the panel read state through `useLivePlugin`'s 1 s `plugin_state` poll and showed
the old value until the next tick. Now each state line also emits `plugin-state` with the
id and the panel re-pulls on it (poll kept as the floor for health fields). Rule: anything
a plugin UI can change must be pushed, never only polled — a control that answers a
second late reads as not working.

### 2026-09-10 · TCC kills a plugin's Bluetooth child with no prompt when the bundle lacks the usage string

The amaran plugin's Swift bridge (`plans/done/amaran-plugin-bluetooth.md`) worked from a
terminal and died silently under launcharr: no `.unauthorized` state, no prompt, just a
`ble-helper-*.ips` in `~/Library/Logs/DiagnosticReports` every 30 s with `namespace:
"TCC"` — "attempted to access privacy-sensitive data without a usage description".
macOS holds the _responsible_ app (launcharr.app) accountable for a child's privacy access
and reads the usage string from _its_ Info.plist; a CLI child has none. Fix in core:
`src-tauri/Info.plist` with `NSBluetoothAlwaysUsageDescription` (Tauri merges it; DECISIONS
2026-09-10). Two rules for services that spawn hardware helpers: treat a signal death as
"the app can't", not "retry" (the service now stops and waits for a poke), and look in
DiagnosticReports before looking in the code.

### 2026-09-10 · Bun has no `aes-128-ccm`; `@abandonware/noble` will not load under Bun

Two Bun-vs-Node gaps met porting a Bluetooth Mesh stack into a plugin service. Bun's
`node:crypto` `createCipheriv` throws `Unknown cipher` for `aes-128-ccm` (AES-ECB, CMAC
inputs, is fine) — CCM is CBC-MAC + CTR over ECB, ~60 lines, verified against Node's CCM
on 50 random cases and the Mesh spec §8 vectors. `noble` is a node-gyp addon: `bun install`
blocks its postinstall, and even built it looks for a Node-ABI binary. A plugin directory
has no `node_modules` anyway; the answer for hardware is a tiny compiled helper the service
spawns (Swift + CoreBluetooth, JSON lines), keeping the protocol in TypeScript where it is
testable.

### 2026-09-10 · The light's status replies reach the proxy client — sometimes; not yet understood

Telink fixtures answer a `0x26` status request with a reply addressed to the provisioner
(0x0001 — which a proxy client claiming that address _is_). The reference TS code never
read it (its ESP32 firmware patches the mesh core to snoop instead). Our client decodes
inbound network PDUs (deobfuscate → CCM with the net key → CCM with the app key) and got
`on=true intensity=120` from the 60d S in the service's first live run — but three earlier
probe runs with the same PDUs received nothing at all, not even the Secure Network Beacon
the very first connection delivered. Differences suspected, none proven: the proxy-config
PDUs use an 8-byte NetMIC here (CTL=1 per spec; the reference used 4) and the whitelist
includes the light's own unicast; timing between subscribe and the filter handshake. The
plugin treats status as a bonus (`synced`), never a requirement. Chase it if the cell ever
drifts from the dial.

### 2026-09-04 · `open -na Ghostty --args -e …` while one is already running starts a second, unusable instance

Ghostty has no AppleScript dictionary and `ghostty +new-window` prints "not supported on
this platform" on macOS, so the obvious next thing to try — `open -na Ghostty.app --args
-e $SHELL -lic "…"` — looked like the general hand-off. It isn't: with a Ghostty already
running, `-na` spawns a _second_ process (two menu bars, two icons in the dock) instead of
opening a window in the first. `open -a Ghostty.app --args …` (no `-n`) avoids the second
instance but delivers nothing to the running one either — Ghostty ignores `--args` on an
activate-only open. The only way into a running Ghostty without Accessibility is through
whatever multiplexer its window is already showing: herdr's socket API or `tmux
new-window`. `-na` is safe only as the very first launch, when no Ghostty process exists
yet at all (`terminal.rs::plan_ghostty`, `HandOff::OpenNewInstance`).

### 2026-08-28 · A plugin card with no variant class hung off the display

The hello plugin's hover card ran off the right edge of the screen (Mitch, 2026-08-28:
"not a great reference"). Every built-in card carries its own class with `right: 0`;
`.bar-card` itself had no horizontal anchor, so an unclassed card sat at its cell's left
edge and grew rightwards. Fix in the kit, not the plugin: `.bar-right .bar-card {right:0}`,
`.bar-left .bar-card {left:0}`, `.bar-center .bar-card` centred — zone-aware defaults, so
no plugin needs to know which zone it lives in.

### 2026-08-27 · Plugins: blob-URL module loading works in WebKit; sharing lucide costs ~20 MB; pnpm lives behind corepack

Three things learned building the plugin runtime (`plans/done/plugins-react-cells-and-panels.md`).

- **Loading third-party ESM into a Vite-bundled webview without a protocol or import map.**
  A plugin built with `bun build --external react --external @launcharr/tui` still says
  `from "react"`. The app registers its own namespaces on `globalThis.__launcharrShared`,
  generates a shim module per name (`export const useState = m.useState; …`) as a blob:
  URL, rewrites the plugin's shared specifiers to those URLs, and `import()`s the plugin as
  a blob: URL. Proved in Safari's WebKit with a throwaway harness (default + named + kit
  imports all resolved), then in the app: `~/Library/Logs/launcharr.log` shows
  `hello: built → service started → first state → webview loaded cell.js`, and an edit to
  `cell.tsx` rebuilt and reloaded within the same second. Gotcha: `bun build` emits
  `react/jsx-runtime` imports with `NODE_ENV=production` — shim that name too, and
  `jsx-dev-runtime` for safety.
- **`lucide-react` must be shared, and it isn't the memory.** A plugin directory has no
  `node_modules`, so `bun build` can't resolve `lucide-react` unless it's `--external`
  and provided by the app. Suspected `import * as Lucide` of bloating the bar (idle RSS
  142 MB against the 120 MB budget); un-sharing it measured 148 MB — noise, not the
  cause. The bar already carries lucide's dynamic-icon set for widgets. Where the
  resident memory went is in STATUS.
- **A cell edit must not restart the service.** The first watcher treated any mtime change
  in the plugin dir as "sources changed" and bounced the Bun process; now only the service
  file's own mtime (or the manifest) restarts it, UI edits rebuild only.
- **Agent shells: `pnpm` is not on disk.** Node comes from mise, pnpm from corepack via
  `packageManager`; nested `pnpm` calls in scripts need a shim on PATH
  (`exec corepack pnpm "$@"`) and `pnpm install` wants `CI=true`. Recorded in memory.

### 2026-08-27 · Claude Code's keychain item name follows `CLAUDE_CONFIG_DIR`

A second subscription run via `CLAUDE_CONFIG_DIR=~/.claude-psyke` does **not** share the
`Claude Code-credentials` keychain item: the CLI creates `Claude Code-credentials-<hash>`,
where `<hash>` is the first 8 hex chars of `sha256` over the config dir path as given
(`/Users/mitch/.claude-psyke` → `4051cf21`, verified with `security dump-keychain`). The
`.credentials.json` file is _not_ written for that dir at all — keychain only. And that
dir's `.claude.json` (the one at `<dir>/.claude.json`, not `~/.claude.json`) carries the
`oauthAccount` block naming the login; a personal plan's org is auto-named
`<email>'s Organization`, which is the tell for labelling it "Personal".

Cold scan with two accounts: ~700 ms for ~700 MB of journals (warm 30 ms) — still on a
background thread, still under the panel's 2 s first-poll.

### 2026-08-26 · One empty `list-panes` read deleted every agent on the bar

Field bug: no agent cells at all, `agents.json` permanently `[]` — monitoring on, hooks
firing, socket bound, binary current. Bisected by injecting events straight onto
`agents.sock`: a session carrying **any** pane id was reaped microseconds after it was
recorded, while the same session without a pane survived and kept its `pidComm`. Adding
`"tmux":"%11"` to a live, surviving session killed it; sending it again without the pane
brought it back. Scanning `%0`–`%24` reaped all 25.

- **Mechanism.** `tmux_layout()` returned an empty map marked `layout_fresh = true` — a
  _successful but empty_ pane read — and `reap()` checked the pane branch first and treated a
  trusted layout as proof of death. Every Claude session here lives in a pane (the hook always
  sends `TMUX_PANE`), so the whole fleet died on arrival, permanently.
- **Not the environment.** tmux 3.7c answered correctly from launcharr's exact env (`PATH`,
  its Darwin `TMPDIR`), with no controlling terminal, `setsid`, `cwd=/`, and from a GUI
  launchd context via `osascript do shell script`. An unreachable server exits **1**, not 0,
  so a genuinely missing tmux would have taken the harmless untrusted path. The empty read is
  process-local rot in that long-lived instance, which was also carrying 23 zombie children —
  something spawns without waiting; worth its own look.
- **Diagnosis trick worth keeping.** The state file is written by `own_list()` after every
  applied event, so it mirrors the store exactly: injecting one crafted event per hypothesis
  on the socket and reading the file back is a complete black-box probe of the reaper. Probing
  pane ids one by one reads the layout the app _thinks_ it has.
- **Fix.** The process outranks the multiplexer: a live pane still short-circuits as proof of
  life (and still costs no `ps` sweep), but a missing pane now asks the pid before reaping.
  Plus `trusted_layout()` — a zero-pane success is a broken read, never an empty world.
  DECISIONS 2026-08-26, `plans/done/agent-liveness-pid-first.md`.

### 2026-08-19 · Settings opened from the panel sat behind the front app; `tauri build` flashes Finder

- **Settings behind.** launcharr is Accessory and the panel is non-activating, so when
  `execute` hides the panel and builds the settings window, launcharr isn't the active app.
  tao's window build only does `makeKeyAndOrderFront`; its `set_focus` (the one that calls
  `activateIgnoringOtherApps`) is skipped for a fresh window and bails on `isVisible ==
false` right after a queued `show()`. Result: ordered front _within launcharr_, behind
  the previous app. Fix: `activation::bring_to_front` — `NSApp.activateIgnoringOtherApps`
  on the main thread after ordering front. The non-deprecated `activate()` (14+) is
  cooperative and refused from a background app, so the deprecated call stays, with a
  one-line `#[allow]`.
- **Finder flash on rebuild.** `tauri build` also bundles the DMG, and that step mounts
  the image and drives Finder via AppleScript to lay out icons — a Finder window pops on
  whatever workspace is active. Local relaunches use `tauri build --bundles app`; only
  `release.sh` wants the DMG.

### 2026-08-19 · Widgets: `secret shared/trmnl/api_key` no longer resolves; `zsh -ic` needed for `secret`

The old Sketchybar TRMNL plugin read its token through the age `decrypt.sh` helper with id
`shared/trmnl/api_key`; that helper now returns `{}` and the current `secret` (an
Infisical-backed zsh function) has no `shared` project — so the ported `trmnl.py` widget
ticks `{"hidden": true}` until the key gets a home (set `TRMNL_API_SECRET_ID` or
`TRMNL_API_KEY`). `secret` is a function in `.zshrc`, so widgets call it as
`zsh -ic 'secret <id>'` (~1 s, fine at 5 min); an "unknown project" line on stderr is
easy to mistake for a value when piping `2>&1`. Also: `secret` failing prints to stderr and
exits 1 — the widget treats empty stdout as "no key", never as an error cell.

Serde will happily deserialize a struct from `[]` (empty sequence) — `parse_view("[]")`
succeeded; don't write a test that expects it to fail. And `screencapture` from an agent
shell is TCC-blocked ("could not create image from display"), so bar rendering was proven
with `renderToStaticMarkup` tests in the kit rather than a screenshot.

### 2026-08-19 · The 80 % charge limit lives in `/Library/Preferences/com.apple.powerd.charging.plist`

Nothing user-facing reports it — `pmset -g batt` just says "AC attached; not charging" at
80 %, `ioreg` has no limit key. The setting is a world-readable plist whose `policies`
value is itself an NSKeyedArchiver plist; the `ChargeCtrlPolicy` object carries
`soclimit` (80), `reason` (`manualChargeLimit`) and `terminated`. Two-layer parse with the
`plist` crate already in the tree, cached a minute. This is the bar's "adjusted charge":
the strip judges fullness against the limit, the card keeps the true number. Also today:
persistence proved itself in the field — an "until agents idle" hold armed at 13:06
resumed at 13:11 across a rebuild/relaunch (breadcrumbs in `~/Library/Logs/launcharr.log`).

### 2026-08-19 · A keep-awake hold now survives quit/reinstall — persist intent at arm, not at quit

Every rebuild-and-`ditto` cycle lost the running `awake` timer: IOKit assertions are
per-process, and the session lived in a `static`. The fix writes `awake.json` the moment
a hold is armed (never on quit — kill, crash, and reinstall-over-running all skip quit)
and removes it on any release; launch re-arms under rules that keep it honest (deadline
still ahead; `manual` capped at 12 h; never across a reboot — `sysctl kern.boottime`
stamped in the file). Rust peeks at the spec exactly once, for `until.kind == "manual"`,
to apply the cap; the spec's meaning stays TypeScript's. `CoreWLAN rssiValue` also
landed today for the Wi-Fi strength glyph — RSSI needs no Location Services, unlike the
SSID; the SSID text left the strip (minimal is the theme) and lives in the card.

### 2026-08-19 · Claude's background daemon runs your hooks too — with `TMUX_PANE` scrubbed

Two "outside a multiplexer" cells that were nobody's agent: Claude Code's daemon
(`claude daemon run` → `--bg-pty-host` → `bg-spare` / `--session-id` pty sessions),
spawned by an interactive session, runs the same hook config, and the pty-host strips
`TMUX`/`TMUX_PANE` from its children (the daemon itself still carries them). Each got a
fresh session id → its own pane-less cell, alive by every liveness check (`pidComm` said
`claude bg-spare` — the tell). Fix is a flag, not a drop: the hook walks its ancestry
(leading argv only — a shell whose _arguments_ mention `bg-spare` must not count; a probe
matched its own test string) and marks `background: true`; `apply` refuses to _create_ a
session from a background event unless it carries a prompt, so a driven background session
still surfaces on its first prompt. Sessions recorded before the fix stay until forgotten.
Also: hooks are snapshotted at session start — adding `SubagentStart`/`SubagentStop` to
settings.json does nothing for sessions already running, so probe new hook groups through
the socket, not from the session that added them.

### 2026-08-19 · Tauri's monitor API is why nothing was multi-display — ask CoreGraphics

Two screens, one bar, launcher always on the primary — and both paths were _written_ for
multi-display. `available_monitors()` returns an empty list for this accessory app
(known since 2026-08-15; bar.rs fell back to primary and stayed there). The launcher's
`monitor_from_point(cursor)` never matched either, for a different reason: tao's
`cursor_position()` computes `CGDisplay::main().pixels_high() - mouseLocation.y` — pixels
minus points — then scales the result, and `monitor_from_point` compares that physical
point against `CGDisplayBounds` (points). On any Retina display the cursor is "between
screens" and the code fell back to primary, invisibly. `screens.rs` now reads
`CGGetActiveDisplayList` / `CGDisplayBounds` directly (thread-safe, points, top-left
origin — the same space `LogicalPosition` uses, so no scale ever enters the frame math)
and frames windows with logical sizes; the bar reconciles windows to screens on a 5 s
heartbeat (`sync`: build missing, re-frame drifted, hide surplus, re-announce the notch
profile if a window changed display) since windows can't be destroyed (2026-08-16). Notch
detection is keyed by `NSScreenNumber` now, not by NSScreen index.

### 2026-08-18 · herdr's `agent.*` methods take `target`; `pane.*` take `pane_id`

The herdr jump did nothing while every other cell worked. `agent.focus` with
`{"pane_id":"w1:p1"}` returns `invalid_request` — "missing field `target`" — because the
`agent.*` family addresses agents by `target` while the `pane.*` family uses `pane_id`. A
pane id _is_ a valid target; only the field name differs, which is exactly the kind of
detail prose skims over and a schema states. `herdr api schema --json` had it all along
(`AgentTarget`), and the docs' line about "pane control methods use public pane ids" is
about `pane.*` only — I generalised it to the neighbouring family and shipped a dead jump.

Read the bundled schema per method family, never the one next door. Two silent-failure
notes from the same bug: launcharr's `focus()` correctly returned false and `jump_session`
returned a typed error — but both the bar and the panel `.catch(console.error)`, so a
failed jump is invisible to the user. Worth surfacing on the toast row.

### 2026-08-18 · Jumping to a pane is two problems: which client, and which window — `open -a iTerm` answers neither

Clicking tmux agent cells stopped landing anywhere the day herdr arrived, and every click
turned its cell from blue to green on the way. Two separate faults, neither of them herdr's:

1. **`tmux switch-client` with no `-c` picks a client for you.** With two clients attached
   (`ttys000`→gogogo, `ttys002`→psyke) tmux uses the most recently active one, so a click
   could shuffle a terminal Mitch wasn't looking at. Fix: resolve the pane's own session
   (`display-message -p -t <pane> '#{session_name}'`), and if a client is already attached
   to it (`list-clients -t <session> -F '#{client_tty}'`) just select the window/pane —
   there is nothing to switch. Only switch when the session has no client.
2. **`open -a iTerm` raises whichever window was frontmost.** With more than one window
   that is a coin toss. The tty is the one id shared by the multiplexer's client and the
   terminal session hosting it, so aim at it: walk iTerm's windows/tabs/sessions for
   `tty of s` and `select` it (Terminal.app addresses tabs by tty directly).

And the compounding one: `mark_read` (done → idle) ran _before_ the jump, so a run of
failed clicks silently ate every unread marker. Read after landing, never before.

Two herdr facts found on the way. Its client can outlive the terminal that started it —
`ps` showed the client orphaned on a tty belonging to no live iTerm session, the server
still holding the agent — which is herdr working as designed, so raising it is best-effort
by nature. And the herdr _server_ has no controlling terminal (`??` in `ps -Ao tty=,comm=`)
while the client does, which is how you tell them apart.

### 2026-08-17 · TCC grants die with every ad-hoc dev build — sign local builds, and never launch the binary from a shell

Three feedback rounds on the color loupe changed nothing on Mitch's screen: every pick
was Apple's sampler. Two causes, both TCC. (1) `pnpm tauri build` without
`APPLE_SIGNING_IDENTITY` ad-hoc signs, and TCC keys a Screen Recording grant to the code
signing requirement — a fresh cdhash per rebuild, so `CGPreflightScreenCaptureAccess`
goes false and `CGRequestScreenCaptureAccess` returns false _without re-prompting_
(the stale entry exists). Fix: sign dev builds with the Developer ID (stable csreq),
`tccutil reset ScreenCapture com.mitchmalone.launcharr` once, grant again. (2) Launching
`Contents/MacOS/launcharr` from a tmux shell to capture stderr makes the terminal the
_responsible process_ for TCC — grants to launcharr.app don't apply. Use `open -g -a`
and read `~/Library/Logs/launcharr.log` breadcrumbs (one line per pick: which picker,
why, zoom/size, capture-blocking windows) instead of stderr.

### 2026-08-17 · Loupe capture v2: `CGDisplayCreateImageForRect` + `sharingType = None` — window-list capture skipped Notion

`CGWindowListCreateImage(… OnScreenBelowWindow …)` came back without some apps' windows
(Notion, an Electron app, was the reported one — likely a window-list/level quirk, not
worth chasing). Capturing the **display framebuffer** instead
(`CGDisplayCreateImageForRect(displayID, rectInDisplayPoints)`) returns what is actually
on screen, every app; the loupe keeps itself out of the picture with
`[NSWindow setSharingType:NSWindowSharingNone]` (content-protection flag: excluded from
all screen captures, including our own). Display id = `NSScreen.deviceDescription
["NSScreenNumber"]`; the rect is display-local points, and the loupe window covers
exactly that screen, so the webview's `clientX/Y` are already the right coordinates.
The v1 notes below stay for the coordinate conventions.

### 2026-08-17 · Loupe capture: `CGWindowListCreateImage` below our own window; points, not pixels

For a magnifier drawn _at_ the cursor, plain display capture sees the loupe itself
(feedback loop). `CGWindowListCreateImage(rect, kCGWindowListOptionOnScreenBelowWindow,
ourWindowNumber, kCGWindowImageBestResolution)` captures everything beneath the loupe
panel and returns native pixels for a rect given in CG global _points_ (top-left origin
of the main display) — Tauri's `LogicalPosition` on macOS is the same space, so the
webview's `clientX/Y` + the panel's origin is the rect, no scale math. AppKit's
`NSEvent.mouseLocation` / `NSScreen.frame` are bottom-left; flip with the main screen's
height. Bytes come out via a `CGBitmapContextCreate(RGBA8, ByteOrder32Big)` draw into a
Vec — `tauri::ipc::Response` ships them binary (~80 KB/frame at 2×, fine at 60 Hz).
Deprecated-in-14 API, still present in 26; ScreenCaptureKit is the eventual replacement.
Screen Recording (TCC) is required; without it the call returns an image of nothing.

### 2026-08-17 · Driving the panel from an agent shell: tray "Summon panel" works, keystrokes don't land

Under tmux/iTerm the shell has no Screen Recording (`screencapture` → "could not create
image from display") and CGEvent keystrokes (`osascript keystroke`, `cliclick t:`) go to
the _frontmost app_ (iTerm2), not to the non-activating panel even while it is key —
one stray `keystroke "a"` landed in an iTerm pane. The tray menu is scriptable
(`click menu item 1 of menu 1 of menu bar item 1 of menu bar 2 of process "launcharr"`
= summon; the perf log shows `summon Nµs`), but there's no way to type into the panel
headlessly, and `set frontmost of process "launcharr"` is refused (accessory app). Net:
panel-typing flows stay a hands-check; observe native paths via the pasteboard
(`pbpaste`) or the stderr log when launching the binary directly.

### 2026-08-17 · `NSColorSampler` binding needs three objc2-app-kit features + block2

`NSColorSampler` (objc2-app-kit 0.3) is gated on `NSColorSampler` + `NSColor` +
`block2`; the RGB component getters additionally need `objc2-core-foundation` (CGFloat).
All were already in the lock as transitives, so enabling them added no crate. The block is
`block2::RcBlock::new(move |c: *mut NSColor| …)` passed as `&block`; AppKit retains the
sampler (and the block) until the session ends, so dropping the local is fine. The
handler fires on the main thread; the pasteboard write and `panel::flash` are safe there.

### 2026-08-17 · Two "shortcuts" gotchas while removing the tab

The bundled config had a stray `"": ""` under `shortcuts` (from the tab's "+ add") that
logs `bad custom shortcut ""` on every start — harmless, still there; delete the key by
hand. And `apps/www/src/lib/launch-index.ts` still lists `shortcuts` as an alias on the
demo's settings item — the demo config, not the app; left as-is.

### 2026-08-17 · HTML5 drag-and-drop is dead in a Tauri window unless the file-drop handler is off

The menubar zone board never worked — not retired→zone, not zone→zone. wry's macOS
webview swizzles `draggingEntered:` / `draggingUpdated:` / `performDragOperation:` for
Tauri's file-drop events and, when the handler is on (the default), returns without
forwarding to WebKit — so the DOM never gets `dragenter`/`dragover`/`drop`, **internal
drags included** (WebKit routes its own drags through the same NSDraggingDestination
path). `dragstart` still fires, which is why it looked half-alive. Fix:
`WebviewWindowBuilder::disable_drag_drop_handler()` on any window that does HTML DnD
(settings_window.rs). Verified with real mouse events (`cliclick dd/dm/du`) + reading
config.json back; AX `click` on a WKWebView checkbox does nothing, `cliclick` at its
AX position does — and only when the process is frontmost, else the click lands on
whatever's on top.

### 2026-08-17 · Wrap-around selection hid the aerospace strip; `.tui button` beat single-class segment rules

Two kit gotchas from the `aerospace ⏎` strip. (1) `SegmentedControl` had no scroll-into-view,
so wrapping ↑ from the last action left the strip (and its header) above the fold — ListRow
had the fix from the wifi panel but nothing shared it. Now `revealSelected` in
primitives.tsx is the one helper every selectable kit component uses (LEARNINGS rule).
(2) `.tui button { background:none; border:none }` is `(0,1,1)` and had been beating every
single-class segment rule since the control was written — segments never had border/fill;
the keyboard cursor only showed on the active segment where a two-class rule applied.
Segment rules are now scoped under `.tui-segmented`.

### 2026-08-17 · Quitting AeroSpace dumps every window onto workspace 1; its tray icon can't be hidden by `defaults`

Two facts from one experiment. (1) `osascript quit` + `open -a AeroSpace` reloads fine but
**every window lands on workspace 1** — assignments are in-memory. Never restart AeroSpace
to test something; `reload-config` is the only safe knob. (2) The status item is a SwiftUI
`MenuBarExtra` (no `isInserted`): writing `NSStatusItem Visible Item-0 = false` or
`VisibleCC Item-0 = false` into `bobko.aerospace` is rewritten to `1` on launch — the item
is not removal-allowed. Hiding needs upstream support or a menu-bar manager. launcharr's
answer is the `aerospace ⏎` panel carrying the menu's contents.

### 2026-08-17 · Retiring a dotfiles config dir deletes the live one — `~/.config/aerospace` was a dir symlink

`link_config_dir` in dotfiles symlinks the _directory_, so `ls -la ~/.config/aerospace/
aerospace.toml` shows a plain file while the parent is the link. `git rm -r macos/desktop/
aerospace` therefore emptied `~/.config/aerospace` from under a running AeroSpace (which
kept its in-memory config; only the file was gone). Recovered by unlinking the dangling
symlink, restoring the pre-0.4 copy as `aerospace.toml.bak-launcharr`, and letting
`desktop_apply` write the managed toml. Check `readlink` on the parent before retiring
anything dotfiles-managed.

### 2026-08-17 · Window corner radius: `NSConvolutionOverride1` works, `0` doesn't, Finder needs a logout

Hidden AppKit global: `defaults write -g NSConvolutionOverride1 -float N`. On 27.0
(`26A5406e`) TextEdit picked up `4` on relaunch — nearly square. Gotchas: **`0` is read as
unset** (nothing changes), so 1 is the floor; `killall Finder` alone showed no change (Finder
wants a logout, or is exempt — unverified); Quick Look ignores it per reports. Undocumented,
so the Desktop tab says so and the setting reads the current value back rather than
trusting config. CornerFix-style dylib injection was the alternative — rejected outright
(DECISIONS 2026-08-17).

### 2026-08-17 · JankyBorders is GPL-3 — a Homebrew dependency, never a sidecar

Checked before designing the desktop layer: AeroSpace MIT, JankyBorders GPL-3.0. Spawning
`borders` as a process and installing it via `brew` carry no obligations; bundling the
binary in `launcharr.app` is distribution (source offer, GPL text, grey area at best) and
porting its SkyLight code would make launcharr a derivative. Hence: `brew install felixkratz/formulae/borders`
from Settings → Desktop, flags rendered from the theme, no `bordersrc`, `killall borders`
before we spawn ours to clear strays from a crash (no PDEATHSIG on macOS; `RunEvent::Exit`
covers orderly quit).

### 2026-08-17 · Agent cells lose their tmux groups after a reboot — until each session speaks again

Field report: three agents across two tmux sessions, bar showed loose ungrouped cells with
no borders, then "came good" minutes later. Not the cold-start `list-panes` race (fixed
2026-08-16) — stale pane ids. tmux pane ids are per-server (`%0, %1…`), so a reboot +
resurrect hands every pane a new id, while `agents.json` still carries the pre-reboot ones;
`list()` looks them up, misses, and every session renders as loose (`tmuxSession: null`).
Hook events fired before launcharr came up are lost (no listener on the socket). It
self-heals per session on the next hook event carrying the fresh `$TMUX_PANE` (here:
08:55:06–08:55:18 for an app launched 08:54:56). tmux can't map a Claude session id back
to a pane after a restart, so this is a known post-reboot transient, not a bug to chase.

### 2026-08-17 · `.bar-card-line` defaults to agent green

`.bar-card-line`'s base color is the agent-idle green (`#00c853`) with a comment saying
"state classes above override" — true for the agent card, a trap for every new hover card:
plain lines come out green. The awake card scopes an override
(`.bar-awake-card .bar-card-line { color: var(--fg) }`); the next card will need the same,
or the base wants flipping to `--fg` with the agent card opting into green.

### 2026-08-16 · pmset assertions: process lines are stable enough to parse

`pmset -g assertions` "Listed by owning process" rows parse fail-soft
(`pid N(name): [0x…] HH:MM:SS Type named: "…"`); the hours field grows past 24 rather than
wrapping (Amphetamine showed `81:43:11` live), continuation/detail lines don't match the
`pid ` prefix, and coreaudiod holds assertions on other apps' behalf under its own name.
Sleep-preventing types worth listing: PreventUserIdleSystemSleep/DisplaySleep,
PreventSystemSleep, NoIdleSleep/NoDisplaySleepAssertion — `UserIsActive` is noise.

### 2026-08-16 · A React Server Component can't import the `@launcharr/tui` barrel

`apps/www` builds fine importing kit _components_ (they're in `'use client'` files), but
importing `BUILTIN_THEMES` from `@launcharr/tui` into a **server** component fails the
Next build: the barrel re-exports `components/controls.tsx`, whose `useRef` pulls the whole
module graph into a server context. The error names `controls.tsx`/`hooks.ts`, not the
themes module, so it reads like a component problem when it's a barrel problem. Fix: a
`./themes` entry point — themes are pure data, so server components take that path
directly. Same trap waits for any other pure module in the kit (`nav/*`); split an entry
point when a server-side consumer appears, not before — `./bar` became the second instance
within hours, when the bar's pure formatters were needed by a server component.

### 2026-08-16 · The demo bar's colors are in bar.css, and the design export was already stale

Building the website's bar strip from the Claude Design export instead of
`apps/desktop/src/bar/{main.tsx,bar.css}` shipped four wrong facts in one go — front app
and right cells on `--dim` (bar.css: "fg, not dim — the dim tone read too dark against the
strip"), the `working` agent cell on the site's pink instead of the theme accent so it
never retinted, a hover card missing its glyph and relative age, and `blocked` used as a
state key when that's only the display label for wire state `attention`. All four were
decided the same day the export was generated. Now invariant 10 — see DECISIONS. Practical
tell: if a website component contains a hex literal that also appears in the app, it's a
port that should have been an import.

### 2026-08-16 · `ioreg` battery keys: nested-first, flags as digits, negatives printed unsigned

Three traps in `ioreg -rn AppleSmartBattery` text output, all hit while building
the battery card. (1) The first occurrence of a key is often the copy nested in
the `BatteryData` dict, not the top-level one — `DesignCapacity` exists _only_
there. Search for the quoted key (`"DesignCapacity"`) so `"FedDesignCapacity"`
can't answer for it. (2) Flags print as `Yes`/`No` at top level but as `1`/`0`
inside dicts, so a flag reader that only knows Yes/No returns nothing for
`FullyCharged`. (3) `Amperage` is two's-complement but printed unsigned —
`18446744073709551543` is −73 mA; parse as `u64`, then `as i64`. Time estimates
use `65535` for "unknown", which is what `AvgTimeToEmpty` reads whenever the
machine is on AC.

### 2026-08-16 · Bar hover cards: one `__barMouse`, and let the card measure itself

The Rust cursor feed writes a single `window.__barMouse`, so the hover
machinery can't live inside one component — the second hoverable cell silently
wins the global and the first stops opening. It now lives in `src/bar/hover.ts`,
owned by `Bar`, hit-testing `[data-hover]` cells and `.bar-card` regions.
Card height had the same shape of problem: the window grows by a fixed amount,
so a card whose content arrives after the open (the battery detail fetch) gets
clipped by a guess made before it existed. The cell's `data-hover-height` is now
just the opening estimate; a `ResizeObserver` on the card re-sends the real
height (`getBoundingClientRect().bottom`, viewport-relative — the viewport top
_is_ the strip top, so nesting can't skew it).

### 2026-08-16 · Destroying the NSPanel bar aborts the whole process

Toggling `bar.enabled` off called `WebviewWindow::destroy()` on the converted
NSPanel and launcharr died with SIGABRT: an Objective-C exception thrown during
teardown crossed into tao's run-loop observer as a foreign exception
(`__rust_foreign_exception` → abort; crash report 15:18). NSPanels converted by
tauri-nspanel (with the constrainFrameRect override installed on the class)
don't survive tauri's destroy path — hide them instead and skip invisible
windows in the push loop. Same likely applies to any future panel-class window.

### 2026-08-16 · `system_profiler SPAirPortDataType` scans wifi with no Location prompt — slowly, with typos

The blocker that shelved wifi scanning in P0 (CoreWLAN wants Location Services) has a
stock-binary bypass: `system_profiler SPAirPortDataType -json` lists nearby SSIDs,
security mode, and signal/noise, TCC-silent. Two gotchas: it takes ~7 s (async command,
spinner, one-shot per keypress — never on the refresh interval), and the JSON's enum
strings can't be trusted verbatim — this macOS build emits a typo'd
`pairport_security_mode_wpa3_transition` (missing leading `s`), so the parser treats
"anything not none/open" as secured instead of matching known values.

### 2026-08-16 · Hover never reaches an accessory app's panel until you click it

The agent dropdown "opened on click, not hover, and never closed": WKWebView's own
mouse-tracking area is active-in-active-app, and launcharr (accessory policy) is only
active after a first-mouse click on the panel — so mouseenter arrived with the click and
mouseleave never arrived at all. Fix: `bar_constrain::enable_hover_events` attaches an
NSTrackingArea (ActiveAlways | InVisibleRect | enter/exit/move, owner = the webview) and
sets `acceptsMouseMovedEvents` on the window. Belt-and-braces in JS: a card with no mouse
activity for 10s closes itself, so lost leave events can't strand it again.

### 2026-08-16 · Concurrent socket handlers tore agents.json on the first live test

The agents monitor spawns a handler thread per socket connection, and Claude hook events
arrive in bursts (PostToolUse + PreToolUse land together). Two threads doing plain
`fs::write` to `agents.json` interleaved and left "valid JSON + trailing garbage" — caught
minutes after shipping because the very first live read choked. Fix: saves are serialized
behind a static mutex and go write-temp-then-rename, so readers only ever see a complete
document. `load()` additionally treats unparseable state as empty rather than erroring —
a status cache is never worth a startup failure. Regression test hammers 4 writer threads
against a reader.

### 2026-08-16 · The vanishing focus indicator was CSS specificity — hover masked it for hours

The active-workspace indicator "not working" survived three real plumbing fixes because
the visible bug was `.bar button { background: none }` (0,1,1) silently beating
`.bar-ws-focused { background: … }` (0,1,0) — the block NEVER painted except while
hovered, where `.bar-ws-focused:hover` (0,2,0) outranks the reset. Clicking a cell
parks the mouse on it → "clicks work, hotkeys don't," and "hotkey back to 4 shows it
again" because the mouse still sat on cell 4. Diagnosed by instrumenting every layer
(Rust snapshots ✓, eval delivery ✓, absorb ✓, DOM class ✓) until only CSS remained.
Lessons: (1) element-qualified resets like `.bar button` out-rank single-class state
selectors — scope state rules under the root (`.bar .bar-ws-focused`); (2) when
"clicks work but keys don't," suspect :hover masking before plumbing; (3) instrument
layer by layer and trust each ✓ — the bug lives in the first unverified layer. The
timer-throttling and emit-delivery fixes below were real and stay.

### 2026-08-16 · WKWebView throttles JS timers in never-focused windows — push, don't poll

The bar's `setInterval` polling silently died minutes after launch: WebKit throttles or
suspends timers in a window that never becomes key, in a background accessory app. Result:
stale clock, stale front-app, and the focus indicator missing entirely (the CLI data was
verified perfect the whole time). Every earlier fix attempt looked good in testing because
tests ran seconds after a relaunch, before throttling kicked in. Architecture fix: the
webview owns ZERO timers — a Rust thread snapshots and emits `bar-snapshot` at 1 Hz (and
instantly on trigger-file events); event delivery executes in the page unthrottled; the
clock rides the same push. `background_throttling: Disabled` set on the bar window as
belt-and-braces. **Rule: bar/panel webviews are pure listeners; cadence lives in Rust.**

### 2026-08-16 · Bar performance: sync commands were self-DDoSing the aerospace server

Mitch: workspace clicks took seconds. Cause: `bar_snapshot` was a **sync** Tauri command
— it ran on the main thread, spawning 5 subprocesses per 1s tick, serially. The queued
aerospace CLI calls backed up aerospace's server: `list-workspaces` measured **6.0s**
wall (0.01s CPU) while the bar polled, **14ms** once it stopped. Fixes: commands are
`async` (worker pool — any command that spawns processes must be), one aerospace call
per tick via `--format '%{workspace}%{tab}%{workspace-is-focused}'`, battery cached 30s,
optimistic focused-workspace update on click. Rule of thumb recorded: **never spawn a
subprocess in a sync Tauri command.**

### 2026-08-16 · Menubar slide-over needs Floating level + a constrainFrameRect override

To make the auto-hidden native menu bar slide OVER the bar (Sketchybar behavior), the
bar must sit below MainMenu (24) — PanelLevel::Floating (4). But below 24, AppKit's
`constrainFrameRect:toScreen:` pushes windows out of the menu-bar reserve (bar landed at
y=38, and set_position could not force it back). Sketchybar's own trick, ported:
`bar_constrain.rs` installs a `constrainFrameRect:` override returning the rect
unchanged onto the macro-generated BarPanel class via `class_replaceMethod`. Result:
level 4, y=0, menubar hover-slides over.

### 2026-08-16 · Event-driven bar refresh via a triggers directory

Polling caps update latency at the poll interval (Mitch noticed ~hundreds of ms vs
Sketchybar's instant). Now `~/.config/launcharr/triggers/` is FSEvents-watched; any
change emits `bar-refresh` and the bar re-snapshots immediately. aerospace.toml's
`exec-on-workspace-change` touches `triggers/workspace` (dotfiles updated, uncommitted).
Doubles as a hackable poke-the-bar surface for scripts. Front-app changes without a
workspace switch still ride the 1s poll — candidate: NSWorkspace
didActivateApplicationNotification observer.

### 2026-08-16 · Display mode changes strand the bar off-screen

Overnight the display's point width changed (2560 → 2056; scaling/dock change) and the
bar stayed at stale absolute coordinates — parked at y=-111, invisible, while Sketchybar
(which handles this) still drew. Tauri surfaces no "screens changed" event, so bar.rs now
re-asserts the frame on a 15s main-thread heartbeat (no-op comparison when nothing moved
— verified zero churn over 40s idle). A real NSApplicationDidChangeScreenParameters
observer can replace the heartbeat when the objc2 layer grows in B2.

### 2026-08-15 · Bar spike gotchas: monitors, panel frames, capabilities

Building the v0.5 bar window (see `plans/active/v0.5-tui-kit-and-bar-spike.md`):

- **`available_monitors()` returns an empty list** in this accessory app — at setup AND
  500ms later on the main thread. `primary_monitor()` answers correctly. bar.rs falls
  back to primary; multi-display enumeration is an open item for B2 (candidates: NSScreen
  directly via objc2, or enumerate after first window event).
- **Frame an NSPanel-converted window AFTER `to_panel()`, with a fresh handle.**
  `set_position`/`set_size` before the conversion are silently dropped, and the
  pre-conversion `WebviewWindow` handle reports stale geometry afterwards (claimed
  800×600 while CGWindowList showed the true 2560×30). panel.rs always re-fetched via
  `get_webview_window` — that's why it never hit this.
- **New window labels must be added to `capabilities/default.json`** (`bar-*`) or the
  webview's `invoke()` fails silently inside a `.catch()`.
- **`load_or_create` used to swallow config parse errors silently** (`unwrap_or_default`)
  — a typo'd config.json reverted every setting with no trace. It now logs before
  falling back.
- Debug observation: launcharr has had a benign offscreen 500×500 layer-0 window in
  CGWindowList all along (present with bar disabled, pre-dating this work). Unidentified;
  harmless; noting so the next window-debugging session doesn't chase it.
- **Memory (the B1 gate, PASSED):** one display, release build, fresh-launch RSS totals
  across launcharr + its WebKit helpers — bar off: ~187 MB (main 103 + helpers ~84);
  bar on: ~205 MB stable after 60s (main 96 + helpers ~109, bar's WebContent 35 MB).
  **Marginal cost of the bar ≈ 19 MB** — the bar rides the app's existing WebKit process
  pool instead of paying a per-app baseline. Main-process RSS (the metric the 120 MB
  budget has historically tracked) stays ~96 MB.

### 2026-08-12 · `brew untap --force` uninstalls the tap's casks — including the app

Migrating to the shared tap: `brew untap mitchmalone/launcharr --force` didn't just remove
the tap, it uninstalled the launcharr cask and deleted `/Applications/launcharr.app`.
Also: a locally-cloned tap under `/opt/homebrew/Library/Taps` doesn't see new
formulae/casks until `git pull` (or `brew update`). Migration order that works: pull the
new tap, `brew install` from it, THEN untap the old one.

### 2026-08-11 · launcharr-web's JOURNAL folded in (repo merged as apps/www)

Durable items promoted straight to `LEARNINGS.md` (www section): pnpm 11 `allowBuilds`,
lucide v1 brand icons, eslint-config-next's `set-state-in-effect` vs the
`useSyncExternalStore` mounted pattern, Claude Design MCP can't serve binaries. One-off
context kept here: the `launcharr-web` Vercel project (team ramenamok) had
launcharr.com + www.launcharr.com aliased before first deploy; `vercel link`/`deploy`
needed `--scope ramenamok` once.

### 2026-08-10 · bash + pipefail + `grep -q` silently fails healthy pipelines

`codesign -dvv … | grep -q pattern` under `set -euo pipefail` fails EVEN WHEN the pattern
matches: grep -q exits at first match, codesign takes a SIGPIPE mid-write (exit 141),
pipefail surfaces it. Reproducible in /bin/bash 3.2, invisible in zsh (which is why my
manual verification passed). Rule for release.sh: capture command output to a variable
first, grep the variable — never pipe into early-exiting consumers under pipefail.

### 2026-08-10 · Spawned CLIs inherit launcharr's TCC identity — cage them

(From the spike-ask-ai branch, ported to main 2026-08-16.) The `?`-mode spike spawned
`claude -p` and macOS started prompting for network drives and Music access _as
launcharr_: child processes bill all file access to the responsible app, and the CLI's
project-discovery scan ran from an inherited cwd (`/`). Any spawned-CLI feature must
(1) pin `current_dir` to an empty dir we own (Application Support/ask-home) and
(2) disallow filesystem/exec tools (`--disallowedTools Bash,Read,...`) — `?` is Q&A,
not an agent in the launcher. This is what "zero granted permissions" costs when
spawning other people's binaries.

### 2026-08-10 · Two signing gotchas from the first real release run

(1) `codesign -dv` does NOT print the certificate chain — grepping it for "Developer ID"
always fails; the Authority= lines only appear at `-dvv`. (2) The tauri bundler
auto-notarizes only via raw `APPLE_ID`/`APPLE_PASSWORD`/`APPLE_TEAM_ID` (or API key) env
vars — it ignores notarytool keychain profiles, and skips silently with just a Warn line.
release.sh now notarizes explicitly (`notarytool submit --keychain-profile --wait`, grep
"status: Accepted", staple, re-zip the stapled app) so no secrets sit in env.

### 2026-08-10 · Moving the repo invalidates cargo's build cache with baked absolute paths

After restructuring to `<project>/launcharr`, `cargo` builds failed reading
`.../mitch/launcharr/src-tauri/target/...` (the pre-move path) — tauri's build script
caches absolute OUT_DIR paths. One-time `cargo clean` fixes it. Expect this any time the
repo directory moves.

### 2026-08-10 · Autosaving a config the app also watches needs an echo guard

Settings autosave + the config FSEvents watcher form a loop: `write_config` → watcher fires
`config-changed` → window `setConfig(payload)`. If the user typed during the round-trip, the
event's (older) payload would clobber their edit. Guard: remember the JSON we last wrote and
drop matching events; genuinely-external edits (hand-editing config.json) still flow through.
Also: `global-hotkey`'s `parse_key` accepts friendly aliases ("S", "Space", "Up") _and_ W3C
code names — checked the crate source rather than trusting docs; the recorder emits the
friendly form so hand-written and recorded configs look alike.

### 2026-08-08 · A script named json.py shadows python's stdlib for the whole scripts dir

The bundled-scripts test caught it before prod: python puts the invoked script's directory at
`sys.path[0]`, so `scripts/json.py` made every neighbouring script's `import json` resolve to
itself. Fixed by renaming to `json-format.py` AND `del sys.path[0]` at the top of every
bundled script. Documented in SCRIPTS.md as a user-facing rule.

### 2026-08-08 · v1.1 built overnight: script protocol + Sol parity

Scripts-first per the scope decision (see DECISIONS). Machine-verified: bundled scripts
install + answer manifest/query (lorem/json/ip exercised end-to-end), clipboard watcher
records to SQLite (concealed types skipped by design), config link/shortcut hot-reload
registers cleanly, RSS 92MB steady, cold start 157ms. NOT machine-verifiable, needs Mitch:
panel rendering of script/clip/math rows, ⌘-digit + Enter actions per row type, the
Cmd+Alt+F9-style custom shortcut actually firing, and dropping a new script in live.

### 2026-08-08 · AppKit leaks ~20–30MB per rasterized app icon; subprocess is the fix

First launch hit **10GB RSS**. Bulk `NSWorkspace.iconForFile` + `TIFFRepresentation` retains
the rasterized data inside AppKit: per-icon `autoreleasepool` and `NSImage.recache()` both
measurably do nothing (isolated test: 152 icons → 3.3GB, kept as an `--ignored` diagnostic in
`icons.rs`). Fix: the binary re-invokes itself (`launcharr --extract-icons <dir>`) and the
caches die with the child. Steady-state RSS: **90MB** (budget: <120). Also: TIFF rasters are
1024² — downscale to 128px via the `image` crate before caching (62MB → 7.5MB), and write
zero-byte markers for apps whose icons can't be extracted so they aren't retried forever.

### 2026-08-08 · `open` re-activates a running instance — smoke tests must pkill first

Chased a "still leaking" ghost for two rebuild cycles because `open launcharr.app` had been
re-activating the old process instead of launching the new binary. Kill before relaunch.

### 2026-08-08 · brew rustup keeps cargo off the default PATH

Homebrew's `rustup` puts the proxies in `/opt/homebrew/opt/rustup/bin` (NOT `~/.cargo/bin`),
and `rustup run stable cargo fmt` fails because cargo-fmt can't find `cargo` itself. Fixed via
`.lefthookrc` (`rc:` option) exporting the proxy dir onto PATH for all hooks.

### 2026-08-08 · Matcher tuning: gaps had to get steeper

First constants (fzf-ish: gap −3/−1, consec +8) let "Pixelmator Studio Tools" beat Photoshop
for `ps` — a distant word-boundary match outscored a close mid-word one. Landed on gap −4/−2,
consecutive +12. Also: the frecency multiplier cap moved 1.8 → 1.5, because an acronym-style
match (`saf` → "Sales Aftercare Formatter", all word boundaries) times a big multiplier could
beat Safari's clean prefix run. Near-tie flips still work at 1.5.

### 2026-08-08 · tauri-nspanel v2.1 API notes

- Branch is `v2.1` (not `v2`). `tauri_panel!` macro defines the panel class +
  `panel_event!` handlers; `window.to_panel::<T>()` converts the config window.
- The `-> ()` in `panel_event!` grammar is mandatory and trips clippy's `unused_unit`;
  allowed crate-wide in lib.rs (the lint can't be scoped to a macro invocation).
- NSWindow delegates are weak: the event handler must be kept alive (`std::mem::forget`)
  or resign-key events silently stop after a GC.

### 2026-08-08 · pnpm 11 blocks postinstall scripts

`pnpm install` hard-fails on ignored build scripts (esbuild, lefthook). The fix is
`allowBuilds:` in `pnpm-workspace.yaml` — pnpm 11 writes the stanza template for you on
failure; `onlyBuiltDependencies` in package.json is no longer enough.

### 2026-09-10 · updates checks die on the LaunchAgent's bare PATH

The installed app (launched by `~/Library/LaunchAgents/launcharr.plist`) inherits the bare
macOS PATH. `updates::locate` still found pnpm/npm via its known-dirs fallback — but both
are `#!/usr/bin/env node` scripts, so the child died with `env: node: No such file or
directory`. Dev-mode runs inherit the terminal's PATH, which is why the bug hid. Fix:
`run_check` now sets the child's PATH (app PATH + the binary's dir + Homebrew + `~/.local/bin`

- mise shims + `$PNPM_HOME/bin`). Second trap: pnpm's global store is purely env-driven —
  without `PNPM_HOME` it reads an empty default store and reports `{}` as if nothing were
  installed, and refuses `-g` commands unless `$PNPM_HOME/bin` is on PATH. `pnpm_home()`
  infers it from pnpm's own conventions when the app wasn't handed one. A login shell
  (`zsh -lc`) is no help here: Mitch's `PNPM_HOME` export lives in `.zshrc`, which
  non-interactive shells never read. npm was dropped as a source at the same time: its only
  globals are node's bundled `npm`/`corepack`, which mise owns.

### 2026-09-10 · tmux hand-off: bare PATH again, and the wrong session

`tmux new-window -t <session> '<cmd>; exec zsh -l'` runs `<cmd>` with the _caller's_
environment — launcharr's bare PATH — so `brew upgrade` printed `brew: not found`, then the
`exec zsh -l` gave a clean prompt and the theme wiped the evidence: "a terminal opens and
nothing happens". Same as the checks bug above, different door; bang mode had it too. Fix:
the argv is now `exec $SHELL -lic '<cmd>; exec $SHELL -l'` (the shape the fresh-instance
path already used). Second half: the window went to the tmux client with the latest
`client_activity`, which with two Ghostty windows is a coin flip. `#{client_focused}` (tmux
≥ 3.2, `focus-events on`) is preferred now, activity as the fallback — the flag is empty
when the terminal isn't reporting focus, so treat empty as unknown, not unfocused.
