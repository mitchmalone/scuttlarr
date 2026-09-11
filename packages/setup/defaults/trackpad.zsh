# Trackpad. Tap to click, bottom-right corner is a right-click.

sc_default com.apple.driver.AppleBluetoothMultitouch.trackpad Clicking bool true
sc_default -currentHost NSGlobalDomain com.apple.mouse.tapBehavior int 1
sc_default NSGlobalDomain com.apple.mouse.tapBehavior int 1

sc_default com.apple.driver.AppleBluetoothMultitouch.trackpad TrackpadCornerSecondaryClick int 2
sc_default com.apple.driver.AppleBluetoothMultitouch.trackpad TrackpadRightClick bool true
sc_default -currentHost NSGlobalDomain com.apple.trackpad.trackpadCornerClickBehavior int 1
sc_default -currentHost NSGlobalDomain com.apple.trackpad.enableSecondaryClick bool true
