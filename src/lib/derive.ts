import type { AbilityKey, Character, SkillKey } from '@/types/character'
import { SKILLS, abilityModifier, proficiencyBonus } from '@/data/rules'

export function mod(character: Character, ability: AbilityKey): number {
  return abilityModifier(character.abilities[ability])
}

export function pb(character: Character): number {
  return proficiencyBonus(character.identity.level)
}

export function saveBonus(character: Character, ability: AbilityKey): number {
  return mod(character, ability) + character.saves[ability] * pb(character)
}

export function skillBonus(character: Character, skill: SkillKey): number {
  const info = SKILLS.find((s) => s.key === skill)!
  return mod(character, info.ability) + character.skills[skill] * pb(character)
}

export function passive(character: Character, skill: SkillKey): number {
  return 10 + skillBonus(character, skill)
}

export function initiative(character: Character): number {
  return mod(character, 'dex') + character.combat.initiativeBonus
}

export function spellSaveDC(character: Character): number | null {
  const ability = character.spellcasting.ability
  if (!ability) return null
  return 8 + pb(character) + mod(character, ability)
}

export function spellAttack(character: Character): number | null {
  const ability = character.spellcasting.ability
  if (!ability) return null
  return pb(character) + mod(character, ability)
}

export function attackBonus(character: Character, ability: AbilityKey, proficient: boolean): number {
  return mod(character, ability) + (proficient ? pb(character) : 0)
}

export function carriedWeight(character: Character): number {
  return character.inventory.items.reduce((sum, i) => sum + i.weight * i.quantity, 0)
}

/** Capacidad de carga: Fuerza x 7,5 kg (equivalente métrico del PHB). */
export function carryCapacity(character: Character): number {
  return character.abilities.str * 7.5
}
