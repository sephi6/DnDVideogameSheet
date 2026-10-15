# Quest log — design (spec 3 of the Azeroth roadmap)

Status: approved in conversation on 2026-10-15; visual direction approved on the
Claude Design canvas "ARCANA" (https://claude.ai/artifact/46ZgC7zAjTDd6h8BSNHjqT).
Design system: "ARCANA — Azeroth" (https://claude.ai/artifact/DibgNNtqNANaz5JC85im4H).
Builds on spec 1 (`2026-10-13-azeroth-reskin-design.md`), whose skin and tokens it uses.

## 1. Intent

The table wants a Warcraft-style **quest log kept like a diary**: what the party and
each character are pursuing, who gave it, where, what is left to do and what it pays.
It is a shared record — the DM and every player write in it — and it updates live
on every screen at the table.

Success:

- A player opens section 8 of a sheet and sees that character's quests, ticks an
  objective, and every other screen at the table shows the tick within a second.
- Anyone can create a quest for the whole party or for one character; other characters
  can join a personal quest, so a quest can belong to any subset of the party.
- While playing any other section, the character's tracked objectives stay in view.
- It works in local mode (no Supabase), without the live part.

## 2. Decisions taken (with the partner)

| # | Decision |
|---|---|
| D1 | Quests are **their own entity**, not part of a sheet. Scope **group** (every character of the table, including ones created later) or **personal** (the characters that joined it). |
| D2 | **Everyone can create, edit and delete** quests, as with sheets. No roles; the DM is just another signed-in user. |
| D3 | A personal quest is created with its creator's character joined. Others see it under **Available** and can **join** or **leave**. The last one leaving does not delete it. |
| D4 | Fields: title, description, given by, where, **recommended level**, objectives (tick or counter), rewards (coins, XP, items as text), status `active` / `completed` / `failed`. |
| D5 | **Progress is shared**: an objective's counter is the same for everyone on the quest. |
| D6 | **Rewards are for show.** Completing a quest never writes to a sheet. |
| D7 | The log is **section 8 of the sheet** (key `8`), plus a **tracker** visible in the other sections. |
| D8 | **Live sync** through Supabase Realtime; every change writes one small row, so two people editing the same quest never overwrite each other. |
| D9 | Storage approach **A**: three tables (`quests`, `quest_objectives`, `quest_participants`). |

## 3. Data model

### 3.1 SQL — `supabase/migrations/0002_quests.sql`

```sql
create table public.quests (
  id                uuid primary key default gen_random_uuid(),
  scope             text not null check (scope in ('group', 'personal')),
  status            text not null default 'active' check (status in ('active', 'completed', 'failed')),
  title             text not null default 'New quest',
  description       text not null default '',
  giver             text not null default '',
  location          text not null default '',
  recommended_level int  check (recommended_level between 1 and 20),
  reward_coins      jsonb not null default '{"pp":0,"gp":0,"ep":0,"sp":0,"cp":0}',
  reward_xp         int  not null default 0 check (reward_xp >= 0),
  reward_items      text[] not null default '{}',
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.quest_objectives (
  id         uuid primary key default gen_random_uuid(),
  quest_id   uuid not null references public.quests (id) on delete cascade,
  position   int  not null default 0,
  text       text not null default '',
  target     int  not null default 1 check (target between 1 and 999),
  progress   int  not null default 0 check (progress >= 0),
  updated_at timestamptz not null default now()
);

create table public.quest_participants (
  quest_id     uuid not null references public.quests (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  joined       boolean not null default true,
  tracked      boolean not null default true,
  updated_at   timestamptz not null default now(),
  primary key (quest_id, character_id)
);
```

- Indexes on `quest_objectives (quest_id)` and `quest_participants (character_id)`.
- `touch_updated_at` triggers on all three (the function exists from 0001).
- RLS on all three with the same four policies as `characters`: `authenticated` may
  select / insert / update / delete everything; `anon` nothing.
- `alter publication supabase_realtime add table public.quests, public.quest_objectives, public.quest_participants;`
  and `replica identity full` on the three, so deletes arrive with their row.
- Re-runnable like 0001 (`if not exists`, `drop policy if exists`, publication add
  guarded by a `do $$ … $$` block).

`progress` may exceed `target` only transiently; the app clamps to `0..target`.
An objective is **done** when `progress >= target`; a target of 1 renders as a tick
box, more as a counter.

Participant rows for a **group** quest never decide membership (everyone is on it);
they only carry that character's `tracked = false` when someone untracks it. For a
**personal** quest, `joined = true` means the character is on it; leaving deletes the
row.

### 3.2 TypeScript — `src/types/quest.ts`

`Quest`, `QuestObjective`, `QuestParticipant` mirror the three tables with camelCase
fields (`recommendedLevel: number | null`, `rewardCoins` with the same shape as
`Character['inventory']['coins']` — `{ pp, gp, ep, sp, cp }` —, `rewardItems: string[]`). `Character` is **not** changed:
no `SCHEMA_VERSION` bump.

### 3.3 Pure rules — `src/lib/quests.ts`

- `isOnQuest(quest, participants, characterId)` — group, or a joined row.
- `isTracked(quest, participants, characterId)` — on the quest, active, and no row
  with `tracked = false`.
- `questProgress(objectives)` → `{ done, total }`.
- `difficulty(recommendedLevel, characterLevel)` → `'trivial' | 'easy' | 'normal' | 'hard' | 'deadly'`:
  diff = quest − character; ≤ −3 trivial, −2..−1 easy, 0..+1 normal, +2..+3 hard,
  ≥ +4 deadly; no recommended level → normal. Shown as colour **and** word.
- `clampProgress(n, target)`.

## 4. Storage — `src/lib/questStorage.ts`

A `QuestStorage` interface of small operations, mirroring `storage.ts`, chosen by
`isSupabaseConfigured`:

```ts
interface QuestStorage {
  name: 'local' | 'supabase'
  loadAll(): Promise<QuestSnapshot>          // { quests, objectives, participants }
  upsertQuest(q: Quest): Promise<void>
  deleteQuest(id: string): Promise<void>
  upsertObjective(o: QuestObjective): Promise<void>
  deleteObjective(id: string): Promise<void>
  upsertParticipant(p: QuestParticipant): Promise<void>
  deleteParticipant(questId: string, characterId: string): Promise<void>
  subscribe(onChange: (change: QuestChange) => void): () => void  // local: no-op
}
```

- **Local**: one key `arcana:quests:v1` holding the snapshot; each operation reads,
  changes and writes it. `subscribe` returns a no-op.
- **Supabase**: each operation is one `upsert`/`delete` on one row. `subscribe` opens
  one channel with `postgres_changes` on the three tables and maps each payload to a
  `QuestChange` (`{ table, type: 'upsert' | 'delete', row }`).
- Ids are client-generated UUIDs (`newId()`), so an optimistic row and its echo from
  Realtime share an id.

## 5. State — `src/store/quests.ts` (zustand)

- State: `quests`, `objectives`, `participants` (flat arrays), `loaded`, `sync`,
  `syncError`.
- `hydrate()` (guarded against double runs like the roster) loads the snapshot, then
  subscribes; `reset()` unsubscribes and clears. `App` calls them alongside the
  roster's.
- Every action changes local state **first**, then writes:
  - text fields of a quest or objective: debounced 500 ms, one timer per row;
  - ticks, counters, join / leave / track, status, create, delete: immediately.
- Failed writes keep the row id in a `failed` set; **Retry** rewrites those rows from
  current state (same pattern as the roster). The sheet header's sync indicator shows
  the worse of roster and quests.
- Realtime changes are merged by id: upserts replace the row unless that row has a
  pending local write (its timer is running), deletes remove it. A change that echoes
  our own write is harmless (same content).
- On reconnect after a dropped channel, `hydrate` reloads the snapshot.
- Deleting a character removes its participant rows locally (the database cascades).
- Demo data: when the roster seeds the example party (local, or cloud first run),
  the quest store seeds a few example quests over those characters — at least one
  group quest with a counter objective and one personal quest joined by two
  characters — with fixed ids, so `generate-seed.mjs` can add them to `seed.sql`.

## 6. Interface

Follows the approved canvas. Real app classes from spec 1; the new rules go to
`src/styles/quests.css`, imported in `src/main.tsx` after `sheet.css`.

### 6.1 Section 8 — `src/sections/QuestsSection.tsx`

- Added to `SECTIONS` in `SheetScreen.tsx` as `{ id: 'quests', label: 'Quests', glyph: '❢' }`;
  keyboard `/^[1-8]$/`, `HintBar` `1-8`.
- **Tabs**: Active (quests the character is on, status active) · Available (active
  personal quests it has not joined) · Finished (completed or failed ones it was on),
  each with its count.
- **List** (left, 330 px on desktop): groups *Party* and *Personal*; each row = level
  badge coloured by `difficulty` (word in its `title`), title, location and progress
  line, track square. Selecting a row shows its page.
- **Quest page** (right, parchment): kicker (scope · level · difficulty word), title,
  given by / where / recommended level, description, objectives (tick box, or −/+ and
  `n / target` with a bar), rewards, who is on it (portrait + name + class), actions:
  Tracked chip, Failed, Edit, Complete — on Available: Join; on a joined personal
  quest: Leave; on Finished: Reopen and Delete.
- **Editor** (`QuestEditor`): the same section in edit mode for New quest and Edit:
  scope (Party / Personal — the current character), title, given by, where,
  recommended level, description, objective rows (text + target, add / remove /
  reorder by position), rewards (five coins, XP, items one per line). Save / Cancel.
  Delete asks for confirmation inline (no browser dialog).
- Empty states with one line each ("No active quests. Create one with + New quest.").
- Keyboard: `T` tracks / untracks the selected quest (filtered by `isTyping`);
  ↑/↓ inside the list move the selection only while the list has focus.

### 6.2 Tracker — `src/components/quests/QuestTracker.tsx`

- Shown on every section **except** Quests, when the character tracks at least one
  active quest.
- Desktop ≥ 1024 px: a third grid column (`tracker`, 248 px) beside the body: per
  quest its level, title and unfinished objectives with counters, done ones struck
  through; "Open quest log ▸" jumps to section 8.
- Below 1024 px: a single collapsible card above the bottom strip (phone) or under
  the head (tablet) showing the first tracked quest, "1 of N", expanding to all.
- Read-only: ticking happens in the log.

## 7. Errors and edge cases

- Realtime unavailable (`subscribe` fails): the log still works; the sync indicator
  shows the error and Retry rehydrates.
- A quest deleted elsewhere while open: the page falls back to the list's first quest
  (or the empty state).
- A character deleted: its rows cascade; group quests are unaffected.
- Objective target lowered below progress: progress is clamped.
- Text is stored as typed; nothing is translated or migrated.

## 8. Verification

There are no tests in this project (`CLAUDE.md`); the gate is `npm run build`.
Additionally:

- a node + esbuild script over `src/lib/quests.ts` asserting the difficulty bands,
  `isOnQuest` / `isTracked` for group, personal-joined, personal-not-joined and
  untracked cases, and progress clamping;
- the SQL file applied to the user's project (by the partner in the SQL editor);
- a browser pass in cloud mode with two tabs signed in: tick, count, join and edit
  in one, see it in the other within a second; local mode pass without Realtime;
  phone and tablet widths for the log and the tracker.

## 9. Out of scope

Applying rewards to sheets, DM-only permissions, notifications, quest chains,
per-party separation (all characters in the database are one table), sharing quests
between databases, map pins.

## 10. Files

| File | Change |
|---|---|
| `supabase/migrations/0002_quests.sql` | new |
| `supabase/seed.sql`, `scripts/generate-seed.mjs` | add demo quests |
| `src/types/quest.ts` | new |
| `src/lib/quests.ts` | new — pure rules |
| `src/lib/questStorage.ts` | new — local + Supabase adapters |
| `src/store/quests.ts` | new — state, writes, Realtime merge |
| `src/data/defaults.ts` | `demoQuests()` |
| `src/App.tsx` | hydrate / reset the quest store with the roster |
| `src/screens/SheetScreen.tsx` | section 8, keys 1–8, tracker column / card, combined sync |
| `src/sections/QuestsSection.tsx` | new |
| `src/components/quests/*` | `QuestList`, `QuestPage`, `QuestEditor`, `QuestTracker` |
| `src/styles/quests.css`, `src/main.tsx` | new stylesheet, imported |
| `src/styles/responsive.css` | tracker step-downs, section-8 strip |
| `CLAUDE.md`, `README.md` | document quests, eight sections |
