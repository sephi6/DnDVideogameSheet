import { create } from 'zustand'
import type { Character } from '@/types/character'
import { createCharacter, demoRoster } from '@/data/defaults'
import { storage } from '@/lib/storage'

type Updater = (draft: Character) => void

interface RosterState {
  characters: Character[]
  loaded: boolean
  savedAt: number | null
  hydrate: () => Promise<void>
  addCharacter: (partial?: Partial<Character>) => Character
  duplicateCharacter: (id: string) => void
  removeCharacter: (id: string) => void
  updateCharacter: (id: string, updater: Updater) => void
  importRoster: (characters: Character[]) => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function persist(characters: Character[], set: (p: Partial<RosterState>) => void) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    void storage.saveAll(characters).then(() => set({ savedAt: Date.now() }))
  }, 350)
}

export const useRoster = create<RosterState>((set, get) => ({
  characters: [],
  loaded: false,
  savedAt: null,

  async hydrate() {
    const stored = await storage.load()
    const characters = stored.length > 0 ? stored : demoRoster()
    set({ characters, loaded: true })
    if (stored.length === 0) persist(characters, set)
  },

  addCharacter(partial) {
    const character = createCharacter(partial)
    const characters = [...get().characters, character]
    set({ characters })
    persist(characters, set)
    return character
  },

  duplicateCharacter(id) {
    const source = get().characters.find((c) => c.id === id)
    if (!source) return
    const copy = createCharacter({
      ...structuredClone(source),
      identity: { ...structuredClone(source.identity), name: `${source.identity.name} (copia)` },
    })
    copy.id = createCharacter().id
    const characters = [...get().characters, copy]
    set({ characters })
    persist(characters, set)
  },

  removeCharacter(id) {
    const characters = get().characters.filter((c) => c.id !== id)
    set({ characters })
    persist(characters, set)
  },

  updateCharacter(id, updater) {
    const characters = get().characters.map((c) => {
      if (c.id !== id) return c
      const draft = structuredClone(c)
      updater(draft)
      draft.updatedAt = new Date().toISOString()
      return draft
    })
    set({ characters })
    persist(characters, set)
  },

  importRoster(characters) {
    set({ characters })
    persist(characters, set)
  },
}))

export function useCharacter(id: string | null): Character | undefined {
  return useRoster((s) => (id ? s.characters.find((c) => c.id === id) : undefined))
}
