-- StageAdvance — per-user usage snapshot
--
-- NOTE: counts shows from the `shows` table, so run it only after the
-- row-per-show migration (docs/shows-migration.md) is done.
--
-- Paste this into the Supabase dashboard's SQL Editor (left sidebar →
-- SQL Editor → New query) and click Run. Read-only (a plain SELECT) —
-- safe to run any time, doesn't change anything.
--
-- What each column means:
--   signed_up_at        — when the account was created
--   last_sign_in_at      — most recent login (null = invited but never
--                          signed in)
--   band_form_slug       — their Band Form link is /form/{this}; null
--                          means they've never loaded the app past
--                          login (profiles rows are only created once
--                          the app itself finishes loading a session —
--                          see the 2026-09-27 invite-bug fix notes)
--   shows_count           — how many shows are in their planner
--   mic_locker_items      — how many mic/DI rows in their locker
--   endpoint_items        — how many speaker/amp rows in their endpoint
--                          inventory
--   band_form_submissions — how many Band Form responses they've
--                          received (whether or not imported as a show)
--
-- Excludes the admin account (me@michaelnevins.com) — remove the WHERE
-- clause at the bottom if you want it included.

select
  u.email,
  u.created_at as signed_up_at,
  u.last_sign_in_at,
  p.slug as band_form_slug,
  p.display_name,
  coalesce(sh.show_count, 0) as shows_count,
  coalesce(inv.mic_count, 0) as mic_locker_items,
  coalesce(ep.endpoint_count, 0) as endpoint_items,
  coalesce(sub.submission_count, 0) as band_form_submissions
from auth.users u
left join profiles p on p.id = u.id
left join (
  select owner_id, count(*) as show_count from shows group by owner_id
) sh on sh.owner_id = u.id
left join (
  select owner_id, count(*) as mic_count from inventory_items group by owner_id
) inv on inv.owner_id = u.id
left join (
  select owner_id, count(*) as endpoint_count from endpoint_items group by owner_id
) ep on ep.owner_id = u.id
left join (
  select owner_id, count(*) as submission_count from submissions group by owner_id
) sub on sub.owner_id = u.id
where u.email <> 'me@michaelnevins.com'
order by u.last_sign_in_at desc nulls last;
