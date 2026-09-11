# OS flags, editor, locale, shell options, history.

case "$OSTYPE" in
  darwin*) export IS_MACOS=1 IS_LINUX=0 ;;
  linux*)  export IS_MACOS=0 IS_LINUX=1 ;;
  *)       export IS_MACOS=0 IS_LINUX=0 ;;
esac

export CLICOLOR=1
if command -v nvim >/dev/null 2>&1; then
  export EDITOR=nvim VISUAL=nvim
else
  export EDITOR=vim VISUAL=vim
fi
# zsh switches to vi keybindings whenever EDITOR contains "vi"; we want emacs
# (Esc must not drop the line editor into vi command mode).
bindkey -e

# Locale: a UTF-8 one, unless the environment already chose.
if [[ -z "${LANG-}" ]]; then
  if (( IS_MACOS )); then
    export LANG=en_US.UTF-8
  elif command -v locale >/dev/null 2>&1 && locale -a 2>/dev/null | grep -Fixq 'c.utf8'; then
    export LANG=C.UTF-8
  fi
fi

# Shell options
setopt extended_glob
setopt interactive_comments
setopt no_auto_remove_slash   # keep trailing slashes on completed paths

# History
HISTFILE="${ZDOTDIR:-$HOME}/.zsh_history"
HISTSIZE=100000
SAVEHIST=100000
setopt append_history
setopt share_history
setopt inc_append_history
setopt extended_history
setopt hist_ignore_dups
setopt hist_ignore_space
setopt hist_reduce_blanks
setopt hist_find_no_dups
