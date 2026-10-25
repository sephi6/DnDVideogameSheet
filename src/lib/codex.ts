import { DAMAGE_TYPES } from '@/data/rules'
import type { Attitude, CodexDetails, CodexEntry, CodexKind } from '@/types/codex'

/** Everything the UI needs to know about a kind, so no component branches on kind by hand. */
export interface KindInfo {
  kind: CodexKind
  /** Tab label. */
  label: string
  /** Kicker on the page ("NPC", "Place"…). */
  title: string
  /** In "+ New …" and empty states. */
  singular: string
  shape: 'portrait' | 'landscape'
  subtitleLabel: string
  hasAttitude: boolean
  statuses: readonly string[]
  /** Statuses that send the entry to the end of the wall, greyed. */
  settled: readonly string[]
}

export const KINDS: readonly KindInfo[] = [
  { kind: 'npc', label: 'NPCs', title: 'NPC', singular: 'NPC', shape: 'portrait', subtitleLabel: 'Role', hasAttitude: true, statuses: ['Alive', 'Deceased', 'Unknown'], settled: ['Deceased'] },
  { kind: 'place', label: 'Places', title: 'Place', singular: 'place', shape: 'landscape', subtitleLabel: 'Description', hasAttitude: true, statuses: [], settled: [] },
  { kind: 'faction', label: 'Factions', title: 'Faction', singular: 'faction', shape: 'portrait', subtitleLabel: 'Motto', hasAttitude: true, statuses: [], settled: [] },
  { kind: 'creature', label: 'Bestiary', title: 'Creature', singular: 'creature', shape: 'portrait', subtitleLabel: 'Description', hasAttitude: true, statuses: ['Encountered', 'Defeated'], settled: ['Defeated'] },
  { kind: 'lore', label: 'Items & lore', title: 'Lore', singular: 'entry', shape: 'portrait', subtitleLabel: 'Description', hasAttitude: false, statuses: ['Open', 'Solved'], settled: ['Solved'] },
]

export function kindInfo(kind: CodexKind): KindInfo {
  const info = KINDS.find((k) => k.kind === kind)
  if (!info) throw new Error(`Unknown codex kind: ${kind}`)
  return info
}

export const ATTITUDES: readonly Attitude[] = ['ally', 'neutral', 'hostile', 'unknown']
export const ATTITUDE_LABEL: Record<Attitude, string> = { ally: 'Ally', neutral: 'Neutral', hostile: 'Hostile', unknown: 'Unknown' }
export const PLACE_TYPES = ['City', 'Village', 'Dungeon', 'Region', 'Landmark', 'Building']
export const LORE_TYPES = ['Item', 'Legend', 'Clue', 'Mystery']

/** The Journal menu: the five shared kinds, then the sheet's private Background. */
export type CodexTab = CodexKind | 'background'
export const TAB_ORDER: readonly CodexTab[] = ['npc', 'place', 'faction', 'creature', 'lore', 'background']

export function stepTab(tab: CodexTab, by: -1 | 1): CodexTab {
  const i = TAB_ORDER.indexOf(tab)
  return TAB_ORDER[(i + by + TAB_ORDER.length) % TAB_ORDER.length]
}

/** A blank entry; the store gives it an id on save. */
export function newEntry(kind: CodexKind, addedBy: string | null, now: string): CodexEntry {
  const info = kindInfo(kind)
  return {
    id: '', kind, name: '', subtitle: '',
    attitude: info.hasAttitude ? 'unknown' : null,
    status: info.statuses[0] ?? null,
    image: null, notes: '', related: [], details: {}, addedBy,
    createdAt: now, updatedAt: now,
  }
}

export function isSettled(entry: CodexEntry): boolean {
  return entry.status !== null && kindInfo(entry.kind).settled.includes(entry.status)
}

/** Lower case, no accents, trimmed: "Aldrén " and "ALDREN" compare equal. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

const byName = (a: CodexEntry, b: CodexEntry) => fold(a.name).localeCompare(fold(b.name))

/** The wall of one tab: kind, search over name / subtitle / notes, attitude; settled last, then by name. */
export function entriesForTab(entries: CodexEntry[], kind: CodexKind, query = '', attitude: Attitude | null = null): CodexEntry[] {
  const q = fold(query)
  return entries
    .filter((e) => e.kind === kind)
    .filter((e) => !attitude || e.attitude === attitude)
    .filter((e) => !q || fold(`${e.name}\n${e.subtitle}\n${e.notes}`).includes(q))
    .sort((a, b) => Number(isSettled(a)) - Number(isSettled(b)) || byName(a, b))
}

/** Entries that link to `id` ("Mentioned in"), by name. */
export function backlinks(entries: CodexEntry[], id: string): CodexEntry[] {
  return entries.filter((e) => e.id !== id && e.related.includes(id)).sort(byName)
}

/** The existing entries for `ids`, in order, once each; deleted ones are skipped. */
export function resolveRelated(entries: CodexEntry[], ids: string[]): CodexEntry[] {
  const seen = new Set<string>()
  const out: CodexEntry[] = []
  for (const id of ids) {
    const entry = entries.find((e) => e.id === id)
    if (entry && !seen.has(id)) {
      seen.add(id)
      out.push(entry)
    }
  }
  return out
}

/** What is stored on save: existing ids only, never itself, once each. */
export function cleanRelated(entries: CodexEntry[], ids: string[], selfId: string): string[] {
  return resolveRelated(entries, ids).map((e) => e.id).filter((id) => id !== selfId)
}

/** Related-entry picker: name matches across every kind; an empty query lists nothing. */
export function searchEntries(entries: CodexEntry[], query: string, excludeIds: string[], limit = 6): CodexEntry[] {
  const q = fold(query)
  if (!q) return []
  return entries
    .filter((e) => !excludeIds.includes(e.id) && fold(e.name).includes(q))
    .sort(byName)
    .slice(0, limit)
}

const DETAIL_KEYS: Record<CodexKind, (keyof CodexDetails)[]> = {
  npc: ['metAt'],
  place: ['placeType', 'firstVisited'],
  faction: ['goal'],
  creature: ['creatureType', 'vulnerabilities', 'resistances', 'immunities'],
  lore: ['loreType'],
}
const LIST_KEYS = new Set<keyof CodexDetails>(['vulnerabilities', 'resistances', 'immunities'])

/** Keeps the kind's keys only: strings trimmed and non-empty, damage lists valid and unique. */
export function sanitizeDetails(kind: CodexKind, details: CodexDetails): CodexDetails {
  const out: Record<string, string | string[]> = {}
  for (const key of DETAIL_KEYS[kind]) {
    const value = details[key]
    if (value === undefined) continue
    if (LIST_KEYS.has(key)) {
      const list = [...new Set((value as string[]).filter((t) => DAMAGE_TYPES.includes(t)))]
      if (list.length > 0) out[key] = list
    } else if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim()
    }
  }
  return out as CodexDetails
}

const FACT_LABELS: Partial<Record<keyof CodexDetails, string>> = {
  metAt: 'Met at', placeType: 'Type', firstVisited: 'First visited', goal: 'Known goal',
  creatureType: 'Creature type', loreType: 'Type',
}

/** Label / value rows for the page: the subtitle, then the kind's text details. Empty ones are skipped. */
export function entryFacts(entry: CodexEntry): [string, string][] {
  const rows: [string, string][] = []
  if (entry.subtitle.trim()) rows.push([kindInfo(entry.kind).subtitleLabel, entry.subtitle.trim()])
  for (const key of DETAIL_KEYS[entry.kind]) {
    const label = FACT_LABELS[key]
    const value = entry.details[key]
    if (label && typeof value === 'string' && value.trim()) rows.push([label, value.trim()])
  }
  return rows
}

export type ImageSource = 'none' | 'data' | 'asset' | 'storage'

/** Where an entry's image comes from, by prefix. Anything unrecognised counts as none. */
export function imageSource(image: string | null): ImageSource {
  if (!image) return 'none'
  if (image.startsWith('data:image/')) return 'data'
  if (image.startsWith('assets/')) return 'asset'
  if (image.startsWith('codex/')) return 'storage'
  return 'none'
}

/**
 * Storage images an editor session leaves unused: the initial image if it was
 * replaced, and every upload except the one kept. Never the final image.
 */
export function imagesToDiscard(initial: string | null, final: string | null, uploaded: string[]): string[] {
  const out: string[] = []
  for (const image of [initial, ...uploaded]) {
    if (image && image !== final && imageSource(image) === 'storage' && !out.includes(image)) out.push(image)
  }
  return out
}

/** Next selected id along the wall; clamps at both ends; an unknown current selects the first. */
export function moveSelection(ids: string[], current: string | null, by: -1 | 1): string | null {
  if (ids.length === 0) return null
  const i = current ? ids.indexOf(current) : -1
  if (i < 0) return ids[0]
  return ids[Math.max(0, Math.min(ids.length - 1, i + by))]
}
