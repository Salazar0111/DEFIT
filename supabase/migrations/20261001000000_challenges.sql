-- Fase 4: retos entre amigos, totales diarios en tiempo real, medallas y bloqueo del plan.
-- Todo se calcula en hora de Colombia. Un día cuenta como cumplido entre 90% y 110% de la meta.

create or replace function public.bogota_today()
returns date language sql stable as $$ select (now() at time zone 'America/Bogota')::date $$;

-- ─── Totales diarios (lo único que ven los rivales de tus comidas) ─────────

create table public.daily_totals (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null,
  kcal     int  not null default 0,
  entries  int  not null default 0,
  primary key (user_id, day)
);

create or replace function public.refresh_daily_total(uid uuid, d date)
returns void language plpgsql security definer set search_path = '' as $$
declare k int; n int;
begin
  select coalesce(sum(kcal), 0), count(*) into k, n from public.food_entries where user_id = uid and day = d;
  if n = 0 then
    delete from public.daily_totals where user_id = uid and day = d;
  else
    insert into public.daily_totals (user_id, day, kcal, entries) values (uid, d, k, n)
    on conflict (user_id, day) do update set kcal = excluded.kcal, entries = excluded.entries;
  end if;
end $$;

create or replace function public.food_entries_totals()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform public.refresh_daily_total(old.user_id, old.day); end if;
  if tg_op in ('INSERT', 'UPDATE') then perform public.refresh_daily_total(new.user_id, new.day); end if;
  return null;
end $$;

create trigger food_entries_totals after insert or update or delete on public.food_entries
  for each row execute function public.food_entries_totals();

insert into public.daily_totals (user_id, day, kcal, entries)
select user_id, day, sum(kcal), count(*) from public.food_entries group by user_id, day;

-- ─── Retos ────────────────────────────────────────────────────────────────

create table public.challenges (
  id           bigint generated always as identity primary key,
  created_by   uuid not null references auth.users (id) on delete cascade,
  mode         text not null check (mode in ('duration', 'first_to')),
  length_days  int  not null check (length_days between 3 and 60),  -- duración, o días a alcanzar
  status       text not null default 'pending' check (status in ('pending', 'active', 'finished', 'cancelled')),
  start_day    date,
  end_day      date,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create table public.challenge_members (
  challenge_id bigint not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
  target_kcal  int,      -- meta congelada al aceptar
  days_done    int not null default 0,
  winner       boolean not null default false,
  primary key (challenge_id, user_id)
);

create index challenge_members_user on public.challenge_members (user_id);

alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;
alter table public.daily_totals enable row level security;

create or replace function public.is_challenge_member(cid bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.challenge_members where challenge_id = cid and user_id = auth.uid())
$$;

-- ¿Comparto (o compartí) un reto con este usuario?
create or replace function public.shares_challenge(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.challenge_members a
    join public.challenge_members b on b.challenge_id = a.challenge_id
    join public.challenges c on c.id = a.challenge_id
    where a.user_id = auth.uid() and b.user_id = other and c.status <> 'cancelled'
  )
$$;

create policy "challenges_members_read" on public.challenges
  for select to authenticated using (public.is_challenge_member(id));

create policy "challenge_members_read" on public.challenge_members
  for select to authenticated using (public.is_challenge_member(challenge_id));

create policy "daily_totals_read" on public.daily_totals
  for select to authenticated using (user_id = auth.uid() or public.shares_challenge(user_id));

-- ─── Medallas ─────────────────────────────────────────────────────────────

create table public.medals (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  kind         text not null,
  period_key   text not null,          -- día, semana o id del reto
  challenge_id bigint references public.challenges (id) on delete set null,
  earned_at    timestamptz not null default now(),
  seen         boolean not null default false,
  unique (user_id, kind, period_key)
);

alter table public.medals enable row level security;

create policy "medals_read" on public.medals
  for select to authenticated using (user_id = auth.uid() or public.shares_challenge(user_id));

create policy "medals_mark_seen" on public.medals
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── Notificaciones de eventos (vía Edge Function) ───────────────────────

create or replace function public.notify_users(uids uuid[], title text, body text, url text default '/?tab=challenges')
returns void language plpgsql security definer set search_path = '' as $$
declare secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'reminders_cron_secret';
  if secret is null or uids is null or array_length(uids, 1) is null then return; end if;
  perform net.http_post(
    url := 'https://hlixfgtotelmytgjsprb.supabase.co/functions/v1/reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
    body := jsonb_build_object('event', true, 'user_ids', to_jsonb(uids), 'title', title, 'body', body, 'url', url)
  );
end $$;

revoke all on function public.notify_users(uuid[], text, text, text) from public, anon, authenticated;

-- ─── Acciones de retos (la app solo puede actuar por estas funciones) ─────

create or replace function public.create_challenge(opponents uuid[], mode text, length_days int)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_target int;
  my_name text;
  cid bigint;
  o uuid;
begin
  if me is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select target_kcal, name into my_target, my_name from public.profiles where id = me and onboarded;
  if my_target is null then raise exception 'PLAN_REQUIRED'; end if;
  if mode not in ('duration', 'first_to') then raise exception 'BAD_MODE'; end if;
  if opponents is null or array_length(opponents, 1) is null or array_length(opponents, 1) > 10 or me = any(opponents) then
    raise exception 'BAD_OPPONENTS';
  end if;
  if (select count(*) from public.profiles where id = any(opponents)) <> array_length(opponents, 1) then
    raise exception 'BAD_OPPONENTS';
  end if;

  insert into public.challenges (created_by, mode, length_days) values (me, mode, length_days) returning id into cid;
  insert into public.challenge_members (challenge_id, user_id, status, target_kcal) values (cid, me, 'accepted', my_target);
  foreach o in array opponents loop
    insert into public.challenge_members (challenge_id, user_id) values (cid, o);
  end loop;

  perform public.notify_users(opponents, my_name || ' te retó',
    case when mode = 'duration' then 'Cumplir tu meta calórica más días en ' || length_days || ' días. ¿Aceptas?'
         else 'El primero en cumplir su meta ' || length_days || ' días gana. ¿Aceptas?' end);
  return cid;
end $$;

create or replace function public.respond_challenge(cid bigint, accept boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  c public.challenges;
  my_target int;
  my_name text;
  others uuid[];
begin
  select * into c from public.challenges where id = cid for update;
  if c.id is null or c.status <> 'pending' then raise exception 'NOT_PENDING'; end if;
  if not exists (select 1 from public.challenge_members where challenge_id = cid and user_id = me and status = 'invited') then
    raise exception 'NOT_INVITED';
  end if;
  select target_kcal, name into my_target, my_name from public.profiles where id = me and onboarded;
  select array_agg(user_id) into others from public.challenge_members where challenge_id = cid and user_id <> me and status = 'accepted';

  if not accept then
    update public.challenge_members set status = 'declined' where challenge_id = cid and user_id = me;
    -- Si ya nadie más está invitado y solo queda el creador, se cancela.
    if (select count(*) from public.challenge_members where challenge_id = cid and status in ('accepted', 'invited')) < 2 then
      update public.challenges set status = 'cancelled' where id = cid;
    elsif not exists (select 1 from public.challenge_members where challenge_id = cid and status = 'invited') then
      update public.challenges set status = 'active', start_day = public.bogota_today() + 1,
        end_day = public.bogota_today() + case when mode = 'duration' then length_days else length_days * 2 end
      where id = cid;
    end if;
    perform public.notify_users(others, my_name || ' no aceptó el reto', 'Puedes retar a alguien más cuando quieras.');
    return 'declined';
  end if;

  if my_target is null then raise exception 'PLAN_REQUIRED'; end if;
  update public.challenge_members set status = 'accepted', target_kcal = my_target where challenge_id = cid and user_id = me;

  if not exists (select 1 from public.challenge_members where challenge_id = cid and status = 'invited') then
    -- Todos aceptaron: empieza mañana. "El primero en llegar" tiene como plazo el doble de días.
    update public.challenges set status = 'active', start_day = public.bogota_today() + 1,
      end_day = public.bogota_today() + case when mode = 'duration' then length_days else length_days * 2 end
    where id = cid;
    perform public.notify_users(others, my_name || ' aceptó tu reto', 'Empieza mañana. Que gane el más constante.');
    return 'active';
  end if;
  perform public.notify_users(others, my_name || ' aceptó tu reto', 'Falta que acepten los demás.');
  return 'accepted';
end $$;

create or replace function public.cancel_challenge(cid bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.challenges set status = 'cancelled'
  where id = cid and created_by = auth.uid() and status = 'pending';
  if not found then raise exception 'CANNOT_CANCEL'; end if;
end $$;

revoke all on function public.create_challenge(uuid[], text, int) from public, anon;
revoke all on function public.respond_challenge(bigint, boolean) from public, anon;
revoke all on function public.cancel_challenge(bigint) from public, anon;
grant execute on function public.create_challenge(uuid[], text, int) to authenticated;
grant execute on function public.respond_challenge(bigint, boolean) to authenticated;
grant execute on function public.cancel_challenge(bigint) to authenticated;

-- ─── Bloqueo del plan durante un reto ─────────────────────────────────────

create or replace function public.guard_plan_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.target_kcal, new.deficit, new.activity, new.frame, new.sex, new.birthdate, new.height_cm, new.weight_kg)
     is distinct from
     (old.target_kcal, old.deficit, old.activity, old.frame, old.sex, old.birthdate, old.height_cm, old.weight_kg)
     and exists (
       select 1 from public.challenge_members m join public.challenges c on c.id = m.challenge_id
       where m.user_id = new.id and m.status = 'accepted' and c.status in ('pending', 'active')
     ) then
    raise exception 'PLAN_LOCKED';
  end if;
  return new;
end $$;

create trigger profiles_guard_plan before update on public.profiles
  for each row execute function public.guard_plan_changes();

-- ─── Cierre diario: resultados de retos y medallas ────────────────────────

create or replace function public.days_in_range(uid uuid, target int, d_from date, d_to date)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.daily_totals
  where user_id = uid and day between d_from and d_to and kcal between target * 0.9 and target * 1.1
$$;

create or replace function public.award(uid uuid, k text, pkey text, cid bigint default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.medals (user_id, kind, period_key, challenge_id) values (uid, k, pkey, cid)
  on conflict do nothing;
  return found;
end $$;

create or replace function public.daily_close()
returns void language plpgsql security definer set search_path = '' as $$
declare
  today date := public.bogota_today();
  y date := today - 1;
  c record;
  m record;
  p record;
  best int;
  reached boolean;
  streak int;
  wk date;
  winners uuid[];
  losers uuid[];
begin
  -- Invitaciones sin respuesta en 3 días se cancelan.
  update public.challenges set status = 'cancelled' where status = 'pending' and created_at < now() - interval '3 days';

  -- Progreso y resultados de retos activos.
  for c in select * from public.challenges where status = 'active' and start_day <= y loop
    update public.challenge_members set days_done = public.days_in_range(user_id, target_kcal, c.start_day, least(y, c.end_day))
    where challenge_id = c.id and status = 'accepted';

    select max(days_done) into best from public.challenge_members where challenge_id = c.id and status = 'accepted';
    reached := c.mode = 'first_to' and best >= c.length_days;

    if reached or c.end_day <= y then
      update public.challenge_members set winner = (best > 0 and days_done = best)
      where challenge_id = c.id and status = 'accepted';
      update public.challenges set status = 'finished', finished_at = now() where id = c.id;

      winners := array(select user_id from public.challenge_members where challenge_id = c.id and winner);
      losers := array(select user_id from public.challenge_members where challenge_id = c.id and status = 'accepted' and not winner);
      for m in select user_id, winner from public.challenge_members where challenge_id = c.id and status = 'accepted' loop
        perform public.award(m.user_id, 'challenge_done', c.id::text, c.id);
        if m.winner then perform public.award(m.user_id, 'challenge_won', c.id::text, c.id); end if;
      end loop;
      perform public.notify_users(winners, case when array_length(winners, 1) > 1 then 'Reto empatado' else 'Ganaste el reto' end,
        'Cumpliste tu meta ' || best || ' días. Tienes una medalla nueva.');
      perform public.notify_users(losers, 'Terminó el reto', 'Esta vez no fue. Revancha cuando quieras.');
    end if;
  end loop;

  -- Medallas personales del día anterior.
  for p in select id, target_kcal from public.profiles where onboarded and target_kcal is not null loop
    if exists (select 1 from public.daily_totals where user_id = p.id) then
      perform public.award(p.id, 'first_entry', 'first');
    end if;
    if public.days_in_range(p.id, p.target_kcal, y, y) = 1 then
      perform public.award(p.id, 'day_in_range', y::text);
    end if;

    -- Racha de días registrados que termina ayer.
    streak := 0;
    while streak <= 100 and exists (select 1 from public.daily_totals where user_id = p.id and day = y - streak) loop
      streak := streak + 1;
    end loop;
    if streak in (7, 30, 100) then perform public.award(p.id, 'streak_' || streak, y::text); end if;

    -- Cierre de semana (lunes a domingo) cuando ayer fue domingo.
    if extract(isodow from y) = 7 then
      wk := y - 6;
      if (select count(*) from public.daily_totals where user_id = p.id and day between wk and y) = 7 then
        perform public.award(p.id, 'week_logged', wk::text);
      end if;
      if public.days_in_range(p.id, p.target_kcal, wk, y) = 7 then
        perform public.award(p.id, 'perfect_week', wk::text);
      end if;
    end if;
  end loop;
end $$;

revoke all on function public.daily_close() from public, anon, authenticated;
revoke all on function public.award(uuid, text, text, bigint) from public, anon, authenticated;

-- ─── Tiempo real ──────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.daily_totals, public.challenges, public.challenge_members, public.medals;
