# PATH. `typeset -U` keeps entries unique, so order of additions is all that matters.
typeset -U path fpath

if (( IS_MACOS )); then
  if [[ -z "${HOMEBREW_PREFIX-}" ]]; then
    if [[ -x /opt/homebrew/bin/brew ]]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -x /usr/local/bin/brew ]]; then
      eval "$(/usr/local/bin/brew shellenv)"
    fi
  fi
  path=(/usr/local/sbin $path)
  [[ -d "/Applications/Visual Studio Code.app/Contents/Resources/app/bin" ]] \
    && path+=("/Applications/Visual Studio Code.app/Contents/Resources/app/bin")
  # GNU tools stay g-prefixed (gsed, gdate, ...). Putting gnubin first silently
  # changes ls/stat/date semantics for every script; opt in per command instead.
elif (( IS_LINUX )); then
  [[ -d "$HOME/.npm-global/bin" ]] && path=($HOME/.npm-global/bin $path)
  [[ -d /snap/bin ]] && path+=(/snap/bin)
  [[ -d "$HOME/go/bin" ]] && path+=("$HOME/go/bin")
fi

path=($HOME/.local/bin $HOME/bin $path /usr/local/bin)
export PATH
