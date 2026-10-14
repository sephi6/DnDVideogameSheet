import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { play } from '@/lib/sfx'

export function TitleScreen({ onStart }: { onStart: () => void }) {
  useEffect(() => {
    const start = () => {
      play('confirm')
      onStart()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') return
      start()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', start)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', start)
    }
  }, [onStart])

  return (
    <div className="title-screen">
      <div>
        <motion.div
          className="title-mark"
          initial={{ opacity: 0, y: 60, scale: 1.2 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 18 }}
        >
          Arcana
        </motion.div>
        <div className="title-divider">
          <svg className="orn" viewBox="0 0 240 16" aria-hidden="true">
            <g strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke">
              <path d="M0 8 H98" />
              <path d="M142 8 H240" />
              <path d="M120 1.5 L126.5 8 L120 14.5 L113.5 8 Z" />
              <path d="M104 5.5 L106.5 8 L104 10.5 L101.5 8 Z" />
              <path d="M136 5.5 L138.5 8 L136 10.5 L133.5 8 Z" />
            </g>
          </svg>
        </div>
        <motion.div
          className="title-sub"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          Dungeons &amp; Dragons 2024 character sheets
        </motion.div>
        <motion.div
          className="title-cta"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ delay: 0.6, duration: 1.8, repeat: Infinity }}
        >
          Press any key
        </motion.div>
      </div>
    </div>
  )
}
