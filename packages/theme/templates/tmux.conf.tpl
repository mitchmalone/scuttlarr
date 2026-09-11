# scuttlarr theme: {{ name }} — rendered, do not edit. The base tmux.conf ends with
# `source-file -q ~/.local/state/scuttlarr/current/theme/tmux.conf`; `theme set`
# also pushes OSC colours into every running pane, so this only has to style tmux.
set -g status-style "bg={{ background }},fg={{ foreground }}"
set -g status-left "#[fg={{ background }},bg={{ accent }},bold] #S #[fg={{ accent }},bg={{ background }}] "
set -g status-right "#{?client_prefix,#[fg={{ background }},bg={{ yellow }},bold] PREFIX #[fg={{ yellow }},bg={{ background }}] ,}#[fg={{ muted }}]%H:%M "
set -g window-status-separator ""
set -g window-status-format "#[fg={{ muted }},bg={{ background }}] #I:#W "
set -g window-status-current-format "#[fg={{ background }},bg={{ magenta }},bold] #I:#W #[fg={{ magenta }},bg={{ background }}]"
set -g pane-border-style "fg={{ selection }}"
set -g pane-active-border-style "fg={{ accent }}"
set -g message-style "bg={{ selection }},fg={{ foreground }}"
set -g mode-style "bg={{ accent }},fg={{ background }}"
set -g window-style "fg={{ foreground }},bg={{ background }}"
set -g window-active-style "fg={{ foreground }},bg={{ background }}"
