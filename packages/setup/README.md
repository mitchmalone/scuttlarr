# @scuttlarr/setup

The setup CLI, ported from the scuttlarr repo on 2026-09-11 (DECISIONS): `bin/scuttlarr`,
`lib/` (core, manifest, snapshot, defaults, files, doctor), `defaults/` (one file per
concern, idempotent), hermetic zsh tests under `test/`. Design: `docs/SETUP.md`. Deliberately
zsh 5.9 with no runtime — it runs before the app, Node, or Rust exist on a fresh Mac
(`DEVIATIONS.md`).

```sh
packages/setup/bin/scuttlarr doctor        # read-only: what differs from base ⊕ overlay
packages/setup/bin/scuttlarr defaults      # plan every macOS default that would change
pnpm --filter @scuttlarr/setup test        # syntax floor + tests, also part of pnpm verify
```

The plan (`docs/plans/active/2026-09-11-unify-into-scuttlarr.md`, phase 2) ships this
inside the app bundle and puts `scuttlarr` on PATH from Settings → Machine.
