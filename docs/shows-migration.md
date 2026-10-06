# Row-per-show migration — runbook

**What changes:** each user's shows move from one JSON blob
(`kv_user`, key `stage-advance:shows`) to one database row per show
(`shows` table). A stale browser tab can then only ever touch the shows
it actually edits — it can no longer overwrite shows saved elsewhere.
Colors and output chips stay in `kv_user` but are now saved by merging
with the server's copy, and "Export my data" now includes everything
(shows, mic locker, endpoint inventory, colors, output chips).

**What is already tested** (all automated, all passing before you start):
- The migration + backfill SQL, run against a real Postgres engine with
  realistic data: list order preserved, content identical (incl.
  unicode and unknown future fields), safe re-runs, empty lists, a show
  with no id fails loudly instead of being dropped, and the catch-up
  step never overwrites an edit made in the new app.
- The save logic (`src/lib/showsSync.js`, 12 tests), including a test
  that reproduces the original bug and proves a stale tab can't wipe a
  show created in another tab.

**What is NOT tested and why you should watch it:** the real app against
your real Supabase (needs a signed-in session; I can't sign in). That's
what steps 5–6 below are for.

**Nothing in this runbook deletes the old data.** The `kv_user` blob is
never modified or removed — it stays as a backup indefinitely.

Do this when you have ~30 uninterrupted minutes and few testers are
likely to be using the app. Run each SQL block in the Supabase SQL
Editor, **one at a time**, and read the result before the next.

---

## 0. Snapshot everything first (60 seconds, read-only to the originals)

```sql
create table kv_user_backup_20261006 as select * from kv_user;
select count(*) from kv_user_backup_20261006;   -- should equal: select count(*) from kv_user;
```

This copies every user's shows, colors and chips into a separate table.
If anything ever looks wrong, the original data is right there.

## 1. Create the table (`supabase/migrations/0005_shows_table.sql`)

Paste the whole file and run. Purely additive: nothing reads the new
table yet, so the live app is unaffected.

Check: `select count(*) from shows;` → `0`.

## 2. Dry run (`docs/shows-backfill.sql`, block A)

Read-only. Shows each user and how many shows will be copied.
**Check:** the emails and show counts match what you expect (e.g. you
should see your own account, Harrison, Thomas, Álvaro, Brian). `already_migrated` should be `0` for everyone.

## 3. Backfill (block B) — then verify (blocks C and D)

- **B** inserts the rows. Insert-only; never touches the blob.
- **C** (counts): every row must show `blob_count = row_count`.
- **D** (exact contents): must return **zero rows**.

**If C has any mismatch or D returns any row: STOP. Do not deploy. Tell
Claude.** Nothing is harmed — the old app keeps working off the blob.

## 4. Deploy

Run steps 2–3 *right before* this, not the day before: until the deploy
is live, people are still editing the old blob. Then push the new app
version (Claude does this when you say go). Netlify takes 1–2 minutes.

## 5. Check it works (you, signed in)

1. Reload the app. **Your shows should all be there, in the same order.**
2. Edit something small in one show, wait a couple of seconds, reload
   → the edit is still there.
3. Create a show, reload → it's there. Delete a throwaway show, reload →
   gone.
4. **The real test:** open the app in two tabs. In tab 1 create a show.
   In tab 2 (don't reload) edit a *different* show. Reload tab 1 →
   **the new show must still be there.** (This exact sequence used to
   wipe it.)
5. Settings → colors: change a color, reload → it stuck. Open a second
   tab, change a *different* group's color in each tab, reload both →
   both changes are present.
6. Settings → **Export my data**: open the file; it should now contain
   `shows`, `inventory`, `endpoints`, and `settings.groupColors`.

## 6. Catch-up for edits made during the deploy window (optional)

Anyone who edited in the *old* app between step 3 and the deploy going
live has edits sitting only in the blob. Run block **E1** (read-only
preview). If it returns no rows, you're done. If it lists rows, run
**E2** — it only updates shows nobody has edited in the new app yet, so
it can't overwrite anything newer.

**Do not re-run block B after the deploy** — it would re-insert shows a
user has since deleted.

---

## Rolling back

Before step 4: nothing to roll back; the old app never stopped working.

After step 4, if something is badly wrong: tell Claude to revert the
deploy (the old app version reads the untouched `kv_user` blob).
Edits made in the new app since the deploy would not be in that blob —
which is why step 5 exists: catch problems in the first few minutes.

## After a week or two of calm

Once you're confident, the old blob and `kv_user_backup_20261006` can
be dropped. There's no rush; they cost nothing.
