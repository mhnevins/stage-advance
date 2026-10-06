-- Row-per-show migration, step 1 of 3 (schema only — purely additive).
--
-- Replaces the old "one JSON blob per user" storage for shows
-- (kv_user, key 'stage-advance:shows'), which let a stale browser tab
-- silently overwrite every show another tab/device had saved since.
-- With one row per show, a stale tab can only ever touch the shows it
-- actually edits.
--
-- Safe to run on its own: nothing reads this table until the new app
-- version is deployed, and the old kv_user blob is NOT touched or
-- removed by anything in this migration (it stays as a backup).
--
-- Run order (see docs/shows-migration.md for the full runbook):
--   0. snapshot kv_user (backup)      — docs/shows-migration.md, step 0
--   1. THIS FILE                       — creates the table
--   2. docs/shows-backfill.sql         — copies existing blobs into rows
--   3. deploy the new app version
--
-- Design notes:
--  * `data` holds the entire show object exactly as the app builds it
--    (band, date, venue, contact, monitors, notes, channels, boxes,
--    outputs, outputBoxes, ...). Deliberately not split into columns:
--    the show shape has grown several times already (boxes, outputs,
--    stereo links...) and will again, and a whole-object jsonb column
--    means a future field never needs a schema migration — and makes
--    the backfill provably lossless (row.data = original blob element).
--  * Show ids are short random strings made by the client (not UUIDs),
--    so the key is (owner_id, id): no id remapping needed during
--    backfill, and two users can never collide with each other.
--  * `version` is an integer that a trigger bumps on every update (and
--    `updated_at` likewise) — never set by the client. The app uses
--    `version` for optimistic concurrency: a save only succeeds if the
--    row's version still equals the one this tab last saw. An integer,
--    not a timestamp, so there's no precision/format round-tripping to
--    go wrong.
--  * `created_at` orders the planner list, newest first (matches the
--    old "prepend new shows" array order).
--  * on delete cascade from auth.users: deleting an account removes
--    its shows automatically, same as every other per-user table.

create table shows (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create index shows_owner_created_idx on shows (owner_id, created_at desc);

alter table shows enable row level security;
create policy "users manage their own shows" on shows
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create function bump_shows_version() returns trigger
language plpgsql as $$
begin
  new.version = old.version + 1;
  new.updated_at = now();
  return new;
end;
$$;

create trigger shows_bump_version
  before update on shows
  for each row execute function bump_shows_version();
