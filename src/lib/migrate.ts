/**
 * Migration of sheets saved by the Spanish version of the app.
 *
 * Renaming the domain values (classes, species, portrait files…) and moving to
 * imperial units left the already stored sheets pointing at things that no
 * longer exist — most visibly `assets/portraits/mago.svg`, whose current file
 * is `wizard.webp`. This module rewrites those sheets on load.
 *
 * Only the **enumerated** fields are touched, the ones the interface itself
 * fills from a fixed list. Free text written by the player (attack and item
 * names, notes, ranges, journal) is left exactly as typed.
 */
import type { Character } from '@/types/character'
import { CLASSES as CLASS_TABLE } from '@/data/rules'

/**
 * Sheets without `schemaVersion` (v1) are Spanish and metric. v2 is English and
 * imperial. v3 re-tuned the default class accents to the Azeroth palette.
 * v4 moves generated class portraits to their compressed WebP files.
 */
export const SCHEMA_VERSION = 4

const CLASSES: Record<string, string> = {
  'Bárbaro': 'Barbarian', 'Bardo': 'Bard', 'Brujo': 'Warlock', 'Clérigo': 'Cleric',
  'Druida': 'Druid', 'Explorador': 'Ranger', 'Guerrero': 'Fighter',
  'Hechicero': 'Sorcerer', 'Mago': 'Wizard', 'Monje': 'Monk',
  'Paladín': 'Paladin', 'Pícaro': 'Rogue',
}

const SPECIES: Record<string, string> = {
  'Dracónido': 'Dragonborn', 'Elfo': 'Elf', 'Enano': 'Dwarf', 'Gnomo': 'Gnome',
  'Goliat': 'Goliath', 'Humano': 'Human', 'Mediano': 'Halfling', 'Orco': 'Orc',
}

const BACKGROUNDS: Record<string, string> = {
  'Acólito': 'Acolyte', 'Artesano': 'Artisan', 'Artista': 'Entertainer',
  'Bandido de caminos': 'Wayfarer', 'Charlatán': 'Charlatan', 'Ermitaño': 'Hermit',
  'Escriba': 'Scribe', 'Granjero': 'Farmer', 'Guardia': 'Guard', 'Guía': 'Guide',
  'Marinero': 'Sailor', 'Mercader': 'Merchant', 'Sabio': 'Sage', 'Soldado': 'Soldier',
}

const ALIGNMENTS: Record<string, string> = {
  'Legal bueno': 'Lawful Good', 'Neutral bueno': 'Neutral Good', 'Caótico bueno': 'Chaotic Good',
  'Legal neutral': 'Lawful Neutral', 'Caótico neutral': 'Chaotic Neutral',
  'Legal malvado': 'Lawful Evil', 'Neutral malvado': 'Neutral Evil', 'Caótico malvado': 'Chaotic Evil',
}

/** `Apresado` and `Restringido` were both Restrained: the result is deduplicated. */
const CONDITIONS: Record<string, string> = {
  'Agarrado': 'Grappled', 'Apresado': 'Restrained', 'Asustado': 'Frightened',
  'Aturdido': 'Stunned', 'Cegado': 'Blinded', 'Derribado': 'Prone',
  'Encantado': 'Charmed', 'Ensordecido': 'Deafened', 'Envenenado': 'Poisoned',
  'Incapacitado': 'Incapacitated', 'Inconsciente': 'Unconscious',
  'Paralizado': 'Paralyzed', 'Petrificado': 'Petrified', 'Restringido': 'Restrained',
}

const DAMAGE_TYPES: Record<string, string> = {
  'Cortante': 'Slashing', 'Perforante': 'Piercing', 'Contundente': 'Bludgeoning',
  'Ácido': 'Acid', 'Frío': 'Cold', 'Fuego': 'Fire', 'Fuerza': 'Force',
  'Necrótico': 'Necrotic', 'Psíquico': 'Psychic', 'Radiante': 'Radiant',
  'Relámpago': 'Lightning', 'Trueno': 'Thunder', 'Veneno': 'Poison',
}

/**
 * The old list had nine masteries against the eight official ones. `Hendidura`,
 * `Empujar`, `Derribar`, `Ralentizar`, `Sajar` and `Aturdir` map cleanly;
 * `Enredar`, `Fallo cercano` and `Verter` are a best guess. Anything not listed
 * is left as it was and shows up as a custom option in the dropdown.
 */
const MASTERIES: Record<string, string> = {
  'Aturdir': 'Sap', 'Derribar': 'Topple', 'Empujar': 'Push', 'Enredar': 'Vex',
  'Fallo cercano': 'Graze', 'Hendidura': 'Cleave', 'Ralentizar': 'Slow',
  'Sajar': 'Nick', 'Verter': 'Graze',
}

const SCHOOLS: Record<string, string> = {
  'Abjuración': 'Abjuration', 'Conjuración': 'Conjuration', 'Adivinación': 'Divination',
  'Encantamiento': 'Enchantment', 'Evocación': 'Evocation', 'Ilusión': 'Illusion',
  'Nigromancia': 'Necromancy', 'Transmutación': 'Transmutation',
}

const LANGUAGES: Record<string, string> = {
  'Común': 'Common', 'Draconiano': 'Draconic', 'Dracónico': 'Draconic',
  'Enano': 'Dwarvish', 'Élfico': 'Elvish', 'Gigante': 'Giant', 'Gnómico': 'Gnomish',
  'Mediano': 'Halfling', 'Orco': 'Orc', 'Abisal': 'Abyssal',
  'Infracomún': 'Deep Speech', 'Silvano': 'Sylvan', 'Druídico': 'Druidic',
  'Jerga de ladrones': "Thieves' Cant",
}

/** Portrait files were renamed to the English class slug. */
const PORTRAIT_SLUGS: Record<string, string> = {
  barbaro: 'barbarian', bardo: 'bard', brujo: 'warlock', clerigo: 'cleric',
  druida: 'druid', explorador: 'ranger', guerrero: 'fighter', hechicero: 'sorcerer',
  mago: 'wizard', monje: 'monk', picaro: 'rogue',
}

const GENERATED_PORTRAIT_SLUGS = new Set([
  'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger',
  'rogue', 'sorcerer', 'warlock', 'wizard', 'death-knight', 'demon-hunter',
  'evoker', 'hunter', 'mage', 'priest', 'shaman', 'warrior',
])

const map = (table: Record<string, string>, value: string): string => table[value] ?? value

/**
 * Rewrites a portrait path that points at one of the old Spanish files.
 * Uploaded portraits (data-urls) and unknown paths are left alone.
 */
function migratePortrait(portrait: string | null): string | null {
  if (!portrait) return portrait
  const match = /^assets\/portraits\/([a-z]+)\.svg$/.exec(portrait)
  if (!match) return portrait
  const slug = PORTRAIT_SLUGS[match[1]]
  return slug ? `assets/portraits/${slug}.webp` : portrait
}

/** v3 → v4: standard generated portraits changed from PNG/SVG to WebP. */
function migrateGeneratedPortrait(c: Character): void {
  const portrait = c.identity.portrait
  if (!portrait) return
  const match = /^assets\/portraits\/([a-z-]+)\.(?:png|svg)$/.exec(portrait)
  if (match && GENERATED_PORTRAIT_SLUGS.has(match[1])) {
    c.identity.portrait = `assets/portraits/${match[1]}.webp`
  }
}

/** Metres to feet, on the 5-foot grid: 9 m → 30 ft., 12 m → 40 ft. */
function metresToFeet(metres: number): number {
  return Math.round(metres / 1.5) * 5
}

/** Kilograms to pounds, rounded to the nearest half pound. */
function kilosToPounds(kilos: number): number {
  return Math.round(kilos * 2.20462 * 2) / 2
}

/**
 * Accents as they were before the Azeroth palette. A sheet still carrying the
 * exact default for its class gets the new one; a player-picked colour is left
 * alone, which is why this compares for equality instead of just overwriting.
 */
const LEGACY_ACCENTS: Record<string, string> = {
  Barbarian: '#e03a2f', Bard: '#d8478f', Cleric: '#e8c15a', Druid: '#4fae62',
  Fighter: '#b9411f', Monk: '#37b6c4', Paladin: '#dcae3c', Ranger: '#3f8f6d',
  Rogue: '#6f7cd1', Sorcerer: '#e2593f', Warlock: '#8b46d6', Wizard: '#3f7bd6',
}

function migrateAccent(character: Character): void {
  const stored = character.identity.accent?.toLowerCase()
  const legacy = LEGACY_ACCENTS[character.identity.className]
  if (!stored || !legacy || stored !== legacy) return
  const current = CLASS_TABLE.find(
    (c) => c.name === character.identity.className && c.origin === 'phb2024',
  )
  if (current) character.identity.accent = current.accent
}

/**
 * Brings one sheet up to the current schema, one version step at a time:
 * v1 → v2 translates the Spanish values and converts metric to imperial;
 * v2 → v3 re-tunes a default accent; v3 → v4 points generated portraits at
 * their compressed WebP files. A sheet already stamped with
 * `SCHEMA_VERSION` is returned untouched, and the v1 step only runs on v1
 * sheets, so a speed that has already been converted is never converted twice.
 */
export function migrateCharacter(character: Character): Character {
  const from = character.schemaVersion ?? 1
  if (from >= SCHEMA_VERSION) return character

  const c = structuredClone(character)

  if (from < 2) migrateSpanishMetric(c)
  // After the Spanish step, so a v1 'Mago' is already 'Wizard' when compared.
  if (from < 3) migrateAccent(c)
  if (from < 4) migrateGeneratedPortrait(c)

  c.schemaVersion = SCHEMA_VERSION
  return c
}

/** v1 → v2: Spanish domain values and metric units to English and imperial. */
function migrateSpanishMetric(c: Character): void {
  c.identity.className = map(CLASSES, c.identity.className)
  c.identity.species = map(SPECIES, c.identity.species)
  c.identity.background = map(BACKGROUNDS, c.identity.background)
  c.identity.alignment = map(ALIGNMENTS, c.identity.alignment)
  c.identity.portrait = migratePortrait(c.identity.portrait)

  c.combat.speed = metresToFeet(c.combat.speed)
  c.combat.conditions = [...new Set(c.combat.conditions.map((x) => map(CONDITIONS, x)))]
  for (const attack of c.combat.attacks) {
    attack.damageType = map(DAMAGE_TYPES, attack.damageType)
    attack.mastery = map(MASTERIES, attack.mastery)
  }

  for (const spell of c.spellcasting.spells) {
    spell.school = map(SCHOOLS, spell.school)
  }

  for (const item of c.inventory.items) {
    item.weight = kilosToPounds(item.weight)
  }

  c.features.languages = [...new Set(c.features.languages.map((x) => map(LANGUAGES, x)))]
  for (const entry of c.features.entries) {
    // `source` usually holds a class or species name; subclasses stay as typed.
    entry.source = map(SPECIES, map(CLASSES, entry.source))
  }
}

export function migrateRoster(characters: Character[]): Character[] {
  return characters.map(migrateCharacter)
}
