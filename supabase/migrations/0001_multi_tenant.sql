-- Phase 1: multi-tenant foundation.
-- Run once in the Supabase SQL editor. Replaces the old single global
-- `kv_shared` table (fully-open RLS, one shared inbox) with per-user
-- tables scoped by Supabase Auth + Row Level Security.
--
-- If `kv_shared` exists from the earlier single-tenant version and you
-- don't need its contents, drop it after confirming the new tables work:
--   drop table if exists kv_shared;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  slug text unique not null check (slug ~ '^[a-z0-9-]{3,40}$'),
  display_name text,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

-- Public SELECT: the Band Form must resolve /form/{slug} -> owner id
-- before any login exists. RLS is row-level, not column-level, so the
-- whole row is public. Never add a sensitive column to this table
-- without revisiting this policy.
create policy "profiles are publicly readable" on profiles
  for select using (true);
create policy "users insert their own profile" on profiles
  for insert with check (auth.uid() = id);
create policy "users update their own profile" on profiles
  for update using (auth.uid() = id);

-- Per-user JSON blobs. Currently just holds each engineer's `shows` list
-- (replaces the old localStorage-only shows). Reuses the storage.js
-- get/set/delete/list shape, now scoped to auth.uid() instead of a
-- single global browser localStorage.
create table kv_user (
  owner_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, key)
);
alter table kv_user enable row level security;
create policy "users manage their own kv rows" on kv_user
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- One row per mic/DI an engineer owns. Real rows (not a JSON blob)
-- because Phase 2 needs per-item add/edit/remove/quantity CRUD.
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  qty integer not null default 1 check (qty >= 0),
  created_at timestamptz not null default now(),
  unique (owner_id, label)
);
alter table inventory_items enable row level security;
create policy "users manage their own inventory" on inventory_items
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Band Form questionnaire answers.
create table submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  band text, contact_name text, email text, phone text,
  members jsonb not null default '[]',
  backline_bring text, backline_need text,
  tracks boolean not null default false,
  click boolean not null default false,
  unusual text, anything_else text,
  submitted_at timestamptz not null default now()
);
alter table submissions enable row level security;

-- Public (anon) insert: a logged-out band leader submits after the
-- client resolves owner_id from profiles.slug. Same open-write tradeoff
-- the old kv_shared table already had; spam/rate-limiting is out of
-- scope for this phase.
create policy "anyone can submit to a known owner" on submissions
  for insert with check (owner_id is not null);
create policy "owners read their own submissions" on submissions
  for select using (owner_id = auth.uid());
create policy "owners delete their own submissions" on submissions
  for delete using (owner_id = auth.uid());

-- One-time seed for the founding engineer's real locker (15 mic/DI items
-- that used to be the hardcoded INVENTORY constant). Run manually after
-- that account's first login — replace the email if needed. Not run
-- automatically: a seed-on-signup fallback would give every new signup
-- (including throwaway test accounts) this real gear list.
--
-- insert into inventory_items (owner_id, label, qty)
-- select u.id, v.label, v.qty
-- from auth.users u
-- cross join (values
--   ('e604 (clip)', 6), ('e614 (SDC)', 1), ('sE7 (SDC)', 4), ('SM57', 2),
--   ('Beta 52A', 1), ('Audix D6', 1), ('Telefunken M82', 1), ('Roswell MiniK47', 2),
--   ('e906', 1), ('MD421 Kompakt', 2), ('AT2020', 1), ('SM58', 5),
--   ('e845', 1), ('e945', 1), ('Pro48 (active DI)', 1), ('SB-2 (passive DI)', 3)
-- ) as v(label, qty)
-- where u.email = 'me@michaelnevins.com';
