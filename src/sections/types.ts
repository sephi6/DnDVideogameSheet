import type { Character } from '@/types/character'

export interface SectionProps {
  character: Character
  update: (recipe: (draft: Character) => void) => void
}
