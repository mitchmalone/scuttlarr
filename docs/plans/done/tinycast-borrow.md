---
title: Borrow from Tinycast — corpus, alias roles, purity lint, budgets, off-means-off, placeholders, self-update
status: done
created: 2026-09-16
updated: 2026-09-16
links:
  - https://github.com/abue-ammar/tinycast (docs/architecture.md, docs/testing.md, docs/features/*.md)
  - ../../DECISIONS.md (2026-09-16 entries)
  - ../done/app-updates-plugin.md
  - ../active/updates-upgrade-in-panel.md
---

# Borrow from Tinycast

## Goal

Take the seven engineering practices Tinycast gets right that scuttlarr lacks, plus an
in-app updater, without importing anything that fights the invariants (no Accessibility,
no window management, no Raycast runtime). Everything lands in one burn; each piece is
small.

## Context

Tinycast is a native Swift launcher (macOS 26 only, zero deps, <100 MB) whose docs are
unusually explicit about _mechanisms_: a ranking corpus every complaint feeds, naming
lowered to trust roles, the pure layer enforced by compilation, memory numbers on every
PR, "off means off" for opt-ins, quicklink placeholders, no `NSAlert`, and a self-updater
that verifies the download's signature against the running app. Comparison done
2026-09-16 (session "Inspo"). scuttlarr already matches it on indexer depth, pure matcher,
bounded frecency and permissions; the gaps are below.

## Approach

1. **Ranking corpus** — `packages/core/src/corpus.json`: a dense index shaped like the real
   payload (real app names from this Mac plus settings panes, commands, links) and cases
   `{query, top, frecency?}`; `corpus.test.ts` runs `rank` over it. A ranking complaint is a
   new case, never an ad-hoc scorer tweak.
2. **Alias roles** — `IndexItem.keywords?: string[]`: search-only hints (bundle-id tail,
   `CFBundleName` when it differs from the display name) that match at a word boundary only
   and score below aliases. `aliases` stays the curated-synonym role. Ranking is keyed on
   role + match strength, never on which field supplied the text.
3. **Purity lint** — `no-restricted-imports` / `no-restricted-globals` for
   `packages/core/src/**`: no Tauri, React, Node, DOM I/O. Invariant 5 becomes a lint
   failure instead of a convention.
4. **Memory numbers** — `scripts/mem.sh` prints resident memory of the app and its
   helpers; the definition of done asks for idle numbers on any change that adds a process,
   window or resident cache. Plan template gets the line.
5. **Off means off** — invariant 12: a disabled plugin, rung or opt-in spawns, scans,
   fetches and holds nothing. Verified against `plugins.rs` (disabled ids never start),
   `setup.rs` (machine off → nothing linked), `appearance` (inert until the key exists).
6. **Placeholders** — `{clipboard}` and `{date}` (plus `{query}`) in quicklinks and the
   search fallback, expanded at Enter time from the latest clip (`get_clips`, existing IPC)
   and the local date. No selection placeholder: that needs Accessibility.
7. **No native alerts** — invariant 13: no `NSAlert`, `display dialog`, `window.alert`;
   questions and reports are panel rows. File pickers are the one AppleScript dialog.
8. **Self-update** — `selfupdate.rs`: the `scuttlarr` source in the `updates` plugin. Check
   = GitHub Releases `latest` (public feed, nothing about the user sent), compared with the
   bundle version. `↵` on it downloads the zip, checks the sha256 against `SHA256SUMS`,
   expands with `ditto`, validates the bundle's signature with the Security framework
   against the running app's team (`anchor apple generic and certificate leaf[subject.OU]`),
   swaps `/Applications/scuttlarr.app` by two renames, relaunches with `open -g`, exits.
   Unsigned/dev builds never offer it. `config.updates.checkSelf` (default on) is the
   switch; off means no request is ever made. `brew` stays the terminal route (`t`).

## Steps

- [x] corpus.json + corpus.test.ts
- [x] keywords on IndexItem (core + indexer.rs + www demo index), ranking role rules + tests
- [x] eslint purity block for packages/core
- [x] scripts/mem.sh; AGENTS.md definition of done; plan template line
- [x] AGENTS.md invariants 12 + 13
- [x] url.ts placeholders + expansion in App.tsx at Enter
- [x] selfupdate.rs; updates.rs `scuttlarr` source + in-process upgrade; config + Settings toggle; plugin model types
- [x] DECISIONS (updater reversal, alias roles, invariants), JOURNAL, RELEASING, STATUS
- [x] `pnpm verify`, build, dev-install

## Acceptance criteria

- [x] `pnpm verify` green
- [x] corpus test pins ≥ 30 queries over ≥ 150 entries
- [x] a `react`/`@tauri-apps` import in `packages/core/src` fails lint
- [ ] `updates ⏎` on the installed app shows `scuttlarr 0.6.0 → x.y.z` once a newer
      signed release exists — **hands-check after the next release**
- [x] a dev (ad-hoc signed) build shows no scuttlarr source (log: `refreshed: brew 8 · mas 2 · pnpm 0 · mise 0`)
- [x] Memory: `scripts/mem.sh` — before (mid-session, old build) app 157 MB, borders 460 MB,
      two Bun services 31 + 39 MB; after (8 s post-launch, this build) app 177 MB, borders
      374 MB, Bun 26 + 31 MB. Nothing here adds a process; the app is over the ceiling
      either way (JOURNAL 2026-09-16)

## Out of scope

- Raycast extension compatibility; window management in the launcher (AeroSpace owns it).
- Localised app names and CJK romanisation as keywords (no demand yet; the role model is
  ready for them).
- The tap's `auto_updates true` line — the cask does not exist yet (plan step 1.5, Mitch);
  RELEASING.md records the line.

## Risks / open questions

- GitHub's unauthenticated API limit is 60/h per IP; one check per 6 h is far under it.
- The swap keeps the previous bundle under `~/Library/Caches/scuttlarr/update/` until the
  next successful launch cleans it — WKWebView may still lazily read from the old bundle
  while the process winds down.
- LaunchAgent: launch-at-login points at `/Applications/scuttlarr.app`; the path does not
  change, so no re-registration.
