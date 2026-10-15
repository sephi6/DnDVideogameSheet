import { create } from 'zustand'
import type { Character } from '@/types/character'
import type { Quest, QuestChange, QuestObjective, QuestParticipant, QuestSnapshot, QuestStatus } from '@/types/quest'
import { demoQuests, newId } from '@/data/defaults'
import { clampProgress, participantOf } from '@/lib/quests'
import { questStorage } from '@/lib/questStorage'
import { readableError } from '@/lib/supabase'
import type { SyncStatus } from '@/store/roster'

interface QuestsState extends QuestSnapshot {
  loaded: boolean
  sync: SyncStatus
  syncError: string | null
  hydrate: () => Promise<void>
  reset: () => void
  /** From the editor: writes the quest, its objectives, and removes dropped ones. */
  saveQuest: (quest: Quest, objectives: QuestObjective[], creatorId: string | null) => string
  setStatus: (questId: string, status: QuestStatus) => void
  deleteQuest: (questId: string) => void
  setProgress: (objectiveId: string, progress: number) => void
  join: (questId: string, characterId: string) => void
  leave: (questId: string, characterId: string) => void
  setTracked: (questId: string, characterId: string, tracked: boolean) => void
  removeCharacter: (characterId: string) => void
  seedDemo: (roster: Character[]) => Promise<void>
  retryFailed: () => Promise<void>
}

type Set_ = (partial: Partial<QuestsState> | ((s: QuestsState) => Partial<QuestsState>)) => void
type Get_ = () => QuestsState

// Row keys: q:<id>, o:<id>, p:<questId>:<characterId>.
const qKey = (id: string) => `q:${id}`
const oKey = (id: string) => `o:${id}`
const pKey = (questId: string, characterId: string) => `p:${questId}:${characterId}`

/** Writes per row run one after another, so the last click is the last write. */
const chains = new Map<string, Promise<void>>()
/** Rows with a write queued or in flight: Realtime echoes for them are ignored. */
const inflight = new Map<string, number>()
/** Rows whose last write failed; Retry rewrites them from current state. */
const failed = new Set<string>()
let unsubscribe: (() => void) | null = null
let hydration: Promise<void> | null = null
let wasDown = false

/** Writes the row as it is NOW in state: upsert if present, delete if gone. */
function rowWrite(key: string, get: Get_): Promise<void> {
  const [kind, a, b] = key.split(':')
  const s = get()
  if (kind === 'q') {
    const q = s.quests.find((x) => x.id === a)
    return q ? questStorage.upsertQuest(q) : questStorage.deleteQuest(a)
  }
  if (kind === 'o') {
    const o = s.objectives.find((x) => x.id === a)
    return o ? questStorage.upsertObjective(o) : questStorage.deleteObjective(a)
  }
  const p = participantOf(s.participants, a, b)
  return p ? questStorage.upsertParticipant(p) : questStorage.deleteParticipant(a, b)
}

function write(key: string, set: Set_, get: Get_) {
  inflight.set(key, (inflight.get(key) ?? 0) + 1)
  set({ sync: 'saving', syncError: null })
  const previous = chains.get(key) ?? Promise.resolve()
  const next = previous
    .then(() => rowWrite(key, get))
    .then(() => {
      failed.delete(key)
      if (failed.size === 0) set({ sync: 'saved', syncError: null })
    })
    .catch((err) => {
      failed.add(key)
      console.error('[arcana] failed to save a quest row', key, err)
      set({ sync: 'error', syncError: readableError(err) })
    })
    .finally(() => {
      const left = (inflight.get(key) ?? 1) - 1
      if (left <= 0) inflight.delete(key)
      else inflight.set(key, left)
      if (chains.get(key) === next) chains.delete(key)
    })
  chains.set(key, next)
}

function changeKey(c: QuestChange): string {
  if (c.table === 'quests') return qKey(c.type === 'upsert' ? c.row.id : c.id)
  if (c.table === 'quest_objectives') return oKey(c.type === 'upsert' ? c.row.id : c.id)
  return c.type === 'upsert' ? pKey(c.row.questId, c.row.characterId) : pKey(c.questId, c.characterId)
}

/** Someone else's change. Ignored while we are writing that same row. */
function applyChange(c: QuestChange, set: Set_) {
  if ((inflight.get(changeKey(c)) ?? 0) > 0) return
  set((s) => {
    if (c.table === 'quests') {
      if (c.type === 'delete') {
        return {
          quests: s.quests.filter((q) => q.id !== c.id),
          objectives: s.objectives.filter((o) => o.questId !== c.id),
          participants: s.participants.filter((p) => p.questId !== c.id),
        }
      }
      return { quests: [...s.quests.filter((q) => q.id !== c.row.id), c.row] }
    }
    if (c.table === 'quest_objectives') {
      if (c.type === 'delete') return { objectives: s.objectives.filter((o) => o.id !== c.id) }
      return { objectives: [...s.objectives.filter((o) => o.id !== c.row.id), c.row] }
    }
    if (c.type === 'delete') {
      return { participants: s.participants.filter((p) => !(p.questId === c.questId && p.characterId === c.characterId)) }
    }
    return {
      participants: [
        ...s.participants.filter((p) => !(p.questId === c.row.questId && p.characterId === c.row.characterId)),
        c.row,
      ],
    }
  })
}

/** Merge by key: rows in `incoming` replace same-key rows in `current`. */
function mergeSnapshot(current: QuestSnapshot, incoming: QuestSnapshot): QuestSnapshot {
  const byId = <T extends { id: string }>(a: T[], b: T[]) => [...a.filter((x) => !b.some((y) => y.id === x.id)), ...b]
  return {
    quests: byId(current.quests, incoming.quests),
    objectives: byId(current.objectives, incoming.objectives),
    participants: [
      ...current.participants.filter((x) => !incoming.participants.some((y) => y.questId === x.questId && y.characterId === x.characterId)),
      ...incoming.participants,
    ],
  }
}

async function load(set: Set_, get: Get_) {
  const snapshot = await questStorage.loadAll()
  set({ ...mergeSnapshot(get(), snapshot), loaded: true })
}

export const useQuests = create<QuestsState>((set, get) => ({
  quests: [],
  objectives: [],
  participants: [],
  loaded: false,
  sync: 'idle',
  syncError: null,

  hydrate() {
    hydration ??= (async () => {
      try {
        await load(set, get)
        unsubscribe?.()
        unsubscribe = questStorage.subscribe(
          (c) => applyChange(c, set),
          (status) => {
            if (status === 'down') {
              wasDown = true
              set({ sync: 'error', syncError: 'Live quest updates are disconnected. Retry reconnects.' })
            } else if (wasDown) {
              wasDown = false
              void load(set, get).then(() => {
                if (failed.size === 0) set({ sync: 'saved', syncError: null })
              })
            }
          },
        )
      } catch (err) {
        console.error('[arcana] could not read the quests', err)
        set({ loaded: true, sync: 'error', syncError: readableError(err) })
      } finally {
        hydration = null
      }
    })()
    return hydration
  },

  reset() {
    unsubscribe?.()
    unsubscribe = null
    chains.clear()
    inflight.clear()
    failed.clear()
    wasDown = false
    set({ quests: [], objectives: [], participants: [], loaded: false, sync: 'idle', syncError: null })
  },

  saveQuest(quest, objectives, creatorId) {
    const isNew = !get().quests.some((q) => q.id === quest.id)
    const stored: Quest = { ...quest, id: quest.id || newId() }
    const kept = objectives.map((o, i) => ({
      ...o,
      id: o.id || newId(),
      questId: stored.id,
      position: i,
      target: Math.max(1, Math.min(999, Math.round(o.target))),
      progress: clampProgress(o.progress, Math.max(1, Math.min(999, Math.round(o.target)))),
    }))
    const dropped = get().objectives.filter((o) => o.questId === stored.id && !kept.some((k) => k.id === o.id))
    set((s) => ({
      quests: [...s.quests.filter((q) => q.id !== stored.id), stored],
      objectives: [...s.objectives.filter((o) => o.questId !== stored.id), ...kept],
    }))
    write(qKey(stored.id), set, get)
    // Objectives and participants wait for the quest row (foreign key).
    void (chains.get(qKey(stored.id)) ?? Promise.resolve()).then(() => {
      for (const o of kept) write(oKey(o.id), set, get)
      for (const o of dropped) write(oKey(o.id), set, get)
      if (isNew && stored.scope === 'personal' && creatorId) get().join(stored.id, creatorId)
    })
    return stored.id
  },

  setStatus(questId, status) {
    set((s) => ({ quests: s.quests.map((q) => (q.id === questId ? { ...q, status } : q)) }))
    write(qKey(questId), set, get)
  },

  deleteQuest(questId) {
    set((s) => ({
      quests: s.quests.filter((q) => q.id !== questId),
      objectives: s.objectives.filter((o) => o.questId !== questId),
      participants: s.participants.filter((p) => p.questId !== questId),
    }))
    write(qKey(questId), set, get) // the database cascades; local storage cascades too
  },

  setProgress(objectiveId, progress) {
    set((s) => ({
      objectives: s.objectives.map((o) => (o.id === objectiveId ? { ...o, progress: clampProgress(progress, o.target) } : o)),
    }))
    write(oKey(objectiveId), set, get)
  },

  join(questId, characterId) {
    const existing = participantOf(get().participants, questId, characterId)
    const row: QuestParticipant = { questId, characterId, joined: true, tracked: existing?.tracked ?? true }
    set((s) => ({
      participants: [...s.participants.filter((p) => !(p.questId === questId && p.characterId === characterId)), row],
    }))
    write(pKey(questId, characterId), set, get)
  },

  leave(questId, characterId) {
    set((s) => ({ participants: s.participants.filter((p) => !(p.questId === questId && p.characterId === characterId)) }))
    write(pKey(questId, characterId), set, get)
  },

  setTracked(questId, characterId, tracked) {
    const quest = get().quests.find((q) => q.id === questId)
    const existing = participantOf(get().participants, questId, characterId)
    const row: QuestParticipant = {
      questId,
      characterId,
      // A group quest's row only carries the tracking preference.
      joined: existing?.joined ?? quest?.scope === 'group',
      tracked,
    }
    set((s) => ({
      participants: [...s.participants.filter((p) => !(p.questId === questId && p.characterId === characterId)), row],
    }))
    write(pKey(questId, characterId), set, get)
  },

  removeCharacter(characterId) {
    const gone = get().participants.filter((p) => p.characterId === characterId)
    set((s) => ({ participants: s.participants.filter((p) => p.characterId !== characterId) }))
    for (const p of gone) write(pKey(p.questId, p.characterId), set, get)
  },

  async seedDemo(roster) {
    if (get().quests.length > 0) return
    const demo = demoQuests(roster)
    set((s) => ({ ...mergeSnapshot(s, demo), loaded: true }))
    for (const q of demo.quests) write(qKey(q.id), set, get)
    await Promise.all(demo.quests.map((q) => chains.get(qKey(q.id)) ?? Promise.resolve()))
    for (const o of demo.objectives) write(oKey(o.id), set, get)
    for (const p of demo.participants) write(pKey(p.questId, p.characterId), set, get)
  },

  async retryFailed() {
    if (wasDown) {
      await get().hydrate()
      return
    }
    const keys = [...failed]
    // Quests first: objectives and participants reference them.
    keys.sort((a, b) => (a.startsWith('q:') ? -1 : 0) - (b.startsWith('q:') ? -1 : 0))
    for (const key of keys) write(key, set, get)
    await Promise.all(keys.map((k) => chains.get(k) ?? Promise.resolve()))
  },
}))
