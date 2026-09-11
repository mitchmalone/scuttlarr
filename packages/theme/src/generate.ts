/**
 * Bake `themes/<name>/colors.toml` into `packages/tui/src/themes.generated.ts`, and the
 * raw sources + templates into `src/builtin.generated.ts` so the app can render a
 * built-in theme with no filesystem. Pure: takes texts, returns module source.
 * `bin/generate.ts` does the I/O.
 */
import { parseThemeFile, resolve } from './palette.ts'
import { type ThemeTokens, toTokens } from './tokens.ts'

export type ThemeSource = { name: string; text: string }

/**
 * The picker lists themes in module-key order. The house theme leads, then the
 * original three, then everything else alphabetically — the order the hand-written
 * map had, so regenerating changes no UI.
 */
const LEAD = ['scuttlarr', 'dracula', 'terminal', 'amber']

export function orderThemes<T extends { name: string }>(themes: T[]): T[] {
  const rank = (name: string) => {
    const i = LEAD.indexOf(name)
    return i < 0 ? LEAD.length : i
  }
  return [...themes].sort(
    (a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name),
  )
}

export function buildTokens(
  sources: ThemeSource[],
): Record<string, ThemeTokens> {
  const out: Record<string, ThemeTokens> = {}
  for (const { name, text } of orderThemes(sources)) {
    try {
      const { palette, launcher } = parseThemeFile(text)
      out[name] = toTokens(resolve(palette), launcher)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`theme ${name}: ${reason}`, { cause: error })
    }
  }
  return out
}

export const GENERATED_HEADER = `// GENERATED — do not edit; pnpm --filter @scuttlarr/theme build
// Source: packages/theme/themes/<name>/colors.toml, baked by packages/theme/src/generate.ts.
// \`pnpm verify:themes\` fails when this file is stale.`

/** Prettier-shaped source (single quotes, no semicolons, trailing commas). */
export function generateModule(sources: ThemeSource[]): string {
  const tokens = buildTokens(sources)
  const lines: string[] = [
    GENERATED_HEADER,
    "import type { ThemeTokens } from '@scuttlarr/theme/tokens'",
    '',
    'export const BUILTIN_THEMES: Record<string, ThemeTokens> = {',
  ]
  for (const [name, t] of Object.entries(tokens)) {
    lines.push(`  ${key(name)}: {`)
    for (const [k, v] of Object.entries(t)) lines.push(`    ${k}: '${v}',`)
    lines.push('  },')
  }
  lines.push('}', '')
  return lines.join('\n')
}

function key(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : `'${name}'`
}

/** Escape for a JS template literal: backslashes, backticks, and `${`. */
export function escapeTemplateLiteral(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
}

/**
 * `src/builtin.generated.ts`: every built-in colors.toml (LEAD order) and every
 * template, as strings the runtime can hand straight to `renderTheme`.
 */
export function generateBuiltinModule(
  sources: ThemeSource[],
  templates: Record<string, string>,
): string {
  const lines: string[] = [
    GENERATED_HEADER,
    '',
    '/** Built-in theme name → its colors.toml, verbatim. */',
    'export const BUILTIN_THEME_SOURCES: Record<string, string> = {',
  ]
  for (const { name, text } of orderThemes(sources)) {
    lines.push(`  ${key(name)}: \`${escapeTemplateLiteral(text)}\`,`)
  }
  lines.push('}', '', '/** Template file name → template text. */')
  lines.push('export const TEMPLATES: Record<string, string> = {')
  for (const name of Object.keys(templates).sort()) {
    lines.push(
      `  ${key(name)}: \`${escapeTemplateLiteral(templates[name]!)}\`,`,
    )
  }
  lines.push('}', '')
  return lines.join('\n')
}
