/**
 * Migration of sheets saved by the Spanish version of the app.
 *
 * Renaming the domain values (classes, species, portrait files…) and moving to
 * imperial units left the already stored sheets pointing at things that no
 * longer exist — most visibly `assets/portraits/mago.svg`, whose file is now
 * `wizard.svg`. This module rewrites those sheets on load.
 *
 * Only the **enumerated** fields are touched, the ones the interface itself
 * fills from a fixed list. Free text written by the player (attack and item
 * names, notes, ranges, journal) is left exactly as typed.
 */
import type { Character } from '@/types/character'

/** Sheets without `schemaVersion` are Spanish and metric. */
export const SCHEMA_VERSION = 2

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
  return slug ? `assets/portraits/${slug}.svg` : portrait
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
 * Brings one sheet up to the current schema. Idempotent: a sheet already
 * stamped with `SCHEMA_VERSION` is returned untouched, so a speed that has
 * already been converted is never converted twice.
 */
export function migrateCharacter(character: Character): Character {
  if ((character.schemaVersion ?? 1) >= SCHEMA_VERSION) return character

  const c = structuredClone(character)

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

  c.schemaVersion = SCHEMA_VERSION
  return c
}

export function migrateRoster(characters: Character[]): Character[] {
  return characters.map(migrateCharacter)
}
