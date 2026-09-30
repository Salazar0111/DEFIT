-- Interacción entre perfiles: empujones, muro de actividad, estadísticas y celebración de resultados.

-- ─── Muro de actividad (visible para todo el grupo: el registro es cerrado) ──

create table public.activity (
  id           bigint generated always as identity primary key,
  kind         text not null check (kind in (
                 'challenge_invite', 'challenge_accept', 'challenge_decline',
                 'challenge_won', 'challenge_draw', 'medal', 'poke')),
  actor        uuid not null references auth.users (id) on delete cascade,
  targets      uuid[] not null default '{}',
  challenge_id bigint references public.challenges (id) on delete set null,
  data         jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index activity_created on public.activity (created_at desc);

alter table public.activity enable row level security;

create policy "activity_read" on public.activity for select to authenticated using (true);

create or replace function public.log_activity(k text, who uuid, others uuid[], cid bigint default null, extra jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.activity (kind, actor, targets, challenge_id, data) values (k, who, coalesce(others, '{}'), cid, extra)
$$;

revoke all on function public.log_activity(text, uuid, uuid[], bigint, jsonb) from public, anon, authenticated;

-- Las medallas y perfiles de los demás se pueden ver desde su perfil.
drop policy "medals_read" on public.medals;
create policy "medals_read" on public.medals for select to authenticated using (true);

-- ─── Empujones entre rivales ──────────────────────────────────────────────

create table public.pokes (
  id         bigint generated always as identity primary key,
  from_user  uuid not null references auth.users (id) on delete cascade,
  to_user    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('cheer', 'tease')),
  seen       boolean not null default false,
  created_at timestamptz not null default now()
);

create index pokes_to on public.pokes (to_user, seen);

alter table public.pokes enable row level security;

create policy "pokes_read" on public.pokes
  for select to authenticated using (from_user = auth.uid() or to_user = auth.uid());
create policy "pokes_mark_seen" on public.pokes
  for update to authenticated using (to_user = auth.uid()) with check (to_user = auth.uid());

create or replace function public.send_poke(target uuid, kind text)
returns int language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_name text;
  used int;
begin
  if me is null or target is null or target = me then raise exception 'BAD_TARGET'; end if;
  if kind not in ('cheer', 'tease') then raise exception 'BAD_KIND'; end if;
  if not exists (
    select 1 from public.challenge_members a
    join public.challenge_members b on b.challenge_id = a.challenge_id
    join public.challenges c on c.id = a.challenge_id
    where a.user_id = me and b.user_id = target and c.status = 'active'
  ) then raise exception 'NO_ACTIVE_CHALLENGE'; end if;

  select count(*) into used from public.pokes
  where from_user = me and to_user = target
    and (created_at at time zone 'America/Bogota')::date = public.bogota_today();
  if used >= 3 then raise exception 'POKE_LIMIT'; end if;

  insert into public.pokes (from_user, to_user, kind) values (me, target, kind);
  select name into my_name from public.profiles where id = me;
  perform public.log_activity('poke', me, array[target], null, jsonb_build_object('kind', kind));
  perform public.notify_users(array[target],
    case when kind = 'cheer' then my_name || ' te manda ánimo' else my_name || ' te está alcanzando' end,
    case when kind = 'cheer' then '¡Vamos! Tú puedes cumplir la meta de hoy.' else 'Registra tus comidas o te pasa por encima.' end,
    '/?tab=challenges');
  return 2 - used;  -- empujones que le quedan hoy
end $$;

revoke all on function public.send_poke(uuid, text) from public, anon;
grant execute on function public.send_poke(uuid, text) to authenticated;

-- ─── Celebración del resultado (una sola vez por persona) ────────────────

alter table public.challenge_members add column result_seen boolean not null default false;

create or replace function public.mark_result_seen(cid bigint)
returns void language sql security definer set search_path = '' as $$
  update public.challenge_members set result_seen = true where challenge_id = cid and user_id = auth.uid()
$$;

revoke all on function public.mark_result_seen(bigint) from public, anon;
grant execute on function public.mark_result_seen(bigint) to authenticated;

-- ─── Estadísticas del perfil ─────────────────────────────────────────────

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

  -- Racha actual: días seguidos registrando, contando desde hoy (o desde ayer si hoy aún no registra).
  start_d := case when exists (select 1 from public.daily_totals where user_id = uid and day = today) then today else today - 1 end;
  while exists (select 1 from public.daily_totals where user_id = uid and day = start_d - cur) loop
    cur := cur + 1;
  end loop;

  -- Mejor racha: islas de días consecutivos.
  select coalesce(max(n), 0) into best from (
    select count(*) n from (
      select day - (row_number() over (order by day))::int as grp from public.daily_totals where user_id = uid
    ) s group by grp
  ) t;

  return jsonb_build_object(
    'current_streak', cur,
    'best_streak', greatest(best, cur),
    'days_logged', (select count(*) from public.daily_totals where user_id = uid),
    'days_in_range', (select count(*) from public.daily_totals where user_id = uid and target is not null
                        and kcal between target * 0.9 and target * 1.1),
    'challenges_played', (select count(*) from public.challenge_members m join public.challenges c on c.id = m.challenge_id
                            where m.user_id = uid and m.status = 'accepted' and c.status = 'finished'),
    'challenges_won', (select count(*) from public.challenge_members m join public.challenges c on c.id = m.challenge_id
                         where m.user_id = uid and m.winner and c.status = 'finished'),
    'medals', (select count(*) from public.medals where user_id = uid)
  );
end $$;

revoke all on function public.profile_stats(uuid) from public, anon;
grant execute on function public.profile_stats(uuid) to authenticated;

-- ─── Registrar actividad en las acciones existentes ──────────────────────

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

  perform public.log_activity('challenge_invite', me, opponents, cid, jsonb_build_object('mode', mode, 'length', length_days));
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
    if (select count(*) from public.challenge_members where challenge_id = cid and status in ('accepted', 'invited')) < 2 then
      update public.challenges set status = 'cancelled' where id = cid;
    elsif not exists (select 1 from public.challenge_members where challenge_id = cid and status = 'invited') then
      update public.challenges set status = 'active', start_day = public.bogota_today() + 1,
        end_day = public.bogota_today() + case when mode = 'duration' then length_days else length_days * 2 end
      where id = cid;
    end if;
    perform public.log_activity('challenge_decline', me, others, cid);
    perform public.notify_users(others, my_name || ' no aceptó el reto', 'Puedes retar a alguien más cuando quieras.');
    return 'declined';
  end if;

  if my_target is null then raise exception 'PLAN_REQUIRED'; end if;
  update public.challenge_members set status = 'accepted', target_kcal = my_target where challenge_id = cid and user_id = me;
  perform public.log_activity('challenge_accept', me, others, cid, jsonb_build_object('mode', c.mode, 'length', c.length_days));

  if not exists (select 1 from public.challenge_members where challenge_id = cid and status = 'invited') then
    update public.challenges set status = 'active', start_day = public.bogota_today() + 1,
      end_day = public.bogota_today() + case when mode = 'duration' then length_days else length_days * 2 end
    where id = cid;
    perform public.notify_users(others, my_name || ' aceptó tu reto', 'Empieza mañana. Que gane el más constante.');
    return 'active';
  end if;
  perform public.notify_users(others, my_name || ' aceptó tu reto', 'Falta que acepten los demás.');
  return 'accepted';
end $$;

-- Medallas destacadas aparecen en el muro (no las diarias, para no llenarlo).
create or replace function public.award(uid uuid, k text, pkey text, cid bigint default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.medals (user_id, kind, period_key, challenge_id) values (uid, k, pkey, cid)
  on conflict do nothing;
  if found and k in ('first_entry', 'streak_7', 'streak_30', 'streak_100', 'week_logged', 'perfect_week') then
    perform public.log_activity('medal', uid, '{}', cid, jsonb_build_object('medal', k));
  end if;
  return found;
end $$;

-- Resultado del reto en el muro: se agrega al final del cierre diario.
create or replace function public.log_challenge_result()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  winners uuid[];
  losers uuid[];
  best int;
begin
  if new.status = 'finished' and old.status <> 'finished' then
    winners := array(select user_id from public.challenge_members where challenge_id = new.id and winner);
    losers := array(select user_id from public.challenge_members where challenge_id = new.id and status = 'accepted' and not winner);
    select max(days_done) into best from public.challenge_members where challenge_id = new.id;
    if array_length(winners, 1) = 1 then
      perform public.log_activity('challenge_won', winners[1], losers, new.id, jsonb_build_object('days', best, 'mode', new.mode, 'length', new.length_days));
    elsif array_length(winners, 1) > 1 then
      perform public.log_activity('challenge_draw', winners[1], winners[2:] || losers, new.id, jsonb_build_object('days', best));
    end if;
  end if;
  return new;
end $$;

create trigger challenges_log_result after update on public.challenges
  for each row execute function public.log_challenge_result();

alter publication supabase_realtime add table public.activity, public.pokes;
