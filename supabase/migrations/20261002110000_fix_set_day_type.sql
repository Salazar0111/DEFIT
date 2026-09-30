-- Corrige set_day_type: la hora de Colombia se toma con now().
create or replace function public.set_day_type(d date, t text)
returns int language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  today date := public.bogota_today();
  tgt int;
begin
  if me is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if t not in ('rest', 'train', 'leg') then raise exception 'BAD_TYPE'; end if;
  if (select plan_version from public.profiles where id = me) < 2 then raise exception 'PLAN_V1'; end if;
  if not (d = today or (d = today - 1 and (now() at time zone 'America/Bogota')::time < time '12:00')) then
    raise exception 'DAY_LOCKED';
  end if;
  insert into public.day_types (user_id, day, type) values (me, d, t)
  on conflict (user_id, day) do update set type = excluded.type;
  tgt := public.day_target(me, d);
  update public.daily_totals set target_kcal = tgt where user_id = me and day = d;
  return tgt;
end $$;
