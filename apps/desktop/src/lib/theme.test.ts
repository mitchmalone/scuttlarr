import { describe, expect, it } from 'vitest'

import type { Config } from './config'
import { appearanceOf, flipsMacos, policyConfigured } from './theme'

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
