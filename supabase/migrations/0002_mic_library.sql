-- Phase 3: shared mic/DI recognition library.
-- Run once in the Supabase SQL editor, after 0001_multi_tenant.sql.

create table mic_library (
  id uuid primary key default gen_random_uuid(),
  label text unique not null,
  type text not null, -- 'dynamic' | 'condenser' | 'ribbon' | 'di-active' | 'di-passive'
  needs_phantom boolean not null default false,
  use_cases text[] not null default '{}',
  source text not null default 'seed', -- 'seed' | 'ai'
  created_at timestamptz not null default now()
);
alter table mic_library enable row level security;

-- Public read: harmless reference data, and the standalone flows that
-- might one day need it (e.g. a future Band Form enhancement) shouldn't
-- require auth just to read mic facts.
create policy "mic_library is publicly readable" on mic_library
  for select using (true);

-- Any signed-in engineer can add a newly-AI-recognized mic to the shared
-- library (client-side insert after a successful lookup) — this is what
-- lets the cache-write happen without a Supabase service-role key. Same
-- trust level as a wiki: low-stakes shared reference data, not sensitive.
create policy "authenticated users can add to mic_library" on mic_library
  for insert to authenticated with check (true);

-- Per-user, always-editable copy of the recognized tags. Nullable so
-- existing Phase 2 rows (added before this column existed) stay valid
-- with no backfill needed.
alter table inventory_items
  add column if not exists type text,
  add column if not exists needs_phantom boolean,
  add column if not exists use_cases text[];

insert into mic_library (label, type, needs_phantom, use_cases) values
  ('SM57', 'dynamic', false, '{snare,guitar-amp,percussion}'),
  ('SM58', 'dynamic', false, '{lead-vocal,backing-vocal}'),
  ('SM7B', 'dynamic', false, '{lead-vocal}'),
  ('Beta 52A', 'dynamic', false, '{kick}'),
  ('Beta 58A', 'dynamic', false, '{lead-vocal}'),
  ('Beta 57A', 'dynamic', false, '{snare,guitar-amp}'),
  ('Beta 56A', 'dynamic', false, '{snare,percussion}'),
  ('Beta 91A', 'condenser', true, '{kick}'),
  ('e604 (clip)', 'dynamic', false, '{snare,toms}'),
  ('e614 (SDC)', 'condenser', true, '{overhead,hi-hat}'),
  ('e906', 'dynamic', false, '{guitar-amp}'),
  ('e835', 'dynamic', false, '{lead-vocal}'),
  ('e845', 'dynamic', false, '{lead-vocal}'),
  ('e945', 'dynamic', false, '{lead-vocal}'),
  ('e902', 'dynamic', false, '{kick}'),
  ('MD421 Kompakt', 'dynamic', false, '{toms,guitar-amp,horn}'),
  ('RE20', 'dynamic', false, '{kick,lead-vocal}'),
  ('RE320', 'dynamic', false, '{kick,bass-amp}'),
  ('Audix D6', 'dynamic', false, '{kick}'),
  ('Audix D2', 'dynamic', false, '{toms,percussion}'),
  ('Audix D4', 'dynamic', false, '{toms,kick}'),
  ('Audix i5', 'dynamic', false, '{snare,guitar-amp}'),
  ('ND468', 'dynamic', false, '{snare,toms}'),
  ('AKG D112', 'dynamic', false, '{kick}'),
  ('Telefunken M82', 'dynamic', false, '{bass-amp,kick}'),
  ('sE7 (SDC)', 'condenser', true, '{hi-hat,overhead}'),
  ('Roswell MiniK47', 'condenser', true, '{overhead,acoustic-guitar,strings}'),
  ('AT2020', 'condenser', true, '{overhead,acoustic-guitar}'),
  ('KSM137', 'condenser', true, '{overhead,hi-hat}'),
  ('KSM32', 'condenser', true, '{overhead,acoustic-guitar}'),
  ('Rode NT5', 'condenser', true, '{overhead,hi-hat}'),
  ('Rode NT1', 'condenser', true, '{lead-vocal}'),
  ('AKG C414', 'condenser', true, '{overhead,strings,keys}'),
  ('AKG C451', 'condenser', true, '{hi-hat,overhead}'),
  ('Neumann U87', 'condenser', true, '{lead-vocal}'),
  ('Neumann KM184', 'condenser', true, '{overhead,acoustic-guitar}'),
  ('DPA 4099', 'condenser', true, '{horn,strings,keys}'),
  ('Radial ProDI', 'di-passive', false, '{di-passive}'),
  ('Radial ProD2', 'di-passive', false, '{di-passive}'),
  ('Countryman Type 85', 'di-passive', false, '{di-passive}'),
  ('BSS AR-133', 'di-passive', false, '{di-passive}'),
  ('Whirlwind Director', 'di-passive', false, '{di-passive}'),
  ('SB-2 (passive DI)', 'di-passive', false, '{di-passive}'),
  ('Radial J48', 'di-active', true, '{di-active,bass-di}'),
  ('Radial ProD1', 'di-active', true, '{di-active}'),
  ('Countryman Type 10', 'di-active', true, '{di-active}'),
  ('LR Baggs Session DI', 'di-active', true, '{acoustic-guitar,di-active}'),
  ('Pro48 (active DI)', 'di-active', true, '{bass-di,di-active}')
on conflict (label) do nothing;
