/** Modelo de datos de la ficha. Pensado para serializarse tal cual a Supabase (jsonb). */

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type SkillKey =
  | 'acrobatics' | 'animalHandling' | 'arcana' | 'athletics' | 'deception'
  | 'history' | 'insight' | 'intimidation' | 'investigation' | 'medicine'
  | 'nature' | 'perception' | 'performance' | 'persuasion' | 'religion'
  | 'sleightOfHand' | 'stealth' | 'survival'

/** 0 = sin competencia, 1 = competente, 2 = experto (doble bonificador). */
export type Proficiency = 0 | 1 | 2

export interface Attack {
  id: string
  name: string
  ability: AbilityKey
  proficient: boolean
  damage: string
  damageType: string
  range: string
  /** Maestría de arma (regla nueva de 2024): Sajar, Empujar, Ralentizar... */
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
  /** Ruta del retrato (`/assets/...`) o data-url subida por el jugador. */
  portrait: string | null
  /** Color de acento del menú para este personaje. */
  accent: string
  /** Lema corto que aparece en la pantalla de selección. */
  tagline: string
}

export interface Combat {
  armorClass: number
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
