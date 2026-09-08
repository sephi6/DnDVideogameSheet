import { create } from 'zustand'
import type { Character } from '@/types/character'
import { createCharacter, demoRoster, isUuid, newId } from '@/data/defaults'
import { readLocalRoster, storage, usingCloud } from '@/lib/storage'
import { readableError } from '@/lib/supabase'

type Updater = (draft: Character) => void

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'

interface RosterState {
  characters: Character[]
  loaded: boolean
  sync: SyncStatus
  syncError: string | null
  /** Fichas guardadas en este navegador que aún no están en la nube. */
  pendingLocalImport: number
  hydrate: () => Promise<void>
  reset: () => void
  addCharacter: (partial?: Partial<Character>) => Character
  duplicateCharacter: (id: string) => void
  removeCharacter: (id: string) => Promise<void>
  updateCharacter: (id: string, updater: Updater) => void
  seedDemo: () => Promise<void>
  importLocalRoster: () => Promise<void>
  retryFailed: () => Promise<void>
}

const SAVE_DEBOUNCE_MS = 500
const SEEDED_KEY = 'arcana:cloud-seeded'

/** Un temporizador por ficha: escribir en una no retrasa el guardado de otra. */
const timers = new Map<string, ReturnType<typeof setTimeout>>()
/** Fichas cuyo último guardado falló; se reintentan desde la interfaz. */
const failed = new Set<string>()
/**
 * Lectura en curso. React monta los efectos dos veces en StrictMode, y sin
 * esto las dos pasadas veían la base vacía y sembraban la party de ejemplo
 * por duplicado.
 */
let hydration: Promise<void> | null = null

type Set_ = (partial: Partial<RosterState>) => void
type Get_ = () => RosterState

async function writeNow(id: string, set: Set_, get: Get_) {
  const character = get().characters.find((c) => c.id === id)
  if (!character) return
  set({ sync: 'saving', syncError: null })
  try {
    await storage.save(character)
    failed.delete(id)
    set(failed.size === 0 ? { sync: 'saved', syncError: null } : { sync: 'error' })
  } catch (err) {
    failed.add(id)
    console.error('[arcana] fallo al guardar la ficha', err)
    set({ sync: 'error', syncError: readableError(err) })
  }
}

function scheduleSave(id: string, set: Set_, get: Get_) {
  const existing = timers.get(id)
  if (existing) clearTimeout(existing)
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id)
      void writeNow(id, set, get)
    }, SAVE_DEBOUNCE_MS),
  )
}

/** Las fichas viejas de localStorage llevaban ids tipo `pc_x`; la nube pide uuid. */
function withValidId(character: Character): Character {
  return isUuid(character.id) ? character : { ...character, id: newId() }
}

/** Una única lectura de la base, con siembra de la party de ejemplo si está vacía. */
async function hydrateOnce(set: Set_) {
  set({ loaded: false, sync: 'idle', syncError: null })
  try {
    const stored = await storage.load()

    if (stored.length > 0) {
      const local = usingCloud ? readLocalRoster() : []
      set({ characters: stored, loaded: true, pendingLocalImport: local.length })
      return
    }

    // Base vacía. En local sembramos siempre; en la nube, solo la primera vez,
    // para no resucitar los personajes de ejemplo cada vez que se borran.
    const alreadySeeded = usingCloud && localStorage.getItem(SEEDED_KEY) === '1'
    if (alreadySeeded) {
      set({ characters: [], loaded: true, pendingLocalImport: readLocalRoster().length })
      return
    }

    const demo = demoRoster()
    set({ characters: demo, loaded: true })
    await storage.saveMany(demo)
    if (usingCloud) localStorage.setItem(SEEDED_KEY, '1')
    set({ sync: 'saved' })
  } catch (err) {
    console.error('[arcana] no se pudieron leer las fichas', err)
    set({ characters: [], loaded: true, sync: 'error', syncError: readableError(err) })
  }
}

export const useRoster = create<RosterState>((set, get) => ({
  characters: [],
  loaded: false,
  sync: 'idle',
  syncError: null,
  pendingLocalImport: 0,

  hydrate() {
    hydration ??= (async () => {
      try {
        await hydrateOnce(set)
      } finally {
        hydration = null
      }
    })()
    return hydration
  },

  /** Al cerrar sesión no puede quedarse la party de la sesión anterior en pantalla. */
  reset() {
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
    failed.clear()
    set({ characters: [], loaded: false, sync: 'idle', syncError: null, pendingLocalImport: 0 })
  },

  addCharacter(partial) {
    const character = createCharacter(partial)
    set({ characters: [...get().characters, character] })
    scheduleSave(character.id, set, get)
    return character
  },

  duplicateCharacter(id) {
    const source = get().characters.find((c) => c.id === id)
    if (!source) return
    const copy = structuredClone(source)
    copy.id = newId()
    copy.createdAt = new Date().toISOString()
    copy.updatedAt = copy.createdAt
    copy.identity.name = `${source.identity.name} (copia)`
    set({ characters: [...get().characters, copy] })
    scheduleSave(copy.id, set, get)
  },

  async removeCharacter(id) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    const previous = get().characters
    set({ characters: previous.filter((c) => c.id !== id), sync: 'saving', syncError: null })
    try {
      await storage.remove(id)
      failed.delete(id)
      set({ sync: 'saved' })
    } catch (err) {
      console.error('[arcana] no se pudo borrar la ficha', err)
      // Se devuelve a la lista: si el borrado no cuajó, la ficha sigue existiendo.
      set({ characters: previous, sync: 'error', syncError: readableError(err) })
    }
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
    scheduleSave(id, set, get)
  },

  async seedDemo() {
    const demo = demoRoster()
    set({ characters: [...get().characters, ...demo], sync: 'saving', syncError: null })
    try {
      await storage.saveMany(demo)
      if (usingCloud) localStorage.setItem(SEEDED_KEY, '1')
      set({ sync: 'saved' })
    } catch (err) {
      set({ sync: 'error', syncError: readableError(err) })
    }
  },

  async importLocalRoster() {
    const local = readLocalRoster().map(withValidId)
    if (local.length === 0) return
    const existing = new Set(get().characters.map((c) => c.id))
    const nuevos = local.filter((c) => !existing.has(c.id))
    set({ characters: [...get().characters, ...nuevos], sync: 'saving', syncError: null })
    try {
      await storage.saveMany(nuevos)
      set({ sync: 'saved', pendingLocalImport: 0 })
    } catch (err) {
      set({ sync: 'error', syncError: readableError(err) })
    }
  },

  async retryFailed() {
    const ids = [...failed]
    if (ids.length === 0) {
      set({ sync: 'saved', syncError: null })
      return
    }
    for (const id of ids) await writeNow(id, set, get)
  },
}))

export function useCharacter(id: string | null): Character | undefined {
  return useRoster((s) => (id ? s.characters.find((c) => c.id === id) : undefined))
}
