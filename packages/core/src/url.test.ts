import { describe, expect, it } from 'vitest'

import {
  detectUrl,
  expandPlaceholders,
  fillQuery,
  placeholdersIn,
  quicklinkTarget,
} from './url'

describe('detectUrl', () => {
  it('accepts explicit schemes as-is', () => {
    expect(detectUrl('https://github.com/foo')).toBe('https://github.com/foo')
    expect(detectUrl('http://example.com')).toBe('http://example.com')
  })

  it('adds https to bare domains with known TLDs', () => {
    expect(detectUrl('github.com')).toBe('https://github.com')
    expect(detectUrl('emberstash.com/jobs')).toBe('https://emberstash.com/jobs')
    expect(detectUrl('app.emberstash.com')).toBe('https://app.emberstash.com')
    expect(detectUrl('news.ycombinator.com?p=2')).toBe(
      'https://news.ycombinator.com?p=2',
    )
  })

  it('handles localhost with ports and paths', () => {
    expect(detectUrl('localhost:5273')).toBe('http://localhost:5273')
    expect(detectUrl('localhost:3000/api/health')).toBe(
      'http://localhost:3000/api/health',
    )
    expect(detectUrl('localhost')).toBe('http://localhost')
  })

  it('rejects queries with spaces', () => {
    expect(detectUrl('github com')).toBeNull()
    expect(detectUrl('what is github.com')).toBeNull()
  })

  it('rejects dots that are not URLs', () => {
    expect(detectUrl('node.js')).toBeNull() // js is not a TLD
    expect(detectUrl('report.txt')).toBeNull()
    expect(detectUrl('v1.2')).toBeNull()
    expect(detectUrl('safari')).toBeNull()
    expect(detectUrl('')).toBeNull()
  })

  it('trims surrounding whitespace', () => {
    expect(detectUrl('  github.com  ')).toBe('https://github.com')
  })
})

describe('fillQuery', () => {
  it('encodes the query into the placeholder', () => {
    expect(
      fillQuery('https://www.google.com/search?q={query}', 'cute otters & co'),
    ).toBe('https://www.google.com/search?q=cute%20otters%20%26%20co')
  })

  it('fills multiple placeholders', () => {
    expect(fillQuery('https://x.dev/{query}/compare/{query}', 'a b')).toBe(
      'https://x.dev/a%20b/compare/a%20b',
    )
  })
})

describe('quicklinkTarget', () => {
  it('fills the template when a query is given', () => {
    expect(
      quicklinkTarget(
        'https://chill.institute/search?q={query}',
        'captain hook',
      ),
    ).toBe('https://chill.institute/search?q=captain%20hook')
  })

  it('falls back to the site root when the query is empty', () => {
    expect(
      quicklinkTarget('https://chill.institute/search?q={query}', ''),
    ).toBe('https://chill.institute/')
    expect(
      quicklinkTarget('https://chill.institute/search?q={query}', '  '),
    ).toBe('https://chill.institute/')
  })

  it('roots to the origin, dropping any path', () => {
    expect(
      quicklinkTarget(
        'https://www.youtube.com/results?search_query={query}',
        '',
      ),
    ).toBe('https://www.youtube.com/')
  })

  it('keeps a plain link (no placeholder) as-is when empty', () => {
    expect(quicklinkTarget('https://news.ycombinator.com/newest', '')).toBe(
      'https://news.ycombinator.com/newest',
    )
  })

  it('falls back to filled template if the URL cannot be parsed', () => {
    expect(quicklinkTarget('not a url {query}', '')).toBe('not a url ')
  })
})

describe('placeholders', () => {
  const now = new Date(2026, 8, 16, 9, 5) // local: 2026-09-16 09:05

  it('lists the placeholders a template uses, minus {query}', () => {
    expect([...placeholdersIn('https://x.test/?q={query}')]).toEqual([])
    expect([...placeholdersIn('https://x.test/{date}/{clipboard}')]).toEqual([
      'clipboard',
      'date',
    ])
  })

  it('expands clipboard (encoded), date and time', () => {
    const url = 'https://x.test/{date}/{time}?c={clipboard}'
    expect(expandPlaceholders(url, { clipboard: 'a b&c', now })).toBe(
      'https://x.test/2026-09-16/09:05?c=a%20b%26c',
    )
  })

  it('an empty clipboard expands to nothing, not the literal', () => {
    expect(
      expandPlaceholders('https://x.test/?c={clipboard}', {
        clipboard: null,
        now,
      }),
    ).toBe('https://x.test/?c=')
  })

  it('leaves URLs without placeholders untouched', () => {
    expect(
      expandPlaceholders('https://x.test/{query}', { clipboard: 'z', now }),
    ).toBe('https://x.test/{query}')
  })
})
