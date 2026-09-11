/**
 * Render one theme into every surface: tokens for the app, one file per template,
 * and the OSC payload. Pure — the caller supplies texts and writes the results.
 */
import { type EditorThemes, editorThemesFor } from './editors.ts'
import { oscSequences } from './osc.ts'
import { type ResolvedPalette, parseThemeFile, resolve } from './palette.ts'
import { TemplateError, render } from './template.ts'
import type { ThemeTokens } from './theme-tokens.ts'
import { toTokens } from './tokens.ts'

export type RenderInput = {
  name: string
  /** The theme's `colors.toml`. */
  text: string
  /** Template file name (`ghostty.tpl`) → template text. */
  templates: Record<string, string>
  /** Hand-written files shipped in the theme dir, output name → text; they win. */
  handFiles?: Record<string, string>
}

export type RenderedTheme = {
  name: string
  mode: 'light' | 'dark'
  tokens: ThemeTokens
  /** Output file name (template key without `.tpl`) → rendered text. */
  files: Record<string, string>
  osc: string
  /** Names for editors that pick a theme by name (`editors.ts`); also template keys. */
  editors: EditorThemes
}

/**
 * bat/delta syntax theme. `ansi` is bat's built-in that paints with the terminal's own
 * 16 colours, so it follows the palette in both modes with no per-theme mapping; a
 * theme can name a specific bat theme with a top-level `bat_theme` in colors.toml.
 */
export const DEFAULT_BAT_THEME = 'ansi'

export function renderTheme(input: RenderInput): RenderedTheme {
  const { palette: raw, launcher } = parseThemeFile(input.text)
  const resolved = resolve(raw)
  const editors = editorThemesFor(input.name, resolved)
  const extended: ResolvedPalette = {
    ...resolved,
    name: input.name,
    bat_theme: resolved.bat_theme || DEFAULT_BAT_THEME,
    ...editors,
  }

  const files: Record<string, string> = {}
  for (const [key, template] of Object.entries(input.templates)) {
    if (!key.endsWith('.tpl'))
      throw new TemplateError(`template ${key}: name must end in .tpl`)
    const out = key.slice(0, -'.tpl'.length)
    try {
      files[out] = render(template, extended)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new TemplateError(`template ${key}: ${reason}`, { cause: error })
    }
  }
  for (const [out, text] of Object.entries(input.handFiles ?? {}))
    files[out] = text

  return {
    name: input.name,
    mode: extended.mode,
    tokens: toTokens(resolved, launcher),
    files,
    osc: oscSequences(resolved),
    editors,
  }
}
