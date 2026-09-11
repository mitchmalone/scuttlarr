# Tool hooks: mise, zoxide, direnv, fzf, atuin, sesh. Each only if installed.

# mise — node (and anything else in ~/.config/mise/config.toml)
if command -v mise >/dev/null 2>&1; then
  eval "$(mise activate zsh)"
fi

if command -v zoxide >/dev/null 2>&1; then
  eval "$(zoxide init zsh)"
fi

# direnv, quiet: no "loading"/"export" lines above the prompt.
if command -v direnv >/dev/null 2>&1; then
  export DIRENV_LOG_FORMAT=""
  eval "$(direnv hook zsh)"
fi

# fzf keybindings + completion (Ctrl-R history, Ctrl-T files, Alt-C dirs)
if command -v fzf >/dev/null 2>&1; then
  source <(fzf --zsh 2>/dev/null) 2>/dev/null
fi

# atuin takes over Ctrl-R (after fzf so it wins the binding); up-arrow stays
# with history-substring-search (85-plugins.zsh).
if command -v atuin >/dev/null 2>&1; then
  eval "$(atuin init zsh --disable-up-arrow)"
fi

# Keep bare sesh commands focused on tmux/configured sessions. Explicit source
# flags still pass through, so `sesh list -z` works when zoxide is installed.
sesh() {
  if (( ! $+commands[sesh] )); then
    print -u2 "sesh: command not found"
    return 127
  fi

  if [[ "$1" == "list" || "$1" == "picker" ]]; then
    local subcommand="$1"
    shift
    local arg has_source_flag=0
    for arg in "$@"; do
      case "$arg" in
        -t|--tmux|-c|--config|-z|--zoxide|-T|--tmuxinator|-b|--blacklisted|-p|--panes)
          has_source_flag=1
          break
          ;;
      esac
    done
    if (( has_source_flag == 0 )); then
      command sesh "$subcommand" -t -c "$@"
      return
    fi
    command sesh "$subcommand" "$@"
    return
  fi

  command sesh "$@"
}
