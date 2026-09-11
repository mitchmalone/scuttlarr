/**
 * The generated tokens must reproduce the hand-written `BUILTIN_THEMES` the tui
 * shipped before generation existed (packages/tui/src/themes.ts as of 2026-09-11),
 * exactly. The fixture is that object, copied verbatim.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { buildTokens, orderThemes } from './generate.ts'
import { parseThemeFile, resolve } from './palette.ts'
import { renderTheme } from './render.ts'
import { type ThemeTokens, toTokens } from './tokens.ts'

const THEMES_DIR = fileURLToPath(new URL('../themes', import.meta.url))

const CURRENT_TUI_THEMES: Record<string, ThemeTokens> = {
  scuttlarr: {
    bg: '#1c1d2a',
    surface: '#262838',
    glass: 'rgba(28, 29, 42, 0.96)',
    border: '#393b54',
    fg: '#b5b9d9',
    dim: '#73747c',
    accent: '#ff6b8c',
    sigil: '#ff6b8c',
    bang: '#d29922',
    selected: 'rgba(181, 185, 217, 0.12)',
    warn: '#d29922',
    danger: '#f85149',
  },
  dracula: {
    bg: '#282a36',
    surface: '#313445',
    glass: 'rgba(40, 42, 54, 0.96)',
    border: '#44475a',
    fg: '#f8f8f2',
    dim: '#6272a4',
    accent: '#bd93f9',
    sigil: '#50fa7b',
    bang: '#f1fa8c',
    selected: 'rgba(68, 71, 90, 0.55)',
    warn: '#f1fa8c',
    danger: '#ff5555',
  },
  terminal: {
    bg: '#000000',
    surface: '#0a120a',
    glass: 'rgba(0, 0, 0, 0.93)',
    border: '#123f12',
    fg: '#33ff33',
    dim: '#0f7f0f',
    accent: '#33ff33',
    sigil: '#33ff33',
    bang: '#33ff33',
    selected: 'rgba(51, 255, 51, 0.12)',
    warn: '#33ff33',
    danger: '#ff3333',
  },
  amber: {
    bg: '#000000',
    surface: '#140d00',
    glass: 'rgba(0, 0, 0, 0.93)',
    border: '#4a3200',
    fg: '#ffb000',
    dim: '#8a5f00',
    accent: '#ffb000',
    sigil: '#ffb000',
    bang: '#ffcf60',
    selected: 'rgba(255, 176, 0, 0.12)',
    warn: '#ffcf60',
    danger: '#ff5533',
  },
  catppuccin: {
    bg: '#1e1e2e',
    surface: '#313244',
    glass: 'rgba(30, 30, 46, 0.96)',
    border: '#45475a',
    fg: '#cdd6f4',
    dim: '#6c7086',
    accent: '#cba6f7',
    sigil: '#a6e3a1',
    bang: '#f9e2af',
    selected: 'rgba(203, 166, 247, 0.14)',
    warn: '#f9e2af',
    danger: '#f38ba8',
  },
  gruvbox: {
    bg: '#282828',
    surface: '#3c3836',
    glass: 'rgba(40, 40, 40, 0.96)',
    border: '#504945',
    fg: '#ebdbb2',
    dim: '#928374',
    accent: '#fe8019',
    sigil: '#b8bb26',
    bang: '#fabd2f',
    selected: 'rgba(254, 128, 25, 0.14)',
    warn: '#fabd2f',
    danger: '#fb4934',
  },
  monokai: {
    bg: '#272822',
    surface: '#34352d',
    glass: 'rgba(39, 40, 34, 0.96)',
    border: '#49483e',
    fg: '#f8f8f2',
    dim: '#75715e',
    accent: '#f92672',
    sigil: '#a6e22e',
    bang: '#e6db74',
    selected: 'rgba(249, 38, 114, 0.14)',
    warn: '#e6db74',
    danger: '#ff6188',
  },
  nord: {
    bg: '#2e3440',
    surface: '#3b4252',
    glass: 'rgba(46, 52, 64, 0.96)',
    border: '#4c566a',
    fg: '#eceff4',
    dim: '#7b88a1',
    accent: '#88c0d0',
    sigil: '#a3be8c',
    bang: '#ebcb8b',
    selected: 'rgba(136, 192, 208, 0.14)',
    warn: '#ebcb8b',
    danger: '#bf616a',
  },
  'one-dark': {
    bg: '#282c34',
    surface: '#2c313a',
    glass: 'rgba(40, 44, 52, 0.96)',
    border: '#3e4451',
    fg: '#abb2bf',
    dim: '#5c6370',
    accent: '#61afef',
    sigil: '#98c379',
    bang: '#e5c07b',
    selected: 'rgba(97, 175, 239, 0.14)',
    warn: '#e5c07b',
    danger: '#e06c75',
  },
  'rose-pine': {
    bg: '#191724',
    surface: '#26233a',
    glass: 'rgba(25, 23, 36, 0.96)',
    border: '#403d52',
    fg: '#e0def4',
    dim: '#6e6a86',
    accent: '#ebbcba',
    sigil: '#9ccfd8',
    bang: '#f6c177',
    selected: 'rgba(235, 188, 186, 0.12)',
    warn: '#f6c177',
    danger: '#eb6f92',
  },
  solarized: {
    bg: '#002b36',
    surface: '#073642',
    glass: 'rgba(0, 43, 54, 0.96)',
    border: '#175263',
    fg: '#93a1a1',
    dim: '#586e75',
    accent: '#268bd2',
    sigil: '#859900',
    bang: '#b58900',
    selected: 'rgba(38, 139, 210, 0.14)',
    warn: '#b58900',
    danger: '#dc322f',
  },
  'solarized-light': {
    bg: '#fdf6e3',
    surface: '#eee8d5',
    glass: 'rgba(253, 246, 227, 0.96)',
    border: '#d3cbb7',
    fg: '#657b83',
    dim: '#93a1a1',
    accent: '#268bd2',
    sigil: '#859900',
    bang: '#b58900',
    selected: 'rgba(38, 139, 210, 0.12)',
    warn: '#b58900',
    danger: '#dc322f',
  },
  synthwave: {
    bg: '#262335',
    surface: '#34294f',
    glass: 'rgba(38, 35, 53, 0.96)',
    border: '#495495',
    fg: '#f0eff1',
    dim: '#848bbd',
    accent: '#ff7edb',
    sigil: '#72f1b8',
    bang: '#fede5d',
    selected: 'rgba(255, 126, 219, 0.14)',
    warn: '#fede5d',
    danger: '#fe4450',
  },
  'tokyo-night': {
    bg: '#1a1b26',
    surface: '#24283b',
    glass: 'rgba(26, 27, 38, 0.96)',
    border: '#3b4261',
    fg: '#c0caf5',
    dim: '#565f89',
    accent: '#7aa2f7',
    sigil: '#9ece6a',
    bang: '#e0af68',
    selected: 'rgba(122, 162, 247, 0.14)',
    warn: '#e0af68',
    danger: '#f7768e',
  },
}

function load(name: string): string {
  return readFileSync(join(THEMES_DIR, name, 'colors.toml'), 'utf8')
}

const NAMES = readdirSync(THEMES_DIR).sort()

describe('themes/*/colors.toml', () => {
  it('ships exactly the built-in set', () => {
    expect(NAMES).toEqual(Object.keys(CURRENT_TUI_THEMES).sort())
  })

  it.each(NAMES)('%s reproduces the current tui tokens exactly', (name) => {
    const { palette, launcher } = parseThemeFile(load(name))
    expect(toTokens(resolve(palette), launcher)).toEqual(
      CURRENT_TUI_THEMES[name],
    )
  })

  it.each(NAMES)(
    '%s declares mode and a full base palette explicitly',
    (name) => {
      const { palette } = parseThemeFile(load(name))
      for (const key of [
        'mode',
        'accent',
        'selection',
        'muted',
        'background',
        'lighter_background',
        'foreground',
        'dark_foreground',
        'red',
        'yellow',
        'green',
        'cyan',
        'blue',
        'magenta',
      ]) {
        expect(palette[key], `${name}.${key}`).toBeTruthy()
      }
    },
  )

  it('buildTokens keeps the hand-written order: house theme, originals, then a-z', () => {
    const sources = NAMES.map((name) => ({ name, text: load(name) }))
    expect(Object.keys(buildTokens(sources))).toEqual(
      Object.keys(CURRENT_TUI_THEMES),
    )
    expect(orderThemes(sources).map((s) => s.name)).toEqual(
      Object.keys(CURRENT_TUI_THEMES),
    )
  })
})

describe('builtin.generated.ts', () => {
  it('carries every colors.toml and template verbatim', async () => {
    const { BUILTIN_THEME_SOURCES, TEMPLATES } =
      await import('./builtin.generated.ts')
    for (const name of NAMES)
      expect(BUILTIN_THEME_SOURCES[name], name).toBe(load(name))
    const tplDir = fileURLToPath(new URL('../templates', import.meta.url))
    for (const file of readdirSync(tplDir).filter((f) => f.endsWith('.tpl'))) {
      expect(TEMPLATES[file], file).toBe(
        readFileSync(join(tplDir, file), 'utf8'),
      )
    }
  })

  it.each(NAMES)(
    '%s renders every template without a stray placeholder',
    async (name) => {
      const { TEMPLATES } = await import('./builtin.generated.ts')
      const out = renderTheme({ name, text: load(name), templates: TEMPLATES })
      for (const [file, text] of Object.entries(out.files)) {
        expect(text, `${name}/${file}`).not.toContain('{{')
      }
    },
  )
})
