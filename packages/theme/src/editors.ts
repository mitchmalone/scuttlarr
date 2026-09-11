/**
 * Editors that pick a theme by *name* rather than reading a rendered palette: Neovim
 * (`:colorscheme`) and Helix (`theme = "…"` in config.toml). Each built-in theme maps
 * to the editor's own port of the same palette; a `colors.toml` overrides any key at
 * the top level (`neovim_colorscheme`, `helix_theme`, `vscode_theme`). VS Code and Zed
 * render a full theme file instead, so their name is always ours.
 */

export type EditorThemes = {
  /** `workbench.colorTheme` label; the generated extension contributes it. */
  vscode_theme: string
  /** `:colorscheme` argument — must be a scheme the user's Neovim has installed. */
  neovim_colorscheme: string
  /** `theme = "…"` in `~/.config/helix/config.toml` — Helix built-ins. */
  helix_theme: string
}

export const EDITOR_THEME_KEYS = [
  'vscode_theme',
  'neovim_colorscheme',
  'helix_theme',
] as const satisfies ReadonlyArray<keyof EditorThemes>

/** The rendered VS Code/Zed theme's name — a constant, not per theme. */
export const RENDERED_EDITOR_THEME = 'scuttlarr'

/** Built-in theme name → { neovim, helix }. Absent → `default`. */
export const DEFAULT_EDITOR_THEMES: Readonly<
  Record<string, { neovim: string; helix: string }>
> = {
  dracula: { neovim: 'dracula', helix: 'dracula' },
  catppuccin: { neovim: 'catppuccin', helix: 'catppuccin_mocha' },
  gruvbox: { neovim: 'gruvbox', helix: 'gruvbox' },
  nord: { neovim: 'nord', helix: 'nord' },
  'tokyo-night': { neovim: 'tokyonight', helix: 'tokyonight' },
  'rose-pine': { neovim: 'rose-pine', helix: 'rose_pine' },
  'one-dark': { neovim: 'onedark', helix: 'onedark' },
  solarized: { neovim: 'solarized', helix: 'solarized_dark' },
  'solarized-light': { neovim: 'solarized', helix: 'solarized_light' },
  monokai: { neovim: 'monokai', helix: 'monokai' },
}

/** Defaults for `name`, overridden by any of `EDITOR_THEME_KEYS` present in `raw`. */
export function editorThemesFor(
  name: string,
  raw: Record<string, string | undefined> = {},
): EditorThemes {
  const d = DEFAULT_EDITOR_THEMES[name] ?? {
    neovim: 'default',
    helix: 'default',
  }
  return {
    vscode_theme: raw.vscode_theme || RENDERED_EDITOR_THEME,
    neovim_colorscheme: raw.neovim_colorscheme || d.neovim,
    helix_theme: raw.helix_theme || d.helix,
  }
}
