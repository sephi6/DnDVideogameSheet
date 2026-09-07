import type { AbilityKey, SkillKey } from '@/types/character'

export const ABILITIES: { key: AbilityKey; label: string; short: string }[] = [
  { key: 'str', label: 'Fuerza', short: 'FUE' },
  { key: 'dex', label: 'Destreza', short: 'DES' },
  { key: 'con', label: 'Constitución', short: 'CON' },
  { key: 'int', label: 'Inteligencia', short: 'INT' },
  { key: 'wis', label: 'Sabiduría', short: 'SAB' },
  { key: 'cha', label: 'Carisma', short: 'CAR' },
]

export const SKILLS: { key: SkillKey; label: string; ability: AbilityKey }[] = [
  { key: 'acrobatics', label: 'Acrobacias', ability: 'dex' },
  { key: 'animalHandling', label: 'Trato con animales', ability: 'wis' },
  { key: 'arcana', label: 'Arcanos', ability: 'int' },
  { key: 'athletics', label: 'Atletismo', ability: 'str' },
  { key: 'deception', label: 'Engaño', ability: 'cha' },
  { key: 'history', label: 'Historia', ability: 'int' },
  { key: 'insight', label: 'Perspicacia', ability: 'wis' },
  { key: 'intimidation', label: 'Intimidación', ability: 'cha' },
  { key: 'investigation', label: 'Investigación', ability: 'int' },
  { key: 'medicine', label: 'Medicina', ability: 'wis' },
  { key: 'nature', label: 'Naturaleza', ability: 'int' },
  { key: 'perception', label: 'Percepción', ability: 'wis' },
  { key: 'performance', label: 'Interpretación', ability: 'cha' },
  { key: 'persuasion', label: 'Persuasión', ability: 'cha' },
  { key: 'religion', label: 'Religión', ability: 'int' },
  { key: 'sleightOfHand', label: 'Juego de manos', ability: 'dex' },
  { key: 'stealth', label: 'Sigilo', ability: 'dex' },
  { key: 'survival', label: 'Supervivencia', ability: 'wis' },
]

export interface ClassInfo {
  name: string
  hitDie: number
  primary: AbilityKey[]
  saves: AbilityKey[]
  spellAbility: AbilityKey | null
  /** Lanzador completo, medio, de pacto o ninguno: define la tabla de espacios. */
  caster: 'full' | 'half' | 'third' | 'pact' | 'none'
  accent: string
}

export const CLASSES: ClassInfo[] = [
  { name: 'Bárbaro', hitDie: 12, primary: ['str'], saves: ['str', 'con'], spellAbility: null, caster: 'none', accent: '#e03a2f' },
  { name: 'Bardo', hitDie: 8, primary: ['cha'], saves: ['dex', 'cha'], spellAbility: 'cha', caster: 'full', accent: '#d8478f' },
  { name: 'Brujo', hitDie: 8, primary: ['cha'], saves: ['wis', 'cha'], spellAbility: 'cha', caster: 'pact', accent: '#8b46d6' },
  { name: 'Clérigo', hitDie: 8, primary: ['wis'], saves: ['wis', 'cha'], spellAbility: 'wis', caster: 'full', accent: '#e8c15a' },
  { name: 'Druida', hitDie: 8, primary: ['wis'], saves: ['int', 'wis'], spellAbility: 'wis', caster: 'full', accent: '#4fae62' },
  { name: 'Explorador', hitDie: 10, primary: ['dex', 'wis'], saves: ['str', 'dex'], spellAbility: 'wis', caster: 'half', accent: '#3f8f6d' },
  { name: 'Guerrero', hitDie: 10, primary: ['str', 'dex'], saves: ['str', 'con'], spellAbility: null, caster: 'none', accent: '#b9411f' },
  { name: 'Hechicero', hitDie: 6, primary: ['cha'], saves: ['con', 'cha'], spellAbility: 'cha', caster: 'full', accent: '#e2593f' },
  { name: 'Mago', hitDie: 6, primary: ['int'], saves: ['int', 'wis'], spellAbility: 'int', caster: 'full', accent: '#3f7bd6' },
  { name: 'Monje', hitDie: 8, primary: ['dex', 'wis'], saves: ['str', 'dex'], spellAbility: null, caster: 'none', accent: '#37b6c4' },
  { name: 'Paladín', hitDie: 10, primary: ['str', 'cha'], saves: ['wis', 'cha'], spellAbility: 'cha', caster: 'half', accent: '#dcae3c' },
  { name: 'Pícaro', hitDie: 8, primary: ['dex'], saves: ['dex', 'int'], spellAbility: null, caster: 'none', accent: '#6f7cd1' },
]

export const SPECIES = [
  'Aasimar', 'Dracónido', 'Elfo', 'Enano', 'Gnomo', 'Goliat',
  'Humano', 'Mediano', 'Orco', 'Tiefling',
]

export const BACKGROUNDS = [
  'Acólito', 'Artesano', 'Artista', 'Bandido de caminos', 'Charlatán',
  'Criminal', 'Ermitaño', 'Escriba', 'Granjero', 'Guardia', 'Guía',
  'Marinero', 'Mercader', 'Noble', 'Sabio', 'Soldado',
]

export const ALIGNMENTS = [
  'Legal bueno', 'Neutral bueno', 'Caótico bueno',
  'Legal neutral', 'Neutral', 'Caótico neutral',
  'Legal malvado', 'Neutral malvado', 'Caótico malvado',
]

/** Condiciones del PHB 2024. */
export const CONDITIONS = [
  'Agarrado', 'Apresado', 'Asustado', 'Aturdido', 'Cegado', 'Derribado',
  'Encantado', 'Ensordecido', 'Envenenado', 'Incapacitado', 'Invisible',
  'Inconsciente', 'Paralizado', 'Petrificado', 'Restringido',
]

export const DAMAGE_TYPES = [
  'Cortante', 'Perforante', 'Contundente', 'Ácido', 'Frío', 'Fuego',
  'Fuerza', 'Necrótico', 'Psíquico', 'Radiante', 'Relámpago', 'Trueno', 'Veneno',
]

/** Propiedades de maestría de armas (novedad de 2024). */
export const WEAPON_MASTERIES = [
  '—', 'Aturdir', 'Derribar', 'Empujar', 'Enredar', 'Fallo cercano',
  'Hendidura', 'Ralentizar', 'Sajar', 'Verter',
]

export const SPELL_SCHOOLS = [
  'Abjuración', 'Conjuración', 'Adivinación', 'Encantamiento',
  'Evocación', 'Ilusión', 'Nigromancia', 'Transmutación',
]

export const LANGUAGES = [
  'Común', 'Common Sign Language', 'Draconiano', 'Enano', 'Élfico', 'Gigante',
  'Gnómico', 'Goblin', 'Mediano', 'Orco', 'Abisal', 'Celestial', 'Infracomún',
  'Infernal', 'Primordial', 'Silvano', 'Druídico', 'Jerga de ladrones',
]

/** Niveles de agotamiento 2024: cada nivel resta 2 a pruebas de d20 y 1,5 m de velocidad. */
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

/** Espacios de conjuro por nivel para lanzadores completos (tabla del PHB). */
const FULL_CASTER_SLOTS: number[][] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

/** Espacios de pacto del Brujo: cantidad y nivel únicos. */
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
