/**
 * The dithered pixel field behind first-launch setup (the Pixel Hero 2c language
 * from the site design): quiet in the middle where the words sit, alive at the
 * edges, and it answers the keyboard — `pulse(el, 'key')` runs sideways from an
 * element, `'ring'` and `'big'` spread out. Only the theme's background, accent and
 * bright foreground colour it.
 *
 * Weight: one canvas while setup is open, capped at ~30 fps, paused while the panel
 * is hidden, a single still frame under reduced motion, gone on `destroy()`.
 */

export type FieldTokens = { bg: string; accent: string; bright: string }
export type PulseKind = 'key' | 'ring' | 'big'

export type Field = {
  setTokens(tokens: FieldTokens): void
  /** Ambient density, 0..1; eased toward, never jumped. */
  setLevel(level: number): void
  pulse(el: Element | null, kind: PulseKind): void
  pause(): void
  resume(): void
  destroy(): void
}

type Ramp = { bg: string; dim: string; mid: string; lit: string; crest: string }

function hex(colour: string): [number, number, number] {
  const n = parseInt(colour.replace('#', '').slice(0, 6), 16) || 0
  return [n >> 16, (n >> 8) & 255, n & 255]
}

/** `a` mixed toward `b` by `t`, as an rgb() string. */
export function mix(a: string, b: string, t: number): string {
  const x = hex(a)
  const y = hex(b)
  const ch = (i: 0 | 1 | 2) => Math.round(x[i] + (y[i] - x[i]) * t)
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`
}

export function ramp(t: FieldTokens): Ramp {
  return {
    bg: t.bg,
    dim: mix(t.bg, t.accent, 0.3),
    mid: mix(t.bg, t.accent, 0.58),
    lit: t.accent,
    crest: mix(t.accent, t.bright, 0.78),
  }
}

function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const N = 64
const rand = lcg(77123)
const LATTICE = Float32Array.from({ length: N * N }, rand)
const JITTER = Float32Array.from({ length: 4096 }, rand)
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
]

const at = (arr: ArrayLike<number>, i: number) => arr[i] ?? 0

function noise(x: number, y: number): number {
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
  const top = at(LATTICE, b * N + a) * (1 - u) + at(LATTICE, b * N + a1) * u
  const bottom =
    at(LATTICE, b1 * N + a) * (1 - u) + at(LATTICE, b1 * N + a1) * u
  return top * (1 - v) + bottom * v
}

function threshold(r: number, c: number): number {
  return (
    0.78 * ((at(BAYER, (r & 7) * 8 + (c & 7)) + 0.5) / 64) +
    0.22 * at(JITTER, ((r & 63) * 64 + (c & 63)) & 4095)
  )
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const easeOut = (t: number) => 1 - (1 - t) ** 3

type Ripple = {
  x: number
  y: number
  born: number
  kind: PulseKind
  life: number
  reach: number
}

const RIPPLE: Record<PulseKind, { life: number; reach: number }> = {
  key: { life: 0.55, reach: 22 },
  ring: { life: 0.9, reach: 34 },
  big: { life: 1.6, reach: 80 },
}

export function mountField(
  canvas: HTMLCanvasElement,
  tokens: FieldTokens,
): Field {
  const ctx = canvas.getContext('2d', { alpha: false })
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let palette = ramp(tokens)
  let width = 0
  let height = 0
  let cell = 8
  let cols = 0
  let rows = 0
  let born = performance.now()
  let ripples: Ripple[] = []
  let raf = 0
  let lastDraw = 0
  let paused = false
  let level = 0.9
  let levelNow = 0.9

  function size(): boolean {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w < 1 || h < 1) return false
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = Math.round(w * dpr)
    height = Math.round(h * dpr)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    cell = 8 * dpr
    cols = Math.ceil(width / cell)
    rows = Math.ceil(height / cell)
    return true
  }

  function ambient(
    r: number,
    c: number,
    t: number,
    x: number,
    y: number,
  ): number {
    const nx = (x / width) * 2 - 1
    const ny = (y / height) * 2 - 1
    const edge = smooth(0.5, 1.3, Math.sqrt(nx * nx * 0.8 + ny * ny * 1.15))
    const m = edge * edge * levelNow
    if (m < 0.002) return 0
    const n =
      0.6 * noise(c / 9 + t * 0.14, r / 9 - t * 0.055) +
      0.4 * noise(c / 16 - t * 0.08, r / 16 + t * 0.06)
    const shimmer =
      0.5 +
      0.5 * Math.sin(t * 1.1 + at(JITTER, (r * 37 + c * 11) & 4095) * 6.283)
    return m * (0.3 + 0.52 * n * n + 0.18 * shimmer) * 0.8
  }

  function ringAt(x: number, y: number, now: number): number {
    let best = 0
    for (const rp of ripples) {
      const age = (now - rp.born) / 1000 / rp.life
      if (age < 0 || age >= 1) continue
      const amp = (1 - age) ** 1.5
      const grow = easeOut(age) * rp.reach
      const gx = (x - rp.x) / cell
      const gy = (y - rp.y) / cell
      if (rp.kind === 'key') {
        // a keystroke travels sideways along its row
        if (
          Math.abs(gy) < 1.2 + age * 2 &&
          Math.abs(Math.abs(gx) - grow) < 1.4
        ) {
          best = Math.max(best, amp)
        }
      } else {
        const d = Math.hypot(gx, gy)
        if (Math.abs(d - grow) < (rp.kind === 'big' ? 1.7 : 1.1))
          best = Math.max(best, amp * 1.1)
      }
    }
    return best
  }

  function draw(now: number) {
    if (!ctx) return
    const t = reduced ? 20 : now / 1000
    levelNow += (level - levelNow) * (reduced ? 1 : 0.04)
    ripples = ripples.filter((rp) => (now - rp.born) / 1000 < rp.life)
    const fade = reduced ? 1 : easeOut(Math.min(1, (now - born) / 1200))
    ctx.fillStyle = palette.bg
    ctx.fillRect(0, 0, width, height)
    for (let r = 0; r < rows; r++) {
      const y = r * cell
      for (let c = 0; c < cols; c++) {
        const x = c * cell
        const ring = ringAt(x + cell / 2, y + cell / 2, now)
        const amb = ambient(r, c, t, x + cell / 2, y + cell / 2) * fade
        if (amb + ring * 1.15 <= threshold(r, c)) continue
        ctx.fillStyle =
          ring > 0.55
            ? palette.crest
            : ring > 0.3
              ? palette.lit
              : ring > 0.08 || amb > 0.62
                ? palette.mid
                : palette.dim
        const px = Math.round(x)
        const py = Math.round(y)
        ctx.fillRect(
          px,
          py,
          Math.round(x + cell) - px,
          Math.round(y + cell) - py,
        )
      }
    }
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop)
    if (now - lastDraw < 30) return
    lastDraw = now
    draw(now)
  }

  function start() {
    if (paused || !size()) return
    if (reduced) {
      draw(performance.now())
      return
    }
    if (!raf) raf = requestAnimationFrame(loop)
  }

  function stop() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  const resize = new ResizeObserver(() => {
    if (size()) draw(performance.now())
  })
  resize.observe(canvas)
  start()

  const redrawIfStill = () => {
    if (reduced && !paused) draw(performance.now())
  }

  return {
    setTokens(next) {
      palette = ramp(next)
      redrawIfStill()
    },
    setLevel(next) {
      level = next
      redrawIfStill()
    },
    pulse(el, kind) {
      if (!el || !width) return
      const cr = canvas.getBoundingClientRect()
      const er = el.getBoundingClientRect()
      if (!cr.width) return
      ripples = ripples.slice(-6)
      ripples.push({
        x: ((er.left + er.width / 2 - cr.left) * width) / cr.width,
        y: ((er.top + er.height / 2 - cr.top) * height) / cr.height,
        born: performance.now(),
        kind,
        ...RIPPLE[kind],
      })
      redrawIfStill()
    },
    pause() {
      paused = true
      stop()
    },
    resume() {
      if (!paused) return
      paused = false
      born = performance.now() - 1200
      start()
    },
    destroy() {
      stop()
      resize.disconnect()
    },
  }
}
