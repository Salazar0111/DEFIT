-- Fase 2: datos corporales y plan calórico en el perfil, más registro de peso.

alter table public.profiles
  add column sex         text check (sex in ('f', 'm')),
  add column birthdate   date,
  add column height_cm   numeric(5, 1) check (height_cm between 120 and 230),
  add column weight_kg   numeric(5, 1) check (weight_kg between 30 and 300),
  add column frame       text check (frame in ('small', 'medium', 'large')),
  add column activity    text check (activity in ('sedentary', 'moderate', 'daily')),
  add column deficit     int  check (deficit in (0, 600, 800, 1000)),
  add column bmr         int,
  add column tdee        int,
  add column target_kcal int,
  add column plan_updated_at timestamptz;

create table public.weight_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  weight_kg  numeric(5, 1) not null check (weight_kg between 30 and 300),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

alter table public.weight_logs enable row level security;

create policy "weight_logs_own" on public.weight_logs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
