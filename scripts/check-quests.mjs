/**
 * Assertions over the pure quest rules (src/lib/quests.ts). The project has no
 * test runner; this bundles the module with esbuild (ships with Vite) and runs it.
 *
 *   node scripts/check-quests.mjs
 */
import { build } from 'esbuild'
import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = await build({
  entryPoints: [resolve(root, 'src/lib/quests.ts')],
  bundle: true, write: false, format: 'esm', platform: 'neutral',
  alias: { '@': resolve(root, 'src') },
})
const q = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`)

// difficulty bands: quest level − character level
assert.equal(q.difficulty(null, 5), 'normal')
assert.equal(q.difficulty(1, 4), 'trivial')   // −3
assert.equal(q.difficulty(2, 4), 'easy')      // −2
assert.equal(q.difficulty(3, 4), 'easy')      // −1
assert.equal(q.difficulty(4, 4), 'normal')    //  0
assert.equal(q.difficulty(5, 4), 'normal')    // +1
assert.equal(q.difficulty(6, 4), 'hard')      // +2
assert.equal(q.difficulty(7, 4), 'hard')      // +3
assert.equal(q.difficulty(8, 4), 'deadly')    // +4

const base = q.newQuest('group', '2026-01-01T00:00:00Z')
const group = { ...base, id: 'g' }
const personal = { ...base, id: 'p', scope: 'personal' }
const A = 'char-a', B = 'char-b'
const parts = [
  { questId: 'p', characterId: A, joined: true, tracked: true },
  { questId: 'g', characterId: B, joined: true, tracked: false },
]

// membership
assert.equal(q.isOnQuest(group, parts, A), true)       // group: everyone
assert.equal(q.isOnQuest(personal, parts, A), true)    // joined
assert.equal(q.isOnQuest(personal, parts, B), false)   // not joined

// tracking
assert.equal(q.isTracked(group, parts, A), true)       // no row → tracked
assert.equal(q.isTracked(group, parts, B), false)      // untracked row
assert.equal(q.isTracked(personal, parts, B), false)   // not on it
assert.equal(q.isTracked({ ...group, status: 'completed' }, parts, A), false)

// tabs
const all = [group, personal, { ...personal, id: 'done', status: 'failed' }]
const doneParts = [...parts, { questId: 'done', characterId: B, joined: true, tracked: true }]
assert.deepEqual(q.questsForTab(all, doneParts, A, 'active').map((x) => x.id), ['g', 'p'])
assert.deepEqual(q.questsForTab(all, doneParts, B, 'available').map((x) => x.id), ['p'])
assert.deepEqual(q.questsForTab(all, doneParts, B, 'finished').map((x) => x.id), ['done'])

// members
const roster = [{ id: A }, { id: B }]
assert.deepEqual(q.memberIds(group, parts, roster), [A, B])
assert.deepEqual(q.memberIds(personal, parts, roster), [A])

// progress
assert.equal(q.clampProgress(5, 3), 3)
assert.equal(q.clampProgress(-2, 3), 0)
assert.equal(q.clampProgress(2.6, 3), 3)
const objs = [
  { ...q.newObjective('g', 1), id: 'o2', target: 3, progress: 3 },
  { ...q.newObjective('g', 0), id: 'o1', target: 1, progress: 0 },
]
assert.deepEqual(q.objectivesOf(objs, 'g').map((o) => o.id), ['o1', 'o2'])
assert.deepEqual(q.questProgress(objs), { done: 1, total: 2 })

console.log('check-quests: all assertions passed')
