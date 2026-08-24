# Decisions

Lightweight ADRs. Append-only, newest first: decision, context, reasoning. Decided once — don't relitigate.

## 2026-08-25 — Terminal and shell stack: open, decided by trial not debate

Deferred. The inherited stack (iTerm2 + Oh My Zsh + zplug + Powerlevel10k) works but is what Mitch inherited, not what he'd choose fresh; a distro must defend every pick. Candidate: Ghostty + a lean plugin approach (no OMZ, no zplug) + a fast prompt (p10k or starship). Reasoning for deferring: this is the one surface where the author is attached and the cost of being wrong is daily, so it gets a one-week trial on the primary machine before the base commits. Trigger: end of the trial, record the outcome here and set the Stack table in AGENTS.md.

## 2026-08-25 — Themes: one palette, rendered into every app, rendered files committed

A theme is `themes/<name>/palette.toml` (16 ANSI colours + UI tokens: bg, fg, accent, dim, warn, danger, border, selection) plus per-app files rendered from templates in `templates/<app>/`. Rendered files are committed, so a theme directory is plain data usable without the CLI and publishable standalone per app — the Dracula model ("ship themes into apps"). v1 ships Dracula, Solarized Light, Solarized Dark, Tokyo Night, Catppuccin Mocha, Gruvbox Dark, Nord. Dracula Pro is paid and is never redistributed: it's the canonical example of an overlay theme in `~/.config/scuttlarr/themes/`. Reasoning: Omarchy's hand-written per-app theme files are maximally hackable but drift; a single palette source with committed renders keeps both properties. Light themes are first-class from day one (Solarized Light) so the token set can't quietly assume dark.

## 2026-08-25 — The overlay model: base is read-only, the user owns `~/.config/scuttlarr/`

Base config (Brewfile, defaults, shell, themes, launcharr config) lives in the install and is never edited in place. User additions and reversals live in `~/.config/scuttlarr/` — `Brewfile`, `defaults.sh`, `zsh/*.zsh`, `duti`, `themes/`. Base loads, then overlay applies, on every `install`/`update`/`theme set`. Reasoning: this is what makes updates safe and personal dotfiles small. Mitch's private dotfiles become "fleet config for the Pis + a ~50-line Mac overlay".

## 2026-08-25 — Migrations are first-class

`migrations/YYYY-MM-DD-slug.sh`, run once by `scuttlarr update`, recorded in `~/.local/state/scuttlarr/migrations`. A base change that alters user-visible state ships its migration in the same commit (AGENTS invariant 4). Reasoning: this is the concrete difference between a distro and a dotfiles snapshot — Omarchy's `omarchy-update` + migrations is the mechanism that lets its opinions change without stranding installs.

## 2026-08-25 — launcharr is the whole desktop layer, installed not vendored

Launcher (replaces Spotlight/Raycast/Alfred), menu bar (replaces Bartender/Ice/Sketchybar), and tiling (owns AeroSpace + JankyBorders config). scuttlarr installs it from the shared tap and drives it through `~/.config/launcharr/config.json` (`theme` + `themes` map, desktop settings). Reasoning: one opinion per surface; launcharr already has a theme token model and a config file, so scuttlarr renders into it rather than forking. Anything it can't express is a launcharr issue.

## 2026-08-25 — The distro is zsh; the site is Next

See DEVIATIONS for the full reasoning. Short form: the installer must be shell because nothing else exists on a fresh Mac; the CLI stays shell so the distro is readable and forkable; zsh over bash because macOS ships zsh 5.9 and bash 3.2. The site is the jig's `www-next` flavor unchanged — it exists to serve the install URL and the manifesto.

## 2026-08-25 — Founding: a distro, not a dotfiles manager; the name

**What it is.** An opinionated macOS distro with an overlay model and a lifecycle, in the shape of Omarchy. Not a dotfiles manager (chezmoi/yadm/stow exist and are neutral by design — the opposite of the point) and not "better dotfiles" (dotfiles are one person's residue; nobody installs them). Scope for v1: de-shine defaults, launcharr desktop layer, theme system, Caps→Hyper, default apps via duti, a fast shell, `install`/`update`/`doctor`/`theme`, and scuttlarr.com.

**Name.** _scuttlarr_ — `launch·arr` / `scuttl·arr`, same verb-stem + arr cadence as its sibling. Scuttling is sinking a ship on purpose: it's Apple's ship we scuttle, and the wreck is what we sail. `scuttlarr.com` and the GitHub org were free on 2026-08-25. `rigarr.com` was the runner-up (clearer, less attitude).

**Origin.** Extracted from Mitch's private dotfiles (mathiasbynens/OSX4Hackers lineage, 2014 → 2026) after concluding the private repo was really a fleet config for eight hosts, with the Mac opinions buried in it. The 2026-08-25 dotfiles tidy (Sketchybar/Bartender/Ice/Raycast/Alfred removed, `.macos` de-shine pass) was the first step; the second is moving those opinions here and leaving an overlay behind.
