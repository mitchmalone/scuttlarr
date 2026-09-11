# Keyboard. Fast repeat, no accent popup, no "smart" anything, Tab reaches
# every control.

# Tab moves focus between all controls (dialog buttons included)
sc_default NSGlobalDomain AppleKeyboardUIMode int 3

# Holding a key repeats it; no accent popup
sc_default NSGlobalDomain ApplePressAndHoldEnabled bool false

# Fast repeat
sc_default NSGlobalDomain KeyRepeat int 2
sc_default NSGlobalDomain InitialKeyRepeat int 15

# Autocorrect and smart-anything off, everywhere
sc_default NSGlobalDomain NSAutomaticCapitalizationEnabled bool false
sc_default NSGlobalDomain NSAutomaticDashSubstitutionEnabled bool false
sc_default NSGlobalDomain NSAutomaticPeriodSubstitutionEnabled bool false
sc_default NSGlobalDomain NSAutomaticQuoteSubstitutionEnabled bool false
sc_default NSGlobalDomain NSAutomaticSpellingCorrectionEnabled bool false
sc_default NSGlobalDomain NSAutomaticInlinePredictionEnabled bool false

# ⌥Space types a plain space, not a non-breaking one — launcharr's hotkey is
# ⌥Space and a stray U+00A0 in a terminal is a classic. A generated file: the
# first entry in the manifest on most machines.
sc_file_generated "$HOME/Library/KeyBindings/DefaultKeyBinding.dict" keyboard <<'DICT'
{
  "~ " = ("insertText:", " ");
}
DICT
