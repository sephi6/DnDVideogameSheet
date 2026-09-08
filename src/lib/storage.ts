import type { Character } from '@/types/character'
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase'

/**
 * Read and write services for character sheets.
 *
 * Two interchangeable implementations: localStorage (when there are no
 * Supabase credentials) and Supabase. The screens do not know which one is
 * active; they always talk to `storage`.
 */
export interface StorageAdapter {
  readonly name: 'local' | 'supabase'
  /** Every sheet visible to whoever is signed in. */
  load(): Promise<Character[]>
  /** Creates or updates a whole sheet. */
  save(character: Character): Promise<void>
  /** Saves several at once (seeding and importing). */
  saveMany(characters: Character[]): Promise<void>
  remove(id: string): Promise<void>
}

// ── localStorage ────────────────────────────────────────────────────────────

const KEY = 'arcana:roster:v1'

function readLocal(): Character[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Character[]) : []
  } catch {
    return []
  }
}

function writeLocal(characters: Character[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(characters))
  } catch (err) {
    console.warn('[arcana] could not save to localStorage', err)
    throw err
  }
}

export const localAdapter: StorageAdapter = {
  name: 'local',
  async load() {
    return readLocal()
  },
  async save(character) {
    const all = readLocal()
    const i = all.findIndex((c) => c.id === character.id)
    if (i >= 0) all[i] = character
    else all.push(character)
    writeLocal(all)
  },
  async saveMany(characters) {
    const all = readLocal()
    for (const character of characters) {
      const i = all.findIndex((c) => c.id === character.id)
      if (i >= 0) all[i] = character
      else all.push(character)
    }
    writeLocal(all)
  },
  async remove(id) {
    writeLocal(readLocal().filter((c) => c.id !== id))
  },
}

/** Sheets stored in this browser before Supabase was connected. */
export function readLocalRoster(): Character[] {
  return readLocal()
}

// ── Supabase ────────────────────────────────────────────────────────────────

interface CharacterRow {
  id: string
  owner_id: string | null
  name: string
  data: Character
  created_at: string
  updated_at: string
}

/**
 * The whole sheet travels in the `data` column (jsonb); `name` and `owner_id`
 * are denormalized so SQL can list and filter without opening the json.
 */
function toRow(character: Character, ownerId: string | null): Omit<CharacterRow, 'created_at' | 'updated_at'> {
  return {
    id: character.id,
    owner_id: ownerId,
    name: character.identity.name,
    data: character,
  }
}

export const supabaseAdapter: StorageAdapter = {
  name: 'supabase',

  async load() {
    const client = requireSupabase()
    const { data, error } = await client
      .from('characters')
      .select('id, data, created_at')
      .order('created_at', { ascending: true })
    if (error) throw error
    // The row id wins over whatever id the json carries.
    return (data ?? []).map((row) => ({ ...(row.data as Character), id: row.id }))
  },

  async save(character) {
    const client = requireSupabase()
    const { data: auth } = await client.auth.getUser()
    const { error } = await client
      .from('characters')
      .upsert(toRow(character, auth.user?.id ?? null), { onConflict: 'id' })
    if (error) throw error
  },

  async saveMany(characters) {
    if (characters.length === 0) return
    const client = requireSupabase()
    const { data: auth } = await client.auth.getUser()
    const ownerId = auth.user?.id ?? null
    const { error } = await client
      .from('characters')
      .upsert(characters.map((c) => toRow(c, ownerId)), { onConflict: 'id' })
    if (error) throw error
  },

  async remove(id) {
    const client = requireSupabase()
    const { error } = await client.from('characters').delete().eq('id', id)
    if (error) throw error
  },
}

export const storage: StorageAdapter = isSupabaseConfigured ? supabaseAdapter : localAdapter

export const usingCloud = storage.name === 'supabase'
