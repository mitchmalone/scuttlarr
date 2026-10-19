'use client'

import { themeNames } from '@scuttlarr/tui/themes'
import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useAppTheme } from '@/lib/app-theme'
import { themeLabel, themeTokens } from '@/lib/page-theme'

const NAMES = themeNames({})
const CLOSE_DELAY_MS = 180

/** Ground, surface, text, accent, good: enough to recognise a theme at a glance. */
function Swatches({
  colors,
  className,
}: {
  colors: string[]
  className: string
}) {
  return (
    <span className="flex shrink-0 overflow-hidden rounded-[3px] ring-1 ring-(--border)">
      {colors.map((c, i) => (
        <span key={i} className={className} style={{ background: c }} />
      ))}
    </span>
  )
}

/**
 * The site's theme picker (design "Theme Selector" 1a): a palette chip that opens a menu
 * of every app theme. With a mouse it opens on hover and stays open while you pick, so
 * trying a few is one sweep down the list; by touch a tap opens, a pick or a tap outside
 * closes. The page, hero and demo all retint through `lib/app-theme`.
 */
export function ThemePicker() {
  const [name, setName] = useAppTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const rowsRef = useRef<(HTMLButtonElement | null)[]>([])
  const pointerRef = useRef('')
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const focusRow = (i: number) =>
    rowsRef.current[(i + NAMES.length) % NAMES.length]?.focus()

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const at = rowsRef.current.indexOf(
      document.activeElement as HTMLButtonElement,
    )
    if (!open) setOpen(true)
    const from = at === -1 ? NAMES.indexOf(name) : at
    const step = at === -1 ? 0 : e.key === 'ArrowDown' ? 1 : -1
    // the rows mount with the menu; focus them once they exist
    requestAnimationFrame(() => focusRow(from + step))
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={onKeyDown}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return
        clearTimeout(closeTimer.current)
        setOpen(true)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return
        closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
      }}
      onPointerDown={(e) => {
        pointerRef.current = e.pointerType
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Theme: ${themeLabel(name)}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(e) => {
          // a mouse already opened it by hovering; a click mustn't snap it shut
          if (e.detail > 0 && pointerRef.current === 'mouse') setOpen(true)
          else setOpen((o) => !o)
        }}
        className="inline-flex h-[30px] cursor-pointer items-center rounded-md border border-(--border) bg-transparent px-2 hover:border-(--accent)"
      >
        {/* page vars, not the store: right from first paint, before hydration */}
        <Swatches
          className="h-3.5 w-[7px]"
          colors={[
            'var(--bg)',
            'var(--chip)',
            'var(--fg)',
            'var(--cta)',
            'var(--green)',
          ]}
        />
      </button>
      {open ? (
        // pt-2 bridges trigger and menu, so the pointer never "leaves" crossing the gap
        <div className="absolute top-full right-0 z-30 pt-2">
          <div
            role="group"
            aria-label="Themes"
            className="max-h-[min(70svh,520px)] w-60 overflow-y-auto rounded-lg border border-(--border) bg-(--panel) p-1 backdrop-blur-md"
            style={{ boxShadow: 'var(--shadow)' }}
          >
            {NAMES.map((n, i) => {
              const t = themeTokens(n)
              const picked = n === name
              return (
                <button
                  key={n}
                  ref={(el) => {
                    rowsRef.current[i] = el
                  }}
                  type="button"
                  aria-pressed={picked}
                  onClick={(e) => {
                    setName(n)
                    if (e.detail > 0 && pointerRef.current !== 'mouse')
                      setOpen(false)
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md border-none px-2 py-1.5 text-left font-mono text-[12.5px] outline-none focus-visible:ring-1 focus-visible:ring-(--accent) ${
                    picked
                      ? 'bg-(--sel) text-(--fg)'
                      : 'bg-transparent text-(--body) hover:bg-(--chip) hover:text-(--fg)'
                  }`}
                >
                  <Swatches
                    className="size-3"
                    colors={[t.bg, t.surface, t.fg, t.accent, t.good]}
                  />
                  <span className="flex-1 truncate">{themeLabel(n)}</span>
                  <Check
                    size={13}
                    strokeWidth={2}
                    className={picked ? 'text-(--cta)' : 'invisible'}
                  />
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
