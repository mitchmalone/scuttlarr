# Setup: base, overlay, manifest

> Moved from the scuttlarr repo (its `ARCHITECTURE.md`) 2026-09-11 (DECISIONS). This is
> the design for `packages/setup` — the "machine" rung — and the source of the repo-wide
> invariant that a path outside our config has one owner, recorded in a manifest, and
> adopt moves rather than overwrites. Pre-fold wording: "scuttlarr" below means the
> setup CLI shipped inside the app; "launcharr" means the app. The "launcharr handshake"
> section is historical — with one product there is no handshake, only one marker.
> `lib/` (core, manifest, snapshot, defaults, files, doctor), `defaults/` and the
> hermetic zsh tests already exist and port as-is (plan phase 2).

How setup is put together: a read-only base, a user overlay, and a manifest of every
write — so `install`, `update`, `doctor` and `remove` are all the same walk. Decided
2026-08-28 (scuttlarr DECISIONS).

## The idea in one paragraph

scuttlarr is **a git checkout you never edit**, **a CLI that renders base ⊕ overlay into
the paths other tools already read**, and **a manifest that remembers every file it
touched**. Defaults, Brewfile, themes and launcharr are inputs. The manifest is what makes
it a system instead of a script.

## What's on disk

```
~/.local/share/scuttlarr/      the base — a clone of this repo, read-only on the machine
  bin/scuttlarr                the CLI
  lib/                         zsh helpers: log, defaults wrapper, manifest, snapshot, render
  defaults/                    macOS defaults, one file per concern, idempotent
  shell/                       base zsh (env, path, prompt, completion, tools, plugins)
  themes/<name>/               palette.toml + rendered per-app files (committed)
  templates/<app>/             what themes render through
  migrations/                  YYYY-MM-DD-slug.sh, run once each by update
  desktop/                     aerospace.toml + borders defaults, as plain files
  Brewfile                     base packages

~/.config/scuttlarr/           the overlay — the only place a user writes; survives update
  Brewfile                     extra packages
  defaults.sh                  defaults flipped back or added
  zsh/*.zsh                    sourced after shell/
  duti                         default-app overrides
  themes/<name>/               private themes (Dracula Pro lives here)
  desktop/                     aerospace / borders overrides

~/.local/state/scuttlarr/      state — what doctor and remove need; never hand-edited
  manifest                     every owned path + its mode (below)
  defaults.before              value (or absence) of every key the base writes, pre-install
  adopted/                     originals moved aside, tree-shaped (adopted/.zshrc, …)
  migrations                   which have run
  theme                        the active theme name
```

Same bytes in the base for every user, the author included: opinions good enough to
defend in a README go in the base, publicly; everything else is overlay. The tell for
which bucket: _would you defend it in the README?_ "Because I have a Pro licence / work
somewhere / like this alias" is overlay.

## Where it writes, and how it owns what it writes

scuttlarr targets the **standard** locations — `~/.zshrc`, `~/.config/ghostty`,
`~/.config/tmux`, `~/.config/aerospace`, `~/.config/launcharr/config.json`, macOS
`defaults`, Homebrew — so every other tool keeps working with no knowledge of scuttlarr.
Each owned path has exactly one mode, recorded in the manifest:

| Mode               | For                                                                                      | Update / doctor                                       |
| ------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **symlink → base** | Pure-base files: `tmux.conf`, a rendered theme file                                      | Update changes them for free; doctor checks the link  |
| **generated**      | Base ⊕ overlay merges: `.zshrc`, the Brewfile, `launcharr/config.json`, `aerospace.toml` | Rendered by the CLI; doctor re-renders and diffs      |
| **adopted**        | A file that existed before scuttlarr                                                     | Moved to `state/adopted/`, never overwritten silently |

Adopt **moves, never overwrites**. Where it makes sense the original is offered back as
an overlay (an old `.zshrc` → `zsh/99-adopted.zsh`, off by default).

Manifest line shape (one per path, tab-separated, append-only within a run):

```
<mode>\t<path>\t<source-or-render-hash>\t<layer>
```

## The install, as the user sees it

```sh
curl -fsSL https://scuttlarr.com/install | sh
```

1. **preflight** — Apple Silicon, supported macOS, Xcode CLT (installs, one Apple dialog),
   Homebrew (installs; the one `sudo`).
2. **clone** — base → `~/.local/share/scuttlarr`, `scuttlarr` on PATH.
3. **plan** — before touching anything: every package, every `defaults` change (current →
   new), every file to adopt. Asks once. `--yes` for scripts.
4. **snapshot** — read every defaults key the base will write → `defaults.before`.
   **Before the first write, always.**
5. **apply** — layers in order, each idempotent, each appending to the manifest:
   brew → defaults → shell → terminal → launcharr → theme → caps→hyper → duti.
6. **done** — the two things it can't do for you (Full Disk Access for
   reduce-transparency; launcharr's Automation consents), and "log out, back in".

Fresh Mac or existing one, same command; the difference is how many adopt lines step 3
prints. Re-running is `update`.

## The verbs — every one is a walk over the manifest

| Verb          | What happens                                                                                                                                                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `install`     | The pipeline above. Idempotent.                                                                                                                                                                                                                                                    |
| `update`      | `git pull` the base → run unrun `migrations/` → re-render every _generated_ path → `brew bundle` → `doctor`. A base change that alters user-visible state ships with its migration in the same commit (invariant 4).                                                               |
| `doctor`      | For each manifest entry: symlink intact? generated file equals its render? each defaults key equals base ⊕ overlay? launcharr and AeroSpace present? Reports drift as a list. `--fix` re-renders generated files only.                                                             |
| `theme set X` | Render `palette.toml` through `templates/` → per-app files; write `themes.X` + `theme` into launcharr's `config.json`; macOS accent, appearance, wallpaper; reload ghostty, tmux, launcharr. Skips any desktop file launcharr currently manages (below).                           |
| `remove`      | Manifest in reverse: delete symlinks and generated files, restore `adopted/`, restore `defaults.before` (keys that had no value are deleted), unload the launchagent. Asks before `brew uninstall` of base packages (default no). Leaves the overlay — it's yours — and launcharr. |

## Reversal, honestly

Cleanly reversed: files it wrote, adopted originals, macOS defaults, shell / caps→hyper /
default apps, the overlay (untouched).

Left behind — and said so at install: Homebrew packages (offered, default no), Homebrew
and Xcode CLT themselves, permission grants and the login item (macOS won't let us
revoke; listed), Dock / WindowManager keys (restored, but visibly revert only after
logout).

Net: `remove` + log out returns a Mac with some extra CLI tools — the residue any
brew-based setup leaves.

## The launcharr handshake

AeroSpace and JankyBorders are one unit, "the desktop", and the decision about who
writes it is per machine:

- **scuttlarr ships** launcharr (shared tap), `config.json` (theme block + desktop
  opinions), and `desktop/` — `aerospace.toml` + borders defaults as plain files,
  overridable in the overlay's `desktop/`. These are the fallback for launcharr-off or
  launcharr-absent.
- **launcharr may manage** the desktop when its "Let launcharr manage AeroSpace" toggle
  is on: then _it_ writes those files, themed from its own tokens, and the file carries
  `# generated by launcharr`.
- **Whoever manages, writes; the other never touches the file.** scuttlarr's `theme set`,
  `update` and `doctor` skip any desktop file carrying launcharr's prefix; launcharr
  keeps adopt-or-leave for foreign files (its `desktop.rs`).
- Default on a scuttlarr install: launcharr manages — one theme pipeline.

The rest of the boundary is unchanged (DECISIONS 2026-08-25): the interface is
`config.json`; anything launcharr can't express is a launcharr feature request.

## And dotfiles?

The author's private chezmoi repo is a fleet config (Macs, Pis, cloud). On a Mac it
writes exactly one scuttlarr thing: `~/.config/scuttlarr/`. Fleet identity, ssh, git
identity, Linux hosts, backups stay there. Fresh machine: `bootstrap.sh` lays down the
overlay, then the install URL finds it waiting. The shell base lives in this repo's
`shell/`; Linux hosts can pull that directory in via a chezmoi external so they keep the
shared shell without a copy.

Split by **audience**, not by machine:

| What                          | Where                                    | Who    |
| ----------------------------- | ---------------------------------------- | ------ |
| good-for-anyone Mac opinions  | scuttlarr base                           | public |
| only-you Mac residue          | `~/.config/scuttlarr/` (chezmoi-managed) | you    |
| fleet: hosts, identity, Linux | dotfiles repo                            | you    |

## The one rule

**A path is owned by exactly one thing, and the manifest says which.** That's what lets
`update` not clobber you, `doctor` say what drifted, and `remove` actually leave. Two
mechanics make it true rather than aspirational: the defaults snapshot is taken before
the first write, and adopt moves — it never overwrites.
