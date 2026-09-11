# @scuttlarr/theme

The theme model: Omarchy's `colors.toml` palettes, the derivation that fills in what a
palette leaves out, `{{ … }}` template rendering, and the generator that bakes
`@scuttlarr/tui`'s built-in tokens. Pure TypeScript, no runtime dependencies; the tui
never parses TOML — it imports the generated module.

## Format

`themes/<name>/colors.toml` is Omarchy's file, keys verbatim, so an Omarchy theme ports
by copying (credit it in a leading comment):

```toml
mode = "dark"                      # or "light"; auto-detected from background if absent
accent = "#7aa2f7"
selection = "#292e42"
muted = "#414868"
background / dark_background / darker_background / lighter_background
foreground / dark_foreground / light_foreground / bright_foreground
red yellow orange green cyan blue magenta brown
bright_red bright_yellow bright_green bright_cyan bright_blue bright_magenta
```

The parser (`src/toml.ts`) reads the subset a palette needs: `key = "string"`, numbers,
booleans, `# comments`, blank lines, and one level of `[table]` headers.

## Derivation

`resolve(palette)` (`src/palette.ts`) is a port of `omarchy-theme-color`, in the same
order: legacy short names (`bg`, `fg`, …) and `color0..15` → semantic keys; foreground
and selection cascades (`light_foreground` ← `foreground`, `muted` ← `dark_foreground`,
`selection_background` ← `selection`, `selection_foreground` ← `bright_foreground`,
`orange` ← `yellow`, `cursor` = `bright_foreground`); mixes (`dark_background` =
`mix(background, #000, 25%)`, `darker_background` at 50%, `brown` =
`mix(orange, #000, 50%)`, `bright_*` = `mix(x, #fff, 20%)`); ANSI back-aliases; then
`mode` from `mode` → `theme_type` → background luminance (`r+g+b > 382` is light).
Colour math (`src/color.ts`) rounds exactly as the awk does. One extension: a missing
`accent` falls back to `blue`.

`render(template, resolved)` (`src/template.ts`) substitutes `{{ key }}`,
`{{ key_strip }}`, `{{ key_rgb }}`, and `{{ mix a b 30% }}` / `mix_strip` / `mix_rgb`
(operands are keys or literal `#rrggbb`). Unknown keys throw — no raw placeholders.

## `[launcher]`

`toTokens(resolved, launcher)` (`src/tokens.ts`) maps the palette onto the launcher's
tokens:

| token      | default                  |
| ---------- | ------------------------ |
| `bg`       | `background`             |
| `surface`  | `lighter_background`     |
| `glass`    | `rgba(background, 0.96)` |
| `border`   | `selection`              |
| `fg`       | `foreground`             |
| `dim`      | `dark_foreground`        |
| `accent`   | `accent`                 |
| `sigil`    | `green`                  |
| `bang`     | `yellow`                 |
| `selected` | `rgba(accent, 0.14)`     |
| `warn`     | `yellow`                 |
| `danger`   | `red`                    |

An optional `[launcher]` table in `colors.toml` overrides any token verbatim. Overrides
don't cascade: pinning `accent` leaves `selected` derived from the palette accent, so
pin both when they should move together.

## Adding a theme

1. `mkdir themes/<name>` and write `colors.toml` (copy Omarchy's if it ships one).
2. Add a `[launcher]` table only where the defaults read wrong in the app.
3. `pnpm --filter @scuttlarr/theme build` regenerates
   `packages/tui/src/themes.generated.ts`; commit both.
4. If the theme must match a fixed set of tokens, add them to
   `src/themes.test.ts`'s fixture.

## Rendering surfaces

`renderTheme({ name, text, templates, handFiles? })` (`src/render.ts`) returns
`{ name, mode, tokens, files, osc }`: `files` maps each template key minus `.tpl` to its
rendered text (a hand file with the same output name wins verbatim — Omarchy's rule),
`osc` is `oscSequences(resolved)` (`src/osc.ts`) — the OSC 10/11/12/17/19 and `4;N`
sequences `omarchy-theme-osc` prints, for retinting live terminals. Templates
(`templates/*.tpl`) see three keys beyond the palette: `name`, `mode`, and `bat_theme`
(top-level `bat_theme` in colors.toml, else `ansi` — bat's built-in that paints with the
terminal's own 16 colours, so it follows the palette in either mode with no mapping).

## Generation

`bin/generate.ts` (run by Node directly — type stripping, no build step) reads every
`themes/*/colors.toml`, orders them (scuttlarr, dracula, terminal, amber, then a-z — the
picker's order), and writes the module. It also writes `src/builtin.generated.ts` —
`BUILTIN_THEME_SOURCES` (name → raw colors.toml) and `TEMPLATES` (file → text) — so the
app renders built-ins with no filesystem; `src/index.ts` and everything it reaches is
free of Node imports. `pnpm verify:themes` (part of `pnpm verify`)
runs it with `--check` and fails when the committed module is stale; `--out <path>`
writes elsewhere for a manual diff.
