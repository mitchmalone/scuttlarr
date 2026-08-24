# Status

The cursor. Keep it short — prune or archive past ~150 lines.

## Done

- 2026-08-25 — Named, domain and GitHub org checked free (`scuttlarr.com`, `scuttlarr`). Repo stamped from the jig (`www-next` + `ci`,`public`). Founding decisions, deviations, theme model, roadmap written.
- 2026-08-25 — Dotfiles tidy (prerequisite, in the private dotfiles repo): Sketchybar, Bartender, Ice, Raycast, Alfred removed; `.macos` de-shine pass (transparency/motion, Stage Manager, Apple tiling, desktop icons, Dock parked, Siri, press-and-hold, autocorrect, LSQuarantine, USB .DS_Store, Finder home). Not yet applied to the machine.

## Done (cont.)

- 2026-08-25 — `scuttlarr.com` registered. Public repo `mitchmalone/scuttlarr` pushed, CI green. Vercel project `scuttlarr-web` (team ramenamok, root `apps/www`), git-connected, domain added; landing page deploys on push. DNS on Cloudflare: `scuttlarr.com` A → Vercel, `www` CNAME; `scutlarr.com` (registered by typo, kept) + its `www` 301 → `scuttlarr.com` via Vercel domain redirects.

## In progress

- Plan: `docs/plans/active/2026-08-25-bootstrap-scuttlarr.md`.

## Next

- Vercel dashboard: set Framework Preset = Next.js and Ignored Build Step = `git diff --quiet HEAD^ HEAD -- . ../../pnpm-lock.yaml` (matches launcharr-web).
- Terminal trial (Phase 0) — started 2026-08-25: Ghostty installed, `~/.config/ghostty/config` with bundled Dracula + Hack Nerd Font Mono 16. Shell (OMZ/zplug/p10k) untouched for now; decide at end of trial.
- Extract `defaults/` from dotfiles `.macos`; first `bin/scuttlarr` with `doctor` and `defaults`.

## Blocked

- Shell/terminal stack: awaiting the trial (DECISIONS 2026-08-25).
- Caps→Hyper: verify permission-free Esc-on-tap before promising it in the README.
