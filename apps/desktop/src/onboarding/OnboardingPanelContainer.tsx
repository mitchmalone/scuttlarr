import { applyTheme } from '@scuttlarr/tui'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useRef, useState } from 'react'

import { pickTheme } from '../lib/appearance-ui'
import type { Config } from '../lib/config'
import { updateConfig } from '../lib/config-write'
import { desktopStatus } from '../lib/desktop'
import { hooksInstall, hooksSettled } from '../lib/hooks'
import {
  type SetupChoices,
  type SetupStep,
  applySetup,
  choicesFrom,
  chooseSetup,
  followConfig,
  recommendedChoices,
  skipStep,
  stepAfter,
  stepBefore,
} from '../lib/onboarding'
import { applyThemeEverywhere } from '../lib/theme'
import {
  type AppearanceInputs,
  appearanceInputs,
} from '../lib/use-appearance-policy'
import { useMergedThemes } from '../lib/user-themes'
import { OnboardingPanel } from './OnboardingPanel'

const EMPTY_THEMES = { themes: {} }
const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

/**
 * Setup's I/O: one read of config on open (then its changes, which an unpicked
 * theme follows), the theme preview while you browse,
 * the hotkey try (hide, then back), and the single write on the last Enter.
 * Putting setup off (esc on welcome or ready) only clears `setupPending`.
 */
export function OnboardingPanelContainer({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [inputs, setInputs] = useState<AppearanceInputs | null>(null)
  const [base, setBase] = useState<SetupChoices | null>(null)
  const [choices, setChoices] = useState<SetupChoices | null>(null)
  const [step, setStep] = useState<SetupStep>('welcome')
  const [tried, setTried] = useState(false)
  const [visible, setVisible] = useState(true)
  const [aerospaceMissing, setAerospaceMissing] = useState(false)
  const [notes, setNotes] = useState<string[]>([])
  const root = useRef<HTMLDivElement>(null)
  const themes = useMergedThemes(config ?? EMPTY_THEMES)

  useEffect(() => {
    invoke<Config>('read_config')
      .then((c) => {
        setConfig(c)
        setBase(choicesFrom(c))
        setChoices(recommendedChoices(c))
      })
      .catch(console.error)
    appearanceInputs().then(setInputs).catch(console.error)
    desktopStatus()
      .then((s) => setAerospaceMissing(!s.aerospace.path))
      .catch(console.error)
  }, [])

  // The theme can change under setup (macOS appearance, a Focus, Settings, a hand
  // edit). Setup owns the panel theme while open (App stands back), so an unpicked
  // theme follows here, and the field and the panel move together.
  useEffect(() => {
    const off = listen<Config>('config-changed', (e) => {
      const c = e.payload
      setConfig(c)
      setBase((b) => b && followConfig(b, c))
      setChoices((ch) => ch && followConfig(ch, c))
    })
    return () => {
      off.then((un) => un()).catch(console.error)
    }
  }, [])

  // Keys land on the panel, not the (unmounted) prompt.
  useEffect(() => {
    if (choices) root.current?.focus()
  }, [choices === null, step]) // eslint-disable-line react-hooks/exhaustive-deps

  // The hotkey try: the summon hotkey hides the panel and brings it back.
  const stepRef = useRef(step)
  stepRef.current = step
  useEffect(() => {
    let hiddenOnHotkey = false
    const off = [
      listen('panel-hidden', () => {
        setVisible(false)
        hiddenOnHotkey = stepRef.current === 'hotkey'
      }),
      listen('panel-shown', () => {
        setVisible(true)
        if (hiddenOnHotkey && stepRef.current === 'hotkey') setTried(true)
        setTimeout(() => root.current?.focus(), 0)
      }),
    ]
    return () => off.forEach((p) => p.then((un) => un()).catch(console.error))
  }, [])

  // Live preview: the panel wears the theme you're on (the field's theme too);
  // leaving puts back what applies.
  const applied = useRef(false)
  const previewing = choices?.theme
  useEffect(() => {
    if (previewing) applyTheme(previewing, themes, 'panel')
  }, [previewing, themes])
  const restore = useRef<() => void>(() => {})
  restore.current = () => {
    if (!config || !choices) return
    applyTheme(applied.current ? choices.theme : config.theme, themes, 'panel')
  }
  useEffect(() => () => restore.current(), [])

  const putOff = useCallback(() => {
    updateConfig((c) => ({ ...c, setupPending: false }))
      .catch(console.error)
      .finally(onClose)
  }, [onClose])

  const apply = useCallback(async () => {
    if (!config || !choices || !base) return
    const out: string[] = []
    let written: Config
    try {
      written = await updateConfig((c) =>
        applySetup(c, choices, (cc, theme) => pickTheme(cc, inputs, theme)),
      )
    } catch (e) {
      setNotes([`Couldn't save setup: ${message(e)}`])
      return
    }
    applied.current = true
    if (choices.agents && !base.agents) {
      // Watching agents needs the Claude hook; boot only mends it when the monitor
      // was already on, so register it now (Settings → Agents does the same).
      await hooksInstall()
        .then((s) => {
          if (!hooksSettled(s))
            out.push(
              'The Claude hook is not registered for every account yet. Settings → Agents shows which.',
            )
        })
        .catch((e) =>
          out.push(
            `Couldn't register the Claude hook: ${message(e)}. Settings → Agents can retry.`,
          ),
        )
    }
    // A new theme name fans out from App; turning the rung on alone does not.
    if (choices.match && !base.match && written.theme === config.theme) {
      await applyThemeEverywhere(written).catch((e) =>
        out.push(`The theme didn't reach every app: ${message(e)}`),
      )
    }
    if (choices.tiling && aerospaceMissing) {
      out.push(
        "Tiling is on, but AeroSpace isn't installed. Settings → Desktop installs it.",
      )
    }
    setNotes(out)
    setStep('done')
  }, [config, choices, base, inputs, aerospaceMissing])

  if (!choices || !base) return null

  return (
    <OnboardingPanel
      step={step}
      choices={choices}
      themes={themes}
      hotkeyTried={tried}
      hotkeyChanged={choices.hotkey !== base.hotkey}
      aerospaceMissing={aerospaceMissing}
      visible={visible}
      notes={notes}
      rootRef={root}
      onNext={() => {
        if (step === 'ready') void apply()
        else if (step === 'done') onClose()
        else setStep(stepAfter(step))
      }}
      onBack={() => {
        if (step !== 'done') setStep(stepBefore(step))
      }}
      onSkip={() => {
        if (step === 'welcome' || step === 'ready') putOff()
        else if (step === 'done') onClose()
        else {
          setChoices(skipStep(step, choices, base))
          setStep(stepAfter(step))
        }
      }}
      onChoose={(patch) => setChoices(chooseSetup(choices, patch))}
      onTryHotkey={() => {
        invoke('hide_panel').catch(console.error)
      }}
    />
  )
}
