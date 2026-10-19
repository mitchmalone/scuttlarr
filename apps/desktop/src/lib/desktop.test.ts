import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Config } from './config'
import { applyDesktop, planDesktop } from './desktop'

const invoke = vi.hoisted(() => vi.fn())
vi.mock('@tauri-apps/api/core', () => ({ invoke }))

// What a fresh install's config.json gives the webview: `desktop` is `{}`.
const fresh = {
  theme: 'scuttlarr',
  themes: {},
  bar: { enabled: true, layout: { left: [], center: [], right: [] } },
  desktop: {},
} as unknown as Config

describe('a fresh install', () => {
  beforeEach(() => invoke.mockReset().mockResolvedValue({}))

  it('plans no aerospace.toml and no borders', () => {
    expect(planDesktop(fresh)).toEqual({ toml: null, bordersArgs: null })
  })

  it('never probes for AeroSpace (invariant 12)', async () => {
    await applyDesktop(fresh)
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith('desktop_apply', {
      req: { toml: null, bordersArgs: null },
    })
  })

  it('an upgrader with tiling pinned on still gets the toml', async () => {
    const pinned = {
      ...fresh,
      desktop: { tiling: { enabled: true } },
    } as Config
    expect(planDesktop(pinned).toml).toContain('scuttlarr')
    await applyDesktop(pinned)
    expect(invoke).toHaveBeenCalledWith('desktop_status')
  })
})
