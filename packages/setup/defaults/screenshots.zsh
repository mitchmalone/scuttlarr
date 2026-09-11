# Screenshots. PNG into ~/Downloads, no shadow, no floating thumbnail.

sc_default com.apple.screencapture location string "${HOME}/Downloads"
sc_default com.apple.screencapture type string png
sc_default com.apple.screencapture disable-shadow bool true
sc_default com.apple.screencapture show-thumbnail bool false
