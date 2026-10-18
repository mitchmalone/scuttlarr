import type { PluginState } from '@scuttlarr/tui/plugins'
import { describe, expect, it, vi } from 'vitest'

import { samePlugins } from './use-plugins'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))

const p = (over: Partial<PluginState> = {}) =>
  ({ id: 'x', name: 'X', enabled: true, ...over }) as unknown as PluginState

describe('samePlugins', () => {
  it('treats a structurally equal payload as unchanged', () => {
    expect(samePlugins([p()], [p()])).toBe(true)
  })
  it('sees a changed field or length', () => {
    expect(samePlugins([p()], [p({ enabled: false })])).toBe(false)
    expect(samePlugins([p()], [])).toBe(false)
  })
})
