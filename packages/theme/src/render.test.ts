import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { renderTheme } from './render.ts'
import { TemplateError } from './template.ts'

const MINIMAL = `
accent = "#7aa2f7"
background = "#1a1b26"
foreground = "#a9b1d6"
red = "#f7768e"
yellow = "#e0af68"
green = "#9ece6a"
cyan = "#449dab"
blue = "#7aa2f7"
magenta = "#ad8ee6"
`

const FIXTURE =
  'name={{ name }} mode={{ mode }} bat={{ bat_theme }} bg={{ background }}\n'

const GHOSTTY = readFileSync(
  fileURLToPath(new URL('../templates/ghostty.tpl', import.meta.url)),
  'utf8',
)

describe('renderTheme', () => {
  it('renders each template to its output name with name, mode and bat_theme', () => {
    const out = renderTheme({
      name: 'tokyo-night',
      text: MINIMAL,
      templates: { 'fixture.txt.tpl': FIXTURE },
    })
    expect(out.name).toBe('tokyo-night')
    expect(out.mode).toBe('dark')
    expect(out.files).toEqual({
      'fixture.txt': 'name=tokyo-night mode=dark bat=ansi bg=#1a1b26\n',
    })
    expect(out.tokens.bg).toBe('#1a1b26')
    expect(out.osc.startsWith('\x1b]10;#a9b1d6\x07')).toBe(true)
  })

  it('honours a top-level bat_theme and a [launcher] table', () => {
    const out = renderTheme({
      name: 'x',
      text: `${MINIMAL}\nbat_theme = "Solarized (dark)"\n[launcher]\nfg = "#ffffff"`,
      templates: { 'fixture.tpl': FIXTURE },
    })
    expect(out.files.fixture).toContain('bat=Solarized (dark)')
    expect(out.tokens.fg).toBe('#ffffff')
  })

  it('renders the real ghostty template', () => {
    const out = renderTheme({
      name: 'tokyo-night',
      text: MINIMAL,
      templates: { 'ghostty.tpl': GHOSTTY },
    })
    const ghostty = out.files.ghostty!
    expect(ghostty).toContain('# scuttlarr theme: tokyo-night')
    expect(ghostty).toContain('background = #1a1b26')
    expect(ghostty).toContain('palette = 9=#f991a5')
    expect(ghostty).toContain('palette = 15=#a9b1d6')
    expect(ghostty).not.toContain('{{')
  })

  it('lets a hand-written file with the same output name win verbatim', () => {
    const out = renderTheme({
      name: 'x',
      text: MINIMAL,
      templates: { 'ghostty.tpl': GHOSTTY, 'fixture.tpl': FIXTURE },
      handFiles: { ghostty: 'hand written\n' },
    })
    expect(out.files.ghostty).toBe('hand written\n')
    expect(out.files.fixture).toContain('name=x')
  })

  it('names the template on an unknown key', () => {
    const bad = () =>
      renderTheme({
        name: 'x',
        text: MINIMAL,
        templates: { 'broken.tpl': '{{ nope }}' },
      })
    expect(bad).toThrow(TemplateError)
    expect(bad).toThrow(/template broken\.tpl: unknown key: nope/)
    expect(() =>
      renderTheme({ name: 'x', text: MINIMAL, templates: { ghostty: 'x' } }),
    ).toThrow(/must end in \.tpl/)
  })
})
