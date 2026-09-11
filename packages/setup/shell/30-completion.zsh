# Completion. compinit is cached and only rebuilt once a day.
fpath=("$ZSH_PLUGINS/zsh-completions/src" $fpath)
(( IS_MACOS )) && [[ -n "${HOMEBREW_PREFIX-}" && -d "$HOMEBREW_PREFIX/share/zsh/site-functions" ]] \
  && fpath=("$HOMEBREW_PREFIX/share/zsh/site-functions" $fpath)

autoload -Uz compinit
_zcompdump="${XDG_CACHE_HOME:-$HOME/.cache}/zsh/zcompdump-${ZSH_VERSION}"
[[ -d "${_zcompdump:h}" ]] || mkdir -p "${_zcompdump:h}"
if [[ -n "$_zcompdump"(#qN.mh-24) ]]; then
  compinit -C -d "$_zcompdump"
else
  compinit -d "$_zcompdump"
fi
unset _zcompdump

zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
zstyle ':completion:*' use-cache on
zstyle ':completion:*' cache-path "${XDG_CACHE_HOME:-$HOME/.cache}/zsh/compcache"
