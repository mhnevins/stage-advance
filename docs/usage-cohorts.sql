-- StageAdvance: did the first-run welcome card help? (signup cohorts)
--
-- usage-summary.sql counts everyone together, so it can't tell old signups
-- from new ones. This groups people by WEEK THEY FIRST OPENED THE APP and
-- shows, for each week, how many went on to build a show. The welcome card
-- went live on 2026-11-04 (afternoon, US Eastern), so people who first opened the app
-- on or before that date never saw it and people after did.
--
-- Read-only (a plain SELECT). Paste into the Supabase dashboard's SQL Editor
-- and click Run. Needs migration 0006 (the activity table).
--
-- Columns:
--   group           one row per week (Monday start), then BEFORE / AFTER totals
--   opened          people who first opened the app in that period
--   made_a_show     of those, how many have made at least one show
--   pct_made_show   made_a_show / opened
--   show_day_1      made their first show within 1 day of first opening
--   eligible_3d     opened at least 3 days ago (so they've had time)
--   show_in_3d      of those eligible, made a first show within 3 days
--   pct_show_in_3d  show_in_3d / eligible_3d  <- the fairest card test, because
--                   it gives old and new people the same amount of time
--   returned        active on 2 or more different days
--
-- Small groups (under ~10 people) swing a lot; judge the BEFORE / AFTER
-- totals, not any single week. "Opened" = a profile exists for them
-- (clicking the email link alone doesn't count).
--
-- To change the cutoff, edit the date on the card_live line below.
--
with params as (
  select date '2026-11-04' as card_live
),
f as (
  select
    pr.created_at::date as first_opened,
    sh.first_show::date as first_show,
    coalesce(ac.active_days, 0) as active_days
  from access_requests r
  join auth.users u on lower(u.email) = lower(r.email)
  join profiles pr on pr.id = u.id
  left join (
    select owner_id, min(created_at) as first_show
    from shows group by owner_id
  ) sh on sh.owner_id = u.id
  left join (
    select owner_id, count(*) as active_days from activity group by owner_id
  ) ac on ac.owner_id = u.id
  where r.status = 'approved'
),
g as (
  select
    f.*,
    date_trunc('week', f.first_opened)::date as week_start,
    case when f.first_opened <= (select card_live from params)
         then 'BEFORE welcome card' else 'AFTER welcome card' end as period,
    (f.first_show is not null and f.first_show <= f.first_opened + 1) as show_day_1,
    (f.first_opened <= current_date - 3) as eligible_3d,
    (f.first_opened <= current_date - 3
       and f.first_show is not null and f.first_show <= f.first_opened + 3) as show_in_3d
  from f
),
rows_ as (
  select 1 as sort1, week_start as sort2, 'week of ' || to_char(week_start, 'Mon DD') as "group", * from g
  union all
  select 2, null, period, * from g
)
select
  "group",
  count(*) as opened,
  count(*) filter (where first_show is not null) as made_a_show,
  round(100.0 * count(*) filter (where first_show is not null) / count(*), 0) as pct_made_show,
  count(*) filter (where show_day_1) as show_day_1,
  count(*) filter (where eligible_3d) as eligible_3d,
  count(*) filter (where show_in_3d) as show_in_3d,
  case when count(*) filter (where eligible_3d) = 0 then null
       else round(100.0 * count(*) filter (where show_in_3d) / count(*) filter (where eligible_3d), 0) end as pct_show_in_3d,
  count(*) filter (where active_days >= 2) as returned
from rows_
group by sort1, sort2, "group"
order by sort1, sort2, "group" desc;
