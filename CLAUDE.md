# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What it is

**ARCANA** — web app for keeping a **D&D 2024** character sheet. The design goal is not
the sheet itself but **navigating it like a video-game menu** (declared reference:
Persona 5): tilted cards, a diagonal red wipe between screens, synthesized menu blips and
keyboard navigation.

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
Strength × 15 lb.).

## Commands

```bash
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # tsc -b (strict typecheck) + vite build  ← the only quality gate
npm run preview    # serves the dist/ build
npm run typecheck  # types only

node scripts/generate-seed.mjs     # regenerates supabase/seed.sql from src/data/defaults.ts (uses esbuild, ships with Vite)
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

**Transitions — `useWipe()` (`src/components/fx/Wipe.tsx`).** The red wipe covers, runs
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
- `rules.ts`: static D&D 2024 tables (12 classes with hit die/saves/caster type, 18 skills,
  full-caster and pact spell slot tables, proficiency bonus, plus species, backgrounds,
  alignments, conditions, damage types, weapon masteries, spell schools and languages).
  `findClass(name)` resolves by display name.
- `defaults.ts`: `createCharacter(partial?)` (factory, level 1 Fighter by default) and
  `demoRoster()` (4 example characters with **every section filled in** — attacks, spells,
  gear, features, journal). The demo uses deterministic nested ids (`${slug}-atk-1`) and a
  fixed `DEMO_TIMESTAMP` so `generate-seed.mjs` produces a stable `seed.sql`.

**Derived values — `src/lib/derive.ts`.** Pure functions (`mod`, `pb`, `saveBonus`,
`skillBonus`, `spellSaveDC`, `initiative`, `carryCapacity`…). **Derived values are not
stored**: they are computed at render. Deliberate exception: changing class or level in
`IdentitySection` rewrites `combat.hitDieSize`, `combat.hitDiceTotal` and
`spellcasting.slots`, because afterwards those are fields the player edits by hand.

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

**Styles.** Plain CSS in `src/styles/` (`fonts`, `global`, `screens`, `sheet`), imported in
`src/main.tsx`. The `--accent` custom property is set per character (inline style on the
containers) and tints the whole menu.

## Assets

The portraits in `public/assets/portraits/*.svg` are **provisional emblems generated by
code**, one per class, named after the English class slug (`wizard.svg`, `barbarian.svg`…).
To replace them with real illustrations: style guide and prompts in
`docs/ASSET_PROMPTS.md`. If the extension changes (`.svg` → `.png`) it has to be updated
in two places: `PORTRAIT_SLUGS` / `portraitForClass()` in `src/data/defaults.ts` and
`PORTRAIT_LIBRARY` in `src/sections/IdentitySection.tsx`. Portrait paths are **relative**
(`assets/portraits/…`, no leading slash).

## Supabase

Database and migrations in `supabase/` (there is no Supabase CLI project: no
`supabase/config.toml`). Full guide: `docs/SUPABASE.md`.

- **`supabase/migrations/0001_init.sql`** — table `public.characters` (`id uuid pk`,
  `owner_id` → `auth.users`, `name text`, `data jsonb`, timestamps), indexes, trigger
  `touch_updated_at`, and **RLS**: any `authenticated` user can read/create/edit/delete
  *any* sheet (a party where everyone trusts each other); `anon` has no policy. At the end,
  commented out, the strict per-owner policies. The file also drops the older Spanish
  policy names so it stays re-runnable on databases created before the rename.
- **`supabase/seed.sql`** — the example party with fixed UUID ids, `on conflict do nothing`.
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
2. Run `0001_init.sql` (and optionally `seed.sql`) in the SQL Editor.
3. Authentication → Email provider enabled; decide on "Confirm email"; add
   `http://localhost:5173` to the Redirect URLs for the magic link.
4. Once the table's players all have accounts, turn off "Allow new users to sign up".

## Next steps (README)

Real portraits (guide in `docs/ASSET_PROMPTS.md`) · upload them to Supabase Storage
instead of the `jsonb` · real time so the DM sees Hit Points live · import a sheet from JSON.
