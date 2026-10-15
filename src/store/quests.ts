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
/** Rows with a write queued or in flight. */
const inflight = new Map<string, number>()
/** Rows whose last write failed; Retry rewrites them from current state. */
const failed = new Set<string>()
/** Recent payloads we sent per row: a Realtime echo of one of them is not news. */
const sent = new Map<string, { json: string; at: number; echoed: boolean }[]>()
const SENT_TTL_MS = 5000
/** Latest foreign change that arrived while its row was busy; applied when it settles. */
const pending = new Map<string, QuestChange>()
/** Bumped by reset(): work started in an older session must not touch the new one. */
let epoch = 0
let unsubscribe: (() => void) | null = null
let hydration: Promise<void> | null = null
let wasDown = false
let hydrateFailed = false
/** Counts every write started or foreign change applied per row: a reload that began before it must not overwrite the row. */
const seqs = new Map<string, number>()
const touch = (key: string) => seqs.set(key, (seqs.get(key) ?? 0) + 1)
/** Creator participant rows waiting for their quest row to be written: busy for reloads. */
const holding = new Set<string>()

/** Postgres echoes timestamps as '+00:00'; JS writes 'Z'. Compare them as the same instant. */
function isoDate(s: string): string {
  const t = new Date(s).getTime()
  return Number.isNaN(t) ? s : new Date(t).toISOString()
}

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${k === 'createdAt' && typeof o[k] === 'string' ? JSON.stringify(isoDate(o[k] as string)) : stable(o[k])}`).join(',')}}`
  }
  return JSON.stringify(v) ?? 'null'
}

function recordSent(key: string, json: string) {
  const now = Date.now()
  const list = (sent.get(key) ?? []).filter((e) => now - e.at < SENT_TTL_MS)
  list.push({ json, at: now, echoed: false })
  sent.set(key, list)
}

/** Writes the row as it is NOW in state: upsert if present, delete if gone. */
function rowWrite(key: string, get: Get_): Promise<void> {
  const [kind, a, b] = key.split(':')
  const s = get()
  if (kind === 'q') {
    const q = s.quests.find((x) => x.id === a)
    recordSent(key, q ? stable(q) : 'null')
    return q ? questStorage.upsertQuest(q) : questStorage.deleteQuest(a)
  }
  if (kind === 'o') {
    const o = s.objectives.find((x) => x.id === a)
    recordSent(key, o ? stable(o) : 'null')
    return o ? questStorage.upsertObjective(o) : questStorage.deleteObjective(a)
  }
  const p = participantOf(s.participants, a, b)
  recordSent(key, p ? stable(p) : 'null')
  return p ? questStorage.upsertParticipant(p) : questStorage.deleteParticipant(a, b)
}

function write(key: string, set: Set_, get: Get_) {
  const mine = epoch
  touch(key)
  inflight.set(key, (inflight.get(key) ?? 0) + 1)
  set({ sync: 'saving', syncError: null })
  const previous = chains.get(key) ?? Promise.resolve()
  const next: Promise<void> = previous
    .then(() => (mine === epoch ? rowWrite(key, get) : undefined))
    .then(() => {
      if (mine !== epoch) return
      failed.delete(key)
      if (failed.size === 0) set({ sync: 'saved', syncError: null })
    })
    .catch((err) => {
      if (mine !== epoch) return
      failed.add(key)
      console.error('[arcana] failed to save a quest row', key, err)
      set({ sync: 'error', syncError: readableError(err) })
    })
    .finally(() => {
      if (mine !== epoch) return
      touch(key) // a reload that began before this write settled must not overwrite the row
      const left = (inflight.get(key) ?? 1) - 1
      if (left <= 0) inflight.delete(key)
      else inflight.set(key, left)
      if (chains.get(key) === next) chains.delete(key)
      if (left <= 0 && !failed.has(key)) {
        // A foreign change arrived mid-write: we cannot know which write the
        // database kept last, so ask it instead of guessing.
        if (pending.delete(key)) scheduleReload(set)
      }
    })
  chains.set(key, next)
}

/** Quests first (children reference them), then the rest; resolves when all settle. */
async function writeOrdered(keys: string[], set: Set_, get: Get_) {
  const mine = epoch
  const quests = keys.filter((k) => k.startsWith('q:'))
  for (const k of quests) write(k, set, get)
  await Promise.all(quests.map((k) => chains.get(k) ?? Promise.resolve()))
  if (mine !== epoch) return
  const rest = keys.filter((k) => !k.startsWith('q:'))
  for (const k of rest) {
    holding.delete(k)
    const [kind, a] = k.split(':')
    if (kind === 'p' && !get().quests.some((q) => q.id === a)) {
      // the quest was deleted meanwhile: nothing to write, nothing to retry
      failed.delete(k)
      if (failed.size === 0 && inflight.size === 0) get().sync === 'saving' && set({ sync: 'saved', syncError: null })
      continue
    }
    const questId = kind === 'p' ? a : get().objectives.find((o) => o.id === a)?.questId
    if (questId && failed.has(qKey(questId))) {
      failed.add(k) // its quest is not in the database yet: stays queued for Retry
      continue
    }
    write(k, set, get)
  }
  await Promise.all(rest.map((k) => chains.get(k) ?? Promise.resolve()))
}

let reloadTimer: ReturnType<typeof setTimeout> | null = null

/** One authoritative reload for any number of rows that settled together. */
function scheduleReload(set: Set_) {
  if (reloadTimer) return
  const mine = epoch
  reloadTimer = setTimeout(() => {
    reloadTimer = null
    if (mine !== epoch) return
    void load(set, useQuests.getState).catch((err) => console.error('[arcana] could not reload the quests', err))
  }, 0)
}

function changeKey(c: QuestChange): string {
  if (c.table === 'quests') return qKey(c.type === 'upsert' ? c.row.id : c.id)
  if (c.table === 'quest_objectives') return oKey(c.type === 'upsert' ? c.row.id : c.id)
  return c.type === 'upsert' ? pKey(c.row.questId, c.row.characterId) : pKey(c.questId, c.characterId)
}

/** A Realtime UPDATE may omit unchanged (TOASTed) columns: keep the local value for those. */
function mergeQuest(list: Quest[], row: Quest): Quest {
  const old = list.find((q) => q.id === row.id)
  if (!old) return row
  const defined = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined))
  return { ...old, ...defined }
}

function applyNow(c: QuestChange, set: Set_) {
  touch(changeKey(c))
  set((s) => {
    if (c.table === 'quests') {
      if (c.type === 'delete') {
        return {
          quests: s.quests.filter((q) => q.id !== c.id),
          objectives: s.objectives.filter((o) => o.questId !== c.id),
          participants: s.participants.filter((p) => p.questId !== c.id),
        }
      }
      return { quests: [...s.quests.filter((q) => q.id !== c.row.id), mergeQuest(s.quests, c.row)] }
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

/** A Realtime change: each payload we sent has one echo, which is dropped; anything else is someone else's. */
function applyChange(c: QuestChange, set: Set_, get: Get_) {
  const key = changeKey(c)
  if (c.table === 'quests' && c.type === 'upsert') {
    const row = c.row
    if (!get().quests.some((q) => q.id === row.id) && Object.values(row).some((v) => v === undefined)) {
      scheduleReload(set) // a partial row for a quest we do not have: ask for the whole thing
      return
    }
    c = { ...c, row: mergeQuest(get().quests, row) }
  }
  const json = c.type === 'upsert' ? stable(c.row) : 'null'
  const now = Date.now()
  const echo = (sent.get(key) ?? []).find((e) => now - e.at < SENT_TTL_MS && !e.echoed && e.json === json)
  if (echo) {
    echo.echoed = true // a second identical change is not ours: it is someone else's
    return
  }
  if ((inflight.get(key) ?? 0) > 0 || failed.has(key)) {
    pending.set(key, c)
    return
  }
  applyNow(c, set)
}

/** The server's snapshot replaces state, except rows with a pending or failed write, or touched since the load began. */
function replaceFromSnapshot(current: QuestSnapshot, incoming: QuestSnapshot, since: Map<string, number>): QuestSnapshot {
  const busy = (k: string) =>
    (inflight.get(k) ?? 0) > 0 || failed.has(k) || holding.has(k) || (seqs.get(k) ?? 0) !== (since.get(k) ?? 0)
  for (const k of [...pending.keys()]) if (!busy(k)) pending.delete(k)
  const quests = [...incoming.quests.filter((x) => !busy(qKey(x.id))), ...current.quests.filter((x) => busy(qKey(x.id)))]
  const alive = (questId: string) => quests.some((q) => q.id === questId) // no orphans of a quest deleted meanwhile
  return {
    quests,
    objectives: [
      ...incoming.objectives.filter((x) => !busy(oKey(x.id))),
      ...current.objectives.filter((x) => busy(oKey(x.id))),
    ].filter((x) => alive(x.questId)),
    participants: [
      ...incoming.participants.filter((x) => !busy(pKey(x.questId, x.characterId))),
      ...current.participants.filter((x) => busy(pKey(x.questId, x.characterId))),
    ].filter((x) => alive(x.questId)),
  }
}

/** Adds rows by key (used by the demo seed). */
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
  const mine = epoch
  const since = new Map(seqs)
  const snapshot = await questStorage.loadAll()
  if (mine !== epoch) return
  set({ ...replaceFromSnapshot(get(), snapshot, since), loaded: true })
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
      const mine = epoch
      try {
        await load(set, get)
        if (mine !== epoch) return // reset() ran while loading: open nothing
        hydrateFailed = false
        unsubscribe?.()
        unsubscribe = questStorage.subscribe(
          (c) => {
            if (mine === epoch) applyChange(c, set, get)
          },
          (status) => {
            if (mine !== epoch) return
            if (status === 'down') {
              wasDown = true
              set({ sync: 'error', syncError: 'Live quest updates are disconnected. Retry reconnects.' })
            } else if (wasDown) {
              wasDown = false
              void load(set, get)
                .then(() => {
                  if (mine === epoch && failed.size === 0) set({ sync: 'saved', syncError: null })
                })
                .catch((err) => {
                  if (mine === epoch) set({ sync: 'error', syncError: readableError(err) })
                })
            }
          },
        )
      } catch (err) {
        if (mine !== epoch) return
        hydrateFailed = true
        console.error('[arcana] could not read the quests', err)
        set({ loaded: true, sync: 'error', syncError: readableError(err) })
      } finally {
        if (mine === epoch) hydration = null
      }
    })()
    return hydration
  },

  reset() {
    epoch++
    unsubscribe?.()
    unsubscribe = null
    hydration = null
    chains.clear()
    inflight.clear()
    failed.clear()
    sent.clear()
    pending.clear()
    wasDown = false
    hydrateFailed = false
    seqs.clear()
    holding.clear()
    if (reloadTimer) clearTimeout(reloadTimer)
    reloadTimer = null
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
    // A new personal quest lists the creator at once, so it shows in their Active tab; the row is written later.
    const creatorRow: QuestParticipant | null =
      isNew && stored.scope === 'personal' && creatorId ? { questId: stored.id, characterId: creatorId, joined: true, tracked: true } : null
    set((s) => ({
      quests: [...s.quests.filter((q) => q.id !== stored.id), stored],
      objectives: [...s.objectives.filter((o) => o.questId !== stored.id), ...kept],
      participants: creatorRow
        ? [...s.participants.filter((p) => !(p.questId === creatorRow.questId && p.characterId === creatorRow.characterId)), creatorRow]
        : s.participants,
    }))
    // Objectives and the creator's row wait for the quest row (foreign key); until then
    // the creator's row is held so a reload does not drop it, and it joins Retry if the quest write fails.
    const creatorKey = creatorRow ? [pKey(creatorRow.questId, creatorRow.characterId)] : []
    for (const k of creatorKey) holding.add(k)
    void writeOrdered([qKey(stored.id), ...kept.map((o) => oKey(o.id)), ...dropped.map((o) => oKey(o.id)), ...creatorKey], set, get)
    return stored.id
  },

  setStatus(questId, status) {
    set((s) => ({ quests: s.quests.map((q) => (q.id === questId ? { ...q, status } : q)) }))
    write(qKey(questId), set, get)
  },

  deleteQuest(questId) {
    // Rows of this quest that failed or wait to be written no longer matter.
    for (const k of [...failed, ...holding]) if (k.startsWith(`p:${questId}:`)) { failed.delete(k); holding.delete(k) }
    for (const o of get().objectives) if (o.questId === questId) failed.delete(oKey(o.id))
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
    const mine = epoch
    await get().hydrate() // so "no quests yet" is judged after the load
    if (mine !== epoch || get().quests.length > 0) return
    const demo = demoQuests(roster)
    set((s) => ({ ...mergeSnapshot(s, demo), loaded: true }))
    await writeOrdered(
      [
        ...demo.quests.map((q) => qKey(q.id)),
        ...demo.objectives.map((o) => oKey(o.id)),
        ...demo.participants.map((p) => pKey(p.questId, p.characterId)),
      ],
      set,
      get,
    )
  },

  async retryFailed() {
    if (wasDown || hydrateFailed || !get().loaded) await get().hydrate() // reconnect and reload, then retry the failed rows too
    await writeOrdered([...failed], set, get)
  },
}))
