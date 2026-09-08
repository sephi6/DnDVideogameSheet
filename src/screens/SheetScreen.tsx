import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, HintBar } from '@/components/ui/controls'
import { isMuted, play, setMuted } from '@/lib/sfx'
import { isTyping } from '@/lib/keys'
import { IdentitySection } from '@/sections/IdentitySection'
import { AbilitiesSection } from '@/sections/AbilitiesSection'
import { SkillsSection } from '@/sections/SkillsSection'
import { CombatSection } from '@/sections/CombatSection'
import { SpellsSection } from '@/sections/SpellsSection'
import { InventorySection } from '@/sections/InventorySection'
import { FeaturesSection } from '@/sections/FeaturesSection'
import { JournalSection } from '@/sections/JournalSection'
import type { SectionProps } from '@/sections/types'
import type { SyncStatus } from '@/store/roster'
import type { Character } from '@/types/character'

const SECTIONS: { id: string; label: string; glyph: string; Component: (p: SectionProps) => JSX.Element }[] = [
  { id: 'identidad', label: 'Identidad', glyph: '✦', Component: IdentitySection },
  { id: 'aptitudes', label: 'Aptitudes', glyph: '◈', Component: AbilitiesSection },
  { id: 'habilidades', label: 'Habilidades', glyph: '✧', Component: SkillsSection },
  { id: 'combate', label: 'Combate', glyph: '⚔', Component: CombatSection },
  { id: 'conjuros', label: 'Conjuros', glyph: '✺', Component: SpellsSection },
  { id: 'equipo', label: 'Equipo', glyph: '◆', Component: InventorySection },
  { id: 'rasgos', label: 'Rasgos', glyph: '❖', Component: FeaturesSection },
  { id: 'diario', label: 'Diario', glyph: '✍', Component: JournalSection },
]

interface Props {
  character: Character
  update: (recipe: (draft: Character) => void) => void
  onExit: () => void
  sync: SyncStatus
  syncError: string | null
  onRetry: () => void
}

const SYNC_LABEL: Record<SyncStatus, string> = {
  idle: '',
  saving: '● Guardando…',
  saved: '● Guardado',
  error: '▲ Sin guardar',
}

export function SheetScreen({ character, update, onExit, sync, syncError, onRetry }: Props) {
  const [index, setIndex] = useState(0)
  const [muted, setMutedState] = useState(isMuted())
  const active = SECTIONS[index]

  // El sonido se dispara fuera del updater: StrictMode los invoca dos veces.
  const goto = useCallback(
    (next: number, cue: 'move' | 'confirm' = 'move') => {
      const target = (next + SECTIONS.length) % SECTIONS.length
      if (target !== index) play(cue)
      setIndex(target)
    },
    [index],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        play('back')
        onExit()
        return
      }
      if (isTyping(e.target)) return
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        goto(index + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'q' || e.key === 'Q') {
        e.preventDefault()
        goto(index - 1)
      } else if (/^[1-8]$/.test(e.key)) {
        e.preventDefault()
        goto(Number(e.key) - 1, 'confirm')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goto, index, onExit])

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${character.identity.name.replace(/\s+/g, '-').toLowerCase() || 'ficha'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const Section = active.Component

  return (
    <div className="sheet" style={{ ['--accent' as string]: character.identity.accent }}>
      <div className="sheet-ident">
        <img className="portrait" src={character.identity.portrait ?? 'assets/portraits/default.svg'} alt="" />
        <div className="who">
          <div className="n">{character.identity.name}</div>
          <div className="c">
            Nv {character.identity.level} {character.identity.className}
          </div>
        </div>
      </div>

      <header className="sheet-head">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            className="section-name"
            initial={{ opacity: 0, x: -40, skewX: -14 }}
            animate={{ opacity: 1, x: 0, skewX: -6 }}
            exit={{ opacity: 0, x: 30, skewX: -14 }}
            transition={{ duration: 0.15 }}
          >
            {active.glyph} {active.label}
          </motion.div>
        </AnimatePresence>
        <div className="head-actions">
          {sync !== 'idle' && (
            <span className="save-dot" data-state={sync} title={syncError ?? undefined}>
              {SYNC_LABEL[sync]}
            </span>
          )}
          {sync === 'error' && (
            <Button variant="small ghost danger" onClick={onRetry}>Reintentar</Button>
          )}
          <Button variant="small ghost" onClick={exportJson}>Exportar</Button>
          <Button
            variant="small ghost"
            onClick={() => {
              const next = !muted
              setMuted(next)
              setMutedState(next)
            }}
          >
            {muted ? 'Sonido: off' : 'Sonido: on'}
          </Button>
          <Button variant="small ghost" cue="back" onClick={onExit}>◂ Salir</Button>
        </div>
      </header>

      <nav className="sheet-nav" aria-label="Secciones de la ficha">
        {SECTIONS.map((section, i) => (
          <motion.button
            key={section.id}
            type="button"
            className="nav-item"
            data-active={i === index}
            onClick={() => goto(i, 'confirm')}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: i === index ? 14 : 0 }}
            transition={{ delay: i * 0.035, type: 'spring', stiffness: 380, damping: 28 }}
          >
            <span className="idx">{i + 1}</span>
            <span>{section.glyph}</span>
            <span>{section.label}</span>
          </motion.button>
        ))}
        <div className="nav-spacer" />
      </nav>

      <div className="sheet-body">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, x: 48, skewX: -5 }}
            animate={{ opacity: 1, x: 0, skewX: 0 }}
            exit={{ opacity: 0, x: -28, skewX: 3 }}
            transition={{ duration: 0.17, ease: [0.35, 0, 0.2, 1] }}
          >
            <Section character={character} update={update} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sheet-hints">
        <HintBar
          hints={[
            ['↑ ↓', 'Navegar'],
            ['1-8', 'Ir a sección'],
            ['Esc', 'Volver a la party'],
          ]}
        />
      </div>
    </div>
  )
}
