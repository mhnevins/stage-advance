-- Automatic approval of access requests, with a kill switch.
--
-- New requests are normally invited straight away by the auto-approve
-- Netlify function (netlify/functions/auto-approve.js), subject to
-- guardrails (hourly/daily caps, disposable-email block, etc. — see
-- netlify/lib/autoApprove.js). This migration adds the two pieces of
-- database state that needs:
--
--  * access_requests.auto_approved — true when the system (not Michael)
--    approved the request, so the admin screen and usage reports can tell
--    the difference. Set only by the function (service role).
--  * app_settings — a tiny key/value table. Today it holds one row,
--    'auto_approve' = 'on' | 'off', which is the kill switch: flip it to
--    'off' (Access requests screen, or SQL below) and every new request
--    waits for manual approval again. The function treats anything other
--    than exactly 'on' — including a missing row or a read error — as off.
--
-- Isolation: app_settings is readable/updatable only by the admin email
-- (same rule and same hardcoded address as access_requests, see
-- 0003_access_requests.sql); the function reads it with the service role.
-- There is deliberately no insert/delete policy.
--
-- Run once in the Supabase SQL editor, after 0001-0006. Safe to re-run.
--
-- To turn auto-approval off or on by hand:
--   update app_settings set value = 'off' where key = 'auto_approve';
--   update app_settings set value = 'on'  where key = 'auto_approve';

alter table access_requests
  add column if not exists auto_approved boolean not null default false;

create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;

drop policy if exists "admin can read settings" on app_settings;
create policy "admin can read settings" on app_settings
  for select using (auth.jwt() ->> 'email' = 'me@michaelnevins.com');

drop policy if exists "admin can update settings" on app_settings;
create policy "admin can update settings" on app_settings
  for update using (auth.jwt() ->> 'email' = 'me@michaelnevins.com')
  with check (auth.jwt() ->> 'email' = 'me@michaelnevins.com');

-- Starts ON. (A re-run never overwrites a value you've since changed.)
insert into app_settings (key, value) values ('auto_approve', 'on')
  on conflict (key) do nothing;
