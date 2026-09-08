import { useEffect, useRef, useState } from 'react'
import { isTyping } from '@/lib/keys'

/** The same breakpoint responsive.css uses to move navigation down to the thumb. */
export const PHONE_QUERY = '(max-width: 599px)'

/** Subscribes to a media query, for what CSS alone cannot decide. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const sync = () => setMatches(mql.matches)
    sync() // In case it changed between the first render and this effect.
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [query])

  return matches
}

export function useIsPhone(): boolean {
  return useMediaQuery(PHONE_QUERY)
}

/** Minimum travel to count as a gesture rather than a shaky tap. */
const SWIPE_MIN = 60
/** How much more horizontal than vertical: below this the finger was scrolling. */
const SWIPE_RATIO = 1.6

interface SwipeOptions {
  /** Finger to the left: the content advances. */
  onLeft: () => void
  /** Finger to the right: the content goes back. */
  onRight: () => void
  enabled?: boolean
}

/**
 * Horizontal swipe, the touch equivalent of the L/R shoulder buttons on a
 * console menu. Listens to touch only: with a mouse, dragging is selecting
 * text, not navigating.
 */
export function useHorizontalSwipe<T extends HTMLElement>({
  onLeft,
  onRight,
  enabled = true,
}: SwipeOptions) {
  const ref = useRef<T>(null)
  // The listener is registered once but always has to call the latest version
  // of the callbacks, which change on every render.
  const latest = useRef({ onLeft, onRight })
  useEffect(() => {
    latest.current = { onLeft, onRight }
  })

  useEffect(() => {
    const node = ref.current
    if (!node || !enabled) return

    let startX = 0
    let startY = 0
    let tracking = false

    const onStart = (e: TouchEvent) => {
      // Two fingers is a zoom, and inside a field the finger is placing the caret.
      tracking = e.touches.length === 1 && !isTyping(e.target)
      if (!tracking) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const touch = e.changedTouches[0]
      if (!touch) return
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      if (Math.abs(dx) < SWIPE_MIN) return
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return
      if (dx < 0) latest.current.onLeft()
      else latest.current.onRight()
    }

    // Passive: the gesture never cancels scrolling, it only watches it.
    node.addEventListener('touchstart', onStart, { passive: true })
    node.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      node.removeEventListener('touchstart', onStart)
      node.removeEventListener('touchend', onEnd)
    }
  }, [enabled])

  return ref
}
