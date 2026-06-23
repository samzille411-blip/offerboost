-- 站点访问与测试统计（不含简历/JD 原文，仅匿名 visitor_key + 事件类型）
-- 在 Supabase Dashboard → SQL Editor 中执行

create table if not exists analytics_events (
  id bigserial primary key,
  event text not null check (event in ('page_view', 'free_analyze', 'unlock')),
  level smallint check (level is null or level between 1 and 3),
  visitor_key text not null,
  stat_date date not null,
  created_at timestamptz not null default now(),
  constraint analytics_unlock_level check (
    (event = 'unlock' and level between 1 and 3) or
    (event != 'unlock' and level is null)
  )
);

create index if not exists analytics_events_stat_date_idx on analytics_events (stat_date desc);
create index if not exists analytics_events_event_date_idx on analytics_events (event, stat_date);

-- 同一访客每天只计一次打开网页
create unique index if not exists analytics_page_view_daily_uniq
  on analytics_events (visitor_key, stat_date)
  where event = 'page_view';

alter table analytics_events enable row level security;

-- 每日汇总视图（Supabase Table Editor 或 SQL 可直接查询）
create or replace view daily_analytics as
select
  stat_date,
  count(distinct case when event = 'page_view' then visitor_key end)::integer as page_visitors,
  count(*) filter (where event = 'free_analyze')::integer as free_analyze_count,
  count(distinct case when event = 'free_analyze' then visitor_key end)::integer as free_analyze_users,
  count(*) filter (where event = 'unlock' and level = 1)::integer as unlock_exp,
  count(*) filter (where event = 'unlock' and level = 2)::integer as unlock_std,
  count(*) filter (where event = 'unlock' and level = 3)::integer as unlock_vip,
  count(*) filter (where event = 'unlock')::integer as unlock_total
from analytics_events
group by stat_date
order by stat_date desc;
