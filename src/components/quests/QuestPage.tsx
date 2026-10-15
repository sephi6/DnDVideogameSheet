import { useState } from 'react'
import { Button, CheckBox, Chip } from '@/components/ui/controls'
import { play } from '@/lib/sfx'
import { DIFFICULTY_LABEL, difficulty, isDone, isOnQuest, isTracked, type QuestTab } from '@/lib/quests'
import { DEFAULT_PORTRAIT } from '@/data/defaults'
import { useQuests } from '@/store/quests'
import type { Character } from '@/types/character'
import type { Quest, QuestObjective } from '@/types/quest'

const COIN_ORDER = ['pp', 'gp', 'ep', 'sp', 'cp'] as const

interface Props {
  quest: Quest
  objectives: QuestObjective[]
  members: Character[]
  characterId: string
  characterLevel: number
  mode: QuestTab
  onEdit: () => void
}

export function QuestPage({ quest, objectives, members, characterId, characterLevel, mode, onEdit }: Props) {
  const { participants, setProgress, setTracked, setStatus, join, leave, deleteQuest } = useQuests()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const d = difficulty(quest.recommendedLevel, characterLevel)
  const tracked = isTracked(quest, participants, characterId)
  const on = isOnQuest(quest, participants, characterId)
  const coins = COIN_ORDER.filter((k) => quest.rewardCoins[k] > 0)

  return (
    <article className="quest-page" aria-label={quest.title}>
      <div className="qp-kicker">
        <span className="dot" />{quest.scope === 'group' ? 'Party quest' : 'Personal quest'}
        <span className="dot" />{quest.recommendedLevel ? `Level ${quest.recommendedLevel} · ` : ''}{DIFFICULTY_LABEL[d]}
        {quest.status !== 'active' && (<><span className="dot" />{quest.status === 'completed' ? 'Completed' : 'Failed'}</>)}
      </div>
      <h2 className="qp-title">{quest.title || 'Untitled quest'}</h2>
      <div className="qp-meta">
        {quest.giver && <span>Given by <b>{quest.giver}</b></span>}
        {quest.location && <span>Where <b>{quest.location}</b></span>}
        {quest.recommendedLevel && <span>Recommended level <b>{quest.recommendedLevel}</b></span>}
      </div>
      {quest.description && (<><div className="qp-rule" /><p className="qp-desc">{quest.description}</p></>)}

      {objectives.length > 0 && (
        <>
          <div className="qp-rule" />
          <h3 className="qp-h">Objectives</h3>
          {objectives.map((o) => (
            <div key={o.id} className="qo" data-done={isDone(o)}>
              <CheckBox
                gold
                on={isDone(o)}
                label={`${isDone(o) ? 'Done' : 'Not done'}: ${o.text}`}
                onToggle={() => setProgress(o.id, isDone(o) ? Math.max(0, o.target - 1) : o.target)}
              />
              <span className="txt">{o.text}</span>
              <span className="count">
                {o.target > 1 && (
                  <>
                    <button type="button" className="step" aria-label={`One less: ${o.text}`} disabled={o.progress <= 0}
                      onClick={() => { play('toggle'); setProgress(o.id, o.progress - 1) }}>−</button>
                    {o.progress} / {o.target}
                    <button type="button" className="step" aria-label={`One more: ${o.text}`} disabled={o.progress >= o.target}
                      onClick={() => { play('toggle'); setProgress(o.id, o.progress + 1) }}>+</button>
                    <span className="qo-bar" aria-hidden="true"><i style={{ width: `${(o.progress / o.target) * 100}%` }} /></span>
                  </>
                )}
              </span>
            </div>
          ))}
        </>
      )}

      <div className="qp-rule" />
      <div className="qp-cols">
        <div>
          <h3 className="qp-h">Rewards</h3>
          <div className="qp-rewards">
            {coins.map((k) => (
              <span key={k} className="qp-rw"><span className={`qp-coin qp-coin-${k}`} />{quest.rewardCoins[k]} <span className="k">{k.toUpperCase()}</span></span>
            ))}
            {quest.rewardXp > 0 && <span className="qp-rw">{quest.rewardXp} <span className="k">XP</span></span>}
            {quest.rewardItems.map((item) => <span key={item} className="qp-rw item"><span className="gem" />{item}</span>)}
            {coins.length === 0 && quest.rewardXp === 0 && quest.rewardItems.length === 0 && <span className="qp-desc">None promised.</span>}
          </div>
        </div>
        <div>
          <h3 className="qp-h">On this quest</h3>
          <div className="qp-party">
            {members.map((m) => (
              <span key={m.id} className="qp-member">
                <img src={m.identity.portrait ?? DEFAULT_PORTRAIT} alt="" />
                <span>{m.identity.name}<span className="c">{m.identity.className}</span></span>
              </span>
            ))}
            {members.length === 0 && <span className="qp-desc">Nobody yet.</span>}
          </div>
        </div>
      </div>

      <div className="qp-rule" />
      {confirmDelete ? (
        <div className="qp-confirm">
          Delete this quest for everyone?
          <Button variant="small danger" cue="back" onClick={() => deleteQuest(quest.id)}>Delete quest</Button>
          <Button variant="small ghost" onClick={() => setConfirmDelete(false)}>Keep it</Button>
        </div>
      ) : (
        <div className="qp-actions">
          {mode === 'active' && (
            <Chip on={tracked} onToggle={() => setTracked(quest.id, characterId, !tracked)}>Tracked</Chip>
          )}
          <span className="spacer" />
          {mode === 'available' && <Button variant="small primary" cue="confirm" onClick={() => join(quest.id, characterId)}>Join quest</Button>}
          {mode === 'active' && quest.scope === 'personal' && on && (
            <Button variant="small ghost" cue="back" onClick={() => leave(quest.id, characterId)}>Leave</Button>
          )}
          {mode === 'active' && <Button variant="small ghost danger" onClick={() => setStatus(quest.id, 'failed')}>Failed</Button>}
          <Button variant="small" onClick={onEdit}>Edit</Button>
          {mode === 'active' && <Button variant="small primary" cue="confirm" onClick={() => setStatus(quest.id, 'completed')}>Complete ✓</Button>}
          {mode === 'finished' && (
            <>
              <Button variant="small" onClick={() => setStatus(quest.id, 'active')}>Reopen</Button>
              <Button variant="small ghost danger" onClick={() => setConfirmDelete(true)}>Delete</Button>
            </>
          )}
        </div>
      )}
    </article>
  )
}
