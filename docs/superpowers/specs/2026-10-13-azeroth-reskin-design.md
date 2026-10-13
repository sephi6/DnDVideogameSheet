# Azeroth Reskin — Design

**Date:** 2026-10-13
**Status:** approved, ready for implementation planning
**Scope:** spec 1 of 5 (see [Deferred work](#11-deferred-work))

---

## 1. Goal

Turn ARCANA's Persona 5 skin into a World of Warcraft one, and make the 13
Warcraft classes and 16 Warcraft species selectable alongside the 2024 Player's
Handbook ones — without adding a single new feature and without touching a
single formula.

When this spec is done the app does exactly what it does today. It looks
completely different.

## 2. Context

The campaign this tool is being rebuilt for uses **D&D: World of Warcraft**
(Wizards of the Coast × Blizzard), which releases **17 November 2026**, with
early access on **3 November**. At the time of writing the rules are not
published.

What the announcements do tell us:

- Rules for **13 Warcraft classes**, with **9 new and revised subclasses** and
  **over 40 specializations**.
- **16 species**: 11 new (Dracthyr, Draenei, Earthen, Forsaken, Haranir,
  Mechagnome, Pandaren, Tauren, Troll, Vulpera, Worgen) and 5 revised for
  Azeroth (Dwarf, Elf, Goblin, Human, Orc).
- Three **hero classes** — Death Knight, Demon Hunter, Evoker — start play at
  level 3 or higher.
- Also in the book, and relevant to later specs: 10+ professions, 20+ factions
  with a renown system, 30+ magic items including mounts and companion
  creatures, 60+ spells.

Sources: [Blizzard announcement](http://worldofwarcraft.blizzard.com/en-us/news/24293053/craft-new-adventures-with-dd-world-of-warcraft),
[dungeonsanddragons.com](https://www.dungeonsanddragons.com/world-of-warcraft/),
[D&D Beyond: the 13 classes](https://www.dndbeyond.com/posts/2256-become-a-champion-of-azeroth-with-these-13-world).

### 2.1 What we deliberately do not model

Secondary coverage reports that each Warcraft class is mechanically a 2024 PHB
class plus a subclass (Shaman as a Barbarian, Death Knight as a Paladin, and so
on). **We do not encode that mapping.** It comes from press coverage rather than
from the book, parts of it look like transcription errors, and building the data
model on it would mean rewriting every stored sheet when the book contradicts
us.

Instead the 13 Warcraft classes are **their own entries** in the class table,
marked provisional. The book lands five weeks from now and fills them in.

## 3. Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Warcraft classes are new, first-class entries — not a mapping onto PHB classes | The mapping is unverified; see §2.1 |
| D2 | The 12 PHB classes and 10 PHB species stay selectable | Another campaign is in progress on them |
| D3 | One single skin for the whole app | Two switchable themes would double the CSS surface for no gain; PHB sheets wear the gold frame too |
| D4 | Field vocabulary stays **D&D 2024** | The rules in play are 2024's. A player must be able to read the sheet against the PHB without translating. No `DEX`→Agility, no `CON`→Stamina |
| D5 | Visual register: classic gold-and-stone chrome, modern legibility | Filigree on screen edges and headers only; panel interiors stay flat and readable, on a data-dense sheet and on a phone |
| D6 | Sections are renamed and regrouped to Warcraft menu vocabulary | This is the product's whole premise — navigating a sheet like a game menu |
| D7 | No formulas, no mechanics, no `derive.ts` | Explicit instruction. Out of scope for this spec and for this rebuild |
| D8 | No new generator scripts and no API keys for assets | Assets are produced by pasting prompts from a document |

## 4. Section structure

Eight sections become seven. `Identity` and `Abilities` merge into
`Character` — the Warcraft character pane, and the place where spec 2's
equipment doll will land.

| Key | Glyph | Section | Contents |
|---|---|---|---|
| 1 | ◆ | **Character** | identity + abilities (merged) |
| 2 | ❖ | **Skills** | the 18 D&D skills, proficiency pips |
| 3 | ⚔ | **Combat** | AC, HP, hit dice, attacks, conditions |
| 4 | ❉ | **Spellbook** | spells + slots |
| 5 | ◈ | **Bags** | inventory + coins |
| 6 | ✦ | **Features** | features, languages, proficiencies |
| 7 | ☙ | **Journal** | personality, bonds, backstory |

Keyboard moves from `1`–`8` to `1`–`7`. The `HintBar` text follows.

## 5. Design system

### 5.1 Palette

The current palette is cold (`--ink: #08070a`, bone, blood). Warcraft is warm:
brown-black stone, three-tone gold, parchment.

```
--stone        #1a1512   warm stone, page ground
--stone-2      #241d18   panels
--stone-3      #30261f   raised rows, inputs
--parchment    #e8dcc0   text insets
--parchment-dim #c4b795
--gold         #c8a84f   frame
--gold-hi      #e8d08a   top bevel
--gold-lo      #8a6d2f   bottom bevel
--accent       (per character, from the class table)
```

Warcraft's gold is **three tones, not one**: a highlight on the top-left bevel,
the base colour on the stroke, a shadow on the bottom-right. Every frame uses
all three or it reads flat.

### 5.2 Class colours

`ClassInfo.accent` already exists, and `--accent` is already applied per
character as an inline style that tints the whole menu. The 12 invented accents
are replaced with Warcraft's **official class colours**, and the 13 new classes
bring their own. The existing machinery then gives class-coloured menus for
free.

| Class | Colour | Class | Colour |
|---|---|---|---|
| Death Knight | `#C41E3A` | Monk | `#00FF98` |
| Demon Hunter | `#A330C9` | Paladin | `#F48CBA` |
| Druid | `#FF7C0A` | Priest | `#FFFFFF` |
| Evoker | `#33937F` | Rogue | `#FFF468` |
| Hunter | `#AAD372` | Shaman | `#0070DD` |
| Mage | `#3FC7EB` | Warlock | `#8788EE` |
| Warrior | `#C69B6D` | | |

PHB classes with no Warcraft counterpart (Bard, Sorcerer, Fighter, Barbarian,
Cleric, Ranger, Wizard) keep a hue in the same family, re-tuned warm so they sit
in the new palette.

Item rarity colours are added as tokens — grey `#9d9d9d`, white `#ffffff`, green
`#1eff00`, blue `#0070dd`, purple `#a335ee`, orange `#ff8000`, artifact
`#e6cc80`. They are instantly legible to any Warcraft player and give **Bags**
its visual logic.

### 5.3 Typography

Warcraft's own faces (Friz Quadrata, Morpheus) are proprietary. Open-licence
equivalents in the same register, self-hosted through the existing
`scripts/fetch-fonts.sh`:

| Token | Face | Use |
|---|---|---|
| `--font-display` | **Cinzel** | Roman inscriptional caps — section titles, character names |
| `--font-body` | **EB Garamond** | the parchment-and-quest-text register |
| `--font-data` | **Barlow Condensed** | numbers and dense tables |

Barlow Condensed is **already self-hosted in this repo**, so the densest and
most legibility-critical part of the sheet costs zero new font bytes. Archivo
Black and Bebas Neue are dropped.

### 5.4 Frame grammar

The `-9deg` skew and `--shadow-hard` are removed entirely. In their place:

- Three-tone gold border with a bevel.
- Filigree corner ornaments on screen edges and section headers only — never
  around individual fields.
- Flat, open panel interiors.
- Icons become squares with a gold border, in the register of a Warcraft
  ability icon.
- Stone and parchment grain via inline SVG `feTurbulence` filters — procedural,
  tiling, zero asset files.

### 5.5 Sound

`sfx.ts` stays WebAudio with no audio files. The cues are only retuned: lower,
rounder tones with a short tail, in the register of Warcraft's UI clicks.
Mute persistence (`arcana:sfx-muted`) is untouched.

## 6. Data

### 6.1 Classes

`CLASSES` in `src/data/rules.ts` grows from 12 to 25. `ClassInfo` gains two
fields; its existing fields keep their types, so no consumer changes.

```ts
export interface ClassInfo {
  name: string
  hitDie: number
  primary: AbilityKey[]
  saves: AbilityKey[]
  spellAbility: AbilityKey | null
  caster: 'full' | 'half' | 'third' | 'pact' | 'none'
  accent: string
  /** Which book the class comes from. Drives grouping in the selector. */
  origin: 'phb2024' | 'warcraft'
  /** Mechanical fields are placeholders pending the 17 Nov 2026 book. */
  provisional?: true
}
```

The 13 Warcraft classes, with their specializations:

| Class | Specializations | Hero |
|---|---|---|
| Death Knight | Blood · Frost · Unholy | yes |
| Demon Hunter | Devourer · Havoc · Vengeance | yes |
| Druid | Balance · Feral · Guardian · Restoration | |
| Evoker | Augmentation · Devastation · Preservation | yes |
| Hunter | Beast Mastery · Marksmanship · Survival | |
| Mage | Arcane · Fire · Frost | |
| Monk | Brewmaster · Mistweaver · Windwalker | |
| Paladin | Holy · Protection · Retribution | |
| Priest | Discipline · Holy · Shadow | |
| Rogue | Assassination · Outlaw · Subtlety | |
| Shaman | Elemental · Enhancement · Restoration | |
| Warlock | Affliction · Demonology · Destruction | |
| Warrior | Arms · Fury · Protection | |

Five names exist in **both** books: Druid, Monk, Paladin, Rogue, Warlock. They
are two separate entries each — `origin: 'phb2024'` and `origin: 'warcraft'` —
because their specialization lists and accents differ. The selector groups them
under two headings, so the duplication is visible and intentional rather than
confusing.

Warcraft's Priest and Warrior are **not** PHB duplicates: the PHB's equivalents
are named Cleric and Fighter. So 25 entries carry 20 distinct names.

**On the provisional mechanical values.** The Warcraft entries need a
`hitDie`, `saves` and `caster` because existing code reads them —
`IdentitySection` writes `combat.hitDieSize`, `combat.hitDiceTotal` and
`spellcasting.slots` when the class changes. Leaving them empty would produce
nonsense derived values. So each Warcraft class gets the plausible value of its
obvious analogue, flagged `provisional: true`, and the **Character** section
shows a short "provisional rules" note whenever a provisional class is
selected. This is safe because those three fields are, by existing design, the
deliberate exception that the player edits by hand afterwards
(see `CLAUDE.md` → Derived values). Nothing is presented as official.

`SPECIALIZATIONS: Record<string, string[]>` maps a Warcraft class name to its
list. **No new `Character` field**: for a Warcraft class, `identity.subclass`
stores the specialization. The Character section's subclass control becomes a
`SelectField` when the class has a known list and stays a `TextField`
otherwise.

### 6.2 Species

`SPECIES` becomes an array of objects and grows from 10 to 22 distinct names.

```ts
export const SPECIES: { name: string; origin: 'phb2024' | 'warcraft' | 'both' }[]
```

- `'both'` (4): Dwarf, Elf, Human, Orc.
- `'phb2024'` (6): Aasimar, Dragonborn, Gnome, Goliath, Halfling, Tiefling.
- `'warcraft'` (12): Dracthyr, Draenei, Earthen, Forsaken, Goblin, Haranir,
  Mechagnome, Pandaren, Tauren, Troll, Vulpera, Worgen.

Goblin is in Warcraft's five revised species but is **not** in the 2024 PHB's
ten, so the union is not a superset of either list.

### 6.3 Migration

`SCHEMA_VERSION` goes from 2 to 3. The migration rewrites **one field**:
`identity.accent`.

Stored sheets carry the old cold accents (a Wizard holds `#3f7bd6`), which would
sit outside the new palette. The rule is deliberately narrow:

> Rewrite `identity.accent` only when its stored value is **exactly** the old
> table default for that sheet's class. Any other value is a colour the player
> chose, and is left alone.

Everything else about the stored shape is unchanged. `types/character.ts` is not
modified in this spec, so **there is no SQL migration and no Supabase change**.

### 6.4 Seed

`demoRoster()` in `src/data/defaults.ts` gains Azeroth examples, keeping its
deterministic nested ids and fixed `DEMO_TIMESTAMP`. After changing it,
`node scripts/generate-seed.mjs` must be re-run to regenerate
`supabase/seed.sql`.

## 7. File impact

**Rewritten — the skin:**

| File | LOC | Change |
|---|---|---|
| `src/styles/global.css` | 358 | New tokens, warm ground, gold scrollbars, focus ring |
| `src/styles/screens.css` | 334 | Title, character select, login |
| `src/styles/sheet.css` | 314 | Shell, nav, panels, rows |
| `src/styles/responsive.css` | 305 | Steps the new grammar down to tablet and phone |
| `src/styles/fonts.css` | 119 | Regenerated by `fetch-fonts.sh` |

**Same API, new markup:**

`src/components/ui/controls.tsx` (338). All 11 exported functions keep their
exact signatures — `Panel`, `TextField`, `NumberField`, `SelectField`,
`TextAreaField`, `Button`, `CheckBox`, `ProficiencyPip`, `Chip`,
`OverflowMenu`, `HintBar`. Only their internal markup and class names change.
**This is what keeps the eight sections from needing a rewrite.**

**Surgical changes:**

- `src/screens/SheetScreen.tsx` — `SECTIONS` from 8 to 7, new labels and
  glyphs, keyboard regex `/^[1-8]$/` → `/^[1-7]$/`, `HintBar` text.
- `src/sections/CharacterSection.tsx` — **new**, merges `IdentitySection` and
  `AbilitiesSection`; both old files are deleted.
- `src/screens/CharacterSelect.tsx` (276) — card chrome; the carousel logic and
  keyboard handling stay.
- `src/screens/TitleScreen.tsx` (53) — new title treatment.
- `src/screens/LoginScreen.tsx` (126) — chrome only.
- `src/components/fx/Wipe.tsx` (105) — the wipe's **look** changes from a red
  diagonal to a gold sweep. Its mechanics do not: the side effect stays in the
  `reveal` `useEffect`, never in a `setState` updater, and the 1.2 s failsafe
  stays.
- `src/components/fx/Background.tsx` (8) — new ambient layer.
- `src/data/rules.ts` — §6.1, §6.2.
- `src/data/defaults.ts` — `portraitForClass()` covers 20 slugs; `demoRoster()`
  per §6.4.
- `src/lib/migrate.ts` — §6.3.
- `scripts/fetch-fonts.sh` — Cinzel and EB Garamond in, Archivo Black and Bebas
  Neue out.
- `docs/ASSET_PROMPTS.md` — rewritten, §8.

**Untouched, not one line:** `src/store/roster.ts`, `src/store/auth.ts`,
`src/lib/storage.ts`, `src/lib/supabase.ts`, `src/lib/derive.ts`,
`src/lib/keys.ts`, `src/lib/image.ts`, `src/lib/responsive.ts`,
`src/types/character.ts`, `src/App.tsx`, `src/main.tsx`,
`supabase/migrations/0001_init.sql`.

## 8. Assets

One deliverable: **`docs/ASSET_PROMPTS.md`, rewritten**. The file already exists
with a Persona 5 style bible and a working structure; the structure is kept and
the content replaced. No new scripts, no API keys, no API calls.
`scripts/generate-assets.mjs` is left exactly as it is.

The target is art that fits the campaign, not a perfect result.

### 8.1 Inventory

| Asset | Count | Path | Produced by |
|---|---|---|---|
| Filigree corners, cartouche, divider | 6 | `public/assets/ui/` | Codex chat, as SVG |
| Class portraits | 20 | `public/assets/portraits/` | ChatGPT, as images |
| Title background | 1 | `public/assets/bg-title.*` | ChatGPT, as an image |
| Stone and parchment grain | 0 files | inline SVG filters in CSS | hand-written |

Twenty portraits, not twenty-five: portraits are keyed by class **slug**, and
the five names shared between the two books (§6.1) share one portrait. A Druid
looks like a Druid in either book.

Per-class icons and per-ability icons were considered and **cut**: the portrait
already carries class identity, 25 hand-made icons are where style
inconsistency shows for the least return, and the existing glyphs inside a
gold-bordered square give the same register in CSS at no cost.

### 8.2 The two prompt kinds

The document holds **image prompts** to paste into ChatGPT, for anything
painted, and **code prompts** to paste into the Codex chat, for anything that
must be tinted from `--gold` and scale crisply.

Image prompts follow one template, filled in per class. Of all its rules only
one is functional rather than aesthetic, and it must survive every edit:

> The **bottom third** of a portrait stays dark and free of detail, because the
> app prints the character name over it.

Code prompts ask for finished SVG files written straight to their path — no
generator. Their one hard rule: `fill="none" stroke="currentColor"` and no hex
colours anywhere, so the app tints the filigree from `--gold`.

Both templates in full, ready to paste, live in `docs/ASSET_PROMPTS.md`. It also
keeps the existing section on getting images into the app, updated: replacing a
portrait's extension means editing `PORTRAIT_SLUGS` / `portraitForClass()` in
`src/data/defaults.ts` and `PORTRAIT_LIBRARY` in the new
`src/sections/CharacterSection.tsx`.

## 9. Claude Design

Before any CSS is written in the repo, the design system goes up as a
`claude.ai/design` project so it can be refined in isolation. One card per
component: typography scale, palette, frame and bevel, filigree corners, form
controls, character card, skill row, item slot, section header.

The repo's CSS is then written **from the approved cards**, not improvised.

## 10. Verification

`npm run build` — `tsc -b` in strict mode with `noUnusedLocals` and
`noUnusedParameters`, then `vite build`. It is the project's only quality gate
and it must pass.

The merge of `IdentitySection` and `AbilitiesSection` will leave dead imports;
`noUnusedLocals` catches them, which is the intended safety net.

There are no tests in this project and this spec does not add any: its
deliverable is CSS, data tables and markup. Verification is a clean typecheck
plus a visual pass against the approved Claude Design cards, on desktop, tablet
and phone widths.

Manual checks that the typecheck cannot cover:

- Every one of the 7 sections renders, on all three widths.
- Keys `1`–`7` reach their section; `Esc` exits; typing in a field is never
  hijacked (`isTyping`).
- A sheet saved before this change loads, displays, and keeps a
  player-customised accent.
- `prefers-reduced-motion` still skips the wipe.
- Sound toggle persists.

## 11. Deferred work

This spec is the first of five. The others are separately specced and planned:

| Spec | Deliverable | Why it is separate |
|---|---|---|
| 2 | **Character pane / equipment doll** — portrait with equipment slots beside the stats | Needs a slot on every inventory item: a `types/character.ts` change and a new interaction |
| 3 | **Quest log** — missions with state, objectives, rewards | New data model and new section |
| 4 | **Talents** — the visual skill menu | New data model and new section |
| 5 | **Reputation** — the book's 20+ factions and renown | New data model and new section |

Specs 2–5 all depend on spec 1's design system existing.

## 12. Open items

To revisit when the book is published on **17 November 2026**:

- Mechanical fields for the 13 Warcraft classes — every entry flagged
  `provisional: true` in `src/data/rules.ts`.
- The specialization lists, which came from secondary coverage.
- Whether hero classes starting at level 3 needs anything in the sheet beyond
  the level field already present.
- Whether species names or spellings changed from the announcements.
