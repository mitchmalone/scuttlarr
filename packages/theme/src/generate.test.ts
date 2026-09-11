import { describe, expect, it } from 'vitest'

import {
  GENERATED_HEADER,
  escapeTemplateLiteral,
  generateBuiltinModule,
  generateModule,
  orderThemes,
} from './generate.ts'

const MINI = (accent: string) => `
accent = "${accent}"
background = "#101010"
foreground = "#eeeeee"
red = "#f00000"
yellow = "#f0f000"
green = "#00f000"
cyan = "#00f0f0"
blue = "#0000f0"
magenta = "#f000f0"
`

describe('orderThemes', () => {
  it('leads with scuttlarr and the original three, then sorts by name', () => {
    const names = [
      'zed',
      'amber',
      'dracula',
      'alpha',
      'scuttlarr',
      'terminal',
    ].map((name) => ({ name }))
    expect(orderThemes(names).map((t) => t.name)).toEqual([
      'scuttlarr',
      'dracula',
      'terminal',
      'amber',
      'alpha',
      'zed',
    ])
  })
})

describe('generateModule', () => {
  const source = generateModule([
    { name: 'one-dark', text: MINI('#0000f0') },
    {
      name: 'scuttlarr',
      text: `${MINI('#ff6b8c')}\n[launcher]\nglass = "rgba(1, 2, 3, 0.5)"`,
    },
  ])

  it('starts with the do-not-edit header and imports the token type', () => {
    expect(source.startsWith(GENERATED_HEADER)).toBe(true)
    expect(source).toContain(
      "import type { ThemeTokens } from '@scuttlarr/theme/tokens'",
    )
    expect(source).toContain(
      'export const BUILTIN_THEMES: Record<string, ThemeTokens> = {',
    )
  })

  it('emits themes in picker order with quoted keys only where needed', () => {
    expect(source.indexOf('  scuttlarr: {')).toBeLessThan(
      source.indexOf("  'one-dark': {"),
    )
  })

  it('bakes derived and pinned tokens as plain strings', () => {
    expect(source).toContain("    glass: 'rgba(1, 2, 3, 0.5)',")
    expect(source).toContain("    selected: 'rgba(255, 107, 140, 0.14)',")
    expect(source.endsWith('}\n')).toBe(true)
  })

  it('surfaces palette errors with the theme name', () => {
    expect(() =>
      generateModule([{ name: 'broken', text: 'background = "#000"' }]),
    ).toThrow(/broken/)
  })
})

describe('escapeTemplateLiteral', () => {
  it('round-trips backticks, ${ and backslashes through a template literal', () => {
    const nasty = 'a `tick` ${not} \\ back\\`slash\\${x} end\n'
    const escaped = escapeTemplateLiteral(nasty)
    const back = new Function(`return \`${escaped}\``)() as string
    expect(back).toBe(nasty)
  })
})

describe('generateBuiltinModule', () => {
  const source = generateBuiltinModule(
    [
      { name: 'tokyo-night', text: 'accent = "#7aa2f7"\n' },
      { name: 'scuttlarr', text: 'accent = "#ff6b8c" # `house`\n' },
    ],
    {
      'ghostty.tpl': 'bg = {{ background }}\n',
      'claude.json.tpl': '{"a": "${x}"}',
    },
  )

  it('exports sources in LEAD order and templates sorted, escaped', () => {
    expect(source.startsWith(GENERATED_HEADER)).toBe(true)
    expect(source).toContain(
      'export const BUILTIN_THEME_SOURCES: Record<string, string> = {',
    )
    expect(source.indexOf('  scuttlarr: `')).toBeLessThan(
      source.indexOf("  'tokyo-night': `"),
    )
    expect(source).toContain('# \\`house\\`')
    expect(source).toContain(
      'export const TEMPLATES: Record<string, string> = {',
    )
    expect(source.indexOf("  'claude.json.tpl': `")).toBeLessThan(
      source.indexOf("  'ghostty.tpl': `"),
    )
    expect(source).toContain('"\\${x}"')
  })
})
