import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

type Phase = 'cover' | 'reveal'

const COVER_MS = 340
const REVEAL_MS = 420
/** Si la animación no avisa de que ha terminado, el barrido se cierra igual. */
const FAILSAFE_MS = 1200

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Barrido rojo en diagonal entre pantallas: cubre, ejecuta el cambio y descubre.
 * Es el equivalente al corte de escena de los menús de Persona.
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

  /** Ejecuta el cambio de pantalla pendiente, una sola vez. */
  const runPending = useCallback(() => {
    const pending = action.current
    action.current = null
    pending?.()
  }, [])

  const run = useCallback(
    (label: string, fn: () => void) => {
      // Con movimiento reducido no hay barrido: el cambio es inmediato.
      if (prefersReducedMotion()) {
        fn()
        return
      }
      action.current = fn
      setWipe({ label, phase: 'cover' })
    },
    [],
  )

  // El efecto secundario vive aquí, nunca dentro de un updater de estado:
  // React invoca los updaters dos veces en StrictMode y la acción se perdería.
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

    // Red de seguridad: si la pestaña está en segundo plano, o la animación
    // no llega a completarse, la navegación no se queda colgada.
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
