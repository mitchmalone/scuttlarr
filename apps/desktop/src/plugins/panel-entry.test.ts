import { describe, expect, it, vi } from 'vitest'

import { pluginPanelEntry } from './panel-entry'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))

const info = { title: 'T', hint: 'h', aliases: [], triggers: [] }

describe('pluginPanelEntry', () => {
  it('keeps one component identity across rebuilds and settings changes', () => {
    const a = pluginPanelEntry({ id: 'x' }, info, { k: '1' })
    const b = pluginPanelEntry({ id: 'x' }, info, { k: '2' })
    const other = pluginPanelEntry({ id: 'y' }, info, {})
    expect(a.component).toBe(b.component)
    expect(a.component).toBe(other.component)
  })
  it('carries id and settings as data', () => {
    const e = pluginPanelEntry({ id: 'x' }, info, { k: '1' })
    expect(e.props).toEqual({ id: 'x', settings: { k: '1' } })
  })
})
