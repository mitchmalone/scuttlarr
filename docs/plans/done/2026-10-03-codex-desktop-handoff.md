---
title: Send Codex ask prompts to the desktop app
status: done
created: 2026-10-03
updated: 2026-10-03
links:
  - docs/DECISIONS.md
---

# Send Codex ask prompts to the desktop app

## Goal

When Codex is the `?` provider, Enter starts a fresh Codex desktop chat with the prompt and opens that chat. The answer no longer appears inside scuttlarr.

## Context

Claude stays in scuttlarr's inline answer view. Codex currently runs `codex exec --json` inside an empty, read-only working directory and streams its answer into the same view. The local Codex app-server can start a persistent thread and turn. `codex://threads/<id>` opens that thread in the desktop app.

## Approach

Use the installed Codex CLI's app-server over stdio for the Codex provider. Keep the existing read-only question scope. Start the turn before opening the desktop deep link. Report startup errors in scuttlarr and close the launcher only after the app opens. Keep the app-server child alive until the turn ends.

## Steps

- [x] Test the protocol boundary and URL validation.
- [x] Send Codex prompts to the app-server and open the desktop thread.
- [x] Change the `?` UI for Codex while leaving Claude inline.
- [x] Verify the gate and live handoff.

## Acceptance criteria

- [x] Codex receives the prompt in a new desktop chat and starts answering.
- [x] No inline Codex answer is rendered in scuttlarr.
- [x] Claude's inline mode still works.
- [x] Startup errors remain visible in scuttlarr.

## Out of scope

This does not select a project or give the `?` mode write access. It keeps the current read-only question scope.

## Risks / open questions

The app-server is drained until the turn completes. The built app still needs installation for a full UI check.
