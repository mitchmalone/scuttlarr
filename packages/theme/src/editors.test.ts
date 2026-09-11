import { describe, expect, it } from 'vitest'

import {
  DEFAULT_EDITOR_THEMES,
  EDITOR_THEME_KEYS,
  RENDERED_EDITOR_THEME,
  editorThemesFor,
} from './editors.ts'

describe('editorThemesFor', () => {
  it('maps every built-in in the table to its editor ports', () => {
    expect(editorThemesFor('dracula')).toEqual({
      vscode_theme: 'scuttlarr',
      neovim_colorscheme: 'dracula',
      helix_theme: 'dracula',
    })
    expect(editorThemesFor('tokyo-night').neovim_colorscheme).toBe('tokyonight')
    expect(editorThemesFor('rose-pine').helix_theme).toBe('rose_pine')
    expect(editorThemesFor('one-dark').neovim_colorscheme).toBe('onedark')
    expect(editorThemesFor('catppuccin').helix_theme).toBe('catppuccin_mocha')
    expect(editorThemesFor('solarized').helix_theme).toBe('solarized_dark')
    expect(editorThemesFor('solarized-light').helix_theme).toBe(
      'solarized_light',
    )
    expect(editorThemesFor('solarized-light').neovim_colorscheme).toBe(
      'solarized',
    )
  })

  it('falls back to default for a theme with no port', () => {
    expect(editorThemesFor('scuttlarr')).toEqual({
      vscode_theme: RENDERED_EDITOR_THEME,
      neovim_colorscheme: 'default',
      helix_theme: 'default',
    })
  })

  it('lets colors.toml override any key, ignoring empty strings', () => {
    const out = editorThemesFor('dracula', {
      neovim_colorscheme: 'dracula-soft',
      helix_theme: '',
      vscode_theme: 'Dracula Pro',
    })
    expect(out).toEqual({
      vscode_theme: 'Dracula Pro',
      neovim_colorscheme: 'dracula-soft',
      helix_theme: 'dracula',
    })
  })

  it('the table only names editor themes that are plain identifiers', () => {
    for (const [name, t] of Object.entries(DEFAULT_EDITOR_THEMES)) {
      expect(name).toMatch(/^[a-z-]+$/)
      expect(t.neovim).toMatch(/^[a-z0-9_-]+$/)
      expect(t.helix).toMatch(/^[a-z0-9_-]+$/)
    }
    expect(EDITOR_THEME_KEYS).toHaveLength(3)
  })
})
