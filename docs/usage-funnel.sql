-- StageAdvance — access-request funnel
--
-- Follows each person from "requested access" to "came back", one row
-- per access request, newest first. Use it to compare where people come
-- from (Facebook group, referral, ...) and to see who stalled where.
--
-- Needs migration 0006 (supabase/migrations/0006_activity.sql) for the
-- active-day columns.
--
-- Paste this into the Supabase dashboard's SQL Editor (left sidebar →
-- SQL Editor → New query) and click Run. Read-only (a plain SELECT) —
-- safe to run any time, doesn't change anything.
--
-- What each column means:
--   source / source_detail — how they said they heard about us, and the
--                            "other"/referrer free text if any
--   requested / decided    — when they asked, and when you approved or
--                            declined
--   first_opened_app       — the day the app first loaded for them after
--                            accepting the invite. Empty = approved but
--                            they haven't actually gotten into the app
--                            yet (clicking the email link isn't enough;
--                            this only fills once the app itself loads)
--   shows / first_show     — shows in their planner, and the day the
--                            first one was created
--   mic_items              — rows in their mic/DI locker
--   active_days            — distinct days they created or edited a
--                            show, mic or endpoint (from `activity`)
--   last_active            — most recent of those days
--   stage                  — where they are in the funnel:
--       1 pending                      you haven't decided yet
--       declined                       declined
--       2 approved, not opened yet     invited, never got into the app
--       3 opened, no show yet          in the app, hasn't made a show
--       4 made a show, no return yet   made a show, active on 1 day only
--       5 returned (2+ active days)    active on at least 2 different days
--
-- People are matched to their account by email (case-insensitive), so
-- it relies on them accepting the invite at the address they requested
-- with.

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
order by r.created_at desc;
