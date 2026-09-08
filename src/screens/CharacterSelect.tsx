import { useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, HintBar } from '@/components/ui/controls'
import { ABILITIES, formatModifier } from '@/data/rules'
import { abilityModifier } from '@/data/rules'
import { isTyping } from '@/lib/keys'
import { play } from '@/lib/sfx'
import type { Character } from '@/types/character'

interface Props {
  characters: Character[]
  index: number
  onIndexChange: (i: number) => void
  onOpen: (character: Character) => void
  onCreate: () => void
  onDelete: (character: Character) => void
  onDuplicate: (character: Character) => void
  /** Null when the app runs without Supabase (local mode, no login). */
  userEmail: string | null
  onSignOut: () => void
  /** Sheets in this browser that are not in the cloud yet. */
  pendingLocalImport: number
  onImportLocal: () => void
  onSeedDemo: () => void
}

export function CharacterSelect({
  characters,
  index,
  onIndexChange,
  onOpen,
  onCreate,
  onDelete,
  onDuplicate,
  userEmail,
  onSignOut,
  pendingLocalImport,
  onImportLocal,
  onSeedDemo,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null)
  const current = characters[index]

  const move = useCallback(
    (delta: number) => {
      if (characters.length === 0) return
      play('move')
      const next = (index + delta + characters.length) % characters.length
      onIndexChange(next)
    },
    [characters.length, index, onIndexChange],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      switch (e.key) {
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          move(1)
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          move(-1)
          break
        case 'Enter':
          e.preventDefault()
          if (current) {
            play('confirm')
            onOpen(current)
          }
          break
        case 'n':
        case 'N':
          e.preventDefault()
          play('confirm')
          onCreate()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, move, onCreate, onOpen])

  useEffect(() => {
    const rail = railRef.current
    const card = rail?.children[index] as HTMLElement | undefined
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [index])

  const accent = current?.identity.accent ?? 'var(--blood)'

  return (
    <div className="select-screen" style={{ ['--accent' as string]: accent }}>
      <header className="screen-head">
        <div>
          <span className="slab"><span>Select your character</span></span>
          <h1 style={{ marginTop: 10 }}>The party</h1>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {userEmail && (
            <span className="label session-tag" title={userEmail}>
              {userEmail}
            </span>
          )}
          {pendingLocalImport > 0 && (
            <Button variant="ghost small" onClick={onImportLocal}>
              Upload {pendingLocalImport} local one(s)
            </Button>
          )}
          <Button variant="ghost small" onClick={onCreate}>+ New</Button>
          {current && <Button variant="ghost small" onClick={() => onDuplicate(current)}>Duplicate</Button>}
          {current && (
            <Button
              variant="ghost small danger"
              cue="back"
              onClick={() => {
                if (confirm(`Delete ${current.identity.name}? This cannot be undone.`)) onDelete(current)
              }}
            >
              Delete
            </Button>
          )}
          {userEmail && (
            <Button variant="ghost small" cue="back" onClick={onSignOut}>Sign out</Button>
          )}
        </div>
      </header>

      <div className="select-body">
        <div className="hero-slot">
          <AnimatePresence mode="wait">
            {current && (
              <motion.button
                key={current.id}
                type="button"
                className="hero-card"
                onClick={() => {
                  play('confirm')
                  onOpen(current)
                }}
                initial={{ opacity: 0, x: 90, rotate: -12, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, rotate: -3, scale: 1 }}
                exit={{ opacity: 0, x: -70, rotate: 6, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                whileHover={{ rotate: -1, scale: 1.02 }}
                style={{ padding: 0, cursor: 'pointer' }}
              >
                <img src={current.identity.portrait ?? 'assets/portraits/default.svg'} alt="" />
                <span className="hero-name">{current.identity.name}</span>
                <span className="hero-sub">
                  Lv {current.identity.level} · {current.identity.className}
                  {current.identity.subclass ? ` · ${current.identity.subclass}` : ''}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
          {!current && (
            <div className="stack" style={{ gap: 12, textAlign: 'center' }}>
              <div className="empty">The party is empty. Press "N" to create a character.</div>
              <Button variant="ghost" onClick={onSeedDemo}>Load example characters</Button>
            </div>
          )}
        </div>

        {current && (
          <div className="hero-meta">
            <motion.div
              key={`${current.id}-meta`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.3 }}
              className="stack"
            >
              <div className="hero-tagline">
                {current.identity.tagline || `${current.identity.species} · ${current.identity.background}`}
              </div>
              <div className="hero-stats">
                {ABILITIES.map((ability) => (
                  <div key={ability.key} className="hero-stat">
                    <div className="k">{ability.short}</div>
                    <div className="v">
                      {current.abilities[ability.key]}
                      <span style={{ fontSize: 16, color: 'var(--bone-dim)', marginLeft: 6 }}>
                        {formatModifier(abilityModifier(current.abilities[ability.key]))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hero-stats">
                <div className="hero-stat"><div className="k">HP</div><div className="v">{current.combat.hpCurrent}/{current.combat.hpMax}</div></div>
                <div className="hero-stat"><div className="k">AC</div><div className="v">{current.combat.armorClass}</div></div>
                <div className="hero-stat"><div className="k">Speed</div><div className="v">{current.combat.speed} ft.</div></div>
              </div>
              <Button onClick={() => onOpen(current)} cue="confirm">Open sheet ▸</Button>
            </motion.div>
          </div>
        )}
      </div>

      <div>
        <div className="roster-rail" ref={railRef}>
          {characters.map((character, i) => (
            <motion.button
              key={character.id}
              type="button"
              className="roster-card"
              data-active={i === index}
              onClick={() => {
                if (i === index) {
                  play('confirm')
                  onOpen(character)
                } else {
                  play('move')
                  onIndexChange(i)
                }
              }}
              animate={{
                y: i === index ? -18 : 0,
                scale: i === index ? 1.1 : 1,
                filter: i === index ? 'saturate(1.15)' : 'saturate(0.5) brightness(0.72)',
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              style={{ ['--accent' as string]: character.identity.accent }}
            >
              <img src={character.identity.portrait ?? 'assets/portraits/default.svg'} alt="" />
              <span className="rc-name">{character.identity.name}</span>
            </motion.button>
          ))}
          <button type="button" className="roster-card new-card" onClick={() => { play('confirm'); onCreate() }}>
            +
          </button>
        </div>
        <HintBar
          hints={[
            ['← →', 'Switch'],
            ['Enter', 'Open sheet'],
            ['N', 'New character'],
          ]}
        />
      </div>
    </div>
  )
}
