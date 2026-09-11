import { describe, expect, it } from 'vitest'

import { TomlError, parseToml } from './toml.ts'

describe('parseToml', () => {
  it('reads strings, numbers and booleans at the root', () => {
    const doc = parseToml(`
      name = "tokyo"
      alpha = 0.96
      count = 3
      light = false
      neg = -12
    `)
    expect(doc.root).toEqual({
      name: 'tokyo',
      alpha: 0.96,
      count: 3,
      light: false,
      neg: -12,
    })
    expect(doc.tables).toEqual({})
  })

  it('skips comments and blank lines, including inline comments', () => {
    const doc = parseToml(`# header
      background = "#1a1b26" # the ground

      mode = "dark"
      n = 1 # one
    `)
    expect(doc.root).toEqual({ background: '#1a1b26', mode: 'dark', n: 1 })
  })

  it('keeps a hash inside a quoted value', () => {
    expect(parseToml('accent = "#7aa2f7"').root.accent).toBe('#7aa2f7')
    expect(parseToml("accent = '#7aa2f7'").root.accent).toBe('#7aa2f7')
  })

  it('handles basic-string escapes', () => {
    expect(parseToml('s = "a\\"b\\\\c\\n"').root.s).toBe('a"b\\c\n')
  })

  it('collects one level of [table] headers', () => {
    const doc = parseToml(`
      accent = "#fff"
      [launcher]
      glass = "rgba(0, 0, 0, 0.93)"
      [meta]
      pair = "solarized-light"
    `)
    expect(doc.root).toEqual({ accent: '#fff' })
    expect(doc.tables).toEqual({
      launcher: { glass: 'rgba(0, 0, 0, 0.93)' },
      meta: { pair: 'solarized-light' },
    })
  })

  it('reports the line number on errors', () => {
    expect(() => parseToml('a = "x"\nb = "unterminated')).toThrow(
      /line 2: unterminated string/,
    )
    expect(() => parseToml('a = 1\n\nnope')).toThrow(/line 3: expected/)
    const err = (() => {
      try {
        parseToml('ok = 1\nbad = [1, 2]')
      } catch (e) {
        return e
      }
      return undefined
    })()
    expect(err).toBeInstanceOf(TomlError)
    expect((err as TomlError).line).toBe(2)
  })

  it('rejects duplicate keys, duplicate tables, and nested tables', () => {
    expect(() => parseToml('a = 1\na = 2')).toThrow(/duplicate key: a/)
    expect(() => parseToml('[t]\n[t]')).toThrow(/duplicate table/)
    expect(() => parseToml('[a.b]')).toThrow(/unsupported table header/)
    expect(() => parseToml('[[arr]]')).toThrow(/unsupported table header/)
  })

  it('rejects text trailing a quoted value', () => {
    expect(() => parseToml('a = "x" y')).toThrow(/unexpected text after value/)
  })
})
