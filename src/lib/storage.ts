import type { Character } from '@/types/character'
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase'

/**
 * Servicios de lectura y escritura de fichas.
 *
 * Hay dos implementaciones intercambiables: localStorage (cuando no hay
 * credenciales de Supabase) y Supabase. Las pantallas no saben cuál está
 * activa; hablan siempre con `storage`.
 */
export interface StorageAdapter {
  readonly name: 'local' | 'supabase'
  /** Todas las fichas visibles para quien esté dentro. */
  load(): Promise<Character[]>
  /** Crea o actualiza una ficha completa. */
  save(character: Character): Promise<void>
  /** Guarda varias de una vez (siembra e importación). */
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
    console.warn('[arcana] no se pudo guardar en localStorage', err)
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

/** Fichas guardadas en este navegador antes de conectar Supabase. */
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
 * La ficha entera viaja en la columna `data` (jsonb); `name` y `owner_id` se
 * desnormalizan para poder listar y filtrar desde SQL sin abrir el json.
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
    // El id de la fila manda sobre el que venga dentro del json.
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
