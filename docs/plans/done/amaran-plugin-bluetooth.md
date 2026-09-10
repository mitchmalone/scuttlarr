---
title: amaran light as a plugin — Bluetooth Mesh from a plugin service
status: done
created: 2026-09-10
updated: 2026-09-10
links:
  - docs/PLUGINS.md (the contract this exercises)
  - DECISIONS 2026-09-10 (Bluetooth usage string in the bundle)
  - JOURNAL 2026-09-10 (TCC kills silently; Bun has no CCM; native addons)
  - ~/.config/launcharr/plugins/amaran (the plugin — user-local, not in this repo)
  - https://github.com/wesbos/amaran-BLE-control (protocol source, MIT)
---

# amaran light as a plugin

## Goal

Mitch's studio light (amaran 60d S) in the bar: click to toggle, `light ⏎` for brightness,
with the vendor's amaran Desktop app not running at all. The first plugin that owns a radio,
so also: prove that a plugin service can reach hardware from under launcharr.app.

## Context

amaran Desktop is a Nuitka-compiled Python app driving the lights over Bluetooth SIG Mesh
(Telink stack). The Bitfocus companion module only talks to the app's local WebSocket, so it
needs the app. wesbos/amaran-BLE-control reverse-engineered the mesh path (keys from the
app's SQLite, Telink vendor opcode `0x26`) in Node + `@abandonware/noble`.

## Approach

A user plugin in `~/.config/launcharr/plugins/amaran/`, stream mode. The service owns one
GATT proxy connection and speaks mesh; the cell and panel are kit-only.

- **Radio access:** a ~150-line Swift CoreBluetooth bridge (`ble-helper.swift`, JSON lines
  on stdio) built once with `swiftc` into `.build/` (a dotdir, so the plugin watcher ignores
  it). Chosen over `noble` (a node-gyp native addon: no prebuilt for Bun, postinstall
  blocked, ABI-bound) and over a Rust command in core (invariant 3).
- **Mesh in TypeScript:** k2/k3/k4, AES-CCM composed from AES-ECB (Bun's `node:crypto` has
  no `aes-128-ccm`), network + proxy-config PDUs, and the reverse path so the light's
  status replies are read — the widget follows the physical dial.
- **State:** `model.ts` pure; commands `toggle | on | off | brightness | refresh` via
  `host.send`; brightness coalesced under slider drag; seq numbers persisted.
- **Keys:** amaran Desktop's `amaran.db` (`mesh.net_key/app_key`, `fixtures.node_address`),
  overridable by declared secret settings. The proxy is matched by Network ID (`k3`), not
  by name — a neighbour's 0x1828 advertiser (an "RTMShunt…") was in range.

## Steps

- [x] Bridge: scan 0x1828, connect, subscribe 0x2ADE, relay; standalone test (beacon, MTU 244)
- [x] Mesh crypto against Mesh Profile 1.0.1 §8 vectors and Node's CCM (50 random cases)
- [x] Live on/off/on — confirmed by eye 2026-09-10
- [x] Status reply decoded (`on=true intensity=120`) — `synced` state
- [x] Plugin: manifest, service, cell, panel, tests (`bun test`: 15 pass), README
- [x] Core: `NSBluetoothAlwaysUsageDescription` in `src-tauri/Info.plist` + DECISIONS
- [x] Reinstall the built app (Mitch) and confirm the prompt names the plugin, then the cell toggles

## Acceptance criteria

- [x] With amaran Desktop closed, the bar cell toggles the light and the slider sets brightness
- [x] The cell reflects a change made on the light's own dial (status path)
- [x] amaran Desktop running → the card says to quit it, nothing crashes
- [x] Under launcharr.app: one Bluetooth prompt, then the above — "working great" (Mitch, 2026-09-10)

## Out of scope

CCT / colour (the 60d S is daylight-only); multiple lights (the service targets the first
fixture; the mesh layer already addresses any unicast); shipping the plugin in
`packages/plugins/` (niche hardware — stays user-local by Mitch's choice).

## Risks / open questions

- The helper is an unsigned CLI child of launcharr.app; TCC attributes it to launcharr. A
  notarised release should keep working — the usage string is in the bundle plist.
- The light takes one proxy connection: the amaran mobile app cannot be used at the same
  time either.
