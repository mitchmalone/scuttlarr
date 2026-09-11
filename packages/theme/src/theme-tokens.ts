/**
 * The launcher's flat token map — what both scuttlarr windows, the bar, and the site
 * demo style with. Import-free on purpose: `@scuttlarr/tui` reaches this type through
 * `@scuttlarr/theme/tokens` without its typecheck following the rest of the package.
 */
export type ThemeTokens = {
  /** Opaque window background (settings). */
  bg: string
  /** Raised surface: settings sections, inputs, pills. */
  surface: string
  /** Translucent background for the floating panel. */
  glass: string
  border: string
  fg: string
  dim: string
  accent: string
  /** Launch-mode prompt sigil. */
  sigil: string
  /** Bang-mode prompt sigil. */
  bang: string
  /** Selected-row background (panel). */
  selected: string
  /** Alert tier below danger: bar cells and widget tones (battery low, weak wifi). */
  warn: string
  danger: string
}
