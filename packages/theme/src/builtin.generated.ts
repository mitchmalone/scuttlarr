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
}
