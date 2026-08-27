import { describe, expect, it } from 'vitest'

import {
  type PluginState,
  isPluginModuleId,
  pluginIdOf,
  pluginModuleId,
  pluginPanelInfo,
} from './plugins'

const plugin = (over: Partial<PluginState>): PluginState => ({
  id: 'x',
  name: 'X',
  version: '1.0.0',
  description: '',
  kinds: ['bar-widget'],
  zone: 'right',
  icon: null,
  firstParty: false,
  enabled: true,
  hasCell: false,
  hasPanel: false,
  hasService: false,
  interval: null,
  builtAt: null,
  buildError: null,
  state: null,
  error: null,
  lastOk: null,
  updatedAt: null,
  restarts: 0,
  running: false,
  panel: null,
  ...over,
})

describe('plugin module ids', () => {
  it('round-trips through the layout slot form', () => {
    expect(pluginModuleId('usage')).toBe('plugin:usage')
    expect(isPluginModuleId('plugin:usage')).toBe(true)
    expect(isPluginModuleId('widget:usage')).toBe(false)
    expect(pluginIdOf('plugin:usage')).toBe('usage')
    expect(pluginIdOf('clock')).toBeNull()
  })
})

describe('pluginPanelInfo', () => {
  it('is absent for a plugin with no panel', () => {
    expect(pluginPanelInfo(plugin({}))).toBeNull()
  })

  it('takes copy from the manifest, falling back to the name', () => {
    expect(
      pluginPanelInfo(plugin({ kinds: ['panel'], hasPanel: true })),
    ).toEqual({
      id: 'x',
      title: 'X',
      hint: 'x ▸',
      triggers: [],
      aliases: [],
    })
    expect(
      pluginPanelInfo(
        plugin({
          kinds: ['panel'],
          hasPanel: true,
          panel: { title: 'Usage', hint: 'token monitor ▸', triggers: ['u'] },
        }),
      ),
    ).toMatchObject({
      title: 'Usage',
      hint: 'token monitor ▸',
      triggers: ['u'],
    })
  })
})
