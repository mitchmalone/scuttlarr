# Terminal tab titles: "host: path" at the prompt, "host: cmd" while running,
# "ssh: target" during ssh. Ghostty's shell integration does cwd/prompt marks;
# this keeps titles useful inside tmux and on remote hosts too.
autoload -U add-zsh-hook

_sc_title_set() {
  [[ -t 1 ]] || return 0
  case "$TERM" in
    xterm*|rxvt*|screen*|tmux*|wezterm*|alacritty*|foot*) ;;
    *) return 0 ;;
  esac
  local title="${1//$'\e'/}"
  title="${title//$'\a'/}"
  print -Pn "\e]0;${title}\a\e]1;${title}\a"
}

_sc_title_host() {
  print -r -- "${${HOST:-$(hostname -s 2>/dev/null)}%%.*}"
}

_sc_title_path() {
  print -r -- "${PWD/#$HOME/~}"
}

_sc_title_precmd() {
  _sc_title_set "$(_sc_title_host): $(_sc_title_path)"
}

_sc_title_preexec() {
  local cmd="${1%%$'\n'*}"
  cmd="${cmd#"${cmd%%[![:space:]]*}"}"
  cmd="${cmd%% *}"
  [[ -z "$cmd" ]] && cmd="running"
  _sc_title_set "$(_sc_title_host): $cmd"
}

_sc_ssh_title_target() {
  local arg next_is_target=0 skip_next=0
  for arg in "$@"; do
    if (( skip_next )); then skip_next=0; continue; fi
    if (( next_is_target )); then print -r -- "$arg"; return 0; fi
    case "$arg" in
      --) next_is_target=1 ;;
      -[bcDEeFIiJLlmOopQRSWw]|-[bcDEeFIiJLlmOopQRSWw][=[:space:]]*) [[ "$arg" == -? ]] && skip_next=1 ;;
      -o|-o*) [[ "$arg" == "-o" ]] && skip_next=1 ;;
      -*) ;;
      *) print -r -- "$arg"; return 0 ;;
    esac
  done
}

ssh() {
  local target="$(_sc_ssh_title_target "$@")"
  [[ -n "$target" ]] && _sc_title_set "ssh: $target"
  command ssh "$@"
  local ssh_rc=$?
  _sc_title_precmd
  return $ssh_rc
}
compdef _ssh ssh 2>/dev/null || true

add-zsh-hook precmd _sc_title_precmd
add-zsh-hook preexec _sc_title_preexec
