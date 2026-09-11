#!/bin/zsh
# The shell half of `pnpm verify`: syntax floor (`zsh -n`) over every script,
# then each test/*.test.zsh in its own process against a scratch tree.
emulate -L zsh
setopt no_unset pipe_fail
cd "${0:A:h:h}"

typeset -i failed=0
print "syntax"
for f in bin/scuttlarr lib/*.zsh defaults/*.zsh migrations/*.zsh(N) test/*.zsh test/fixtures/bin/* scripts/*.zsh; do
  if zsh -n "$f"; then :; else print "  FAIL zsh -n $f"; failed=1; fi
done
print "  ok"

print "tests"
for t in test/*.test.zsh; do
  if out="$(zsh "$t" 2>&1)"; then
    print "  ${out##*$'\n'}"
  else
    print -r -- "$out" | sed 's/^/  /'
    failed=1
  fi
done
(( failed )) && exit 1
print "all green"
