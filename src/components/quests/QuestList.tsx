import { play } from '@/lib/sfx'
import { DIFFICULTY_LABEL, difficulty, isTracked, objectivesOf, questProgress } from '@/lib/quests'
import type { Quest, QuestObjective, QuestParticipant } from '@/types/quest'

interface Props {
  quests: Quest[]
  objectives: QuestObjective[]
  participants: QuestParticipant[]
  characterId: string
  characterLevel: number
  selectedId: string | null
  onSelect: (id: string) => void
}

export function QuestList({ quests, objectives, participants, characterId, characterLevel, selectedId, onSelect }: Props) {
  const groups: [string, Quest[]][] = [
    ['Party', quests.filter((q) => q.scope === 'group')],
    ['Personal', quests.filter((q) => q.scope === 'personal')],
  ]
  return (
    <div className="ql-scroll" role="listbox" aria-label="Quests">
      {groups.map(([label, list]) => list.length > 0 && (
        <div key={label} role="group" aria-labelledby={`ql-group-${label}`} style={{ display: 'contents' }}>
          <div className="ql-group" id={`ql-group-${label}`}>{label}</div>
          {list.map((q) => {
            const d = difficulty(q.recommendedLevel, characterLevel)
            const { done, total } = questProgress(objectivesOf(objectives, q.id))
            const tracked = isTracked(q, participants, characterId)
            return (
              <button
                key={q.id}
                type="button"
                role="option"
                aria-selected={q.id === selectedId}
                className="ql-row"
                data-active={q.id === selectedId}
                onClick={() => { play('move'); onSelect(q.id) }}
              >
                <span className={`lv lv-${d}`} title={DIFFICULTY_LABEL[d]}>{q.recommendedLevel ?? '–'}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="t">{q.title || 'Untitled quest'}</span>
                  <span className="s">{[q.location, total ? `${done}/${total}` : ''].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="ql-track" data-on={tracked} title={tracked ? 'Tracked' : 'Not tracked'} />
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
