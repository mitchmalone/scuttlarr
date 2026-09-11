# Aliases and small helpers. Each one guards on the tool it needs.

if (( IS_MACOS )); then
  alias ls='ls -GFh'
else
  alias ls='ls --color=auto -Fh'
fi

if command -v eza >/dev/null 2>&1; then
  alias l='eza --group-directories-first --icons=auto'
  alias ll='eza -l --group-directories-first --icons=auto --git'
  alias la='eza -la --group-directories-first --icons=auto --git'
  alias lt='eza --tree --level=2 --group-directories-first --icons=auto'
fi

if command -v nvim >/dev/null 2>&1; then
  alias vim='nvim'
  alias vi='nvim'
fi

alias rsync='rsync -rhavz --exclude "._*" --exclude ".DS_Store" --partial --progress --stats'

# Safer interactive deletion on macOS (ships /usr/bin/trash). Scripts keep /bin/rm.
if (( IS_MACOS )) && command -v trash >/dev/null 2>&1; then
  alias rm='trash'
fi

# Delete local branches whose upstream is gone
alias git_prune="git fetch --prune && git branch -vv | grep 'origin/.*: gone]' | awk '{print \$1}' | xargs git branch -d"

# 20-char password: clipboard on macOS, stdout elsewhere
if (( IS_MACOS )); then
  alias genpw='LC_ALL=C tr -dc "[:alnum:]" < /dev/urandom | head -c 20 | pbcopy && echo "Password copied to clipboard"'
else
  alias genpw='LC_ALL=C tr -dc "[:alnum:]" < /dev/urandom | head -c 20 && echo'
fi
