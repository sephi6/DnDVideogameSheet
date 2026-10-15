# ARCANA — D&D 2024 character sheets with a video-game menu

Web app for the players at a **Dungeons & Dragons 2024** table to keep their
character sheets. The point is not the sheet: it is **moving through it like a
video-game menu** with a World of Warcraft look: stone, gold filigree and
cartouches, a gold sweep between screens, warm menu blips and keyboard
navigation.

```bash
npm install
npm run dev      # http://localhost:5173
```

## Status

Full sheet, login and persistence on **Supabase** all working. With no
credentials configured the app still boots in local mode (`localStorage`, no
login), so it can be cloned and tried out without setting anything up.

To connect it to Supabase: [`docs/SUPABASE.md`](docs/SUPABASE.md) — three steps
(credentials in `.env.local`, run the migration, enable email access).

To publish it on Cloudflare Workers: [`docs/DEPLOY.md`](docs/DEPLOY.md).

> With the current permission model **every registered user sees and edits every
> sheet**. That is what a table wants; it is worth closing open sign-ups once the
> whole group has an account.

## How to use it

| Screen | Keys |
| --- | --- |
| Title | any key |
| Character select | `←` `→` switch · `Enter` open · `N` new |
| Sheet | `↑` `↓` navigate · `1`–`8` go to section · `Esc` back |

The mouse works just as well; the keyboard is there so it feels like a gamepad.

The eight sections of the sheet: **Character, Skills, Combat, Spellbook, Bags,
Features, Journal and Quests**. Everything is editable and saves itself
(there is a "Saved" indicator in the header). Each character has its own
**accent color**, which tints the whole menu when selected.

The **Quests** section is a log shared by the whole party and updated live: group and
personal quests with ordered objectives, rewards and per-character tracking, plus a
tracker that follows you through the other sections (the live part needs Supabase).

## 2024 rules already covered

- Proficiency Bonus by level and proficiency/**expertise** in skills and saving throws.
- **Heroic Inspiration** and **Exhaustion** levels (−2 to D20 Tests and −5 feet of Speed per level).
- **Weapon masteries** on every attack.
- Spell slots worked out per class (full caster, half caster and the Warlock's **Pact Magic**).
- 25 classes (the 12 of the 2024 PHB plus 13 Warcraft ones, whose mechanics are
  provisional), 22 species and the 16 backgrounds of the 2024 PHB.
- Feet and pounds throughout: Speed, ranges, item weights and Carrying Capacity
  (Strength × 15 lb.).

## Structure

```
src/
├── data/rules.ts        Rules data (classes, skills, spell slots…)
├── data/defaults.ts     Character factory and example party
├── types/character.ts   Sheet model (serialized as-is to Supabase)
├── lib/derive.ts        Derived values (modifiers, DC, initiative…)
├── lib/quests.ts        Pure quest rules (difficulty, membership, progress)
├── lib/questStorage.ts  Quest persistence and Realtime (local | supabase)
├── lib/sfx.ts           Menu sounds synthesized with WebAudio (no assets)
├── lib/supabase.ts      Supabase client and credential detection
├── lib/storage.ts       Read and write services (local | supabase)
├── lib/image.ts         Downscaling of uploaded portraits
├── store/auth.ts        Session: sign in, sign up, magic link, sign out
├── store/roster.ts      Party state, per-sheet saving and sync status
├── store/quests.ts      Shared quest log: per-row writes, Realtime merge
├── screens/             Title · Sign in · Character select · Sheet
├── sections/            The eight editable sections
└── styles/              Tokens and look (self-hosted fonts)
```

## Assets

The portraits in `public/assets/portraits/` are **provisional emblems generated
by code** (`node scripts/generate-assets.mjs`). They are meant to be replaced by
illustrations made with ChatGPT: the detailed instructions —style bible, prompts,
sizes and per-class colors— are in
[`docs/ASSET_PROMPTS.md`](docs/ASSET_PROMPTS.md).

The fonts (Cinzel, EB Garamond, Barlow Condensed — all OFL) are
self-hosted in `public/fonts/`; `scripts/fetch-fonts.sh` regenerates them.

## Next steps

1. Real portraits made with the prompt guide.
2. Upload the portraits to Supabase Storage instead of storing them in the jsonb.
3. Real time: let the DM watch the party's Hit Points move live.
4. Import a sheet from JSON (export already works, in the sheet header).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Type check + production build |
| `npm run preview` | Serves the build |
| `npm run typecheck` | Types only |
| `node scripts/generate-seed.mjs` | Regenerates `supabase/seed.sql` from the TypeScript |
| `node scripts/check-quests.mjs` | Assertions over the quest rules |
| `node scripts/generate-assets.mjs` | Regenerates the provisional portraits |
