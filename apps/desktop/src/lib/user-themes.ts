import {
  type ThemeTokens,
  parseThemeFile,
  resolve,
  toTokens,
} from '@scuttlarr/theme'
import type { CustomThemes } from '@scuttlarr/tui'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useMemo, useState } from 'react'

import type { Config } from './config'

/** Mirrors `UserTheme` in user_themes.rs. */
export type UserTheme = {
  name: string
  text: string
  handFiles: Record<string, string>
  installed: boolean
  dir: string
  /** `backgrounds/*` images, absolute, sorted. */
  backgrounds: string[]
}

export function userThemes(): Promise<UserTheme[]> {
  return invoke<UserTheme[]>('theme_user_list')
}
export function installTheme(url: string): Promise<UserTheme> {
  return invoke<UserTheme>('theme_install', { url })
}
export function updateThemes(): Promise<string[]> {
  return invoke<string[]>('theme_update')
}
export function removeTheme(name: string): Promise<void> {
  return invoke('theme_remove', { name })
}

/** Tokens for a user theme's `colors.toml`; null (and a console line) when it
 * doesn't parse — a broken file must not blank every window. */
export function tokensOf(theme: UserTheme): ThemeTokens | null {
  try {
    const { palette, launcher } = parseThemeFile(theme.text)
    return toTokens(resolve(palette), launcher)
  } catch (e) {
    console.warn(`[scuttlarr themes] ${theme.name}: ${String(e)}`)
    return null
  }
}

/**
 * The map every window resolves theme names against: config's token-only
 * overrides, then user `colors.toml` themes on top. A user theme named after a
 * built-in replaces it whole (one file = the whole theme, Omarchy's rule); one
 * named after a config override wins over that override too.
 */
export function mergeThemes(
  config: Pick<Config, 'themes'>,
  user: UserTheme[],
): CustomThemes {
  const out: Record<string, Partial<ThemeTokens>> = { ...(config.themes ?? {}) }
  for (const t of user) {
    const tokens = tokensOf(t)
    if (tokens) out[t.name] = tokens
  }
  return out
}

/** Live list of user themes: one fetch, then `user-themes-changed` from the
 * Rust watcher on `~/.config/scuttlarr/themes/`. */
export function useUserThemes(): UserTheme[] {
  const [themes, setThemes] = useState<UserTheme[]>([])
  useEffect(() => {
    let live = true
    const load = () =>
      userThemes()
        .then((t) => {
          if (live) setThemes(t)
        })
        .catch((e) => console.error('[scuttlarr themes] list failed:', e))
    load()
    const un = listen('user-themes-changed', load)
    return () => {
      live = false
      un.then((f) => f())
    }
  }, [])
  return themes
}

/** `config.themes` ⊕ user themes, memoised — pass this wherever `config.themes` went. */
export function useMergedThemes(config: Pick<Config, 'themes'>): CustomThemes {
  const user = useUserThemes()
  const overrides = config.themes
  return useMemo(
    () => mergeThemes({ themes: overrides }, user),
    [overrides, user],
  )
}
