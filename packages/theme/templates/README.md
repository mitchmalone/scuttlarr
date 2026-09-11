# templates

One file per surface, rendered by `@scuttlarr/theme` into
`~/.local/state/scuttlarr/current/theme/<name without .tpl>`. Token substitution only —
`{{ key }}`, `{{ key_rgb }}`, `{{ key_strip }}`, `{{ mix a b N% }}` — no logic (THEMES.md).
Keys are Omarchy's `colors.toml` vocabulary plus `name`, `mode`, and `bat_theme` (a bat
built-in syntax theme name the palette maps to; defaults by mode). Base configs shipped by
`packages/setup` import from the rendered path; the app pushes OSC colours into running
tmux panes at `theme set`, so terminals don't need a reload.

| Template              | Consumer                                                            |
| --------------------- | ------------------------------------------------------------------- |
| `ghostty.tpl`         | `config-file = ?…/current/theme/ghostty` in the base Ghostty config |
| `tmux.conf.tpl`       | `source-file -q …/current/theme/tmux.conf` at the end of tmux.conf  |
| `p10k-colors.zsh.tpl` | sourced by the lean `.p10k.zsh` before segment styling              |
| `delta.gitconfig.tpl` | `[include] path = …/current/theme/delta.gitconfig`                  |
| `claude.json.tpl`     | copied to `~/.claude/themes/scuttlarr.json` (Omarchy does the same) |

A theme directory may ship a hand-written file with the same output name; the renderer
leaves it alone (Omarchy's rule: the template never overwrites an existing file).
