import { describe, expect, it } from 'vitest'

import { oscSequences } from './osc.ts'
import { parsePalette, resolve } from './palette.ts'
import type { ResolvedPalette } from './palette.ts'

const MINIMAL = `
background = "#1a1b26"
foreground = "#a9b1d6"
red = "#f7768e"
yellow = "#e0af68"
green = "#9ece6a"
cyan = "#449dab"
blue = "#7aa2f7"
magenta = "#ad8ee6"
`

describe('oscSequences', () => {
  it('emits the special colours then color0..15, ESC ] … BEL, in Omarchy order', () => {
    const r = resolve(parsePalette(MINIMAL))
    const out = oscSequences(r)
    const seqs = out.split('\x07').filter(Boolean)
    expect(seqs).toHaveLength(5 + 16)
    expect(seqs[0]).toBe('\x1b]10;#a9b1d6')
    expect(seqs[1]).toBe('\x1b]11;#1a1b26')
    expect(seqs[2]).toBe(`\x1b]12;${r.cursor}`)
    expect(seqs[3]).toBe(`\x1b]17;${r.selection_background}`)
    expect(seqs[4]).toBe(`\x1b]19;${r.selection_foreground}`)
    expect(seqs[5]).toBe('\x1b]4;0;#1a1b26')
    expect(seqs[6]).toBe('\x1b]4;1;#f7768e')
    expect(seqs[20]).toBe(`\x1b]4;15;${r.bright_foreground}`)
    expect(out.endsWith('\x07')).toBe(true)
  })

  it('skips keys that are absent', () => {
    const partial = {
      foreground: '#ffffff',
      color3: '#ffff00',
    } as unknown as ResolvedPalette
    expect(oscSequences(partial)).toBe(
      '\x1b]10;#ffffff\x07\x1b]4;3;#ffff00\x07',
    )
    expect(oscSequences({} as unknown as ResolvedPalette)).toBe('')
  })
})
