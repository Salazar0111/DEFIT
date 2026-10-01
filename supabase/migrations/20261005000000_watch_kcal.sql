-- Calorías del entrenamiento según el reloj (ingresadas a mano; una app web no puede leer Salud).
-- El valor del reloj reemplaza la estimación de ese tipo de día, con tope: sube la meta como máximo 50%
-- de lo estimado y puede bajarla hasta anular el entreno. Los relojes sobrestiman calorías.

alter table public.profiles add column burns jsonb;            -- kcal estimadas de entreno por tipo de día
alter table public.workout_logs add column watch_kcal int check (watch_kcal between 0 and 5000);

create table public.day_burn (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  kcal    int  not null check (kcal between 1 and 5000),
  primary key (user_id, day)
);

alter table public.day_burn enable row level security;
create policy "day_burn_read_own" on public.day_burn for select to authenticated using (user_id = auth.uid());

create or replace function public.day_target(uid uuid, d date)
returns int language plpgsql stable security definer set search_path = '' as $$
declare
  p public.profiles;
  ov text;
  t text;
  dow int := extract(isodow from d)::int;
  base int;
  est int;
  w int;
  adj int := 0;
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
  base := coalesce((p.targets ->> t)::int, p.target_kcal);
  est := coalesce((p.burns ->> t)::int, 0);
  select kcal into w from public.day_burn where user_id = uid and day = d;
  if w is not null and est > 0 then
    adj := greatest(-est, least(w - est, (est * 0.5)::int));
  end if;
  return base + adj;
end $$;

create or replace function public.set_watch_kcal(d date, k int)
returns int language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  today date := public.bogota_today();
  tgt int;
begin
  if me is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if (select plan_version from public.profiles where id = me) < 2 then raise exception 'PLAN_V1'; end if;
  if not (d = today or (d = today - 1 and (now() at time zone 'America/Bogota')::time < time '12:00')) then
    raise exception 'DAY_LOCKED';
  end if;
  if k is null or k <= 0 then
    delete from public.day_burn where user_id = me and day = d;
  elsif k > 5000 then
    raise exception 'BAD_VALUE';
  else
    insert into public.day_burn (user_id, day, kcal) values (me, d, k)
    on conflict (user_id, day) do update set kcal = excluded.kcal;
  end if;
  tgt := public.day_target(me, d);
  update public.daily_totals set target_kcal = tgt where user_id = me and day = d;
  return tgt;
end $$;

revoke all on function public.set_watch_kcal(date, int) from public, anon;
grant execute on function public.set_watch_kcal(date, int) to authenticated;

-- Si cambia el plan (incluidas las kcal estimadas), la meta de hoy se actualiza.
create or replace function public.sync_today_target()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.targets, new.target_kcal, new.train_days, new.leg_days, new.plan_version, new.day_plan, new.burns)
     is distinct from (old.targets, old.target_kcal, old.train_days, old.leg_days, old.plan_version, old.day_plan, old.burns) then
    update public.daily_totals set target_kcal = public.day_target(new.id, public.bogota_today())
    where user_id = new.id and day = public.bogota_today();
  end if;
  return null;
end $$;
