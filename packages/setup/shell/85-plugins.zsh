# Plugins that must load after compinit. syntax-highlighting goes last of the
# widgets; history-substring-search binds keys after it.
[[ -r "$ZSH_PLUGINS/zsh-autosuggestions/zsh-autosuggestions.zsh" ]] \
  && source "$ZSH_PLUGINS/zsh-autosuggestions/zsh-autosuggestions.zsh"

[[ -r "$ZSH_PLUGINS/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh" ]] \
  && source "$ZSH_PLUGINS/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"

if [[ -r "$ZSH_PLUGINS/zsh-history-substring-search/zsh-history-substring-search.zsh" ]]; then
  source "$ZSH_PLUGINS/zsh-history-substring-search/zsh-history-substring-search.zsh"
  bindkey '^[[A' history-substring-search-up
  bindkey '^[[B' history-substring-search-down
  bindkey '^[OA' history-substring-search-up
  bindkey '^[OB' history-substring-search-down
else
  bindkey '^[[A' up-line-or-history
  bindkey '^[[B' down-line-or-history
  bindkey '^[OA' up-line-or-history
  bindkey '^[OB' down-line-or-history
fi
