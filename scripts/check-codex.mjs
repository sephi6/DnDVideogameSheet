/**
 * Assertions over the pure codex rules (src/lib/codex.ts) and the demo codex.
 * The project has no test runner; this bundles the modules with esbuild (ships
 * with Vite) and runs them.
 *
 *   node scripts/check-codex.mjs
 */
import { build } from 'esbuild'
import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
async function load(entry) {
  const out = await build({
    entryPoints: [resolve(root, entry)],
    bundle: true, write: false, format: 'esm', platform: 'neutral',
    alias: { '@': resolve(root, 'src') },
  })
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`)
}
const c = await load('src/lib/codex.ts')
const NOW = '2026-01-01T00:00:00.000Z'

// newEntry defaults per kind
const npc = c.newEntry('npc', 'char-a', NOW)
assert.equal(npc.id, '')
assert.equal(npc.attitude, 'unknown')
assert.equal(npc.status, 'Alive')
assert.equal(npc.addedBy, 'char-a')
assert.deepEqual(npc.related, [])
assert.equal(c.newEntry('place', null, NOW).status, null)
assert.equal(c.newEntry('lore', null, NOW).attitude, null)
assert.equal(c.newEntry('lore', null, NOW).status, 'Open')
assert.equal(c.newEntry('creature', null, NOW).status, 'Encountered')

// tabs cycle through the five kinds and Background
assert.equal(c.stepTab('npc', 1), 'place')
assert.equal(c.stepTab('npc', -1), 'background')
assert.equal(c.stepTab('background', 1), 'npc')

// fixtures
const e = (id, kind, name, extra = {}) => ({ ...c.newEntry(kind, null, NOW), id, name, ...extra })
const entries = [
  e('n1', 'npc', 'Aldren the Grey', { status: 'Unknown', attitude: 'unknown', related: ['p1', 'gone'] }),
  e('n2', 'npc', 'Sister Odila', { attitude: 'ally', subtitle: 'Healer', related: ['p1'] }),
  e('n3', 'npc', 'baron Vire', { status: 'Deceased', attitude: 'hostile' }),
  e('n4', 'npc', 'Corwen', { attitude: 'ally', notes: 'Knows about the grimoire' }),
  e('p1', 'place', 'Greenwater', { related: ['n2'] }),
]

// accents and case are ignored when searching
assert.equal(c.fold('  Aldrén  '), 'aldren')
assert.deepEqual(c.entriesForTab(entries, 'npc', 'ALDREN').map((x) => x.id), ['n1'])
assert.deepEqual(c.entriesForTab(entries, 'npc', 'aldrén').map((x) => x.id), ['n1'])
// subtitle and notes are searched too
assert.deepEqual(c.entriesForTab(entries, 'npc', 'healer').map((x) => x.id), ['n2'])
assert.deepEqual(c.entriesForTab(entries, 'npc', 'grimoire').map((x) => x.id), ['n4'])
// sorted by name, settled (Deceased) last, case-insensitive
assert.deepEqual(c.entriesForTab(entries, 'npc').map((x) => x.id), ['n1', 'n4', 'n2', 'n3'])
// attitude filter
assert.deepEqual(c.entriesForTab(entries, 'npc', '', 'ally').map((x) => x.id), ['n4', 'n2'])
assert.deepEqual(c.entriesForTab(entries, 'place').map((x) => x.id), ['p1'])

// settled
assert.equal(c.isSettled(entries[2]), true)
assert.equal(c.isSettled(entries[0]), false)
assert.equal(c.isSettled(e('x', 'lore', 'Clue', { status: 'Solved' })), true)

// links: dangling ids are skipped, backlinks exclude self
assert.deepEqual(c.resolveRelated(entries, ['p1', 'gone', 'p1']).map((x) => x.id), ['p1'])
assert.deepEqual(c.backlinks(entries, 'p1').map((x) => x.id), ['n1', 'n2'])
assert.deepEqual(c.backlinks(entries, 'n3'), [])
assert.deepEqual(c.cleanRelated(entries, ['p1', 'gone', 'n1', 'p1'], 'n1'), ['p1'])

// related search: empty query lists nothing; excludes self and already linked
assert.deepEqual(c.searchEntries(entries, '', []), [])
assert.deepEqual(c.searchEntries(entries, 'e', ['n1', 'p1']).map((x) => x.id), ['n3', 'n4', 'n2'])
assert.equal(c.searchEntries(entries, 'e', [], 2).length, 2)

// details keep only the kind's keys, trimmed, and valid unique damage types
assert.deepEqual(
  c.sanitizeDetails('creature', { creatureType: ' Beast ', resistances: ['Fire', 'Fire', 'Banana'], metAt: 'x', immunities: [] }),
  { creatureType: 'Beast', resistances: ['Fire'] },
)
assert.deepEqual(c.sanitizeDetails('npc', { metAt: '  ', goal: 'x' }), {})
assert.deepEqual(c.sanitizeDetails('place', { placeType: 'City', firstVisited: 'Session 2' }), { placeType: 'City', firstVisited: 'Session 2' })

// facts shown on the page, in order, empty ones skipped
assert.deepEqual(
  c.entryFacts(e('f', 'place', 'Mistport', { subtitle: 'Harbour city', details: { placeType: 'City', firstVisited: '' } })),
  [['Description', 'Harbour city'], ['Type', 'City']],
)
assert.deepEqual(c.entryFacts(e('g', 'npc', 'Hale', { subtitle: '', details: { metAt: 'Mistport gate' } })), [['Met at', 'Mistport gate']])

// image sources
assert.equal(c.imageSource(null), 'none')
assert.equal(c.imageSource(''), 'none')
assert.equal(c.imageSource('data:image/webp;base64,AAA'), 'data')
assert.equal(c.imageSource('assets/codex/npc-odila.webp'), 'asset')
assert.equal(c.imageSource('codex/1234.webp'), 'storage')
assert.equal(c.imageSource('https://example.com/x.png'), 'none')

// which Storage images to delete
assert.deepEqual(c.imagesToDiscard('codex/a.webp', 'codex/b.webp', ['codex/b.webp']), ['codex/a.webp'])          // replaced
assert.deepEqual(c.imagesToDiscard('codex/a.webp', 'codex/a.webp', ['codex/b.webp', 'codex/c.webp']), ['codex/b.webp', 'codex/c.webp']) // cancelled
assert.deepEqual(c.imagesToDiscard('codex/a.webp', 'assets/codex/x.webp', []), ['codex/a.webp'])                  // gallery pick
assert.deepEqual(c.imagesToDiscard('data:image/webp;base64,A', null, ['data:image/webp;base64,B']), [])          // local: nothing to delete
assert.deepEqual(c.imagesToDiscard(null, 'codex/b.webp', ['codex/a.webp', 'codex/b.webp']), ['codex/a.webp'])    // two uploads, kept last

// selection moves and clamps
assert.equal(c.moveSelection([], null, 1), null)
assert.equal(c.moveSelection(['a', 'b', 'c'], null, 1), 'a')
assert.equal(c.moveSelection(['a', 'b', 'c'], 'gone', -1), 'a')
assert.equal(c.moveSelection(['a', 'b', 'c'], 'a', 1), 'b')
assert.equal(c.moveSelection(['a', 'b', 'c'], 'c', 1), 'c')
assert.equal(c.moveSelection(['a', 'b', 'c'], 'a', -1), 'a')

console.log('check-codex: all assertions passed')
