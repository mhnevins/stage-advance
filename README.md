# StageAdvance

Input list & gear planner for live sound — built for advancing shows,
tracking your mic locker, generating a band questionnaire, and printing
a clean crew sheet.

## Multi-tenant model

StageAdvance supports multiple engineers, each with their own private
locker, shows, and Band Form inbox — enforced at the database level via
Supabase Auth + Postgres Row Level Security, not just hidden in the UI.

- **Sign in:** magic link (email, no password) via Supabase Auth.
- **Planner data (shows, locker):** per-user tables (`kv_user`,
  `inventory_items`), only readable/writable by the signed-in owner.
- **Band Form:** each engineer gets a unique `/form/{slug}` link. A band
  leader fills it out logged out; their answers land only in that
  engineer's inbox (`submissions` table).

See `src/lib/` (`storage.js`, `inventory.js`, `submissions.js`,
`profile.js`, `useAuth.js`) and `supabase/migrations/0001_multi_tenant.sql`
for the implementation.

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the contents of
   `supabase/migrations/0001_multi_tenant.sql` — it creates `profiles`,
   `kv_user`, `inventory_items`, and `submissions`, all with RLS policies
   scoped to `auth.uid()`.
3. **Authentication → URL Configuration → Redirect URLs:** add
   `http://localhost:5173` and your deployed URL, or magic-link sign-in
   will fail.
4. In **Settings → API Keys**, copy your Project URL and the publishable
   (`sb_publishable_...`) key.
5. Copy `.env.example` to `.env.local` and fill in those two values.
   `.env.local` is gitignored — never commit real keys.
6. Sign in once with your own email, then (optionally) run the seed
   insert at the bottom of the migration file — commented out — to give
   your account a starting locker instead of an empty one.

## 2. Run it locally

You'll need [Node.js](https://nodejs.org) 18+ installed.

```bash
cd stage-advance
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Sign in with your
email (you'll get a magic link), create a show, try the Band Form. Shows,
locker, and submissions all live in Supabase, scoped to your account.

## 3. Put it on GitHub

```bash
git init
git add .
git commit -m "StageAdvance v1"
```

Create a new empty repo on [github.com/new](https://github.com/new)
(don't add a README there — you already have one), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/stage-advance.git
git branch -M main
git push -u origin main
```

## 4. Deploy — Netlify (recommended, free)

1. Go to [app.netlify.com](https://app.netlify.com) and sign up/log in
   with your GitHub account.
2. Click **Add new site → Import an existing project**.
3. Pick your `stage-advance` repo.
4. Build settings should auto-detect from Vite:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Site settings → Environment variables**, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (same values as your `.env.local`) — without
   these the deployed build can't reach Supabase.
6. Click **Deploy**. In under a minute you'll get a URL like
   `https://stage-advance-xyz.netlify.app`.
7. Optional: **Site settings → Domain management** to set a nicer
   subdomain (e.g. `mystagename.netlify.app`) for free.

Every time you `git push`, Netlify rebuilds and redeploys automatically.

Once signed in, click **"Copy band form link"** in the inbox card to get
your personal `https://your-site.netlify.app/form/{your-slug}` URL — share
that with a band leader. It's a standalone page with no Planner access,
and submissions land only in your inbox.

### Alternative: Vercel

Same idea — [vercel.com](https://vercel.com), "Add New → Project", import
the GitHub repo, defaults work out of the box (`npm run build`, output
dir `dist`).

### Alternative: no GitHub, drag-and-drop

If you'd rather skip git entirely:

```bash
npm run build
```

This creates a `dist/` folder. Go to
[app.netlify.com/drop](https://app.netlify.com/drop) and drag the `dist`
folder in. You get a live URL immediately — but you'll need to repeat
this manually every time you make a change, since there's no repo for
Netlify to watch.

## 5. Put it on your phone's home screen

Once deployed, open the Netlify URL on your phone in Safari (iOS) or
Chrome (Android), then:

- **iOS Safari:** Share icon → "Add to Home Screen"
- **Android Chrome:** ⋮ menu → "Add to Home screen"

It'll launch full-screen like a native app.

## Project structure

```
stage-advance/
├── index.html
├── package.json
├── vite.config.js
├── .env.example         # copy to .env.local and fill in Supabase values
├── public/
│   └── _redirects        # Netlify SPA fallback (needed for /form/{slug})
├── supabase/
│   └── migrations/
│       └── 0001_multi_tenant.sql  # schema + RLS, run once in the SQL editor
├── src/
│   ├── main.jsx           # React entry point
│   ├── App.jsx            # the whole app (from the Claude artifact)
│   ├── components/
│   │   └── Login.jsx      # magic-link sign-in screen
│   └── lib/
│       ├── supabaseClient.js  # shared Supabase client
│       ├── useAuth.js         # session/profile hook
│       ├── profile.js         # slug <-> owner id resolution
│       ├── storage.js         # per-user kv_user shim (shows)
│       ├── inventory.js       # per-user locker (inventory_items)
│       └── submissions.js     # Band Form inbox (submissions)
```
