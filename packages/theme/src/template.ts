/**
 * Omarchy's template substitution, the `{{ … }}` forms `omarchy-theme-set-templates`
 * bakes with sed: `{{ key }}`, `{{ key_strip }}`, `{{ key_rgb }}` (6-digit hex only),
 * and `{{ mix a b 30% }}` / `{{ mix_strip … }}` / `{{ mix_rgb … }}` where a and b are
 * palette keys (or, as an extension, literal hex). No fallbacks, no logic: an unknown
 * key throws rather than leaving a raw placeholder behind.
 */
import { isHex6, mix, strip, toRgb } from './color.ts'
import type { ResolvedPalette } from './palette.ts'

export class TemplateError extends Error {}

const TOKEN_RE = /\{\{\s*([^{}]+?)\s*\}\}/g
const MIX_RE = /^(mix|mix_strip|mix_rgb)\s+(\S+)\s+(\S+)\s+(\d+(?:\.\d+)?%?)$/

export function render(template: string, palette: ResolvedPalette): string {
  return template.replace(TOKEN_RE, (_, body: string) => expand(body, palette))
}

function expand(body: string, palette: ResolvedPalette): string {
  const m = MIX_RE.exec(body)
  if (m) {
    const [, fn, a, b, amount] = m
    const value = mix(colour(a!, palette), colour(b!, palette), amount!)
    if (fn === 'mix_strip') return strip(value)
    if (fn === 'mix_rgb') return toRgb(value)
    return value
  }

  if (!/^[A-Za-z0-9_-]+$/.test(body))
    throw new TemplateError(`bad placeholder: {{ ${body} }}`)
  const direct = palette[body]
  if (direct !== undefined) return direct

  if (body.endsWith('_strip'))
    return strip(lookup(body.slice(0, -'_strip'.length), palette))
  if (body.endsWith('_rgb')) {
    const key = body.slice(0, -'_rgb'.length)
    const value = lookup(key, palette)
    if (!isHex6(value))
      throw new TemplateError(`${key}_rgb needs #rrggbb, got ${value}`)
    return toRgb(value)
  }
  throw new TemplateError(`unknown key: ${body}`)
}

function lookup(key: string, palette: ResolvedPalette): string {
  const value = palette[key]
  if (value === undefined) throw new TemplateError(`unknown key: ${key}`)
  return value
}

/** A mix operand: a palette key, or a literal `#rrggbb`. */
function colour(ref: string, palette: ResolvedPalette): string {
  if (isHex6(ref)) return ref
  const value = lookup(ref, palette)
  if (!isHex6(value))
    throw new TemplateError(`mix needs #rrggbb, ${ref} is ${value}`)
  return value
}
