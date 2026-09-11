/**
 * Colour math, byte-for-byte compatible with Omarchy's awk `mix_color` and the
 * shell helpers in `omarchy-theme-color` / `omarchy-theme-set-templates`.
 */

export type Rgb = { r: number; g: number; b: number }

export class ColorError extends Error {}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** Strict `#rrggbb` — the only shape Omarchy derives from or emits `_rgb` for. */
export function isHex6(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value)
}

/** Parse `#rgb` / `#rrggbb` (leading `#` optional). */
export function parseHex(value: string): Rgb {
  const m = HEX_RE.exec(value.trim())
  if (!m) throw new ColorError(`not a hex colour: ${JSON.stringify(value)}`)
  const raw = m[1]!
  const hex = raw.length === 3 ? [...raw].map((c) => c + c).join('') : raw
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

export function toHex({ r, g, b }: Rgb): string {
  const pair = (n: number) => n.toString(16).padStart(2, '0')
  return `#${pair(r)}${pair(g)}${pair(b)}`
}

/** `"30%"`, `"0.3"`, `"30"`, `0.3` or `30` → 0.3, clamped to 0..1 (Omarchy's rules). */
export function parseAmount(amount: string | number): number {
  let n: number
  if (typeof amount === 'number') {
    n = amount > 1 ? amount / 100 : amount
  } else {
    const text = amount.trim()
    if (text.endsWith('%')) {
      n = Number(text.slice(0, -1)) / 100
    } else {
      n = Number(text)
      if (n > 1) n /= 100
    }
  }
  if (Number.isNaN(n)) throw new ColorError(`bad mix amount: ${String(amount)}`)
  return Math.min(1, Math.max(0, n))
}

/** Linear blend `start → end` by `amount`, rounded like awk's `int(x + 0.5)`. */
export function mix(
  start: string,
  end: string,
  amount: string | number,
): string {
  const a = parseAmount(amount)
  const s = parseHex(start)
  const e = parseHex(end)
  const blend = (x: number, y: number) => Math.floor(x * (1 - a) + y * a + 0.5)
  return toHex({ r: blend(s.r, e.r), g: blend(s.g, e.g), b: blend(s.b, e.b) })
}

/** `#1e1e2e` → `"30,30,46"` (Omarchy's `{{ key_rgb }}`). */
export function toRgb(hex: string): string {
  const { r, g, b } = parseHex(hex)
  return `${r},${g},${b}`
}

/** `#1e1e2e` → `1e1e2e` (Omarchy's `{{ key_strip }}`); non-hex values pass through. */
export function strip(value: string): string {
  return value.startsWith('#') ? value.slice(1) : value
}

/** Omarchy's brightness measure: the plain `r + g + b` sum (0..765). */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex)
  return r + g + b
}

/** Omarchy's mode auto-detect: a background summing above 382 reads as light. */
export function isLight(hex: string): boolean {
  return luminance(hex) > 382
}
