-- Récords de fuerza: se detectan al guardar cada serie. Un récord supera lo mejor de sesiones anteriores
-- (la primera vez que haces un ejercicio es la base, no un récord). Fuerza estimada con Epley, válida hasta 10 reps.

create table public.exercise_records (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  exercise_id   text not null,
  exercise_name text not null,
  log_id        bigint not null references public.workout_logs (id) on delete cascade,
  kg            numeric(6, 2) not null,
  reps          int not null,
  e1rm          numeric(6, 1),
  created_at    timestamptz not null default now(),
  unique (user_id, log_id, exercise_id)
);

create index exercise_records_user on public.exercise_records (user_id, created_at desc);

alter table public.exercise_records enable row level security;
create policy "exercise_records_own" on public.exercise_records for select to authenticated using (user_id = auth.uid());

alter table public.activity drop constraint activity_kind_check;
alter table public.activity add constraint activity_kind_check check (kind in (
  'challenge_invite', 'challenge_accept', 'challenge_decline', 'challenge_won', 'challenge_draw',
  'challenge_forfeit', 'challenge_cancelled', 'medal', 'poke', 'pr'));

-- Las medallas de fuerza también salen en el muro.
create or replace function public.award(uid uuid, k text, pkey text, cid bigint default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.medals (user_id, kind, period_key, challenge_id) values (uid, k, pkey, cid)
  on conflict do nothing;
  if found and k in ('first_entry', 'streak_7', 'streak_30', 'streak_100', 'week_logged', 'perfect_week',
                     'pr_first', 'pr_10', 'pr_50', 'week_trained', 'stronger') then
    perform public.log_activity('medal', uid, '{}', cid, jsonb_build_object('medal', k));
  end if;
  return found;
end $$;

create or replace function public.e1rm_of(kg numeric, reps int)
returns numeric language sql immutable as $$
  select case when reps <= 1 then kg when reps <= 10 then round(kg * (1 + reps / 30.0), 1) end
$$;

create or replace function public.on_workout_set()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  prev_kg numeric;
  prev_e numeric;
  new_e numeric := public.e1rm_of(new.kg, new.reps);
  inserted boolean;
  cnt int;
  first_e numeric;
  first_log bigint;
begin
  select max(kg), max(public.e1rm_of(kg, reps)) into prev_kg, prev_e
  from public.workout_sets where user_id = new.user_id and exercise_id = new.exercise_id and log_id <> new.log_id;
  if prev_kg is null then return null; end if;   -- primera vez: es la base
  if not (new.kg > prev_kg or (new_e is not null and prev_e is not null and new_e > prev_e)) then return null; end if;

  insert into public.exercise_records (user_id, exercise_id, exercise_name, log_id, kg, reps, e1rm)
  values (new.user_id, new.exercise_id, new.exercise_name, new.log_id, new.kg, new.reps, new_e)
  on conflict (user_id, log_id, exercise_id) do update
    set kg = excluded.kg, reps = excluded.reps, e1rm = excluded.e1rm
    where coalesce(excluded.e1rm, 0) > coalesce(public.exercise_records.e1rm, 0) or excluded.kg > public.exercise_records.kg
  returning (xmax = 0) into inserted;

  if coalesce(inserted, false) then
    select count(*) into cnt from public.exercise_records where user_id = new.user_id;
    perform public.log_activity('pr', new.user_id, '{}', null,
      jsonb_build_object('exercise', new.exercise_name, 'kg', new.kg, 'reps', new.reps));
    if cnt >= 1 then perform public.award(new.user_id, 'pr_first', 'first'); end if;
    if cnt >= 10 then perform public.award(new.user_id, 'pr_10', 'ten'); end if;
    if cnt >= 50 then perform public.award(new.user_id, 'pr_50', 'fifty'); end if;
  end if;

  -- Más fuerte: +10% sobre tu primera sesión en ese ejercicio.
  select min(log_id) into first_log from public.workout_sets where user_id = new.user_id and exercise_id = new.exercise_id;
  select max(public.e1rm_of(kg, reps)) into first_e from public.workout_sets where log_id = first_log and exercise_id = new.exercise_id;
  if new_e is not null and first_e is not null and first_e > 0 and new_e >= first_e * 1.10 then
    perform public.award(new.user_id, 'stronger', new.exercise_id);
  end if;
  return null;
end $$;

create trigger workout_sets_records after insert on public.workout_sets
  for each row execute function public.on_workout_set();

-- Semana completa de entreno: cumplir todos los días que te propusiste (lunes a domingo).
create or replace function public.weekly_training_close()
returns void language plpgsql security definer set search_path = '' as $$
declare
  y date := public.bogota_today() - 1;
  wk date := public.bogota_today() - 7;
  p record;
begin
  if extract(isodow from y) <> 7 then return; end if;
  for p in select id, train_days from public.profiles where trains and array_length(train_days, 1) > 0 loop
    if (select count(distinct day) from public.workout_logs where user_id = p.id and day between wk and y) >= array_length(p.train_days, 1) then
      perform public.award(p.id, 'week_trained', wk::text);
    end if;
  end loop;
end $$;

revoke all on function public.weekly_training_close() from public, anon, authenticated;
