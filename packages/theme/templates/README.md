# templates

One file per surface, rendered by `@scuttlarr/theme` into
`~/.local/state/scuttlarr/current/theme/<name without .tpl>`. Token substitution only —
`{{ key }}`, `{{ key_rgb }}`, `{{ key_strip }}`, `{{ mix a b N% }}` — no logic (THEMES.md).
Keys are Omarchy's `colors.toml` vocabulary plus `name`, `mode`, `bat_theme` (a bat
built-in syntax theme name the palette maps to; defaults by mode), and the editor names
`vscode_theme`, `neovim_colorscheme`, `helix_theme` (`src/editors.ts` defaults per theme). Base configs shipped by
`packages/setup` import from the rendered path; the app pushes OSC colours into running
tmux panes at `theme set`, so terminals don't need a reload.

| Template                | Consumer                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `ghostty.tpl`           | `config-file = ?…/current/theme/ghostty` in the base Ghostty config                                            |
| `tmux.conf.tpl`         | `source-file -q …/current/theme/tmux.conf` at the end of tmux.conf                                             |
| `p10k-colors.zsh.tpl`   | sourced by the lean `.p10k.zsh` before segment styling                                                         |
| `delta.gitconfig.tpl`   | `[include] path = …/current/theme/delta.gitconfig`                                                             |
| `claude.json.tpl`       | copied to `~/.claude/themes/scuttlarr.json` (Omarchy does the same)                                            |
| `vscode-theme.json.tpl` | VS Code / Cursor colour theme, installed as the local extension `scuttlarr.theme` (ported from Omarchy's, MIT) |
| `zed-theme.json.tpl`    | Zed theme family, written to `~/.config/zed/themes/scuttlarr.json`                                             |
| `neovim.lua.tpl`        | LazyVim spec naming `neovim_colorscheme`; running nvims get `:colorscheme`                                     |
| `btop.theme.tpl`        | `~/.config/btop/themes/scuttlarr.theme` (ported from Omarchy's, MIT)                                           |

A theme directory may ship a hand-written file with the same output name; the renderer
leaves it alone (Omarchy's rule: the template never overwrites an existing file).
