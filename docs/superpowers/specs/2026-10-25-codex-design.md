# Codex — design (the Journal becomes a shared, illustrated codex)

Status: approved in conversation on 2026-10-25. Visual direction: variant **B · Collection**
of `docs/superpowers/mockups/2026-10-25-codex.html` (open it through the dev server:
`http://localhost:5173/docs/superpowers/mockups/2026-10-25-codex.html`; it links the real
stylesheets). Builds on the Azeroth skin and follows the quest log's patterns
(`2026-10-15-quest-log-design.md`).

## 1. Intent

The player wants the Journal (section 7) to be a **menu for tracking what the party
discovers in the campaign**: the people they meet, the places they visit, the factions,
the creatures they fight and the items, legends and clues they come across. It has to be
**very visual**: every entry carries an image, uploaded from the app or picked from
a gallery of illustrations the partner adds to the repo (generated with ChatGPT / Codex).

Success:

- Mid-session, a player opens section 7 and answers "who was this, and where did we meet
  them?" with a glance at a wall of portraits and one click.
- An NPC added by one player appears on every other screen at the table, with its image.
- Entries link to each other (an NPC → the city they live in → the faction that rules it),
  and the links are navigable both ways.
- The existing roleplay fields of the sheet stay available and untouched.
- It works in local mode (no Supabase), without the live part.

## 2. Decisions taken (with the partner)

| # | Decision |
|---|---|
| D1 | The codex is **shared by the group**, like quests: its own table, live through Realtime. No private entries, no per-player notes on an entry. |
| D2 | Categories: **NPCs, Places, Factions, Bestiary, Items & lore**. No session diary. |
| D3 | The current Journal fields (personality, ideals, bonds, flaws, allies, backstory, session notes) stay as they are in a **Background** tab of the Journal menu. Private to the sheet, unchanged data (`character.journal`), no migration. |
| D4 | **Light links**: each entry has a list of related entries of any category, shown as chips with a thumbnail; incoming links are shown as "Mentioned in". |
| D5 | Images come from **both** uploads in the app (Supabase Storage in the cloud, data-url locally) **and** a gallery of repo assets in `public/assets/codex/`. |
| D6 | Layout **B · Collection**: a wall of gold-framed cards; selecting one slides a parchment page in from the right. |
| D7 | **One table** for the five kinds, kind-specific fields in a `details` jsonb, links as a `uuid[]` on the entry. |
| D8 | Storage bucket `codex` is **public-read**; only `authenticated` users upload or delete. |
| D9 | The editor **writes on Save** (one row). Concurrent edits of the same entry: last write wins. |
| D10 | Everyone can create, edit and delete any entry. No roles. |

## 3. Data model

### 3.1 SQL — `supabase/migrations/0003_codex.sql`

```sql
create table if not exists public.codex_entries (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('npc', 'place', 'faction', 'creature', 'lore')),
  name        text not null default '',
  subtitle    text not null default '',
  attitude    text check (attitude in ('ally', 'neutral', 'hostile', 'unknown')),
  status      text,
  image       text,
  notes       text not null default '',
  related     uuid[] not null default '{}',
  details     jsonb not null default '{}',
  added_by    uuid references public.characters (id) on delete set null,
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists codex_entries_kind_idx on public.codex_entries (kind);
```

- `updated_at` trigger reusing `touch_updated_at` from `0001`.
- RLS: the same open-to-`authenticated` select / insert / update / delete policies as
  `0002`, dropped and recreated so the file is re-runnable.
- `replica identity full` and `alter publication supabase_realtime add table` (guarded so
  re-running does not fail when the table is already in the publication).
- **Storage**: `insert into storage.buckets (id, name, public) values ('codex', 'codex', true)
  on conflict (id) do nothing;` plus policies on `storage.objects` for `authenticated`
  insert / update / delete where `bucket_id = 'codex'` (reads are public through the
  bucket flag). Dropped and recreated like the table policies.
- Run order: `0001` → `0002` → `0003` → `seed.sql`.
- `status` is not constrained in SQL: its allowed values depend on `kind` and are
  enforced by the client (`src/lib/codex.ts`).

### 3.2 TypeScript — `src/types/codex.ts`

```ts
export type CodexKind = 'npc' | 'place' | 'faction' | 'creature' | 'lore'
export type Attitude = 'ally' | 'neutral' | 'hostile' | 'unknown'

export interface CodexDetails {
  metAt?: string            // npc
  placeType?: string        // place: City | Village | Dungeon | Region | Landmark | Building
  firstVisited?: string     // place
  goal?: string             // faction
  creatureType?: string     // creature: 2024 PHB creature types
  vulnerabilities?: string[]// creature: DAMAGE_TYPES
  resistances?: string[]    // creature
  immunities?: string[]     // creature
  loreType?: string         // lore: Item | Legend | Clue | Mystery
}

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
```

`created_by` is never sent by the client (as with quests).

### 3.3 Per-kind configuration and pure rules — `src/lib/codex.ts`

A `KINDS` table drives the UI so no component branches on kind by hand:

| Kind | Tab label | Card shape | Subtitle label | Attitude | Status values | Detail fields |
|---|---|---|---|---|---|---|
| `npc` | NPCs | portrait 5:7 | Role | yes | Alive · Deceased · Unknown | Met at |
| `place` | Places | landscape 16:9 | Description | yes | — | Place type, First visited |
| `faction` | Factions | portrait 5:7 | Motto | yes | — | Known goal |
| `creature` | Bestiary | portrait 5:7 | Description | yes | Encountered · Defeated | Creature type, vulnerabilities, resistances, immunities |
| `lore` | Items & lore | portrait 5:7 | Description | no | Open · Solved | Lore type |

Pure functions (no React, no storage), covered by `scripts/check-codex.mjs`:

- `newEntry(kind, addedBy)` — defaults per kind (attitude `unknown` where applicable,
  first status value, empty details).
- `entriesForTab(entries, kind, query, attitude)` — filter by kind; `query` matches name,
  subtitle and notes, case- and accent-insensitive; `attitude` filter optional. Sorted by
  name, with "settled" entries (Deceased, Defeated, Solved) after the rest.
- `backlinks(entries, id)` — entries whose `related` contains `id`.
- `resolveRelated(entries, ids)` — the existing entries for `ids`, in order, dropping ids
  that no longer exist (deleted entries leave dangling ids; they are ignored, never shown).
- `isSettled(entry)`.
- `CREATURE_TYPES` (2024 PHB: Aberration, Beast, Celestial, Construct, Dragon, Elemental,
  Fey, Fiend, Giant, Humanoid, Monstrosity, Ooze, Plant, Undead) lives in `rules.ts`
  next to `DAMAGE_TYPES`.

## 4. Images

### 4.1 The `image` field

One string, three origins, told apart by prefix. `imageUrl(image)` in
`src/lib/codexImages.ts` turns it into a `src`:

| Stored value | Origin | `src` |
|---|---|---|
| `data:image/…` | upload in local mode | as is |
| `assets/codex/…` | repo gallery | as is (relative, like portraits) |
| `codex/<uuid>.webp` | upload in the cloud | `supabase.storage.from('codex').getPublicUrl(...)` |
| `null` | none | the kind's default emblem `assets/codex/default-<kind>.svg` |

### 4.2 Upload

- `downscaleImage()` (`src/lib/image.ts`) gains an optional size profile: **portrait**
  1000×1400 (today's behaviour, the default) and **landscape** 1600×900 for places.
  It already outputs WebP with a JPEG fallback.
- Cloud: the downscaled image is uploaded to `codex/<new uuid>.webp` before the entry
  is saved; the editor shows the new image at once from the local blob.
- Local: the data-url is stored on the entry.
- Replacing or removing the image, or deleting the entry, **best-effort deletes** the old
  Storage object (only for `codex/` values). A failure is logged and ignored: an orphan
  file is harmless.
- Rejected before processing: files that are not images, or larger than 20 MB.

### 4.3 Repo gallery

- Images go to `public/assets/codex/` and are listed in `src/data/codexGallery.ts`:
  `{ path: 'assets/codex/….webp', kind: CodexKind, label: string }[]`. Adding an image is
  "drop the file, add one line".
- The editor's **Gallery** button shows the images of the entry's kind in a grid of
  framed thumbnails; picking one sets `image` to its path.
- `docs/ASSET_PROMPTS.md` gets a Codex section: size and aspect per kind (portrait 5:7
  at 1000×1400, landscape 16:9 at 1600×900), WebP, and the house style for prompts.

### 4.4 Default emblems

`scripts/generate-assets.mjs` also writes `public/assets/codex/default-<kind>.svg` for the
five kinds (a figure, a tower, a banner, a claw, a scroll), in the style of the existing
class emblems. They are what the demo shows until real art exists.

## 5. Storage — `src/lib/codexStorage.ts`

Same shape as `questStorage.ts`:

```ts
interface CodexStorage {
  loadAll(): Promise<CodexEntry[]>
  upsertEntry(entry: CodexEntry): Promise<void>
  deleteEntry(id: string): Promise<void>
  subscribe(onChange: (change: CodexChange) => void, onReconnect: () => void): () => void
}
```

- `localCodexStorage`: one snapshot under `arcana:codex:v1`; `subscribe` is a no-op.
- `supabaseCodexStorage`: maps camelCase ↔ snake_case, never sends `created_by`;
  `postgres_changes` on `codex_entries`.
- `export const codexStorage` picks like `storage` and `questStorage`.

## 6. State — `src/store/codex.ts` (zustand)

A reduced version of `src/store/quests.ts` (one row type, whole-row writes):

- `entries`, `loaded`, `failed: Set<string>`, `hydrate()` (guarded against double
  execution), `reset()` (bumps an epoch so late work from a previous session is dropped).
- `saveEntry(entry)` / `deleteEntry(id)`: optimistic, then a **serial write per entry id**
  (promise chain per id), so the last Save is the last write.
- **Realtime echoes**: changes to an id with a write queued or in flight are ignored, and
  the store does one coalesced authoritative reload once that id settles if a foreign
  change was stashed meanwhile. Foreign changes to idle ids are applied directly.
  An authoritative reload also runs after a Realtime reconnect.
- Failed writes go to `failed`; `retryFailed()` rewrites them from current state.
- `App.tsx` calls `codex.hydrate()` / `codex.reset()` next to the quest store's.
- Seeding: `seedDemo(roster)` mirrors the quest store's — it hydrates first and writes
  `demoCodex(roster)` only if the codex is empty. `roster.ts` calls it right after
  `useQuests.getState().seedDemo(demo)`, so it follows the same local /
  cloud-first-time rule as the sheets.

## 7. Interface

### 7.1 Section 7 — `src/sections/JournalSection.tsx`

The section becomes the codex shell; the current field grid moves unchanged to
`src/components/codex/BackgroundTab.tsx`.

- **Category tabs** (one row, wrapping): NPCs, Places, Factions, Bestiary, Items & lore,
  each with a line icon and the entry count; then **Background**, pushed to the right with
  a dashed frame and the title "Only on this sheet". The chosen tab is remembered per
  viewer in `localStorage` (`arcana:codex-tab`, wrapped in try/catch).
- **Toolbar**: search field, attitude filter (kinds that have one), and **+ New NPC** /
  **+ New place** / … (primary button). When writes have failed, the toolbar shows
  "Couldn't save N entries" with a **Retry** button (`retryFailed()`).
- **Collection wall** (`CodexGrid`): `repeat(auto-fill, minmax(150px, 1fr))` of portrait
  cards; places use `minmax(260px, 1fr)` landscape cards. Each card: the image in the
  three-tone gold band frame, a dark fade at the foot, the name in Cinzel gold-hi on it,
  and the **attitude seal** (a gem in the attitude colour plus the word, never colour
  alone: Ally `--rarity-uncommon`, Neutral `--gold-hi`, Hostile `--danger`,
  Unknown `--rarity-poor`). Deceased / Defeated: grayscale image and a corner ribbon with
  the word. The wall ends with a **+ New …** card. `loading="lazy"` on every image;
  portraits are cropped with `object-position: 50% 20%` so faces survive.
- **Selected card** rises 4px with an accent ring.
- **Empty states**: "No NPCs yet. Add the first one with + New NPC." (per kind); no
  results for a search: "Nothing matches "…"."

### 7.2 Entry page — `src/components/codex/CodexPage.tsx`

Opened by clicking a card or pressing Enter: a scrim over the wall and the **parchment
page** (`.quest-page` styling) sliding in from the right, width `min(640px, 70%)`.

- Layout: framed image (5:7 beside the text; places get a full-width 21:8 band on top),
  kicker (attitude seal, kind, status), name, a facts list from `KINDS` (subtitle, detail
  fields, "Added by <character>"), notes (pre-line), **Related** chips and
  **Mentioned in** chips (thumbnail + name + kind). Creatures show their damage chips in
  three rows (vulnerable / resistant / immune).
- Clicking a chip **navigates**: switches the category tab if needed and opens that entry.
- **Edit** button (top right) turns the page into the editor in place.
- If the open entry is deleted by someone else, the page closes and the wall stays.

### 7.3 Editor — `src/components/codex/CodexEditor.tsx`

Same rules as `QuestEditor`: a local draft, written on **Save**, discarded on **Cancel**.

- Fields: name, subtitle, attitude, status (from `KINDS`), the kind's detail fields
  (damage types as `Chip` toggles), notes, **Related** (a search box over every entry of
  every kind, results as chips to add; current links as removable chips), and the image
  block: preview, **Upload**, **Gallery**, **Remove**.
- **Delete** (danger button) asks for confirmation inline (the button turns into
  "Delete for everyone? / Keep"), never a browser dialog.
- Upload errors show inline under the image and do not block saving the rest.
- While the editor is open, a window **capture** listener makes Escape cancel and stops the
  section-navigation keys, exactly like `QuestEditor`.

### 7.4 Keyboard

Up/Down, W/S, Q/E and 1–8 stay the sheet's section navigation. In the codex:

| Key | Action |
|---|---|
| ← / → (A / D) | move the selection along the wall; with the page open, show the previous / next entry |
| Enter | open the selected entry |
| Esc | close the page (capture listener, so it does not leave the sheet); with no page open it keeps meaning "back to the party" |
| [ / ] | previous / next category tab |

All filtered with `isTyping()`. Menu cues: `confirm` on open, `back` on close, `toggle`
on moving the selection; controls play their own.

### 7.5 Responsive and motion

- Phone (≤ 599px): the wall is two columns (`minmax(140px, 1fr)`), places one column; the
  page covers the whole section body and gets a **◂ Back** button in its header.
- Tablet: as desktop, page width `min(640px, 85%)`.
- The page slides 220ms; with `prefers-reduced-motion` it appears without sliding. No
  entrance animation on the cards beyond the existing section transition.
- The quest tracker column / card keeps working beside the Journal as today.

### 7.6 Visual direction — a vivid, modern game menu

Built with the frontend-design skill on top of the Azeroth tokens (no new hex values; any
new colour is a `color-mix` of existing tokens). The codex should feel like opening a
collection journal in a modern game, not a form-filled database. Boldness is spent in
**one place — the cards** — and everything around them stays quiet.

- **The card is the hero.** Three-tone gold band frame, the art bleeding to the frame,
  name plate set in Cinzel over a dark foot fade, attitude gem with a soft glow.
- **Selection is an event**: the selected / focused card rises, gains the accent ring and
  a single **gold glint** sweeps across its frame once (a masked gradient, 450ms). The
  same treatment for mouse hover (pointer devices only) and keyboard focus, so both
  input methods get the same feedback.
- **The page unfurls**: the parchment page slides in with a short ease-out and the image
  settles from 1.04 to 1 scale; closing reverses it faster. One orchestrated moment, no
  staggered card entrances.
- **New discoveries**: an entry that arrives live from another player (Realtime insert)
  plays the glint once and wears a small "New" gem until this viewer opens it (seen ids
  kept per viewer in `localStorage`, try/catch).
- **Settled entries** (Deceased, Defeated, Solved) recede: grayscale art, a ribbon with
  the word, sorted last.
- Every motion is disabled under `prefers-reduced-motion` (state changes still show
  through ring, colour and the ribbon words).
- Before each UI task the frontend-design skill is loaded, and the result is
  screenshot-reviewed at desktop, iPad and phone sizes (section 10).

### 7.7 Input methods — keyboard, mouse and touch

Every action is reachable with each input method alone. No gamepad support (out of scope).

- **Mouse / touch**: everything is a real `<button>` / field; touch targets ≥ `--touch`
  (44px); hover effects only under `(hover: hover)`.
- **Keyboard**: the bindings of 7.4. Cards are buttons in DOM order with a **roving
  tabindex** (the selected card is the tab stop; arrows move focus *and* selection
  together), so Tab reaches tabs → toolbar → wall → page in a sensible order. Focus is
  always visible (`:focus-visible` gold-hi ring plus the card's selection treatment).
  Opening the page moves focus to its heading; closing it returns focus to the card.
  The editor traps focus while open (Tab cycles inside it).

### 7.8 Forms and text — legible on every device

- Inputs, selects and textareas render at **≥ 16px** on every breakpoint (iOS zooms
  into smaller fields), with labels always visible above the field (no placeholder-only
  labels) and parchment-on-stone contrast ≥ 4.5:1.
- **Editor layout**: two columns (image + fields) from 1024px wide; one column below,
  image first. The **Save / Cancel / Delete** bar is sticky at the bottom of the editor so
  it stays reachable with the on-screen keyboard open (`dvh`-based heights, no `vh`).
- Notes textarea: min 6 rows, grows with its content (`field-sizing: content` where
  supported, otherwise `resize: vertical`).
- Damage-type and status toggles are `Chip`s at ≥ 44px tall on touch.
- The related-entry search lists results as full-width rows with thumbnail and kind
  (not a dropdown), navigable with the arrow keys, Enter to add.
- Reading the page: body text 17px EB Garamond, line length ≤ 70ch, line-height 1.6.

### 7.9 Art pipeline — Codex step (like the character portraits)

The same workflow used for the class portraits (`docs/ASSET_PROMPTS.md` +
`tmp/process_generated_assets.py`), as a self-contained brief that can be handed to
Codex:

- **`docs/CODEX_ASSETS.md`** — the brief for Codex: the style bible of `ASSET_PROMPTS.md`
  section 1 adapted per kind (NPC / faction / creature / lore: 5:7 portrait, bottom third
  dark for the name plate; place: 16:9 landscape, horizon in the upper half), one
  ready-to-paste prompt per demo entry and per kind's generic placeholder, the file
  names to produce in `tmp/imagegen_raw/codex/<slug>.png`, and the exact commands to run
  afterwards.
- **`scripts/process-codex-assets.py`** — generalises the existing processing script:
  centre-crops each raw image to its kind's ratio, resizes (1000×1400 or 1600×900),
  writes WebP under 300 KB to `public/assets/codex/<slug>.webp`.
- After processing, the brief tells Codex to add one line per image to
  `src/data/codexGallery.ts` and to set the matching demo entries' `image` in
  `demoCodex()`, then run `node scripts/generate-seed.mjs` and `npm run build`.
- Implementation ships with the SVG emblems only; the generated art is a separate,
  optional step the partner runs in Codex when ready.

## 8. Demo data

`demoCodex(roster)` in `src/data/defaults.ts`, deterministic ids, about ten entries
across the five kinds, linked to each other, images `null` (they show the default
emblems), `addedBy` set to demo characters. Emitted into `supabase/seed.sql` by
`scripts/generate-seed.mjs` (needs `0003`).

## 9. Errors and edge cases

- Save fails → the entry stays in the store, its id goes to `failed`, the toolbar offers
  Retry; reloading the page before retrying loses the change (same as quests).
- Storage upload fails → inline error in the editor; the entry keeps its previous image.
- An entry links to a deleted entry → the dangling id is skipped when rendering and
  dropped the next time that entry is saved.
- A character referenced by `addedBy` is deleted → `on delete set null`; the page shows
  no "Added by" line.
- Two people save the same entry → last write wins (D9); the other screen updates live.
- Local mode → no Realtime, no Storage; uploads are data-urls in the snapshot.
- Very large data-urls in local mode → bounded by the downscale (≈ 150–400 KB each);
  the existing `localStorage` quota error handling of the roster applies.

## 10. Verification

- `npm run build` (strict typecheck) passes.
- `node scripts/check-codex.mjs`: assertions over `src/lib/codex.ts` — filters, search
  (accents, case), sorting with settled entries last, backlinks, dangling related ids,
  `newEntry` defaults per kind. `scripts/check-quests.mjs` still passes.
- `node scripts/generate-seed.mjs` produces a stable `seed.sql` (run twice, no diff).
- Manual, in the browser, local mode: create / edit / delete one entry of each kind,
  upload an image, pick one from the gallery, link two entries and follow the link both
  ways.
- **Viewport matrix** (screenshot-reviewed with the browser resized to each size): desktop
  1440×900 · **iPad portrait 820×1180 and 768×1024 · iPad landscape 1180×820 and
  1366×1024** · phone 390×844. At each one: wall, open page, editor with the notes field
  focused. Pass criteria: no horizontal scroll, every control ≥ 44px on touch sizes,
  fields ≥ 16px, the Save bar visible, the quest tracker not covering the page.
- **Input matrix**: the full create → link → navigate → edit → delete path done once
  with the mouse only and once with the keyboard only (focus always visible, never lost
  behind the scrim).
- Manual, cloud mode with two browser sessions: an entry created in one appears in the
  other with its image; Storage object deleted when the image is replaced.

## 11. Out of scope

Gamepad support · private entries or per-player notes on an entry · a session diary · a map · image
cropping / focal-point UI · roles and permissions · importing from other tools ·
moving sheet portraits to Storage (still a README next step).

## 12. Files

New:
- `supabase/migrations/0003_codex.sql`
- `src/types/codex.ts`, `src/lib/codex.ts`, `src/lib/codexImages.ts`,
  `src/lib/codexStorage.ts`, `src/store/codex.ts`, `src/data/codexGallery.ts`
- `src/components/codex/` — `CodexGrid.tsx`, `CodexCard.tsx`, `CodexPage.tsx`,
  `CodexEditor.tsx`, `BackgroundTab.tsx`, `GalleryPicker.tsx`
- `src/styles/codex.css` (imported in `main.tsx`)
- `public/assets/codex/default-*.svg` (generated)
- `scripts/check-codex.mjs`
- `docs/CODEX_ASSETS.md`, `scripts/process-codex-assets.py`

Changed:
- `src/sections/JournalSection.tsx` (codex shell), `src/App.tsx` (hydrate / reset),
  `src/store/roster.ts` (calls the codex `seedDemo`),
  `src/lib/image.ts` (size profile), `src/data/rules.ts` (`CREATURE_TYPES`),
  `src/data/defaults.ts` (`demoCodex`), `scripts/generate-seed.mjs`,
  `scripts/generate-assets.mjs`, `docs/SUPABASE.md`, `docs/ASSET_PROMPTS.md`,
  `CLAUDE.md` (architecture notes for the codex)
