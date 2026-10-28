/**
 * Agent state, read by shape (DECISIONS 2026-10-28). One component for the bar
 * cell, the hover card, the `agents` panel and the site's legend, so no surface
 * can draw a state the others don't recognise.
 *
 * Lucide geometry — a 24-box drawn at 14px with a 2.2 stroke, the same
 * `ICON_PROPS` as the battery and wifi cells — in `currentColor`, so the state
 * classes in bar.css (`bar-agent-<state>`) colour it and the theme retints it.
 * Only two shapes move: the working ring spins, the attention ring breathes;
 * both animations live in bar.css and stop under Reduce Motion.
 *
 * Reachable as `@scuttlarr/tui/bar/agent-icons` as well as through the barrel.
 * That entry point is load-bearing: the site's server component imports the
 * glyph directly. Going through `.` drags in hook-using modules (`hooks.ts`,
 * `controls.tsx`, `ask.tsx`) and fails the Next build. Keep this file free of
 * hooks.
 */
export function AgentStateIcon({
  state,
  size = 14,
  className = '',
}: {
  state: string
  /** 14 in a cell, 20 in the card's swatch. */
  size?: number
  className?: string
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    className: `bar-agent-icon bar-agent-icon-${state} ${className}`.trim(),
  } as const
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const
  switch (state) {
    // Three-quarter ring: the gap is what makes the spin readable.
    case 'working':
      return (
        <svg {...common} {...stroke}>
          <circle cx="12" cy="12" r="8" strokeDasharray="37.7 12.6" />
        </svg>
      )
    // Ring with a still centre dot: the ring breathes, the dot never leaves.
    case 'attention':
      return (
        <svg {...common} {...stroke}>
          <circle className="bar-agent-breathe" cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
        </svg>
      )
    // Filled disc with a check, cut in the panel background: weight from the
    // fill, not colour, so "unread" reads in monochrome themes too.
    case 'done':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" fill="currentColor" />
          <path
            d="M8 12.5l2.6 2.6L16.5 9"
            fill="none"
            stroke="var(--bg, #1c1d2a)"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    // Bare check: finished and already visited.
    case 'read':
      return (
        <svg {...common} {...stroke}>
          <path d="M6 12.5l3.8 3.8L18.5 8" />
        </svg>
      )
    // Moon (lucide `moon`): waiting for a prompt.
    case 'idle':
      return (
        <svg {...common} {...stroke}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )
    // Dotted ring: a wire state the kit has no shape for yet. Visible, never
    // broken — a new adapter degrades to this.
    default:
      return (
        <svg {...common} {...stroke}>
          <circle cx="12" cy="12" r="8" strokeDasharray="2.5 5" />
        </svg>
      )
  }
}
