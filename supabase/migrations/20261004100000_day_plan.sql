-- Plan por día: cada día de entreno define su tipo (pesas, cardio o ambos) y sus grupos musculares.
-- day_plan: { "1": { "kind": "both", "muscles": ["chest", "legs"], "key": "cwl" }, ... } (clave = isodow)
-- key: tipo de día que fija la meta: train (pesas), leg (pesas con pierna), cardio, cw (cardio y pesas), cwl (cardio y pierna).

alter table public.profiles add column day_plan jsonb;

alter table public.day_types drop constraint day_types_type_check;
alter table public.day_types add constraint day_types_type_check check (type in ('rest', 'train', 'leg', 'cardio', 'cw', 'cwl'));

create or replace function public.day_target(uid uuid, d date)
returns int language plpgsql stable security definer set search_path = '' as $$
declare
  p public.profiles;
  ov text;
  t text;
  dow int := extract(isodow from d)::int;
begin
  select * into p from public.profiles where id = uid;
  if p.id is null then return null; end if;
  if p.plan_version < 2 or p.targets is null then return p.target_kcal; end if;
  select type into ov from public.day_types where user_id = uid and day = d;
  t := coalesce(
    ov,
    p.day_plan -> dow::text ->> 'key',
    case when p.day_plan is not null then 'rest'
         when dow = any(p.leg_days) then 'leg' when dow = any(p.train_days) then 'train' else 'rest' end);
  return coalesce((p.targets ->> t)::int, p.target_kcal);
end $$;

create or replace function public.set_day_type(d date, t text)
returns int language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  today date := public.bogota_today();
  tgt int;
begin
  if me is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if t not in ('rest', 'train', 'leg', 'cardio', 'cw', 'cwl') then raise exception 'BAD_TYPE'; end if;
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

create or replace function public.sync_today_target()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.targets, new.target_kcal, new.train_days, new.leg_days, new.plan_version, new.day_plan)
     is distinct from (old.targets, old.target_kcal, old.train_days, old.leg_days, old.plan_version, old.day_plan) then
    update public.daily_totals set target_kcal = public.day_target(new.id, public.bogota_today())
    where user_id = new.id and day = public.bogota_today();
  end if;
  return null;
end $$;

-- El plan por día también queda bloqueado durante un reto.
create or replace function public.guard_plan_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.target_kcal, new.deficit, new.activity, new.frame, new.sex, new.birthdate, new.height_cm, new.weight_kg,
      new.lifestyle, new.trains, new.train_type, new.train_days, new.leg_days, new.session_min, new.intensity,
      new.goal, new.target_mode, new.body_fat, new.targets, new.plan_version, new.day_plan)
     is distinct from
     (old.target_kcal, old.deficit, old.activity, old.frame, old.sex, old.birthdate, old.height_cm, old.weight_kg,
      old.lifestyle, old.trains, old.train_type, old.train_days, old.leg_days, old.session_min, old.intensity,
      old.goal, old.target_mode, old.body_fat, old.targets, old.plan_version, old.day_plan)
     and exists (
       select 1 from public.challenge_members m join public.challenges c on c.id = m.challenge_id
       where m.user_id = new.id and m.status = 'accepted' and not m.forfeited and c.status in ('pending', 'active')
     ) then
    raise exception 'PLAN_LOCKED';
  end if;
  return new;
end $$;
