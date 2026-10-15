import type { Quest, QuestObjective, QuestParticipant, QuestScope } from '@/types/quest'

export type Difficulty = 'trivial' | 'easy' | 'normal' | 'hard' | 'deadly'
export type QuestTab = 'active' | 'available' | 'finished'

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  trivial: 'Trivial', easy: 'Easy', normal: 'Normal', hard: 'Hard', deadly: 'Deadly',
}

/** Warcraft-style colour band from the quest's level against the character's. */
export function difficulty(recommendedLevel: number | null, characterLevel: number): Difficulty {
  if (recommendedLevel == null) return 'normal'
  const diff = recommendedLevel - characterLevel
  if (diff <= -3) return 'trivial'
  if (diff <= -1) return 'easy'
  if (diff <= 1) return 'normal'
  if (diff <= 3) return 'hard'
  return 'deadly'
}

export function participantOf(
  participants: QuestParticipant[], questId: string, characterId: string,
): QuestParticipant | undefined {
  return participants.find((p) => p.questId === questId && p.characterId === characterId)
}

export function isOnQuest(quest: Quest, participants: QuestParticipant[], characterId: string): boolean {
  return quest.scope === 'group' || participantOf(participants, quest.id, characterId)?.joined === true
}

/** Active, on it, and not explicitly untracked. */
export function isTracked(quest: Quest, participants: QuestParticipant[], characterId: string): boolean {
  if (quest.status !== 'active' || !isOnQuest(quest, participants, characterId)) return false
  return participantOf(participants, quest.id, characterId)?.tracked !== false
}

export function objectivesOf(objectives: QuestObjective[], questId: string): QuestObjective[] {
  return objectives.filter((o) => o.questId === questId).sort((a, b) => a.position - b.position)
}

export const isDone = (o: QuestObjective): boolean => o.progress >= o.target

export function questProgress(objectives: QuestObjective[]): { done: number; total: number } {
  return { done: objectives.filter(isDone).length, total: objectives.length }
}

export function clampProgress(n: number, target: number): number {
  return Math.max(0, Math.min(target, Math.round(n)))
}

/** Group quests first, then personal; inside each, oldest first. */
export function questsForTab(
  quests: Quest[], participants: QuestParticipant[], characterId: string, tab: QuestTab,
): Quest[] {
  const on = (q: Quest) => isOnQuest(q, participants, characterId)
  const pick = quests.filter((q) => {
    if (tab === 'active') return q.status === 'active' && on(q)
    if (tab === 'available') return q.status === 'active' && q.scope === 'personal' && !on(q)
    return q.status !== 'active' && on(q)
  })
  return pick.sort((a, b) =>
    a.scope === b.scope ? a.createdAt.localeCompare(b.createdAt) : a.scope === 'group' ? -1 : 1)
}

/** Ids of the characters on a quest, in roster order. */
export function memberIds(quest: Quest, participants: QuestParticipant[], roster: { id: string }[]): string[] {
  return roster.filter((c) => isOnQuest(quest, participants, c.id)).map((c) => c.id)
}

/** A blank quest; the caller assigns the id. */
export function newQuest(scope: QuestScope, now: string): Quest {
  return {
    id: '',
    scope,
    status: 'active',
    title: 'New quest',
    description: '',
    giver: '',
    location: '',
    recommendedLevel: null,
    rewardCoins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    rewardXp: 0,
    rewardItems: [],
    createdAt: now,
  }
}

/** A blank objective; the caller assigns the id. */
export function newObjective(questId: string, position: number): QuestObjective {
  return { id: '', questId, position, text: '', target: 1, progress: 0 }
}
