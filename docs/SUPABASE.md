# Supabase: getting it running

The app works in two modes and picks one on its own:

| Mode | When | What it does |
| --- | --- | --- |
| **Local** | No `.env.local` | Saves to `localStorage`, no login. Handy for tinkering. |
| **Cloud** | There is a `.env.local` | Asks for a login and reads/writes to Supabase. |

---

## 1. Credentials

Create `.env.local` at the root (it is not committed):

```bash
VITE_SUPABASE_URL=https://dtybrsbjgatjqllsdhhi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxx
```

- **URL**: Dashboard → Settings → Data API → *Project URL*.
- **Key**: Dashboard → Settings → API Keys → the **publishable** one (`sb_publishable_…`).
  It is a key meant to live in the browser; the data is protected by RLS.
  The `secret` / `service_role` key must **never** appear in the frontend.
- The old name `VITE_SUPABASE_ANON_KEY` still works for compatibility, but
  `VITE_SUPABASE_PUBLISHABLE_KEY` wins if both are present.

Restart `npm run dev` after creating the file: Vite reads the variables at start-up.

## 2. Create the tables

Dashboard → **SQL Editor** → *New query* → paste the whole of
[`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) → *Run*.

It creates the `characters` table, its indexes, the trigger that keeps
`updated_at` current, and the RLS policies.

## 3. Example data

Two paths, whichever you prefer:

- **Automatic**: on the first sign-in with an empty table, the app seeds the
  example party (Kaelith, Brann, Nyx and Sister Maren). It only does it once;
  if you delete them later, they do not come back.
- **Manual**: run [`supabase/seed.sql`](../supabase/seed.sql) in the SQL Editor.
  It can be run several times without duplicating anything.

That file is generated from the TypeScript so there are never two copies of the
same data:

```bash
node scripts/generate-seed.mjs
```

## 4. Enable email access

Dashboard → **Authentication** → *Sign In / Providers* → **Email** enabled.

For a private table, the convenient thing is to **turn off "Confirm email"** (in
the same panel): creating an account then signs you straight in, with no
dependency on email. If you leave it on, every player will have to click the
link they receive before they can sign in, and Supabase's default sender is
limited to a few messages per hour.

The sign-in screen offers email + password and, as an alternative, a magic link
("Send me a link" button), which does need working email.

> **Once everyone has an account, turn off open sign-ups**
> (*Allow new users to sign up*). With the current permission model, anyone who
> registers in this project sees and edits every sheet.

## 5. Permission model

As requested, **all authenticated users have the same permissions**: read,
create, edit and delete *any* sheet. That is the natural thing for a party where
everybody trusts each other and the DM touches everyone's sheet.

What that implies:

- Anyone with an account in the project can modify or delete someone else's sheet.
- Without a session nothing is visible: the `anon` role has no policy at all.
- `owner_id` is still stored (who created each sheet), even though it restricts
  nothing today. It is there so permissions can be locked down without migrating data.

To lock it down later, the strict per-owner policies are at the end of
`0001_init.sql`, commented out and ready to use.

## 6. How the code is put together

```
src/lib/supabase.ts     Client and detection of whether credentials exist
src/lib/storage.ts      Read and write services (local | supabase)
src/store/auth.ts       Session: sign in, sign up, magic link, sign out
src/store/roster.ts     Party state, saving and sync status
src/screens/LoginScreen.tsx
```

Details that matter:

- **Saving is per sheet**, not per party, and with half a second of slack from
  the last keystroke. Editing two characters does not queue one save behind the other.
- **The whole sheet goes into `data` (jsonb)**. `name` and `owner_id` are
  denormalized so SQL can list and filter without opening the json. The model can
  grow (`src/types/character.ts`) without migrating columns.
- **If a save fails**, the sheet header says so and a *Retry* button appears; the
  work does not disappear from the screen. A failed delete puts the character
  back in the list.
- **The load is guarded against duplicates**: React mounts effects twice in
  development, and without that guard the example party got seeded twice.
- **Ids are real UUIDs**, so they can be the table's primary key.

## 7. What is still missing

- **Portraits in Storage.** Today an uploaded image is stored as a data-url
  inside the jsonb; it is downscaled to 1000×1400 before saving so the row does
  not blow up. The right thing would be a `portraits` bucket, storing only the URL.
- **Real time.** `supabase.channel('characters')` with `postgres_changes` would
  let the DM watch the party's Hit Points move live.
- **Games/tables.** Today there is a single party: every sheet in the database.
  If tables ever needed separating, it would take a `campaigns` table to filter by.
