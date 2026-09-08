import type { AbilityKey, Character, Proficiency, SkillKey } from '@/types/character'
import { CLASSES, SKILLS, findClass, slotsForClass } from './rules'

/** Identificadores de las entradas anidadas dentro del jsonb (ataques, objetos…). */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

/**
 * Identificador de una ficha. Es un UUID de verdad porque acaba siendo la
 * clave primaria de la tabla `characters` en Supabase.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Reserva para contextos no seguros, donde randomUUID no existe.
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** ¿Este id sirve como clave primaria uuid? Las fichas viejas usaban `pc_xxx`. */
export function isUuid(id: string): boolean {
  return UUID_RE.test(id)
}

function emptySkills(): Record<SkillKey, Proficiency> {
  return Object.fromEntries(SKILLS.map((s) => [s.key, 0])) as Record<SkillKey, Proficiency>
}

const PORTRAIT_SLUGS: Record<string, string> = {
  'Bárbaro': 'barbaro', 'Bardo': 'bardo', 'Brujo': 'brujo', 'Clérigo': 'clerigo',
  'Druida': 'druida', 'Explorador': 'explorador', 'Guerrero': 'guerrero',
  'Hechicero': 'hechicero', 'Mago': 'mago', 'Monje': 'monje',
  'Paladín': 'paladin', 'Pícaro': 'picaro',
}

export function portraitForClass(className: string): string {
  const slug = PORTRAIT_SLUGS[className] ?? 'default'
  return `assets/portraits/${slug}.svg`
}

export function createCharacter(partial?: Partial<Character>): Character {
  const now = new Date().toISOString()
  const cls = CLASSES[6] // Guerrero por defecto
  const base: Character = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    identity: {
      name: 'Sin nombre',
      player: '',
      className: cls.name,
      subclass: '',
      level: 1,
      species: 'Humano',
      background: 'Soldado',
      alignment: 'Neutral',
      xp: 0,
      portrait: portraitForClass(cls.name),
      accent: cls.accent,
      tagline: '',
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saves: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    skills: emptySkills(),
    combat: {
      armorClass: 10,
      speed: 9,
      initiativeBonus: 0,
      hpMax: 10,
      hpCurrent: 10,
      hpTemp: 0,
      hitDieSize: cls.hitDie,
      hitDiceTotal: 1,
      hitDiceSpent: 0,
      deathSuccesses: 0,
      deathFailures: 0,
      heroicInspiration: false,
      exhaustion: 0,
      conditions: [],
      attacks: [],
    },
    spellcasting: {
      ability: cls.spellAbility,
      slots: slotsForClass(cls.caster, 1).map((s) => ({ ...s, used: 0 })),
      spells: [],
      notes: '',
    },
    inventory: {
      coins: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
      items: [],
      notes: '',
    },
    features: { entries: [], languages: ['Común'], armor: '', weapons: '', tools: '' },
    journal: { personality: '', ideals: '', bonds: '', flaws: '', backstory: '', allies: '', notes: '' },
  }
  return { ...base, ...partial }
}

function build(
  name: string,
  className: string,
  level: number,
  opts: {
    species: string
    background: string
    tagline: string
    abilities: Record<AbilityKey, number>
    skills: SkillKey[]
    ac: number
    hp: number
    subclass?: string
  },
): Character {
  const cls = findClass(className)!
  const c = createCharacter()
  const skills = emptySkills()
  for (const s of opts.skills) skills[s] = 1
  return {
    ...c,
    identity: {
      ...c.identity,
      name,
      className,
      subclass: opts.subclass ?? '',
      level,
      species: opts.species,
      background: opts.background,
      tagline: opts.tagline,
      accent: cls.accent,
      portrait: portraitForClass(className),
    },
    abilities: opts.abilities,
    saves: Object.fromEntries(
      (['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]).map((k) => [
        k,
        cls.saves.includes(k) ? 1 : 0,
      ]),
    ) as Record<AbilityKey, Proficiency>,
    skills,
    combat: {
      ...c.combat,
      armorClass: opts.ac,
      hpMax: opts.hp,
      hpCurrent: opts.hp,
      hitDieSize: cls.hitDie,
      hitDiceTotal: level,
    },
    spellcasting: {
      ...c.spellcasting,
      ability: cls.spellAbility,
      slots: slotsForClass(cls.caster, level).map((s) => ({ ...s, used: 0 })),
    },
  }
}

/** Party de ejemplo para que la pantalla de selección nunca esté vacía. */
export function demoRoster(): Character[] {
  return [
    build('Kaelith Vroun', 'Mago', 3, {
      species: 'Elfo',
      background: 'Sabio',
      subclass: 'Evocación',
      tagline: 'La biblioteca arde y él sigue leyendo',
      abilities: { str: 8, dex: 14, con: 13, int: 17, wis: 12, cha: 10 },
      skills: ['arcana', 'history', 'investigation'],
      ac: 12,
      hp: 20,
    }),
    build('Brann Hierroviejo', 'Bárbaro', 3, {
      species: 'Goliat',
      background: 'Soldado',
      subclass: 'Senda del Berserker',
      tagline: 'Habla poco. Rompe mucho.',
      abilities: { str: 17, dex: 13, con: 16, int: 8, wis: 12, cha: 10 },
      skills: ['athletics', 'intimidation', 'survival'],
      ac: 15,
      hp: 34,
    }),
    build('Nyx', 'Pícaro', 3, {
      species: 'Tiefling',
      background: 'Criminal',
      subclass: 'Ladrón',
      tagline: 'Nunca la viste entrar',
      abilities: { str: 10, dex: 17, con: 13, int: 13, wis: 12, cha: 14 },
      skills: ['stealth', 'sleightOfHand', 'deception', 'perception'],
      ac: 14,
      hp: 21,
    }),
    build('Sor Maren', 'Clérigo', 3, {
      species: 'Aasimar',
      background: 'Acólito',
      subclass: 'Dominio de la Vida',
      tagline: 'La luz no pide permiso',
      abilities: { str: 13, dex: 10, con: 14, int: 11, wis: 17, cha: 13 },
      skills: ['insight', 'medicine', 'religion'],
      ac: 18,
      hp: 24,
    }),
  ]
}
