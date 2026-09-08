/** Data model of the character sheet. Meant to serialize as-is to Supabase (jsonb). */

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type SkillKey =
  | 'acrobatics' | 'animalHandling' | 'arcana' | 'athletics' | 'deception'
  | 'history' | 'insight' | 'intimidation' | 'investigation' | 'medicine'
  | 'nature' | 'perception' | 'performance' | 'persuasion' | 'religion'
  | 'sleightOfHand' | 'stealth' | 'survival'

/** 0 = not proficient, 1 = proficient, 2 = expertise (double the bonus). */
export type Proficiency = 0 | 1 | 2

export interface Attack {
  id: string
  name: string
  ability: AbilityKey
  proficient: boolean
  damage: string
  damageType: string
  range: string
  /** Weapon mastery (new rule in 2024): Nick, Push, Slow… */
  mastery: string
  notes: string
}

export interface SpellEntry {
  id: string
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  concentration: boolean
  ritual: boolean
  prepared: boolean
  description: string
}

export interface SpellSlot {
  level: number
  total: number
  used: number
}

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  /** Weight in pounds. */
  weight: number
  attuned: boolean
  equipped: boolean
  notes: string
}

export interface FeatureEntry {
  id: string
  name: string
  source: string
  description: string
  usesMax: number
  usesSpent: number
  recharge: 'none' | 'short' | 'long'
}

export interface Identity {
  name: string
  player: string
  className: string
  subclass: string
  level: number
  species: string
  background: string
  alignment: string
  xp: number
  /** Portrait path (`assets/...`) or a data-url uploaded by the player. */
  portrait: string | null
  /** Menu accent color for this character. */
  accent: string
  /** Short tagline shown on the character select screen. */
  tagline: string
}

export interface Combat {
  armorClass: number
  /** Speed in feet. */
  speed: number
  initiativeBonus: number
  hpMax: number
  hpCurrent: number
  hpTemp: number
  hitDieSize: number
  hitDiceTotal: number
  hitDiceSpent: number
  deathSuccesses: number
  deathFailures: number
  heroicInspiration: boolean
  exhaustion: number
  conditions: string[]
  attacks: Attack[]
}

export interface Spellcasting {
  ability: AbilityKey | null
  slots: SpellSlot[]
  spells: SpellEntry[]
  notes: string
}

export interface Inventory {
  coins: { pp: number; gp: number; ep: number; sp: number; cp: number }
  items: InventoryItem[]
  notes: string
}

export interface Features {
  entries: FeatureEntry[]
  languages: string[]
  armor: string
  weapons: string
  tools: string
}

export interface Journal {
  personality: string
  ideals: string
  bonds: string
  flaws: string
  backstory: string
  allies: string
  notes: string
}

export interface Character {
  id: string
  /**
   * Schema of the stored data. Absent on sheets saved by the Spanish version
   * (Spanish domain values, metric units); see `src/lib/migrate.ts`.
   */
  schemaVersion?: number
  createdAt: string
  updatedAt: string
  identity: Identity
  abilities: Record<AbilityKey, number>
  saves: Record<AbilityKey, Proficiency>
  skills: Record<SkillKey, Proficiency>
  combat: Combat
  spellcasting: Spellcasting
  inventory: Inventory
  features: Features
  journal: Journal
}
