# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What it is

**ARCANA** — web app for keeping a **D&D 2024** character sheet. The design goal is not
the sheet itself but **navigating it like a video-game menu** (declared reference:
World of Warcraft UI): stone panels, three-tone gold, filigree corners, cartouche headers,
a gold sweep between screens, warm synthesized menu cues and keyboard navigation. The
branch `azeroth-reskin` replaced an earlier Persona 5 skin.

**Two modes, decided automatically** (`src/lib/supabase.ts` → `isSupabaseConfigured`):
- **Local** — no `.env.local`. Saves to `localStorage`, no login.
- **Cloud** — with `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (or the old name
  `VITE_SUPABASE_ANON_KEY`) in `.env.local`. Asks for a login and reads/writes to Supabase
  (table `characters`, whole sheet as `jsonb`).

## Language and rules

The whole project is in **English**: UI, comments, domain names (classes are stored under
their display name — `'Wizard'`, `'Barbarian'`), commit messages. Follow that convention
when adding code.

Rules terminology follows the **2024 Player's Handbook**: official class, species,
background, condition, damage type, weapon mastery, spell school and language names, and
**imperial units** (Speed and ranges in feet, weights in pounds, Carrying Capacity =
Strength × 15 lb.). Warcraft classes and species coexist with the PHB ones in the same
lists; the field vocabulary (conditions, damage types, masteries, schools, languages)
stays 2024 PHB.

## Commands

```bash
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # tsc -b (strict typecheck) + vite build  ← the only quality gate
npm run preview    # serves the dist/ build
npm run typecheck  # types only

node scripts/generate-seed.mjs     # regenerates supabase/seed.sql from src/data/defaults.ts (uses esbuild, ships with Vite)
node scripts/check-quests.mjs      # assertions over the pure quest rules (src/lib/quests.ts); no test runner, esbuild bundles it
node scripts/generate-assets.mjs   # regenerates the SVG emblem portraits in public/assets/portraits/
bash scripts/fetch-fonts.sh        # regenerates the self-hosted fonts in public/fonts/
```

There are no tests and no ESLint. `tsc -b` runs in `strict` mode with `noUnusedLocals`
and `noUnusedParameters`, so an unused variable breaks the build.

After a `git pull` that changes `package.json`, **run `npm install`**: `@supabase/supabase-js`
came in with the Supabase integration and without it the typecheck fails.

Import alias: `@/` → `src/` (defined in `vite.config.ts` and `tsconfig.app.json`).

## Architecture

**No router.** `src/App.tsx` is a three-screen state machine
(`'title' | 'select' | 'sheet'`) plus a login gate. `needsLogin` (auth active and no
session) puts `LoginScreen` on top of `select`/`sheet`. `App` calls `hydrate()` when
`authStatus` is `'signed-in'` or `'disabled'`, and `reset()` on sign-out.

**Transitions — `useWipe()` (`src/components/fx/Wipe.tsx`).** The gold sweep covers, runs
the screen change and uncovers. The navigation side effect lives in a `useEffect` (phase
`reveal`), **never inside a `setState` updater**: StrictMode invokes them twice and the
action would be lost. With `prefers-reduced-motion` the wipe is skipped; there is a 1.2 s
failsafe in case the animation never reports back (background tab). Same pattern in the
section menu of `SheetScreen`.

**Party state — `src/store/roster.ts` (zustand).** Single source of truth for the array of
characters. Every mutation goes through `updateCharacter(id, draft => { ... })`: it gets a
mutable `structuredClone`, you edit it freely, the store sets `updatedAt`. Details:
- **Saving per sheet, not per party.** `scheduleSave(id)` with a 500 ms debounce and **one
  timer per character** (`timers: Map`). Editing two sheets does not queue one behind the other.
- **Sync status** `sync: 'idle'|'saving'|'saved'|'error'` + `syncError`, shown by the
  `SheetScreen` header. Ids that fail go into a `failed` `Set` and are retried with
  `retryFailed()`.
- **`hydrate()` is guarded against double execution** (module-level `hydration` promise):
  StrictMode mounted the effect twice and seeded the example party in duplicate.
- **Seeding**: empty database → `demoRoster()`. Always locally; in the cloud only the
  first time (flag `arcana:cloud-seeded` in `localStorage`), so deleted examples do not
  come back.
- `pendingLocalImport` / `importLocalRoster()`: when moving to the cloud, offers to upload
  the sheets left in `localStorage`. `seedDemo()`: manual "load examples" button.

**Persistence — `src/lib/storage.ts`.** `StorageAdapter` interface with **per-sheet**
methods (`load` / `save` / `saveMany` / `remove`) and two implementations: `localAdapter`
(key `arcana:roster:v1`) and `supabaseAdapter`. `export const storage` picks based on
`isSupabaseConfigured`; `usingCloud` is the derived boolean. The screens always talk to
`storage` and do not know which one is active. **The whole `Character` has to be
serializable as-is** (`data` `jsonb` column); `id`, `name` and `owner_id` are denormalized
into columns so SQL can list them. The row `id` wins over whatever comes in the json.

**Legacy migration — `src/lib/migrate.ts`.** Sheets saved by the Spanish version of the
app hold Spanish domain values, metric units and portrait paths whose files were renamed
(`assets/portraits/mago.svg` → `wizard.svg`). `migrateRoster()` is applied by `storage.ts`
on **every read**, in both adapters, so old sheets display correctly straight away; the
migrated version is written back the next time the sheet is edited. It only rewrites the
**enumerated** fields (class, species, background, alignment, conditions, damage types,
weapon masteries, spell schools, languages, portrait) plus the unit conversions (Speed
m → ft., item weights kg → lb.). Schema v3 (the Azeroth reskin) re-tunes a stored
accent only if it still equals the old default class accent; v2 sheets skip the
Spanish/metric step. Free text the player typed —attack and item names,
ranges, notes, journal— is deliberately left alone. `Character.schemaVersion` guards it:
a sheet already at `SCHEMA_VERSION` is returned untouched, so a converted Speed is never
converted twice. **Bump `SCHEMA_VERSION` and extend `migrateCharacter()` whenever a stored
value is renamed or its unit changes.**

**Auth — `src/store/auth.ts` (zustand) + `src/screens/LoginScreen.tsx`.** Email+password,
magic link as an alternative, and sign-out. `init()` reads the stored session and
subscribes to `onAuthStateChange` (returns the unsubscribe function). `status` starts at
`'disabled'` if there is no Supabase. Supabase errors are translated by `readableError()`
(`src/lib/supabase.ts`).

**Supabase client — `src/lib/supabase.ts`.** `supabase` is `null` without credentials;
`requireSupabase()` throws if used unconfigured. `import.meta.env` types in
`src/vite-env.d.ts`.

**Uploaded portraits — `src/lib/image.ts`.** `downscaleImage()` resizes to 1000×1400 and
recompresses to WebP/JPEG before saving: the portrait travels as a data-url inside the
`jsonb` and a multi-megabyte photo would bloat the row and be resent whole on every save.

**Data model — `src/types/character.ts`.** One big flat `Character` interface. No
migrations: the model evolves and the `jsonb` follows. `id` is a **real UUID**
(`newId()` in `defaults.ts`), because it is the table's primary key; `isUuid()` spots old
sheets with `pc_xxx` ids so they can be regenerated when imported to the cloud.

**Rules data — `src/data/`.**
- `rules.ts`: static tables. 25 classes (12 PHB + 13 Warcraft, each with `origin`, hit
  die/saves/caster type; the Warcraft ones are `provisional` until D&D: World of Warcraft
  is published), `SPECIALIZATIONS` per Warcraft class, 22 species objects with `origin`,
  18 skills, full-caster and pact spell slot tables, proficiency bonus, backgrounds,
  alignments, conditions, damage types, weapon masteries, spell schools and languages.
  `findClass(name)` resolves by display name and returns the PHB entry for the five names
  both books share. `resolveClass` in `CharacterSection` infers the book from the stored
  accent (limitation: a hand-picked accent on a shared name resolves to PHB).
- `defaults.ts`: `createCharacter(partial?)` (factory, level 1 Fighter by default) and
  `demoRoster()` (8 example characters, 4 PHB and 4 with Warcraft-only class names, with **every section filled in** — attacks, spells,
  gear, features, journal). The demo uses deterministic nested ids (`${slug}-atk-1`) and a
  fixed `DEMO_TIMESTAMP` so `generate-seed.mjs` produces a stable `seed.sql` (8 fixed ids).

**Derived values — `src/lib/derive.ts`.** Pure functions (`mod`, `pb`, `saveBonus`,
`skillBonus`, `spellSaveDC`, `initiative`, `carryCapacity`…). **Derived values are not
stored**: they are computed at render. Deliberate exception: changing class in
`CharacterSection` writes `identity.accent`, `combat.hitDieSize`, `spellcasting.slots` and
`spellcasting.ability` and swaps the default portrait; changing level writes
`combat.hitDiceTotal` and `spellcasting.slots`. Because afterwards those are fields the player edits by hand.

**Quests — shared, live quest log (section 8 + tracker).** Unlike the sheet, a quest is
not part of any `Character`: it is its own entity in **three tables** (`quests`,
`quest_objectives`, `quest_participants`; types in `src/types/quest.ts`, migration
`0002_quests.sql`). `scope` is `group` (every roster character is on it; a participant row only carries
`tracked`, `joined` is ignored, and the UI offers no Leave) or `personal` (only characters
with a `joined` row are on it). `tracked` says whether that character pins it in the tracker.
`src/lib/quests.ts` holds the pure rules (difficulty band vs. character level, membership,
progress, tab filters) and is covered by `scripts/check-quests.mjs`.
- **`src/lib/questStorage.ts`** — `QuestStorage` with **one-row operations**
  (quest / objective / participant upserts and deletes, `loadAll`) so two people editing
  the same quest do not overwrite each other's fields, plus the Realtime
  `postgres_changes` subscription in the cloud. `localQuestStorage` keeps one snapshot
  under a single key and has no live updates; `questStorage` picks like `storage`.
- **`src/store/quests.ts` (zustand)** — optimistic updates. Writes are **serial per row**
  (a promise chain per row key), so the last click is the last write. Rows with a write
  queued or in flight, and recently sent payloads (each matches exactly one echo), are used to
  **filter Realtime echoes** of our own writes; a foreign change that lands on a busy row
  is stashed, and when the row settles an authoritative reload is scheduled (the stash is
  never applied directly). A per-key write counter keeps rows written while a reload was
  running from being overwritten by it. `reset()` bumps an **epoch** so work from the previous
  session cannot touch the new one. Reloads are **coalesced** and authoritative (also run
  after a Realtime reconnect; `createdAt` is normalized before comparing). Failed rows go into a `failed` set; `retryFailed()`
  rewrites them from current state, **quests before their children** (FK order). Like
  `roster.ts`, `hydrate()` is guarded against double execution. `created_by` defaults to
  `auth.uid()` in SQL and is **never sent by the client**.
- **UI** — `src/sections/QuestsSection.tsx` (tabs Active / Available / Finished, list +
  page, `T` toggles tracking of the selected quest, only on the Active tab, with a quest selected
  and not while editing) and `src/components/quests/`
  (`QuestList`, `QuestPage`, `QuestEditor`, `QuestTracker`). The editor **writes on Save**:
  no live co-editing of text; objective progress, status, join/leave and tracking are the
  live, per-row actions. The tracker is a column beside the section when the viewport is at least
  1024 px wide and more than 500 px tall; otherwise it is a **collapsible sticky card at the
  bottom of the body**. It is not shown on the Quests section itself, and only while
  something is tracked. `↑`/`↓` keep moving between sections.
- Demo data: `demoQuests(roster)` in `defaults.ts` (deterministic ids), also emitted into
  `seed.sql`.

**Sheet sections — `src/sections/`.** Eight components
`({ character, update }: SectionProps) => JSX`. The order, the `1`–`8` keys, the glyphs and
the registry live in the `SECTIONS` array of `src/screens/SheetScreen.tsx` — adding or
reordering a section is done there.

**UI primitives — `src/components/ui/controls.tsx`.** Every form control (`TextField`,
`NumberField`, `SelectField`, `Button`, `CheckBox`, `ProficiencyPip`, `Chip`…). Each
control calls `play(cue)` **on its own**, so the sections do not wire up sound.

**Sound — `src/lib/sfx.ts`.** Menu cues synthesized with WebAudio, zero audio files.
Mute persisted in `arcana:sfx-muted`.

**Keyboard.** Every screen mounts its own `keydown` listener on `window` inside a
`useEffect`. They all filter with `isTyping(e.target)` (`src/lib/keys.ts`) so typing in
fields is not hijacked. There are WASD/QE aliases next to the arrow keys.

**Styles.** Plain CSS in `src/styles/` (`fonts`, `global`, `screens`, `sheet`, `responsive`), imported in
`src/main.tsx`. Tokens live in `global.css`: `--stone*`, `--parchment*`, `--gold` /
`-hi` / `-lo` (`-lo` is never text), `--seat`, `--veil*`, `--danger`, `--bevel`,
`--grain-*`, `--t-*` sizes. No hard-coded hex or old Persona literals. `.bg-fx` (fixed,
global.css) is the stone ground under every screen, so the screen roots paint no
background of their own. The `--accent` custom property is set per character (inline
style on the containers) and tints the whole menu.

**Fonts.** Cinzel (display), EB Garamond (body), Barlow Condensed (data), self-hosted in
`public/fonts/` by `scripts/fetch-fonts.sh`, which also rewrites `src/styles/fonts.css`.

## Assets

`public/assets/portraits/` mixes **.png** (provisional PHB class portraits from the
partner) and **.svg** (emblems generated by `scripts/generate-assets.mjs`, used for the
Warcraft-only classes and the default). The single exported `CLASS_PORTRAITS` map and
`DEFAULT_PORTRAIT` in `src/data/defaults.ts` are the one place to edit; `portraitForClass()`
and `PORTRAIT_LIBRARY` (`CharacterSection`) derive from them. Style guide and prompts for
real illustrations: `docs/ASSET_PROMPTS.md`. `public/assets/ui/` is reserved for future
filigree SVGs. Portrait paths used from JS are **relative** (`assets/portraits/…`, no
leading slash); CSS `url()` needs the leading slash.

## Supabase

Database and migrations in `supabase/` (there is no Supabase CLI project: no
`supabase/config.toml`). Full guide: `docs/SUPABASE.md`.

- **`supabase/migrations/0001_init.sql`** — table `public.characters` (`id uuid pk`,
  `owner_id` → `auth.users`, `name text`, `data jsonb`, timestamps), indexes, trigger
  `touch_updated_at`, and **RLS**: any `authenticated` user can read/create/edit/delete
  *any* sheet (a party where everyone trusts each other); `anon` has no policy. At the end,
  commented out, the strict per-owner policies. The file also drops the older Spanish
  policy names so it stays re-runnable on databases created before the rename.
- **`supabase/migrations/0002_quests.sql`** — `quests`, `quest_objectives`,
  `quest_participants` (FKs to `characters`, cascade deletes), `updated_at` triggers, the
  same open-to-authenticated RLS policies (re-runnable: drops and recreates them),
  `replica identity full` (so Realtime deletes carry the old row) and adds the three
  tables to the `supabase_realtime` publication. Needs `0001` first (reuses
  `touch_updated_at`, references `characters`). `created_by` defaults to `auth.uid()`.
- **`supabase/seed.sql`** — the example party with fixed UUID ids, `on conflict do nothing`.
  Its quest part also needs `0002` (run order: `0001` → `0002` → `seed.sql`).
  **Generated** by `node scripts/generate-seed.mjs` from `src/data/defaults.ts` (esbuild
  bundles the TS and imports it). Do not edit by hand.
- These SQL files are run in the **SQL Editor** of the Supabase dashboard, in order. The
  app also seeds itself the first time (see `roster.ts`).

**Local setup**: copy `.env.example` → `.env.local` with `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` (the *publishable* `sb_publishable_…`, not the
`service_role`). Restart `npm run dev` afterwards. Without that file the app boots in
local mode. The user's project: `dtybrsbjgatjqllsdhhi.supabase.co`.

**What is left to wire it up** (all on the dashboard/environment side, the code is done):
1. `.env.local` with the URL + publishable key.
2. Run `0001_init.sql`, then `0002_quests.sql` (and optionally `seed.sql`) in the SQL Editor.
3. Authentication → Email provider enabled; decide on "Confirm email"; add
   `http://localhost:5173` to the Redirect URLs for the magic link.
4. Once the table's players all have accounts, turn off "Allow new users to sign up".

## Next steps (README)

Real portraits (guide in `docs/ASSET_PROMPTS.md`) · upload them to Supabase Storage
instead of the `jsonb` · real time so the DM sees Hit Points live · import a sheet from JSON.
