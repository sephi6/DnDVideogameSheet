# Azeroth Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ARCANA's Persona 5 skin with a World of Warcraft one and make the 13 Warcraft classes and 16 Warcraft species selectable alongside the 2024 Player's Handbook ones, with no new features and no changes to formulas or the stored model.

**Architecture:** The skin is swapped by rewriting the four stylesheets and the internal markup of `src/components/ui/controls.tsx`, whose 11 exported signatures stay frozen so the sheet sections need no rewrite. The data change is additive: `src/data/rules.ts` grows from 12 to 25 classes and from 10 to 22 species, each tagged with the book it came from. `src/types/character.ts` is not modified, so there is no SQL migration.

**Tech Stack:** React 18 + TypeScript (strict), Vite, zustand, framer-motion, plain CSS in `src/styles/`, Supabase JS. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-13-azeroth-reskin-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Language:** the whole project is in **English** — UI strings, comments, domain values, commit messages.
- **Field vocabulary stays D&D 2024.** `STR`/`DEX`/`CON`/`INT`/`WIS`/`CHA`, Armor Class, Proficiency Bonus. Never rename an ability to a Warcraft name.
- **Imperial units.** Speed and ranges in feet, weights in pounds.
- **No formulas.** `src/lib/derive.ts` is not modified by any task in this plan. No task changes how a bonus, DC or capacity is computed.
- **No model change.** `src/types/character.ts` is not modified by any task. No task adds a field to `Character`.
- **No SQL.** `supabase/migrations/0001_init.sql` is not modified by any task.
- **`controls.tsx` API is frozen.** These 11 exports keep their exact signatures: `Panel`, `TextField`, `NumberField`, `SelectField`, `TextAreaField`, `Button`, `CheckBox`, `ProficiencyPip`, `Chip`, `OverflowMenu`, `HintBar`.
- **Quality gate:** `npm run build` (`tsc -b` strict, with `noUnusedLocals` and `noUnusedParameters`, then `vite build`). There are **no tests in this project and this plan adds none** — the deliverables are CSS, data tables and markup. Do not install a test framework.
- **No new dependencies.** `package.json` is not modified.
- **Import alias:** `@/` → `src/`.
- **Portrait paths are relative** — `assets/portraits/…`, no leading slash.
- **Filigree SVGs use `fill="none" stroke="currentColor"` only.** No hex colours in any file under `public/assets/ui/`.
- **Commit at the end of every task.** End every commit message with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Why there is no test cycle

The skill this plan was written with prescribes a red/green TDD cycle. This project overrides it: `CLAUDE.md` states there are no tests and no ESLint, and that `tsc -b` is the only quality gate. Each task therefore ends with:

1. `npm run build` — must exit 0.
2. The named manual visual checks for that task.
3. A commit.

Treat a non-zero build as a red test: stop and fix before committing.

## File structure

| File | Responsibility after this plan |
|---|---|
| `src/styles/global.css` | Design tokens, document ground, scrollbars, focus ring, ambient background |
| `src/styles/sheet.css` | Sheet shell: header, nav, panels, rows, fields |
| `src/styles/screens.css` | Title, character select, login |
| `src/styles/responsive.css` | Tablet and phone step-downs of the above |
| `src/styles/fonts.css` | `@font-face` for Cinzel, EB Garamond, Barlow Condensed |
| `src/components/ui/controls.tsx` | All form controls. Frozen API, Warcraft markup |
| `src/sections/CharacterSection.tsx` | **New.** Identity + abilities merged — the character pane |
| `src/data/rules.ts` | Static tables: 25 classes, 22 species, specializations, skills |
| `src/lib/migrate.ts` | Legacy sheet migration, now through schema version 3 |
| `docs/ASSET_PROMPTS.md` | Prompts to paste into ChatGPT and the Codex chat |
| `public/assets/ui/` | **New.** Six filigree SVG pieces |

Deleted: `src/sections/IdentitySection.tsx`, `src/sections/AbilitiesSection.tsx`.

## Task order rationale

Design cards first, because the spec requires the CSS to be written from approved cards rather than improvised. Then data and structure (tasks 2–6), so that the restyling tasks operate on final markup. Then the skin (7–12). Assets last, because they are a document, not code.

**The new tokens are added alongside the old ones in Task 3 and the dead ones removed only in Task 12.** CSS is invisible to `tsc`, so a half-migrated stylesheet still builds — the risk being managed here is a visually broken intermediate state, not a broken build.

---

### Task 1: Design system cards in Claude Design

**Files:**
- Create: `design/` (local bundle, git-ignored — add `design/` to `.gitignore`)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: an approved `claude.ai/design` project whose cards are the **content source** for the CSS written in Tasks 8–11. Those tasks consume the cards, not improvisation.

If a `/design-sync` skill is available in the session, load it and follow it. Otherwise drive the `DesignSync` tool directly as below.

- [ ] **Step 1: Add the local bundle directory to .gitignore**

```
# Claude Design local bundle (synced to claude.ai/design, not to git)
design/
```

- [ ] **Step 2: Find or create the design-system project**

Call `DesignSync` with `method: "list_projects"`. If a project for this app already exists, note its `projectId` and verify with `method: "get_project"` that its type is `PROJECT_TYPE_DESIGN_SYSTEM`. If none exists, call `method: "create_project"` with `name: "ARCANA — Azeroth"`.

- [ ] **Step 3: Write the nine component cards**

Create one HTML file per card under `design/`, each starting with a `@dsCard` marker comment so the Design System pane indexes it:

```
design/type-scale.html          <!-- @dsCard group="Type" -->
design/palette.html             <!-- @dsCard group="Colors" -->
design/frame-bevel.html         <!-- @dsCard group="Brand" -->
design/filigree-corners.html    <!-- @dsCard group="Brand" -->
design/controls.html            <!-- @dsCard group="Components" -->
design/character-card.html      <!-- @dsCard group="Components" -->
design/skill-row.html           <!-- @dsCard group="Components" -->
design/item-slot.html           <!-- @dsCard group="Components" -->
design/section-header.html      <!-- @dsCard group="Components" -->
```

Each card is self-contained: inline `<style>`, no external requests, and it declares the palette from spec §5.1 as custom properties on `:root` so the cards and the app cannot drift. The three-tone gold rule from spec §5.1 is non-negotiable — `--gold-hi` on the top-left bevel, `--gold` on the stroke, `--gold-lo` on the bottom-right. A frame using one tone reads flat and fails the card.

- [ ] **Step 4: Finalize the write plan and upload**

```
DesignSync method: "finalize_plan", projectId: <id>, localDir: "<repo>/design",
  writes: ["*.html"]

DesignSync method: "write_files", planId: <planId>, files: [
  {path: "type-scale.html",       localPath: "type-scale.html"},
  {path: "palette.html",          localPath: "palette.html"},
  {path: "frame-bevel.html",      localPath: "frame-bevel.html"},
  {path: "filigree-corners.html", localPath: "filigree-corners.html"},
  {path: "controls.html",         localPath: "controls.html"},
  {path: "character-card.html",   localPath: "character-card.html"},
  {path: "skill-row.html",        localPath: "skill-row.html"},
  {path: "item-slot.html",        localPath: "item-slot.html"},
  {path: "section-header.html",   localPath: "section-header.html"},
]
```

- [ ] **Step 5: Review gate — STOP**

Show the project URL and wait for approval of the cards before any CSS task begins. Tasks 8–11 are blocked on this.

- [ ] **Step 6: Commit**

```bash
git add .gitignore
git commit -m "Ignore the local Claude Design bundle

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Self-hosted fonts

**Files:**
- Modify: `scripts/fetch-fonts.sh`
- Modify: `src/styles/fonts.css` (regenerated by the script)
- Delete: `public/fonts/archivoblack-*.woff2`, `public/fonts/bebasneue-*.woff2`

**Interfaces:**
- Consumes: nothing.
- Produces: the font families `'Cinzel'`, `'EB Garamond'` and `'Barlow Condensed'`, available to every later task via the tokens defined in Task 3.

- [ ] **Step 1: Point the fetch script at the new families**

In `scripts/fetch-fonts.sh`, replace the Archivo Black and Bebas Neue entries with Cinzel and EB Garamond, and keep Barlow Condensed exactly as it is. Request weights `400;700` for Cinzel and `400;500;600` for EB Garamond. Both are SIL Open Font License 1.1, like the faces they replace.

- [ ] **Step 2: Regenerate**

Run: `bash scripts/fetch-fonts.sh`
Expected: new `woff2` files in `public/fonts/` and a rewritten `src/styles/fonts.css`. The header comment in `fonts.css` must name the three current families, not the old ones.

- [ ] **Step 3: Delete the orphaned font files**

```bash
rm public/fonts/archivoblack-*.woff2 public/fonts/bebasneue-*.woff2
```

- [ ] **Step 4: Verify no file still references the dropped families**

Run: `grep -rn "Archivo Black\|Bebas Neue" src/ public/ scripts/`
Expected: matches only in `src/styles/global.css` (the old `--font-display` / `--font-label` tokens, removed in Task 12). If anything else matches, fix it now.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add scripts/fetch-fonts.sh src/styles/fonts.css public/fonts/
git commit -m "Self-host Cinzel and EB Garamond, drop Archivo Black and Bebas Neue

Barlow Condensed stays: it carries the numbers and the dense tables, so
the most legibility-critical part of the sheet costs no new font bytes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Design tokens

**Files:**
- Modify: `src/styles/global.css:1-40` (the `:root` block)

**Interfaces:**
- Consumes: the font families from Task 2.
- Produces: the custom properties every CSS task from 8 onward uses — `--stone`, `--stone-2`, `--stone-3`, `--parchment`, `--parchment-dim`, `--gold`, `--gold-hi`, `--gold-lo`, `--bevel`, `--frame`, `--font-display`, `--font-body`, `--font-data`, and the seven rarity tokens.

- [ ] **Step 1: Add the new tokens to `:root`, keeping the old ones**

Insert above the existing `--ink` declarations. The old tokens stay until Task 12 so no stylesheet is left dangling mid-plan.

```css
  /* ── Azeroth ─────────────────────────────────────────────────────────── */
  --stone: #1a1512;
  --stone-2: #241d18;
  --stone-3: #30261f;
  --parchment: #e8dcc0;
  --parchment-dim: #c4b795;

  /* Warcraft's gold is three tones, never one: highlight on the top-left
     bevel, base on the stroke, shadow on the bottom-right. A frame drawn in a
     single tone reads flat. */
  --gold: #c8a84f;
  --gold-hi: #e8d08a;
  --gold-lo: #8a6d2f;
  --bevel: inset 1px 1px 0 var(--gold-hi), inset -1px -1px 0 var(--gold-lo);
  --frame: 2px solid var(--gold);

  --font-display: 'Cinzel', 'Trajan Pro', Georgia, serif;
  --font-body: 'EB Garamond', Georgia, 'Times New Roman', serif;
  --font-data: 'Barlow Condensed', 'Segoe UI', system-ui, sans-serif;

  /* Item rarity, straight from the game. Gives Bags its visual logic. */
  --q-poor: #9d9d9d;
  --q-common: #ffffff;
  --q-uncommon: #1eff00;
  --q-rare: #0070dd;
  --q-epic: #a335ee;
  --q-legendary: #ff8000;
  --q-artifact: #e6cc80;
```

- [ ] **Step 2: Add the procedural grain filters**

Append to `global.css`. These replace texture image files entirely — zero asset bytes, and they tile because turbulence is seamless.

```css
/* ── Procedural grain ───────────────────────────────────────────────────── */
/* Stone and parchment texture as SVG filters referenced from CSS, so the
   skin ships no texture images at all. */
.grain-stone::after,
.grain-parchment::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: multiply;
  opacity: 0.18;
}
.grain-stone::after {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}
.grain-parchment::after {
  opacity: 0.1;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5'/></filter><rect width='100%25' height='100%25' filter='url(%23p)'/></svg>");
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exit 0. Nothing has changed visually yet — this task only makes tokens available.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "Add the Azeroth design tokens alongside the current ones

The old tokens stay until the last styling task so no stylesheet is left
referencing a property that no longer exists mid-rewrite.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Classes, species and specializations

**Files:**
- Modify: `src/data/rules.ts:44-96`
- Modify: `src/sections/IdentitySection.tsx` (the species `SelectField` — `SPECIES` changes shape)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ClassInfo` gains `origin: 'phb2024' | 'warcraft'` and `provisional?: true`. All existing fields keep their names and types.
  - `CLASSES: ClassInfo[]` — 25 entries.
  - `SPECIES: { name: string; origin: 'phb2024' | 'warcraft' | 'both' }[]` — 22 entries. **Shape change**: was `string[]`.
  - `SPECIALIZATIONS: Record<string, string[]>` — Warcraft class name → specialization names.
  - `findClass(name)` keeps its signature. It returns the **first** match, so for the five shared names it returns the PHB entry; Task 6 adds an origin-aware lookup where that matters.

- [ ] **Step 1: Extend the `ClassInfo` interface**

```ts
export interface ClassInfo {
  name: string
  hitDie: number
  primary: AbilityKey[]
  saves: AbilityKey[]
  spellAbility: AbilityKey | null
  /** Full, half, third or pact caster (or none): picks the spell slot table. */
  caster: 'full' | 'half' | 'third' | 'pact' | 'none'
  accent: string
  /** Which book the class comes from. Drives the grouping in the selector. */
  origin: 'phb2024' | 'warcraft'
  /**
   * The mechanical fields are placeholders pending D&D: World of Warcraft
   * (17 Nov 2026). They exist because IdentitySection writes hitDieSize,
   * hitDiceTotal and slots when the class changes, and those are fields the
   * player edits by hand afterwards. Never presented as official.
   */
  provisional?: true
}
```

- [ ] **Step 2: Re-tune the 12 PHB accents warm and tag their origin**

The current accents were picked for a cold charcoal palette and sit outside the new one. Replace the `CLASSES` array's PHB entries with exactly these:

```ts
/** The 12 classes of the 2024 Player's Handbook. Accents re-tuned warm. */
const PHB_CLASSES: ClassInfo[] = [
  { name: 'Barbarian', hitDie: 12, primary: ['str'], saves: ['str', 'con'], spellAbility: null, caster: 'none', accent: '#c4452f', origin: 'phb2024' },
  { name: 'Bard', hitDie: 8, primary: ['cha'], saves: ['dex', 'cha'], spellAbility: 'cha', caster: 'full', accent: '#c4598a', origin: 'phb2024' },
  { name: 'Cleric', hitDie: 8, primary: ['wis'], saves: ['wis', 'cha'], spellAbility: 'wis', caster: 'full', accent: '#e8c15a', origin: 'phb2024' },
  { name: 'Druid', hitDie: 8, primary: ['wis'], saves: ['int', 'wis'], spellAbility: 'wis', caster: 'full', accent: '#4f9e57', origin: 'phb2024' },
  { name: 'Fighter', hitDie: 10, primary: ['str', 'dex'], saves: ['str', 'con'], spellAbility: null, caster: 'none', accent: '#b9411f', origin: 'phb2024' },
  { name: 'Monk', hitDie: 8, primary: ['dex', 'wis'], saves: ['str', 'dex'], spellAbility: null, caster: 'none', accent: '#3f9ea8', origin: 'phb2024' },
  { name: 'Paladin', hitDie: 10, primary: ['str', 'cha'], saves: ['wis', 'cha'], spellAbility: 'cha', caster: 'half', accent: '#dcae3c', origin: 'phb2024' },
  { name: 'Ranger', hitDie: 10, primary: ['dex', 'wis'], saves: ['str', 'dex'], spellAbility: 'wis', caster: 'half', accent: '#5a8f5c', origin: 'phb2024' },
  { name: 'Rogue', hitDie: 8, primary: ['dex'], saves: ['dex', 'int'], spellAbility: null, caster: 'none', accent: '#6f78bd', origin: 'phb2024' },
  { name: 'Sorcerer', hitDie: 6, primary: ['cha'], saves: ['con', 'cha'], spellAbility: 'cha', caster: 'full', accent: '#d9663f', origin: 'phb2024' },
  { name: 'Warlock', hitDie: 8, primary: ['cha'], saves: ['wis', 'cha'], spellAbility: 'cha', caster: 'pact', accent: '#8257c4', origin: 'phb2024' },
  { name: 'Wizard', hitDie: 6, primary: ['int'], saves: ['int', 'wis'], spellAbility: 'int', caster: 'full', accent: '#5b7fc4', origin: 'phb2024' },
]
```

- [ ] **Step 3: Add the 13 Warcraft classes with the official class colours**

```ts
/**
 * The 13 classes of D&D: World of Warcraft. Colours are the game's own class
 * colours. Every mechanical field is provisional: see ClassInfo.provisional.
 */
const WARCRAFT_CLASSES: ClassInfo[] = [
  { name: 'Death Knight', hitDie: 10, primary: ['str'], saves: ['str', 'con'], spellAbility: null, caster: 'none', accent: '#c41e3a', origin: 'warcraft', provisional: true },
  { name: 'Demon Hunter', hitDie: 10, primary: ['dex'], saves: ['dex', 'cha'], spellAbility: null, caster: 'none', accent: '#a330c9', origin: 'warcraft', provisional: true },
  { name: 'Druid', hitDie: 8, primary: ['wis'], saves: ['int', 'wis'], spellAbility: 'wis', caster: 'full', accent: '#ff7c0a', origin: 'warcraft', provisional: true },
  { name: 'Evoker', hitDie: 6, primary: ['cha'], saves: ['con', 'cha'], spellAbility: 'cha', caster: 'full', accent: '#33937f', origin: 'warcraft', provisional: true },
  { name: 'Hunter', hitDie: 10, primary: ['dex'], saves: ['str', 'dex'], spellAbility: 'wis', caster: 'half', accent: '#aad372', origin: 'warcraft', provisional: true },
  { name: 'Mage', hitDie: 6, primary: ['int'], saves: ['int', 'wis'], spellAbility: 'int', caster: 'full', accent: '#3fc7eb', origin: 'warcraft', provisional: true },
  { name: 'Monk', hitDie: 8, primary: ['dex', 'wis'], saves: ['str', 'dex'], spellAbility: null, caster: 'none', accent: '#00ff98', origin: 'warcraft', provisional: true },
  { name: 'Paladin', hitDie: 10, primary: ['str', 'cha'], saves: ['wis', 'cha'], spellAbility: 'cha', caster: 'half', accent: '#f48cba', origin: 'warcraft', provisional: true },
  { name: 'Priest', hitDie: 8, primary: ['wis'], saves: ['wis', 'cha'], spellAbility: 'wis', caster: 'full', accent: '#ffffff', origin: 'warcraft', provisional: true },
  { name: 'Rogue', hitDie: 8, primary: ['dex'], saves: ['dex', 'int'], spellAbility: null, caster: 'none', accent: '#fff468', origin: 'warcraft', provisional: true },
  { name: 'Shaman', hitDie: 8, primary: ['wis'], saves: ['con', 'wis'], spellAbility: 'wis', caster: 'full', accent: '#0070dd', origin: 'warcraft', provisional: true },
  { name: 'Warlock', hitDie: 8, primary: ['cha'], saves: ['wis', 'cha'], spellAbility: 'cha', caster: 'pact', accent: '#8788ee', origin: 'warcraft', provisional: true },
  { name: 'Warrior', hitDie: 10, primary: ['str'], saves: ['str', 'con'], spellAbility: null, caster: 'none', accent: '#c69b6d', origin: 'warcraft', provisional: true },
]

/** PHB first, so findClass() resolves a shared name to the published rules. */
export const CLASSES: ClassInfo[] = [...PHB_CLASSES, ...WARCRAFT_CLASSES]
```

- [ ] **Step 4: Add the specialization table**

```ts
/**
 * Specializations per Warcraft class. For a Warcraft class, the sheet stores
 * the specialization in `identity.subclass` — no new field. Taken from the
 * announcements, so provisional like the rest of the Warcraft data.
 */
export const SPECIALIZATIONS: Record<string, string[]> = {
  'Death Knight': ['Blood', 'Frost', 'Unholy'],
  'Demon Hunter': ['Devourer', 'Havoc', 'Vengeance'],
  'Druid': ['Balance', 'Feral', 'Guardian', 'Restoration'],
  'Evoker': ['Augmentation', 'Devastation', 'Preservation'],
  'Hunter': ['Beast Mastery', 'Marksmanship', 'Survival'],
  'Mage': ['Arcane', 'Fire', 'Frost'],
  'Monk': ['Brewmaster', 'Mistweaver', 'Windwalker'],
  'Paladin': ['Holy', 'Protection', 'Retribution'],
  'Priest': ['Discipline', 'Holy', 'Shadow'],
  'Rogue': ['Assassination', 'Outlaw', 'Subtlety'],
  'Shaman': ['Elemental', 'Enhancement', 'Restoration'],
  'Warlock': ['Affliction', 'Demonology', 'Destruction'],
  'Warrior': ['Arms', 'Fury', 'Protection'],
}
```

- [ ] **Step 5: Replace `SPECIES` with the tagged 22**

Goblin is in Warcraft's five revised species but not in the 2024 PHB's ten, so this union is not a superset of either list.

```ts
/**
 * 22 distinct species: the 2024 PHB's 10 and D&D: World of Warcraft's 16,
 * overlapping on four names.
 */
export const SPECIES: { name: string; origin: 'phb2024' | 'warcraft' | 'both' }[] = [
  { name: 'Dwarf', origin: 'both' },
  { name: 'Elf', origin: 'both' },
  { name: 'Human', origin: 'both' },
  { name: 'Orc', origin: 'both' },
  { name: 'Aasimar', origin: 'phb2024' },
  { name: 'Dragonborn', origin: 'phb2024' },
  { name: 'Gnome', origin: 'phb2024' },
  { name: 'Goliath', origin: 'phb2024' },
  { name: 'Halfling', origin: 'phb2024' },
  { name: 'Tiefling', origin: 'phb2024' },
  { name: 'Dracthyr', origin: 'warcraft' },
  { name: 'Draenei', origin: 'warcraft' },
  { name: 'Earthen', origin: 'warcraft' },
  { name: 'Forsaken', origin: 'warcraft' },
  { name: 'Goblin', origin: 'warcraft' },
  { name: 'Haranir', origin: 'warcraft' },
  { name: 'Mechagnome', origin: 'warcraft' },
  { name: 'Pandaren', origin: 'warcraft' },
  { name: 'Tauren', origin: 'warcraft' },
  { name: 'Troll', origin: 'warcraft' },
  { name: 'Vulpera', origin: 'warcraft' },
  { name: 'Worgen', origin: 'warcraft' },
]
```

- [ ] **Step 6: Fix the species consumer**

`SPECIES` was `string[]`. Find its uses and map to `.name`:

Run: `grep -rn "SPECIES" src/`

In `src/sections/IdentitySection.tsx`, the species `SelectField` options become `SPECIES.map((s) => s.name)`. This file is replaced in Task 6, but it must compile now.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: exit 0. If `tsc` reports an unfixed `SPECIES` consumer, fix it — that is the shape change being caught, which is the point.

- [ ] **Step 8: Verify the counts**

Run:
```bash
node -e "const s=require('fs').readFileSync('src/data/rules.ts','utf8');console.log('classes',(s.match(/origin: 'phb2024'/g)||[]).length+(s.match(/origin: 'warcraft', provisional/g)||[]).length,'species',(s.match(/origin: '(phb2024|warcraft|both)' }/g)||[]).length)"
```
Expected: `classes 25 species 22`.

- [ ] **Step 9: Commit**

```bash
git add src/data/rules.ts src/sections/IdentitySection.tsx
git commit -m "Add the 13 Warcraft classes and 16 species alongside the PHB ones

The Warcraft classes are their own entries, not a mapping onto PHB
classes: the mapping reported by press coverage is unverified and
building the model on it would mean rewriting stored sheets when the
book contradicts it. Mechanical fields are flagged provisional until
17 Nov 2026.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Accent migration to schema version 3

**Files:**
- Modify: `src/lib/migrate.ts:17` and the `migrateCharacter()` body

**Interfaces:**
- Consumes: `CLASSES` from Task 4.
- Produces: `SCHEMA_VERSION = 3`. Stored sheets load with an in-palette accent.

- [ ] **Step 1: Bump the schema version**

```ts
/** Sheets without `schemaVersion` are Spanish and metric. v3 re-tuned accents. */
export const SCHEMA_VERSION = 3
```

- [ ] **Step 2: Add the old accent table and the rewrite**

Add to `migrate.ts`. The rule is deliberately narrow: only a stored accent that still exactly equals the old default is replaced. Any other value is a colour the player chose.

```ts
/**
 * Accents as they were before the Azeroth palette. A sheet still carrying the
 * exact default for its class gets the new one; a player-picked colour is left
 * alone, which is why this compares for equality instead of just overwriting.
 */
const LEGACY_ACCENTS: Record<string, string> = {
  Barbarian: '#e03a2f', Bard: '#d8478f', Cleric: '#e8c15a', Druid: '#4fae62',
  Fighter: '#b9411f', Monk: '#37b6c4', Paladin: '#dcae3c', Ranger: '#3f8f6d',
  Rogue: '#6f7cd1', Sorcerer: '#e2593f', Warlock: '#8b46d6', Wizard: '#3f7bd6',
}

function migrateAccent(character: Character): void {
  const stored = character.identity.accent?.toLowerCase()
  const legacy = LEGACY_ACCENTS[character.identity.className]
  if (!stored || !legacy || stored !== legacy) return
  const current = CLASSES.find(
    (c) => c.name === character.identity.className && c.origin === 'phb2024',
  )
  if (current) character.identity.accent = current.accent
}
```

Import `CLASSES` from `@/data/rules` at the top, and call `migrateAccent(draft)` inside `migrateCharacter()` **before** the `schemaVersion` is stamped.

- [ ] **Step 3: Confirm the version guard still short-circuits**

Read the top of `migrateCharacter()`. A sheet already at `SCHEMA_VERSION` must return untouched, so a converted Speed is never converted twice. The accent rewrite must sit after that guard, not before it.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 5: Manual check**

Start `npm run dev` with no `.env.local` (local mode). In devtools, write a v2 sheet into `localStorage` under `arcana:roster:v1` with `identity.className: "Wizard"` and `identity.accent: "#3f7bd6"`, reload, and confirm the accent is now `#5b7fc4`. Repeat with `accent: "#ff00ff"` and confirm it is **unchanged**.

- [ ] **Step 6: Commit**

```bash
git add src/lib/migrate.ts
git commit -m "Re-tune stored accents to the Azeroth palette (schema v3)

Only rewrites an accent still holding the exact old default for its
class. A colour the player picked is left alone.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Merge Identity and Abilities into the Character pane

**Files:**
- Create: `src/sections/CharacterSection.tsx`
- Delete: `src/sections/IdentitySection.tsx`, `src/sections/AbilitiesSection.tsx`
- Modify: `src/screens/SheetScreen.tsx:20-30` (`SECTIONS`), `:78-84` (keyboard), `:236-242` (`HintBar`)

**Interfaces:**
- Consumes: `CLASSES`, `SPECIALIZATIONS`, `SPECIES` from Task 4. `SectionProps` from `@/sections/types` — unchanged.
- Produces: `CharacterSection: (p: SectionProps) => JSX.Element`, and `PORTRAIT_LIBRARY` (moved here from `IdentitySection`, same shape) which `docs/ASSET_PROMPTS.md` references in Task 14.

- [ ] **Step 1: Create the merged section**

Create `src/sections/CharacterSection.tsx` holding, in this order: the identity panel, the portrait panel and `PORTRAIT_LIBRARY` from `IdentitySection.tsx`, then the ability score panel from `AbilitiesSection.tsx`. Move the code; do not reimplement it. Keep the class/level side effect that rewrites `combat.hitDieSize`, `combat.hitDiceTotal` and `spellcasting.slots` exactly as it is — it is a deliberate exception documented in `CLAUDE.md` and this plan changes no formulas.

- [ ] **Step 2: Group the class selector by book**

Both class lists are offered in one control, grouped so the duplicated names are visibly intentional. This is a raw `<select>` rather than `SelectField` because `SelectField` takes a flat `readonly string[]` and cannot render `<optgroup>`. It therefore has to mimic `SelectField` by hand: the same `field` / `label` / `select` class names, and the same `play('toggle')` cue.

```tsx
<label className="field">
  <span className="label">Class</span>
  <select
    className="select"
    value={character.identity.className}
    onChange={(e) => { play('toggle'); onClassChange(e.target.value) }}
  >
    <optgroup label="Azeroth">
      {CLASSES.filter((c) => c.origin === 'warcraft').map((c) => (
        <option key={`wow-${c.name}`} value={c.name}>{c.name}</option>
      ))}
    </optgroup>
    <optgroup label="Player's Handbook 2024">
      {CLASSES.filter((c) => c.origin === 'phb2024').map((c) => (
        <option key={`phb-${c.name}`} value={c.name}>{c.name}</option>
      ))}
    </optgroup>
  </select>
</label>
```

Species gets the same treatment with three groups keyed off `SPECIES[].origin`.

- [ ] **Step 3: Make the subclass control a select when the specializations are known**

```tsx
{SPECIALIZATIONS[character.identity.className] ? (
  <SelectField
    label="Specialization"
    value={character.identity.subclass}
    options={SPECIALIZATIONS[character.identity.className]}
    onChange={(v) => update((d) => { d.identity.subclass = v })}
  />
) : (
  <TextField
    label="Subclass"
    value={character.identity.subclass}
    onChange={(v) => update((d) => { d.identity.subclass = v })}
  />
)}
```

The stored field is `identity.subclass` in both branches — no new `Character` field.

- [ ] **Step 4: Add the provisional-rules note**

```tsx
{CLASSES.find((c) => c.name === character.identity.className)?.provisional && (
  <p className="note-provisional">
    Provisional rules. Hit die, saving throws and spell slots for the Warcraft
    classes are placeholders until D&amp;D: World of Warcraft is published.
    Adjust them by hand in Combat and Spellbook.
  </p>
)}
```

- [ ] **Step 5: Rewrite the section registry to seven entries**

In `src/screens/SheetScreen.tsx`, replace the `SECTIONS` array and drop the `IdentitySection` and `AbilitiesSection` imports:

```tsx
const SECTIONS: { id: string; label: string; glyph: string; Component: (p: SectionProps) => JSX.Element }[] = [
  { id: 'character', label: 'Character', glyph: '◆', Component: CharacterSection },
  { id: 'skills', label: 'Skills', glyph: '❖', Component: SkillsSection },
  { id: 'combat', label: 'Combat', glyph: '⚔', Component: CombatSection },
  { id: 'spellbook', label: 'Spellbook', glyph: '❉', Component: SpellsSection },
  { id: 'bags', label: 'Bags', glyph: '◈', Component: InventorySection },
  { id: 'features', label: 'Features', glyph: '✦', Component: FeaturesSection },
  { id: 'journal', label: 'Journal', glyph: '☙', Component: JournalSection },
]
```

- [ ] **Step 6: Narrow the keyboard range**

In the `keydown` handler, `/^[1-8]$/` becomes `/^[1-7]$/`. In the `HintBar`, `['1-8', 'Go to section']` becomes `['1-7', 'Go to section']`.

- [ ] **Step 7: Delete the two old sections**

```bash
git rm src/sections/IdentitySection.tsx src/sections/AbilitiesSection.tsx
```

- [ ] **Step 8: Build**

Run: `npm run build`
Expected: exit 0. `noUnusedLocals` is the safety net for imports orphaned by the merge — if it complains, that is the net working.

- [ ] **Step 9: Manual check**

With `npm run dev`: all seven sections render; keys `1`–`7` reach their section and `8` does nothing; the class select shows two groups; picking a Warcraft class shows the provisional note and turns the subclass field into a specialization select; picking a PHB class hides the note and restores the free-text subclass; `Esc` exits to the party; typing in a text field does not trigger navigation.

- [ ] **Step 10: Commit**

```bash
git add -A src/sections src/screens/SheetScreen.tsx
git commit -m "Merge Identity and Abilities into the Character pane

Seven sections in Warcraft menu vocabulary, keyboard narrowed to 1-7.
Character is also where the equipment doll will land in the next spec.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Reskin the UI controls

**Files:**
- Modify: `src/components/ui/controls.tsx` (all 11 exports)

**Interfaces:**
- Consumes: the tokens from Task 3, the approved cards from Task 1.
- Produces: the same 11 exported signatures, with Warcraft markup and class names. **This is the task that keeps the other six sections from needing a rewrite** — if a signature changes here, the plan has gone wrong.

- [ ] **Step 1: Confirm the frozen API before touching anything**

Run: `grep -n '^export function' src/components/ui/controls.tsx`
Expected, and unchanged at the end of this task: `Panel`, `TextField`, `NumberField`, `SelectField`, `TextAreaField`, `Button`, `CheckBox`, `ProficiencyPip`, `Chip`, `OverflowMenu`, `HintBar`.

- [ ] **Step 2: Restyle each control's markup from the approved `controls.html` card**

Work control by control. The structural changes, applying to all of them:

- Remove every `transform: skewX(...)` and every `--shadow-hard` reference; panels and buttons sit square.
- A `Panel` becomes a stone body with `--frame` plus `--bevel`, a `header-cartouche` behind its title, and `grain-stone` on the body.
- `Panel` titles take `--font-display`; field labels take `--font-body` in small caps; every number and every computed value takes `--font-data`.
- `ProficiencyPip` becomes a gold-bordered square: empty, filled with `--accent` for proficient, filled with `--gold` for expertise.
- `Chip` keeps its shape but takes the gold border and bevel.
- Keep every `play(cue)` call exactly where it is: each control fires its own cue, which is why sections wire up no sound.
- Keep `aria-label`, `title` and `:focus-visible` behaviour. The focus ring moves to `--gold-hi`, and must stay visible against both stone and parchment.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Verify the API really did not move**

Run: `git diff --stat src/components/ui/controls.tsx && grep -n '^export function' src/components/ui/controls.tsx`
Expected: the same 11 names in the same order. A changed signature means stopping and reverting it.

- [ ] **Step 5: Manual check**

Every one of the seven sections still renders and every control still edits its field: text, number, select, textarea, checkbox, proficiency pip, chip, overflow menu. Tab through a section and confirm the focus ring is visible on both stone and parchment grounds.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/controls.tsx
git commit -m "Reskin the UI controls, API untouched

All 11 exported signatures are unchanged, which is what keeps the six
other sheet sections from needing a rewrite.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Rewrite the sheet stylesheet

**Files:**
- Modify: `src/styles/sheet.css` (314 lines, full rewrite)

**Interfaces:**
- Consumes: the tokens from Task 3, the markup from Tasks 6 and 7, the `section-header`, `skill-row` and `item-slot` cards from Task 1.
- Produces: the sheet shell styling consumed by `responsive.css` in Task 11.

- [ ] **Step 1: Rewrite the shell from the approved cards**

Write the whole file from the Task 1 cards rather than patching the existing rules. The grammar:

- `.sheet` is a `--stone` ground with a filigree corner at each of the four screen corners, placed with `background-image` on `::before`/`::after` pseudo-elements and tinted by `color: var(--gold)` so `currentColor` resolves.
- `.sheet-head` carries `header-cartouche` behind `.section-name`. The `skewX(-6deg)` in `SheetScreen`'s framer-motion `animate` is a JS value, not CSS — leave it to Task 10.
- `.sheet-nav` items become gold-bordered squares holding the glyph, with the index in `--font-data` and the label in `--font-display`. The active item keeps the existing jut-right on desktop and rise on mobile; those are framer-motion values in `SheetScreen` and this task does not touch them.
- `.sheet-ident` portrait gets a gold frame with the three-tone bevel.
- `.panel`, `.grid`, `.stack`, `.skill-row`, `.sk-name`, `.sk-ability`, `.sk-value` per their cards.
- `.save-dot` states keep their meaning: `saving`, `saved`, `error`. Error stays unmistakably alarming against gold — do not make it decorative.
- `.note-provisional` from Task 6: parchment inset, `--font-body`, italic, not alarming. It is a disclosure, not a warning.

- [ ] **Step 2: Confirm no orphaned selectors**

Run: `grep -n "skew\|shadow-hard\|--blood\|--bone\|--ink" src/styles/sheet.css`
Expected: no matches.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Manual check**

All seven sections at desktop width: frames read as three-tone gold, titles in Cinzel, numbers in Barlow Condensed, body text in EB Garamond. The sync indicator shows all three states (force one by going offline).

- [ ] **Step 5: Commit**

```bash
git add src/styles/sheet.css
git commit -m "Rewrite the sheet stylesheet in the Azeroth grammar

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Rewrite the screen stylesheet and screen chrome

**Files:**
- Modify: `src/styles/screens.css` (334 lines, full rewrite)
- Modify: `src/screens/TitleScreen.tsx`, `src/screens/CharacterSelect.tsx`, `src/screens/LoginScreen.tsx` (chrome only)

**Interfaces:**
- Consumes: the tokens from Task 3, the `character-card` card from Task 1.
- Produces: title, party select and login styling consumed by `responsive.css` in Task 11.

- [ ] **Step 1: Rewrite `screens.css` from the approved cards**

- Title screen: the app name in Cinzel, letterspaced, over stone with a filigree border; the existing prompt and menu keep their structure.
- Character select: each card becomes a gold-framed portrait with a cartouche naming the character. **Remove the `-3deg` card rotation** — the Warcraft register is square. The carousel's own logic is untouched.
- Login: a single framed panel on stone.

- [ ] **Step 2: Adjust only the chrome in the three screens**

Class names and wrapper elements only. Do not touch the carousel keyboard handling in `CharacterSelect`, the auth calls in `LoginScreen`, or any `useWipe()` usage.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Manual check**

Title → party → sheet → back, by keyboard and by pointer. Cards are square, not rotated, and the per-character accent tints the selected card. In local mode the login screen does not appear; with `.env.local` present it does.

- [ ] **Step 5: Commit**

```bash
git add src/styles/screens.css src/screens/
git commit -m "Rewrite the title, party and login screens in the Azeroth grammar

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Gold wipe, ambient background and sound cues

**Files:**
- Modify: `src/components/fx/Wipe.tsx` (look only), `src/components/fx/Background.tsx`
- Modify: `src/screens/SheetScreen.tsx` (the framer-motion `skewX` values)
- Modify: `src/lib/sfx.ts` (the `CUES` table only)

**Interfaces:**
- Consumes: the tokens from Task 3.
- Produces: `useWipe()` with its signature and timing contract unchanged, and `play(cue)` accepting the same six cue names as today.

- [ ] **Step 1: Restyle the wipe, leave its mechanics alone**

Change the covering element's colour and shape to a gold sweep. Do **not** touch: the navigation side effect in the `reveal`-phase `useEffect` — StrictMode invokes updaters twice and moving it into a `setState` updater loses the action — the 1.2 s failsafe for a backgrounded tab, or the `prefers-reduced-motion` skip.

- [ ] **Step 2: Replace the ambient background**

`Background.tsx` swaps the red radial gradient for warm stone with a slow gold vignette. Keep it `pointer-events: none` and behind everything.

- [ ] **Step 3: Remove the leftover skew from the section transitions**

In `SheetScreen.tsx`, the `motion.div` for `.section-name` and for the section body carry `skewX` values of `-14`, `-6`, `-5` and `3`. Set every `skewX` to `0`, keeping the opacity and x-offset animation. The slanted grammar is gone; the motion stays.

- [ ] **Step 4: Retune the sound cues**

`src/lib/sfx.ts` stays WebAudio with zero audio files. Only the `CUES` table is retuned: lower, rounder tones with a short tail, in the register of a Warcraft UI click, instead of the current bright menu blips.

The six cue names are an API and **must not change** — `'move'`, `'confirm'`, `'back'`, `'toggle'`, `'open'`, `'error'`. Every control calls `play(cue)` on its own, so renaming one silently breaks a control. Leave `isMuted()`, `setMuted()` and the `arcana:sfx-muted` persistence alone.

Run: `grep -n "type Cue" src/lib/sfx.ts`
Expected, unchanged: `type Cue = 'move' | 'confirm' | 'back' | 'toggle' | 'open' | 'error'`

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 6: Manual check**

Navigate between screens several times: the wipe covers, the screen changes, it uncovers, and no navigation is ever lost. Enable `prefers-reduced-motion` in devtools and confirm the wipe is skipped and navigation still works. Switch to another browser tab mid-wipe and come back — the failsafe must have completed the navigation.

With sound on, trigger all six cues: arrow-key navigation (`move`), jumping to a section by number (`confirm`), `Esc` (`back`), a select and a checkbox (`toggle`), the phone overflow menu (`open`), and a failed save (`error`). Then mute, reload, and confirm it is still muted.

- [ ] **Step 7: Commit**

```bash
git add src/components/fx/ src/screens/SheetScreen.tsx src/lib/sfx.ts
git commit -m "Turn the red diagonal wipe into a gold sweep and retune the cues

Look and sound only: the reveal-phase side effect, the 1.2s failsafe,
the reduced-motion skip and the six cue names are untouched.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Rewrite the responsive stylesheet

**Files:**
- Modify: `src/styles/responsive.css` (305 lines, full rewrite)

**Interfaces:**
- Consumes: everything from Tasks 8, 9 and 10.
- Produces: the finished skin at tablet and phone widths.

- [ ] **Step 1: Rewrite the step-downs for the new grammar**

The existing file steps down `--skew`, `--shadow-hard` and `--edge`, which no longer exist. It now steps down the new constants instead: at narrow widths, thin the filigree, drop the corner ornaments on the two bottom corners, reduce the frame to 1px and shrink the cartouche. Keep every existing structural behaviour: the `--touch: 44px` minimum, the `env(safe-area-inset-*)` handling, `100dvh`, the bottom nav strip, and the phone-only overflow menu.

- [ ] **Step 2: Confirm no dead tokens remain**

Run: `grep -rn "skew\|shadow-hard\|--edge\|--blood\|--bone\|--ink" src/styles/responsive.css`
Expected: no matches.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Manual check**

At 393px and at 820px: no horizontal page scroll anywhere; every tap target at least 44px; the bottom nav strip scrolls and centres the active section; swiping left and right changes section; the header shows the sync glyph rather than the full phrase; nothing sits under a notch or the home indicator.

- [ ] **Step 5: Commit**

```bash
git add src/styles/responsive.css
git commit -m "Step the Azeroth grammar down to tablet and phone

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Remove the Persona 5 tokens

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: the completed Tasks 7–11.
- Produces: a `:root` holding only the Azeroth tokens.

- [ ] **Step 1: Prove nothing still uses them**

Run: `grep -rn "\-\-ink\|--bone\|--blood\|--gold-hot\|--skew\|--shadow-hard\|--edge\|--accent-soft\|font-label" src/`
Expected: matches **only** inside `global.css` itself. Any match elsewhere means an earlier task was left incomplete — finish it before deleting anything.

- [ ] **Step 2: Delete the old tokens and the old background**

Remove `--ink`, `--ink-2`, `--ink-3`, `--bone`, `--bone-dim`, `--blood`, `--blood-hot`, `--gold-hot` if present, `--accent-soft`, `--font-label`, `--skew`, `--shadow-hard`, `--edge`, and the old `.bg-fx` gradient rules. Repoint `body` and `::selection` at `--stone` and `--parchment`. Keep `color-scheme: dark`, the `--safe-*` variables, `--touch`, `100dvh` and the `box-sizing` reset.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Manual check**

A full pass over every screen and all seven sections at all three widths. Nothing may render with an unstyled or transparent background — a missing token shows up as a see-through panel, not as a build error.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "Remove the Persona 5 tokens now that nothing references them

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Portrait slugs and the demo party

**Files:**
- Modify: `src/data/defaults.ts`
- Modify: `supabase/seed.sql` (regenerated, never hand-edited)

**Interfaces:**
- Consumes: `CLASSES` from Task 4.
- Produces: `portraitForClass(className)` resolving all 20 distinct class slugs; a `demoRoster()` with Azeroth characters.

- [ ] **Step 1: Extend the portrait slugs to 20**

Portraits are keyed by class **slug**, so the five names shared between the two books resolve to one portrait — a Druid looks like a Druid in either book. Add the eight Warcraft-only slugs to `PORTRAIT_SLUGS`:

```ts
'death-knight', 'demon-hunter', 'evoker', 'hunter', 'mage', 'priest',
'shaman', 'warrior',
```

`portraitForClass()` keeps its signature and must return `assets/portraits/default.svg` for an unknown class. Paths stay relative, with no leading slash.

- [ ] **Step 2: Add Azeroth characters to the demo party**

Keep `demoRoster()`'s existing discipline: deterministic nested ids of the form `${slug}-atk-1` and the fixed `DEMO_TIMESTAMP`, so the generated seed stays stable. Every section stays filled in — attacks, spells, gear, features, journal — because that is what makes the demo worth loading. Give at least two of the characters Warcraft classes with a specialization in `identity.subclass`.

- [ ] **Step 3: Regenerate the seed**

Run: `node scripts/generate-seed.mjs`
Expected: `supabase/seed.sql` rewritten. Do not edit it by hand.

- [ ] **Step 4: Confirm the seed is stable**

Run: `node scripts/generate-seed.mjs && git diff --stat supabase/seed.sql`
Expected: no further change on the second run. A diff here means a non-deterministic id or timestamp crept in.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 6: Manual check**

Clear `localStorage` and reload in local mode: the demo party seeds, every card shows a portrait, and the Warcraft characters show their specialization.

- [ ] **Step 7: Commit**

```bash
git add src/data/defaults.ts supabase/seed.sql
git commit -m "Cover the Warcraft class portraits and seed an Azeroth demo party

Twenty slugs, not twenty-five: the five class names shared between the
two books share a portrait.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Asset prompt document

**Files:**
- Modify: `docs/ASSET_PROMPTS.md` (full rewrite)
- Create: `public/assets/ui/.gitkeep`

**Interfaces:**
- Consumes: the palette from Task 3, the class colours and the 20 slugs from Tasks 4 and 13, `PORTRAIT_LIBRARY` from Task 6.
- Produces: the document that generates every remaining asset. No scripts, no API keys.

- [ ] **Step 1: Replace the style bible**

Keep the file's existing seven-section structure, which works. Replace the Persona 5 bible with the Warcraft one: hand-painted key art, warm, heroic, visible brushwork, antique gold, warm dark stone. Replace the technical table with the 5:7 ratio at 1000×1400, WebP or PNG, under 300 KB, and the destination paths.

- [ ] **Step 2: Write the image prompt template and its 20 fills**

One base template with `[brackets]`, then 20 ready-to-paste prompts, one per class slug, each naming that class's colour from Task 4. Mark one rule as functional rather than aesthetic, because the layout depends on it:

> The **bottom third** stays dark and free of detail — the app prints the character name over it.

Also include one prompt for the title background at 16:9, 2560×1440.

- [ ] **Step 3: Write the code prompt for the filigree**

A single prompt to paste into the Codex chat, asking for six finished SVG files written straight to `public/assets/ui/` — `frame-corner-tl.svg`, `-tr`, `-bl`, `-br` at `viewBox "0 0 64 64"`, `header-cartouche.svg` at `"0 0 320 48"`, `divider-rule.svg` at `"0 0 320 12"`. Its one hard rule, stated as such: `fill="none" stroke="currentColor"` and **no hex colours anywhere**, so the app tints them from `--gold`. No `<text>`, no filters, no inline styles. The four corners must be exact mirrors.

Add the explicit instruction that the designs are original work in the Warcraft register and must never reproduce Blizzard's own icons or art.

- [ ] **Step 4: Update the "getting images into the app" section**

The two places to edit when a portrait's extension changes are `PORTRAIT_SLUGS` / `portraitForClass()` in `src/data/defaults.ts` and `PORTRAIT_LIBRARY` in `src/sections/CharacterSection.tsx` — the latter moved there in Task 6, so the old path in this document is now stale.

- [ ] **Step 5: Verify every class is covered**

Run:
```bash
grep -c '^### ' docs/ASSET_PROMPTS.md
```
Expected: one heading per prompt, 21 in total — 20 classes and the title background.

- [ ] **Step 6: Commit**

```bash
git add docs/ASSET_PROMPTS.md public/assets/ui/.gitkeep
git commit -m "Rewrite the asset prompts for the Azeroth skin

Image prompts for ChatGPT, code prompts for the Codex chat. No scripts
and no API keys: the raster art is non-reproducible by nature and is
committed as an artifact.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Final verification

After Task 14, before opening a pull request:

- [ ] `npm run build` exits 0.
- [ ] `grep -rn "Archivo Black\|Bebas Neue\|--blood\|--bone\|--skew\|shadow-hard" src/` returns nothing.
- [ ] `grep -rn "IdentitySection\|AbilitiesSection" src/` returns nothing.
- [ ] `git grep -n "#" public/assets/ui/` returns nothing (filigree carries no hex colours). Skip if the SVGs have not been generated yet.
- [ ] All seven sections render at 393px, 820px and 1440px with no horizontal page scroll.
- [ ] Keys `1`–`7`, `↑`/`↓`, WASD/QE aliases and `Esc` all work, and typing in a field never navigates.
- [ ] A sheet stored before this branch loads correctly, and a player-customised accent survives.
- [ ] `prefers-reduced-motion` skips the wipe.
- [ ] Sound toggle persists across a reload.
- [ ] In cloud mode, if `.env.local` is configured: sign in, edit two sheets in quick succession and confirm both save independently, then force an error offline and confirm Retry recovers.

## Out of scope

Deferred to their own specs, in order: the equipment doll in the Character pane, the quest log, the talent menu, and reputation and renown. None of them is started in this plan. See spec §11.
