import { defineStories } from '@scuttlarr/tui'
import '@scuttlarr/tui/launcher.css'
import { useState } from 'react'

import {
  SETUP_STEPS,
  type SetupChoices,
  type SetupStep,
  stepAfter,
  stepBefore,
} from '../lib/onboarding'
import { OnboardingPanel } from './OnboardingPanel'

const noop = () => {}

const CHOICES: SetupChoices = {
  hotkey: 'Alt+Space',
  bar: true,
  agents: true,
  limits: false,
  theme: 'scuttlarr',
  match: true,
  tiling: false,
  themePicked: false,
}

/** The panel window at setup size, as App renders it. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="panel panel-mode onboarding-mode"
      style={{ height: 500, display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </div>
  )
}

function Still({
  step,
  choices = CHOICES,
  tried = false,
  notes = [],
}: {
  step: SetupStep
  choices?: SetupChoices
  tried?: boolean
  notes?: string[]
}) {
  return (
    <Frame>
      <OnboardingPanel
        step={step}
        choices={choices}
        themes={{}}
        hotkeyTried={tried}
        hotkeyChanged={false}
        aerospaceMissing={false}
        visible
        notes={notes}
        onNext={noop}
        onBack={noop}
        onSkip={noop}
        onChoose={noop}
        onTryHotkey={noop}
      />
    </Frame>
  )
}

/** Every key live: walk the whole flow without the app. */
function Live() {
  const [step, setStep] = useState<SetupStep>('welcome')
  const [choices, setChoices] = useState(CHOICES)
  return (
    <Frame>
      <OnboardingPanel
        step={step}
        choices={choices}
        themes={{}}
        hotkeyTried={false}
        hotkeyChanged={choices.hotkey !== CHOICES.hotkey}
        aerospaceMissing={false}
        visible
        notes={[]}
        onNext={() => setStep(step === 'done' ? 'welcome' : stepAfter(step))}
        onBack={() => setStep(stepBefore(step))}
        onSkip={() => setStep(stepAfter(step))}
        onChoose={(patch) => setChoices({ ...choices, ...patch })}
        onTryHotkey={noop}
      />
    </Frame>
  )
}

export const onboardingPanelStories = defineStories('OnboardingPanel (app)', [
  {
    name: 'live — walk every step',
    keys: '⏎ next · ← → choose · space ticks · ⌫ back · esc skip',
    notes:
      'Click the panel first so it has the keyboard. Use the panel 640 viewport.',
    render: () => <Live />,
  },
  ...SETUP_STEPS.map((step) => ({
    name: step,
    render: () => <Still step={step} />,
  })),
  {
    name: 'hotkey — tried',
    render: () => <Still step="hotkey" tried />,
  },
  {
    name: 'agents — off',
    render: () => (
      <Still step="agents" choices={{ ...CHOICES, agents: false }} />
    ),
  },
  {
    name: 'done — with a note',
    render: () => (
      <Still
        step="done"
        notes={[
          'Tiling is on, but AeroSpace isn’t installed. Settings → Desktop installs it.',
        ]}
      />
    ),
  },
])
