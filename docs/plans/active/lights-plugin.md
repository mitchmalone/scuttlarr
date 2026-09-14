---
title: lights plugin — amaran + Home.app lights under one 💡
status: active
created: 2026-09-14
updated: 2026-09-14 (built, dev-installed; waiting on the shortcuts)
links:
  - ../done/amaran-plugin-bluetooth.md
  - ../../PLUGINS.md
---

# lights plugin

## Goal

One bar cell (💡) for every light Mitch owns: the amaran studio light (Bluetooth Mesh,
already working) and the two Nanoleaf lights that live in Home.app. Hover shows the
controls — per-light power, brightness, colour temperature — and a row of scenes.
`light ⏎` keeps the keyboard panel.

## Context

- amaran is a user plugin at `~/.config/scuttlarr/plugins/amaran/` (not in this repo). It
  becomes `~/.config/scuttlarr/plugins/lights/`, amaran demoted to one driver.
- The Nanoleaf lights are Essentials (Thread/Matter): nothing on the LAN advertises
  `_nanoleafapi._tcp`, three Matter nodes sit behind a HomePod border router. No local
  REST API. A native macOS app cannot link HomeKit (iOS/Catalyst only, entitlement needs
  provisioning), Homebridge points the wrong way (it feeds devices _into_ Home), and a
  Matter accessory pairs to one fabric. The only zero-permission door is the Shortcuts CLI.
- No interactive hover card exists yet — every card is read-only. Cells already take
  clicks (`accept_first_mouse`), so buttons work; whether `pointermove` reaches a
  never-active window (JOURNAL 2026-08-16) decides if the kit `Slider` can drag inside a
  card. Unknown until tried — presets/steppers are the fallback.

## Approach

`lights` is one stream-mode service with a **driver per light**:

- `drivers/amaran.ts` — the existing mesh session, behind a `Driver` interface.
- `drivers/home.ts` — Shortcuts. Discovery by naming convention in `shortcuts list`, no
  config: a shortcut named `lights/<name>/state` declares a light; `lights/<name>/on`,
  `/off`, `/brightness`, `/ct` are its verbs (each one "Control <accessory>" action with
  the value = Shortcut Input). Missing verbs = missing capabilities. State is polled (30 s,
  and ~1 s after every set) by running `…/state`, whose output is `key=value` lines.
- **Scenes**: `scenes.json` beside the plugin (name → per-light patch) plus any Home.app
  scene exposed as `lights/scene/<name>`. Both appear in the same row.
- Cell: 💡, dimmed when everything is off, muted while nothing is reachable. Card: a row
  per light (name, toggle, status), sliders under it, scenes as a segmented row.
- State shape: `LightsState { lights: Light[], scenes: string[] }`; commands carry a
  `light` id. Pure model + tests, as before.

## Steps

- [x] Plan, journal the Nanoleaf/HomeKit finding
- [x] `lights/` skeleton: manifest, model (+tests), driver interface
- [x] amaran driver extracted from service.ts, unchanged behaviour
- [x] home driver: discovery, state parse (+tests), set verbs, polling
- [x] scenes.json + Home scenes
- [x] cell (💡 + interactive card), panel (multi-light keyboard)
- [x] live check: amaran still connects; home driver shows the recipe until shortcuts exist
- [ ] Mitch creates the shortcuts; measure `shortcuts run` latency; note any TCC prompt
- [ ] STATUS, JOURNAL, memory pointer; plan → done

## Acceptance criteria

- [ ] 💡 in the bar; hover card toggles/dims each light; amaran works as before
- [ ] Nanoleaf lights follow the card once the shortcuts exist; state read back
- [ ] `bun test` green in the plugin dir; no app changes needed (or recorded if so)

## Out of scope

Colour (hue/sat), Home.app accessory discovery beyond the naming convention, a native
Matter controller.

## Risks / open questions

- `shortcuts run` from the LaunchAgent-launched app: may prompt once (Automation) or work
  headless — unknown until run. Latency expected ~1 s.
- Slider drag inside a hover card (see Context).
