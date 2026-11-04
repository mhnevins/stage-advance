-- StageAdvance: access-request funnel SUMMARY
--
-- One table: a row per "how did you hear about us" answer plus an ALL
-- SOURCES total, with a count of people at each funnel stage. Use it for
-- a quick "is anyone actually using this?" read; use docs/usage-funnel.sql
-- when you want the per-person list (names, last active, shows, etc.).
--
-- Needs migration 0006 (supabase/migrations/0006_activity.sql).
--
-- Paste into the Supabase dashboard's SQL Editor (left sidebar -> SQL
-- Editor -> New query) and click Run. Read-only (a plain SELECT), safe to
-- run any time.
--
-- Columns, left to right = where people drop off:
--   requests             everyone who asked for access
--   pending              you haven't decided yet
--   declined             declined
--   invited_not_opened   approved, but the app never loaded for them
--                        (clicking the email link alone isn't enough)
--   opened_no_show       got into the app, hasn't made a show
--   made_show_no_return  made a show, active on only 1 day
--   returned             active on 2 or more different days
--
-- The stage logic is copied from usage-funnel.sql; if you change the
-- stages there, change them here too. Tested against a small in-memory
-- Postgres with sample data (2026-11-04).
--
with f as (
select
  r.first_name || ' ' || r.last_name as name,
  r.company,
  r.source,
  coalesce(r.source_other, r.referred_by) as source_detail,
  r.created_at::date as requested,
  r.status,
  r.decided_at::date as decided,
  pr.created_at::date as first_opened_app,
  coalesce(sh.show_count, 0) as shows,
  sh.first_show::date as first_show,
  coalesce(inv.mic_count, 0) as mic_items,
  coalesce(ac.active_days, 0) as active_days,
  ac.last_active,
  case
    when r.status = 'pending' then '1 pending'
    when r.status = 'declined' then 'declined'
    when pr.id is null then '2 approved, not opened yet'
    when coalesce(sh.show_count, 0) = 0 then '3 opened, no show yet'
    when coalesce(ac.active_days, 0) < 2 then '4 made a show, no return yet'
    else '5 returned (2+ active days)'
  end as stage
from access_requests r
left join auth.users u on lower(u.email) = lower(r.email)
left join profiles pr on pr.id = u.id
left join (
  select owner_id, count(*) as show_count, min(created_at) as first_show
  from shows group by owner_id
) sh on sh.owner_id = u.id
left join (
  select owner_id, count(*) as mic_count from inventory_items group by owner_id
) inv on inv.owner_id = u.id
left join (
  select owner_id, count(*) as active_days, max(day) as last_active
  from activity group by owner_id
) ac on ac.owner_id = u.id
)
select
  coalesce(source, 'ALL SOURCES') as source,
  count(*) as requests,
  count(*) filter (where stage = '1 pending') as pending,
  count(*) filter (where stage = 'declined') as declined,
  count(*) filter (where stage like '2%') as invited_not_opened,
  count(*) filter (where stage like '3%') as opened_no_show,
  count(*) filter (where stage like '4%') as made_show_no_return,
  count(*) filter (where stage like '5%') as returned
from (select coalesce(source, '(none)') as source, stage from f) g
group by rollup (source)
order by (source is null), requests desc;
