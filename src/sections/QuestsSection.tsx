import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/controls'
import { QuestList } from '@/components/quests/QuestList'
import { QuestEditor } from '@/components/quests/QuestEditor'
import { QuestPage } from '@/components/quests/QuestPage'
import { isTyping } from '@/lib/keys'
import { isTracked, memberIds, newQuest, objectivesOf, questsForTab, type QuestTab } from '@/lib/quests'
import { useMediaQuery } from '@/lib/responsive'
import { play } from '@/lib/sfx'
import { useQuests } from '@/store/quests'
import { useRoster } from '@/store/roster'
import type { Quest, QuestObjective } from '@/types/quest'
import type { SectionProps } from './types'

const TABS: [QuestTab, string][] = [['active', 'Active'], ['available', 'Available'], ['finished', 'Finished']]
const EMPTY: Record<QuestTab, string> = {
  active: 'No active quests. Create one with + New quest.',
  available: 'No personal quests of other characters to join.',
  finished: 'Nothing finished yet.',
}

export function QuestsSection({ character }: SectionProps) {
  const { quests, objectives, participants, loaded, setTracked, saveQuest } = useQuests()
  const roster = useRoster((s) => s.characters)
  const narrow = useMediaQuery('(max-width: 1023px)')
  const [tab, setTab] = useState<QuestTab>('active')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showPage, setShowPage] = useState(false)
  const [editing, setEditing] = useState<{ quest: Quest; objectives: QuestObjective[] } | null>(null)

  const list = useMemo(
    () => questsForTab(quests, participants, character.id, tab),
    [quests, participants, character.id, tab],
  )
  const counts = useMemo(
    () => Object.fromEntries(TABS.map(([t]) => [t, questsForTab(quests, participants, character.id, t).length])) as Record<QuestTab, number>,
    [quests, participants, character.id],
  )
  const selected = list.find((q) => q.id === selectedId) ?? list[0] ?? null

  // A quest deleted or moved out of this tab elsewhere: fall back to the first.
  useEffect(() => {
    if (selectedId && !quests.some((q) => q.id === selectedId)) {
      setSelectedId(list[0]?.id ?? null)
      setShowPage(false)
    }
  }, [list, quests, selectedId])

  // T tracks / untracks the selected active quest.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isTyping(e.target) || (e.key !== 't' && e.key !== 'T') || tab !== 'active' || !selected || editing) return
      e.preventDefault()
      play('toggle')
      setTracked(selected.id, character.id, !isTracked(selected, participants, character.id))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab, selected, editing, participants, character.id, setTracked])

  const members = selected
    ? memberIds(selected, participants, roster).map((id) => roster.find((c) => c.id === id)!).filter(Boolean)
    : []

  const listPane = (
    <section className="panel ql-list">
      <div className="ql-new">
        <Button variant="small" cue="confirm"
          onClick={() => setEditing({ quest: newQuest('group', new Date().toISOString()), objectives: [] })}>+ New quest</Button>
      </div>
      <div className="ql-tabs" role="tablist">
        {TABS.map(([t, label]) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className="ql-tab" data-active={tab === t}
            onClick={() => { play('toggle'); setTab(t); setSelectedId(null); setShowPage(false) }}>
            {label} <b>{counts[t]}</b>
          </button>
        ))}
      </div>
      {!loaded ? <div className="empty">Loading quests…</div>
        : list.length === 0 ? <div className="empty">{EMPTY[tab]}</div>
        : <QuestList quests={list} objectives={objectives} participants={participants} characterId={character.id}
            characterLevel={character.identity.level} selectedId={selected?.id ?? null}
            onSelect={(id) => { setSelectedId(id); setShowPage(true) }} />}
    </section>
  )

  const page = selected && (
    <QuestPage quest={selected} objectives={objectivesOf(objectives, selected.id)} members={members}
      characterId={character.id} characterLevel={character.identity.level} mode={tab} onEdit={() => setEditing({ quest: selected, objectives: objectivesOf(objectives, selected.id) })} />
  )

  if (editing) {
    return (
      <QuestEditor
        initial={editing.quest}
        initialObjectives={editing.objectives}
        characterName={character.identity.name}
        onCancel={() => setEditing(null)}
        onSave={(quest, objs) => {
          const id = saveQuest(quest, objs, character.id)
          setEditing(null)
          if (!editing.quest.id) setTab('active')
          setSelectedId(id)
          setShowPage(true)
        }}
      />
    )
  }

  if (narrow) {
    return showPage && page ? (
      <div>
        <div className="ql-back"><Button variant="small ghost" cue="back" onClick={() => setShowPage(false)}>◂ Quest log</Button></div>
        {page}
      </div>
    ) : listPane
  }
  return <div className="quest-log">{listPane}{page ?? <div className="empty">Select a quest.</div>}</div>
}
