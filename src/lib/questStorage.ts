import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Quest, QuestChange, QuestObjective, QuestParticipant, QuestSnapshot } from '@/types/quest'
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase'

/**
 * Quest persistence: one small operation per row, so two people editing the
 * same quest never overwrite each other's fields. Local mode keeps the whole
 * snapshot under one key and has no live updates.
 */
export interface QuestStorage {
  readonly name: 'local' | 'supabase'
  loadAll(): Promise<QuestSnapshot>
  upsertQuest(q: Quest): Promise<void>
  deleteQuest(id: string): Promise<void>
  upsertObjective(o: QuestObjective): Promise<void>
  deleteObjective(id: string): Promise<void>
  upsertParticipant(p: QuestParticipant): Promise<void>
  deleteParticipant(questId: string, characterId: string): Promise<void>
  subscribe(onChange: (c: QuestChange) => void, onStatus: (s: 'live' | 'down') => void): () => void
}

// ── localStorage ────────────────────────────────────────────────────────────

const KEY = 'arcana:quests:v1'
const EMPTY: QuestSnapshot = { quests: [], objectives: [], participants: [] }

function readLocal(): QuestSnapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(EMPTY)
    const parsed = JSON.parse(raw) as Partial<QuestSnapshot>
    return {
      quests: Array.isArray(parsed.quests) ? parsed.quests : [],
      objectives: Array.isArray(parsed.objectives) ? parsed.objectives : [],
      participants: Array.isArray(parsed.participants) ? parsed.participants : [],
    }
  } catch {
    return structuredClone(EMPTY)
  }
}

function writeLocal(snapshot: QuestSnapshot) {
  localStorage.setItem(KEY, JSON.stringify(snapshot))
}

function upsertBy<T>(list: T[], row: T, same: (a: T) => boolean): T[] {
  const i = list.findIndex(same)
  if (i >= 0) list[i] = row
  else list.push(row)
  return list
}

export const localQuestStorage: QuestStorage = {
  name: 'local',
  async loadAll() {
    return readLocal()
  },
  async upsertQuest(q) {
    const s = readLocal()
    upsertBy(s.quests, q, (x) => x.id === q.id)
    writeLocal(s)
  },
  async deleteQuest(id) {
    const s = readLocal()
    writeLocal({
      quests: s.quests.filter((q) => q.id !== id),
      objectives: s.objectives.filter((o) => o.questId !== id),
      participants: s.participants.filter((p) => p.questId !== id),
    })
  },
  async upsertObjective(o) {
    const s = readLocal()
    upsertBy(s.objectives, o, (x) => x.id === o.id)
    writeLocal(s)
  },
  async deleteObjective(id) {
    const s = readLocal()
    s.objectives = s.objectives.filter((o) => o.id !== id)
    writeLocal(s)
  },
  async upsertParticipant(p) {
    const s = readLocal()
    upsertBy(s.participants, p, (x) => x.questId === p.questId && x.characterId === p.characterId)
    writeLocal(s)
  },
  async deleteParticipant(questId, characterId) {
    const s = readLocal()
    s.participants = s.participants.filter((p) => !(p.questId === questId && p.characterId === characterId))
    writeLocal(s)
  },
  subscribe() {
    return () => {}
  },
}

// ── Supabase ────────────────────────────────────────────────────────────────

interface QuestRow {
  id: string
  scope: Quest['scope']
  status: Quest['status']
  title: string
  description: string
  giver: string
  location: string
  recommended_level: number | null
  reward_coins: Quest['rewardCoins']
  reward_xp: number
  reward_items: string[]
  created_at: string
}
interface ObjectiveRow { id: string; quest_id: string; position: number; text: string; target: number; progress: number }
interface ParticipantRow { quest_id: string; character_id: string; joined: boolean; tracked: boolean }

const questFromRow = (r: QuestRow): Quest => ({
  id: r.id, scope: r.scope, status: r.status, title: r.title, description: r.description,
  giver: r.giver, location: r.location, recommendedLevel: r.recommended_level,
  rewardCoins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0, ...(r.reward_coins as Partial<Quest['rewardCoins']>) },
  rewardXp: r.reward_xp, rewardItems: r.reward_items ?? [], createdAt: r.created_at,
})
const questToRow = (q: Quest): QuestRow => ({
  id: q.id, scope: q.scope, status: q.status, title: q.title, description: q.description,
  giver: q.giver, location: q.location, recommended_level: q.recommendedLevel,
  reward_coins: q.rewardCoins, reward_xp: q.rewardXp, reward_items: q.rewardItems, created_at: q.createdAt,
})
const objectiveFromRow = (r: ObjectiveRow): QuestObjective => ({
  id: r.id, questId: r.quest_id, position: r.position, text: r.text, target: r.target, progress: r.progress,
})
const objectiveToRow = (o: QuestObjective): ObjectiveRow => ({
  id: o.id, quest_id: o.questId, position: o.position, text: o.text, target: o.target, progress: o.progress,
})
const participantFromRow = (r: ParticipantRow): QuestParticipant => ({
  questId: r.quest_id, characterId: r.character_id, joined: r.joined, tracked: r.tracked,
})
const participantToRow = (p: QuestParticipant): ParticipantRow => ({
  quest_id: p.questId, character_id: p.characterId, joined: p.joined, tracked: p.tracked,
})

type Payload<T extends Record<string, unknown>> = RealtimePostgresChangesPayload<T>

export const supabaseQuestStorage: QuestStorage = {
  name: 'supabase',

  async loadAll() {
    const client = requireSupabase()
    const [quests, objectives, participants] = await Promise.all([
      client.from('quests').select('*').order('created_at', { ascending: true }),
      client.from('quest_objectives').select('*'),
      client.from('quest_participants').select('*'),
    ])
    if (quests.error) throw quests.error
    if (objectives.error) throw objectives.error
    if (participants.error) throw participants.error
    return {
      quests: (quests.data as QuestRow[]).map(questFromRow),
      objectives: (objectives.data as ObjectiveRow[]).map(objectiveFromRow),
      participants: (participants.data as ParticipantRow[]).map(participantFromRow),
    }
  },

  async upsertQuest(q) {
    // created_by is left out: the column default fills it on insert and updates keep it.
    const { error } = await requireSupabase().from('quests').upsert(questToRow(q), { onConflict: 'id' })
    if (error) throw error
  },

  async deleteQuest(id) {
    const { error } = await requireSupabase().from('quests').delete().eq('id', id)
    if (error) throw error
  },

  async upsertObjective(o) {
    const { error } = await requireSupabase().from('quest_objectives').upsert(objectiveToRow(o), { onConflict: 'id' })
    if (error) throw error
  },

  async deleteObjective(id) {
    const { error } = await requireSupabase().from('quest_objectives').delete().eq('id', id)
    if (error) throw error
  },

  async upsertParticipant(p) {
    const { error } = await requireSupabase()
      .from('quest_participants')
      .upsert(participantToRow(p), { onConflict: 'quest_id,character_id' })
    if (error) throw error
  },

  async deleteParticipant(questId, characterId) {
    const { error } = await requireSupabase()
      .from('quest_participants')
      .delete()
      .eq('quest_id', questId)
      .eq('character_id', characterId)
    if (error) throw error
  },

  subscribe(rawOnChange, rawOnStatus) {
    const client = requireSupabase()
    // Cleared on unsubscribe so late events (e.g. CLOSED) never reach the caller.
    let active = true
    const onChange: typeof rawOnChange = (c) => { if (active) rawOnChange(c) }
    const onStatus: typeof rawOnStatus = (st) => { if (active) rawOnStatus(st) }
    const channel = client
      .channel(`arcana-quests-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quests' }, (p: Payload<QuestRow & Record<string, unknown>>) => {
        if (p.eventType === 'DELETE') onChange({ table: 'quests', type: 'delete', id: (p.old as QuestRow).id })
        else onChange({ table: 'quests', type: 'upsert', row: questFromRow(p.new as QuestRow) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_objectives' }, (p: Payload<ObjectiveRow & Record<string, unknown>>) => {
        if (p.eventType === 'DELETE') onChange({ table: 'quest_objectives', type: 'delete', id: (p.old as ObjectiveRow).id })
        else onChange({ table: 'quest_objectives', type: 'upsert', row: objectiveFromRow(p.new as ObjectiveRow) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_participants' }, (p: Payload<ParticipantRow & Record<string, unknown>>) => {
        if (p.eventType === 'DELETE') {
          const old = p.old as ParticipantRow
          onChange({ table: 'quest_participants', type: 'delete', questId: old.quest_id, characterId: old.character_id })
        } else onChange({ table: 'quest_participants', type: 'upsert', row: participantFromRow(p.new as ParticipantRow) })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') onStatus('live')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStatus('down')
      })
    return () => {
      active = false
      void client.removeChannel(channel)
    }
  },
}

export const questStorage: QuestStorage = isSupabaseConfigured ? supabaseQuestStorage : localQuestStorage
