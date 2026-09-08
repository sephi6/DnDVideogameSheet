# Deploying to Cloudflare Workers

ARCANA is published as a static site on **Cloudflare Workers** (static assets) with
**Git integration**: every `push` to `main` builds and publishes a new version; every
Pull Request gets its own preview URL.

> **Historical note:** this document used to describe Cloudflare *Pages*. The real
> project (`dndvideogamesheet`) was created as a **Worker**, which is what Cloudflare
> offers by default for new sites today. The differences that matter are marked below.

> **On "making the code impossible to download":** a SPA is 100 % client-side code. The
> browser can always download and read the bundle; that cannot be prevented and is not a
> bug. What is done instead: the build is minified and **without source maps**,
> `console`/`debugger` are stripped, and Cloudflare serves a strict CSP. Supabase's
> **publishable key** travels in the bundle **on purpose**; the data is protected by
> **RLS + closed sign-ups**, not by hiding the code.

---

## 1. Harden Supabase (before the first deploy)

1. **SQL Editor** → if it is not done yet: run `supabase/migrations/0001_init.sql` and,
   if you want the example party, `supabase/seed.sql`. Check that `characters` has
   **RLS enabled**.
2. **Authentication → Sign In / Providers → Email** → **turn off "Allow new users to
   sign up"**.
   - With the current permission model, any authenticated user sees and edits **every**
     sheet. On a public URL this is only safe with sign-ups closed.
3. **Add the table's players by hand:** Authentication → **Users → Add user**, ticking
   *Auto Confirm User*. (Alternative: leave "Confirm email" ON and have each player use
   the emailed link the first time.)
4. **Authentication → URL Configuration:**
   - *Site URL:* `https://<worker>.<subdomain>.workers.dev` — this value is only known
     **after** the first deploy; come back to this step then.
   - *Redirect URLs:* add `https://<worker>.<subdomain>.workers.dev/**` and keep
     `http://localhost:5173/**` for development. Needed for the magic link.

---

## 2. Create the project in Cloudflare

Dashboard → **Workers & Pages → Create → Workers → Import a repository** → repo
`sephi6/DnDVideogameSheet`.

**Build configuration:**

| Field | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

The output directory and SPA mode **are not configured in the dashboard**: they are set
by `wrangler.jsonc` at the repo root (`assets.directory: "./dist"` and
`assets.not_found_handling: "single-page-application"`).

**Environment variables** (add them in **Production** and in **Preview**):

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://dtybrsbjgatjqllsdhhi.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key (Settings → API Keys) |
| `NODE_VERSION` | `22` |

> ⚠️ In a Worker there are **two different places** to put variables. The `VITE_*` ones
> are baked in at **build** time, so they go in **Settings → Build → Variables and
> secrets** (build variables), *not* in the Worker's runtime variables. Put in the wrong
> place the build never sees them, does not fail, and the app ends up published in local
> mode (no login, saving to `localStorage`).

> Do not define `VITE_SIGNUPS_OPEN`: without it, the app does not offer "Create account".

**Save and Deploy.** When it finishes, copy the `*.workers.dev` URL and complete step 1.4.

After changing any `VITE_*` you have to **re-run the deploy** (Deployments → *Retry
deployment*, or a fresh push): an already built bundle does not pick them up.

### SPA: why there is no `_redirects`

Cloudflare **Pages** handles SPA routing with a `/*  /index.html  200` rule in
`public/_redirects`. **Workers rejects that rule**: the deploy fails with

```
Invalid _redirects configuration
Infinite loop detected in this rule.
```

(API error 10021). On Workers the equivalent is `assets.not_found_handling:
"single-page-application"` in `wrangler.jsonc`, which is what this repo uses.
`public/_headers` does work the same on both, so the CSP and cache headers still apply.

If the project ever moves back to Pages: delete `wrangler.jsonc` and recreate
`public/_redirects` with that line.

---

## 3. Publishing new versions

`git push` to `main` → automatic build + deploy. A Pull Request gets its own preview
URL; on merge, `main` is redeployed.

To go back to an earlier version: the Worker → Deployments → *Rollback*.

---

## 4. Verification

**Locally, before pushing:**
```bash
npm run build
npm run preview        # http://localhost:4173
ls dist/assets         # there must be NO *.map files
```
- DevTools → clean Console; Network: the only external call is to `*.supabase.co`.

**After the deploy:**
```bash
curl -sI https://<worker>.<subdomain>.workers.dev | grep -iE 'content-security-policy|x-frame-options|strict-transport'
```
- A made-up route (`/whatever`) must return the app, not a 404 → confirms SPA mode.
- With no session → the sign-in screen shows and no sheet is visible (RLS denies `anon`).
- Trying to sign up → **fails** (sign-ups closed in Supabase).
- Signing in with a hand-made account → create/edit a sheet → reload → still there.
- A trivial commit to `main` + push → Cloudflare builds and publishes on its own.

---

## Pending (later on)

- **Per-owner RLS** (`auth.uid() = owner_id`): the policies are already written and
  commented out at the end of `supabase/migrations/0001_init.sql`. When enabling them,
  review rows with a null `owner_id`.
- A custom domain → the Worker's *Custom domains*.
