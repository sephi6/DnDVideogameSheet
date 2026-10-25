/** The five kinds of codex entry. Stored as-is in `codex_entries.kind`. */
export type CodexKind = 'npc' | 'place' | 'faction' | 'creature' | 'lore'

/** How the party stands with an NPC, place, faction or creature. */
export type Attitude = 'ally' | 'neutral' | 'hostile' | 'unknown'

/** Kind-specific fields. Only the keys of the entry's kind are kept (sanitizeDetails). */
export interface CodexDetails {
  metAt?: string
  placeType?: string
  firstVisited?: string
  goal?: string
  creatureType?: string
  vulnerabilities?: string[]
  resistances?: string[]
  immunities?: string[]
  loreType?: string
}

/**
 * One shared codex entry. `image` is a Storage path (`codex/<uuid>.webp`), a repo
 * gallery path (`assets/codex/…`), a data-url (local mode) or null.
 * `related` holds outgoing links; incoming ones are computed (backlinks).
 */
export interface CodexEntry {
  id: string
  kind: CodexKind
  name: string
  subtitle: string
  attitude: Attitude | null
  status: string | null
  image: string | null
  notes: string
  related: string[]
  details: CodexDetails
  addedBy: string | null
  createdAt: string
  updatedAt: string
}

/** One entry changed by someone else (Realtime), already mapped to app types. */
export type CodexChange =
  | { type: 'upsert'; row: CodexEntry; inserted: boolean }
  | { type: 'delete'; id: string }
