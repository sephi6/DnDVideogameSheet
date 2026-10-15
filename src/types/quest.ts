import type { Character } from '@/types/character'

/** Group: every character of the table. Personal: the characters that joined. */
export type QuestScope = 'group' | 'personal'
export type QuestStatus = 'active' | 'completed' | 'failed'
export type Coins = Character['inventory']['coins']

export interface Quest {
  id: string
  scope: QuestScope
  status: QuestStatus
  title: string
  description: string
  giver: string
  location: string
  recommendedLevel: number | null
  rewardCoins: Coins
  rewardXp: number
  rewardItems: string[]
  createdAt: string
}

/** Progress is shared by everyone on the quest. Done when progress >= target. */
export interface QuestObjective {
  id: string
  questId: string
  position: number
  text: string
  target: number
  progress: number
}

/**
 * Personal quest: `joined` means the character is on it. Group quest: the row
 * only exists to remember `tracked = false` for that character.
 */
export interface QuestParticipant {
  questId: string
  characterId: string
  joined: boolean
  tracked: boolean
}

export interface QuestSnapshot {
  quests: Quest[]
  objectives: QuestObjective[]
  participants: QuestParticipant[]
}

/** One row changed by someone else (Realtime), already mapped to app types. */
export type QuestChange =
  | { table: 'quests'; type: 'upsert'; row: Quest }
  | { table: 'quests'; type: 'delete'; id: string }
  | { table: 'quest_objectives'; type: 'upsert'; row: QuestObjective }
  | { table: 'quest_objectives'; type: 'delete'; id: string }
  | { table: 'quest_participants'; type: 'upsert'; row: QuestParticipant }
  | { table: 'quest_participants'; type: 'delete'; questId: string; characterId: string }
