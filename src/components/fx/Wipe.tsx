import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

type Phase = 'cover' | 'reveal'

const COVER_MS = 340
const REVEAL_MS = 420
/** If the animation never reports it finished, the wipe closes anyway. */
const FAILSAFE_MS = 1200

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Diagonal red wipe between screens: it covers, runs the change and uncovers.
 * The equivalent of the scene cut in the Persona menus.
 */
export function useWipe() {
  const [wipe, setWipe] = useState<{ label: string; phase: Phase } | null>(null)
  const action = useRef<(() => void) | null>(null)
  const failsafe = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearFailsafe = () => {
    if (failsafe.current) {
      clearTimeout(failsafe.current)
      failsafe.current = null
    }
  }

  /** Runs the pending screen change, exactly once. */
  const runPending = useCallback(() => {
    const pending = action.current
    action.current = null
    pending?.()
  }, [])

  const run = useCallback(
    (label: string, fn: () => void) => {
      // With reduced motion there is no wipe: the change is immediate.
      if (prefersReducedMotion()) {
        fn()
        return
      }
      action.current = fn
      setWipe({ label, phase: 'cover' })
    },
    [],
  )

  // The side effect lives here, never inside a state updater: React invokes
  // updaters twice in StrictMode and the action would be lost.
  const onPhaseEnd = useCallback(() => {
    clearFailsafe()
    setWipe((current) => {
      if (!current) return null
      return current.phase === 'cover' ? { ...current, phase: 'reveal' } : null
    })
  }, [])

  useEffect(() => {
    if (!wipe) return
    if (wipe.phase === 'reveal') runPending()

    // Safety net: if the tab is in the background, or the animation never
    // completes, navigation must not hang.
    clearFailsafe()
    failsafe.current = setTimeout(onPhaseEnd, FAILSAFE_MS)
    return clearFailsafe
  }, [onPhaseEnd, runPending, wipe])

  useEffect(() => clearFailsafe, [])

  const overlay = (
    <AnimatePresence>
      {wipe && (
        <motion.div key="wipe-layer" style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none' }}>
          <motion.div
            key={wipe.phase}
            className="wipe"
            initial={{ x: wipe.phase === 'cover' ? '-140%' : '0%', skewX: -12 }}
            animate={{ x: wipe.phase === 'cover' ? '0%' : '140%', skewX: -12 }}
            transition={{
              duration: (wipe.phase === 'cover' ? COVER_MS : REVEAL_MS) / 1000,
              ease: [0.7, 0, 0.2, 1],
            }}
            onAnimationComplete={onPhaseEnd}
          />
          {wipe.phase === 'cover' && wipe.label && (
            <motion.div
              className="wipe-text"
              initial={{ opacity: 0, scale: 1.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28, delay: 0.08 }}
            >
              {wipe.label}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return { run, overlay, busy: wipe !== null }
}
