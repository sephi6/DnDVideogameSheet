import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, SelectField, TextField } from '@/components/ui/controls'
import { ATTITUDES, ATTITUDE_LABEL, entriesForTab, kindInfo, moveSelection } from '@/lib/codex'
import { useFocusTrap, useSheetBodyRect } from '@/lib/focus'
import { isTyping } from '@/lib/keys'
import { useIsPhone, useMediaQuery } from '@/lib/responsive'
import { play } from '@/lib/sfx'
import { useCodex } from '@/store/codex'
import { useRoster } from '@/store/roster'
import type { Attitude, CodexEntry, CodexKind } from '@/types/codex'
import { CodexCard } from './CodexCard'
import { CodexPage } from './CodexPage'

/** Keys the sheet and the Journal listen for on window: held back while the page is open. */
const HELD_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'w', 's', 'q', 'e', 'W', 'S', 'Q', 'E', '[', ']',
  '1', '2', '3', '4', '5', '6', '7', '8',
])
const PREV = new Set(['ArrowLeft', 'a', 'A'])
const NEXT = new Set(['ArrowRight', 'd', 'D'])

export function CodexWall({ kind, characterId, openId, onOpen, onNavigate }: {
  kind: CodexKind
  characterId: string
  openId: string | null
  onOpen: (id: string | null) => void
  onNavigate: (entry: CodexEntry) => void
}) {
  const { entries, fresh, loaded, failedCount, markSeen, retryFailed } = useCodex()
  const roster = useRoster((s) => s.characters)
  const info = kindInfo(kind)
  const isPhone = useIsPhone()
  const isTablet = useMediaQuery('(max-width: 1023px)')
  const reduce = useReducedMotion()
  const [query, setQuery] = useState('')
  const [attitude, setAttitude] = useState<Attitude | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const cards = useRef(new Map<string, HTMLButtonElement>())
  const anchor = useRef<HTMLDivElement>(null)
  const drawer = useRef<HTMLDivElement>(null)

  const list = useMemo(() => entriesForTab(entries, kind, query, attitude), [entries, kind, query, attitude])
  const ids = useMemo(() => list.map((e) => e.id), [list])
  const selected = selectedId && ids.includes(selectedId) ? selectedId : ids[0] ?? null
  const open = openId ? entries.find((e) => e.id === openId) ?? null : null
  const drawerOpen = open !== null
  const rect = useSheetBodyRect(anchor, drawerOpen)
  useFocusTrap(drawer, drawerOpen)

  // The editor (next task) creates entries for this character.
  void characterId

  useEffect(() => {
    setQuery('')
    setAttitude(null)
  }, [kind])

  // The open entry was deleted (here or elsewhere): close the page.
  useEffect(() => {
    if (openId && !open) onOpen(null)
  }, [openId, open, onOpen])

  useEffect(() => {
    if (!open) return
    setSelectedId(open.id)
    markSeen(open.id)
  }, [open, markSeen])

  const focusCard = useCallback((id: string) => {
    requestAnimationFrame(() => cards.current.get(id)?.focus())
  }, [])

  const close = useCallback(() => {
    const back = openId
    play('back')
    onOpen(null)
    if (back) focusCard(back)
  }, [openId, onOpen, focusCard])

  // The wall: ← → (A D) move the selection, Enter opens it.
  useEffect(() => {
    if (drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      if (PREV.has(e.key) || NEXT.has(e.key)) {
        e.preventDefault()
        const next = moveSelection(ids, selected, PREV.has(e.key) ? -1 : 1)
        if (next && next !== selected) {
          play('move')
          setSelectedId(next)
          focusCard(next)
        }
      } else if (e.key === 'Enter' && selected) {
        // A focused button handles its own Enter (native click).
        if (e.target instanceof HTMLElement && e.target.closest('button, a')) return
        e.preventDefault()
        play('confirm')
        onOpen(selected)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, ids, selected, onOpen, focusCard])

  // The page: a CAPTURE listener runs before the sheet's window listeners.
  // Escape closes the page instead of leaving the sheet; section keys are held
  // back unless typed into a field; ← → (A D) page through the wall.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        close()
        return
      }
      if (isTyping(e.target)) return
      if (HELD_KEYS.has(e.key)) {
        e.stopPropagation()
        return
      }
      if (open && (PREV.has(e.key) || NEXT.has(e.key))) {
        e.stopPropagation()
        e.preventDefault()
        const next = moveSelection(ids, open.id, PREV.has(e.key) ? -1 : 1)
        if (next && next !== open.id) {
          play('move')
          onOpen(next)
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [drawerOpen, open, ids, close, onOpen])

  const width = rect ? (isPhone ? rect.width : Math.min(640, rect.width * (isTablet ? 0.85 : 0.7))) : 0
  // Portal into .sheet: fixed positioning stays relative to the viewport even
  // if the section wrapper is transformed by its transition.
  const host = anchor.current?.closest<HTMLElement>('.sheet') ?? null

  return (
    <div className="cx-wall" ref={anchor} data-shape={info.shape}>
      <div className="cx-tools">
        <div className="cx-search">
          <TextField label="Search" value={query} onChange={setQuery} placeholder="Name, role or notes" />
        </div>
        {info.hasAttitude && (
          <div className="cx-filter">
            <SelectField
              label="Attitude"
              value={attitude ? ATTITUDE_LABEL[attitude] : 'All'}
              options={['All', ...ATTITUDES.map((a) => ATTITUDE_LABEL[a])]}
              onChange={(v) => setAttitude(ATTITUDES.find((a) => ATTITUDE_LABEL[a] === v) ?? null)}
            />
          </div>
        )}
        <span className="cx-spacer" />
        {failedCount > 0 && (
          <span className="cx-failed">
            Couldn't save {failedCount} {failedCount === 1 ? 'entry' : 'entries'}
            <Button variant="small danger" onClick={() => void retryFailed()}>Retry</Button>
          </span>
        )}
      </div>

      {!loaded && <p className="cx-empty">Opening the codex…</p>}
      {loaded && list.length === 0 && (
        <p className="cx-empty">
          {query ? `Nothing matches "${query}".` : attitude ? `No ${ATTITUDE_LABEL[attitude].toLowerCase()} ${info.label.toLowerCase()}.` : `No ${info.label.toLowerCase()} yet.`}
        </p>
      )}

      <div className="cx-grid">
        {list.map((e) => (
          <CodexCard
            key={e.id}
            entry={e}
            selected={e.id === selected}
            fresh={fresh.includes(e.id)}
            onFocus={() => setSelectedId(e.id)}
            onOpen={() => onOpen(e.id)}
            cardRef={(el) => {
              if (el) cards.current.set(e.id, el)
              else cards.current.delete(e.id)
            }}
          />
        ))}
      </div>

      {host && createPortal(
        <AnimatePresence>
          {drawerOpen && rect && (
            <motion.div
              key="scrim"
              className="cx-scrim"
              style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.18 }}
              onClick={close}
            />
          )}
          {drawerOpen && rect && (
            <motion.div
              key="drawer"
              ref={drawer}
              className="cx-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cx-page-title"
              style={{ top: rect.top, left: rect.right - width, width, height: rect.height }}
              initial={reduce ? { opacity: 0 } : { x: 48, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { x: 32, opacity: 0, transition: { duration: 0.14 } }}
              transition={{ duration: reduce ? 0 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {open && (
                <CodexPage
                  entry={open}
                  entries={entries}
                  roster={roster}
                  isPhone={isPhone}
                  onEdit={() => play('error')}
                  onClose={close}
                  onNavigate={onNavigate}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        host,
      )}
    </div>
  )
}
