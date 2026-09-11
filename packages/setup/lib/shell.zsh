# shell.zsh — the shell base: terminal, shell, prompt and git configs as
# generated files (docs/SETUP.md, "base ⊕ overlay"), each importing the current
# theme from ~/.local/state/scuttlarr/current/theme/ (docs/THEMES.md, Surfaces).
#
#   ~/.zshrc                          shell/zshrc, base + overlay paths baked in
#   ~/.p10k.zsh                       prompt/p10k.zsh
#   ~/.config/ghostty/config          terminal/ghostty ⊕ overlay/ghostty (appended)
#   ~/.config/tmux/tmux.conf          terminal/tmux.conf ⊕ overlay/tmux.conf (before the theme line)
#   ~/.config/git/scuttlarr.gitconfig git/scuttlarr.gitconfig (pager lines only when delta is on PATH)
#   ~/.config/git/config              stays yours; one `[include]` stanza appended (mode touched)
#
# Plus the zsh plugins as plain git clones under ~/.local/share/zsh/plugins —
# cloned on apply if missing, skipped with SCUTTLARR_NO_NETWORK=1.
#
#   sc_shell_run <plan|apply|check>

typeset -gi SC_SHELL_SEEN=0 SC_SHELL_CHANGED=0 SC_SHELL_PLUGINS=0

: "${SCUTTLARR_GIT_BIN:=git}"

sc_shell_theme_dir() { print -r -- '~/.local/state/scuttlarr/current/theme'; }
sc_shell_plugins_dir() { print -r -- "${XDG_DATA_HOME:-$HOME/.local/share}/zsh/plugins"; }

# name → repo, in load order.
typeset -ga SC_SHELL_PLUGIN_REPOS=(
  romkatv/powerlevel10k
  zsh-users/zsh-autosuggestions
  zsh-users/zsh-syntax-highlighting
  zsh-users/zsh-history-substring-search
  zsh-users/zsh-completions
)

# ---- renders (each prints the file to stdout) --------------------------------

_sc_shell_render_zshrc() {
  local content; content="$(<"$SCUTTLARR_BASE/shell/zshrc")"
  content="${content//@@BASE@@/$SCUTTLARR_BASE}"
  content="${content//@@OVERLAY@@/$SCUTTLARR_OVERLAY}"
  print -r -- "$content"
}

_sc_shell_render_p10k() { cat "$SCUTTLARR_BASE/prompt/p10k.zsh"; }

# Ghostty: later keys win, so the overlay goes last.
_sc_shell_render_ghostty() {
  cat "$SCUTTLARR_BASE/terminal/ghostty"
  if [[ -r "$SCUTTLARR_OVERLAY/ghostty" ]]; then
    print; print -r -- "# --- overlay: $(sc_tilde "$SCUTTLARR_OVERLAY/ghostty") ---"
    cat "$SCUTTLARR_OVERLAY/ghostty"
  fi
}

# tmux: the overlay goes in before the theme's source-file line, which stays last.
_sc_shell_render_tmux() {
  local -a lines; lines=("${(@f)$(<"$SCUTTLARR_BASE/terminal/tmux.conf")}")
  local -i i=${lines[(I)source-file -q *]}
  if [[ -r "$SCUTTLARR_OVERLAY/tmux.conf" ]] && (( i > 0 )); then
    print -rl -- "${(@)lines[1,i-2]}"
    [[ -z "${lines[i-2]}" ]] || print
    print -r -- "# --- overlay: $(sc_tilde "$SCUTTLARR_OVERLAY/tmux.conf") ---"
    cat "$SCUTTLARR_OVERLAY/tmux.conf"
    print; print -rl -- "${(@)lines[i-1,-1]}"
  else
    print -rl -- "${(@)lines[@]}"
  fi
}

# git: delta as pager only when it's installed — a pager that isn't there
# breaks every `git diff`.
_sc_shell_render_gitconfig() {
  local content pager
  content="$(<"$SCUTTLARR_BASE/git/scuttlarr.gitconfig")"
  if command -v delta >/dev/null 2>&1; then
    pager=$'[core]\n\tpager = delta\n\n[interactive]\n\tdiffFilter = delta --color-only\n\n[delta]\n\tnavigate = true\n\tline-numbers = true\n'
  else
    pager=$'# delta is not on PATH: no pager lines. `brew install git-delta`, then\n# `scuttlarr shell --apply` again.\n'
  fi
  print -r -- "${content//@@PAGER@@/$pager}"
}

_sc_shell_render_git_include() {
  print -r -- '[include]'
  print -r -- $'\tpath = ~/.config/git/scuttlarr.gitconfig'
}

# ---- plugins -----------------------------------------------------------------

_sc_shell_plugins() {
  emulate -L zsh
  local mode="$1" repo name dir
  local dest; dest="$(sc_shell_plugins_dir)"
  for repo in "${SC_SHELL_PLUGIN_REPOS[@]}"; do
    name="${repo#*/}"; dir="$dest/$name"
    [[ -d "$dir" ]] && continue
    (( SC_SHELL_PLUGINS++ ))
    case "$mode" in
      plan)  sc_log "$name: clone → $(sc_tilde "$dir")" ;;
      check) sc_warn "$name: not cloned under $(sc_tilde "$dest")" ;;
      apply)
        if [[ -n "${SCUTTLARR_NO_NETWORK-}" ]]; then
          sc_warn "$name: not cloned (SCUTTLARR_NO_NETWORK)"; continue
        fi
        mkdir -p "$dest"
        if "$SCUTTLARR_GIT_BIN" clone --depth 1 --quiet "https://github.com/$repo" "$dir" 2>/dev/null; then
          sc_ok "$name: cloned"
        else
          sc_err "$name: clone failed (offline?) — rerun \`scuttlarr shell --apply\` later"
        fi ;;
    esac
  done
  return 0
}

# ---- the walk ----------------------------------------------------------------

sc_shell_run() {
  emulate -L zsh
  local mode="$1"
  [[ "$mode" == plan || "$mode" == apply || "$mode" == check ]] || sc_die "mode must be plan, apply or check (got '$mode')"
  SC_SHELL_SEEN=0 SC_SHELL_CHANGED=0 SC_SHELL_PLUGINS=0
  sc_files_reset
  local cfg="${XDG_CONFIG_HOME:-$HOME/.config}"
  SC_MODE="$mode"
  _sc_shell_render_zshrc       | sc_file_generated "$HOME/.zshrc" shell
  _sc_shell_render_p10k        | sc_file_generated "$HOME/.p10k.zsh" prompt
  _sc_shell_render_ghostty     | sc_file_generated "$cfg/ghostty/config" terminal
  _sc_shell_render_tmux        | sc_file_generated "$cfg/tmux/tmux.conf" terminal
  _sc_shell_render_gitconfig   | sc_file_generated "$cfg/git/scuttlarr.gitconfig" git
  _sc_shell_render_git_include | sc_file_touched "$cfg/git/config" git
  unset SC_MODE
  SC_SHELL_SEEN=$SC_FILES_SEEN SC_SHELL_CHANGED=$SC_FILES_CHANGED
  if [[ "$mode" != check ]] && ! command -v delta >/dev/null 2>&1; then
    sc_warn "delta not on PATH: git pager lines left out (\`brew install git-delta\`, then apply again)"
  fi
  _sc_shell_plugins "$mode"
  (( SC_SHELL_CHANGED += SC_SHELL_PLUGINS ))
  return 0
}
