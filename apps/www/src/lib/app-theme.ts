'use client'

import { useSyncExternalStore } from 'react'

import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  pageVars,
  themeTokens,
} from './page-theme'

/**
 * The app theme the whole site wears — one value shared by the header's picker, the
 * demo's dropdown and the hero field. Starts from whatever the boot script already
 * painted (`data-app-theme` on `<html>`), so hydration never undoes a stored choice.
 */
let current =
  typeof document === 'undefined'
    ? DEFAULT_THEME
    : (document.documentElement.dataset.appTheme ?? DEFAULT_THEME)
const listeners = new Set<() => void>()

export function setAppTheme(name: string): void {
  if (name === current) return
  current = name
  const root = document.documentElement
  for (const [k, v] of Object.entries(pageVars(themeTokens(name))))
    root.style.setProperty(k, v)
  root.dataset.appTheme = name
  try {
    localStorage.setItem(THEME_STORAGE_KEY, name)
  } catch {
    // private mode / blocked storage: the choice just doesn't outlive the tab
  }
  for (const l of listeners) l()
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAppTheme(): [string, (name: string) => void] {
  const name = useSyncExternalStore(
    subscribe,
    () => current,
    () => DEFAULT_THEME,
  )
  return [name, setAppTheme]
}
