// GENERATED — do not edit; pnpm --filter @scuttlarr/theme build
// Source: packages/theme/themes/<name>/colors.toml, baked by packages/theme/src/generate.ts.
// `pnpm verify:themes` fails when this file is stale.

/** Built-in theme name → its colors.toml, verbatim. */
export const BUILTIN_THEME_SOURCES: Record<string, string> = {
  scuttlarr: `# scuttlarr — the house theme. Ink-blue ground, coral accent; ANSI in the same key.
# Shades not listed (bright_*, brown) derive by Omarchy's rules.
mode = "dark"

accent = "#ff6b8c"
selection = "#393b54"
muted = "#565873"

background = "#1c1d2a"
dark_background = "#151620"
darker_background = "#0e0f15"
lighter_background = "#262838"

foreground = "#b5b9d9"
dark_foreground = "#73747c"
light_foreground = "#cbcfe8"
bright_foreground = "#e0e3f5"

red = "#f85149"
yellow = "#d29922"
orange = "#f0883e"
green = "#3fb950"
cyan = "#39c5cf"
blue = "#58a6ff"
magenta = "#bc8cff"

[launcher]
# The prompt sigil is the accent, and rows highlight with the text tone, not the accent.
sigil = "#ff6b8c"
selected = "rgba(181, 185, 217, 0.12)"
`,
  dracula: `# Dracula — from draculatheme.com/contribute (MIT); ANSI from the Dracula terminal spec.
mode = "dark"

accent = "#bd93f9"
selection = "#44475a"
muted = "#6272a4"

background = "#282a36"
dark_background = "#21222c"
darker_background = "#191a21"
lighter_background = "#313445"

foreground = "#f8f8f2"
dark_foreground = "#6272a4"
light_foreground = "#f8f8f2"
bright_foreground = "#ffffff"

red = "#ff5555"
yellow = "#f1fa8c"
orange = "#ffb86c"
green = "#50fa7b"
cyan = "#8be9fd"
blue = "#bd93f9"
magenta = "#ff79c6"
brown = "#805c36"

bright_red = "#ff6e6e"
bright_yellow = "#ffffa5"
bright_green = "#69ff94"
bright_cyan = "#a4ffff"
bright_blue = "#d6acff"
bright_magenta = "#ff92df"

[launcher]
# Dracula's "current line" at a heavy alpha is the classic row highlight.
selected = "rgba(68, 71, 90, 0.55)"
`,
  terminal: `# terminal — green phosphor on black. Monochrome by design; the ANSI slots are
# saturated primaries so a terminal using this palette still has distinct colours.
mode = "dark"

accent = "#33ff33"
selection = "#123f12"
muted = "#0f7f0f"

background = "#000000"
dark_background = "#000000"
darker_background = "#000000"
lighter_background = "#0a120a"

foreground = "#33ff33"
dark_foreground = "#0f7f0f"
light_foreground = "#66ff66"
bright_foreground = "#99ff99"

red = "#ff3333"
yellow = "#ffff33"
orange = "#ff9933"
green = "#33ff33"
cyan = "#33ffff"
blue = "#3399ff"
magenta = "#ff33ff"

[launcher]
# Everything glows the one phosphor; the panel is nearly opaque over a black ground.
glass = "rgba(0, 0, 0, 0.93)"
bang = "#33ff33"
warn = "#33ff33"
selected = "rgba(51, 255, 51, 0.12)"
`,
  amber: `# amber — amber phosphor on black. Monochrome by design; the ANSI slots stay warm,
# stepping through the same amber so nothing reads as a foreign colour.
mode = "dark"

accent = "#ffb000"
selection = "#4a3200"
muted = "#8a5f00"

background = "#000000"
dark_background = "#000000"
darker_background = "#000000"
lighter_background = "#140d00"

foreground = "#ffb000"
dark_foreground = "#8a5f00"
light_foreground = "#ffc040"
bright_foreground = "#ffd97a"

red = "#ff5533"
yellow = "#ffcf60"
orange = "#ff8c00"
green = "#e0a800"
cyan = "#ffd27a"
blue = "#cc8e00"
magenta = "#ff9a3c"

[launcher]
# The sigil is the phosphor itself; the panel is nearly opaque over a black ground.
glass = "rgba(0, 0, 0, 0.93)"
sigil = "#ffb000"
selected = "rgba(255, 176, 0, 0.12)"
`,
  catppuccin: `# Catppuccin Mocha — from Omarchy (themes/catppuccin/colors.toml, MIT).
# Only \`accent\` differs: the launcher accents with mauve, Omarchy with blue.
mode = "dark"

accent = "#cba6f7"
selection = "#45475a"
muted = "#585b70"

background = "#1e1e2e"
dark_background = "#161622"
darker_background = "#101019"
lighter_background = "#313244"

foreground = "#cdd6f4"
dark_foreground = "#6c7086"
light_foreground = "#bac2de"
bright_foreground = "#cdd6f4"

red = "#f38ba8"
yellow = "#f9e2af"
orange = "#f6b6ab"
green = "#a6e3a1"
cyan = "#94e2d5"
blue = "#89b4fa"
magenta = "#f5c2e7"
brown = "#7b5b55"

bright_red = "#f38ba8"
bright_yellow = "#f9e2af"
bright_green = "#a6e3a1"
bright_cyan = "#94e2d5"
bright_blue = "#89b4fa"
bright_magenta = "#f5c2e7"
`,
  gruvbox: `# Gruvbox Dark (medium) — classic palette from github.com/morhetz/gruvbox (MIT).
# Omarchy ships the gruvbox-material variant instead; this file keeps its layout.
mode = "dark"

accent = "#fe8019"
selection = "#504945"
muted = "#928374"

background = "#282828"
dark_background = "#1d2021"
darker_background = "#141617"
lighter_background = "#3c3836"

foreground = "#ebdbb2"
dark_foreground = "#928374"
light_foreground = "#d5c4a1"
bright_foreground = "#fbf1c7"

red = "#fb4934"
yellow = "#fabd2f"
orange = "#fe8019"
green = "#b8bb26"
cyan = "#8ec07c"
blue = "#83a598"
magenta = "#d3869b"
brown = "#d65d0e"

bright_red = "#fb4934"
bright_yellow = "#fabd2f"
bright_green = "#b8bb26"
bright_cyan = "#8ec07c"
bright_blue = "#83a598"
bright_magenta = "#d3869b"
`,
  monokai: `# Monokai — classic palette (monokai.pro/classic; MIT terminal ports).
mode = "dark"

accent = "#f92672"
selection = "#49483e"
muted = "#75715e"

background = "#272822"
dark_background = "#1e1f1c"
darker_background = "#141411"
lighter_background = "#34352d"

foreground = "#f8f8f2"
dark_foreground = "#75715e"
light_foreground = "#f8f8f2"
bright_foreground = "#f9f8f5"

red = "#f92672"
yellow = "#e6db74"
orange = "#fd971f"
green = "#a6e22e"
cyan = "#66d9ef"
blue = "#66d9ef"
magenta = "#ae81ff"
brown = "#7f4c10"

bright_red = "#f92672"
bright_yellow = "#e6db74"
bright_green = "#a6e22e"
bright_cyan = "#66d9ef"
bright_blue = "#66d9ef"
bright_magenta = "#ae81ff"

[launcher]
# Pink is the accent, so danger takes Monokai Pro's softer red to stay distinct.
danger = "#ff6188"
`,
  nord: `# Nord — from Omarchy (themes/nord/colors.toml, MIT).
# Only \`accent\` differs: the launcher accents with frost (nord8), Omarchy with nord9.
mode = "dark"

accent = "#88c0d0"
selection = "#434c5e"
muted = "#4c566a"

background = "#2e3440"
dark_background = "#222730"
darker_background = "#191c23"
lighter_background = "#3b4252"

foreground = "#d8dee9"
dark_foreground = "#667080"
light_foreground = "#adb5c4"
bright_foreground = "#d8dee9"

red = "#bf616a"
yellow = "#ebcb8b"
orange = "#d5967a"
green = "#a3be8c"
cyan = "#88c0d0"
blue = "#81a1c1"
magenta = "#b48ead"
brown = "#6a4b3d"

bright_red = "#bf616a"
bright_yellow = "#ebcb8b"
bright_green = "#a3be8c"
bright_cyan = "#8fbcbb"
bright_blue = "#81a1c1"
bright_magenta = "#b48ead"

[launcher]
# The launcher reads in Snow Storm's brightest tone with nord3 as its border and a
# lifted comment grey — brighter than Omarchy's terminal-oriented picks.
fg = "#eceff4"
dim = "#7b88a1"
border = "#4c566a"
`,
  'one-dark': `# One Dark — from Atom's one-dark-syntax / one-dark-ui (MIT).
mode = "dark"

accent = "#61afef"
selection = "#3e4451"
muted = "#5c6370"

background = "#282c34"
dark_background = "#21252b"
darker_background = "#181a1f"
lighter_background = "#2c313a"

foreground = "#abb2bf"
dark_foreground = "#5c6370"
light_foreground = "#9da5b4"
bright_foreground = "#dcdfe4"

red = "#e06c75"
yellow = "#e5c07b"
orange = "#d19a66"
green = "#98c379"
cyan = "#56b6c2"
blue = "#61afef"
magenta = "#c678dd"
brown = "#694d33"

bright_red = "#e06c75"
bright_yellow = "#e5c07b"
bright_green = "#98c379"
bright_cyan = "#56b6c2"
bright_blue = "#61afef"
bright_magenta = "#c678dd"
`,
  'rose-pine': `# Rosé Pine (main) — from rosepinetheme.com/palette (MIT).
# Omarchy ships the Dawn (light) variant; this is the dark one the launcher had.
mode = "dark"

accent = "#ebbcba"
selection = "#403d52"
muted = "#6e6a86"

background = "#191724"
dark_background = "#13111b"
darker_background = "#0d0c12"
lighter_background = "#26233a"

foreground = "#e0def4"
dark_foreground = "#6e6a86"
light_foreground = "#908caa"
bright_foreground = "#e0def4"

red = "#eb6f92"
yellow = "#f6c177"
orange = "#ea9a97"
green = "#31748f"
cyan = "#ebbcba"
blue = "#9ccfd8"
magenta = "#c4a7e7"
brown = "#754d4b"

bright_red = "#eb6f92"
bright_yellow = "#f6c177"
bright_green = "#31748f"
bright_cyan = "#ebbcba"
bright_blue = "#9ccfd8"
bright_magenta = "#c4a7e7"

[launcher]
# Pine is too deep for a prompt sigil; the launcher uses foam, and a quieter selection.
sigil = "#9ccfd8"
selected = "rgba(235, 188, 186, 0.12)"
`,
  solarized: `# Solarized Dark — from ethanschoonover.com/solarized (MIT).
# Bright ANSI slots that Solarized fills with base tones instead mirror the accents.
mode = "dark"

accent = "#268bd2"
selection = "#073642"
muted = "#586e75"

background = "#002b36"
dark_background = "#00212b"
darker_background = "#001a20"
lighter_background = "#073642"

foreground = "#93a1a1"
dark_foreground = "#586e75"
light_foreground = "#eee8d5"
bright_foreground = "#fdf6e3"

red = "#dc322f"
yellow = "#b58900"
orange = "#cb4b16"
green = "#859900"
cyan = "#2aa198"
blue = "#268bd2"
magenta = "#d33682"
brown = "#66260b"

bright_red = "#cb4b16"
bright_yellow = "#b58900"
bright_green = "#859900"
bright_cyan = "#2aa198"
bright_blue = "#268bd2"
bright_magenta = "#6c71c4"

[launcher]
# base02 vanishes as a hairline on base03; the launcher's border sits a step lighter.
border = "#175263"
`,
  'solarized-light': `# Solarized Light — from ethanschoonover.com/solarized (MIT).
mode = "light"

accent = "#268bd2"
selection = "#eee8d5"
muted = "#93a1a1"

background = "#fdf6e3"
dark_background = "#f3ecd8"
darker_background = "#eee8d5"
lighter_background = "#eee8d5"

foreground = "#657b83"
dark_foreground = "#93a1a1"
light_foreground = "#586e75"
bright_foreground = "#073642"

red = "#dc322f"
yellow = "#b58900"
orange = "#cb4b16"
green = "#859900"
cyan = "#2aa198"
blue = "#268bd2"
magenta = "#d33682"
brown = "#66260b"

bright_red = "#cb4b16"
bright_yellow = "#b58900"
bright_green = "#859900"
bright_cyan = "#2aa198"
bright_blue = "#268bd2"
bright_magenta = "#6c71c4"

[launcher]
# base2 is the surface, so the border drops a further step; light rows want less tint.
border = "#d3cbb7"
selected = "rgba(38, 139, 210, 0.12)"
`,
  synthwave: `# SynthWave '84 — from github.com/robb0wen/synthwave-vscode (MIT); shades derived.
mode = "dark"

accent = "#ff7edb"
selection = "#495495"
muted = "#848bbd"

background = "#262335"
dark_background = "#241b2f"
darker_background = "#1a1626"
lighter_background = "#34294f"

foreground = "#f0eff1"
dark_foreground = "#848bbd"
light_foreground = "#ffffff"
bright_foreground = "#ffffff"

red = "#fe4450"
yellow = "#fede5d"
orange = "#ff8b39"
green = "#72f1b8"
cyan = "#36f9f6"
blue = "#03edf9"
magenta = "#ff7edb"

bright_red = "#fe4450"
bright_yellow = "#fede5d"
bright_green = "#72f1b8"
bright_cyan = "#36f9f6"
bright_blue = "#03edf9"
bright_magenta = "#ff7edb"
`,
  'tokyo-night': `# Tokyo Night — from Omarchy (themes/tokyo-night/colors.toml, MIT), unchanged.
mode = "dark"

accent = "#7aa2f7"
selection = "#292e42"
muted = "#414868"

background = "#1a1b26"
dark_background = "#13141c"
darker_background = "#0e0e14"
lighter_background = "#24283b"

foreground = "#a9b1d6"
dark_foreground = "#565f89"
light_foreground = "#b4bee6"
bright_foreground = "#c0caf5"

red = "#f7768e"
yellow = "#e0af68"
orange = "#eb927b"
green = "#9ece6a"
cyan = "#449dab"
blue = "#7aa2f7"
magenta = "#ad8ee6"
brown = "#75493d"

bright_red = "#ff7a93"
bright_yellow = "#ff9e64"
bright_green = "#b9f27c"
bright_cyan = "#0db9d7"
bright_blue = "#7da6ff"
bright_magenta = "#bb9af7"

[launcher]
# The launcher always used the brighter text tone and the gutter as its border.
fg = "#c0caf5"
border = "#3b4261"
`,
}

/** Template file name → template text. */
export const TEMPLATES: Record<string, string> = {
  'btop.theme.tpl': `# scuttlarr theme: {{ name }} — rendered, do not edit. Written to ~/.config/btop/themes/scuttlarr.theme;
# btop.conf carries color_theme = "scuttlarr" and a running btop reloads on SIGUSR2.
# Main background, empty for terminal default, need to be empty if you want transparent background
theme[main_bg]="{{ background }}"

# Main text color
theme[main_fg]="{{ foreground }}"

# Title color for boxes
theme[title]="{{ foreground }}"

# Highlight color for keyboard shortcuts
theme[hi_fg]="{{ accent }}"

# Background color of selected item in processes box
theme[selected_bg]="{{ selection }}"

# Foreground color of selected item in processes box
theme[selected_fg]="{{ accent }}"

# Color of inactive/disabled text
theme[inactive_fg]="{{ muted }}"

# Color of text appearing on top of graphs, i.e uptime and current network graph scaling
theme[graph_text]="{{ light_foreground }}"

# Background color of the percentage meters
theme[meter_bg]="{{ selection }}"

# Misc colors for processes box including mini cpu graphs, details memory graph and details status text
theme[proc_misc]="{{ light_foreground }}"

# CPU, Memory, Network, Proc box outline colors
theme[cpu_box]="{{ magenta }}"
theme[mem_box]="{{ green }}"
theme[net_box]="{{ red }}"
theme[proc_box]="{{ accent }}"

# Box divider line and small boxes line color
theme[div_line]="{{ muted }}"

# Temperature graph color (Green -> Yellow -> Red)
theme[temp_start]="{{ green }}"
theme[temp_mid]="{{ yellow }}"
theme[temp_end]="{{ red }}"

# CPU graph colors (Teal -> Blue -> Magenta)
theme[cpu_start]="{{ cyan }}"
theme[cpu_mid]="{{ blue }}"
theme[cpu_end]="{{ magenta }}"

# Mem/Disk free meter
theme[free_start]="{{ magenta }}"
theme[free_mid]="{{ blue }}"
theme[free_end]="{{ cyan }}"

# Mem/Disk cached meter
theme[cached_start]="{{ blue }}"
theme[cached_mid]="{{ cyan }}"
theme[cached_end]="{{ magenta }}"

# Mem/Disk available meter
theme[available_start]="{{ yellow }}"
theme[available_mid]="{{ red }}"
theme[available_end]="{{ red }}"

# Mem/Disk used meter (Green -> Teal -> Blue)
theme[used_start]="{{ green }}"
theme[used_mid]="{{ cyan }}"
theme[used_end]="{{ blue }}"

# Download graph colors
theme[download_start]="{{ yellow }}"
theme[download_mid]="{{ red }}"
theme[download_end]="{{ red }}"

# Upload graph colors (Green -> Teal -> Blue)
theme[upload_start]="{{ green }}"
theme[upload_mid]="{{ cyan }}"
theme[upload_end]="{{ blue }}"

# Process box color gradient for threads, mem and cpu usage
theme[process_start]="{{ cyan }}"
theme[process_mid]="{{ blue }}"
theme[process_end]="{{ magenta }}"

# Graph gradient colors (spectrum shades from background to foreground)
theme[gradient_color_0]="{{ background }}"
theme[gradient_color_1]="{{ lighter_background }}"
theme[gradient_color_2]="{{ selection }}"
theme[gradient_color_3]="{{ muted }}"
theme[gradient_color_4]="{{ dark_foreground }}"
theme[gradient_color_5]="{{ foreground }}"
theme[gradient_color_6]="{{ light_foreground }}"
theme[gradient_color_7]="{{ bright_foreground }}"
`,
  'claude.json.tpl': `{
  "name": "scuttlarr — {{ name }}",
  "base": "{{ mode }}",
  "overrides": {
    "claude": "{{ accent }}",
    "claudeShimmer": "{{ mix accent foreground 35% }}",
    "text": "{{ foreground }}",
    "inverseText": "{{ background }}",
    "inactive": "{{ mix foreground background 40% }}",
    "inactiveShimmer": "{{ mix foreground background 25% }}",
    "subtle": "{{ muted }}",
    "suggestion": "{{ cyan }}",
    "permission": "{{ blue }}",
    "permissionShimmer": "{{ mix blue foreground 35% }}",
    "remember": "{{ yellow }}",
    "success": "{{ green }}",
    "error": "{{ red }}",
    "warning": "{{ yellow }}",
    "warningShimmer": "{{ mix yellow foreground 35% }}",
    "merged": "{{ magenta }}",
    "promptBorder": "{{ accent }}",
    "promptBorderShimmer": "{{ mix accent foreground 35% }}",
    "planMode": "{{ cyan }}",
    "autoAccept": "{{ yellow }}",
    "bashBorder": "{{ bright_yellow }}",
    "ide": "{{ bright_cyan }}",
    "diffAdded": "{{ mix background green 15% }}",
    "diffRemoved": "{{ mix background red 15% }}",
    "diffAddedDimmed": "{{ mix background green 8% }}",
    "diffRemovedDimmed": "{{ mix background red 8% }}",
    "diffAddedWord": "{{ mix background green 32% }}",
    "diffRemovedWord": "{{ mix background red 32% }}",
    "userMessageBackground": "{{ mix background foreground 6% }}",
    "userMessageBackgroundHover": "{{ mix background foreground 10% }}",
    "bashMessageBackgroundColor": "{{ mix background foreground 6% }}",
    "memoryBackgroundColor": "{{ mix background foreground 6% }}",
    "selectionBg": "{{ selection_background }}",
    "rate_limit_fill": "{{ accent }}",
    "rate_limit_empty": "{{ mix background foreground 20% }}"
  }
}
`,
  'delta.gitconfig.tpl': `# scuttlarr theme: {{ name }} — rendered, do not edit. The base git config has
# \`[include] path = ~/.local/state/scuttlarr/current/theme/delta.gitconfig\`.
[delta]
    {{ mode }} = true
    syntax-theme = {{ bat_theme }}
    file-style = bold {{ accent }}
    file-decoration-style = {{ accent }} ul
    hunk-header-style = {{ muted }}
    hunk-header-decoration-style = {{ selection }} box
    line-numbers-left-style = {{ muted }}
    line-numbers-right-style = {{ muted }}
    line-numbers-minus-style = {{ red }}
    line-numbers-plus-style = {{ green }}
    minus-style = syntax "{{ mix background red 20% }}"
    minus-emph-style = syntax "{{ mix background red 40% }}"
    plus-style = syntax "{{ mix background green 20% }}"
    plus-emph-style = syntax "{{ mix background green 40% }}"
`,
  'ghostty.tpl': `# scuttlarr theme: {{ name }} — rendered, do not edit. Imported by the base
# Ghostty config via \`config-file = ?~/.local/state/scuttlarr/current/theme/ghostty\`.
background = {{ background }}
foreground = {{ foreground }}
cursor-color = {{ bright_foreground }}
selection-background = {{ selection_background }}
selection-foreground = {{ selection_foreground }}

palette = 0={{ background }}
palette = 1={{ red }}
palette = 2={{ green }}
palette = 3={{ yellow }}
palette = 4={{ blue }}
palette = 5={{ magenta }}
palette = 6={{ cyan }}
palette = 7={{ foreground }}
palette = 8={{ muted }}
palette = 9={{ bright_red }}
palette = 10={{ bright_green }}
palette = 11={{ bright_yellow }}
palette = 12={{ bright_blue }}
palette = 13={{ bright_magenta }}
palette = 14={{ bright_cyan }}
palette = 15={{ bright_foreground }}
`,
  'neovim.lua.tpl': `-- scuttlarr theme: {{ name }} — rendered, do not edit. A LazyVim spec: add
-- dofile(vim.fn.expand("~/.local/state/scuttlarr/current/theme/neovim.lua")) to your
-- lazy specs; running instances get \`:colorscheme\` over --remote-send at theme set.
return {
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "{{ neovim_colorscheme }}",
    },
  },
}
`,
  'p10k-colors.zsh.tpl': `# scuttlarr theme: {{ name }} — rendered, do not edit. Sourced by the base .p10k.zsh
# before its segment styling, so a lean p10k config can say \`$accent\` / \`$comment\`
# and retint with the theme on the next prompt.
local background='{{ background }}'
local foreground='{{ foreground }}'
local comment='{{ muted }}'
local accent='{{ accent }}'
local host='{{ accent }}'
local red='{{ red }}'
local orange='{{ orange }}'
local yellow='{{ yellow }}'
local green='{{ green }}'
local cyan='{{ cyan }}'
local blue='{{ blue }}'
local purple='{{ magenta }}'
local pink='{{ bright_magenta }}'
`,
  'tmux.conf.tpl': `# scuttlarr theme: {{ name }} — rendered, do not edit. The base tmux.conf ends with
# \`source-file -q ~/.local/state/scuttlarr/current/theme/tmux.conf\`; \`theme set\`
# also pushes OSC colours into every running pane, so this only has to style tmux.
set -g status-style "bg={{ background }},fg={{ foreground }}"
set -g status-left "#[fg={{ background }},bg={{ accent }},bold] #S #[fg={{ accent }},bg={{ background }}] "
set -g status-right "#{?client_prefix,#[fg={{ background }},bg={{ yellow }},bold] PREFIX #[fg={{ yellow }},bg={{ background }}] ,}#[fg={{ muted }}]%H:%M "
set -g window-status-separator ""
set -g window-status-format "#[fg={{ muted }},bg={{ background }}] #I:#W "
set -g window-status-current-format "#[fg={{ background }},bg={{ magenta }},bold] #I:#W #[fg={{ magenta }},bg={{ background }}]"
set -g pane-border-style "fg={{ selection }}"
set -g pane-active-border-style "fg={{ accent }}"
set -g message-style "bg={{ selection }},fg={{ foreground }}"
set -g mode-style "bg={{ accent }},fg={{ background }}"
set -g window-style "fg={{ foreground }},bg={{ background }}"
set -g window-active-style "fg={{ foreground }},bg={{ background }}"
`,
  'vscode-theme.json.tpl': `{
    "name": "scuttlarr — {{ name }}",
    "$schema": "vscode://schemas/color-theme",
    "type": "{{ mode }}",
    "semanticHighlighting": true,
    "semanticTokenColors": {
        "parameter": "{{ cyan }}",
        "parameter.declaration": "{{ cyan }}",
        "variable": "{{ foreground }}",
        "variable.declaration": "{{ foreground }}",
        "variable.readonly": "{{ bright_yellow }}",
        "variable.defaultLibrary": "{{ foreground }}",
        "property": "{{ cyan }}",
        "property.declaration": "{{ cyan }}",
        "property.readonly": "{{ cyan }}",
        "function": "{{ blue }}",
        "function.declaration": "{{ blue }}",
        "function.defaultLibrary": "{{ cyan }}",
        "method": "{{ blue }}",
        "method.declaration": "{{ blue }}",
        "class": "{{ yellow }}",
        "class.declaration": "{{ yellow }}",
        "class.defaultLibrary": "{{ yellow }}",
        "interface": "{{ yellow }}",
        "interface.declaration": "{{ yellow }}",
        "enum": "{{ yellow }}",
        "enumMember": "{{ orange }}",
        "type": "{{ yellow }}",
        "type.declaration": "{{ yellow }}",
        "type.defaultLibrary": "{{ foreground }}",
        "typeParameter": "{{ yellow }}",
        "namespace": "{{ blue }}",
        "macro": "{{ cyan }}",
        "decorator": "{{ blue }}",
        "string": "{{ green }}",
        "number": "{{ orange }}",
        "boolean": "{{ orange }}",
        "regexp": "{{ bright_cyan }}",
        "operator": "{{ bright_blue }}",
        "keyword": "{{ bright_magenta }}",
        "comment": {"foreground": "{{ muted }}", "fontStyle": "italic"},
        "comment.documentation": {"foreground": "{{ muted }}", "fontStyle": "italic"}
    },
    "colors": {
        "foreground": "{{ foreground }}",
        "disabledForeground": "{{ dark_foreground }}",
        "focusBorder": "{{ accent }}80",
        "widget.shadow": "{{ background }}80",
        "selection.background": "{{ selection_background }}80",
        "descriptionForeground": "{{ muted }}",
        "errorForeground": "{{ red }}",
        "icon.foreground": "{{ foreground }}",
        "sash.hoverBorder": "{{ accent }}",

        "textBlockQuote.background": "{{ background }}",
        "textBlockQuote.border": "{{ accent }}",
        "textCodeBlock.background": "{{ background }}",
        "textLink.activeForeground": "{{ bright_blue }}",
        "textLink.foreground": "{{ blue }}",
        "textPreformat.foreground": "{{ cyan }}",
        "textPreformat.background": "{{ background }}",
        "textSeparator.foreground": "{{ muted }}",

        "toolbar.hoverBackground": "{{ background }}",
        "toolbar.activeBackground": "{{ muted }}",

        "button.background": "{{ accent }}",
        "button.foreground": "{{ background }}",
        "button.hoverBackground": "{{ blue }}",
        "button.secondaryForeground": "{{ foreground }}",
        "button.secondaryBackground": "{{ muted }}",
        "button.secondaryHoverBackground": "{{ background }}",
        "button.border": "{{ accent }}20",
        "checkbox.background": "{{ background }}",
        "checkbox.foreground": "{{ foreground }}",
        "checkbox.border": "{{ muted }}",
        "checkbox.selectBackground": "{{ accent }}",
        "checkbox.selectBorder": "{{ accent }}",

        "dropdown.background": "{{ background }}",
        "dropdown.listBackground": "{{ background }}",
        "dropdown.border": "{{ muted }}",
        "dropdown.foreground": "{{ foreground }}",

        "input.background": "{{ background }}",
        "input.border": "{{ muted }}",
        "input.foreground": "{{ foreground }}",
        "input.placeholderForeground": "{{ muted }}",
        "inputOption.activeBackground": "{{ accent }}40",
        "inputOption.activeBorder": "{{ accent }}",
        "inputOption.activeForeground": "{{ foreground }}",
        "inputOption.hoverBackground": "{{ muted }}",
        "inputValidation.errorBackground": "{{ red }}20",
        "inputValidation.errorForeground": "{{ red }}",
        "inputValidation.errorBorder": "{{ red }}",
        "inputValidation.infoBackground": "{{ blue }}20",
        "inputValidation.infoForeground": "{{ blue }}",
        "inputValidation.infoBorder": "{{ blue }}",
        "inputValidation.warningBackground": "{{ yellow }}20",
        "inputValidation.warningForeground": "{{ yellow }}",
        "inputValidation.warningBorder": "{{ yellow }}",

        "scrollbar.shadow": "{{ background }}",
        "scrollbarSlider.activeBackground": "{{ accent }}80",
        "scrollbarSlider.background": "{{ muted }}40",
        "scrollbarSlider.hoverBackground": "{{ muted }}80",

        "badge.background": "{{ accent }}",
        "badge.foreground": "{{ background }}",

        "progressBar.background": "{{ accent }}",

        "list.activeSelectionBackground": "{{ accent }}30",
        "list.activeSelectionForeground": "{{ foreground }}",
        "list.activeSelectionIconForeground": "{{ foreground }}",
        "list.dropBackground": "{{ accent }}20",
        "list.focusBackground": "{{ accent }}20",
        "list.focusForeground": "{{ foreground }}",
        "list.focusOutline": "{{ accent }}60",
        "list.highlightForeground": "{{ accent }}",
        "list.hoverBackground": "{{ background }}",
        "list.hoverForeground": "{{ foreground }}",
        "list.inactiveSelectionBackground": "{{ muted }}40",
        "list.inactiveSelectionForeground": "{{ foreground }}",
        "list.inactiveFocusBackground": "{{ muted }}40",
        "list.inactiveFocusOutline": "{{ muted }}",
        "list.invalidItemForeground": "{{ red }}",
        "list.errorForeground": "{{ red }}",
        "list.warningForeground": "{{ yellow }}",
        "listFilterWidget.background": "{{ background }}",
        "listFilterWidget.outline": "{{ accent }}",
        "listFilterWidget.noMatchesOutline": "{{ red }}",
        "list.filterMatchBackground": "{{ accent }}30",
        "list.filterMatchBorder": "{{ accent }}",
        "tree.indentGuidesStroke": "{{ muted }}",
        "tree.inactiveIndentGuidesStroke": "{{ muted }}60",
        "tree.tableColumnsBorder": "{{ muted }}",
        "tree.tableOddRowsBackground": "{{ background }}40",

        "activityBar.background": "{{ background }}",
        "activityBar.dropBorder": "{{ accent }}",
        "activityBar.foreground": "{{ foreground }}",
        "activityBar.inactiveForeground": "{{ muted }}",
        "activityBar.border": "{{ background }}",
        "activityBarBadge.background": "{{ accent }}",
        "activityBarBadge.foreground": "{{ background }}",
        "activityBar.activeBorder": "{{ accent }}",
        "activityBar.activeBackground": "{{ background }}40",

        "sideBar.background": "{{ background }}",
        "sideBar.foreground": "{{ foreground }}",
        "sideBar.border": "{{ background }}",
        "sideBar.dropBackground": "{{ accent }}20",
        "sideBarTitle.foreground": "{{ foreground }}",
        "sideBarSectionHeader.background": "{{ background }}",
        "sideBarSectionHeader.foreground": "{{ foreground }}",
        "sideBarSectionHeader.border": "{{ muted }}40",

        "minimap.findMatchHighlight": "{{ accent }}80",
        "minimap.selectionHighlight": "{{ accent }}60",
        "minimap.errorHighlight": "{{ red }}",
        "minimap.warningHighlight": "{{ yellow }}",
        "minimap.background": "{{ background }}",
        "minimap.selectionOccurrenceHighlight": "{{ accent }}40",
        "minimap.foregroundOpacity": "{{ background }}c0",
        "minimapSlider.background": "{{ muted }}20",
        "minimapSlider.hoverBackground": "{{ muted }}40",
        "minimapSlider.activeBackground": "{{ muted }}60",
        "minimapGutter.addedBackground": "{{ green }}",
        "minimapGutter.modifiedBackground": "{{ orange }}",
        "minimapGutter.deletedBackground": "{{ red }}",

        "editorGroup.border": "{{ muted }}40",
        "editorGroup.dropBackground": "{{ accent }}20",
        "editorGroup.dropIntoPromptForeground": "{{ foreground }}",
        "editorGroup.dropIntoPromptBackground": "{{ background }}",
        "editorGroup.dropIntoPromptBorder": "{{ accent }}",
        "editorGroupHeader.noTabsBackground": "{{ background }}",
        "editorGroupHeader.tabsBackground": "{{ background }}",
        "editorGroupHeader.tabsBorder": "{{ background }}",
        "editorGroupHeader.border": "{{ background }}",
        "editorGroup.emptyBackground": "{{ background }}",
        "tab.activeBackground": "{{ background }}",
        "tab.unfocusedActiveBackground": "{{ background }}",
        "tab.activeForeground": "{{ foreground }}",
        "tab.activeBorder": "{{ accent }}",
        "tab.activeBorderTop": "{{ accent }}",
        "tab.unfocusedActiveBorder": "{{ muted }}",
        "tab.unfocusedActiveBorderTop": "{{ muted }}",
        "tab.border": "{{ background }}",
        "tab.inactiveBackground": "{{ background }}",
        "tab.inactiveForeground": "{{ muted }}",
        "tab.unfocusedActiveForeground": "{{ foreground }}",
        "tab.unfocusedInactiveForeground": "{{ muted }}",
        "tab.hoverBackground": "{{ muted }}40",
        "tab.unfocusedHoverBackground": "{{ muted }}40",
        "tab.hoverForeground": "{{ foreground }}",
        "tab.hoverBorder": "{{ accent }}40",
        "tab.activeModifiedBorder": "{{ yellow }}",
        "tab.inactiveModifiedBorder": "{{ yellow }}80",
        "tab.unfocusedActiveModifiedBorder": "{{ yellow }}80",
        "tab.unfocusedInactiveModifiedBorder": "{{ yellow }}60",
        "tab.lastPinnedBorder": "{{ muted }}",
        "editorPane.background": "{{ background }}",

        "editor.background": "{{ background }}",
        "editor.foreground": "{{ foreground }}",
        "editorLineNumber.foreground": "{{ muted }}",
        "editorLineNumber.activeForeground": "{{ foreground }}",
        "editorLineNumber.dimmedForeground": "{{ muted }}80",
        "editorCursor.background": "{{ background }}",
        "editorCursor.foreground": "{{ bright_foreground }}",
        "editor.selectionBackground": "{{ selection_background }}60",
        "editor.selectionForeground": "{{ selection_foreground }}",
        "editor.inactiveSelectionBackground": "{{ selection_background }}30",
        "editor.selectionHighlightBackground": "{{ accent }}20",
        "editor.selectionHighlightBorder": "{{ accent }}40",
        "editor.wordHighlightBackground": "{{ accent }}20",
        "editor.wordHighlightBorder": "{{ accent }}40",
        "editor.wordHighlightStrongBackground": "{{ accent }}30",
        "editor.wordHighlightStrongBorder": "{{ accent }}60",
        "editor.wordHighlightTextBackground": "{{ accent }}15",
        "editor.wordHighlightTextBorder": "{{ accent }}30",
        "editor.findMatchBackground": "{{ yellow }}40",
        "editor.findMatchBorder": "{{ yellow }}",
        "editor.findMatchHighlightBackground": "{{ yellow }}25",
        "editor.findMatchHighlightBorder": "{{ yellow }}60",
        "editor.findRangeHighlightBackground": "{{ accent }}15",
        "editor.findRangeHighlightBorder": "{{ accent }}30",
        "searchEditor.findMatchBackground": "{{ yellow }}40",
        "searchEditor.findMatchBorder": "{{ yellow }}",
        "editor.hoverHighlightBackground": "{{ accent }}20",
        "editor.lineHighlightBackground": "{{ background }}60",
        "editor.lineHighlightBorder": "{{ background }}00",
        "editorLink.activeForeground": "{{ blue }}",
        "editor.rangeHighlightBackground": "{{ accent }}10",
        "editor.rangeHighlightBorder": "{{ accent }}20",
        "editor.symbolHighlightBackground": "{{ accent }}20",
        "editor.symbolHighlightBorder": "{{ accent }}40",
        "editorWhitespace.foreground": "{{ muted }}60",
        "editorIndentGuide.background1": "{{ muted }}30",
        "editorIndentGuide.background2": "{{ muted }}30",
        "editorIndentGuide.background3": "{{ muted }}30",
        "editorIndentGuide.background4": "{{ muted }}30",
        "editorIndentGuide.background5": "{{ muted }}30",
        "editorIndentGuide.background6": "{{ muted }}30",
        "editorIndentGuide.activeBackground1": "{{ muted }}80",
        "editorIndentGuide.activeBackground2": "{{ muted }}80",
        "editorIndentGuide.activeBackground3": "{{ muted }}80",
        "editorIndentGuide.activeBackground4": "{{ muted }}80",
        "editorIndentGuide.activeBackground5": "{{ muted }}80",
        "editorIndentGuide.activeBackground6": "{{ muted }}80",
        "editorInlayHint.background": "{{ muted }}30",
        "editorInlayHint.foreground": "{{ muted }}",
        "editorInlayHint.typeBackground": "{{ yellow }}15",
        "editorInlayHint.typeForeground": "{{ yellow }}",
        "editorInlayHint.parameterBackground": "{{ bright_magenta }}15",
        "editorInlayHint.parameterForeground": "{{ bright_magenta }}",
        "editorRuler.foreground": "{{ muted }}40",
        "editorCodeLens.foreground": "{{ muted }}",
        "editorLightBulb.foreground": "{{ yellow }}",
        "editorLightBulbAutoFix.foreground": "{{ green }}",
        "editorLightBulbAi.foreground": "{{ magenta }}",
        "editorBracketMatch.background": "{{ accent }}30",
        "editorBracketMatch.border": "{{ accent }}",
        "editorBracketHighlight.foreground1": "{{ blue }}",
        "editorBracketHighlight.foreground2": "{{ yellow }}",
        "editorBracketHighlight.foreground3": "{{ green }}",
        "editorBracketHighlight.foreground4": "{{ cyan }}",
        "editorBracketHighlight.foreground5": "{{ magenta }}",
        "editorBracketHighlight.foreground6": "{{ orange }}",
        "editorBracketHighlight.unexpectedBracket.foreground": "{{ red }}",
        "editorBracketPairGuide.activeBackground1": "{{ blue }}60",
        "editorBracketPairGuide.activeBackground2": "{{ yellow }}60",
        "editorBracketPairGuide.activeBackground3": "{{ green }}60",
        "editorBracketPairGuide.activeBackground4": "{{ cyan }}60",
        "editorBracketPairGuide.activeBackground5": "{{ magenta }}60",
        "editorBracketPairGuide.activeBackground6": "{{ orange }}60",
        "editorBracketPairGuide.background1": "{{ blue }}30",
        "editorBracketPairGuide.background2": "{{ yellow }}30",
        "editorBracketPairGuide.background3": "{{ green }}30",
        "editorBracketPairGuide.background4": "{{ cyan }}30",
        "editorBracketPairGuide.background5": "{{ magenta }}30",
        "editorBracketPairGuide.background6": "{{ orange }}30",
        "editorOverviewRuler.background": "{{ background }}",
        "editorOverviewRuler.border": "{{ muted }}20",
        "editorOverviewRuler.findMatchForeground": "{{ yellow }}80",
        "editorOverviewRuler.rangeHighlightForeground": "{{ accent }}60",
        "editorOverviewRuler.selectionHighlightForeground": "{{ accent }}80",
        "editorOverviewRuler.wordHighlightForeground": "{{ accent }}60",
        "editorOverviewRuler.wordHighlightStrongForeground": "{{ accent }}80",
        "editorOverviewRuler.wordHighlightTextForeground": "{{ accent }}40",
        "editorOverviewRuler.modifiedForeground": "{{ orange }}80",
        "editorOverviewRuler.addedForeground": "{{ green }}80",
        "editorOverviewRuler.deletedForeground": "{{ red }}80",
        "editorOverviewRuler.errorForeground": "{{ red }}",
        "editorOverviewRuler.warningForeground": "{{ yellow }}",
        "editorOverviewRuler.infoForeground": "{{ blue }}",
        "editorOverviewRuler.bracketMatchForeground": "{{ accent }}",
        "editorError.foreground": "{{ red }}",
        "editorError.background": "{{ red }}15",
        "editorError.border": "{{ red }}00",
        "editorWarning.foreground": "{{ yellow }}",
        "editorWarning.background": "{{ yellow }}15",
        "editorWarning.border": "{{ yellow }}00",
        "editorInfo.foreground": "{{ blue }}",
        "editorInfo.background": "{{ blue }}15",
        "editorInfo.border": "{{ blue }}00",
        "editorHint.foreground": "{{ cyan }}",
        "editorHint.border": "{{ cyan }}00",
        "problemsErrorIcon.foreground": "{{ red }}",
        "problemsWarningIcon.foreground": "{{ yellow }}",
        "problemsInfoIcon.foreground": "{{ blue }}",
        "editorUnnecessaryCode.opacity": "{{ background }}80",
        "editorUnnecessaryCode.border": "{{ muted }}",
        "editorGutter.background": "{{ background }}",
        "editorGutter.modifiedBackground": "{{ orange }}",
        "editorGutter.addedBackground": "{{ green }}",
        "editorGutter.deletedBackground": "{{ red }}",
        "editorGutter.commentRangeForeground": "{{ muted }}",
        "editorGutter.commentGlyphForeground": "{{ accent }}",
        "editorGutter.commentUnresolvedGlyphForeground": "{{ yellow }}",
        "editorGutter.foldingControlForeground": "{{ muted }}",
        "editorCommentsWidget.resolvedBorder": "{{ green }}",
        "editorCommentsWidget.unresolvedBorder": "{{ yellow }}",
        "editorCommentsWidget.rangeBackground": "{{ accent }}10",
        "editorCommentsWidget.rangeActiveBackground": "{{ accent }}20",

        "diffEditor.insertedTextBackground": "{{ green }}20",
        "diffEditor.insertedTextBorder": "{{ green }}00",
        "diffEditor.removedTextBackground": "{{ red }}20",
        "diffEditor.removedTextBorder": "{{ red }}00",
        "diffEditor.insertedLineBackground": "{{ green }}15",
        "diffEditor.removedLineBackground": "{{ red }}15",
        "diffEditorGutter.insertedLineBackground": "{{ green }}30",
        "diffEditorGutter.removedLineBackground": "{{ red }}30",
        "diffEditorOverview.insertedForeground": "{{ green }}80",
        "diffEditorOverview.removedForeground": "{{ red }}80",
        "diffEditor.diagonalFill": "{{ muted }}30",
        "diffEditor.unchangedRegionBackground": "{{ background }}",
        "diffEditor.unchangedRegionForeground": "{{ muted }}",
        "diffEditor.unchangedCodeBackground": "{{ background }}40",
        "diffEditor.move.border": "{{ cyan }}80",
        "diffEditor.moveActive.border": "{{ cyan }}",

        "editorWidget.foreground": "{{ foreground }}",
        "editorWidget.background": "{{ background }}",
        "editorWidget.border": "{{ muted }}",
        "editorWidget.resizeBorder": "{{ accent }}",
        "editorSuggestWidget.background": "{{ background }}",
        "editorSuggestWidget.border": "{{ muted }}",
        "editorSuggestWidget.foreground": "{{ foreground }}",
        "editorSuggestWidget.focusHighlightForeground": "{{ accent }}",
        "editorSuggestWidget.highlightForeground": "{{ accent }}",
        "editorSuggestWidget.selectedBackground": "{{ accent }}30",
        "editorSuggestWidget.selectedForeground": "{{ foreground }}",
        "editorSuggestWidget.selectedIconForeground": "{{ foreground }}",
        "editorSuggestWidgetStatus.foreground": "{{ muted }}",
        "editorHoverWidget.foreground": "{{ foreground }}",
        "editorHoverWidget.background": "{{ background }}",
        "editorHoverWidget.border": "{{ muted }}",
        "editorHoverWidget.highlightForeground": "{{ accent }}",
        "editorHoverWidget.statusBarBackground": "{{ muted }}30",
        "editorGhostText.foreground": "{{ muted }}",
        "editorGhostText.background": "{{ muted }}10",
        "editorGhostText.border": "{{ muted }}00",
        "editorStickyScroll.background": "{{ background }}",
        "editorStickyScrollHover.background": "{{ muted }}40",
        "debugExceptionWidget.background": "{{ red }}20",
        "debugExceptionWidget.border": "{{ red }}",
        "editorMarkerNavigation.background": "{{ background }}",
        "editorMarkerNavigationError.background": "{{ red }}20",
        "editorMarkerNavigationError.headerBackground": "{{ red }}15",
        "editorMarkerNavigationWarning.background": "{{ yellow }}20",
        "editorMarkerNavigationWarning.headerBackground": "{{ yellow }}15",
        "editorMarkerNavigationInfo.background": "{{ blue }}20",
        "editorMarkerNavigationInfo.headerBackground": "{{ blue }}15",

        "peekView.border": "{{ accent }}",
        "peekViewEditor.background": "{{ background }}",
        "peekViewEditorGutter.background": "{{ background }}",
        "peekViewEditor.matchHighlightBackground": "{{ yellow }}30",
        "peekViewEditor.matchHighlightBorder": "{{ yellow }}",
        "peekViewResult.background": "{{ background }}",
        "peekViewResult.fileForeground": "{{ foreground }}",
        "peekViewResult.lineForeground": "{{ muted }}",
        "peekViewResult.matchHighlightBackground": "{{ yellow }}30",
        "peekViewResult.selectionBackground": "{{ accent }}30",
        "peekViewResult.selectionForeground": "{{ foreground }}",
        "peekViewTitle.background": "{{ background }}",
        "peekViewTitleDescription.foreground": "{{ muted }}",
        "peekViewTitleLabel.foreground": "{{ foreground }}",

        "merge.currentContentBackground": "{{ cyan }}20",
        "merge.currentHeaderBackground": "{{ cyan }}40",
        "merge.incomingContentBackground": "{{ green }}20",
        "merge.incomingHeaderBackground": "{{ green }}40",
        "merge.commonContentBackground": "{{ muted }}20",
        "merge.commonHeaderBackground": "{{ muted }}40",
        "merge.border": "{{ muted }}",
        "editorOverviewRuler.currentContentForeground": "{{ cyan }}",
        "editorOverviewRuler.incomingContentForeground": "{{ green }}",
        "editorOverviewRuler.commonContentForeground": "{{ muted }}",
        "mergeEditor.change.background": "{{ accent }}15",
        "mergeEditor.change.word.background": "{{ accent }}30",
        "mergeEditor.conflict.handledUnfocused.border": "{{ green }}80",
        "mergeEditor.conflict.handled.minimapOverViewRuler": "{{ green }}",
        "mergeEditor.conflict.unhandledUnfocused.border": "{{ yellow }}80",
        "mergeEditor.conflict.unhandled.minimapOverViewRuler": "{{ yellow }}",
        "mergeEditor.conflictingLines.background": "{{ yellow }}15",
        "mergeEditor.changeBase.background": "{{ muted }}20",
        "mergeEditor.changeBase.word.background": "{{ muted }}40",

        "panel.background": "{{ background }}",
        "panel.border": "{{ muted }}40",
        "panel.dropBorder": "{{ accent }}",
        "panelTitle.activeBorder": "{{ accent }}",
        "panelTitle.activeForeground": "{{ foreground }}",
        "panelTitle.inactiveForeground": "{{ muted }}",
        "panelInput.border": "{{ muted }}",
        "panelSection.border": "{{ muted }}40",
        "panelSection.dropBackground": "{{ accent }}20",
        "panelSectionHeader.background": "{{ background }}",
        "panelSectionHeader.foreground": "{{ foreground }}",
        "panelSectionHeader.border": "{{ muted }}40",

        "outputView.background": "{{ background }}",
        "outputViewStickyScroll.background": "{{ background }}",

        "statusBar.background": "{{ background }}",
        "statusBar.foreground": "{{ foreground }}",
        "statusBar.border": "{{ background }}",
        "statusBar.debuggingBackground": "{{ yellow }}",
        "statusBar.debuggingForeground": "{{ background }}",
        "statusBar.debuggingBorder": "{{ yellow }}",
        "statusBar.noFolderBackground": "{{ background }}",
        "statusBar.noFolderForeground": "{{ foreground }}",
        "statusBar.noFolderBorder": "{{ background }}",
        "statusBar.focusBorder": "{{ accent }}",
        "statusBarItem.activeBackground": "{{ muted }}",
        "statusBarItem.hoverBackground": "{{ muted }}60",
        "statusBarItem.hoverForeground": "{{ foreground }}",
        "statusBarItem.prominentForeground": "{{ foreground }}",
        "statusBarItem.prominentBackground": "{{ accent }}",
        "statusBarItem.prominentHoverBackground": "{{ accent }}80",
        "statusBarItem.remoteBackground": "{{ accent }}",
        "statusBarItem.remoteForeground": "{{ background }}",
        "statusBarItem.remoteHoverBackground": "{{ accent }}80",
        "statusBarItem.errorBackground": "{{ red }}",
        "statusBarItem.errorForeground": "{{ background }}",
        "statusBarItem.errorHoverBackground": "{{ red }}80",
        "statusBarItem.warningBackground": "{{ yellow }}",
        "statusBarItem.warningForeground": "{{ background }}",
        "statusBarItem.warningHoverBackground": "{{ yellow }}80",
        "statusBarItem.compactHoverBackground": "{{ muted }}",
        "statusBarItem.focusBorder": "{{ accent }}",

        "titleBar.activeBackground": "{{ background }}",
        "titleBar.activeForeground": "{{ foreground }}",
        "titleBar.inactiveBackground": "{{ background }}",
        "titleBar.inactiveForeground": "{{ muted }}",
        "titleBar.border": "{{ background }}",

        "menubar.selectionForeground": "{{ foreground }}",
        "menubar.selectionBackground": "{{ accent }}30",
        "menubar.selectionBorder": "{{ accent }}00",
        "menu.foreground": "{{ foreground }}",
        "menu.background": "{{ background }}",
        "menu.selectionForeground": "{{ foreground }}",
        "menu.selectionBackground": "{{ accent }}30",
        "menu.selectionBorder": "{{ accent }}00",
        "menu.separatorBackground": "{{ muted }}",
        "menu.border": "{{ muted }}",

        "commandCenter.foreground": "{{ foreground }}",
        "commandCenter.activeForeground": "{{ foreground }}",
        "commandCenter.background": "{{ background }}",
        "commandCenter.activeBackground": "{{ muted }}",
        "commandCenter.border": "{{ muted }}",
        "commandCenter.inactiveForeground": "{{ muted }}",
        "commandCenter.inactiveBorder": "{{ muted }}",
        "commandCenter.activeBorder": "{{ accent }}",
        "commandCenter.debuggingBackground": "{{ yellow }}20",

        "notificationCenter.border": "{{ muted }}",
        "notificationCenterHeader.foreground": "{{ foreground }}",
        "notificationCenterHeader.background": "{{ background }}",
        "notificationToast.border": "{{ muted }}",
        "notifications.foreground": "{{ foreground }}",
        "notifications.background": "{{ background }}",
        "notifications.border": "{{ muted }}",
        "notificationLink.foreground": "{{ accent }}",
        "notificationsErrorIcon.foreground": "{{ red }}",
        "notificationsWarningIcon.foreground": "{{ yellow }}",
        "notificationsInfoIcon.foreground": "{{ blue }}",

        "banner.background": "{{ accent }}20",
        "banner.foreground": "{{ foreground }}",
        "banner.iconForeground": "{{ accent }}",

        "extensionButton.prominentBackground": "{{ accent }}",
        "extensionButton.prominentForeground": "{{ background }}",
        "extensionButton.prominentHoverBackground": "{{ accent }}80",
        "extensionButton.background": "{{ muted }}",
        "extensionButton.foreground": "{{ foreground }}",
        "extensionButton.hoverBackground": "{{ muted }}80",
        "extensionButton.separator": "{{ background }}",
        "extensionBadge.remoteBackground": "{{ accent }}",
        "extensionBadge.remoteForeground": "{{ background }}",
        "extensionIcon.starForeground": "{{ yellow }}",
        "extensionIcon.verifiedForeground": "{{ cyan }}",
        "extensionIcon.preReleaseForeground": "{{ yellow }}",
        "extensionIcon.sponsorForeground": "{{ magenta }}",

        "pickerGroup.border": "{{ muted }}",
        "pickerGroup.foreground": "{{ accent }}",
        "quickInput.background": "{{ background }}",
        "quickInput.foreground": "{{ foreground }}",
        "quickInputList.focusBackground": "{{ accent }}30",
        "quickInputList.focusForeground": "{{ foreground }}",
        "quickInputList.focusIconForeground": "{{ foreground }}",
        "quickInputTitle.background": "{{ background }}",

        "keybindingLabel.background": "{{ muted }}40",
        "keybindingLabel.foreground": "{{ foreground }}",
        "keybindingLabel.border": "{{ muted }}",
        "keybindingLabel.bottomBorder": "{{ muted }}",
        "keybindingTable.headerBackground": "{{ background }}",
        "keybindingTable.rowsBackground": "{{ background }}40",

        "terminal.background": "{{ background }}",
        "terminal.foreground": "{{ foreground }}",
        "terminal.border": "{{ muted }}40",
        "terminal.selectionBackground": "{{ selection_background }}60",
        "terminal.selectionForeground": "{{ selection_foreground }}",
        "terminal.inactiveSelectionBackground": "{{ selection_background }}30",
        "terminal.findMatchBackground": "{{ yellow }}40",
        "terminal.findMatchBorder": "{{ yellow }}",
        "terminal.findMatchHighlightBackground": "{{ yellow }}25",
        "terminal.findMatchHighlightBorder": "{{ yellow }}60",
        "terminal.hoverHighlightBackground": "{{ accent }}20",
        "terminalCursor.background": "{{ background }}",
        "terminalCursor.foreground": "{{ bright_foreground }}",
        "terminal.ansiBlack": "{{ background }}",
        "terminal.ansiRed": "{{ red }}",
        "terminal.ansiGreen": "{{ green }}",
        "terminal.ansiYellow": "{{ yellow }}",
        "terminal.ansiBlue": "{{ blue }}",
        "terminal.ansiMagenta": "{{ magenta }}",
        "terminal.ansiCyan": "{{ cyan }}",
        "terminal.ansiWhite": "{{ foreground }}",
        "terminal.ansiBrightBlack": "{{ muted }}",
        "terminal.ansiBrightRed": "{{ bright_red }}",
        "terminal.ansiBrightGreen": "{{ bright_green }}",
        "terminal.ansiBrightYellow": "{{ bright_yellow }}",
        "terminal.ansiBrightBlue": "{{ bright_blue }}",
        "terminal.ansiBrightMagenta": "{{ bright_magenta }}",
        "terminal.ansiBrightCyan": "{{ bright_cyan }}",
        "terminal.ansiBrightWhite": "{{ bright_foreground }}",
        "terminal.tab.activeBorder": "{{ accent }}",
        "terminalCommandDecoration.defaultBackground": "{{ muted }}",
        "terminalCommandDecoration.successBackground": "{{ green }}",
        "terminalCommandDecoration.errorBackground": "{{ red }}",
        "terminalOverviewRuler.cursorForeground": "{{ bright_foreground }}",
        "terminalOverviewRuler.findMatchForeground": "{{ yellow }}",
        "terminalStickyScroll.background": "{{ background }}",
        "terminalStickyScrollHover.background": "{{ muted }}40",

        "debugToolBar.background": "{{ background }}",
        "debugToolBar.border": "{{ muted }}",
        "debugView.stateLabelForeground": "{{ foreground }}",
        "debugView.stateLabelBackground": "{{ accent }}30",
        "debugView.valueChangedHighlight": "{{ cyan }}40",
        "debugView.exceptionLabelForeground": "{{ background }}",
        "debugView.exceptionLabelBackground": "{{ red }}",
        "debugTokenExpression.name": "{{ magenta }}",
        "debugTokenExpression.value": "{{ foreground }}",
        "debugTokenExpression.string": "{{ green }}",
        "debugTokenExpression.boolean": "{{ orange }}",
        "debugTokenExpression.number": "{{ orange }}",
        "debugTokenExpression.error": "{{ red }}",

        "testing.iconFailed": "{{ red }}",
        "testing.iconErrored": "{{ red }}",
        "testing.iconPassed": "{{ green }}",
        "testing.runAction": "{{ green }}",
        "testing.iconQueued": "{{ yellow }}",
        "testing.iconUnset": "{{ muted }}",
        "testing.iconSkipped": "{{ yellow }}",
        "testing.peekBorder": "{{ accent }}",
        "testing.peekHeaderBackground": "{{ background }}",
        "testing.message.error.decorationForeground": "{{ red }}",
        "testing.message.error.lineBackground": "{{ red }}15",
        "testing.message.info.decorationForeground": "{{ blue }}",
        "testing.message.info.lineBackground": "{{ blue }}15",

        "welcomePage.background": "{{ background }}",
        "welcomePage.tileBackground": "{{ background }}",
        "welcomePage.tileHoverBackground": "{{ muted }}40",
        "welcomePage.tileBorder": "{{ muted }}",
        "welcomePage.progress.background": "{{ muted }}",
        "welcomePage.progress.foreground": "{{ accent }}",
        "walkThrough.embeddedEditorBackground": "{{ background }}",
        "walkthrough.stepTitle.foreground": "{{ foreground }}",

        "gitDecoration.addedResourceForeground": "{{ green }}",
        "gitDecoration.modifiedResourceForeground": "{{ orange }}",
        "gitDecoration.deletedResourceForeground": "{{ red }}",
        "gitDecoration.renamedResourceForeground": "{{ cyan }}",
        "gitDecoration.stageModifiedResourceForeground": "{{ orange }}",
        "gitDecoration.stageDeletedResourceForeground": "{{ red }}",
        "gitDecoration.untrackedResourceForeground": "{{ green }}",
        "gitDecoration.ignoredResourceForeground": "{{ muted }}",
        "gitDecoration.conflictingResourceForeground": "{{ yellow }}",
        "gitDecoration.submoduleResourceForeground": "{{ magenta }}",

        "settings.headerForeground": "{{ foreground }}",
        "settings.modifiedItemIndicator": "{{ accent }}",
        "settings.dropdownBackground": "{{ background }}",
        "settings.dropdownForeground": "{{ foreground }}",
        "settings.dropdownBorder": "{{ muted }}",
        "settings.dropdownListBorder": "{{ muted }}",
        "settings.checkboxBackground": "{{ background }}",
        "settings.checkboxForeground": "{{ foreground }}",
        "settings.checkboxBorder": "{{ muted }}",
        "settings.rowHoverBackground": "{{ background }}",
        "settings.textInputBackground": "{{ background }}",
        "settings.textInputForeground": "{{ foreground }}",
        "settings.textInputBorder": "{{ muted }}",
        "settings.numberInputBackground": "{{ background }}",
        "settings.numberInputForeground": "{{ foreground }}",
        "settings.numberInputBorder": "{{ muted }}",
        "settings.focusedRowBackground": "{{ accent }}10",
        "settings.focusedRowBorder": "{{ accent }}40",
        "settings.headerBorder": "{{ muted }}",
        "settings.sashBorder": "{{ muted }}",
        "settings.settingsHeaderHoverForeground": "{{ accent }}",

        "breadcrumb.foreground": "{{ muted }}",
        "breadcrumb.background": "{{ background }}",
        "breadcrumb.focusForeground": "{{ foreground }}",
        "breadcrumb.activeSelectionForeground": "{{ foreground }}",
        "breadcrumbPicker.background": "{{ background }}",

        "editor.snippetTabstopHighlightBackground": "{{ accent }}20",
        "editor.snippetTabstopHighlightBorder": "{{ accent }}40",
        "editor.snippetFinalTabstopHighlightBackground": "{{ green }}20",
        "editor.snippetFinalTabstopHighlightBorder": "{{ green }}40",

        "symbolIcon.arrayForeground": "{{ orange }}",
        "symbolIcon.booleanForeground": "{{ orange }}",
        "symbolIcon.classForeground": "{{ yellow }}",
        "symbolIcon.colorForeground": "{{ cyan }}",
        "symbolIcon.constantForeground": "{{ bright_yellow }}",
        "symbolIcon.constructorForeground": "{{ blue }}",
        "symbolIcon.enumeratorForeground": "{{ yellow }}",
        "symbolIcon.enumeratorMemberForeground": "{{ orange }}",
        "symbolIcon.eventForeground": "{{ yellow }}",
        "symbolIcon.fieldForeground": "{{ foreground }}",
        "symbolIcon.fileForeground": "{{ foreground }}",
        "symbolIcon.folderForeground": "{{ foreground }}",
        "symbolIcon.functionForeground": "{{ blue }}",
        "symbolIcon.interfaceForeground": "{{ yellow }}",
        "symbolIcon.keyForeground": "{{ bright_magenta }}",
        "symbolIcon.keywordForeground": "{{ bright_magenta }}",
        "symbolIcon.methodForeground": "{{ blue }}",
        "symbolIcon.moduleForeground": "{{ yellow }}",
        "symbolIcon.namespaceForeground": "{{ blue }}",
        "symbolIcon.nullForeground": "{{ orange }}",
        "symbolIcon.numberForeground": "{{ orange }}",
        "symbolIcon.objectForeground": "{{ yellow }}",
        "symbolIcon.operatorForeground": "{{ bright_blue }}",
        "symbolIcon.packageForeground": "{{ yellow }}",
        "symbolIcon.propertyForeground": "{{ foreground }}",
        "symbolIcon.referenceForeground": "{{ bright_magenta }}",
        "symbolIcon.snippetForeground": "{{ green }}",
        "symbolIcon.stringForeground": "{{ green }}",
        "symbolIcon.structForeground": "{{ yellow }}",
        "symbolIcon.textForeground": "{{ foreground }}",
        "symbolIcon.typeParameterForeground": "{{ yellow }}",
        "symbolIcon.unitForeground": "{{ orange }}",
        "symbolIcon.variableForeground": "{{ bright_magenta }}",

        "debugIcon.breakpointForeground": "{{ red }}",
        "debugIcon.breakpointDisabledForeground": "{{ muted }}",
        "debugIcon.breakpointUnverifiedForeground": "{{ yellow }}",
        "debugIcon.breakpointCurrentStackframeForeground": "{{ yellow }}",
        "debugIcon.breakpointStackframeForeground": "{{ green }}",
        "debugIcon.startForeground": "{{ green }}",
        "debugIcon.pauseForeground": "{{ yellow }}",
        "debugIcon.stopForeground": "{{ red }}",
        "debugIcon.disconnectForeground": "{{ red }}",
        "debugIcon.restartForeground": "{{ green }}",
        "debugIcon.stepOverForeground": "{{ blue }}",
        "debugIcon.stepIntoForeground": "{{ cyan }}",
        "debugIcon.stepOutForeground": "{{ magenta }}",
        "debugIcon.continueForeground": "{{ green }}",
        "debugIcon.stepBackForeground": "{{ yellow }}",
        "debugConsole.infoForeground": "{{ blue }}",
        "debugConsole.warningForeground": "{{ yellow }}",
        "debugConsole.errorForeground": "{{ red }}",
        "debugConsole.sourceForeground": "{{ foreground }}",
        "debugConsoleInputIcon.foreground": "{{ accent }}",

        "notebook.editorBackground": "{{ background }}",
        "notebook.cellBorderColor": "{{ muted }}40",
        "notebook.cellHoverBackground": "{{ background }}40",
        "notebook.cellInsertionIndicator": "{{ accent }}",
        "notebook.cellStatusBarItemHoverBackground": "{{ muted }}",
        "notebook.cellToolbarSeparator": "{{ muted }}",
        "notebook.cellEditorBackground": "{{ background }}",
        "notebook.focusedCellBackground": "{{ background }}60",
        "notebook.focusedCellBorder": "{{ accent }}",
        "notebook.focusedEditorBorder": "{{ accent }}",
        "notebook.inactiveFocusedCellBorder": "{{ muted }}",
        "notebook.inactiveSelectedCellBorder": "{{ muted }}",
        "notebook.outputContainerBackgroundColor": "{{ background }}",
        "notebook.outputContainerBorderColor": "{{ muted }}40",
        "notebook.selectedCellBackground": "{{ accent }}15",
        "notebook.selectedCellBorder": "{{ accent }}40",
        "notebook.symbolHighlightBackground": "{{ accent }}20",
        "notebookStatusErrorIcon.foreground": "{{ red }}",
        "notebookStatusRunningIcon.foreground": "{{ accent }}",
        "notebookStatusSuccessIcon.foreground": "{{ green }}",
        "notebookEditorOverviewRuler.runningCellForeground": "{{ accent }}",

        "charts.foreground": "{{ foreground }}",
        "charts.lines": "{{ muted }}",
        "charts.red": "{{ red }}",
        "charts.blue": "{{ blue }}",
        "charts.yellow": "{{ yellow }}",
        "charts.orange": "{{ orange }}",
        "charts.green": "{{ green }}",
        "charts.purple": "{{ magenta }}",

        "ports.iconRunningProcessForeground": "{{ accent }}",

        "commentsView.resolvedIcon": "{{ green }}",
        "commentsView.unresolvedIcon": "{{ yellow }}",

        "editorWatermark.foreground": "{{ muted }}",

        "inlineChat.background": "{{ background }}",
        "inlineChat.border": "{{ muted }}",
        "inlineChat.shadow": "{{ background }}80",
        "inlineChatInput.border": "{{ muted }}",
        "inlineChatInput.focusBorder": "{{ accent }}",
        "inlineChatInput.placeholderForeground": "{{ muted }}",
        "inlineChatInput.background": "{{ background }}",
        "inlineChatDiff.inserted": "{{ green }}20",
        "inlineChatDiff.removed": "{{ red }}20",

        "chat.requestBackground": "{{ background }}",
        "chat.requestBorder": "{{ muted }}"
    },
    "tokenColors": [
        {
            "name": "Comment",
            "scope": ["comment", "punctuation.definition.comment"],
            "settings": {
                "fontStyle": "italic",
                "foreground": "{{ muted }}"
            }
        },
        {
            "name": "Variable",
            "scope": ["variable", "string constant.other.placeholder"],
            "settings": {
                "foreground": "{{ foreground }}"
            }
        },
        {
            "name": "Variable Parameter",
            "scope": ["variable.parameter", "entity.name.variable.parameter", "meta.function.parameter"],
            "settings": {
                "foreground": "{{ cyan }}",
                "fontStyle": "italic"
            }
        },
        {
            "name": "Variable Property",
            "scope": ["variable.other.property", "variable.other.object.property"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "Variable Constant",
            "scope": ["variable.other.constant"],
            "settings": {
                "foreground": "{{ bright_yellow }}"
            }
        },
        {
            "name": "Enum Member",
            "scope": ["variable.other.enummember"],
            "settings": {
                "foreground": "{{ orange }}"
            }
        },
        {
            "name": "Invalid",
            "scope": ["invalid", "invalid.illegal"],
            "settings": {
                "foreground": "{{ red }}",
                "fontStyle": "strikethrough"
            }
        },
        {
            "name": "Invalid Deprecated",
            "scope": ["invalid.deprecated"],
            "settings": {
                "foreground": "{{ yellow }}",
                "fontStyle": "strikethrough"
            }
        },
        {
            "name": "Keyword",
            "scope": ["keyword", "storage.type.class", "storage.type.function"],
            "settings": {
                "foreground": "{{ bright_magenta }}"
            }
        },
        {
            "name": "Storage Modifier",
            "scope": ["storage.modifier"],
            "settings": {
                "foreground": "{{ yellow }}"
            }
        },
        {
            "name": "Keyword Control",
            "scope": ["keyword.control", "keyword.control.flow"],
            "settings": {
                "foreground": "{{ bright_magenta }}"
            }
        },
        {
            "name": "Keyword Import",
            "scope": ["keyword.control.import", "keyword.control.export", "keyword.control.from", "keyword.control.as"],
            "settings": {
                "foreground": "{{ blue }}"
            }
        },
        {
            "name": "Keyword Operator",
            "scope": ["keyword.operator", "keyword.operator.new", "keyword.operator.expression", "keyword.operator.logical", "keyword.operator.comparison"],
            "settings": {
                "foreground": "{{ bright_blue }}"
            }
        },
        {
            "name": "Operator",
            "scope": ["punctuation.accessor", "punctuation.separator.key-value"],
            "settings": {
                "foreground": "{{ bright_blue }}"
            }
        },
        {
            "name": "Type",
            "scope": ["storage.type", "entity.name.type"],
            "settings": {
                "foreground": "{{ yellow }}"
            }
        },
        {
            "name": "Type Builtin",
            "scope": ["storage.type.primitive", "support.type"],
            "settings": {
                "foreground": "{{ foreground }}"
            }
        },
        {
            "name": "Type Class",
            "scope": ["entity.name.type.class", "support.class", "entity.other.inherited-class"],
            "settings": {
                "foreground": "{{ yellow }}"
            }
        },
        {
            "name": "Type Interface",
            "scope": ["entity.name.type.interface"],
            "settings": {
                "foreground": "{{ yellow }}"
            }
        },
        {
            "name": "Type Enum",
            "scope": ["entity.name.type.enum"],
            "settings": {
                "foreground": "{{ yellow }}"
            }
        },
        {
            "name": "Type Parameter",
            "scope": ["entity.name.type.parameter"],
            "settings": {
                "foreground": "{{ yellow }}",
                "fontStyle": "italic"
            }
        },
        {
            "name": "Namespace",
            "scope": ["entity.name.namespace", "entity.name.type.module"],
            "settings": {
                "foreground": "{{ blue }}"
            }
        },
        {
            "name": "Function",
            "scope": ["entity.name.function", "meta.function-call.generic"],
            "settings": {
                "foreground": "{{ blue }}"
            }
        },
        {
            "name": "Function Builtin",
            "scope": ["support.function"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "Function Method",
            "scope": ["entity.name.function.method", "meta.method.declaration"],
            "settings": {
                "foreground": "{{ blue }}"
            }
        },
        {
            "name": "Function Decorator",
            "scope": ["entity.name.function.decorator", "meta.decorator", "punctuation.decorator"],
            "settings": {
                "foreground": "{{ cyan }}",
                "fontStyle": "italic"
            }
        },
        {
            "name": "Punctuation",
            "scope": ["punctuation", "meta.brace", "meta.bracket"],
            "settings": {
                "foreground": "{{ dark_foreground }}"
            }
        },
        {
            "name": "Constant Numeric",
            "scope": ["constant.numeric", "constant.numeric.integer", "constant.numeric.float", "constant.numeric.hex", "constant.numeric.octal", "constant.numeric.binary"],
            "settings": {
                "foreground": "{{ orange }}"
            }
        },
        {
            "name": "Constant Boolean",
            "scope": ["constant.language.boolean"],
            "settings": {
                "foreground": "{{ orange }}"
            }
        },
        {
            "name": "Constant Builtin",
            "scope": ["constant.language", "constant.language.null", "constant.language.undefined"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "Constant Character",
            "scope": ["constant.character"],
            "settings": {
                "foreground": "{{ green }}"
            }
        },
        {
            "name": "Constant Character Escape",
            "scope": ["constant.character.escape"],
            "settings": {
                "foreground": "{{ bright_magenta }}"
            }
        },
        {
            "name": "String",
            "scope": ["string", "string.quoted", "string.template"],
            "settings": {
                "foreground": "{{ green }}"
            }
        },
        {
            "name": "String Interpolation",
            "scope": ["punctuation.definition.template-expression", "punctuation.section.embedded", "meta.embedded.line"],
            "settings": {
                "foreground": "{{ bright_blue }}"
            }
        },
        {
            "name": "String Regexp",
            "scope": ["string.regexp", "constant.other.character-class.regexp", "constant.character.escape.regexp"],
            "settings": {
                "foreground": "{{ bright_cyan }}"
            }
        },
        {
            "name": "Support",
            "scope": ["support.type.property-name", "support.constant"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "Tag",
            "scope": ["entity.name.tag", "meta.tag"],
            "settings": {
                "foreground": "{{ yellow }}"
            }
        },
        {
            "name": "Tag Attribute",
            "scope": ["entity.other.attribute-name"],
            "settings": {
                "foreground": "{{ foreground }}"
            }
        },
        {
            "name": "CSS Property",
            "scope": ["support.type.property-name.css", "support.type.vendored.property-name.css", "meta.property-name.css"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "CSS Value",
            "scope": ["support.constant.property-value.css", "meta.property-value.css"],
            "settings": {
                "foreground": "{{ foreground }}"
            }
        },
        {
            "name": "CSS Selector",
            "scope": ["entity.other.attribute-name.class.css", "entity.other.attribute-name.id.css"],
            "settings": {
                "foreground": "{{ yellow }}"
            }
        },
        {
            "name": "CSS Pseudo",
            "scope": ["entity.other.attribute-name.pseudo-class.css", "entity.other.attribute-name.pseudo-element.css"],
            "settings": {
                "foreground": "{{ cyan }}",
                "fontStyle": "italic"
            }
        },
        {
            "name": "CSS Units",
            "scope": ["keyword.other.unit.css"],
            "settings": {
                "foreground": "{{ orange }}"
            }
        },
        {
            "name": "JSON Key Level 0",
            "scope": ["source.json meta.structure.dictionary.json support.type.property-name.json"],
            "settings": {
                "foreground": "{{ orange }}"
            }
        },
        {
            "name": "JSON Key Level 1",
            "scope": ["source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"],
            "settings": {
                "foreground": "{{ yellow }}"
            }
        },
        {
            "name": "JSON Key Level 2",
            "scope": ["source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"],
            "settings": {
                "foreground": "{{ blue }}"
            }
        },
        {
            "name": "JSON Key Level 3",
            "scope": ["source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"],
            "settings": {
                "foreground": "{{ bright_magenta }}"
            }
        },
        {
            "name": "JSON Key Level 4",
            "scope": ["source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "JSON Key Level 5+",
            "scope": ["source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"],
            "settings": {
                "foreground": "{{ green }}"
            }
        },
        {
            "name": "Markdown Heading",
            "scope": ["markup.heading", "entity.name.section.markdown", "punctuation.definition.heading.markdown"],
            "settings": {
                "foreground": "{{ blue }}",
                "fontStyle": "bold"
            }
        },
        {
            "name": "Markdown Bold",
            "scope": ["markup.bold", "punctuation.definition.bold.markdown"],
            "settings": {
                "foreground": "{{ foreground }}",
                "fontStyle": "bold"
            }
        },
        {
            "name": "Markdown Italic",
            "scope": ["markup.italic", "punctuation.definition.italic.markdown"],
            "settings": {
                "foreground": "{{ foreground }}",
                "fontStyle": "italic"
            }
        },
        {
            "name": "Markdown Link",
            "scope": ["markup.underline.link", "string.other.link.title.markdown", "string.other.link.description.markdown"],
            "settings": {
                "foreground": "{{ blue }}"
            }
        },
        {
            "name": "Markdown Code",
            "scope": ["markup.inline.raw", "markup.fenced_code.block", "markup.raw.block"],
            "settings": {
                "foreground": "{{ green }}"
            }
        },
        {
            "name": "Markdown Quote",
            "scope": ["markup.quote", "punctuation.definition.quote.begin.markdown"],
            "settings": {
                "foreground": "{{ muted }}",
                "fontStyle": "italic"
            }
        },
        {
            "name": "Markdown List",
            "scope": ["punctuation.definition.list.begin.markdown", "markup.list.numbered", "markup.list.unnumbered"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "Diff Inserted",
            "scope": ["markup.inserted", "punctuation.definition.inserted"],
            "settings": {
                "foreground": "{{ green }}"
            }
        },
        {
            "name": "Diff Deleted",
            "scope": ["markup.deleted", "punctuation.definition.deleted"],
            "settings": {
                "foreground": "{{ red }}"
            }
        },
        {
            "name": "Diff Changed",
            "scope": ["markup.changed", "punctuation.definition.changed"],
            "settings": {
                "foreground": "{{ orange }}"
            }
        },
        {
            "name": "This/Self",
            "scope": ["variable.language.this", "variable.language.self", "variable.language.special.self"],
            "settings": {
                "foreground": "{{ foreground }}",
                "fontStyle": "italic"
            }
        },
        {
            "name": "Object Keys",
            "scope": ["meta.object-literal.key", "string.unquoted.label.js"],
            "settings": {
                "foreground": "{{ foreground }}"
            }
        },
        {
            "name": "Rust Lifetime",
            "scope": ["entity.name.type.lifetime.rust", "punctuation.definition.lifetime.rust"],
            "settings": {
                "foreground": "{{ cyan }}",
                "fontStyle": "italic"
            }
        },
        {
            "name": "Rust Macro",
            "scope": ["entity.name.function.macro.rust", "support.function.macro.rust"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "Shell Variable",
            "scope": ["variable.other.normal.shell", "variable.other.positional.shell", "variable.other.bracket.shell"],
            "settings": {
                "foreground": "{{ foreground }}"
            }
        },
        {
            "name": "Shell Command",
            "scope": ["entity.name.command.shell"],
            "settings": {
                "foreground": "{{ blue }}"
            }
        },
        {
            "name": "Shell Builtin",
            "scope": ["support.function.builtin.shell"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "YAML Key",
            "scope": ["entity.name.tag.yaml"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "TOML Key",
            "scope": ["keyword.key.toml", "support.type.property-name.toml"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "TOML Table",
            "scope": ["entity.other.attribute-name.table.toml", "support.type.property-name.table.toml"],
            "settings": {
                "foreground": "{{ yellow }}"
            }
        },
        {
            "name": "INI Section",
            "scope": ["entity.name.section.group-title.ini", "punctuation.definition.entity.ini"],
            "settings": {
                "foreground": "{{ yellow }}"
            }
        },
        {
            "name": "INI Key",
            "scope": ["keyword.other.definition.ini"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "Make Target",
            "scope": ["entity.name.function.target.makefile"],
            "settings": {
                "foreground": "{{ blue }}"
            }
        },
        {
            "name": "Make Variable",
            "scope": ["variable.other.makefile"],
            "settings": {
                "foreground": "{{ foreground }}"
            }
        },
        {
            "name": "Go Package",
            "scope": ["entity.name.package.go"],
            "settings": {
                "foreground": "{{ blue }}"
            }
        },
        {
            "name": "Python Self",
            "scope": ["variable.parameter.function.language.special.self.python"],
            "settings": {
                "foreground": "{{ foreground }}",
                "fontStyle": "italic"
            }
        },
        {
            "name": "Python Magic",
            "scope": ["support.function.magic.python", "support.variable.magic.python"],
            "settings": {
                "foreground": "{{ cyan }}",
                "fontStyle": "italic"
            }
        },
        {
            "name": "PHP Variable",
            "scope": ["variable.other.php", "punctuation.definition.variable.php"],
            "settings": {
                "foreground": "{{ foreground }}"
            }
        },
        {
            "name": "C Preprocessor",
            "scope": ["meta.preprocessor.c", "meta.preprocessor.include.c", "keyword.control.directive.include.c"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "C# Attribute",
            "scope": ["meta.attribute.csharp", "entity.name.type.attribute.csharp"],
            "settings": {
                "foreground": "{{ cyan }}"
            }
        },
        {
            "name": "SQL Keyword",
            "scope": ["keyword.other.DML.sql", "keyword.other.DDL.sql"],
            "settings": {
                "foreground": "{{ bright_magenta }}"
            }
        },
        {
            "name": "GraphQL Type",
            "scope": ["support.type.graphql", "entity.name.type.graphql"],
            "settings": {
                "foreground": "{{ yellow }}"
            }
        },
        {
            "name": "GraphQL Field",
            "scope": ["variable.graphql", "variable.other.graphql"],
            "settings": {
                "foreground": "{{ foreground }}"
            }
        }
    ]
}
`,
  'zed-theme.json.tpl': `{
  "$schema": "https://zed.dev/schema/themes/v0.2.0.json",
  "name": "scuttlarr",
  "author": "scuttlarr — rendered from theme {{ name }}, do not edit",
  "themes": [
    {
      "name": "scuttlarr",
      "appearance": "{{ mode }}",
      "style": {
        "background": "{{ background }}",
        "background.appearance": "opaque",
        "border": "{{ selection }}",
        "border.variant": "{{ lighter_background }}",
        "border.focused": "{{ accent }}",
        "border.selected": "{{ accent }}",
        "border.transparent": "#00000000",
        "border.disabled": "{{ muted }}",
        "elevated_surface.background": "{{ lighter_background }}",
        "surface.background": "{{ dark_background }}",
        "element.background": "{{ lighter_background }}",
        "element.hover": "{{ selection }}",
        "element.active": "{{ selection }}",
        "element.selected": "{{ selection }}",
        "element.disabled": "{{ dark_background }}",
        "drop_target.background": "{{ mix accent background 30% }}",
        "ghost_element.background": "#00000000",
        "ghost_element.hover": "{{ lighter_background }}",
        "ghost_element.active": "{{ selection }}",
        "ghost_element.selected": "{{ selection }}",
        "ghost_element.disabled": "{{ dark_background }}",
        "text": "{{ foreground }}",
        "text.muted": "{{ dark_foreground }}",
        "text.placeholder": "{{ muted }}",
        "text.disabled": "{{ muted }}",
        "text.accent": "{{ accent }}",
        "icon": "{{ foreground }}",
        "icon.muted": "{{ dark_foreground }}",
        "icon.disabled": "{{ muted }}",
        "icon.placeholder": "{{ muted }}",
        "icon.accent": "{{ accent }}",
        "status_bar.background": "{{ dark_background }}",
        "title_bar.background": "{{ dark_background }}",
        "title_bar.inactive_background": "{{ darker_background }}",
        "toolbar.background": "{{ background }}",
        "tab_bar.background": "{{ dark_background }}",
        "tab.inactive_background": "{{ dark_background }}",
        "tab.active_background": "{{ background }}",
        "search.match_background": "{{ mix yellow background 35% }}",
        "panel.background": "{{ dark_background }}",
        "panel.focused_border": "{{ accent }}",
        "panel.indent_guide": "{{ lighter_background }}",
        "panel.indent_guide_hover": "{{ selection }}",
        "panel.indent_guide_active": "{{ muted }}",
        "pane.focused_border": "{{ accent }}",
        "pane_group.border": "{{ selection }}",
        "scrollbar.thumb.background": "{{ mix foreground background 25% }}",
        "scrollbar.thumb.hover_background": "{{ mix foreground background 40% }}",
        "scrollbar.thumb.border": "{{ selection }}",
        "scrollbar.track.background": "#00000000",
        "scrollbar.track.border": "{{ lighter_background }}",
        "editor.foreground": "{{ foreground }}",
        "editor.background": "{{ background }}",
        "editor.gutter.background": "{{ background }}",
        "editor.subheader.background": "{{ lighter_background }}",
        "editor.active_line.background": "{{ lighter_background }}",
        "editor.highlighted_line.background": "{{ mix accent background 15% }}",
        "editor.line_number": "{{ muted }}",
        "editor.active_line_number": "{{ foreground }}",
        "editor.invisible": "{{ muted }}",
        "editor.wrap_guide": "{{ lighter_background }}",
        "editor.active_wrap_guide": "{{ selection }}",
        "editor.indent_guide": "{{ lighter_background }}",
        "editor.indent_guide_active": "{{ selection }}",
        "editor.document_highlight.read_background": "{{ mix accent background 20% }}",
        "editor.document_highlight.write_background": "{{ mix accent background 30% }}",
        "editor.document_highlight.bracket_background": "{{ mix accent background 20% }}",
        "terminal.background": "{{ background }}",
        "terminal.foreground": "{{ foreground }}",
        "terminal.bright_foreground": "{{ bright_foreground }}",
        "terminal.dim_foreground": "{{ dark_foreground }}",
        "terminal.ansi.background": "{{ background }}",
        "terminal.ansi.foreground": "{{ foreground }}",
        "terminal.ansi.black": "{{ background }}",
        "terminal.ansi.bright_black": "{{ muted }}",
        "terminal.ansi.dim_black": "{{ darker_background }}",
        "terminal.ansi.red": "{{ red }}",
        "terminal.ansi.bright_red": "{{ bright_red }}",
        "terminal.ansi.dim_red": "{{ mix red background 50% }}",
        "terminal.ansi.green": "{{ green }}",
        "terminal.ansi.bright_green": "{{ bright_green }}",
        "terminal.ansi.dim_green": "{{ mix green background 50% }}",
        "terminal.ansi.yellow": "{{ yellow }}",
        "terminal.ansi.bright_yellow": "{{ bright_yellow }}",
        "terminal.ansi.dim_yellow": "{{ mix yellow background 50% }}",
        "terminal.ansi.blue": "{{ blue }}",
        "terminal.ansi.bright_blue": "{{ bright_blue }}",
        "terminal.ansi.dim_blue": "{{ mix blue background 50% }}",
        "terminal.ansi.magenta": "{{ magenta }}",
        "terminal.ansi.bright_magenta": "{{ bright_magenta }}",
        "terminal.ansi.dim_magenta": "{{ mix magenta background 50% }}",
        "terminal.ansi.cyan": "{{ cyan }}",
        "terminal.ansi.bright_cyan": "{{ bright_cyan }}",
        "terminal.ansi.dim_cyan": "{{ mix cyan background 50% }}",
        "terminal.ansi.white": "{{ foreground }}",
        "terminal.ansi.bright_white": "{{ bright_foreground }}",
        "terminal.ansi.dim_white": "{{ dark_foreground }}",
        "link_text.hover": "{{ accent }}",
        "conflict": "{{ orange }}",
        "conflict.background": "{{ mix orange background 20% }}",
        "conflict.border": "{{ orange }}",
        "created": "{{ green }}",
        "created.background": "{{ mix green background 20% }}",
        "created.border": "{{ green }}",
        "deleted": "{{ red }}",
        "deleted.background": "{{ mix red background 20% }}",
        "deleted.border": "{{ red }}",
        "error": "{{ red }}",
        "error.background": "{{ mix red background 20% }}",
        "error.border": "{{ red }}",
        "hidden": "{{ muted }}",
        "hidden.background": "{{ dark_background }}",
        "hidden.border": "{{ muted }}",
        "hint": "{{ cyan }}",
        "hint.background": "{{ mix cyan background 20% }}",
        "hint.border": "{{ cyan }}",
        "ignored": "{{ muted }}",
        "ignored.background": "{{ dark_background }}",
        "ignored.border": "{{ muted }}",
        "info": "{{ blue }}",
        "info.background": "{{ mix blue background 20% }}",
        "info.border": "{{ blue }}",
        "modified": "{{ yellow }}",
        "modified.background": "{{ mix yellow background 20% }}",
        "modified.border": "{{ yellow }}",
        "predictive": "{{ muted }}",
        "predictive.background": "{{ dark_background }}",
        "predictive.border": "{{ muted }}",
        "renamed": "{{ cyan }}",
        "renamed.background": "{{ mix cyan background 20% }}",
        "renamed.border": "{{ cyan }}",
        "success": "{{ green }}",
        "success.background": "{{ mix green background 20% }}",
        "success.border": "{{ green }}",
        "unreachable": "{{ muted }}",
        "unreachable.background": "{{ dark_background }}",
        "unreachable.border": "{{ muted }}",
        "warning": "{{ yellow }}",
        "warning.background": "{{ mix yellow background 20% }}",
        "warning.border": "{{ yellow }}",
        "players": [
          { "cursor": "{{ bright_foreground }}", "background": "{{ accent }}", "selection": "{{ selection_background }}" },
          { "cursor": "{{ green }}", "background": "{{ green }}", "selection": "{{ mix green background 30% }}" },
          { "cursor": "{{ magenta }}", "background": "{{ magenta }}", "selection": "{{ mix magenta background 30% }}" },
          { "cursor": "{{ yellow }}", "background": "{{ yellow }}", "selection": "{{ mix yellow background 30% }}" },
          { "cursor": "{{ cyan }}", "background": "{{ cyan }}", "selection": "{{ mix cyan background 30% }}" },
          { "cursor": "{{ red }}", "background": "{{ red }}", "selection": "{{ mix red background 30% }}" },
          { "cursor": "{{ blue }}", "background": "{{ blue }}", "selection": "{{ mix blue background 30% }}" },
          { "cursor": "{{ orange }}", "background": "{{ orange }}", "selection": "{{ mix orange background 30% }}" }
        ],
        "syntax": {
          "attribute": { "color": "{{ yellow }}" },
          "boolean": { "color": "{{ orange }}" },
          "comment": { "color": "{{ muted }}", "font_style": "italic" },
          "comment.doc": { "color": "{{ muted }}", "font_style": "italic" },
          "constant": { "color": "{{ orange }}" },
          "constructor": { "color": "{{ blue }}" },
          "embedded": { "color": "{{ foreground }}" },
          "emphasis": { "font_style": "italic" },
          "emphasis.strong": { "font_weight": 700 },
          "enum": { "color": "{{ yellow }}" },
          "function": { "color": "{{ blue }}" },
          "function.method": { "color": "{{ blue }}" },
          "hint": { "color": "{{ cyan }}", "font_weight": 700 },
          "keyword": { "color": "{{ magenta }}" },
          "label": { "color": "{{ blue }}" },
          "link_text": { "color": "{{ blue }}", "font_style": "italic" },
          "link_uri": { "color": "{{ cyan }}" },
          "number": { "color": "{{ orange }}" },
          "operator": { "color": "{{ cyan }}" },
          "predictive": { "color": "{{ muted }}", "font_style": "italic" },
          "preproc": { "color": "{{ magenta }}" },
          "primary": { "color": "{{ foreground }}" },
          "property": { "color": "{{ cyan }}" },
          "punctuation": { "color": "{{ dark_foreground }}" },
          "punctuation.bracket": { "color": "{{ dark_foreground }}" },
          "punctuation.delimiter": { "color": "{{ dark_foreground }}" },
          "punctuation.list_marker": { "color": "{{ cyan }}" },
          "punctuation.special": { "color": "{{ magenta }}" },
          "string": { "color": "{{ green }}" },
          "string.escape": { "color": "{{ magenta }}" },
          "string.regex": { "color": "{{ bright_cyan }}" },
          "string.special": { "color": "{{ green }}" },
          "string.special.symbol": { "color": "{{ orange }}" },
          "tag": { "color": "{{ blue }}" },
          "text.literal": { "color": "{{ green }}" },
          "title": { "color": "{{ foreground }}", "font_weight": 700 },
          "type": { "color": "{{ yellow }}" },
          "variable": { "color": "{{ foreground }}" },
          "variable.special": { "color": "{{ red }}" },
          "variant": { "color": "{{ yellow }}" }
        }
      }
    }
  ]
}
`,
}
