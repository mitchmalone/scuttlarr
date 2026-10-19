import { BUILTIN_THEMES } from '@scuttlarr/tui/themes'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  pageVars,
  themeBootScript,
  themeLabel,
  themeTokens,
} from './page-theme'

const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i
const COLOR_KEYS = [
  '--bg',
  '--bg2',
  '--chip',
  '--border',
  '--hair',
  '--fg',
  '--body',
  '--muted',
  '--dim',
  '--dim2',
  '--accent',
  '--accent2',
  '--green',
  '--amber',
  '--danger',
  '--cta',
  '--cta-hover',
  '--cta-fg',
]

function runBoot(stored: string | null) {
  const set: Record<string, string> = {}
  const root = {
    style: { setProperty: (k: string, v: string) => (set[k] = v) },
    dataset: {} as Record<string, string>,
  }
  new Function('localStorage', 'document', themeBootScript())(
    { getItem: (k: string) => (k === THEME_STORAGE_KEY ? stored : null) },
    { documentElement: root },
  )
  return { set, dataset: root.dataset }
}

describe('pageVars', () => {
  it.each(Object.keys(BUILTIN_THEMES))('maps %s to hex page tokens', (name) => {
    const v = pageVars(BUILTIN_THEMES[name]!)
    for (const k of COLOR_KEYS) expect(v[k], k).toMatch(HEX)
    expect(v['--cta']).toBe(BUILTIN_THEMES[name]!.accent)
    expect(v['--panel']).toBe(BUILTIN_THEMES[name]!.glass)
  })

  it('reads light or dark from the ground', () => {
    expect(pageVars(BUILTIN_THEMES['solarized-light']!)['color-scheme']).toBe(
      'light',
    )
    expect(pageVars(BUILTIN_THEMES.scuttlarr!)['color-scheme']).toBe('dark')
    expect(pageVars(BUILTIN_THEMES.scuttlarr!)['--logo']).toBe('invert(1)')
  })

  it('darkens fg only on light themes', () => {
    expect(pageVars(BUILTIN_THEMES.scuttlarr!)['--fg']).toBe(
      BUILTIN_THEMES.scuttlarr!.fg,
    )
    const sol = BUILTIN_THEMES['solarized-light']!
    expect(pageVars(sol)['--fg']).not.toBe(sol.fg)
  })

  it('falls back to the default for an unknown name', () => {
    expect(themeTokens('nope')).toBe(BUILTIN_THEMES[DEFAULT_THEME])
  })
})

describe('themeLabel', () => {
  it('title-cases slugs and keeps scuttlarr lowercase', () => {
    expect(themeLabel('tokyo-night')).toBe('Tokyo Night')
    expect(themeLabel('solarized-light')).toBe('Solarized Light')
    expect(themeLabel('nord')).toBe('Nord')
    expect(themeLabel('scuttlarr')).toBe('scuttlarr')
  })
})

describe('themeBootScript', () => {
  it('applies a stored theme before paint', () => {
    const { set, dataset } = runBoot('tokyo-night')
    expect(set).toEqual(pageVars(BUILTIN_THEMES['tokyo-night']!))
    expect(dataset.appTheme).toBe('tokyo-night')
  })

  it('leaves the server-rendered default alone otherwise', () => {
    for (const stored of [null, 'not-a-theme']) {
      const { set, dataset } = runBoot(stored)
      expect(set).toEqual({})
      expect(dataset.appTheme).toBeUndefined()
    }
  })
})
