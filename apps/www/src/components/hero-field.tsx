'use client'

import { useEffect, useRef } from 'react'

import { useAppTheme } from '@/lib/app-theme'
import {
  type Pulse,
  alive,
  applyKey,
  fieldRamp,
  keyPulse,
  paintFrame,
  ringPulse,
  stepTypist,
  typist,
} from '@/lib/hero-field'
import { themeTokens } from '@/lib/page-theme'

const FRAME_MS = 30
const HUMAN_GRACE_MS = 4000

function typingElsewhere(): boolean {
  const el = document.activeElement
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
  )
}

/**
 * The hero band: a pixel field in the active app theme behind the headline. Hover it and
 * type — keys pulse along the prompt row, Enter rings. All drawing is `lib/hero-field`;
 * this component owns the canvas, the clock, the listeners and nothing else.
 *
 * The field draws in the same app theme the whole page wears (`lib/page-theme`), so the
 * copy and buttons on top of it need no scoping of their own.
 */
export function HeroField({ children }: { children: React.ReactNode }) {
  const [themeName] = useAppTheme()
  const theme = themeTokens(themeName)
  const sectionRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rampRef = useRef(fieldRamp(theme))
  const redrawRef = useRef<() => void>(() => {})

  useEffect(() => {
    rampRef.current = fieldRamp(theme)
    redrawRef.current()
  }, [theme])

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!section || !canvas || !ctx) return
    const typed = section.querySelector<HTMLElement>('[data-hero-typed]')
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    let dpr = 1
    let pulses: Pulse[] = []
    let line = ''
    let bot = typist()
    let hovered = false
    let lastHuman = -Infinity
    let press: { x: number; y: number; at: number } | null = null
    const cursor = { x: 0, y: 0, strength: 0, target: 0 }
    let raf = 0
    let lastDraw = 0
    let visible = true
    let clearTimer: ReturnType<typeof setTimeout> | undefined

    const resize = () => {
      const rect = section.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(rect.width * dpr)
      const h = Math.round(rect.height * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }
    const toCanvas = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: ((clientX - rect.left) * canvas.width) / rect.width,
        y: ((clientY - rect.top) * canvas.height) / rect.height,
      }
    }
    const caret = () => {
      const r = typed?.getBoundingClientRect()
      return r
        ? toCanvas(r.right, r.top + r.height / 2)
        : { x: canvas.width / 2, y: canvas.height / 2 }
    }
    const setLine = (next: string) => {
      line = next
      if (typed) typed.textContent = next
    }
    const key = (k: string, now: number) => {
      const at = caret()
      if (k === 'Enter') {
        if (!line) return
        if (!reduced) pulses.push(ringPulse(at.x, at.y, now, 1))
        clearTimeout(clearTimer)
        clearTimer = setTimeout(() => setLine(''), 260)
        return
      }
      const next = applyKey(line, k)
      if (next === line) return
      setLine(next)
      if (!reduced)
        pulses.push(keyPulse(at.x, at.y, now, k === 'Backspace' ? 0.2 : 0.5))
    }

    const draw = (now: number) => {
      if (!reduced && !hovered && now - lastHuman > HUMAN_GRACE_MS) {
        const step = stepTypist(bot, now, Math.random)
        if (step) {
          bot = step.state
          key(step.key, now)
        }
      }
      cursor.strength += (cursor.target - cursor.strength) * 0.25
      pulses = pulses.filter((p) => alive(p, now)).slice(-6)
      paintFrame({
        ctx,
        ramp: rampRef.current,
        width: canvas.width,
        height: canvas.height,
        dpr,
        seconds: reduced ? 20 : now / 1000,
        now,
        pulses,
        cursor,
      })
    }
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - lastDraw < FRAME_MS) return
      lastDraw = now
      draw(now)
    }
    const start = () => {
      if (reduced) draw(performance.now())
      else if (visible && !raf) raf = requestAnimationFrame(loop)
    }
    redrawRef.current = () => {
      if (reduced) draw(performance.now())
    }

    const onMove = (e: PointerEvent) => {
      const p = toCanvas(e.clientX, e.clientY)
      cursor.x = p.x
      cursor.y = p.y
      const overControl =
        e.target instanceof Element && e.target.closest('a, button') !== null
      cursor.target = overControl || reduced ? 0 : 1
    }
    const onEnter = () => {
      hovered = true
    }
    const onLeave = () => {
      hovered = false
      cursor.target = 0
      press = null
    }
    const onDown = (e: PointerEvent) => {
      if (
        reduced ||
        (e.target instanceof Element && e.target.closest('a, button'))
      )
        return
      const p = toCanvas(e.clientX, e.clientY)
      press = { ...p, at: performance.now() }
    }
    const onUp = () => {
      if (!press) return
      const now = performance.now()
      pulses.push(
        ringPulse(press.x, press.y, now, Math.min(1, (now - press.at) / 1100)),
      )
      press = null
    }
    const onKey = (e: KeyboardEvent) => {
      if (!hovered || e.metaKey || e.ctrlKey || e.altKey || typingElsewhere())
        return
      if (e.key.length !== 1 && e.key !== 'Enter' && e.key !== 'Backspace')
        return
      // the hero owns these keys while the pointer is on it — space would scroll the page
      e.preventDefault()
      const now = performance.now()
      lastHuman = now
      key(e.key, now)
    }

    section.addEventListener('pointermove', onMove)
    section.addEventListener('pointerenter', onEnter)
    section.addEventListener('pointerleave', onLeave)
    section.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
    const ro = new ResizeObserver(() => {
      resize()
      draw(performance.now())
    })
    ro.observe(section)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true
      if (reduced) return
      if (visible && !raf) raf = requestAnimationFrame(loop)
      if (!visible && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    })
    io.observe(section)
    resize()
    start()

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(clearTimer)
      ro.disconnect()
      io.disconnect()
      redrawRef.current = () => {}
      section.removeEventListener('pointermove', onMove)
      section.removeEventListener('pointerenter', onEnter)
      section.removeEventListener('pointerleave', onLeave)
      section.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden border-b border-(--border) bg-(--bg) text-(--fg) select-none"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
      />
      <div className="relative">{children}</div>
    </section>
  )
}

/** The prompt line the field types into. Decorative: the real launcher demo is below. */
export function HeroPrompt() {
  return (
    // Fixed width, left-aligned: the line grows rightward from a still sigil instead of
    // re-centring on every key. `whitespace-pre` keeps a typed trailing space visible.
    <div
      aria-hidden="true"
      className="flex h-9 w-[min(32ch,100%)] items-center rounded-md bg-(--bg) px-2.5 text-left text-xl text-(--fg)"
    >
      <span className="mr-3 text-(--cta)">&gt;</span>
      <span data-hero-typed="" className="whitespace-pre" />
      <span className="hero-caret ml-px inline-block h-[22px] w-[11px] shrink-0 bg-(--cta)" />
    </div>
  )
}
