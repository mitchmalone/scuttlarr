-- scuttlarr theme: {{ name }} — rendered, do not edit. A LazyVim spec: add
-- dofile(vim.fn.expand("~/.local/state/scuttlarr/current/theme/neovim.lua")) to your
-- lazy specs; running instances get `:colorscheme` over --remote-send at theme set.
return {
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "{{ neovim_colorscheme }}",
    },
  },
}
