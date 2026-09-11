# scuttlarr theme: {{ name }} — rendered, do not edit. The base git config has
# `[include] path = ~/.local/state/scuttlarr/current/theme/delta.gitconfig`.
[delta]
    {{ mode }} = true
    syntax-theme = {{ bat_theme }}
    file-style = bold {{ accent }}
    file-decoration-style = {{ accent }} ul
    hunk-header-style = {{ muted }}
    hunk-header-decoration-style = {{ selection }} box
    line-numbers-left-style = {{ muted }}
    line-numbers-right-style = {{ muted }}
    line-numbers-minus-style = {{ red }}
    line-numbers-plus-style = {{ green }}
    minus-style = syntax "{{ mix background red 20% }}"
    minus-emph-style = syntax "{{ mix background red 40% }}"
    plus-style = syntax "{{ mix background green 20% }}"
    plus-emph-style = syntax "{{ mix background green 40% }}"
