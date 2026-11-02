import { create } from 'zustand'
import { demoCodex, newId } from '@/data/defaults'
import { cleanRelated, sanitizeDetails } from '@/lib/codex'
import { discardImages } from '@/lib/codexImages'
import { codexStorage } from '@/lib/codexStorage'
import { readableError } from '@/lib/supabase'
import type { SyncStatus } from '@/store/roster'
import type { Character } from '@/types/character'
import type { CodexChange, CodexEntry } from '@/types/codex'

interface CodexState {
  entries: CodexEntry[]
  loaded: boolean
  sync: SyncStatus
  syncError: string | null
  failedCount: number
  /** Entries that arrived live from another player and this viewer has not opened yet. */
  fresh: string[]
  hydrate: () => Promise<void>
  reset: () => void
  /**
   * Writes the whole entry (last Save wins); returns its id, new or existing.
   * `discardAfter` are Storage images this Save replaced or never kept: they are
   * deleted only once the write has landed and the entry no longer uses them.
   */
  saveEntry: (entry: CodexEntry, discardAfter?: string[]) => string
  deleteEntry: (id: string) => void
  /** A deleted character: the database already set `added_by` to null, so mirror it locally. */
  forgetCharacter: (characterId: string) => void
  markSeen: (id: string) => void
  seedDemo: (roster: Character[]) => Promise<void>
  retryFailed: () => Promise<void>
}

type Set_ = (partial: Partial<CodexState> | ((s: CodexState) => Partial<CodexState>)) => void
type Get_ = () => CodexState

/** Writes per entry run one after another, so the last Save is the last write. */
const chains = new Map<string, Promise<void>>()
/** Entries with a write queued or in flight. */
const inflight = new Map<string, number>()
/** Entries whose last write failed; Retry rewrites them from current state. */
const failed = new Set<string>()
/** Entries that got a foreign change while busy: one reload once they settle. */
const stashed = new Set<string>()
/** Bumped on every write start / end and applied change: a load that began earlier must not overwrite that entry. */
const seqs = new Map<string, number>()
const touch = (id: string) => seqs.set(id, (seqs.get(id) ?? 0) + 1)
/** Entries created on this screen: their Realtime INSERT echo is not a discovery. */
const mine = new Set<string>()
/** Images to discard from Storage per entry, only once that entry's write (a delete, or a Save that replaced them) has landed. */
const pendingImages = new Map<string, string[]>()
/** Bumped by reset(): work started in an older session must not touch the new one. */
let epoch = 0
let unsubscribe: (() => void) | null = null
let hydration: Promise<void> | null = null
let wasDown = false
let hydrateFailed = false
let loading = 0
let reloadAfterLoad = false
let reloadTimer: ReturnType<typeof setTimeout> | null = null

const DOWN_MESSAGE = 'Live codex updates are disconnected. Retry reconnects.'
const FRESH_KEY = 'arcana:codex-fresh'

function readFresh(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FRESH_KEY) ?? '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeFresh(ids: string[]) {
  try {
    localStorage.setItem(FRESH_KEY, JSON.stringify(ids))
  } catch {
    // Per-viewer nicety only: losing it just drops the "New" gems.
  }
}

function settled(set: Set_) {
  if (failed.size > 0) set({ sync: 'error', failedCount: failed.size })
  else if (wasDown) set({ sync: 'error', syncError: DOWN_MESSAGE, failedCount: 0 })
  else set({ sync: 'saved', syncError: null, failedCount: 0 })
}

function queueDiscard(id: string, images: string[]) {
  pendingImages.set(id, [...new Set([...(pendingImages.get(id) ?? []), ...images])])
}

function write(id: string, set: Set_, get: Get_) {
  const at = epoch
  touch(id)
  inflight.set(id, (inflight.get(id) ?? 0) + 1)
  set({ sync: 'saving', syncError: null })
  const next: Promise<void> = (chains.get(id) ?? Promise.resolve())
    .then(() => {
      if (at !== epoch) return
      const entry = get().entries.find((e) => e.id === id)
      return entry ? codexStorage.upsertEntry(entry) : codexStorage.deleteEntry(id)
    })
    .then(() => {
      if (at !== epoch) return
      failed.delete(id)
      const pending = pendingImages.get(id)
      if (pending?.length) {
        pendingImages.delete(id)
        // Re-saved meanwhile (by us or another player): the row lives on and still needs the image it uses now.
        const kept = get().entries.find((e) => e.id === id)?.image
        discardImages(pending.filter((image) => image !== kept))
      }
      settled(set)
    })
    .catch((err) => {
      if (at !== epoch) return
      failed.add(id)
      console.error('[arcana] failed to save a codex entry', id, err)
      set({ sync: 'error', syncError: readableError(err), failedCount: failed.size })
    })
    .finally(() => {
      if (at !== epoch) return
      touch(id)
      const left = (inflight.get(id) ?? 1) - 1
      if (left <= 0) inflight.delete(id)
      else inflight.set(id, left)
      if (chains.get(id) === next) chains.delete(id)
      // A foreign change landed mid-write: ask the database which one it kept.
      if (left <= 0 && !failed.has(id) && stashed.delete(id)) scheduleReload(set)
      if (loading > 0) reloadAfterLoad = true
    })
  chains.set(id, next)
}

function scheduleReload(set: Set_) {
  if (reloadTimer) return
  const at = epoch
  reloadTimer = setTimeout(() => {
    reloadTimer = null
    if (at !== epoch) return
    void load(set, useCodex.getState).catch((err) => console.error('[arcana] could not reload the codex', err))
  }, 0)
}

/** A partial UPDATE (TOASTed columns omitted) keeps the local value of those fields. */
function merge(old: CodexEntry, row: CodexEntry): CodexEntry {
  const defined = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined))
  return { ...old, ...defined } as CodexEntry
}

function applyChange(c: CodexChange, set: Set_, get: Get_) {
  const id = c.type === 'upsert' ? c.row.id : c.id
  if ((inflight.get(id) ?? 0) > 0 || failed.has(id)) {
    stashed.add(id)
    return
  }
  if (c.type === 'delete') {
    touch(id)
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id), fresh: s.fresh.filter((f) => f !== id) }))
    return
  }
  const old = get().entries.find((e) => e.id === id)
  if (!old && Object.values(c.row).some((v) => v === undefined)) {
    scheduleReload(set) // half a row for an entry we do not have: ask for the whole thing
    return
  }
  touch(id)
  const isDiscovery = c.inserted && !old && !mine.has(id)
  set((s) => {
    const fresh = isDiscovery ? [...s.fresh, id] : s.fresh
    if (isDiscovery) writeFresh(fresh)
    return { entries: [...s.entries.filter((e) => e.id !== id), old ? merge(old, c.row) : c.row], fresh }
  })
}

async function load(set: Set_, get: Get_) {
  const at = epoch
  const since = new Map(seqs)
  loading++
  try {
    const incoming = await codexStorage.loadAll()
    if (at !== epoch) return
    const busy = (id: string) =>
      (inflight.get(id) ?? 0) > 0 || failed.has(id) || (seqs.get(id) ?? 0) !== (since.get(id) ?? 0)
    for (const id of [...stashed]) if (!busy(id)) stashed.delete(id)
    const entries = [...incoming.filter((e) => !busy(e.id)), ...get().entries.filter((e) => busy(e.id))]
    const known = new Set(entries.map((e) => e.id))
    set((s) => ({ entries, loaded: true, fresh: s.fresh.filter((id) => known.has(id)) }))
  } finally {
    if (at === epoch) {
      loading--
      if (loading === 0 && reloadAfterLoad) {
        reloadAfterLoad = false
        scheduleReload(set)
      }
    }
  }
}

export const useCodex = create<CodexState>((set, get) => ({
  entries: [],
  loaded: false,
  sync: 'idle',
  syncError: null,
  failedCount: 0,
  fresh: [],

  hydrate() {
    hydration ??= (async () => {
      const at = epoch
      set({ fresh: readFresh() })
      try {
        // Subscribe first, then read: a change committed between the two is not lost.
        unsubscribe?.()
        unsubscribe = codexStorage.subscribe(
          (c) => {
            if (at === epoch) applyChange(c, set, get)
          },
          (status) => {
            if (at !== epoch) return
            if (status === 'down') {
              wasDown = true
              set({ sync: 'error', syncError: DOWN_MESSAGE })
            } else if (wasDown) {
              wasDown = false
              void load(set, get)
                .then(() => { if (at === epoch) settled(set) })
                .catch((err) => { if (at === epoch) set({ sync: 'error', syncError: readableError(err) }) })
            }
          },
        )
        await load(set, get)
        if (at !== epoch) return
        const recovered = hydrateFailed
        hydrateFailed = false
        if (recovered) settled(set) // a retried first load clears the old error
      } catch (err) {
        if (at !== epoch) return
        hydrateFailed = true
        console.error('[arcana] could not read the codex', err)
        set({ loaded: true, sync: 'error', syncError: readableError(err) })
      } finally {
        if (at === epoch) hydration = null
      }
    })()
    return hydration
  },

  reset() {
    epoch++
    unsubscribe?.()
    unsubscribe = null
    hydration = null
    chains.clear()
    inflight.clear()
    failed.clear()
    stashed.clear()
    seqs.clear()
    mine.clear()
    pendingImages.clear()
    wasDown = false
    hydrateFailed = false
    loading = 0
    reloadAfterLoad = false
    if (reloadTimer) clearTimeout(reloadTimer)
    reloadTimer = null
    set({ entries: [], loaded: false, sync: 'idle', syncError: null, failedCount: 0, fresh: [] })
  },

  saveEntry(entry, discardAfter = []) {
    const id = entry.id || newId()
    const now = new Date().toISOString()
    const current = get().entries.find((e) => e.id === id)
    if (!current) mine.add(id)
    const stored: CodexEntry = {
      ...entry,
      id,
      // Not editable, and the draft's value may name a character deleted since it opened.
      addedBy: current ? current.addedBy : entry.addedBy,
      related: cleanRelated(get().entries, entry.related, id),
      details: sanitizeDetails(entry.kind, entry.details),
      createdAt: current?.createdAt ?? (entry.createdAt || now),
      updatedAt: now,
    }
    set((s) => ({ entries: [...s.entries.filter((e) => e.id !== id), stored] }))
    if (discardAfter.length > 0) queueDiscard(id, discardAfter)
    write(id, set, get)
    return id
  },

  deleteEntry(id) {
    const gone = get().entries.find((e) => e.id === id)
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id), fresh: s.fresh.filter((f) => f !== id) }))
    if (gone?.image) queueDiscard(id, [gone.image])
    write(id, set, get)
  },

  forgetCharacter(characterId) {
    set((s) => ({
      entries: s.entries.map((e) => (e.addedBy === characterId ? { ...e, addedBy: null } : e)),
    }))
  },

  markSeen(id) {
    if (!get().fresh.includes(id)) return
    const fresh = get().fresh.filter((f) => f !== id)
    writeFresh(fresh)
    set({ fresh })
  },

  async seedDemo(roster) {
    const at = epoch
    await get().hydrate() // so "empty" is judged after the load
    if (at !== epoch || hydrateFailed || get().entries.length > 0) return
    const demo = demoCodex(roster)
    for (const e of demo) mine.add(e.id)
    set((s) => ({ entries: [...s.entries, ...demo], loaded: true }))
    for (const e of demo) write(e.id, set, get)
    await Promise.all(demo.map((e) => chains.get(e.id) ?? Promise.resolve()))
  },

  async retryFailed() {
    if (wasDown || hydrateFailed || !get().loaded) await get().hydrate()
    for (const id of [...failed]) write(id, set, get)
  },
}))
