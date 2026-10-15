# Asset generation guide (ChatGPT images + Codex chat SVG)

The app's look is a World of Warcraft menu: warm dark stone, three-tone antique gold,
filigree, Cinzel / EB Garamond / Barlow Condensed. What it still needs is **art**:
rich, evocative, game-quality key art in the portrait cards and on the title screen,
plus a handful of gold filigree pieces. This guide holds every prompt needed.

- **Images** go to ChatGPT (sections 3 to 5).
- **Code** (the filigree SVGs) goes to the Codex chat (section 6).
- No scripts and no API keys: raster art is non-reproducible by nature and is committed
  as an artifact.

---

## 1. Style bible

Hand-painted key art in the Warcraft register: the look of a loading screen or a class
poster. Original work only: never reproduce Blizzard's art, characters, logos or icons,
and never name a real artist in a prompt.

| Axis | Decision |
| --- | --- |
| Technique | Hand-painted digital illustration with **visible brushwork**. Painterly, richly rendered, not a 3D render, not photorealism, not flat vector. |
| Mood | Warm, heroic, larger than life. A hero caught mid-legend, not a catalogue pose. |
| Light | Warm key light from one side, a cool or coloured rim light in the class colour, glowing magic or metal highlights. Strong value contrast so the silhouette reads. |
| Palette | Warm dark stone (`#1a1512`, `#241d18`, `#30261f`), antique gold (`#c8a84f`, highlight `#e8d08a`, shadow `#8a6d2f`), parchment (`#e8dcc0`) and **one** class colour as the dominant saturated accent (table in section 4). |
| Background | Evocative but out of focus and secondary: a hint of ruined arch, forge glow, forest canopy, storm sky, with atmosphere and floating embers or motes. Never a busy, sharp landscape competing with the figure. |
| Framing | Waist-up or chest-up three-quarter hero shot, character turned slightly, strong silhouette, a dynamic gesture, weapon or magic in the frame, all kept in the top two thirds of the canvas. |
| Detail | Ornate gear: engraved metal, worn leather, cloth folds, gold trim, runes. Rich material rendering. |

**Rules**

- **Functional rule (the layout depends on it):** the **bottom third** of the image stays
  dark and free of detail. The app prints the character name over it. So the figure is
  framed waist-up in the top two thirds and fades into shadow or mist; nothing at foot
  level (ground effects, roots, water, companions, leaping poses).
- Aesthetic: a dynamic pose, body slightly off vertical.
- Never name Blizzard races, characters, factions or locations in a prompt: describe
  the look generically (original design).
- If the silhouette does not read when the image is shrunk to 130 px wide, the image is
  no good.
- No text, letters, logos, borders or frames inside the image.

---

## 2. Technical specs

| Use | Ratio | Size | Format | Destination |
| --- | --- | --- | --- | --- |
| Character portrait | 5:7 vertical | 1000 × 1400 px | WebP or PNG, under 300 KB | `public/assets/portraits/<slug>.<ext>` |
| Title screen background | 16:9 | 2560 × 1440 px | WebP or PNG | `public/assets/bg-title.<ext>` |
| Filigree (code, section 6) | SVG | see section 6 | SVG | `public/assets/ui/` |

- Leave an **8 % safe margin** on every side: the card is clipped at the corners, and
  the margin also absorbs the crop below.

#### Post-step: crop to the exact ratio

ChatGPT usually returns 2:3 or 1:1 (3:2 or 1:1 for landscape), not 5:7 or 16:9.
After generating, **centre-crop to exactly 5:7, resize to 1000×1400 and compress to under
300 KB** (title background: crop to exactly 16:9, resize to 2560×1440; upscale if the
source is smaller). The safe margin and the dark bottom third mean a centre crop loses
nothing important.

`scripts/process_generated_portraits.py` does the crop and resize (centre crop, Lanczos
to 1000×1400, writes `public/assets/portraits/<slug>.png`) but it is **legacy**: its
source paths are hard-coded and it then quantizes to the old four-colour Persona palette,
which would ruin painted art. Do not run it as is. Use it only as a reference, or this
Pillow snippet (needs Python + Pillow):

```python
from PIL import Image
im = Image.open("in.png").convert("RGB")
w, h = im.size
tw = round(h * 5 / 7)                      # target width for 5:7
if tw <= w:
    l = (w - tw) // 2; im = im.crop((l, 0, l + tw, h))
else:
    th = round(w * 7 / 5); t = (h - th) // 2; im = im.crop((0, t, w, t + th))
im.resize((1000, 1400), Image.LANCZOS).save("out.webp", quality=82, method=6)
```

Lower `quality` until the file is under 300 KB.

---

## 3. Base prompt template (fill in the `[brackets]`)

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy
MMO class poster, original design.

SUBJECT: a [species] [class] — [distinctive physical traits], wearing [ornate
armor or robes with specific materials and gold trim], wielding [characteristic
weapon, spell or relic]. Expression: [attitude]. Dynamic [gesture].

COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking
at the viewer, strong readable silhouette. The figure and every weapon, spell effect
or companion sit in the top two thirds of the canvas and fade into deep shadow or soft
mist before the bottom third, which stays dark and free of detail (no feet, ground
effects or props there).

LIGHT AND COLOR: warm key light from one side, [class colour] as the dominant
saturated accent in magic, cloth and rim light, antique gold highlights on the
metalwork, warm dark stone and umber shadows. Floating embers or motes.

BACKGROUND: out-of-focus [evocative setting], atmospheric depth, secondary to the
figure.

STYLE: hand-painted digital illustration, visible brushwork, rich material
rendering, painterly highlights, warm heroic mood.

NO text, letters, logos, watermark, border, frame or signature.
```

Negative prompt, if the tool takes one:

```
photorealism, 3D render, flat vector, anime, chibi, pastel colors, text, letters,
logos, watermark, border, frame, signature, deformed hands, busy sharp background,
full-body framing, landscape orientation, copyrighted characters
```

---

## 4. Class colours and files

Use exactly these codes: they tint the menu when a character is selected
(`src/data/rules.ts`). **Twenty classes, twenty portraits.** Five class names exist in
both books (Druid, Monk, Paladin, Rogue, Warlock) and share **one** portrait each; for
those, the prompt names both colours and asks for the Warcraft colour as the main
accent with the PHB colour as the secondary one, so the art still suits either sheet.

| Class | Colour | Slug | Notes |
| --- | --- | --- | --- |
| Barbarian | `#c4452f` | `barbarian` | PHB 2024 |
| Bard | `#c4598a` | `bard` | PHB 2024 |
| Cleric | `#e8c15a` | `cleric` | PHB 2024 |
| Druid | WoW `#ff7c0a` / PHB `#4f9e57` | `druid` | shared |
| Fighter | `#b9411f` | `fighter` | PHB 2024 |
| Monk | WoW `#00ff98` / PHB `#3f9ea8` | `monk` | shared |
| Paladin | WoW `#f48cba` / PHB `#dcae3c` | `paladin` | shared |
| Ranger | `#5a8f5c` | `ranger` | PHB 2024 |
| Rogue | WoW `#fff468` / PHB `#6f78bd` | `rogue` | shared |
| Sorcerer | `#d9663f` | `sorcerer` | PHB 2024 |
| Warlock | WoW `#8788ee` / PHB `#8257c4` | `warlock` | shared |
| Wizard | `#5b7fc4` | `wizard` | PHB 2024 |
| Death Knight | `#c41e3a` | `death-knight` | Warcraft only |
| Demon Hunter | `#a330c9` | `demon-hunter` | Warcraft only |
| Evoker | `#33937f` | `evoker` | Warcraft only |
| Hunter | `#aad372` | `hunter` | Warcraft only |
| Mage | `#3fc7eb` | `mage` | Warcraft only |
| Priest | `#ffffff` | `priest` | Warcraft only |
| Shaman | `#0070dd` | `shaman` | Warcraft only |
| Warrior | `#c69b6d` | `warrior` | Warcraft only |

---

## 5. The 21 ready-to-paste prompts

Paste each block into ChatGPT as is. Every one follows the template of section 3 and
keeps the bottom third dark. Then run the section 2 post-step and save the result as
`public/assets/portraits/<slug>.<ext>`.

**Consistency:** generate all 20 in a **single chat**, and once the first portrait is
accepted attach it as the style reference ("match this painting style, brushwork and
lighting") for every later one.

**Class colour vs gold:** when a class colour sits close to antique gold (Cleric, Paladin
secondary, Rogue, Warrior), keep it visibly distinct from the gold highlights by putting
the class colour in cloth, glow and rim light, and the gold only on the metalwork.

### Barbarian — barbarian.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a towering goliath barbarian woman with grey mottled skin, shaved head with painted tribal marks, furs and bone pauldrons, scarred forearms, a huge two-handed greataxe resting on her shoulder. Expression: ferocious, roaring. Dynamic gesture: mid-war-cry, free fist clenched.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm firelight key from one side, brick red #c4452f as the dominant saturated accent in war paint, cloth and rim light, antique gold highlights on the axe and trinkets, warm dark stone and umber shadows. Floating embers.
BACKGROUND: out-of-focus burning battlefield under a smoky red sky, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Bard — bard.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a charismatic half-elf bard, braided auburn hair, a roguish smile, a plumed hat, embroidered velvet coat with gold thread, a lute with a carved scroll head in one hand, the other hand raised conducting glittering notes of light. Expression: confident, playful. Dynamic gesture: mid-flourish, a bow to the audience.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm stage-lantern key light from one side, rose #c4598a as the dominant saturated accent in the coat, magical notes and rim light, antique gold highlights on the lute fittings and buttons, warm dark stone and umber shadows. Drifting golden motes.
BACKGROUND: out-of-focus tavern hall with hanging lanterns and a cheering crowd, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Cleric — cleric.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a dwarf cleric with a braided silver beard, polished plate armor over a white tabard, a heavy warhammer and a glowing holy symbol on a chain, one hand open and radiating healing light. Expression: serene, resolute. Dynamic gesture: hand raised in blessing.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm golden divine light from above and one side, pale lemon-yellow #e8c15a as the dominant saturated accent in the healing glow, tabard cloth and rim light (keep it distinct from the gold: the antique gold highlights are only on the armor engraving), warm dark stone and umber shadows. Floating motes of light.
BACKGROUND: out-of-focus cathedral nave with shafts of light through high windows, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Druid — druid.png (shared)

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a wild druid with antlered headdress, weathered face, moss-green and leather robes woven with leaves, a gnarled oak staff crowned with living branches, a spectral stag spirit curling around the shoulders. Expression: calm and ancient. Dynamic gesture: staff planted, vines and leaves swirling around the staff head and shoulders.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm dappled sunlight key from one side, burnt orange #ff7c0a as the main accent in the spirit glow, autumn leaves and rim light, with forest green #4f9e57 as the secondary accent in the robes and foliage, antique gold highlights on the antler tips and staff bindings, warm dark stone and umber shadows. Drifting leaves and fireflies.
BACKGROUND: out-of-focus ancient grove with giant trunks and golden haze, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Fighter — fighter.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a battle-scarred human fighter in dented plate armor with a red cloak, a longsword raised and a heater shield with a worn crest on the other arm, short cropped hair and a stubbled jaw. Expression: determined, unshaken. Dynamic gesture: shoulder forward, sword leading across the frame.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm low sunlight key from one side, rust red #b9411f as the dominant saturated accent in the cloak and rim light, antique gold highlights on the pauldron rivets and sword guard, warm dark stone and umber shadows. Sparks and dust.
BACKGROUND: out-of-focus castle gatehouse with banners in smoke, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Monk — monk.png (shared)

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a lean monk with a shaved head or a topknot, simple cloth wraps and a sash, bare wrapped fists, ki flowing as luminous ribbons around the arms. Expression: focused, tranquil. Dynamic gesture: a fighting stance, one palm forward, one fist drawn back.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm sunrise key light from one side, jade green #00ff98 as the main accent in the ki ribbons and rim light, with teal #3f9ea8 as the secondary accent in the sash and mist, antique gold highlights on the wrist bands and prayer beads, warm dark stone and umber shadows. Floating petals.
BACKGROUND: out-of-focus mountain temple with stone steps and drifting mist, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Paladin — paladin.png (shared)

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a noble human paladin in gleaming ornate plate with a sunburst on the breastplate, a flowing white tabard, a mace crackling with holy light and a kite shield engraved with a radiant sigil, a halo of light behind the head. Expression: righteous, steadfast. Dynamic gesture: weapon lifted toward the sky, cape billowing.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm golden holy light key from above and one side, pink #f48cba as the main accent in the cape lining, glow and rim light, with amber #dcae3c as the secondary accent in the tabard and glow (keep it in cloth and light, distinct from the antique gold highlights, which stay on the metalwork), warm dark stone and umber shadows. Floating motes of light.
BACKGROUND: out-of-focus cathedral and sky breaking through storm clouds, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Ranger — ranger.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a wood elf ranger with a hooded forest-green cloak, leather vambraces, a longbow drawn with an arrow nocked, a quiver of fletched arrows and a hawk perched on the shoulder. Expression: alert, predatory focus. Dynamic gesture: bow fully drawn, eyes along the arrow.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm slanting forest sunlight key from one side, sage green #5a8f5c as the dominant saturated accent in the cloak and rim light, antique gold highlights on the bow fittings and clasp, warm dark stone and umber shadows. Floating pollen and leaves.
BACKGROUND: out-of-focus deep forest with tall trunks and golden haze, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Rogue — rogue.png (shared)

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a tiefling rogue woman with curved horns and a visible tail, a dark hood pulled low, a half-smile, two curved daggers crossed at the chest, a coin spinning in the air from one hand, a leather harness with buckles and pouches. Expression: mocking, sly. Dynamic gesture: stepping out of shadow, blades ready.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm lantern key light from one side, bright yellow #fff468 as the main accent in the spinning coin, dagger glints and rim light, with indigo #6f78bd as the secondary accent in the hood shadows and cloth (keep the yellow in the coin, glints and rim light, distinct from the antique gold highlights, which stay on the buckles), warm dark stone and umber shadows. Drifting dust.
BACKGROUND: out-of-focus rooftops and alley at dusk, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Sorcerer — sorcerer.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a young dragonborn sorcerer with bronze scales, flame-coloured eyes and a short torn-hem coat with ember embroidery, both hands wreathed in swirling raw magic that coils up the arms. Expression: wild, exhilarated. Dynamic gesture: arms flung open, power erupting.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm magical light from the hands as the key, orange-red #d9663f as the dominant saturated accent in the flames and rim light, antique gold highlights on the scales and jewellery, warm dark stone and umber shadows. Swirling embers.
BACKGROUND: out-of-focus ruined hall with arches lit by distant lightning, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Warlock — warlock.png (shared)

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a gaunt human warlock in layered dark robes with sigil-stitched cuffs, glowing eyes, a curved pact-blade and a floating grimoire chained shut, a looming spectral patron with horns and many eyes behind the shoulders. Expression: cold, bargain-sealed smile. Dynamic gesture: one hand open with a crackling sigil hovering over the palm.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm candle key light from one side against a cold magical glow, soft periwinkle violet #8788ee as the main accent in the spectral patron and rim light, with deep purple #8257c4 as the secondary accent in the robes and sigils, antique gold highlights on the chains and clasps, warm dark stone and umber shadows. Floating ash and sparks.
BACKGROUND: out-of-focus ritual chamber with runic circle and candles, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Wizard — wizard.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a middle-aged elf wizard, white hair tied back, a burn scar at the temple, a long high-collared robe with stitched runes, an open levitating spellbook sparking with arcane glyphs and a tall staff with a crystal. Expression: serene, arrogant. Dynamic gesture: free hand conjuring a ring of floating runes.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm candle-and-book key light from one side, arcane blue #5b7fc4 as the dominant saturated accent in the runes, robe and rim light, antique gold highlights on the staff fittings and robe trim, warm dark stone and umber shadows. Floating glyphs and motes.
BACKGROUND: out-of-focus wizard's library with towering shelves and a round window, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Death Knight — death-knight.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a grim undead knight in spiked, rune-etched black plate armor, a hollow helm with pale glowing eyes, a tattered cloak and a massive runic greatsword wreathed in frost and blood-red light. Expression: grim, unyielding. Dynamic gesture: blade dragged forward, frost trailing.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: cold moonlight key from one side warmed by the forge-red glow of the runes, crimson #c41e3a as the dominant saturated accent in the runes, cloak lining and rim light, antique gold highlights on the armor edges, warm dark stone and umber shadows. Drifting frost and ash.
BACKGROUND: out-of-focus frozen ruins under a bruised sky, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Demon Hunter — demon-hunter.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a horned, grey-skinned demon-blooded hunter in a hooded cowl, glowing green-lit eyes, a scarred lean torso with tattoos under a leather harness, a pair of curved single-edged blades held crossed, violet-edged shadow flame licking the steel, torn wings half open behind. Expression: fierce, relentless. Dynamic gesture: blades spread wide.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm firelight key from one side with a violet rim light, vivid purple #a330c9 as the dominant saturated accent in the glow, tattoos and wings, antique gold highlights on the glaive guards and harness, warm dark stone and umber shadows. Flying sparks.
BACKGROUND: out-of-focus demon-scarred cliffs under a burning sky, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Evoker — evoker.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a horned dragon-kin, a scaled humanoid with elegant swept-back horns and a long tail, glimmering teal scales, a short ornate tabard and bracers, wings half unfurled, hands channelling a spiraling stream of bronze and teal draconic magic. Expression: composed, regal. Dynamic gesture: arms sweeping the magic into a ring.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm sunlit key from one side, teal-jade #33937f as the dominant saturated accent in the scales, magic and rim light, antique gold highlights on the horns' tips and bracers, warm dark stone and umber shadows. Floating glimmering motes.
BACKGROUND: out-of-focus dragon-temple terraces with sky and drifting clouds, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Hunter — hunter.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a tusked tribal hunter with blue-grey skin and a high mohawk, tribal leathers and feathered pauldrons, a long rifle or recurve bow across the body, a loyal great cat companion whose head and shoulders rise at the character's side, within the upper two thirds, with glowing eyes. Expression: confident, predatory grin. Dynamic gesture: taking aim.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm jungle sunlight key from one side, leaf green #aad372 as the dominant saturated accent in the feathers, leaf shadows and rim light, antique gold highlights on trinkets and arrow fittings, warm dark stone and umber shadows. Floating spores and leaves.
BACKGROUND: out-of-focus ruined jungle temple with hanging vines, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Mage — mage.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a sharp-eared elf mage with slicked golden hair, high-collared deep indigo-and-silver arcane robes, a luminous staff and a floating orb of frost and fire spiralling together between the hands. Expression: poised, scholarly pride. Dynamic gesture: weaving the orb into a sigil.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm firelight key from one side against a cold magical glow, icy cyan #3fc7eb as the dominant saturated accent in the frost, runes and rim light, antique gold highlights on the robe embroidery and staff head, warm dark stone and umber shadows. Floating snowflakes and sparks.
BACKGROUND: out-of-focus arcane spire hall with floating crystals, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Priest — priest.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a tall blue-skinned horned priest with luminous eyes, a faintly glowing crystal circlet, flowing white and gold vestments with long sleeves, a radiant staff and an open hand releasing a column of light, wings of light faintly behind. Expression: gentle, certain. Dynamic gesture: hand raised, light descending.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm golden light as the key from above, pure white #ffffff holy light as the dominant accent in the glow and rim light, antique gold highlights on the vestment embroidery and staff, warm dark stone and umber shadows so the white reads against a darker ground. Floating motes of light.
BACKGROUND: out-of-focus crystal sanctuary with towering arches and shafts of light, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Shaman — shaman.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a hulking bovine-featured nature priest with broad curved horns, carved totems hung from the belt, feathered shoulder wraps and painted tribal markings, a totem staff topped with a skull-and-feather focus, lightning crackling between the hands and a swirl of water and wind curling around the raised arms. Expression: deep, reverent calm. Dynamic gesture: arms raised calling the storm.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm sunset key from one side, electric royal blue #0070dd as the dominant saturated accent in the lightning, water and rim light, antique gold highlights on the totem carvings and beads, warm dark stone and umber shadows. Drifting rain and sparks.
BACKGROUND: out-of-focus mesa plains under a gathering thunderstorm, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Warrior — warrior.png

```
A hand-painted fantasy key-art portrait in the register of a heroic high-fantasy MMO class poster, original design.
SUBJECT: a broad-shouldered orc warrior with green skin, tusks, braided hair and war-scarred plate with spiked pauldrons, an enormous battle axe in one hand and a dented shield in the other, a tattered banner behind. Expression: defiant, roaring. Dynamic gesture: roaring, axe cocked back over the shoulder.
COMPOSITION: vertical 5:7, waist-up three-quarter view, body turned slightly, looking at the viewer, strong readable silhouette. The figure and every weapon, spell effect or companion sit in the top two thirds of the canvas and fade into deep shadow or soft mist before the bottom third, which stays dark and free of detail (no feet, ground effects or props there).
LIGHT AND COLOR: warm low sunset key from one side, bronze-tan #c69b6d as the dominant accent in the leather, banner cloth and rim light (keep it distinct from the gold: antique gold highlights only on the pauldron metal edges), warm dark stone and umber shadows. Dust and embers.
BACKGROUND: out-of-focus battlefield with banners and smoke, atmospheric depth.
STYLE: hand-painted digital illustration, visible brushwork, rich material rendering, painterly highlights, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature.
```

### Title background — bg-title.png (16:9, 2560×1440)

```
A hand-painted fantasy key-art landscape for a game title screen, original design, in the register of a heroic high-fantasy MMO loading screen.
SCENE: a vast ruined citadel on a cliff at dusk, towering carved stone arches with weathered gold inlay, a winding stair rising toward a glowing gate, distant mountains and a sky of warm amber breaking into storm clouds, a lone adventurer's silhouette small in the foreground for scale.
COMPOSITION: horizontal 16:9, 2560x1440, wide cinematic composition with depth layers (foreground rocks, midground citadel, distant peaks). The centre third stays calm and dark: the app overlays the logo and menu there, so keep the middle band low in detail and contrast.
LIGHT AND COLOR: warm golden-hour key light from the right, antique gold #c8a84f highlights on the stonework, warm dark stone and umber shadows, a few touches of arcane teal and ember orange in the sky. Floating embers, motes and drifting banners.
STYLE: hand-painted digital illustration, visible brushwork, atmospheric depth, rich material rendering, warm heroic mood.
NO text, letters, logos, watermark, border, frame or signature, no recognisable copyrighted locations or characters.
```

---

## 6. Filigree: the code prompt (Codex chat)

Paste this into the Codex chat. It writes six finished SVG files straight into
`public/assets/ui/`.

```
Write six finished SVG files directly into public/assets/ui/ in this repo:

  frame-corner-tl.svg   viewBox="0 0 64 64"   top-left ornate frame corner
  frame-corner-tr.svg   viewBox="0 0 64 64"   top-right
  frame-corner-bl.svg   viewBox="0 0 64 64"   bottom-left
  frame-corner-br.svg   viewBox="0 0 64 64"   bottom-right
  header-cartouche.svg  viewBox="0 0 320 48"  ornamental header plate with a central
                                              cartouche flanked by scrolling filigree
  divider-rule.svg      viewBox="0 0 320 12"  a thin divider rule with a small
                                              central ornament and tapering ends

HARD RULE: every shape uses fill="none" stroke="currentColor" and there must be NO
hex colours anywhere (no #rrggbb, no rgb(), no named colours). Each file's root
element carries xmlns="http://www.w3.org/2000/svg" and its viewBox.

Also:
- No <text> elements, no <filter>, no <style>, no inline style="" attributes, no
  gradients, no embedded images.
- Use only simple paths, circles, lines and polylines with stroke-linecap="round"
  and stroke-linejoin="round" and a consistent stroke-width (about 1.5 on the
  64-unit corners, about 1.25 on the long files).
- Path data uses ABSOLUTE commands only (M L H V C Z): no arcs (A/a) and no relative
  (lowercase) commands, so the mirrors are exact coordinate transforms.
- The four corners must be EXACT mirrors of each other: draw the top-left, then
  derive the others by mirroring the coordinates (x -> 64 - x for the right side,
  y -> 64 - y for the bottom), not by hand-redrawing.
- Style: Warcraft-register high-fantasy ornament: scrolling vines, small leaf and
  scale motifs, beaded dots, stepped bevels, a small gem or diamond at the centre.
- The designs must be ORIGINAL work. Never reproduce Blizzard's own icons, frames
  or art.
- Keep each file small and readable, with a short comment-free body. Report the
  file sizes when done.
```

The app uses these files as CSS **masks**: only the alpha matters, and the colour comes
from `background-color: var(--gold)` on the masked element. (`currentColor` keeps them
tintable if they are ever inlined instead.) The current CSS inlines a corner as a mask
data-URI in `sheet.css` / `screens.css`, so once the files exist the CSS can switch to
`mask-image: url(assets/ui/frame-corner-tl.svg)`.

**Check when swapping:** the current inline corner masks use a **48-unit** viewBox, the
new corners are **64**. Review `mask-size` and `mask-position` in `sheet.css`,
`screens.css` (currently `clamp(44px, 5vw, 64px) auto`) and `responsive.css` (26px, 22px
and 32px variants), because the same pixel size now draws a different ornament scale and
stroke weight.

---

## 7. How to get the images into the app

There is now **one place to edit**: the exported `CLASS_PORTRAITS` map in
`src/data/defaults.ts`. The class picker in the Character section (`PORTRAIT_LIBRARY` in
`src/sections/CharacterSection.tsx`) is derived from it automatically.

Current state: the twelve PHB classes point to provisional `.png` files you generated,
the eight Warcraft-only classes (Death Knight, Demon Hunter, Evoker, Hunter, Mage,
Priest, Shaman, Warrior) point to code-generated `.svg` emblems from
`scripts/generate-assets.mjs`, and the fallback is `default.svg`
(`DEFAULT_PORTRAIT`).

1. Save the new image in `public/assets/portraits/` with the slug from section 4.
2. If the extension changes (for example `.svg` to `.webp`), edit that class's line in
   `CLASS_PORTRAITS`. Paths stay **relative** (`assets/portraits/…`, no leading slash).
3. Crop and compress generated images as described in the section 2 post-step.
   `scripts/process_generated_portraits.py` is legacy (hard-coded sources, four-colour
   Persona palette quantization): do not run it on painted art.
4. For the portrait of one specific character (not a class), no code change is
   needed: on the sheet, section **Character → Portrait → Upload**. The image is
   stored as a data-url next to the character.
5. Title background: save as `public/assets/bg-title.<ext>` and reference it from the
   title screen CSS.

> Once Supabase is connected, the upload button will send the file to a Storage
> bucket and store only the public URL. See `docs/SUPABASE.md`.

---

## 8. Checklist before calling an image done

- [ ] The silhouette reads at 130 px wide.
- [ ] The bottom third is dark and free of detail (the name covers it).
- [ ] One dominant class colour; the gold stays the supporting colour.
- [ ] No text, logo, frame or copyrighted character inside the image.
- [ ] Exactly 5:7, 1000×1400 and under 300 KB.
