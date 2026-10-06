-- Row-per-show migration, step 2 of 3: copy existing shows into rows.
--
-- Run each numbered block SEPARATELY in the Supabase SQL Editor and
-- read the result before running the next. Blocks A, C, and D are
-- read-only; only B writes, and B only ever INSERTS — it never modifies
-- or deletes the old kv_user blob, so the original data stays intact as
-- a backup no matter what.
--
-- Run this right before deploying the new app version (not days
-- before): the old app keeps editing the blob until the deploy goes
-- live, and edits made in that window are picked up by block E.

-- ── A. DRY RUN (read-only): what would be copied? ───────────────────
-- One row per user with shows. `show_count` is how many shows B will
-- insert for them; `already_migrated` should be 0 on a first run.
select
  u.email,
  jsonb_array_length(kv.value::jsonb) as show_count,
  (select count(*) from shows s where s.owner_id = kv.owner_id) as already_migrated
from kv_user kv
join auth.users u on u.id = kv.owner_id
where kv.key = 'stage-advance:shows'
order by u.email;

-- ── B. BACKFILL (writes — insert only; safe to re-run) ──────────────
-- Fails loudly (and inserts nothing) if any show is missing an id,
-- rather than silently dropping it. `on conflict do nothing` makes a
-- re-run harmless — but do NOT re-run it after the new app is live:
-- it would re-insert shows a user has since deleted. (Use E instead.)
--
-- created_at preserves the old list order: the blob's first element is
-- the top of the planner, so it gets the newest timestamp. Rows start
-- at version 1; block E later uses "version = 1" to recognise rows
-- nobody has edited in the new app yet (every edit bumps the version).
insert into shows (owner_id, id, data, created_at, updated_at)
select
  kv.owner_id,
  elem ->> 'id',
  elem,
  kv.updated_at - ((ord - 1) * interval '1 second'),
  kv.updated_at - ((ord - 1) * interval '1 second')
from kv_user kv,
     jsonb_array_elements(kv.value::jsonb) with ordinality as t(elem, ord)
where kv.key = 'stage-advance:shows'
on conflict (owner_id, id) do nothing;

-- ── C. VERIFY — counts (read-only) ──────────────────────────────────
-- Every row should show blob_count = row_count. Any mismatch = stop,
-- do not deploy, tell Claude.
select
  u.email,
  jsonb_array_length(kv.value::jsonb) as blob_count,
  (select count(*) from shows s where s.owner_id = kv.owner_id) as row_count
from kv_user kv
join auth.users u on u.id = kv.owner_id
where kv.key = 'stage-advance:shows'
order by u.email;

-- ── D. VERIFY — exact contents (read-only) ──────────────────────────
-- Lists any show whose row does not exactly equal the original blob
-- element. Must return ZERO rows. This is the real lossless check:
-- count matching (C) isn't enough, the content has to match too.
select u.email, elem ->> 'id' as show_id, elem ->> 'band' as band
from kv_user kv
join auth.users u on u.id = kv.owner_id,
     jsonb_array_elements(kv.value::jsonb) as elem
where kv.key = 'stage-advance:shows'
  and not exists (
    select 1 from shows s
    where s.owner_id = kv.owner_id and s.id = elem ->> 'id' and s.data = elem
  );

-- ── E. CATCH-UP (optional, run once right AFTER the new app is live) ─
-- Picks up edits someone made in the OLD app between block B and the
-- deploy going live. Only touches rows nobody has edited since the
-- migration (version still 1), so it can never
-- overwrite work done in the new app. Run the read-only preview first;
-- if it returns no rows there is nothing to do.
--
-- E1 preview:
select u.email, elem ->> 'id' as show_id, elem ->> 'band' as band
from kv_user kv
join auth.users u on u.id = kv.owner_id,
     jsonb_array_elements(kv.value::jsonb) as elem,
     shows s
where kv.key = 'stage-advance:shows'
  and s.owner_id = kv.owner_id
  and s.id = elem ->> 'id'
  and s.data <> elem
  and s.version = 1;
--
-- E2 apply (only if E1 listed rows you expect):
-- update shows s
-- set data = elem
-- from kv_user kv, jsonb_array_elements(kv.value::jsonb) as elem
-- where kv.key = 'stage-advance:shows'
--   and s.owner_id = kv.owner_id
--   and s.id = elem ->> 'id'
--   and s.data <> elem
--   and s.version = 1;
