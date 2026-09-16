import { describe, expect, it } from 'vitest'

import corpus from './corpus.json'
import { rank } from './ranking'
import type { FrecencyMap, IndexItem } from './types'

/**
 * The ranking corpus (DECISIONS 2026-09-16, after Tinycast's `corpus-test`): a dense
 * index shaped like the real payload — the apps on a working Mac, every settings pane,
 * the system commands, links, panel triggers, scuttlarr's own rows — and the queries a
 * person actually types, each pinned to the row that must come first. **A ranking
 * complaint is a new case here**, never an ad-hoc scorer tweak: change the scorer, run
 * this, and every earlier complaint is re-checked at once.
 *
 * Entries come from `mdls`-free plist reads (name, bundle id tail, CFBundleName,
 * executable) of one machine on 2026-09-16; keywords are derived exactly as
 * `indexer.rs` derives them. Regenerate by hand when the derivation rule changes.
 */
type Case = {
  query: string
  /** The id that must rank first. */
  top: string
  /** Launch counts (frecency.rs units) applied before ranking; cold when absent. */
  frecency?: FrecencyMap
  note?: string
}

const ENTRIES = corpus.entries as IndexItem[]
const CASES = corpus.cases as Case[]

describe('ranking corpus', () => {
  it('is dense enough to mean something', () => {
    expect(ENTRIES.length).toBeGreaterThanOrEqual(150)
    expect(CASES.length).toBeGreaterThanOrEqual(30)
    const ids = new Set(ENTRIES.map((e) => e.id))
    expect(ids.size).toBe(ENTRIES.length)
    for (const c of CASES)
      expect(ids.has(c.top), `${c.query} → ${c.top}`).toBe(true)
  })

  for (const c of CASES) {
    const label = `${JSON.stringify(c.query)} → ${c.top}${c.frecency ? ' (warm)' : ''}${c.note ? ` — ${c.note}` : ''}`
    it(label, () => {
      const results = rank(c.query, ENTRIES, c.frecency ?? {})
      expect(results.map((r) => r.item.id).slice(0, 3)).toContain(c.top)
      expect(results[0]?.item.id).toBe(c.top)
    })
  }
})
