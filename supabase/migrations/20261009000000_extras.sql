-- Actividades extra (pilates, ciclismo): minutos y nivel de cada una, y tipos de día que las incluyen
-- ("train+p", "rest+pb": p = pilates, b = ciclismo).
alter table public.profiles add column extras jsonb;

alter table public.day_types drop constraint day_types_type_check;
alter table public.day_types add constraint day_types_type_check
  check (type ~ '^(rest|train|leg|cardio|cw|cwl)(\+(p|b|pb))?$');

create or replace function public.set_day_type(d date, t text, m text[] default null)
returns int language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  today date := public.bogota_today();
  tgt int;
  mus text[] := coalesce(m, '{}');
begin
  if me is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if t !~ '^(rest|train|leg|cardio|cw|cwl)(\+(p|b|pb))?$' then raise exception 'BAD_TYPE'; end if;
  if not (mus <@ array['chest', 'back', 'shoulders', 'arms', 'legs', 'core']) then raise exception 'BAD_MUSCLES'; end if;
  if (select plan_version from public.profiles where id = me) < 2 then raise exception 'PLAN_V1'; end if;
  if not (d = today or (d = today - 1 and (now() at time zone 'America/Bogota')::time < time '12:00')) then
    raise exception 'DAY_LOCKED';
  end if;
  insert into public.day_types (user_id, day, type, muscles) values (me, d, t, mus)
  on conflict (user_id, day) do update set type = excluded.type, muscles = excluded.muscles;
  tgt := public.day_target(me, d);
  update public.daily_totals set target_kcal = tgt where user_id = me and day = d;
  return tgt;
end $$;
