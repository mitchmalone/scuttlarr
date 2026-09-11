# De-shine. If macOS added it to look nice, it's off (README principle 2).
# Liquid Glass, Stage Manager, Apple's own tiling, desktop icons, Siri in the
# menu bar, window animations — the desktop layer is launcharr + AeroSpace.

# Reduce transparency (kills the glass) and motion. These two are the one
# known exception to invariant 5: com.apple.universalaccess writes need the
# terminal to have Full Disk Access; without it they fail and doctor says so.
sc_default com.apple.universalaccess reduceTransparency bool true
sc_default com.apple.universalaccess reduceMotion bool true

# Stage Manager off
sc_default com.apple.WindowManager GloballyEnabled bool false

# Apple's edge-drag / menu tiling off — AeroSpace owns layout
sc_default com.apple.WindowManager EnableTilingByEdgeDrag bool false
sc_default com.apple.WindowManager EnableTopTilingByEdgeDrag bool false
sc_default com.apple.WindowManager EnableTilingOptionAccelerator bool false
sc_default com.apple.WindowManager EnableTiledWindowMargins bool false

# Clicking the wallpaper never hides windows
sc_default com.apple.WindowManager EnableStandardClickToShowDesktop bool false

# No desktop icons — tiling makes the desktop meaningless
sc_default com.apple.finder CreateDesktop bool false

# Siri / Apple Intelligence out of the menu bar
sc_default com.apple.Siri StatusMenuVisible bool false
sc_default com.apple.assistant.support "Assistant Enabled" bool false

# Animations: none on window open/close, Quick Look, Mission Control, Dock launch
sc_default NSGlobalDomain NSAutomaticWindowAnimationsEnabled bool false
sc_default NSGlobalDomain QLPanelAnimationDuration float 0
sc_default com.apple.dock expose-animation-duration float 0.1
sc_default com.apple.dock launchanim bool false
