import type { AbilityKey, SkillKey } from '@/types/character'

export const ABILITIES: { key: AbilityKey; label: string; short: string }[] = [
  { key: 'str', label: 'Strength', short: 'STR' },
  { key: 'dex', label: 'Dexterity', short: 'DEX' },
  { key: 'con', label: 'Constitution', short: 'CON' },
  { key: 'int', label: 'Intelligence', short: 'INT' },
  { key: 'wis', label: 'Wisdom', short: 'WIS' },
  { key: 'cha', label: 'Charisma', short: 'CHA' },
]

export const SKILLS: { key: SkillKey; label: string; ability: AbilityKey }[] = [
  { key: 'acrobatics', label: 'Acrobatics', ability: 'dex' },
  { key: 'animalHandling', label: 'Animal Handling', ability: 'wis' },
  { key: 'arcana', label: 'Arcana', ability: 'int' },
  { key: 'athletics', label: 'Athletics', ability: 'str' },
  { key: 'deception', label: 'Deception', ability: 'cha' },
  { key: 'history', label: 'History', ability: 'int' },
  { key: 'insight', label: 'Insight', ability: 'wis' },
  { key: 'intimidation', label: 'Intimidation', ability: 'cha' },
  { key: 'investigation', label: 'Investigation', ability: 'int' },
  { key: 'medicine', label: 'Medicine', ability: 'wis' },
  { key: 'nature', label: 'Nature', ability: 'int' },
  { key: 'perception', label: 'Perception', ability: 'wis' },
  { key: 'performance', label: 'Performance', ability: 'cha' },
  { key: 'persuasion', label: 'Persuasion', ability: 'cha' },
  { key: 'religion', label: 'Religion', ability: 'int' },
  { key: 'sleightOfHand', label: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth', label: 'Stealth', ability: 'dex' },
  { key: 'survival', label: 'Survival', ability: 'wis' },
]

export interface ClassInfo {
  name: string
  hitDie: number
  primary: AbilityKey[]
  saves: AbilityKey[]
  spellAbility: AbilityKey | null
  /** Full, half, third or pact caster (or none): picks the spell slot table. */
  caster: 'full' | 'half' | 'third' | 'pact' | 'none'
  accent: string
}

/** The 12 classes of the 2024 Player's Handbook. */
export const CLASSES: ClassInfo[] = [
  { name: 'Barbarian', hitDie: 12, primary: ['str'], saves: ['str', 'con'], spellAbility: null, caster: 'none', accent: '#e03a2f' },
  { name: 'Bard', hitDie: 8, primary: ['cha'], saves: ['dex', 'cha'], spellAbility: 'cha', caster: 'full', accent: '#d8478f' },
  { name: 'Cleric', hitDie: 8, primary: ['wis'], saves: ['wis', 'cha'], spellAbility: 'wis', caster: 'full', accent: '#e8c15a' },
  { name: 'Druid', hitDie: 8, primary: ['wis'], saves: ['int', 'wis'], spellAbility: 'wis', caster: 'full', accent: '#4fae62' },
  { name: 'Fighter', hitDie: 10, primary: ['str', 'dex'], saves: ['str', 'con'], spellAbility: null, caster: 'none', accent: '#b9411f' },
  { name: 'Monk', hitDie: 8, primary: ['dex', 'wis'], saves: ['str', 'dex'], spellAbility: null, caster: 'none', accent: '#37b6c4' },
  { name: 'Paladin', hitDie: 10, primary: ['str', 'cha'], saves: ['wis', 'cha'], spellAbility: 'cha', caster: 'half', accent: '#dcae3c' },
  { name: 'Ranger', hitDie: 10, primary: ['dex', 'wis'], saves: ['str', 'dex'], spellAbility: 'wis', caster: 'half', accent: '#3f8f6d' },
  { name: 'Rogue', hitDie: 8, primary: ['dex'], saves: ['dex', 'int'], spellAbility: null, caster: 'none', accent: '#6f7cd1' },
  { name: 'Sorcerer', hitDie: 6, primary: ['cha'], saves: ['con', 'cha'], spellAbility: 'cha', caster: 'full', accent: '#e2593f' },
  { name: 'Warlock', hitDie: 8, primary: ['cha'], saves: ['wis', 'cha'], spellAbility: 'cha', caster: 'pact', accent: '#8b46d6' },
  { name: 'Wizard', hitDie: 6, primary: ['int'], saves: ['int', 'wis'], spellAbility: 'int', caster: 'full', accent: '#3f7bd6' },
]

/** The 10 species of the 2024 Player's Handbook. */
export const SPECIES = [
  'Aasimar', 'Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath',
  'Halfling', 'Human', 'Orc', 'Tiefling',
]

/** The 16 backgrounds of the 2024 Player's Handbook. */
export const BACKGROUNDS = [
  'Acolyte', 'Artisan', 'Charlatan', 'Criminal', 'Entertainer', 'Farmer',
  'Guard', 'Guide', 'Hermit', 'Merchant', 'Noble', 'Sage', 'Sailor',
  'Scribe', 'Soldier', 'Wayfarer',
]

export const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
]

/** Conditions of the 2024 PHB. Exhaustion has its own tracker. */
export const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated',
  'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained',
  'Stunned', 'Unconscious',
]

export const DAMAGE_TYPES = [
  'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic',
  'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder',
]

/** Weapon mastery properties (new in 2024). */
export const WEAPON_MASTERIES = [
  '—', 'Cleave', 'Graze', 'Nick', 'Push', 'Sap', 'Slow', 'Topple', 'Vex',
]

export const SPELL_SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
]

export const LANGUAGES = [
  'Common', 'Common Sign Language', 'Draconic', 'Dwarvish', 'Elvish', 'Giant',
  'Gnomish', 'Goblin', 'Halfling', 'Orc', 'Abyssal', 'Celestial', 'Deep Speech',
  'Druidic', 'Infernal', 'Primordial', 'Sylvan', "Thieves' Cant",
]

/** 2024 exhaustion levels: each one is −2 to D20 Tests and −5 feet of Speed. */
export const EXHAUSTION_MAX = 6

export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4)
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

/** Spell slots per level for full casters (PHB table). */
const FULL_CASTER_SLOTS: number[][] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

/** Warlock Pact Magic slots: a single count and a single level. */
const PACT_SLOTS: [number, number][] = [
  [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5],
]

export function slotsForClass(caster: ClassInfo['caster'], level: number): { level: number; total: number }[] {
  const lv = Math.max(1, Math.min(20, level))
  if (caster === 'none') return []
  if (caster === 'pact') {
    const [count, slotLevel] = PACT_SLOTS[lv - 1]
    return [{ level: slotLevel, total: count }]
  }
  const effective =
    caster === 'full' ? lv : caster === 'half' ? Math.ceil(lv / 2) : Math.ceil(lv / 3)
  const row = FULL_CASTER_SLOTS[Math.max(1, effective) - 1] ?? []
  return row.map((total, i) => ({ level: i + 1, total }))
}

export function findClass(name: string): ClassInfo | undefined {
  return CLASSES.find((c) => c.name === name)
}
