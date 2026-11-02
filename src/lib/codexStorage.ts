import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { newId } from '@/data/defaults'
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase'
import type { CodexChange, CodexEntry } from '@/types/codex'

/**
 * Codex persistence: one row per entry, written whole on Save. Local mode keeps
 * every entry under one key and has no live updates.
 */
export interface CodexStorage {
  readonly name: 'local' | 'supabase'
  loadAll(): Promise<CodexEntry[]>
  upsertEntry(entry: CodexEntry): Promise<void>
  deleteEntry(id: string): Promise<void>
  subscribe(onChange: (c: CodexChange) => void, onStatus: (s: 'live' | 'down') => void): () => void
}

// ── localStorage ────────────────────────────────────────────────────────────

const KEY = 'arcana:codex:v1'

function readLocal(): CodexEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown
    return Array.isArray(parsed) ? (parsed as CodexEntry[]) : []
  } catch {
    return []
  }
}

/** Throws on a full quota: the store marks the entry failed and offers Retry. */
function writeLocal(entries: CodexEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export const localCodexStorage: CodexStorage = {
  name: 'local',
  async loadAll() {
    return readLocal()
  },
  async upsertEntry(entry) {
    writeLocal([...readLocal().filter((e) => e.id !== entry.id), entry])
  },
  async deleteEntry(id) {
    writeLocal(readLocal().filter((e) => e.id !== id))
  },
  subscribe() {
    return () => {}
  },
}

// ── Supabase ────────────────────────────────────────────────────────────────

interface CodexRow {
  id: string
  kind: CodexEntry['kind']
  name: string
  subtitle: string
  attitude: CodexEntry['attitude']
  status: string | null
  image: string | null
  notes: string
  related: string[]
  details: CodexEntry['details']
  added_by: string | null
  created_at: string
  updated_at?: string
}

/**
 * A Realtime UPDATE may omit unchanged TOASTed columns (long notes, details):
 * those stay undefined so the store keeps its local value.
 */
const fromRow = (r: CodexRow): CodexEntry => ({
  id: r.id, kind: r.kind, name: r.name, subtitle: r.subtitle, attitude: r.attitude,
  status: r.status, image: r.image, notes: r.notes, related: r.related,
  details: r.details, addedBy: r.added_by, createdAt: r.created_at,
  updatedAt: r.updated_at ?? r.created_at,
})

/** created_by and updated_at are left out: the column default and the trigger fill them. */
const toRow = (e: CodexEntry): CodexRow => ({
  id: e.id, kind: e.kind, name: e.name, subtitle: e.subtitle, attitude: e.attitude,
  status: e.status, image: e.image, notes: e.notes, related: e.related,
  details: e.details, added_by: e.addedBy, created_at: e.createdAt,
})

type Payload = RealtimePostgresChangesPayload<CodexRow & Record<string, unknown>>

export const supabaseCodexStorage: CodexStorage = {
  name: 'supabase',

  async loadAll() {
    const { data, error } = await requireSupabase().from('codex_entries').select('*').order('created_at', { ascending: true })
    if (error) throw error
    return (data as CodexRow[]).map(fromRow)
  },

  async upsertEntry(entry) {
    const { error } = await requireSupabase().from('codex_entries').upsert(toRow(entry), { onConflict: 'id' })
    if (error) throw error
  },

  async deleteEntry(id) {
    const { error } = await requireSupabase().from('codex_entries').delete().eq('id', id)
    if (error) throw error
  },

  subscribe(rawOnChange, rawOnStatus) {
    const client = requireSupabase()
    // Cleared on unsubscribe so late events (e.g. CLOSED) never reach the caller.
    let active = true
    const onChange: typeof rawOnChange = (c) => { if (active) rawOnChange(c) }
    const onStatus: typeof rawOnStatus = (s) => { if (active) rawOnStatus(s) }
    const channel = client
      .channel(`arcana-codex-${newId()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'codex_entries' }, (p: Payload) => {
        if (p.eventType === 'DELETE') onChange({ type: 'delete', id: (p.old as CodexRow).id })
        else onChange({ type: 'upsert', row: fromRow(p.new as CodexRow), inserted: p.eventType === 'INSERT' })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') onStatus('live')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStatus('down')
      })
    return () => {
      active = false
      void client.removeChannel(channel)
    }
  },
}

export const codexStorage: CodexStorage = isSupabaseConfigured ? supabaseCodexStorage : localCodexStorage
