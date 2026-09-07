import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'

type Phase = 'cover' | 'reveal'

/**
 * Barrido rojo en diagonal entre pantallas: cubre, ejecuta el cambio y descubre.
 * Es el equivalente al corte de escena de los menús de Persona.
 */
export function useWipe() {
  const [wipe, setWipe] = useState<{ label: string; phase: Phase } | null>(null)
  const action = useRef<(() => void) | null>(null)

  const run = useCallback((label: string, fn: () => void) => {
    action.current = fn
    setWipe({ label, phase: 'cover' })
  }, [])

  const onPhaseEnd = useCallback(() => {
    setWipe((current) => {
      if (!current) return null
      if (current.phase === 'cover') {
        action.current?.()
        action.current = null
        return { ...current, phase: 'reveal' }
      }
      return null
    })
  }, [])

  const overlay = (
    <AnimatePresence>
      {wipe && (
        <motion.div key="wipe-layer" style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none' }}>
          <motion.div
            key={wipe.phase}
            className="wipe"
            style={{ transform: 'skewX(-12deg)' }}
            initial={{ x: wipe.phase === 'cover' ? '-140%' : '0%' }}
            animate={{ x: wipe.phase === 'cover' ? '0%' : '140%' }}
            transition={{ duration: wipe.phase === 'cover' ? 0.34 : 0.42, ease: [0.7, 0, 0.2, 1] }}
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
