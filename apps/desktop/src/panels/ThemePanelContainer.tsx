import { resolveAppearance } from '@scuttlarr/core/appearance'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'

import { pickTheme, pickThemeOther, policyInputs } from '../lib/appearance-ui'
import type { Config } from '../lib/config'
import { appearanceOf } from '../lib/theme'
import {
  type AppearanceInputs,
  appearanceInputs,
} from '../lib/use-appearance-policy'
import { useMergedThemes } from '../lib/user-themes'
import { ThemePanel } from './ThemePanel'

const EMPTY_THEMES = { themes: {} }

/** One fetch of config + policy inputs on open; ⏎ writes the pick and closes. */
export function ThemePanelContainer({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [inputs, setInputs] = useState<AppearanceInputs | null>(null)

  useEffect(() => {
    invoke<Config>('read_config').then(setConfig).catch(console.error)
    appearanceInputs().then(setInputs).catch(console.error)
  }, [])

  const merged = useMergedThemes(config ?? EMPTY_THEMES)
  if (!config) return null
  const appearance = appearanceOf(config)
  const focusName =
    inputs?.modes.find((m) => m.id === inputs.focusMode)?.name ??
    inputs?.focusMode ??
    null

  return (
    <ThemePanel
      current={config.theme}
      themes={merged}
      mode={appearance.mode}
      focusName={focusName}
      dark={resolveAppearance(appearance, policyInputs(inputs)).dark}
      onPick={(name, how) => {
        const next =
          how === 'other'
            ? { ...config, ...pickThemeOther(config, inputs, name) }
            : { ...config, ...pickTheme(config, inputs, name) }
        invoke('write_config', { config: next })
          .then(onClose)
          .catch(console.error)
      }}
      onClose={onClose}
    />
  )
}
