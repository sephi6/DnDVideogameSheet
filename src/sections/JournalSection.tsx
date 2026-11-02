import { useCallback, useEffect, useMemo, useState } from 'react'
import { BackgroundTab } from '@/components/codex/BackgroundTab'
import { CodexTabs } from '@/components/codex/CodexTabs'
import { CodexWall } from '@/components/codex/CodexWall'
import { KINDS, TAB_ORDER, stepTab, type CodexTab } from '@/lib/codex'
import { isTyping } from '@/lib/keys'
import { play } from '@/lib/sfx'
import { useCodex } from '@/store/codex'
import type { CodexEntry, CodexKind } from '@/types/codex'
import type { SectionProps } from './types'

const TAB_KEY = 'arcana:codex-tab'

function readTab(): CodexTab {
  try {
    const stored = localStorage.getItem(TAB_KEY)
    return TAB_ORDER.find((t) => t === stored) ?? 'npc'
  } catch {
    return 'npc'
  }
}

/** Section 7: the shared codex (five kinds) plus this sheet's private Background. */
export function JournalSection({ character, update }: SectionProps) {
  const entries = useCodex((s) => s.entries)
  const [tab, setTab] = useState<CodexTab>(readTab)
  const [openId, setOpenId] = useState<string | null>(null)

  const counts = useMemo(
    () => Object.fromEntries(KINDS.map((k) => [k.kind, entries.filter((e) => e.kind === k.kind).length])) as Record<CodexKind, number>,
    [entries],
  )

  const choose = useCallback((next: CodexTab) => {
    setTab(next)
    setOpenId(null)
    try {
      localStorage.setItem(TAB_KEY, next)
    } catch {
      // Remembering the tab is a nicety; without storage it starts on NPCs.
    }
  }, [])

  // [ and ] walk the tabs. While an entry page is open its capture listener holds them back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      if (e.key !== '[' && e.key !== ']') return
      e.preventDefault()
      play('toggle')
      choose(stepTab(tab, e.key === '[' ? -1 : 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab, choose])

  const navigate = useCallback((entry: CodexEntry) => {
    play('confirm')
    if (entry.kind !== tab) choose(entry.kind)
    setOpenId(entry.id)
  }, [tab, choose])

  return (
    <div className="codex">
      <CodexTabs tab={tab} counts={counts} onChange={choose} />
      {tab === 'background' ? (
        <BackgroundTab character={character} update={update} />
      ) : (
        <CodexWall kind={tab} characterId={character.id} openId={openId} onOpen={setOpenId} onNavigate={navigate} />
      )}
    </div>
  )
}
