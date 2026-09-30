-- Terminar un reto activo antes de tiempo: rendirse o cancelar de mutuo acuerdo.

alter table public.challenge_members add column forfeited boolean not null default false;
alter table public.challenges
  add column cancel_requested_by uuid references auth.users (id) on delete set null,
  add column cancel_votes uuid[] not null default '{}';

alter table public.activity drop constraint activity_kind_check;
alter table public.activity add constraint activity_kind_check check (kind in (
  'challenge_invite', 'challenge_accept', 'challenge_decline', 'challenge_won', 'challenge_draw',
  'challenge_forfeit', 'challenge_cancelled', 'medal', 'poke'));

-- El plan se desbloquea para quien se rinde.
create or replace function public.guard_plan_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.target_kcal, new.deficit, new.activity, new.frame, new.sex, new.birthdate, new.height_cm, new.weight_kg)
     is distinct from
     (old.target_kcal, old.deficit, old.activity, old.frame, old.sex, old.birthdate, old.height_cm, old.weight_kg)
     and exists (
       select 1 from public.challenge_members m join public.challenges c on c.id = m.challenge_id
       where m.user_id = new.id and m.status = 'accepted' and not m.forfeited and c.status in ('pending', 'active')
     ) then
    raise exception 'PLAN_LOCKED';
  end if;
  return new;
end $$;

-- Cierra un reto: calcula días, define ganadores entre quienes siguen y entrega medallas.
create or replace function public.finish_challenge(cid bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.challenges;
  y date := public.bogota_today() - 1;
  best int;
  remaining int;
  m record;
  winners uuid[];
  losers uuid[];
begin
  select * into c from public.challenges where id = cid;
  if c.start_day is not null and c.start_day <= y then
    update public.challenge_members set days_done = public.days_in_range(user_id, target_kcal, c.start_day, least(y, c.end_day))
    where challenge_id = cid and status = 'accepted';
  end if;
  select coalesce(max(days_done), 0) into best from public.challenge_members
  where challenge_id = cid and status = 'accepted' and not forfeited;
  select count(*) into remaining from public.challenge_members
  where challenge_id = cid and status = 'accepted' and not forfeited;
  -- Si todos los demás se rindieron, gana quien quedó aunque lleve 0 días.
  update public.challenge_members set winner = (not forfeited and days_done = best and (best > 0 or remaining = 1))
  where challenge_id = cid and status = 'accepted';
  update public.challenges set status = 'finished', finished_at = now(), cancel_requested_by = null, cancel_votes = '{}' where id = cid;

  winners := array(select user_id from public.challenge_members where challenge_id = cid and winner);
  losers := array(select user_id from public.challenge_members where challenge_id = cid and status = 'accepted' and not winner);
  for m in select user_id, winner, forfeited from public.challenge_members where challenge_id = cid and status = 'accepted' loop
    if not m.forfeited then perform public.award(m.user_id, 'challenge_done', cid::text, cid); end if;
    if m.winner then perform public.award(m.user_id, 'challenge_won', cid::text, cid); end if;
  end loop;
  perform public.notify_users(winners, case when array_length(winners, 1) > 1 then 'Reto empatado' else 'Ganaste el reto' end,
    'Tienes una medalla nueva esperándote.');
  perform public.notify_users(losers, 'Terminó el reto', 'Esta vez no fue. Revancha cuando quieras.');
end $$;

revoke all on function public.finish_challenge(bigint) from public, anon, authenticated;

-- El cierre diario usa finish_challenge y no cuenta a quien se rindió.
create or replace function public.daily_close()
returns void language plpgsql security definer set search_path = '' as $$
declare
  today date := public.bogota_today();
  y date := today - 1;
  c record;
  p record;
  best int;
  streak int;
  wk date;
begin
  update public.challenges set status = 'cancelled' where status = 'pending' and created_at < now() - interval '3 days';

  for c in select * from public.challenges where status = 'active' and start_day <= y loop
    update public.challenge_members set days_done = public.days_in_range(user_id, target_kcal, c.start_day, least(y, c.end_day))
    where challenge_id = c.id and status = 'accepted';
    select coalesce(max(days_done), 0) into best from public.challenge_members
    where challenge_id = c.id and status = 'accepted' and not forfeited;
    if (c.mode = 'first_to' and best >= c.length_days) or c.end_day <= y then
      perform public.finish_challenge(c.id);
    end if;
  end loop;

  for p in select id, target_kcal from public.profiles where onboarded and target_kcal is not null loop
    if exists (select 1 from public.daily_totals where user_id = p.id) then
      perform public.award(p.id, 'first_entry', 'first');
    end if;
    if public.days_in_range(p.id, p.target_kcal, y, y) = 1 then
      perform public.award(p.id, 'day_in_range', y::text);
    end if;
    streak := 0;
    while streak <= 100 and exists (select 1 from public.daily_totals where user_id = p.id and day = y - streak) loop
      streak := streak + 1;
    end loop;
    if streak in (7, 30, 100) then perform public.award(p.id, 'streak_' || streak, y::text); end if;
    if extract(isodow from y) = 7 then
      wk := y - 6;
      if (select count(*) from public.daily_totals where user_id = p.id and day between wk and y) = 7 then
        perform public.award(p.id, 'week_logged', wk::text);
      end if;
      if public.days_in_range(p.id, p.target_kcal, wk, y) = 7 then
        perform public.award(p.id, 'perfect_week', wk::text);
      end if;
    end if;
  end loop;
end $$;

revoke all on function public.daily_close() from public, anon, authenticated;

-- ─── Rendirse ─────────────────────────────────────────────────────────────
create or replace function public.forfeit_challenge(cid bigint)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_name text;
  others uuid[];
begin
  if not exists (
    select 1 from public.challenge_members m join public.challenges c on c.id = m.challenge_id
    where m.challenge_id = cid and m.user_id = me and m.status = 'accepted' and not m.forfeited and c.status = 'active'
  ) then raise exception 'NOT_ACTIVE'; end if;

  update public.challenge_members set forfeited = true where challenge_id = cid and user_id = me;
  -- Si había una propuesta de cancelar, se descarta.
  update public.challenges set cancel_requested_by = null, cancel_votes = '{}' where id = cid;
  select name into my_name from public.profiles where id = me;
  others := array(select user_id from public.challenge_members where challenge_id = cid and status = 'accepted' and not forfeited);
  perform public.log_activity('challenge_forfeit', me, others, cid);

  if array_length(others, 1) is null or array_length(others, 1) <= 1 then
    perform public.finish_challenge(cid);
    return 'finished';
  end if;
  perform public.notify_users(others, my_name || ' se rindió', 'El reto sigue entre los demás.');
  return 'continues';
end $$;

-- ─── Cancelar de mutuo acuerdo ────────────────────────────────────────────
create or replace function public.request_cancel(cid bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_name text;
  others uuid[];
begin
  if not exists (
    select 1 from public.challenge_members m join public.challenges c on c.id = m.challenge_id
    where m.challenge_id = cid and m.user_id = me and m.status = 'accepted' and not m.forfeited and c.status = 'active'
  ) then raise exception 'NOT_ACTIVE'; end if;
  update public.challenges set cancel_requested_by = me, cancel_votes = array[me] where id = cid and cancel_requested_by is null;
  if not found then raise exception 'ALREADY_REQUESTED'; end if;
  select name into my_name from public.profiles where id = me;
  others := array(select user_id from public.challenge_members where challenge_id = cid and status = 'accepted' and not forfeited and user_id <> me);
  perform public.notify_users(others, my_name || ' propone cancelar el reto', 'Si aceptas, termina sin ganador.');
end $$;

create or replace function public.respond_cancel(cid bigint, accept boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  c public.challenges;
  my_name text;
  players uuid[];
begin
  select * into c from public.challenges where id = cid for update;
  if c.status <> 'active' or c.cancel_requested_by is null then raise exception 'NO_REQUEST'; end if;
  players := array(select user_id from public.challenge_members where challenge_id = cid and status = 'accepted' and not forfeited);
  if not me = any(players) then raise exception 'NOT_MEMBER'; end if;
  select name into my_name from public.profiles where id = me;

  if not accept then
    -- Quien propuso también puede retirar su propuesta.
    update public.challenges set cancel_requested_by = null, cancel_votes = '{}' where id = cid;
    if me <> c.cancel_requested_by then
      perform public.notify_users(array[c.cancel_requested_by], my_name || ' quiere seguir compitiendo', 'El reto continúa.');
    end if;
    return 'kept';
  end if;

  update public.challenges set cancel_votes = array(select distinct unnest(cancel_votes || me)) where id = cid
  returning * into c;
  if (select bool_and(p = any(c.cancel_votes)) from unnest(players) p) then
    update public.challenges set status = 'cancelled', finished_at = now() where id = cid;
    perform public.log_activity('challenge_cancelled', c.cancel_requested_by, array(select unnest(players) except select c.cancel_requested_by), cid);
    perform public.notify_users(array(select unnest(players) except select me), 'Reto cancelado', 'Cancelaron el reto de mutuo acuerdo. Ya puedes ajustar tu plan.');
    return 'cancelled';
  end if;
  return 'voted';
end $$;

revoke all on function public.forfeit_challenge(bigint) from public, anon;
revoke all on function public.request_cancel(bigint) from public, anon;
revoke all on function public.respond_cancel(bigint, boolean) from public, anon;
grant execute on function public.forfeit_challenge(bigint) to authenticated;
grant execute on function public.request_cancel(bigint) to authenticated;
grant execute on function public.respond_cancel(bigint, boolean) to authenticated;
