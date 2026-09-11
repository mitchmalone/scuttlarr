# Powerlevel10k. Plugins are plain git clones, put there by `scuttlarr shell --apply`.
# Style lives in ~/.p10k.zsh (generated); colours come from the current theme.
ZSH_PLUGINS="${XDG_DATA_HOME:-$HOME/.local/share}/zsh/plugins"

[[ -r "$ZSH_PLUGINS/powerlevel10k/powerlevel10k.zsh-theme" ]] \
  && source "$ZSH_PLUGINS/powerlevel10k/powerlevel10k.zsh-theme"

[[ -r ~/.p10k.zsh ]] && source ~/.p10k.zsh
