/**
 * The subset of TOML a `colors.toml` uses: `key = "string"`, numbers, booleans,
 * `# comments`, blank lines, and one level of `[table]` headers. Anything else is
 * rejected with a line number rather than guessed at — palettes are hand-written
 * and a silent misparse would ship a broken theme.
 */

export type TomlValue = string | number | boolean
export type TomlTable = Record<string, TomlValue>
export type TomlDocument = {
  root: TomlTable
  tables: Record<string, TomlTable>
}

export class TomlError extends Error {
  readonly line: number

  constructor(line: number, message: string) {
    super(`line ${line}: ${message}`)
    this.line = line
  }
}

const KEY_RE = /^[A-Za-z0-9_-]+$/
const TABLE_RE = /^\[\s*([A-Za-z0-9_-]+)\s*\]\s*(?:#.*)?$/
const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/

const ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  '"': '"',
  '\\': '\\',
}

export function parseToml(text: string): TomlDocument {
  const doc: TomlDocument = { root: {}, tables: {} }
  let current = doc.root

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1
    const trimmed = raw.trim()
    if (trimmed === '' || trimmed.startsWith('#')) return

    const table = TABLE_RE.exec(trimmed)
    if (table) {
      const name = table[1]!
      if (doc.tables[name])
        throw new TomlError(line, `duplicate table [${name}]`)
      current = {}
      doc.tables[name] = current
      return
    }
    if (trimmed.startsWith('[')) {
      throw new TomlError(line, `unsupported table header: ${trimmed}`)
    }

    const eq = trimmed.indexOf('=')
    if (eq < 0)
      throw new TomlError(line, `expected \`key = value\`: ${trimmed}`)
    const key = trimmed.slice(0, eq).trim()
    if (!KEY_RE.test(key))
      throw new TomlError(line, `bad key: ${JSON.stringify(key)}`)
    if (key in current) throw new TomlError(line, `duplicate key: ${key}`)
    current[key] = parseValue(trimmed.slice(eq + 1).trim(), line)
  })

  return doc
}

function parseValue(text: string, line: number): TomlValue {
  if (text === '') throw new TomlError(line, 'missing value')
  if (text.startsWith('"')) return parseBasicString(text, line)
  if (text.startsWith("'")) return parseLiteralString(text, line)

  const bare = text.replace(/\s+#.*$/, '').trim()
  if (bare === 'true') return true
  if (bare === 'false') return false
  if (NUMBER_RE.test(bare)) return Number(bare)
  throw new TomlError(line, `unsupported value: ${text}`)
}

function parseBasicString(text: string, line: number): string {
  let out = ''
  for (let i = 1; i < text.length; i += 1) {
    const ch = text[i]!
    if (ch === '"') {
      assertTrailing(text.slice(i + 1), line)
      return out
    }
    if (ch === '\\') {
      i += 1
      const esc = ESCAPES[text[i] ?? '']
      if (esc === undefined)
        throw new TomlError(line, `bad escape: \\${text[i] ?? ''}`)
      out += esc
    } else {
      out += ch
    }
  }
  throw new TomlError(line, 'unterminated string')
}

function parseLiteralString(text: string, line: number): string {
  const end = text.indexOf("'", 1)
  if (end < 0) throw new TomlError(line, 'unterminated string')
  assertTrailing(text.slice(end + 1), line)
  return text.slice(1, end)
}

function assertTrailing(rest: string, line: number): void {
  const trailing = rest.trim()
  if (trailing !== '' && !trailing.startsWith('#')) {
    throw new TomlError(line, `unexpected text after value: ${trailing}`)
  }
}
