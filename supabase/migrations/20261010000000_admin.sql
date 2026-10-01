-- Panel de administración: quién usa la app, cuánto consume de la IA y con qué frecuencia vuelve.
-- Solo las cuentas en public.admins pueden consultar; la tabla no tiene políticas (nadie se da el permiso desde la app).

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;

insert into public.admins (user_id)
select id from auth.users where lower(email) = 'brayansalazar11.bs@gmail.com';

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ─── Consumo de la IA: tokens por día ─────────────────────────────────────
alter table public.ai_usage
  add column input_tokens  bigint not null default 0,
  add column output_tokens bigint not null default 0;

-- La función de análisis suma los tokens de cada llamada a la fila de hoy de quien la hizo.
create or replace function public.record_ai_tokens(t_in int, t_out int)
returns void language sql security definer set search_path = '' as $$
  update public.ai_usage
  set input_tokens = input_tokens + least(greatest(coalesce(t_in, 0), 0), 100000),
      output_tokens = output_tokens + least(greatest(coalesce(t_out, 0), 0), 100000)
  where user_id = auth.uid() and day = public.bogota_today()
$$;
revoke all on function public.record_ai_tokens(int, int) from public, anon;
grant execute on function public.record_ai_tokens(int, int) to authenticated;

-- ─── Días en que se abrió la app (solo la fecha, sin contenido) ───────────
create table public.app_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  primary key (user_id, day)
);
alter table public.app_activity enable row level security;

create or replace function public.touch_activity()
returns void language sql security definer set search_path = '' as $$
  insert into public.app_activity (user_id, day) values (auth.uid(), public.bogota_today()) on conflict do nothing
$$;
revoke all on function public.touch_activity() from public, anon;
grant execute on function public.touch_activity() to authenticated;

-- Días activos de cada persona: abrió la app o registró algo (así hay historia desde antes de medir aperturas).
create or replace function public.activity_days()
returns table (user_id uuid, day date) language sql stable security definer set search_path = '' as $$
  select a.user_id, a.day from public.app_activity a
  union select t.user_id, t.day from public.daily_totals t
  union select w.user_id, w.day from public.workout_logs w
  union select b.user_id, b.day from public.weight_logs b
$$;
revoke all on function public.activity_days() from public, anon, authenticated;

-- ─── Consultas del panel ──────────────────────────────────────────────────
create or replace function public.admin_users()
returns table (
  id uuid, name text, username text, email text, joined date, onboarded boolean, goal text,
  last_active date, active_7 int, active_30 int, meals_30 int, workouts_30 int, challenges int,
  ai_today int, ai_7 int, ai_30 int, ai_total int,
  tok_in_30 bigint, tok_out_30 bigint, tok_in_total bigint, tok_out_total bigint
) language plpgsql stable security definer set search_path = '' as $$
declare today date := public.bogota_today();
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  return query
  with act as (select * from public.activity_days())
  select p.id, p.name, p.username, u.email::text, (u.created_at at time zone 'America/Bogota')::date, p.onboarded, p.goal,
    (select max(a.day) from act a where a.user_id = p.id),
    (select count(*)::int from act a where a.user_id = p.id and a.day > today - 7),
    (select count(*)::int from act a where a.user_id = p.id and a.day > today - 30),
    (select count(*)::int from public.food_entries f where f.user_id = p.id and f.day > today - 30),
    (select count(*)::int from public.workout_logs w where w.user_id = p.id and w.day > today - 30),
    (select count(*)::int from public.challenge_members m where m.user_id = p.id and m.status = 'accepted'),
    coalesce((select sum(i.calls) from public.ai_usage i where i.user_id = p.id and i.day = today), 0)::int,
    coalesce((select sum(i.calls) from public.ai_usage i where i.user_id = p.id and i.day > today - 7), 0)::int,
    coalesce((select sum(i.calls) from public.ai_usage i where i.user_id = p.id and i.day > today - 30), 0)::int,
    coalesce((select sum(i.calls) from public.ai_usage i where i.user_id = p.id), 0)::int,
    coalesce((select sum(i.input_tokens) from public.ai_usage i where i.user_id = p.id and i.day > today - 30), 0)::bigint,
    coalesce((select sum(i.output_tokens) from public.ai_usage i where i.user_id = p.id and i.day > today - 30), 0)::bigint,
    coalesce((select sum(i.input_tokens) from public.ai_usage i where i.user_id = p.id), 0)::bigint,
    coalesce((select sum(i.output_tokens) from public.ai_usage i where i.user_id = p.id), 0)::bigint
  from public.profiles p join auth.users u on u.id = p.id
  order by 8 desc nulls last;
end $$;

create or replace function public.admin_daily(n int default 30)
returns table (day date, active_users int, ai_calls int, tok_in bigint, tok_out bigint)
language plpgsql stable security definer set search_path = '' as $$
declare today date := public.bogota_today();
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  return query
  with act as (select * from public.activity_days())
  select d::date,
    (select count(distinct a.user_id)::int from act a where a.day = d::date),
    coalesce((select sum(i.calls) from public.ai_usage i where i.day = d::date), 0)::int,
    coalesce((select sum(i.input_tokens) from public.ai_usage i where i.day = d::date), 0)::bigint,
    coalesce((select sum(i.output_tokens) from public.ai_usage i where i.day = d::date), 0)::bigint
  from generate_series(today - (least(greatest(n, 1), 120) - 1), today, interval '1 day') d
  order by 1;
end $$;

revoke all on function public.admin_users(), public.admin_daily(int) from public, anon;
grant execute on function public.admin_users(), public.admin_daily(int) to authenticated;
