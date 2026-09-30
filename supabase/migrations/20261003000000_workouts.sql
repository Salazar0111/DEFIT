-- Entreno: rutina elegida por cada persona y registro de sesiones y series.

alter table public.profiles add column routine jsonb;   -- { "template": "...", "days": { "1": {name, leg, exercises:[{id, sets, reps}]} } }

create table public.workout_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  day         date not null,
  name        text not null check (length(name) between 1 and 60),
  leg         boolean not null default false,
  duration_s  int check (duration_s between 0 and 86400),
  created_at  timestamptz not null default now()
);

create index workout_logs_user_day on public.workout_logs (user_id, day desc);

create table public.workout_sets (
  id            bigint generated always as identity primary key,
  log_id        bigint not null references public.workout_logs (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  exercise_id   text not null,
  exercise_name text not null,
  set_no        int not null check (set_no between 1 and 30),
  kg            numeric(6, 2) not null check (kg between 0 and 1000),
  reps          int not null check (reps between 1 and 200),
  created_at    timestamptz not null default now()
);

create index workout_sets_user_ex on public.workout_sets (user_id, exercise_id, created_at desc);

alter table public.workout_logs enable row level security;
alter table public.workout_sets enable row level security;

create policy "workout_logs_own" on public.workout_logs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_sets_own" on public.workout_sets
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
