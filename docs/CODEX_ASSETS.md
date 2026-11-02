# Codex art — brief for Codex (image generation + wiring)

Hand this whole file to Codex. It generates illustrations for the shared codex
(section 7: NPCs, places, factions, bestiary, items & lore), processes them, and
wires them into the app. Same workflow as the class portraits
(`docs/ASSET_PROMPTS.md` §2 post-processing step; for the codex the tool is
`scripts/process-codex-assets.py`).

## 1. Style

Follow the style bible in `docs/ASSET_PROMPTS.md` §1 (hand-painted Warcraft-register
key art, warm dark stone and antique gold palette, visible brushwork, original
designs only — never Blizzard's characters, logos or named places, never a real
artist's name). Codex-specific rules:

| Kind | Canvas | Framing | Functional rule |
|---|---|---|---|
| NPC, faction, creature, lore | 5:7 portrait | NPC / creature: chest-up three-quarter, face in the top third. Faction: a banner, crest or emblem object. Lore: the object or scene, centred. | **Bottom third dark and empty**: the app prints the name over it. |
| Place | 16:9 landscape | Establishing shot, horizon in the upper half, one clear focal landmark. | **Bottom fifth dark**: the name sits there. |

No text, letters, frames or borders inside any image. Generate at the tool's
largest size; the script crops and resizes.

## 2. Files to produce

Save each image as PNG to `tmp/imagegen_raw/codex/<kind>-<slug>.png` with exactly
these names (they match the demo codex in `src/data/defaults.ts`):

| File | Entry |
|---|---|
| `npc-sister-odila.png` | Sister Odila |
| `npc-quartermaster-hale.png` | Quartermaster Hale |
| `npc-master-corwen.png` | Master Corwen |
| `npc-aldren-the-grey.png` | Aldren the Grey |
| `place-greenwater-villages.png` | Greenwater villages |
| `place-mistport.png` | Mistport |
| `place-aldrens-tower.png` | Aldren's Tower |
| `faction-hollow-bridge-gang.png` | The Hollow Bridge Gang |
| `creature-dire-wolf.png` | Dire wolf |
| `creature-river-blight.png` | River blight |
| `lore-aldrens-grimoire.png` | Aldren's Grimoire |
| `lore-greenwater-fever.png` | The Greenwater fever |

## 3. Prompts

Every prompt starts with this shared prefix:

> Hand-painted digital fantasy illustration in a heroic MMORPG key-art register, visible brushwork, richly rendered, warm dark stone and antique gold palette with one saturated accent colour, dramatic warm key light and a coloured rim light, atmospheric depth, original design, no text, no frame, no border.

Then, per file:

- **npc-sister-odila** — Portrait 5:7. A middle-aged human healer nun in plain green-grey robes with a worn leather apron of herb pouches, kind tired eyes, sleeves rolled up, holding a glass vial of murky river water up to candlelight. Background: an old granary turned infirmary, out of focus. Accent colour: muted river green. Chest-up, face in the upper third, bottom third falls into shadow.
- **npc-quartermaster-hale** — Portrait 5:7. A stocky weathered quartermaster in a salt-stained blue coat with brass buttons, ledger under one arm, quill behind his ear, suspicious squint. Background: wagons and crates at a misty harbour gate, out of focus. Accent: naval blue. Chest-up, bottom third dark.
- **npc-master-corwen** — Portrait 5:7. An elderly scholar-mage with a long white beard braided with silver rings, round spectacles, violet-trimmed robes, a raven on his shoulder holding a torn parchment page. Background: shelves of books by firelight. Accent: violet. Chest-up, bottom third dark.
- **npc-aldren-the-grey** — Portrait 5:7. A gaunt grey-robed wizard half-dissolved into drifting grey mist and loose floating pages, face mostly hidden by a deep hood, one pale glowing eye visible. Background: a dark tower window. Accent: cold pale blue. Chest-up, bottom third fades into mist.
- **place-greenwater-villages** — Landscape 16:9. Rolling farmland along a slow, unnaturally green river at dusk, thatched hamlets, a ford with stepping stones, an abandoned watermill upstream with a sickly green glow on the water. Accent: sickly green. Bottom fifth dark meadow.
- **place-mistport** — Landscape 16:9. A harbour city on sea cliffs wrapped in fog, a lighthouse beam cutting through, tall ships at anchor, stone quays, storm clouds gathering on the horizon. Accent: storm blue. Bottom fifth dark water.
- **place-aldrens-tower** — Landscape 16:9. A lone sealed stone tower on a crag above a valley at night, no door at its base, ravens circling, a single faint light in the topmost window. Accent: pale violet. Bottom fifth dark rocks.
- **faction-hollow-bridge-gang** — Portrait 5:7. A ragged bandit banner nailed to the arch of an old stone bridge: a crude painted hollow circle crossed by two crossbow bolts, torn edges, coins nailed around it. Background: river mist under the arch. Accent: rust red. Object centred in the top two thirds, bottom third dark.
- **creature-dire-wolf** — Portrait 5:7. A huge grey dire wolf snarling, hackles raised, inside a ruined watermill, moonlight through broken beams, breath steaming. Accent: cold moonlight blue. Head and shoulders in the top two thirds, bottom third dark.
- **creature-river-blight** — Portrait 5:7. A translucent green ooze rising out of a river like a wave with a vaguely face-like hollow, small fish and reeds suspended inside it, oily sheen. Accent: toxic green. Upper two thirds, bottom third dark water.
- **lore-aldrens-grimoire** — Portrait 5:7. A few loose, scorched grimoire pages floating in a spiral, glowing violet runes, a single raven feather among them, raindrops frozen in the air. Accent: violet. Centred in the top two thirds, bottom third dark.
- **lore-greenwater-fever** — Portrait 5:7. A close still life: a pale hand with green-tinged fingernails resting beside a bowl of green river water and wilted healing herbs, candlelight. Accent: sickly green. Top two thirds, bottom third dark.

## 4. Process and wire up

Prerequisite: Python 3 with Pillow 9.1 or newer, built with WebP support
(`pip install pillow`; on Windows the command may be `py` instead of `python`).

In the repo root:

```bash
python scripts/process-codex-assets.py
```

1. Paste the printed lines into `CODEX_GALLERY` in `src/data/codexGallery.ts`, skipping
   any line already there. The labels are made from the file slug, so fix any label that
   lost an apostrophe or a leading "The" to match the entry's name (for example
   "Aldren's Tower" and "The Hollow Bridge Gang").
2. In `demoCodex()` (`src/data/defaults.ts`), give each demo entry its image: change
   the `entry()` helper's parameter type from
   `Omit<CodexEntry, 'id' | 'image' | 'createdAt' | 'updatedAt'>` to
   `Omit<CodexEntry, 'id' | 'image' | 'createdAt' | 'updatedAt'> & { image?: string }`
   and its body from `image: null` to `image: e.image ?? null`, then add
   `image: 'assets/codex/npc-sister-odila.webp'` (and so on, per the table in §2) to
   each `entry(...)` call.
3. Run `node scripts/generate-seed.mjs`, `node scripts/check-codex.mjs` and
   `npm run build`; all must pass.
4. Open the app (`npm run dev`), section 7: every demo card shows its art, faces are
   not cut by the name, place bands read well at 21:8 on the page.
5. Commit the WebP files, `codexGallery.ts`, `defaults.ts` and `supabase/seed.sql`
   (never `tmp/`).

Existing cloud databases keep their demo rows as they were (`on conflict do
nothing`); the art shows there by editing an entry and picking it from Gallery.
