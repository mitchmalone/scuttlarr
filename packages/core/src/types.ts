export type ItemKind =
  | 'app'
  | 'settings'
  | 'scuttlarr'
  | 'link'
  | 'command'
  /** A panel trigger word (wifi, usage…) surfaced as a rankable item so it fuzzy-matches
   * like an app; `path` carries the trigger word. Exact-token typing still goes through
   * the grammar's trigger mode. */
  | 'panel'
  /** A built-in trigger word (`lorem`, `clip`) surfaced as a rankable item so it fuzzy-matches
   * like everything else; `path` carries the trigger word. Enter runs the trigger's own step
   * one (lorem opens its menu, clip fills the prompt). */
  | 'builtin'

export type IndexItem = {
  id: string
  name: string
  kind: ItemKind
  path: string
  hint: string
  icon: string | null
  /**
   * Curated synonyms (`preferences` → System Settings): matched fuzzily like the name,
   * scored just under it, never highlighted. The *alias* role.
   */
  aliases: string[]
  /**
   * Search-only hints the indexer derives rather than anyone authoring — the bundle id's
   * tail (`VSCode`), `CFBundleName` when it differs from the display name (`Code`), the
   * executable (`Resolve`). The *keyword* role: it only counts when the query sits at a
   * word start of the keyword, contiguously, and it scores under an alias. Ranking is
   * keyed on the role and the match strength, never on which field supplied the text
   * (DECISIONS 2026-09-16).
   */
  keywords?: string[]
  browser?: string | null
}

export type Link = {
  name: string
  url: string
  /** Optional trigger word: with a {query} placeholder this becomes a Raycast-style quicklink. */
  trigger?: string | null
}

export type FrecencyMap = Record<string, number>

export type ScriptInfo = {
  trigger: string
  name: string
  description: string
  path: string
}

export type ScriptAction =
  | { type: 'copy'; value: string }
  | { type: 'open'; value: string }
  | { type: 'none' }

export type ScriptItem = {
  title: string
  subtitle: string
  action: ScriptAction
  altAction?: ScriptAction | null
}

export type Clip = {
  id: number
  content: string
  ts: number
}
