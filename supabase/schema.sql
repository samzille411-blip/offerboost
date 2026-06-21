-- OfferBoost 卡密与核销日志
-- 在 Supabase Dashboard → SQL Editor 中执行

-- 卡密主表
create table if not exists cards (
  code text primary key,
  total_times integer not null check (total_times > 0),
  used_times integer not null default 0 check (used_times >= 0),
  level integer not null check (level between 1 and 3),
  created_at timestamptz not null default now()
);

-- 核销日志
create table if not exists usage_log (
  id bigserial primary key,
  card_code text not null references cards(code),
  content_hash text not null,
  report_text text not null,
  level integer not null,
  request_id text,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists usage_log_card_idx on usage_log(card_code);
create index if not exists usage_log_request_idx on usage_log(request_id) where request_id is not null;

-- 免费诊断结果缓存（仅存 content_hash + 诊断 JSON，不存简历/JD 原文）
create table if not exists analyze_cache (
  content_hash text primary key,
  score integer not null check (score between 0 and 100),
  issues jsonb not null,
  summary text not null default '',
  created_at timestamptz not null default now()
);

alter table analyze_cache enable row level security;

alter table cards enable row level security;
alter table usage_log enable row level security;

-- 核销 RPC：原子条件 UPDATE，并发安全
create or replace function redeem_card(p_code text)
returns jsonb
language plpgsql
as $$
declare
  v cards%rowtype;
begin
  update cards
  set used_times = used_times + 1
  where code = p_code and used_times < total_times
  returning * into v;

  if not found then
    if exists (select 1 from cards where code = p_code) then
      return jsonb_build_object('ok', false, 'error', 'exhausted');
    end if;
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'level', v.level,
    'total_times', v.total_times,
    'used_times', v.used_times,
    'remaining', v.total_times - v.used_times
  );
end;
$$;

-- LLM 失败时回滚扣次（原子）
create or replace function rollback_card_redemption(p_code text)
returns jsonb
language plpgsql
as $$
declare
  v cards%rowtype;
begin
  update cards
  set used_times = greatest(0, used_times - 1)
  where code = p_code and used_times > 0
  returning * into v;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'nothing_to_rollback');
  end if;

  return jsonb_build_object('ok', true, 'used_times', v.used_times);
end;
$$;

create unique index if not exists usage_log_request_id_unique
  on usage_log(request_id) where request_id is not null;

-- 补货批次记录
create table if not exists card_batches (
  id bigserial primary key,
  tier text not null,
  ldxp_item_id text not null,
  batch_size integer not null,
  trigger_stock integer not null,
  target_stock integer not null,
  created_at timestamptz not null default now()
);

-- 链动小铺同步日志（每张卡）
create table if not exists ldxp_sync_log (
  id bigserial primary key,
  batch_id bigint references card_batches(id),
  card_code text not null references cards(code),
  ldxp_item_id text not null,
  status text not null default 'pending',
  error_msg text,
  created_at timestamptz not null default now()
);

create index if not exists ldxp_sync_log_status_idx on ldxp_sync_log(status);
create index if not exists ldxp_sync_log_item_idx on ldxp_sync_log(ldxp_item_id);

alter table card_batches enable row level security;
alter table ldxp_sync_log enable row level security;

-- 测试卡密（上线前可删除）
insert into cards (code, total_times, level) values
  ('EXP_test001', 1, 1),
  ('STD_test001', 10, 2),
  ('VIP_test001', 25, 3)
on conflict (code) do nothing;
