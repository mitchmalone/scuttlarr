import { fuzzyMatch, isWordStart } from './matcher'
import type { FrecencyMap, IndexItem } from './types'

export type ScoredItem = {
  item: IndexItem
  score: number
  /** Match positions in the display name; empty when the match was via an alias or keyword. */
  positions: number[]
}

/**
 * Naming roles, from most to least trusted (DECISIONS 2026-09-16, after Tinycast's
 * `SearchAlias.Role`): the visible name, a curated alias, a derived keyword. Every text an
 * item can be found by is one of these three, and the factor is the whole difference — a
 * weaker role can never beat a stronger one at the same match strength, and the scorer
 * never learns which field the text came from.
 */
const ALIAS_FACTOR = 0.9
const KEYWORD_FACTOR = 0.8

export const MAX_RESULTS = 8

/**
 * Frecency multiplier: final = fuzzy × multiplier. The signal is launches in the past
 * 5 days (frecency.rs), and the multiplier is bounded to [1, 2) — enough for a few days
 * of real use to flip near-ties (`code` → VS Code over Codex once it's the one being
 * launched), while a genuinely better textual match still wins from more than 2× away.
 */
export function frecencyMultiplier(frecency: number | undefined): number {
  if (!frecency || frecency <= 0) return 1
  return 1 + frecency / (frecency + 2)
}

/**
 * The keyword role's looseness: the query must sit contiguously at a word start of the
 * keyword (`ical` → `iCal`, `sms` → `MobileSMS`), never scattered through it — a derived
 * string is not something the user ever saw, so a subsequence hit through it is noise.
 */
export function keywordScore(query: string, keyword: string): number | null {
  const m = fuzzyMatch(query, keyword)
  if (!m || m.positions.length === 0) return null
  const first = m.positions[0]!
  if (!isWordStart(keyword, first)) return null
  for (let i = 1; i < m.positions.length; i++) {
    if (m.positions[i] !== first + i) return null
  }
  return m.score * KEYWORD_FACTOR
}

export function rank(
  query: string,
  items: IndexItem[],
  frecency: FrecencyMap,
): ScoredItem[] {
  // Empty query shows nothing rather than a guess (PRD §5.3 cold start).
  if (query.length === 0) return []

  const scored: ScoredItem[] = []
  for (const item of items) {
    const nameMatch = fuzzyMatch(query, item.name)
    let best = nameMatch
      ? { score: nameMatch.score, positions: nameMatch.positions }
      : null
    for (const alias of item.aliases) {
      const aliasMatch = fuzzyMatch(query, alias)
      if (
        aliasMatch &&
        (!best || aliasMatch.score * ALIAS_FACTOR > best.score)
      ) {
        best = { score: aliasMatch.score * ALIAS_FACTOR, positions: [] }
      }
    }
    for (const keyword of item.keywords ?? []) {
      const score = keywordScore(query, keyword)
      if (score !== null && (!best || score > best.score)) {
        best = { score, positions: [] }
      }
    }
    if (!best) continue
    scored.push({
      item,
      score: best.score * frecencyMultiplier(frecency[item.id]),
      positions: best.positions,
    })
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const fa = frecency[a.item.id] ?? 0
    const fb = frecency[b.item.id] ?? 0
    if (fb !== fa) return fb - fa
    if (a.item.name.length !== b.item.name.length) {
      return a.item.name.length - b.item.name.length
    }
    return a.item.name.localeCompare(b.item.name)
  })

  return scored.slice(0, MAX_RESULTS)
}
