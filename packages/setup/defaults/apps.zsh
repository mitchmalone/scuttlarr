# Apple's own apps, made boring: TextEdit is a plain-text editor, Activity
# Monitor opens showing everything by CPU, updates are automatic.

sc_default com.apple.TextEdit RichText int 0
sc_default com.apple.TextEdit PlainTextEncoding int 4
sc_default com.apple.TextEdit PlainTextEncodingForWrite int 4
sc_default com.apple.TextEdit SmartQuotes bool false
sc_default com.apple.TextEdit TabWidth int 4

sc_default com.apple.ActivityMonitor OpenMainWindow bool true
sc_default com.apple.ActivityMonitor IconType int 5
sc_default com.apple.ActivityMonitor ShowCategory int 0
sc_default com.apple.ActivityMonitor SortColumn string CPUUsage
sc_default com.apple.ActivityMonitor SortDirection int 0

sc_default com.apple.SoftwareUpdate AutomaticCheckEnabled bool true
sc_default com.apple.SoftwareUpdate ScheduleFrequency int 1
sc_default com.apple.SoftwareUpdate AutomaticDownload int 1
sc_default com.apple.SoftwareUpdate CriticalUpdateInstall int 1
sc_default com.apple.commerce AutoUpdate bool true
