import { useEffect, useRef, useState } from 'react'
import { play } from '@/lib/sfx'
import { Button, NumberField, TextAreaField, TextField } from '@/components/ui/controls'
import { newId } from '@/data/defaults'
import { newObjective } from '@/lib/quests'
import type { Quest, QuestObjective } from '@/types/quest'

/** The shared controls take no aria props, so these few need a plain button. */
function AButton({ variant, cue = 'toggle', label, disabled, onClick, children }: {
  variant: string; cue?: 'toggle' | 'confirm' | 'back'; label?: string; disabled?: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button type="button" className={`btn ${variant}`} aria-label={label} title={label} aria-disabled={disabled || undefined}
      onClick={() => { play(cue); onClick() }}>{children}</button>
  )
}

function ScopeChip({ on, locked, onToggle, children }: { on: boolean; locked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="chip" data-on={on} aria-pressed={on} aria-disabled={locked || undefined}
      onClick={() => { if (locked) return; play('toggle'); onToggle() }}>{children}</button>
  )
}

const COINS = [['pp', 'Platinum'], ['gp', 'Gold'], ['ep', 'Electrum'], ['sp', 'Silver'], ['cp', 'Copper']] as const

interface Props {
  initial: Quest
  initialObjectives: QuestObjective[]
  characterName: string
  onSave: (quest: Quest, objectives: QuestObjective[]) => void
  onCancel: () => void
}

/** Rows get a client id at once so React keys stay stable; saveQuest keeps ids it is given. */
const freshObjective = (questId: string, position: number): QuestObjective => ({ ...newObjective(questId, position), id: newId() })

export function QuestEditor({ initial, initialObjectives, characterName, onSave, onCancel }: Props) {
  const [quest, setQuest] = useState<Quest>(initial)
  // Kept as raw text: splitting on every keystroke would eat trailing newlines.
  const [items, setItems] = useState(initial.rewardItems.join('\n'))
  const [objectives, setObjectives] = useState<QuestObjective[]>(
    initialObjectives.length ? initialObjectives : [freshObjective(initial.id, 0)],
  )
  const isNew = !initial.id
  const rootRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef(onCancel)
  cancelRef.current = onCancel
  // Keys pressed inside the editor must not reach the window listeners (section
  // switching, T to track). React 18 delegates at the root container, so a synthetic
  // stopPropagation runs too late for a native window listener: use a native listener
  // on the editor element itself (target phase happens before window bubbling).
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Escape') { e.preventDefault(); cancelRef.current() }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [])
  const patch = (p: Partial<Quest>) => setQuest((q) => ({ ...q, ...p }))
  const patchObjective = (i: number, p: Partial<QuestObjective>) =>
    setObjectives((list) => list.map((o, j) => (j === i ? { ...o, ...p } : o)))
  const move = (i: number, by: -1 | 1) =>
    setObjectives((list) => {
      const next = [...list]
      const j = i + by
      if (j < 0 || j >= next.length) return list
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const canSave = quest.title.trim().length > 0
  const save = () => {
    if (!canSave) return
    const objs = objectives
      .filter((o) => o.text.trim())
      .map((o, i) => {
        const target = Math.max(1, Math.min(999, Math.round(o.target) || 1))
        return { ...o, text: o.text.trim(), position: i, target, progress: Math.min(o.progress, target) }
      })
    onSave(
      { ...quest, title: quest.title.trim(), rewardItems: items.split('\n').map((s) => s.trim()).filter(Boolean) },
      objs,
    )
  }

  return (
    <div className="quest-editor" ref={rootRef}>
      <section className="panel card">
        <header className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 className="panel-title" style={{ margin: 0 }}><span>{isNew ? 'New quest' : 'Edit quest'}</span></h3>
        </header>
        <div className="stack" style={{ gap: 12, marginTop: 12 }}>
          <div className="field">
            <span className="label">Who is it for</span>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <ScopeChip on={quest.scope === 'group'} locked={!isNew} onToggle={() => patch({ scope: 'group' })}>Party — everyone</ScopeChip>
              <ScopeChip on={quest.scope === 'personal'} locked={!isNew} onToggle={() => patch({ scope: 'personal' })}>Personal — {characterName}</ScopeChip>
            </div>
            {!isNew && <p className="muted" style={{ margin: 0, fontSize: 14 }}>The scope is fixed once the quest exists.</p>}
          </div>
          <TextField label="Title" value={quest.title} onChange={(v) => patch({ title: v })} />
          <div className="grid qe-meta">
            <TextField label="Given by" value={quest.giver} onChange={(v) => patch({ giver: v })} />
            <TextField label="Where" value={quest.location} onChange={(v) => patch({ location: v })} />
            <NumberField label="Rec. level" value={quest.recommendedLevel ?? 0} min={0} max={20}
              onChange={(v) => patch({ recommendedLevel: v > 0 ? v : null })} />
          </div>
          <TextAreaField label="Description" rows={5} value={quest.description} onChange={(v) => patch({ description: v })} />
        </div>
      </section>

      <div className="stack" style={{ gap: 14 }}>
        <section className="panel card">
          <header className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 className="panel-title" style={{ margin: 0 }}><span>Objectives</span></h3>
            <div className="row" style={{ gap: 6 }}>
              <Button variant="small ghost" onClick={() => setObjectives((l) => [...l, freshObjective(quest.id, l.length)])}>+ Add</Button>
            </div>
          </header>
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            {objectives.map((o, i) => (
              <div key={o.id} className="qe-objective">
                <input className="input grow" aria-label={`Objective ${i + 1}`} value={o.text} placeholder="What has to be done"
                  onChange={(e) => patchObjective(i, { text: e.target.value })} />
                <div style={{ width: 84 }}>
                  <NumberField value={o.target} min={1} max={999} onChange={(v) => patchObjective(i, { target: v })} />
                </div>
                <AButton variant="small ghost" label="Move up" onClick={() => move(i, -1)}>▴</AButton>
                <AButton variant="small ghost" label="Move down" onClick={() => move(i, 1)}>▾</AButton>
                <Button variant="small ghost danger" cue="back" title="Remove objective"
                  onClick={() => setObjectives((l) => l.filter((_, j) => j !== i))}>✕ Remove</Button>
              </div>
            ))}
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>A target of 1 is a tick box; more makes a counter (0 / 7).</p>
          </div>
        </section>

        <section className="panel card">
          <header className="row"><h3 className="panel-title" style={{ margin: 0 }}><span>Rewards</span></h3></header>
          <div className="stack" style={{ gap: 10, marginTop: 10 }}>
            <div className="coin-grid">
              {COINS.map(([k, label]) => (
                <div key={k} className="coin">
                  <div className="cn">{label}</div>
                  <NumberField big value={quest.rewardCoins[k]} min={0} max={99999}
                    onChange={(v) => patch({ rewardCoins: { ...quest.rewardCoins, [k]: v } })} />
                </div>
              ))}
            </div>
            <div className="grid qe-xp">
              <NumberField label="XP" value={quest.rewardXp} min={0} max={999999} onChange={(v) => patch({ rewardXp: v })} />
              <TextAreaField label="Items (one per line)" rows={2} value={items} onChange={setItems} />
            </div>
          </div>
        </section>

        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
          {!canSave && <p className="qe-error" role="alert">Give the quest a title to accept it.</p>}
          <Button variant="ghost" cue="back" onClick={onCancel}>Cancel</Button>
          <AButton variant={canSave ? 'primary' : 'primary disabled'} cue={canSave ? 'confirm' : 'back'} disabled={!canSave} onClick={save}>
            {isNew ? 'Accept quest ✓' : 'Save ✓'}
          </AButton>
        </div>
      </div>
    </div>
  )
}
