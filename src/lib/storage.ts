import type { Character } from '@/types/character'

/**
 * Capa de persistencia. El MVP usa localStorage; cuando se conecte Supabase
 * basta con implementar esta misma interfaz contra la tabla `characters`
 * (ver docs/SUPABASE.md) y cambiar el adaptador exportado.
 */
export interface StorageAdapter {
  readonly name: string
  load(): Promise<Character[]>
  saveAll(characters: Character[]): Promise<void>
}

const KEY = 'arcana:roster:v1'

export const localAdapter: StorageAdapter = {
  name: 'local',
  async load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as Character[]) : []
    } catch {
      return []
    }
  },
  async saveAll(characters) {
    try {
      localStorage.setItem(KEY, JSON.stringify(characters))
    } catch (err) {
      console.warn('[arcana] no se pudo guardar en localStorage', err)
    }
  },
}

export const storage: StorageAdapter = localAdapter
