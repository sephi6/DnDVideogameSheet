import { useState } from 'react'
import { Button } from '@/components/ui/controls'
import { difficulty, isDone, isTracked, objectivesOf } from '@/lib/quests'
import { play } from '@/lib/sfx'
import { useQuests } from '@/store/quests'

interface Props {
  characterId: string
  characterLevel: number
  variant: 'column' | 'card'
  onOpenLog: () => void
}

export function QuestTracker({ characterId, characterLevel, variant, onOpenLog }: Props) {
  const { quests, objectives, participants } = useQuests()
  const [open, setOpen] = useState(false)
  const tracked = quests.filter((q) => isTracked(q, participants, characterId))
  if (tracked.length === 0) return null

  const shown = variant === 'card' && !open ? tracked.slice(0, 1) : tracked
  const body = shown.map((q) => {
    const d = difficulty(q.recommendedLevel, characterLevel)
    return (
      <div key={q.id} className="tk-q">
        <div className="t">
          <span className={`lvn lv-${d}`}>[{q.recommendedLevel ?? '–'}]</span>
          <span className="tt">{q.title}</span>
        </div>
        {objectivesOf(objectives, q.id).map((o) => (
          <div key={o.id} className="tk-o" data-done={isDone(o)}>
            <span>{o.text}</span>
            {o.target > 1 && <span className="n">{o.progress}/{o.target}</span>}
          </div>
        ))}
      </div>
    )
  })

  if (variant === 'column') {
    return (
      <aside className="tracker" aria-label="Tracked quests">
        <div className="tk-head">Tracked<span>{tracked.length}</span></div>
        {body}
        <Button variant="small ghost" onClick={onOpenLog}>Open quest log ▸</Button>
      </aside>
    )
  }
  return (
    <aside className="tracker-card" aria-label="Tracked quests">
      <button type="button" className="tk-toggle" aria-expanded={open}
        onClick={() => { play('toggle'); setOpen((v) => !v) }}>
        <span>Tracked</span>
        <span className="tk-count">{open ? 'Hide ▾' : `${tracked.length > 1 ? `1 of ${tracked.length} ` : ''}▴`}</span>
      </button>
      {body}
      {open && <Button variant="small ghost" onClick={onOpenLog}>Open quest log ▸</Button>}
    </aside>
  )
}
