-- Fase 3: registro de comidas, suscripciones push y recordatorios.

create table public.food_entries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  day         date not null,
  meal        text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  name        text not null check (length(name) between 1 and 80),
  kcal        int  not null check (kcal between 0 and 5000),
  protein_g   numeric(6, 1) not null default 0 check (protein_g >= 0),
  carbs_g     numeric(6, 1) not null default 0 check (carbs_g >= 0),
  fat_g       numeric(6, 1) not null default 0 check (fat_g >= 0),
  portion     text check (length(portion) <= 80),
  source      text not null default 'manual' check (source in ('photo', 'search', 'manual')),
  created_at  timestamptz not null default now()
);

create index food_entries_user_day on public.food_entries (user_id, day);

alter table public.food_entries enable row level security;

create policy "food_entries_own" on public.food_entries
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Recordatorios: horas locales (HH:MM) y si están activos.
alter table public.profiles
  add column timezone  text not null default 'America/Bogota',
  add column reminders jsonb not null default '{
    "breakfast": {"on": true,  "at": "07:30"},
    "lunch":     {"on": true,  "at": "13:00"},
    "dinner":    {"on": true,  "at": "19:30"},
    "weigh":     {"on": true,  "at": "07:00"},
    "nudge":     {"on": true,  "at": "21:30"}
  }'::jsonb;

create table public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_own" on public.push_subscriptions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Evita enviar el mismo recordatorio dos veces el mismo día.
create table public.reminder_log (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null,
  kind     text not null,
  sent_at  timestamptz not null default now(),
  primary key (user_id, day, kind)
);

alter table public.reminder_log enable row level security;
