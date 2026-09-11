# Security and privacy — the user-level half. Firewall, Gatekeeper and the
# diagnostics opt-out need sudo and live in the (future) system layer.

# Password immediately after sleep or screen saver
sc_default com.apple.screensaver askForPassword int 1
sc_default com.apple.screensaver askForPasswordDelay int 0

# No crash reporter dialogs
sc_default com.apple.CrashReporter DialogType string none

# No "downloaded from the internet, are you sure?" dialog (Gatekeeper still runs)
sc_default com.apple.LaunchServices LSQuarantine bool false

# Terminal.app: secure keyboard entry, UTF-8 only
sc_default com.apple.terminal SecureKeyboardEntry bool true
sc_default com.apple.terminal StringEncodings array 4

# Time Machine never offers a new disk
sc_default com.apple.TimeMachine DoNotOfferNewDisksForBackup bool true

# Inactive apps are not terminated behind your back
sc_default NSGlobalDomain NSDisableAutomaticTermination bool true
