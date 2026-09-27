-- Phase (Outputs): endpoint locker, mirroring inventory_items for the
-- mic/DI locker but for output endpoints (speakers, amps, etc.). No
-- shared reference library / AI-lookup layer here — endpoints are
-- manually tagged with a type, no auto-suggestion (per Michael,
-- 2026-09-23: "I like the idea of tagging... auto-suggesting is not
-- needed").
--
-- Run once in the Supabase SQL editor, after 0001-0003.

create table endpoint_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  qty integer not null default 1 check (qty >= 0),
  type text,
  created_at timestamptz not null default now(),
  unique (owner_id, label)
);
alter table endpoint_items enable row level security;
create policy "users manage their own endpoints" on endpoint_items
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
