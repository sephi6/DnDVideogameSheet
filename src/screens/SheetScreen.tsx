import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, HintBar, OverflowMenu } from '@/components/ui/controls'
import { isMuted, play, setMuted } from '@/lib/sfx'
import { isTyping } from '@/lib/keys'
import { useHorizontalSwipe, useIsPhone } from '@/lib/responsive'
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
  { id: 'identity', label: 'Identity', glyph: '✦', Component: IdentitySection },
  { id: 'abilities', label: 'Abilities', glyph: '◈', Component: AbilitiesSection },
  { id: 'skills', label: 'Skills', glyph: '✧', Component: SkillsSection },
  { id: 'combat', label: 'Combat', glyph: '⚔', Component: CombatSection },
  { id: 'spells', label: 'Spells', glyph: '✺', Component: SpellsSection },
  { id: 'equipment', label: 'Equipment', glyph: '◆', Component: InventorySection },
  { id: 'features', label: 'Features', glyph: '❖', Component: FeaturesSection },
  { id: 'journal', label: 'Journal', glyph: '✍', Component: JournalSection },
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
  saving: '● Saving…',
  saved: '● Saved',
  error: '▲ Unsaved',
}

/** On a phone the header has no room for the whole phrase, but the state stays visible. */
const SYNC_GLYPH: Record<SyncStatus, string> = {
  idle: '',
  saving: '●',
  saved: '●',
  error: '▲',
}

export function SheetScreen({ character, update, onExit, sync, syncError, onRetry }: Props) {
  const [index, setIndex] = useState(0)
  const [muted, setMutedState] = useState(isMuted())
  const active = SECTIONS[index]
  const isPhone = useIsPhone()
  const navRef = useRef<HTMLElement>(null)

  // The sound fires outside the updater: StrictMode invokes them twice.
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

  // The bottom strip is wider than the screen: the active section centres itself,
  // whether the change came from a tap, the keyboard or a swipe.
  useEffect(() => {
    const item = navRef.current?.children[index] as HTMLElement | undefined
    item?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [index])

  // The touch equivalent of the L/R shoulder buttons: swiping changes section.
  const bodyRef = useHorizontalSwipe<HTMLDivElement>({
    onLeft: () => goto(index + 1),
    onRight: () => goto(index - 1),
    enabled: isPhone,
  })

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${character.identity.name.replace(/\s+/g, '-').toLowerCase() || 'character-sheet'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const Section = active.Component

  const retryAction = sync === 'error' && (
    <Button variant="small ghost danger" onClick={onRetry}>Retry</Button>
  )
  const exportAction = (
    <Button variant="small ghost" onClick={exportJson}>Export</Button>
  )
  const soundAction = (
    <Button
      variant="small ghost"
      onClick={() => {
        const next = !muted
        setMuted(next)
        setMutedState(next)
      }}
    >
      {muted ? 'Sound: off' : 'Sound: on'}
    </Button>
  )

  return (
    <div className="sheet" style={{ ['--accent' as string]: character.identity.accent }}>
      <div className="sheet-ident">
        <img className="portrait" src={character.identity.portrait ?? 'assets/portraits/default.svg'} alt="" />
        <div className="who">
          <div className="n">{character.identity.name}</div>
          <div className="c">
            Lv {character.identity.level} {character.identity.className}
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
            <span
              className="save-dot"
              data-state={sync}
              title={syncError ?? undefined}
              aria-label={SYNC_LABEL[sync]}
            >
              {isPhone ? SYNC_GLYPH[sync] : SYNC_LABEL[sync]}
            </span>
          )}
          {isPhone ? (
            <>
              <OverflowMenu>
                {retryAction}
                {exportAction}
                {soundAction}
              </OverflowMenu>
              <Button variant="small ghost" cue="back" onClick={onExit} title="Back to the party">
                ◂
              </Button>
            </>
          ) : (
            <>
              {retryAction}
              {exportAction}
              {soundAction}
              <Button variant="small ghost" cue="back" onClick={onExit}>◂ Exit</Button>
            </>
          )}
        </div>
      </header>

      <nav className="sheet-nav" aria-label="Character sheet sections" ref={navRef}>
        {SECTIONS.map((section, i) => (
          <motion.button
            key={section.id}
            type="button"
            className="nav-item"
            data-active={i === index}
            onClick={() => goto(i, 'confirm')}
            // In the sidebar the active section juts out to the right. In the
            // bottom strip that only throws the gap off, so there it rises
            // instead, like the active card in the party carousel.
            initial={{ opacity: 0, x: isPhone ? 0 : -50, y: isPhone ? 12 : 0 }}
            animate={{
              opacity: 1,
              x: isPhone ? 0 : i === index ? 14 : 0,
              y: isPhone && i === index ? -5 : 0,
            }}
            transition={{ delay: i * 0.035, type: 'spring', stiffness: 380, damping: 28 }}
          >
            <span className="idx">{i + 1}</span>
            <span>{section.glyph}</span>
            <span>{section.label}</span>
          </motion.button>
        ))}
        <div className="nav-spacer" />
      </nav>

      <div className="sheet-body" ref={bodyRef}>
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
            ['↑ ↓', 'Navigate'],
            ['1-8', 'Go to section'],
            ['Esc', 'Back to the party'],
          ]}
        />
      </div>
    </div>
  )
}
