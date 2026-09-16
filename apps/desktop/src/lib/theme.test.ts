import { describe, expect, it } from 'vitest'

import type { Config } from './config'
import {
  appearanceOf,
  flipsMacos,
  policyConfigured,
  renderBuiltin,
  themeApplyRequest,
} from './theme'

const cfg = (over: Partial<Config>): Config =>
  ({ theme: 'dracula', themes: {}, ...over }) as Config

describe('appearanceOf', () => {
  it('seeds the pair from the current theme until a policy exists', () => {
    const a = appearanceOf(cfg({ appearance: undefined }))
    expect(a.pair).toEqual({ light: 'dracula', dark: 'dracula' })
    expect(a.mode).toBe('system')
    expect(policyConfigured(cfg({ appearance: undefined }))).toBe(false)
  })
  it('uses the stored pair once configured, filling gaps from defaults', () => {
    const a = appearanceOf(
      cfg({
        appearance: { everywhere: true, macos: true, mode: 'dark' } as never,
      }),
    )
    expect(a.pair).toEqual({ light: 'solarized-light', dark: 'scuttlarr' })
    expect(a.schedule).toEqual({ light: '07:00', dark: '19:00' })
    expect(a.everywhere).toBe(true)
  })
})

describe('flipsMacos', () => {
  it('never flips the OS while the OS is the source', () => {
    expect(
      flipsMacos(cfg({ appearance: { macos: true, mode: 'system' } as never })),
    ).toBe(false)
    expect(
      flipsMacos(cfg({ appearance: { macos: true, mode: 'dark' } as never })),
    ).toBe(true)
    expect(
      flipsMacos(cfg({ appearance: { macos: false, mode: 'dark' } as never })),
    ).toBe(false)
  })
})

describe('themeApplyRequest', () => {
  const rendered = renderBuiltin('dracula')
  it('keeps the editor payloads out of the theme dir and off unless enabled', () => {
    const req = themeApplyRequest(rendered, cfg({ appearance: undefined }))
    expect(req.editors).toBe(false)
    expect(req.vscode).toBeNull()
    expect(req.zed).toBeNull()
    expect(req.btop).toBeNull()
    expect(req.neovimColorscheme).toBeNull()
    expect(req.helixTheme).toBeNull()
    expect(req.claude).toContain('"name": "scuttlarr — dracula"')
    for (const gone of [
      'claude.json',
      'vscode-theme.json',
      'zed-theme.json',
      'btop.theme',
    ])
      expect(req.files).not.toHaveProperty(gone)
    expect(req.files['neovim.lua']).toContain('colorscheme = "dracula"')
    expect(req.files.ghostty).toBeDefined()
  })
  it('sends every editor payload when appearance.editors is on', () => {
    const req = themeApplyRequest(
      rendered,
      cfg({ appearance: { editors: true } as never }),
    )
    expect(req.editors).toBe(true)
    expect(req.mode).toBe('dark')
    expect(JSON.parse(req.vscode!).type).toBe('dark')
    expect(JSON.parse(req.zed!).themes[0].name).toBe('scuttlarr')
    expect(req.btop).toContain('theme[main_bg]="#282a36"')
    expect(req.neovimColorscheme).toBe('dracula')
    expect(req.helixTheme).toBe('dracula')
  })
  it('asks for the Ghostty reload only when appearance.ghostty is on', () => {
    expect(
      themeApplyRequest(rendered, cfg({ appearance: undefined })).ghosttyReload,
    ).toBe(false)
    expect(
      themeApplyRequest(
        rendered,
        cfg({ appearance: { ghostty: true } as never }),
      ).ghosttyReload,
    ).toBe(true)
    // The OSC payload rides along regardless — it is the zero-consent baseline.
    expect(themeApplyRequest(rendered, cfg({})).osc).toContain('\x1b]11;')
  })
})
