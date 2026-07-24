# StageAdvance

Input list & gear planner for live sound — built for advancing shows,
tracking your mic locker, generating a band questionnaire, and printing
a clean crew sheet.

## What changed from the Claude artifact

The artifact version used `window.storage`, an API that only exists inside
Claude.ai. This project replaces it with `src/lib/storage.js`:

- **Planner (your shows):** stays in the browser's `localStorage` — only
  you ever touch this data, on your own device.
- **Band Form submissions inbox:** backed by a real [Supabase](https://supabase.com)
  table (`kv_shared`), so a band leader's submission from their own phone
  actually reaches your inbox, from any device.

There's also a standalone `/band-form` URL — it shows only the
questionnaire, with no Planner tab or link, safe to hand to a band leader.

## 1. Set up Supabase (for the Band Form inbox)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run:

   ```sql
   create table if not exists kv_shared (
     key text primary key,
     value text not null,
     updated_at timestamptz not null default now()
   );

   alter table kv_shared enable row level security;

   create policy "public read" on kv_shared for select using (true);
   create policy "public insert" on kv_shared for insert with check (true);
   create policy "public update" on kv_shared for update using (true);
   create policy "public delete" on kv_shared for delete using (true);
   ```

   These policies allow open read/write via the public (anon/publishable)
   key — matching the original artifact's shared-storage model (no auth).
   Anyone with the key could write to this table; that's an acceptable
   tradeoff for a low-stakes mic-list inbox, but don't reuse this table
   for anything sensitive.
3. In **Settings → API Keys**, copy your Project URL and the publishable
   (`sb_publishable_...`) key.
4. Copy `.env.example` to `.env.local` and fill in those two values.
   `.env.local` is gitignored — never commit real keys.

## 2. Run it locally

You'll need [Node.js](https://nodejs.org) 18+ installed.

```bash
cd stage-advance
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Click around,
create a show, try the Band Form. Planner data saves to localStorage;
Band Form submissions go to Supabase.

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

Share `https://your-site.netlify.app/band-form` with a band leader —
it's a standalone page with no Planner access. Or click **"Copy band
form link"** in the app's inbox card.

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
│   └── _redirects        # Netlify SPA fallback (needed for /band-form)
├── src/
│   ├── main.jsx        # React entry point
│   ├── App.jsx          # the whole app (from the Claude artifact)
│   └── lib/
│       └── storage.js   # localStorage (personal) + Supabase (shared) shim
```
