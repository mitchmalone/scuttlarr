# Finder. List view, extensions shown, path and status bars, opens at ~,
# no .DS_Store litter on network/USB volumes, no nag dialogs.

sc_default com.apple.finder FXPreferredViewStyle string Nlsv
sc_default NSGlobalDomain AppleShowAllExtensions bool true
sc_default NSGlobalDomain NSTableViewDefaultSizeMode int 1

sc_default com.apple.finder NewWindowTarget string PfHm
sc_default com.apple.finder NewWindowTargetPath string "file://${HOME}/"

sc_default com.apple.finder ShowPathbar bool true
sc_default com.apple.finder ShowStatusBar bool true
sc_default com.apple.finder _FXSortFoldersFirst bool true
sc_default com.apple.finder FXDefaultSearchScope string SCcf

# Save and print panels expanded by default
sc_default NSGlobalDomain NSNavPanelExpandedStateForSaveMode bool true
sc_default NSGlobalDomain PMPrintingExpandedStateForPrint bool true

sc_default com.apple.desktopservices DSDontWriteNetworkStores bool true
sc_default com.apple.desktopservices DSDontWriteUSBStores bool true

sc_default com.apple.finder FXEnableExtensionChangeWarning bool false
sc_default com.apple.finder WarnOnEmptyTrash bool false
