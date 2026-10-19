import type { ThemeTokens } from '@scuttlarr/tui/themes'

/**
 * The hero's pixel field (design 2c, "Keys"): a dithered field, calm in the middle and
 * busy at the edges, that answers the keyboard. Every keystroke sends a pulse sideways
 * along the prompt's row; Enter fires a ring. Nobody typing → it types its own lines.
 *
 * Pure: no window, no clock, no randomness of its own. `now` and `rng` arrive as
 * parameters and the canvas is any `fillRect`-capable context, so the component in
 * `components/hero-field.tsx` owns every side effect and this file stays testable.
 */

/** The six steps the field draws with, all derived from the active app theme. */
export type FieldRamp = {
  bg: string
  dim: string
  mid: string
  lit: string
  hover: string
  crest: string
}

function rgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [0, 0, 0]
  const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join('') : m[1]!
  const n = parseInt(h, 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

/** Linear mix of two hex colours, `t` = 0 → a, 1 → b, as `#rrggbb`. */
export function mixHex(a: string, b: string, t: number): string {
  const x = rgb(a)
  const y = rgb(b)
  return `#${x
    .map((v, i) =>
      Math.round(v + (y[i]! - v) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

/** dim/mid are the accent sunk into the ground; hover/crest lift it toward the text. */
export function fieldRamp(t: ThemeTokens): FieldRamp {
  return {
    bg: t.bg,
    dim: mixHex(t.bg, t.accent, 0.3),
    mid: mixHex(t.bg, t.accent, 0.58),
    lit: t.accent,
    hover: mixHex(t.accent, t.fg, 0.4),
    crest: mixHex(t.accent, t.fg, 0.78),
  }
}

// ---- deterministic noise + ordered dither (seeded once; same field every load)

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const LATTICE = 64
const lattice = new Float32Array(LATTICE * LATTICE)
const jitter = new Float32Array(4096)
{
  const r = lcg(77123)
  for (let i = 0; i < lattice.length; i++) lattice[i] = r()
  for (let i = 0; i < jitter.length; i++) jitter[i] = r()
}

/** Smooth value noise on a wrapping 64×64 lattice, in [0, 1]. */
export function noise(x: number, y: number): number {
  const N = LATTICE
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const a = ((xi % N) + N) % N
  const b = ((yi % N) + N) % N
  const a1 = (a + 1) % N
  const b1 = (b + 1) % N
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const p = lattice[b * N + a]!
  const q = lattice[b * N + a1]!
  const r = lattice[b1 * N + a]!
  const s = lattice[b1 * N + a1]!
  return (p * (1 - u) + q * u) * (1 - v) + (r * (1 - u) + s * u) * v
}

const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
]

/** Per-cell dither threshold in [0, 1): an 8×8 Bayer matrix, roughened by jitter. */
export function threshold(row: number, col: number): number {
  const bayer = (BAYER[(row & 7) * 8 + (col & 7)]! + 0.5) / 64
  return 0.78 * bayer + 0.22 * jitter[((row & 63) * 64 + (col & 63)) & 4095]!
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
function easeOut(t: number): number {
  return 1 - (1 - t) ** 3
}

/**
 * Ambient field intensity at a cell centre (canvas px). Near zero in the middle, where
 * the copy sits, rising toward the edges and corners; fades in below the top edge.
 */
export function ambient(
  row: number,
  col: number,
  seconds: number,
  x: number,
  y: number,
  width: number,
  height: number,
  dpr: number,
): number {
  const nx = (x / width) * 2 - 1
  const ny = (y / height) * 2 - 1
  const edge = smooth(0.38, 1.2, Math.sqrt(nx * nx + ny * ny * 0.85))
  const mask = edge * edge * Math.min(1, Math.max(0.15, (y / dpr - 40) / 120))
  if (mask < 0.002) return 0
  const t = seconds
  const n =
    0.6 * noise(col / 9 + t * 0.14, row / 9 - t * 0.055) +
    0.4 * noise(col / 16 - t * 0.08, row / 16 + t * 0.06)
  const shimmer =
    0.5 +
    0.5 * Math.sin(t * 1.1 + jitter[(row * 37 + col * 11) & 4095]! * 6.283)
  return mask * (0.3 + 0.52 * n * n + 0.18 * shimmer) * 0.66 * 0.75
}

// ---- pulses: keystrokes travel along the caret's row, Enter rings

export type Pulse = {
  kind: 'key' | 'ring'
  /** Origin, canvas px. */
  x: number
  y: number
  /** Birth time, ms. */
  born: number
  /** Lifetime, seconds. */
  life: number
  /** How far it travels, in cells. */
  reach: number
}

export function keyPulse(
  x: number,
  y: number,
  now: number,
  charge: number,
): Pulse {
  return { kind: 'key', x, y, born: now, life: 0.55, reach: 14 + 10 * charge }
}
export function ringPulse(
  x: number,
  y: number,
  now: number,
  charge: number,
): Pulse {
  return {
    kind: 'ring',
    x,
    y,
    born: now,
    life: 0.8 + 0.6 * charge,
    reach: 8 + 22 * charge,
  }
}

export function alive(p: Pulse, now: number): boolean {
  return (now - p.born) / 1000 < p.life
}

/** Strongest pulse amplitude at a point (canvas px), in [0, 1.1]. */
export function pulseAt(
  pulses: readonly Pulse[],
  x: number,
  y: number,
  now: number,
  cell: number,
): number {
  let best = 0
  for (const p of pulses) {
    const age = (now - p.born) / 1000 / p.life
    if (age < 0 || age >= 1) continue
    const amp = (1 - age) ** 1.5
    const grow = easeOut(age) * p.reach
    const gx = (x - p.x) / cell
    const gy = (y - p.y) / cell
    if (p.kind === 'key') {
      // two short bars running left and right along the caret's row, thickening as they go
      if (Math.abs(gy) < 1.2 + age * 2 && Math.abs(Math.abs(gx) - grow) < 1.4)
        best = Math.max(best, amp)
    } else if (Math.abs(Math.sqrt(gx * gx + gy * gy) - grow) < 1.1) {
      best = Math.max(best, amp * 1.1)
    }
  }
  return best
}

// ---- the typist: types brand lines while nobody else is

export const HERO_PHRASES = [
  'scuttle the ship',
  'sail the wreck',
  'keyboard first',
  'one theme, everywhere',
] as const

export type Typist = { phrase: number; index: number; next: number }

export function typist(): Typist {
  return { phrase: 0, index: 0, next: 0 }
}

/**
 * Advance the typist. Returns the key it "pressed" (a character or 'Enter') and its next
 * state, or `null` when it isn't time yet. `rng` jitters the cadence so it reads as hands.
 */
export function stepTypist(
  s: Typist,
  now: number,
  rng: () => number,
  phrases: readonly string[] = HERO_PHRASES,
): { key: string; state: Typist } | null {
  if (now < s.next) return null
  const phrase = phrases[s.phrase % phrases.length]!
  if (s.index < phrase.length) {
    return {
      key: phrase[s.index]!,
      state: { ...s, index: s.index + 1, next: now + 90 + rng() * 90 },
    }
  }
  return {
    key: 'Enter',
    state: { phrase: s.phrase + 1, index: 0, next: now + 1800 },
  }
}

/** The prompt line after a key: printable keys append (capped), Backspace removes. */
export function applyKey(line: string, key: string, max = 28): string {
  if (key === 'Backspace') return line.slice(0, -1)
  if (key.length === 1 && line.length < max) return line + key
  return line
}

// ---- one frame

export type Painter = {
  fillStyle: string | CanvasGradient | CanvasPattern
  fillRect(x: number, y: number, w: number, h: number): void
}

export type FrameInput = {
  ctx: Painter
  ramp: FieldRamp
  /** Canvas size in device px, and the device pixel ratio. */
  width: number
  height: number
  dpr: number
  /** Field time in seconds; frozen under reduced motion. */
  seconds: number
  now: number
  pulses: readonly Pulse[]
  /** The pointer over the field (canvas px) and how present it is, 0..1. */
  cursor?: { x: number; y: number; strength: number }
}

/** Soft glow around the pointer, in [0, 0.5]. */
export function glowAt(
  cursor: FrameInput['cursor'],
  x: number,
  y: number,
  cell: number,
): number {
  if (!cursor || cursor.strength < 0.01) return 0
  const reach = 8 * cell
  const d = Math.hypot(x - cursor.x, y - cursor.y)
  if (d >= reach) return 0
  const k = 1 - d / reach
  return k * k * cursor.strength * 0.5
}

/** Cell edge in CSS px. */
export const CELL = 8

/** Paint one frame. Returns how many cells were lit (tests, and a cheap sanity check). */
export function paintFrame(f: FrameInput): number {
  const { ctx, ramp, width, height, dpr, seconds, now, pulses, cursor } = f
  const cell = CELL * dpr
  const cols = Math.ceil(width / cell)
  const rows = Math.ceil(height / cell)
  ctx.fillStyle = ramp.bg
  ctx.fillRect(0, 0, width, height)
  let lit = 0
  for (let r = 0; r < rows; r++) {
    const y = r * cell
    const yc = y + cell / 2
    const py = Math.round(y)
    const ph = Math.round(y + cell) - py
    for (let c = 0; c < cols; c++) {
      const x = c * cell
      const xc = x + cell / 2
      const pulse = pulses.length ? pulseAt(pulses, xc, yc, now, cell) : 0
      const glow = glowAt(cursor, xc, yc, cell)
      const v =
        ambient(r, c, seconds, xc, yc, width, height, dpr) + pulse * 1.15 + glow
      if (v <= threshold(r, c)) continue
      ctx.fillStyle =
        pulse > 0.4 ? ramp.lit : pulse > 0.1 || glow > 0.2 ? ramp.mid : ramp.dim
      const px = Math.round(x)
      ctx.fillRect(px, py, Math.round(x + cell) - px, ph)
      lit++
    }
  }
  return lit
}
