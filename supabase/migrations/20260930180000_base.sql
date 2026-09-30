-- Fase 1: perfiles, preferencias visuales y cuota de IA por usuario.

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  avatar      text not null default 'a1',
  palette     text not null default 'noche-azul'
              check (palette in ('rosa-claro', 'noche-azul', 'noche-verde')),
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Todos los usuarios autenticados se ven entre sí (nombre y avatar para retos).
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Crea el perfil al registrarse, con el nombre enviado en el signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cuota diaria de llamadas a la IA (análisis de comida).
create table public.ai_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null,
  calls    int  not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated using (auth.uid() = user_id);

-- Suma una llamada y devuelve si el usuario sigue dentro del límite.
-- Día calculado en hora de Colombia.
create or replace function public.consume_ai_quota(max_calls int default 40)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  uid   uuid := auth.uid();
  today date := (now() at time zone 'America/Bogota')::date;
  n     int;
begin
  if uid is null then
    return false;
  end if;
  insert into public.ai_usage (user_id, day, calls) values (uid, today, 1)
  on conflict (user_id, day) do update set calls = public.ai_usage.calls + 1
  returning calls into n;
  return n <= least(max_calls, 60);
end $$;

revoke all on function public.consume_ai_quota(int) from public, anon;
grant execute on function public.consume_ai_quota(int) to authenticated;
