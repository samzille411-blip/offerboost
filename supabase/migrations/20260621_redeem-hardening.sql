-- 在 Supabase SQL Editor 执行（加固卡密并发核销）
-- 若已执行过旧版 redeem_card，本脚本会覆盖为原子 UPDATE 版本

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
