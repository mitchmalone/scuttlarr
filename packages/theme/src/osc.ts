/**
 * The OSC colour sequences `omarchy-theme-osc` prints: 10 foreground, 11 background,
 * 12 cursor, 17 selection background, 19 selection foreground, then `4;N` for
 * color0..15 — each `ESC ] … BEL`. Pushed into running terminals/tmux panes at
 * `theme set` so they retint without a reload. Absent keys are skipped.
 */
import type { ResolvedPalette } from './palette.ts'

const ESC = '\x1b'
const BEL = '\x07'

const SPECIAL: ReadonlyArray<[code: number, key: string]> = [
  [10, 'foreground'],
  [11, 'background'],
  [12, 'cursor'],
  [17, 'selection_background'],
  [19, 'selection_foreground'],
]

export function oscSequences(palette: ResolvedPalette): string {
  let out = ''
  for (const [code, key] of SPECIAL) {
    const value = palette[key]
    if (value) out += `${ESC}]${code};${value}${BEL}`
  }
  for (let i = 0; i <= 15; i += 1) {
    const value = palette[`color${i}`]
    if (value) out += `${ESC}]4;${i};${value}${BEL}`
  }
  return out
}
