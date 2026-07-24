# StageAdvance

Input list & gear planner for live sound — built for advancing shows,
tracking your mic locker, generating a band questionnaire, and printing
a clean crew sheet.

## What changed from the Claude artifact

The artifact version used `window.storage`, an API that only exists inside
Claude.ai. This project replaces it with `src/lib/storage.js`, a drop-in
shim backed by the browser's `localStorage`, so the app runs anywhere.

**Known limitation:** `localStorage` is per-device. The Band Form's shared
submissions inbox will only sync on the *same browser* it was filled out
on — a band leader submitting from their phone won't appear in your inbox
on your laptop. The Planner (your own shows) is unaffected, since only you
ever touch that data. See "Next step: real sync" below when you're ready
to fix this.

## 1. Run it locally

You'll need [Node.js](https://nodejs.org) 18+ installed.

```bash
cd stage-advance
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Click around,
create a show, try the Band Form — everything saves to your browser's
localStorage automatically.

## 2. Put it on GitHub

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

## 3. Deploy — Netlify (recommended, free)

1. Go to [app.netlify.com](https://app.netlify.com) and sign up/log in
   with your GitHub account.
2. Click **Add new site → Import an existing project**.
3. Pick your `stage-advance` repo.
4. Build settings should auto-detect from Vite:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy**. In under a minute you'll get a URL like
   `https://stage-advance-xyz.netlify.app`.
6. Optional: **Site settings → Domain management** to set a nicer
   subdomain (e.g. `mystagename.netlify.app`) for free.

Every time you `git push`, Netlify rebuilds and redeploys automatically.

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

## 4. Put it on your phone's home screen

Once deployed, open the Netlify URL on your phone in Safari (iOS) or
Chrome (Android), then:

- **iOS Safari:** Share icon → "Add to Home Screen"
- **Android Chrome:** ⋮ menu → "Add to Home screen"

It'll launch full-screen like a native app.

## Next step: real cross-device sync

To make the Band Form inbox actually work — band leader fills it out on
their phone, you see it in your inbox on your laptop — `storage.js` needs
to talk to a real backend instead of localStorage. [Supabase](https://supabase.com)
has a generous free tier and a simple JS client that's a very close match
to the existing `get/set/delete/list` shape, so the rest of the app
wouldn't need to change. That's a good next task to hand to Claude Code
once you've got this version deployed and are happy with it.

## Project structure

```
stage-advance/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx        # React entry point
│   ├── App.jsx          # the whole app (from the Claude artifact)
│   └── lib/
│       └── storage.js   # localStorage shim (see limitation above)
```
