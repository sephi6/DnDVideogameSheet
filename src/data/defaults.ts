import type {
  AbilityKey,
  Attack,
  Character,
  FeatureEntry,
  InventoryItem,
  Journal,
  Proficiency,
  SkillKey,
  SpellEntry,
} from '@/types/character'
import { CLASSES, SKILLS, findClass, slotsForClass } from './rules'

/** Ids for the entries nested inside the jsonb (attacks, items…). */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

/**
 * Id of a character sheet. A real UUID, because it ends up being the primary
 * key of the `characters` table in Supabase.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for insecure contexts, where randomUUID does not exist.
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC 4122 variant
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Does this id work as a uuid primary key? Old sheets used `pc_xxx`. */
export function isUuid(id: string): boolean {
  return UUID_RE.test(id)
}

function emptySkills(): Record<SkillKey, Proficiency> {
  return Object.fromEntries(SKILLS.map((s) => [s.key, 0])) as Record<SkillKey, Proficiency>
}

const PORTRAIT_SLUGS: Record<string, string> = {
  Barbarian: 'barbarian', Bard: 'bard', Cleric: 'cleric', Druid: 'druid',
  Fighter: 'fighter', Monk: 'monk', Paladin: 'paladin', Ranger: 'ranger',
  Rogue: 'rogue', Sorcerer: 'sorcerer', Warlock: 'warlock', Wizard: 'wizard',
}

export function portraitForClass(className: string): string {
  const slug = PORTRAIT_SLUGS[className] ?? 'default'
  return `assets/portraits/${slug}.svg`
}

export function createCharacter(partial?: Partial<Character>): Character {
  const now = new Date().toISOString()
  const cls = findClass('Fighter') ?? CLASSES[0] // Fighter by default
  const base: Character = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    identity: {
      name: 'Unnamed',
      player: '',
      className: cls.name,
      subclass: '',
      level: 1,
      species: 'Human',
      background: 'Soldier',
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
      speed: 30,
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
    features: { entries: [], languages: ['Common'], armor: '', weapons: '', tools: '' },
    journal: { personality: '', ideals: '', bonds: '', flaws: '', backstory: '', allies: '', notes: '' },
  }
  return { ...base, ...partial }
}

/**
 * Fixed date for the example party, so `scripts/generate-seed.mjs` always
 * produces the same `supabase/seed.sql` and does not dirty the diff on every run.
 */
const DEMO_TIMESTAMP = '2026-01-01T00:00:00.000Z'

// ── Factories for the nested entries, with sensible defaults ─────────────────

/** A weapon. Ids are assigned in `build` from the character slug. */
function wp(
  name: string,
  ability: AbilityKey,
  damage: string,
  damageType: string,
  extra: Partial<Omit<Attack, 'id' | 'name' | 'ability' | 'damage' | 'damageType'>> = {},
): Omit<Attack, 'id'> {
  return {
    name,
    ability,
    proficient: true,
    damage,
    damageType,
    range: 'Melee',
    mastery: '—',
    notes: '',
    ...extra,
  }
}

function sp(
  name: string,
  level: number,
  school: string,
  extra: Partial<Omit<SpellEntry, 'id' | 'name' | 'level' | 'school'>> = {},
): Omit<SpellEntry, 'id'> {
  return {
    name,
    level,
    school,
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, S',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    prepared: true,
    description: '',
    ...extra,
  }
}

function it(name: string, extra: Partial<Omit<InventoryItem, 'id' | 'name'>> = {}): Omit<InventoryItem, 'id'> {
  return { name, quantity: 1, weight: 0, attuned: false, equipped: false, notes: '', ...extra }
}

function ft(
  name: string,
  source: string,
  description: string,
  extra: Partial<Omit<FeatureEntry, 'id' | 'name' | 'source' | 'description'>> = {},
): Omit<FeatureEntry, 'id'> {
  return { name, source, description, usesMax: 0, usesSpent: 0, recharge: 'none', ...extra }
}

interface DemoSpec {
  /** Deterministic prefix for the ids of attacks, spells, items and features. */
  slug: string
  species: string
  background: string
  tagline: string
  subclass?: string
  abilities: Record<AbilityKey, number>
  skills: SkillKey[]
  ac: number
  hp: number
  hpCurrent?: number
  speed?: number
  conditions?: string[]
  heroicInspiration?: boolean
  exhaustion?: number
  attacks?: Omit<Attack, 'id'>[]
  spells?: Omit<SpellEntry, 'id'>[]
  /** Slots spent per spell level, e.g. `{ 1: 2 }`. */
  slotsUsed?: Record<number, number>
  spellNotes?: string
  coins?: Partial<Character['inventory']['coins']>
  items?: Omit<InventoryItem, 'id'>[]
  inventoryNotes?: string
  features?: Omit<FeatureEntry, 'id'>[]
  languages?: string[]
  armorProf?: string
  weaponProf?: string
  toolProf?: string
  journal?: Partial<Journal>
}

function build(name: string, className: string, level: number, spec: DemoSpec): Character {
  const cls = findClass(className)!
  const c = createCharacter()
  const skills = emptySkills()
  for (const s of spec.skills) skills[s] = 1

  const slots = slotsForClass(cls.caster, level).map((s) => ({
    ...s,
    used: Math.min(spec.slotsUsed?.[s.level] ?? 0, s.total),
  }))

  return {
    ...c,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
    identity: {
      ...c.identity,
      name,
      className,
      subclass: spec.subclass ?? '',
      level,
      species: spec.species,
      background: spec.background,
      tagline: spec.tagline,
      accent: cls.accent,
      portrait: portraitForClass(className),
    },
    abilities: spec.abilities,
    saves: Object.fromEntries(
      (['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]).map((k) => [
        k,
        cls.saves.includes(k) ? 1 : 0,
      ]),
    ) as Record<AbilityKey, Proficiency>,
    skills,
    combat: {
      ...c.combat,
      armorClass: spec.ac,
      speed: spec.speed ?? c.combat.speed,
      hpMax: spec.hp,
      hpCurrent: spec.hpCurrent ?? spec.hp,
      hitDieSize: cls.hitDie,
      hitDiceTotal: level,
      heroicInspiration: spec.heroicInspiration ?? false,
      exhaustion: spec.exhaustion ?? 0,
      conditions: spec.conditions ?? [],
      attacks: (spec.attacks ?? []).map((a, i) => ({ ...a, id: `${spec.slug}-atk-${i + 1}` })),
    },
    spellcasting: {
      ...c.spellcasting,
      ability: cls.spellAbility,
      slots,
      spells: (spec.spells ?? []).map((s, i) => ({ ...s, id: `${spec.slug}-spell-${i + 1}` })),
      notes: spec.spellNotes ?? '',
    },
    inventory: {
      ...c.inventory,
      coins: { ...c.inventory.coins, ...spec.coins },
      items: (spec.items ?? []).map((item, i) => ({ ...item, id: `${spec.slug}-item-${i + 1}` })),
      notes: spec.inventoryNotes ?? '',
    },
    features: {
      ...c.features,
      entries: (spec.features ?? []).map((f, i) => ({ ...f, id: `${spec.slug}-feat-${i + 1}` })),
      languages: spec.languages ?? c.features.languages,
      armor: spec.armorProf ?? '',
      weapons: spec.weaponProf ?? '',
      tools: spec.toolProf ?? '',
    },
    journal: { ...c.journal, ...spec.journal },
  }
}

/**
 * Example party. Every section comes filled in (attacks, spells, gear, features
 * and journal) so the whole sheet can be tried out with real data.
 */
export function demoRoster(): Character[] {
  return [
    build('Kaelith Vroun', 'Wizard', 3, {
      slug: 'kaelith',
      species: 'Elf',
      background: 'Sage',
      subclass: 'Evoker',
      tagline: 'The library burns and he keeps reading',
      abilities: { str: 8, dex: 14, con: 13, int: 17, wis: 12, cha: 10 },
      skills: ['arcana', 'history', 'investigation'],
      ac: 12,
      hp: 20,
      hpCurrent: 14,
      slotsUsed: { 1: 2 },
      attacks: [
        wp('Dagger', 'dex', '1d4', 'Piercing', { range: 'Melee or 20/60 ft.', mastery: 'Nick' }),
        wp('Quarterstaff', 'str', '1d6', 'Bludgeoning', { mastery: 'Topple', notes: 'Two-handed: 1d8.' }),
        wp('Ray of Frost', 'int', '1d8', 'Cold', {
          range: '60 feet',
          mastery: '—',
          proficient: true,
          notes: "Cantrip. The target's Speed drops by 10 feet.",
        }),
      ],
      spells: [
        sp('Ray of Frost', 0, 'Evocation', { range: '60 feet', description: 'Spell attack; 1d8 Cold damage and −10 feet of Speed.' }),
        sp('Prestidigitation', 0, 'Transmutation', { range: '10 feet', duration: 'Up to 1 hour', description: 'Harmless sensory tricks with no mechanical weight.' }),
        sp('Light', 0, 'Evocation', { components: 'V, M', duration: '1 hour', description: 'An object sheds Bright Light in a 20-foot radius.' }),
        sp('Magic Missile', 1, 'Evocation', { range: '120 feet', description: 'Three darts of 1d4+1 Force damage that always hit.' }),
        sp('Shield', 1, 'Abjuration', { castingTime: '1 reaction', range: 'Self', duration: '1 round', description: '+5 AC until your next turn; negates Magic Missile.' }),
        sp('Detect Magic', 1, 'Divination', { range: 'Self', concentration: true, ritual: true, duration: 'Conc., 10 min', prepared: false, description: 'You sense magical auras within 30 feet.' }),
        sp('Scorching Ray', 2, 'Evocation', { range: '120 feet', description: 'Three rays of 2d6 Fire damage; add your spellcasting modifier with Empowered Evocation.' }),
        sp('Levitate', 2, 'Transmutation', { range: '60 feet', components: 'V, S, M', concentration: true, duration: 'Conc., 10 min', prepared: false, description: 'An object or creature floats up to 20 feet upward.' }),
      ],
      spellNotes: 'Spellbook holds 12 more spells left unprepared. Spellcasting focus: a cut crystal.',
      coins: { gp: 42, sp: 15 },
      items: [
        it('Spellbook', { equipped: true, weight: 3, notes: 'Blue leather cover with a brass clasp.' }),
        it('Crystal', { equipped: true, weight: 1, notes: 'Arcane focus.' }),
        it('Component Pouch', { weight: 2 }),
        it('Robe', { equipped: true, weight: 4 }),
        it('Potion of Healing', { quantity: 2, weight: 0.5, notes: '2d4+2 when drunk (Bonus Action).' }),
        it('Rations', { quantity: 5, weight: 2 }),
        it('Torch', { quantity: 3, weight: 1 }),
      ],
      features: [
        ft('Arcane Recovery', 'Wizard', 'Once per day after a Short Rest you recover spell slots with a combined level of up to 2.', { usesMax: 1, recharge: 'long' }),
        ft('Empowered Evocation', 'Evoker', 'You add your Intelligence modifier to the damage of one target of your Evocation cantrips.', {}),
        ft('Sculpt Spells', 'Evoker', 'When you cast an area Evocation spell, you choose up to 1 + the spell level creatures that automatically succeed on the save and take no damage.', {}),
        ft('Fey Ancestry', 'Elf', "Advantage on saves against the Charmed condition; magic can't put you to sleep.", {}),
      ],
      languages: ['Common', 'Elvish', 'Draconic', 'Deep Speech'],
      armorProf: 'None',
      weaponProf: 'Simple weapons',
      toolProf: "Calligrapher's Supplies",
      journal: {
        personality: 'Speaks slowly and quotes books nobody else has read.',
        ideals: 'Knowledge that is not shared rots.',
        bonds: 'The library of Vroun burned because of him. He is rebuilding it from memory.',
        flaws: 'Puts an interesting fact ahead of his own safety.',
        backstory: 'Third son of a minor house, he traded the title for an archivist post. In the cellars he found a treatise on evocation that should not exist.',
        allies: 'Master Oriel, of the Crystal College. Fenn the bookseller, who owes him favours.',
        notes: 'Chasing the scattered pages of the Aldaric treatise.',
      },
    }),
    build('Brann Oldiron', 'Barbarian', 3, {
      slug: 'brann',
      species: 'Goliath',
      background: 'Soldier',
      subclass: 'Path of the Berserker',
      tagline: 'Talks little. Breaks plenty.',
      abilities: { str: 17, dex: 13, con: 16, int: 8, wis: 12, cha: 10 },
      skills: ['athletics', 'intimidation', 'survival', 'perception'],
      ac: 15,
      hp: 34,
      hpCurrent: 26,
      speed: 40,
      heroicInspiration: true,
      attacks: [
        wp('Greataxe', 'str', '1d12', 'Slashing', { mastery: 'Cleave', notes: 'Two-handed. +2 damage while Raging.' }),
        wp('Handaxe', 'str', '1d6', 'Slashing', { range: 'Melee or 20/60 ft.', mastery: 'Vex' }),
        wp('Unarmed Strike', 'str', '1', 'Bludgeoning', { mastery: '—' }),
      ],
      coins: { gp: 12, sp: 40 },
      items: [
        it('Greataxe', { equipped: true, weight: 7 }),
        it('Handaxe', { quantity: 2, weight: 2 }),
        it('Hide Armor', { equipped: true, weight: 12 }),
        it("Explorer's Pack", { weight: 55 }),
        it('Hempen Rope (50 feet)', { weight: 5 }),
        it('Rations', { quantity: 10, weight: 2 }),
        it('Regimental medal', { notes: 'From the Second of Ravenstone. All dead but him.' }),
      ],
      features: [
        ft('Rage', 'Barbarian', 'Bonus Action. Advantage on Strength checks and saves, +2 melee damage, and Resistance to Bludgeoning, Piercing and Slashing damage. Lasts 1 minute.', { usesMax: 3, usesSpent: 1, recharge: 'long' }),
        ft('Reckless Attack', 'Barbarian', 'When you attack with Strength you roll with Advantage; in exchange, attacks against you have Advantage until your next turn.', {}),
        ft('Danger Sense', 'Barbarian', 'Advantage on Dexterity saves against effects you can see (traps, spells).', {}),
        ft('Frenzy', 'Path of the Berserker', 'While Raging you can make one extra melee attack as a Bonus Action on each of your turns.', {}),
        ft("Stone's Endurance", 'Goliath', 'As a Reaction you reduce damage taken by 1d12 plus your Constitution modifier. Long Rest.', { usesMax: 1, recharge: 'long' }),
      ],
      languages: ['Common', 'Giant'],
      armorProf: 'Light and Medium armor, Shields',
      weaponProf: 'Simple and Martial weapons',
      toolProf: 'A set of bone dice',
      journal: {
        personality: 'Counts the enemies before the fight. Out loud.',
        ideals: 'A given word is a weight. You do not put it down.',
        bonds: 'The Second of Ravenstone fell at the Kettur pass. He arrived too late.',
        flaws: 'Does not know how to retreat. Never has.',
        backstory: 'He came down from the mountains to work as an escort and ended up in a regiment. When it was wiped out he kept fighting alone until some adventurers picked him up half dead.',
        allies: 'The cleric Sister Maren stitched his side up and never charged him.',
        notes: 'Looking for the officer who ordered the advance at Kettur.',
      },
    }),
    build('Nyx', 'Rogue', 3, {
      slug: 'nyx',
      species: 'Tiefling',
      background: 'Criminal',
      subclass: 'Thief',
      tagline: 'You never saw her come in',
      abilities: { str: 10, dex: 17, con: 13, int: 13, wis: 12, cha: 14 },
      skills: ['stealth', 'sleightOfHand', 'deception', 'perception', 'acrobatics', 'investigation'],
      ac: 14,
      hp: 21,
      attacks: [
        wp('Rapier', 'dex', '1d8', 'Piercing', { mastery: 'Vex', notes: 'Finesse.' }),
        wp('Thrown Dagger', 'dex', '1d4', 'Piercing', { range: 'Melee or 20/60 ft.', mastery: 'Nick' }),
        wp('Shortbow', 'dex', '1d6', 'Piercing', { range: '80/320 ft.', mastery: 'Vex' }),
      ],
      spellNotes: 'No spellcasting. The Thaumaturgy cantrip comes from her fiendish legacy (1/day).',
      coins: { gp: 60, pp: 3 },
      items: [
        it('Rapier', { equipped: true, weight: 2 }),
        it('Dagger', { quantity: 4, weight: 1, notes: 'Two at the belt, one in the boot, one up the sleeve.' }),
        it('Shortbow and 20 Arrows', { weight: 3 }),
        it('Leather Armor', { equipped: true, weight: 10 }),
        it("Thieves' Tools", { equipped: true, weight: 1, notes: 'Proficient; picks, mirror, files.' }),
        it('Disguise Kit', { weight: 3 }),
        it('Silk Rope (50 feet)', { weight: 5 }),
        it('Forged wax seal', { notes: 'House Verrin. Good for one letter, not two.' }),
      ],
      features: [
        ft('Sneak Attack (2d6)', 'Rogue', 'Once per turn, +2d6 damage on an attack made with Advantage or with an ally next to the target, using a Finesse or Ranged weapon.', {}),
        ft('Expertise', 'Rogue', 'Double proficiency in Stealth and Sleight of Hand.', {}),
        ft('Cunning Action', 'Rogue', 'Each turn you can Dash, Disengage or Hide as a Bonus Action.', {}),
        ft("Thieves' Cant", 'Rogue', 'A coded jargon only others who know it can understand.', {}),
        ft('Fast Hands', 'Thief', "You can use Thieves' Tools or take the Utilize action as part of the Bonus Action granted by Cunning Action.", {}),
        ft('Second-Story Work', 'Thief', 'You gain a Climb Speed equal to your Speed, and your running jumps go further by a number of feet equal to your Dexterity modifier.', {}),
        ft('Fiendish Legacy', 'Tiefling', 'Resistance to Fire damage. You know Thaumaturgy; at level 3, Hellish Rebuke 1/day.', { usesMax: 1, recharge: 'long' }),
      ],
      languages: ['Common', 'Infernal', 'Deep Speech', "Thieves' Cant"],
      armorProf: 'Light armor',
      weaponProf: 'Simple weapons, Hand Crossbows, Longswords, Rapiers, Shortswords',
      toolProf: "Thieves' Tools, Disguise Kit",
      journal: {
        personality: 'Answers questions with another question.',
        ideals: 'Locks are an opinion, not a law.',
        bonds: 'She owes her life to an old pickpocket who can no longer work. She sends him money.',
        flaws: 'Cannot walk past a locked safe.',
        backstory: 'She grew up on the rooftops of the Salt Quarter. The guild wanted her; she preferred to freelance and is still paying for it.',
        allies: 'Corvo, the old pickpocket. A customs contact who warns her about raids.',
        notes: 'House Verrin put a price on her head after the necklace business.',
      },
    }),
    build('Sister Maren', 'Cleric', 3, {
      slug: 'maren',
      species: 'Aasimar',
      background: 'Acolyte',
      subclass: 'Life Domain',
      tagline: 'The light does not ask permission',
      abilities: { str: 13, dex: 10, con: 14, int: 11, wis: 17, cha: 13 },
      skills: ['insight', 'medicine', 'religion', 'persuasion'],
      ac: 18,
      hp: 24,
      hpCurrent: 24,
      slotsUsed: { 1: 1 },
      attacks: [
        wp('Mace', 'str', '1d6', 'Bludgeoning', { mastery: 'Sap' }),
        wp('Light Crossbow', 'dex', '1d8', 'Piercing', { range: '80/320 ft.', mastery: 'Slow' }),
        wp('Sacred Flame', 'wis', '2d8', 'Radiant', {
          range: '60 feet',
          mastery: '—',
          notes: 'Cantrip. Dexterity save, ignores Cover.',
        }),
      ],
      spells: [
        sp('Sacred Flame', 0, 'Evocation', { range: '60 feet', description: 'Dexterity save or 2d8 Radiant damage. Ignores Cover.' }),
        sp('Thaumaturgy', 0, 'Transmutation', { range: '30 feet', duration: 'Up to 1 min', description: 'A booming voice, faint tremors, doors that swing open on their own.' }),
        sp('Guidance', 0, 'Divination', { concentration: true, duration: 'Conc., 1 min', description: "+1d4 to one of the target's ability checks." }),
        sp('Cure Wounds', 1, 'Abjuration', { description: 'Restores 2d8 + spellcasting modifier (with Disciple of Life, +2 more).' }),
        sp('Bless', 1, 'Enchantment', { components: 'V, S, M', concentration: true, duration: 'Conc., 1 min', description: 'Up to three creatures add 1d4 to attack rolls and saving throws.' }),
        sp('Shield of Faith', 1, 'Abjuration', { castingTime: '1 Bonus Action', range: '60 feet', concentration: true, duration: 'Conc., 10 min', prepared: false, description: "+2 AC to the target." }),
        sp('Spiritual Weapon', 2, 'Evocation', { castingTime: '1 Bonus Action', range: '60 feet', duration: '1 min', description: 'A spectral weapon: 1d8 + modifier Force damage; you move it and attack as a Bonus Action.' }),
        sp('Lesser Restoration', 2, 'Abjuration', { description: 'Ends one disease or one condition: Blinded, Deafened, Paralyzed or Poisoned.' }),
        sp('Aid', 2, 'Abjuration', { range: '30 feet', duration: '8 hours', description: 'Three creatures raise their Hit Point maximum and current Hit Points by 5. Always prepared (domain).' }),
      ],
      spellNotes: 'Prepares 7 spells/day (WIS +3, level 3). Life Domain spells are always prepared.',
      coins: { gp: 18 },
      items: [
        it('Mace', { equipped: true, weight: 4 }),
        it('Shield', { equipped: true, weight: 6, notes: '+2 AC (already included).' }),
        it('Chain Mail', { equipped: true, weight: 55 }),
        it('Holy Symbol', { equipped: true, weight: 1, notes: 'A pewter sun. Spellcasting focus.' }),
        it("Healer's Kit", { weight: 3, notes: '10 uses. Stabilizes with no roll.' }),
        it('Holy Water (flask)', { quantity: 2, weight: 1 }),
        it("Acolyte's vestments", { weight: 4 }),
        it('Rations', { quantity: 7, weight: 2 }),
      ],
      features: [
        ft('Channel Divinity', 'Cleric', 'Two uses per rest. Fuels Turn Undead and Preserve Life.', { usesMax: 2, recharge: 'short' }),
        ft('Turn Undead', 'Cleric', 'Each Undead within 30 feet must succeed on a Wisdom save or flee for 1 minute.', {}),
        ft('Preserve Life', 'Life Domain', 'Spend Channel Divinity to split 5 × your level in Hit Points among creatures within 30 feet, up to half their maximum.', {}),
        ft('Disciple of Life', 'Life Domain', 'Your level 1+ healing spells restore 2 + the spell level extra Hit Points.', {}),
        ft('Celestial Revelation', 'Aasimar', 'As a Bonus Action, transform 1/Long Rest: wings or radiant burst, plus extra Radiant damage.', { usesMax: 1, recharge: 'long' }),
      ],
      languages: ['Common', 'Celestial'],
      armorProf: 'Light and Medium armor, Shields',
      weaponProf: 'Simple weapons',
      toolProf: 'None',
      journal: {
        personality: 'Listens all the way through before answering. Always.',
        ideals: 'Nobody is left behind over what it costs to save them.',
        bonds: 'The temple of Elyon raised her. She will go back when this is over.',
        flaws: 'Holds herself responsible for wounds she could not have prevented.',
        backstory: 'Left as a child on temple steps, she grew up among the sick and the dying. The celestial mark showed at fifteen, and with it the certainty that she was not meant to stay home.',
        allies: 'Brother Tobin, who writes to her. Brann, who owes her a side.',
        notes: 'A fever is running through the Green River villages and it does not answer to magic.',
      },
    }),
  ]
}
