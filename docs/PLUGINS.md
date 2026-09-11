# scuttlarr plugins

A plugin is a **directory** in `~/.config/scuttlarr/plugins/<id>/` that owns a cell in
the bar, a panel in the launcher, or a background service — or all three. Its logic runs
in a Bun process; its UI is React on the scuttlarr kit. Drop the directory in and it's
live: no build step of your own, no restart. The reference plugin is
[`apps/desktop/plugins/hello/`](../apps/desktop/plugins/hello/) — copy it to start.
Bundled plugins (`packages/plugins/`: `usage`, `calendar`, `updates`) are written to the same
contract, so what scuttlarr ships is what you get (DECISIONS 2026-08-27).

```
~/.config/scuttlarr/plugins/hello/
  manifest.json    who it is and what it contributes
  service.ts       optional · the logic, under Bun, out of the webview
  cell.tsx         optional · the bar cell, React on @scuttlarr/tui
  panel.tsx        optional · the `hello ⏎` panel, same
```

**Two runtimes, one rule each.** Everything that touches the world — clocks, files,
shell-outs, credentials, the network — lives in `service.ts`. Everything a person sees
lives in `cell.tsx` / `panel.tsx`, built only from kit components, so a plugin looks
native in every theme and renders identically on scuttlarr.com. The UI never calls
Tauri; it gets a four-call `host` and nothing else.

## `manifest.json`

```json
{
  "schemaVersion": 1,
  "id": "hello",
  "name": "Hello",
  "version": "0.1.0",
  "description": "one line for the settings list",
  "kinds": ["bar-widget", "panel"],
  "zone": "right",
  "icon": "hand",
  "panel": {
    "title": "Hello",
    "hint": "the reference plugin ▸",
    "triggers": ["hi"]
  },
  "settings": [
    { "key": "HELLO_NAME", "label": "Name", "hint": "who to greet" }
  ],
  "requires": [
    {
      "label": "GitHub CLI, signed in",
      "fix": "brew install gh && gh auth login"
    }
  ],
  "auth": { "label": "Sign in with GitHub" }
}
```

- `id` — `[a-z0-9-_]`, ≤ 32 chars. Names the directory, the layout slot (`plugin:<id>`),
  the trigger file (`triggers/plugin.<id>`), and the panel word (`hello ⏎`). A user
  plugin can't shadow a bundled id.
- `kinds` — what the plugin contributes: `bar-widget` (a cell), `panel` (an `id ⏎`
  panel), `service` (background only). Drives where it appears; the files decide what
  renders.
- `zone` — where the cell first lands (`left` | `center` | `right`); move it in
  Settings → Menubar afterwards like any module.
- `icon` — a [lucide](https://lucide.dev/icons) name: the generic cell's glyph, the
  panel row's icon.
- `interval` — seconds; **present = tick mode** (below). Absent = stream mode.
- `timeout` — seconds a tick may run (default 10, max 60).
- `panel` — `title`, `hint` (dim row copy), extra `triggers`, fuzzy `aliases`.
- `settings`, `requires`, `auth` — exactly as in [WIDGETS.md](WIDGETS.md): settings are
  collected in Settings → Menubar → Plugins and delivered as **env**; secrets go to the
  Keychain; `auth` means `service.ts auth` runs the plugin's own sign-in.
- `permissions` — privacy classes the service touches: `bluetooth`, `camera`,
  `microphone`, `location`, `contacts`, `calendars`, `reminders`, `photos`,
  `local-network`. Shown under the plugin in Settings with what macOS currently says;
  before the service runs scuttlarr **asks** for any it has not decided (one prompt, in
  scuttlarr's name, at a predictable moment) and **does not run it** while one is denied
  — the row says so and offers the Privacy pane. An unknown name fails the manifest.

## `service.ts` — the logic

Run under Bun (`runtime.rs`; any executable named `service` works too), from the plugin's
directory, with the declared settings as env and `SCUTTLARR_PLUGIN=<id>`.

**Stream mode** (no `interval`): scuttlarr keeps the process alive. Every line on stdout
is one JSON value and becomes the plugin's **state**; the bar and the panel re-render on
each. Lines on **stdin** are messages from the UI (`host.send(...)`), plus
`{"poke":true}` when `~/.config/scuttlarr/triggers/plugin.<id>` is touched. If the
process exits it is restarted with backoff (1 s doubling to 60 s; reset after a minute
alive); the cell keeps the last state and shows the error.

**Tick mode** (`interval` set): `service.ts tick` runs every N seconds (min 5) with a
timeout; stdout is one JSON state. This is the [WIDGETS.md](WIDGETS.md) contract — a
data-only widget whose state is a `WidgetView` and which has no `cell.tsx` renders
through the generic cell and card, unchanged.

stderr goes to scuttlarr's log (`Console.app`, `[plugin <id>]`) and its tail lands on the
cell when the service dies. A line over 1 MiB is dropped as an error.

## `cell.tsx` and `panel.tsx` — the UI

Default-export a React component. Import from `@scuttlarr/tui` (components, hooks, the
bar cells and cards), `@scuttlarr/tui/plugins` (types), `lucide-react`, and `react` —
the app provides its own single instance of each (a plugin directory has no
`node_modules`; these resolve at load time), so a second React or a second kit never
loads. Anything else you import must be vendored into the plugin directory, and is
bundled. No CSS files, no `style` tags, no `invoke`: components and theme tokens are the
styling, the `host` is the reach.

```tsx
import { BarCard, BarCardTitle, BarHoverCell, ICON_PROPS } from '@scuttlarr/tui'
import type { PluginCellProps } from '@scuttlarr/tui/plugins'
import { Hand } from 'lucide-react'

export default function HelloCell({ plugin, state, hover, host }: PluginCellProps<MyState>) { … }
```

Props (`@scuttlarr/tui/plugins`):

| prop       | cell | panel | what                                                               |
| ---------- | ---- | ----- | ------------------------------------------------------------------ |
| `plugin`   | ✓    | ✓     | the `PluginState` — id, name, health, `error`, `builtAt`           |
| `state`    | ✓    | ✓     | the service's latest state (your shape), `null` before the first   |
| `settings` | ✓    | ✓     | plain settings as the user set them (`{ HELLO_NAME: 'Mitch' }`)    |
| `now`      | ✓    |       | the bar's 1 Hz clock                                               |
| `hover`    | ✓    |       | the hover feed for a `BarHoverCell` card; absent where none exists |
| `host`     | ✓    | ✓     | `open(url)` · `copy(text)` · `send(message)` · `openPanel(id?)`    |
| `onClose`  |      | ✓     | close the panel (Esc)                                              |

Use `BarHoverCell` with `id={`plugin:${plugin.id}`}` for a cell with a card (cards anchor
to their zone's edge automatically, so they stay on screen wherever the cell sits); the kit's
`Panel`, `ListRow`, `KeyHints`, `Calendar`, `MeterRow`… for panels. A component that
throws paints its own cell red (the message is in the card and in Settings) and nothing
else in the bar changes.

**Building.** scuttlarr runs `bun build` on the UI files when a plugin is installed and
whenever a file in its directory changes, into `~/.config/scuttlarr/.build/<id>/`, and
hot-swaps the module — edit `cell.tsx`, watch the strip. A build error shows on the cell
and in Settings. Bun is required for UI files (Node has no TSX); a plugin without UI
files runs under either.

## Install, manage, debug

- **Install:** Settings → Menubar → Plugins → paste a git URL (one `git clone --depth 1`,
  on click, never in the background), or `git clone` into
  `~/.config/scuttlarr/plugins/` yourself — the watcher picks it up.
- **Off/on:** the checkbox in Settings (`config.plugins.disabled`). A disabled plugin's
  service is stopped, its cell and panel vanish.
- **Restart:** Settings → restart, or `r` in `plugins ⏎`: service respawned, tick run
  now, UI rebuilt.
- **`plugins ⏎`** — the gallery: every plugin's live cell in a strip, health, `⏎` to open
  its panel. Where to look while writing one.
- **Refresh on demand:** `touch ~/.config/scuttlarr/triggers/plugin.<id>`.
- **Logs:** `Console.app` → scuttlarr → `[plugin <id>]` (stderr) and
  `[scuttlarr plugins]` (supervisor).

## Reference plugins

- **`apps/desktop/plugins/hello/`** — stream service, cell with a card, panel, `host.send`.
  Copy it to start.
- **`apps/desktop/plugins/mirror/`** — tick service, no UI of its own (hidden while
  healthy, red with a card when a sync fails). Every 5 minutes it rsyncs another
  machine's Codex and Claude Code journals over your own ssh into
  `~/.local/share/scuttlarr/mirrors/<host>/{codex,claude}/`, which the usage monitor
  scans by convention alongside the local journals — so `usage ⏎` counts every machine.
  Settings: `MIRROR_HOST` (an ssh alias that works with `BatchMode=yes`). Anything else
  that puts `*.jsonl` under that path counts too (Syncthing, a cron).

## Bundled plugins

`packages/plugins/` holds the plugins scuttlarr ships — `usage` (the agent usage cell +
`usage ⏎`), `calendar` (`cal ⏎`), and `updates` (app updates across brew, the App Store,
pnpm and mise — a count in the bar, `updates ⏎` for the list; its `updates` provider
shells out every 6 h, `touch triggers/plugin.updates` or `r` in the panel for now; `↵` on a
row upgrades that source in the panel with live output (`a` everything, `x` cancels), `t`
hands it to your terminal instead). Same contract, two differences: their UI is
Vite-bundled with the app, and their state comes from a Rust provider named in the
manifest (`"native": "usage"`) instead of a Bun service, so the app never depends on Bun
for its own panels. `native` is refused in user plugins. scuttlarr.com imports these
same files for its demo (invariant 10) — a bundled plugin that can't render from a
fixture isn't finished.

## Rules of the road

- **State is data, UI is code.** Put opinion in the cell; put the world in the service.
- **Kit only.** If the kit lacks a component you need, that's a kit change — a plugin
  reaching for raw HTML and CSS is the thing this design exists to avoid.
- **Network is your business,** and it says so in Settings through `requires`/`settings`.
  Be fail-visible and cache: a plugin that blocks or blanks when a host is down is a bug.
- **Hardware is a helper, not a native module.** A plugin directory has no `node_modules`
  and Bun does not load node-gyp addons, so a service that needs a radio or a device
  spawns a small compiled helper (Swift + CoreBluetooth, JSON lines on stdio, built once
  into a dotdir the watcher ignores) and keeps the protocol in TypeScript where it is
  testable. Worked example: the `amaran` light plugin (JOURNAL 2026-09-10).
- **Declare what you touch.** macOS attributes a helper's privacy access to scuttlarr.app
  and kills it, no prompt, when the bundle lacks the usage string. The bundle ships a
  string for every class in `permissions` (DECISIONS 2026-09-10 ×2) and `permissions.rs`
  asks and checks before the service runs — but only for what the manifest declares. An
  undeclared class still works (the string is there) and simply prompts on first use; a
  class not in the list needs its string added to `src-tauri/Info.plist` first.
- **Trust.** Installing a plugin runs its code, like an editor extension. Read what you
  install.
