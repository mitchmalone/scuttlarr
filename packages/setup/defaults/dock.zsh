# Dock. Can't be removed, so park it: autohidden with a reveal delay long enough
# that it never appears. launcharr launches, AeroSpace switches.

sc_default com.apple.dock autohide bool true
sc_default com.apple.dock autohide-delay float 1000
sc_default com.apple.dock autohide-time-modifier float 0

# Only running apps, no recents, small
sc_default com.apple.dock static-only bool true
sc_default com.apple.dock show-recents bool false
sc_default com.apple.dock tilesize int 48

# Minimise into the app icon (one Dock tile per app)
sc_default com.apple.dock minimize-to-application bool true

# Spaces: never rearrange by recent use; group windows by app in Mission Control
sc_default com.apple.dock mru-spaces bool false
sc_default com.apple.dock expose-group-apps bool true
