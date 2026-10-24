-- Engagement tracking: one row per engineer per day they did real work.
--
-- Why this exists: `shows.updated_at` only remembers an engineer's LATEST
-- edit, so "were they active in week 3?" can't be answered from it —
-- earlier edits are overwritten. This table keeps the history that
-- retention charts need (weekly active engineers, signup-cohort
-- retention). It stores nothing but WHO and WHICH DAY — no show
-- contents, band names, or gear names.
--
-- How it's filled: by the database itself, not by app code. Any insert
-- or update on shows / inventory_items / endpoint_items records "this
-- owner was active today", so every write path is covered (editing,
-- locker changes, import, restore-from-backup) and no future code can
-- forget to log. Deletes are deliberately NOT tracked: deleting an
-- account cascades to these tables, and logging then would try to
-- re-create a row for a user who's being deleted. Merely opening the app
-- or loading data writes nothing, so it doesn't count as activity.
--
-- Days are UTC dates.
--
-- Isolation: RLS is on with no policies and the client roles are revoked,
-- so no engineer (or anonymous caller) can read or write this table
-- through the API. Only the trigger function (security definer) writes
-- it, and the future admin dashboard will read it through an admin-only
-- function. Account deletion removes an engineer's rows (on delete
-- cascade).
--
-- Run once in the Supabase SQL editor, after 0001-0005. Safe to re-run.

create table if not exists activity (
  owner_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  primary key (owner_id, day)
);
alter table activity enable row level security;
revoke all on activity from anon, authenticated;

-- Analytics must never break a save: if anything in here fails, swallow
-- it and let the engineer's real write go through.
create or replace function record_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into activity (owner_id, day)
  values (new.owner_id, (now() at time zone 'utc')::date)
  on conflict do nothing;
  return null;
exception when others then
  return null;
end;
$$;
revoke execute on function record_activity() from public, anon, authenticated;

drop trigger if exists shows_record_activity on shows;
create trigger shows_record_activity
  after insert or update on shows
  for each row execute function record_activity();

drop trigger if exists inventory_record_activity on inventory_items;
create trigger inventory_record_activity
  after insert or update on inventory_items
  for each row execute function record_activity();

drop trigger if exists endpoints_record_activity on endpoint_items;
create trigger endpoints_record_activity
  after insert or update on endpoint_items
  for each row execute function record_activity();

-- One-time backfill from what we can still see: the day each show / mic /
-- endpoint row was created, and the day each show was last edited. This
-- is approximate (earlier edits were overwritten and can't be recovered),
-- but it gives the charts a head start instead of starting from zero.
insert into activity (owner_id, day)
select owner_id, (created_at at time zone 'utc')::date from shows
union
select owner_id, (updated_at at time zone 'utc')::date from shows
union
select owner_id, (created_at at time zone 'utc')::date from inventory_items
union
select owner_id, (created_at at time zone 'utc')::date from endpoint_items
on conflict do nothing;
