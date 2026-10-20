import { describe, expect, it, vi } from 'vitest'

import { type Config, DEFAULT_AGENTS_CONFIG } from './config'
import {
  type SetupChoices,
  applySetup,
  choicesFrom,
  chooseSetup,
  followConfig,
  recapLines,
  recommendedChoices,
  skipStep,
  stepAfter,
  stepBefore,
} from './onboarding'

const cfg = (over: Partial<Config> = {}): Config =>
  ({
    hotkey: 'Alt+Space',
    theme: 'scuttlarr',
    themes: {},
    bar: { enabled: true, layout: { left: [], center: [], right: [] } },
    agents: { ...DEFAULT_AGENTS_CONFIG },
    desktop: undefined,
    appearance: {
      everywhere: false,
      macos: true,
      editors: false,
      ghostty: false,
    },
    setupPending: true,
    ...over,
  }) as unknown as Config

const choices = (over: Partial<SetupChoices> = {}): SetupChoices => ({
  ...choicesFrom(cfg()),
  ...over,
})

const noPick = () => {
  throw new Error('theme unchanged: pickTheme must not run')
}

describe('choicesFrom', () => {
  it('reads every answer from the config as it stands', () => {
    const c = cfg({
      hotkey: 'Cmd+Shift+Space',
      theme: 'dracula',
      bar: { enabled: false } as Config['bar'],
      agents: {
        ...DEFAULT_AGENTS_CONFIG,
        monitor: true,
        usage: true,
        claudeCreds: true,
      },
      appearance: { everywhere: true } as never,
      desktop: { tiling: { enabled: true } } as Config['desktop'],
    })
    expect(choicesFrom(c)).toEqual({
      hotkey: 'Cmd+Shift+Space',
      bar: false,
      agents: true,
      limits: true,
      theme: 'dracula',
      match: true,
      tiling: true,
      themePicked: false,
    })
  })

  it('needs both the usage monitor and creds before limits read as on', () => {
    const c = cfg({ agents: { ...DEFAULT_AGENTS_CONFIG, usage: true } })
    expect(choicesFrom(c).limits).toBe(false)
  })
})

describe('recommendedChoices', () => {
  it('suggests watching agents and matching the theme on a fresh install', () => {
    const r = recommendedChoices(cfg())
    expect(r).toMatchObject({
      bar: true,
      agents: true,
      match: true,
      tiling: false,
      limits: false,
    })
  })

  it('suggests nothing beyond the config when setup is run again', () => {
    expect(recommendedChoices(cfg({ setupPending: false }))).toEqual(
      choicesFrom(cfg()),
    )
  })
})

describe('steps', () => {
  it('walks welcome to done and stops at both ends', () => {
    expect(stepAfter('welcome')).toBe('hotkey')
    expect(stepAfter('tiling')).toBe('ready')
    expect(stepAfter('ready')).toBe('done')
    expect(stepAfter('done')).toBe('done')
    expect(stepBefore('hotkey')).toBe('welcome')
    expect(stepBefore('welcome')).toBe('welcome')
  })

  it('skipping a step puts back its starting answer and leaves the rest', () => {
    const base = choicesFrom(cfg())
    const picked = choices({ agents: true, limits: true, bar: false })
    expect(skipStep('agents', picked, base)).toEqual({
      ...picked,
      agents: false,
      limits: false,
    })
    expect(skipStep('bar', picked, base).bar).toBe(true)
    expect(skipStep('welcome', picked, base)).toEqual(picked)
  })
})

describe('theme tracking', () => {
  it('an unpicked theme follows the config while setup is open', () => {
    const open = choices({ bar: false })
    const next = followConfig(open, cfg({ theme: 'solarized-light' }))
    expect(next).toEqual({ ...open, theme: 'solarized-light' })
  })

  it('follows back from light to dark too', () => {
    const light = choices({ theme: 'solarized-light' })
    expect(followConfig(light, cfg({ theme: 'scuttlarr' })).theme).toBe(
      'scuttlarr',
    )
  })

  it('keeps the same object when the config theme did not move', () => {
    const open = choices()
    expect(followConfig(open, cfg())).toBe(open)
  })

  it('a theme picked on the theme screen wins over a config change', () => {
    const picked = chooseSetup(choices(), { theme: 'nord' })
    expect(picked.themePicked).toBe(true)
    expect(followConfig(picked, cfg({ theme: 'solarized-light' })).theme).toBe(
      'nord',
    )
  })

  it('only a theme pick counts as picking a theme', () => {
    const c = chooseSetup(choices(), { match: false, bar: false })
    expect(c).toMatchObject({ match: false, bar: false, themePicked: false })
  })

  it('esc on the theme screen drops the pick and follows the config again', () => {
    const base = followConfig(choicesFrom(cfg()), cfg({ theme: 'dracula' }))
    const picked = chooseSetup(choices(), { theme: 'nord' })
    const skipped = skipStep('theme', picked, base)
    expect(skipped).toMatchObject({ theme: 'dracula', themePicked: false })
    expect(followConfig(skipped, cfg({ theme: 'gruvbox' })).theme).toBe(
      'gruvbox',
    )
  })
})

describe('applySetup', () => {
  it('writes the hotkey, the bar and clears the pending flag', () => {
    const next = applySetup(
      cfg(),
      choices({ hotkey: 'Ctrl+Space', bar: false }),
      noPick,
    )
    expect(next.hotkey).toBe('Ctrl+Space')
    expect(next.bar.enabled).toBe(false)
    expect(next.bar.layout).toEqual({ left: [], center: [], right: [] })
    expect(next.setupPending).toBe(false)
  })

  it('turns on the monitor, and usage plus creds only when limits are asked for', () => {
    const watch = applySetup(cfg(), choices({ agents: true }), noPick)
    expect(watch.agents).toMatchObject({
      monitor: true,
      usage: false,
      claudeCreds: false,
    })
    const limits = applySetup(
      cfg(),
      choices({ agents: true, limits: true }),
      noPick,
    )
    expect(limits.agents).toMatchObject({
      monitor: true,
      usage: true,
      claudeCreds: true,
    })
  })

  it('leaves the token monitor alone when limits are not asked for', () => {
    const c = cfg({ agents: { ...DEFAULT_AGENTS_CONFIG, usage: true } })
    const next = applySetup(c, choicesFrom(c), noPick)
    expect(next.agents.usage).toBe(true)
    expect(next.agents.claudeCreds).toBe(false)
  })

  it('never reads credentials with agent tracking off', () => {
    const next = applySetup(
      cfg(),
      choices({ agents: false, limits: true }),
      noPick,
    )
    expect(next.agents).toMatchObject({ monitor: false, claudeCreds: false })
  })

  it('picks a new theme the way Settings does', () => {
    const pick = vi.fn((_c: Config, theme: string) => ({
      theme,
      appearance: { pair: { light: theme, dark: theme } } as never,
    }))
    const next = applySetup(
      cfg(),
      chooseSetup(choices(), { theme: 'nord' }),
      pick,
    )
    expect(pick).toHaveBeenCalledWith(expect.anything(), 'nord')
    expect(next.theme).toBe('nord')
    expect(next.appearance).toMatchObject({
      pair: { light: 'nord', dark: 'nord' },
    })
  })

  it('never writes back a theme setup opened on when the config moved since', () => {
    const fresh = cfg({ theme: 'solarized-light' })
    const next = applySetup(fresh, choices({ theme: 'scuttlarr' }), noPick)
    expect(next.theme).toBe('solarized-light')
  })

  it('a picked theme wins over a config change made during setup', () => {
    const pick = vi.fn((_c: Config, theme: string) => ({
      theme,
      appearance: {} as never,
    }))
    const picked = chooseSetup(choices(), { theme: 'scuttlarr' })
    const next = applySetup(cfg({ theme: 'solarized-light' }), picked, pick)
    expect(pick).toHaveBeenCalledWith(expect.anything(), 'scuttlarr')
    expect(next.theme).toBe('scuttlarr')
  })

  it('matching the theme turns the rung and editors on, and off again', () => {
    const on = applySetup(cfg(), choices({ match: true }), noPick)
    expect(on.appearance).toMatchObject({
      everywhere: true,
      editors: true,
      macos: true,
      ghostty: false,
    })
    const off = applySetup(on, choices({ match: false }), noPick)
    expect(off.appearance).toMatchObject({ everywhere: false, editors: false })
  })

  it('writes tiling into the whole desktop block, as Settings does', () => {
    const c = cfg({
      desktop: { borders: { enabled: true } } as Config['desktop'],
    })
    const next = applySetup(c, choices({ tiling: true }), noPick)
    const desktop = next.desktop as {
      tiling: { enabled: boolean }
      borders: { enabled: boolean }
    }
    expect(desktop.tiling.enabled).toBe(true)
    expect(desktop.borders.enabled).toBe(true)
  })
})

describe('recapLines', () => {
  it('says what will be on and what stays off, in plain words', () => {
    const lines = recapLines(
      choices({
        agents: true,
        limits: true,
        theme: 'tokyo-night',
        match: true,
        bar: true,
      }),
    )
    expect(lines).toEqual([
      { on: true, text: '⌥ Space opens scuttlarr' },
      { on: true, text: 'The scuttlarr menu bar' },
      { on: true, text: 'Watching your agents, with usage limits' },
      { on: true, text: 'tokyo-night in Ghostty, tmux and your editors' },
      { on: false, text: 'No tiling' },
    ])
  })

  it('names the off choices', () => {
    const lines = recapLines(
      choices({ bar: false, agents: false, match: false, tiling: true }),
    )
    expect(lines.map((l) => l.text)).toEqual([
      '⌥ Space opens scuttlarr',
      'The macOS menu bar stays',
      'Agent tracking off',
      'scuttlarr, in scuttlarr only',
      'Tiling with AeroSpace',
    ])
  })
})
