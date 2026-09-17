-- Access-request gate: replaces fully-open self-serve signup. A visitor
-- submits a request (no account created yet); Michael reviews and either
-- approves (which invites them via the Supabase Auth admin API, creating
-- their account for real) or declines (handled manually, outside the app,
-- per standing decision — no automated decline email).
--
-- Run once in the Supabase SQL editor, after 0001 and 0002. No separate
-- "disable signups" project setting needed — signInWithOtp now passes
-- shouldCreateUser:false from the client (see src/lib/useAuth.js), which
-- has the same effect for the magic-link flow.

create table access_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  company text,
  source text not null, -- 'google' | 'facebook' | 'instagram' | 'referral' | 'reddit' | 'youtube' | 'ai' | 'other'
  source_other text, -- free text when source = 'other'
  referred_by text, -- free text when source = 'referral'
  about text, -- optional "tell us about yourself" free text
  marketing_consent boolean not null default false,
  status text not null default 'pending', -- 'pending' | 'approved' | 'declined'
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (email)
);
alter table access_requests enable row level security;

-- Public (anon) insert: this is the whole point — someone with no account
-- yet needs to be able to submit a request. Only ever as a fresh pending
-- row; a resubmission with the same email fails on the unique constraint
-- rather than letting anyone flip an existing row's status.
create policy "anyone can submit an access request" on access_requests
  for insert with check (status = 'pending');

-- Admin-only read/update, enforced here at the database level rather than
-- just hiding the review page in the UI. Single hardcoded admin email is
-- intentional at this scale (one owner) — if that ever changes, this
-- policy, the ADMIN_EMAIL constant in netlify/functions/invite-user.js,
-- and the ADMIN_EMAIL check in src/App.jsx all need updating together.
create policy "admin can read access requests" on access_requests
  for select using (auth.jwt() ->> 'email' = 'me@michaelnevins.com');
create policy "admin can decide access requests" on access_requests
  for update using (auth.jwt() ->> 'email' = 'me@michaelnevins.com')
  with check (auth.jwt() ->> 'email' = 'me@michaelnevins.com');
