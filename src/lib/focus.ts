import { type RefObject, useEffect, useLayoutEffect, useState } from 'react'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'

/** While active, Tab and Shift+Tab cycle inside `ref` (a modal page or editor). */
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      const root = ref.current
      if (e.key !== 'Tab' || !root) return
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (!root.contains(current)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && current === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ref, active])
}

/**
 * The on-screen box of the sheet body that contains `anchor`, kept current on
 * resize, while `active`. The body's own scroll is locked meanwhile, so the page
 * laid over it stays put.
 */
export function useSheetBodyRect(anchor: RefObject<HTMLElement>, active: boolean): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useLayoutEffect(() => {
    if (!active) {
      setRect(null)
      return
    }
    const body = anchor.current?.closest<HTMLElement>('.sheet-body')
    if (!body) return
    const measure = () => setRect(body.getBoundingClientRect())
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(body)
    window.addEventListener('resize', measure)
    const overflow = body.style.overflowY
    body.style.overflowY = 'hidden'
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      body.style.overflowY = overflow
    }
  }, [anchor, active])
  return rect
}
