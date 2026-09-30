-- Desempate: si empatan en días cumplidos, gana quien estuvo más cerca de su meta en promedio.
-- Desviación diaria = |kcal − meta| / meta; un día sin registrar cuenta como 1 (100%).

alter table public.challenge_members add column deviation numeric(6, 4);
alter table public.challenges add column decided_by text check (decided_by in ('days', 'closeness', 'forfeit', 'draw'));

create or replace function public.avg_deviation(uid uuid, target int, d_from date, d_to date)
returns numeric language sql stable security definer set search_path = '' as $$
  select case when d_to < d_from or target is null or target <= 0 then null else round(avg(
    coalesce(abs(t.kcal - target)::numeric / target, 1)
  ), 4) end
  from generate_series(d_from, d_to, interval '1 day') g(day)
  left join public.daily_totals t on t.user_id = uid and t.day = g.day::date
$$;

create or replace function public.finish_challenge(cid bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.challenges;
  y date := public.bogota_today() - 1;
  last_day date;
  best int;
  remaining int;
  tied int;
  closest numeric;
  how text;
  m record;
  winners uuid[];
  losers uuid[];
begin
  select * into c from public.challenges where id = cid;
  if c.start_day is not null and c.start_day <= y then
    last_day := least(y, c.end_day);
    update public.challenge_members set
      days_done = public.days_in_range(user_id, target_kcal, c.start_day, last_day),
      deviation = public.avg_deviation(user_id, target_kcal, c.start_day, last_day)
    where challenge_id = cid and status = 'accepted';
  end if;

  select count(*) into remaining from public.challenge_members where challenge_id = cid and status = 'accepted' and not forfeited;
  select coalesce(max(days_done), 0) into best from public.challenge_members where challenge_id = cid and status = 'accepted' and not forfeited;
  select count(*) into tied from public.challenge_members where challenge_id = cid and status = 'accepted' and not forfeited and days_done = best;

  if exists (select 1 from public.challenge_members where challenge_id = cid and forfeited) and remaining = 1 then
    how := 'forfeit';
  elsif best = 0 then
    how := null;   -- nadie cumplió ni un día: sin ganador
  elsif tied = 1 then
    how := 'days';
  else
    how := 'closeness';
  end if;

  if how = 'closeness' then
    select min(coalesce(deviation, 1)) into closest from public.challenge_members
    where challenge_id = cid and status = 'accepted' and not forfeited and days_done = best;
    update public.challenge_members set winner = (not forfeited and days_done = best and coalesce(deviation, 1) = closest)
    where challenge_id = cid and status = 'accepted';
    if (select count(*) from public.challenge_members where challenge_id = cid and winner) > 1 then how := 'draw'; end if;
  else
    update public.challenge_members set winner = (how is not null and not forfeited and days_done = best)
    where challenge_id = cid and status = 'accepted';
  end if;

  update public.challenges set status = 'finished', finished_at = now(), decided_by = how,
    cancel_requested_by = null, cancel_votes = '{}' where id = cid;

  winners := array(select user_id from public.challenge_members where challenge_id = cid and winner);
  losers := array(select user_id from public.challenge_members where challenge_id = cid and status = 'accepted' and not winner);
  for m in select user_id, winner, forfeited from public.challenge_members where challenge_id = cid and status = 'accepted' loop
    if not m.forfeited then perform public.award(m.user_id, 'challenge_done', cid::text, cid); end if;
    if m.winner then perform public.award(m.user_id, 'challenge_won', cid::text, cid); end if;
  end loop;
  perform public.notify_users(winners,
    case when how = 'draw' then 'Reto empatado' else 'Ganaste el reto' end,
    case when how = 'closeness' then 'Empataron en días, pero estuviste más cerca de tu meta. Tienes una medalla nueva.'
         else 'Tienes una medalla nueva esperándote.' end);
  perform public.notify_users(losers, 'Terminó el reto',
    case when how = 'closeness' then 'Empataron en días; ganó quien estuvo más cerca de su meta. Revancha cuando quieras.'
         else 'Esta vez no fue. Revancha cuando quieras.' end);
end $$;

revoke all on function public.finish_challenge(bigint) from public, anon, authenticated;

-- El muro anota cómo se decidió el reto.
create or replace function public.log_challenge_result()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  winners uuid[];
  losers uuid[];
  best int;
begin
  if new.status = 'finished' and old.status <> 'finished' then
    winners := array(select user_id from public.challenge_members where challenge_id = new.id and winner);
    losers := array(select user_id from public.challenge_members where challenge_id = new.id and status = 'accepted' and not winner);
    select max(days_done) into best from public.challenge_members where challenge_id = new.id;
    if array_length(winners, 1) = 1 then
      perform public.log_activity('challenge_won', winners[1], losers, new.id,
        jsonb_build_object('days', best, 'mode', new.mode, 'length', new.length_days, 'decided_by', new.decided_by));
    elsif array_length(winners, 1) > 1 then
      perform public.log_activity('challenge_draw', winners[1], winners[2:] || losers, new.id, jsonb_build_object('days', best));
    end if;
  end if;
  return new;
end $$;
