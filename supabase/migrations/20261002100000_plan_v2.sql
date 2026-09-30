-- Plan v2: entrenamiento, objetivos nuevos y meta por tipo de día.
-- Las cuentas existentes siguen en plan_version = 1 (meta fija) hasta que elijan actualizar.

alter table public.profiles
  add column lifestyle    text check (lifestyle in ('seated', 'standing', 'physical')),
  add column trains       boolean not null default false,
  add column train_type   text check (train_type in ('weights', 'cardio', 'both')),
  add column train_days   int[] not null default '{}',   -- isodow: 1 = lunes … 7 = domingo
  add column leg_days     int[] not null default '{}',
  add column session_min  int check (session_min between 20 and 180),
  add column intensity    text check (intensity in ('moderate', 'intense')),
  add column goal         text check (goal in ('lose', 'recomp', 'maintain', 'gain_clean', 'gain_fast')),
  add column target_mode  text not null default 'by_day' check (target_mode in ('by_day', 'fixed')),
  add column body_fat     numeric(4, 1) check (body_fat between 3 and 60),
  add column protein_g    int,
  add column targets      jsonb,                       -- { "rest": kcal, "train": kcal, "leg": kcal }
  add column plan_version int not null default 1;

-- Cambio de tipo de día puntual (descanso, entreno o pierna), solo hoy o ayer por la mañana.
create table public.day_types (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  type    text not null check (type in ('rest', 'train', 'leg')),
  primary key (user_id, day)
);

alter table public.day_types enable row level security;
create policy "day_types_read_own" on public.day_types for select to authenticated using (user_id = auth.uid());

-- Meta del día: tipo de día (cambio puntual o calendario) → meta guardada en el plan.
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
  t := coalesce(ov, case when dow = any(p.leg_days) then 'leg' when dow = any(p.train_days) then 'train' else 'rest' end);
  return coalesce((p.targets ->> t)::int, p.target_kcal);
end $$;

revoke all on function public.day_target(uuid, date) from public, anon, authenticated;
grant execute on function public.day_target(uuid, date) to service_role;

-- Cada día guarda la meta con la que se juzga (los retos comparan contra esta).
alter table public.daily_totals add column target_kcal int;

update public.daily_totals d set target_kcal = p.target_kcal
from public.profiles p where p.id = d.user_id and d.target_kcal is null;

create or replace function public.refresh_daily_total(uid uuid, d date)
returns void language plpgsql security definer set search_path = '' as $$
declare k int; n int;
begin
  select coalesce(sum(kcal), 0), count(*) into k, n from public.food_entries where user_id = uid and day = d;
  if n = 0 then
    delete from public.daily_totals where user_id = uid and day = d;
  else
    insert into public.daily_totals (user_id, day, kcal, entries, target_kcal) values (uid, d, k, n, public.day_target(uid, d))
    on conflict (user_id, day) do update set kcal = excluded.kcal, entries = excluded.entries;
  end if;
end $$;

-- Si cambia el plan, la meta de hoy se actualiza (la historia no).
create or replace function public.sync_today_target()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.targets, new.target_kcal, new.train_days, new.leg_days, new.plan_version)
     is distinct from (old.targets, old.target_kcal, old.train_days, old.leg_days, old.plan_version) then
    update public.daily_totals set target_kcal = public.day_target(new.id, public.bogota_today())
    where user_id = new.id and day = public.bogota_today();
  end if;
  return null;
end $$;

create trigger profiles_sync_today after update on public.profiles
  for each row execute function public.sync_today_target();

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
  -- Hoy, o ayer solo hasta el mediodía de hoy.
  if not (d = today or (d = today - 1 and (now at time zone 'America/Bogota')::time < time '12:00')) then
    raise exception 'DAY_LOCKED';
  end if;
  insert into public.day_types (user_id, day, type) values (me, d, t)
  on conflict (user_id, day) do update set type = excluded.type;
  tgt := public.day_target(me, d);
  update public.daily_totals set target_kcal = tgt where user_id = me and day = d;
  return tgt;
end $$;

revoke all on function public.set_day_type(date, text) from public, anon;
grant execute on function public.set_day_type(date, text) to authenticated;

-- Los retos comparan contra la meta de cada día (si falta, contra la meta del miembro).
create or replace function public.days_in_range(uid uuid, target int, d_from date, d_to date)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.daily_totals t
  where t.user_id = uid and t.day between d_from and d_to
    and t.kcal between coalesce(t.target_kcal, target) * 0.9 and coalesce(t.target_kcal, target) * 1.1
$$;

create or replace function public.avg_deviation(uid uuid, target int, d_from date, d_to date)
returns numeric language sql stable security definer set search_path = '' as $$
  select case when d_to < d_from then null else round(avg(
    case when t.kcal is null or coalesce(t.target_kcal, target) is null or coalesce(t.target_kcal, target) <= 0 then 1
         else abs(t.kcal - coalesce(t.target_kcal, target))::numeric / coalesce(t.target_kcal, target) end
  ), 4) end
  from generate_series(d_from, d_to, interval '1 day') g(day)
  left join public.daily_totals t on t.user_id = uid and t.day = g.day::date
$$;

create or replace function public.profile_stats(uid uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  today date := public.bogota_today();
  target int;
  cur int := 0;
  best int := 0;
  start_d date;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select target_kcal into target from public.profiles where id = uid;
  start_d := case when exists (select 1 from public.daily_totals where user_id = uid and day = today) then today else today - 1 end;
  while exists (select 1 from public.daily_totals where user_id = uid and day = start_d - cur) loop
    cur := cur + 1;
  end loop;
  select coalesce(max(n), 0) into best from (
    select count(*) n from (
      select day - (row_number() over (order by day))::int as grp from public.daily_totals where user_id = uid
    ) s group by grp
  ) t;
  return jsonb_build_object(
    'current_streak', cur,
    'best_streak', greatest(best, cur),
    'days_logged', (select count(*) from public.daily_totals where user_id = uid),
    'days_in_range', (select count(*) from public.daily_totals t where t.user_id = uid
                        and coalesce(t.target_kcal, target) is not null
                        and t.kcal between coalesce(t.target_kcal, target) * 0.9 and coalesce(t.target_kcal, target) * 1.1),
    'challenges_played', (select count(*) from public.challenge_members m join public.challenges c on c.id = m.challenge_id
                            where m.user_id = uid and m.status = 'accepted' and c.status = 'finished'),
    'challenges_won', (select count(*) from public.challenge_members m join public.challenges c on c.id = m.challenge_id
                         where m.user_id = uid and m.winner and c.status = 'finished'),
    'medals', (select count(*) from public.medals where user_id = uid)
  );
end $$;

-- El plan sigue bloqueado durante un reto (incluye los datos nuevos). Cambiar el tipo de día sí se permite.
create or replace function public.guard_plan_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.target_kcal, new.deficit, new.activity, new.frame, new.sex, new.birthdate, new.height_cm, new.weight_kg,
      new.lifestyle, new.trains, new.train_type, new.train_days, new.leg_days, new.session_min, new.intensity,
      new.goal, new.target_mode, new.body_fat, new.targets, new.plan_version)
     is distinct from
     (old.target_kcal, old.deficit, old.activity, old.frame, old.sex, old.birthdate, old.height_cm, old.weight_kg,
      old.lifestyle, old.trains, old.train_type, old.train_days, old.leg_days, old.session_min, old.intensity,
      old.goal, old.target_mode, old.body_fat, old.targets, old.plan_version)
     and exists (
       select 1 from public.challenge_members m join public.challenges c on c.id = m.challenge_id
       where m.user_id = new.id and m.status = 'accepted' and not m.forfeited and c.status in ('pending', 'active')
     ) then
    raise exception 'PLAN_LOCKED';
  end if;
  return new;
end $$;
