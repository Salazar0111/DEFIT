-- Amistades: solicitud + aceptación. Quien no es tu amigo no ve tu perfil, tus medallas ni tu actividad,
-- y los retos solo se crean entre amigos.

create table public.friendships (
  id              bigint generated always as identity primary key,
  requester       uuid not null references auth.users (id) on delete cascade,
  addressee       uuid references auth.users (id) on delete cascade,
  addressee_email text check (addressee_email = lower(trim(addressee_email))),
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at      timestamptz not null default now(),
  responded_at    timestamptz,
  check (addressee is not null or addressee_email is not null),
  check (addressee is distinct from requester)
);

-- Una sola fila por pareja (sin importar quién la envió) y una por correo aún sin cuenta.
create unique index friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee))
  where addressee is not null;
create unique index friendships_email on public.friendships (requester, addressee_email) where addressee is null;
create index friendships_addressee on public.friendships (addressee, status);

alter table public.friendships enable row level security;
-- Solo lectura de lo mío; todo lo demás se hace por funciones.
create policy "friendships_read_own" on public.friendships
  for select to authenticated using (requester = auth.uid() or addressee = auth.uid());

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select a is not null and b is not null and exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  )
$$;

revoke all on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- ─── Enviar solicitud (por correo) ─────────────────────────────────────────
-- Devuelve: 'sent' | 'friends' | 'invited' (correo nuevo, solo quien puede invitar) | 'self' | 'not_found'
create or replace function public.send_friend_request(friend_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  e text := lower(trim(friend_email));
  other uuid;
  f public.friendships;
  my_name text;
begin
  if me is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(e) > 120 then raise exception 'BAD_EMAIL'; end if;
  select name into my_name from public.profiles where id = me;
  select id into other from auth.users where lower(email) = e;

  if other is not null then
    if other = me then return 'self'; end if;
    select * into f from public.friendships
      where (requester = me and addressee = other) or (requester = other and addressee = me);
    if found then
      if f.status = 'accepted' then return 'friends'; end if;
      if f.status = 'pending' then
        if f.requester = me then return 'sent'; end if;
        -- La otra persona ya me había enviado una: se aceptan mutuamente.
        update public.friendships set status = 'accepted', responded_at = now() where id = f.id;
        perform public.notify_users(array[other], my_name || ' aceptó tu solicitud', 'Ya son amigos en DEFIT.', '/?tab=challenges');
        return 'friends';
      end if;
      -- Rechazada: quien la rechazó puede reabrirla; quien la envió no puede insistir.
      if f.addressee = me then
        update public.friendships set requester = me, addressee = other, status = 'pending', responded_at = null where id = f.id;
        perform public.notify_users(array[other], my_name || ' quiere ser tu amigo', 'Acepta la solicitud en Social.', '/?tab=challenges');
      end if;
      return 'sent';
    end if;
    insert into public.friendships (requester, addressee) values (me, other);
    perform public.notify_users(array[other], my_name || ' quiere ser tu amigo', 'Acepta la solicitud en Social.', '/?tab=challenges');
    return 'sent';
  end if;

  -- Sin cuenta todavía: la solicitud espera al registro. Solo quien puede invitar abre el acceso.
  if not exists (select 1 from public.allowed_emails where email = e) then
    if not public.can_invite() then return 'not_found'; end if;
    insert into public.allowed_emails (email, invited_by) values (e, me);
  end if;
  insert into public.friendships (requester, addressee_email) values (me, e) on conflict do nothing;
  return 'invited';
end $$;

-- ─── Responder ────────────────────────────────────────────────────────────
create or replace function public.respond_friend_request(req bigint, accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  f public.friendships;
  my_name text;
begin
  select * into f from public.friendships where id = req and addressee = me and status = 'pending';
  if not found then raise exception 'NO_REQUEST'; end if;
  update public.friendships set status = case when accept then 'accepted' else 'declined' end, responded_at = now() where id = req;
  if accept then
    select name into my_name from public.profiles where id = me;
    perform public.notify_users(array[f.requester], my_name || ' aceptó tu solicitud', 'Ya son amigos en DEFIT.', '/?tab=challenges');
  end if;
end $$;

-- ─── Dejar de ser amigos (no con un reto en curso) ────────────────────────
create or replace function public.remove_friend(other uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if exists (
    select 1 from public.challenge_members a
    join public.challenge_members b on b.challenge_id = a.challenge_id
    join public.challenges c on c.id = a.challenge_id
    where a.user_id = me and b.user_id = other and c.status in ('pending', 'active')
  ) then raise exception 'ACTIVE_CHALLENGE'; end if;
  delete from public.friendships
  where (requester = me and addressee = other) or (requester = other and addressee = me);
end $$;

-- ─── Solicitudes mías (solo nombre y avatar de quien la envió o recibe) ───
create or replace function public.my_friend_requests()
returns table (id bigint, direction text, user_id uuid, name text, avatar text, email text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.id, 'in', f.requester, p.name, p.avatar, null::text, f.created_at
  from public.friendships f join public.profiles p on p.id = f.requester
  where f.addressee = auth.uid() and f.status = 'pending'
  union all
  select f.id, 'out', f.addressee, p.name, p.avatar, null::text, f.created_at
  from public.friendships f join public.profiles p on p.id = f.addressee
  where f.requester = auth.uid() and f.status = 'pending'
  union all
  select f.id, 'out', null, null, null, f.addressee_email, f.created_at
  from public.friendships f
  where f.requester = auth.uid() and f.addressee is null
  order by created_at desc
$$;

revoke all on function public.send_friend_request(text), public.respond_friend_request(bigint, boolean),
  public.remove_friend(uuid), public.my_friend_requests() from public, anon;
grant execute on function public.send_friend_request(text), public.respond_friend_request(bigint, boolean),
  public.remove_friend(uuid), public.my_friend_requests() to authenticated;

-- Al registrarse alguien con un correo que ya tenía solicitudes, se le asignan.
create or replace function public.link_pending_friend_requests()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.friendships set addressee = new.id, addressee_email = null
  where addressee is null and addressee_email = lower(trim(new.email)) and requester <> new.id;
  return new;
end $$;

create trigger on_auth_user_friend_requests after insert on auth.users
  for each row execute function public.link_pending_friend_requests();

-- ─── Amistades que ya existían ────────────────────────────────────────────
-- Quienes ya compartían un reto, Brayan y Clau, y quien fue invitado por alguien que ya está dentro.
insert into public.friendships (requester, addressee, status, responded_at)
select distinct on (least(a.user_id, b.user_id), greatest(a.user_id, b.user_id))
  least(a.user_id, b.user_id), greatest(a.user_id, b.user_id), 'accepted', now()
from public.challenge_members a join public.challenge_members b on b.challenge_id = a.challenge_id and a.user_id < b.user_id
on conflict do nothing;

insert into public.friendships (requester, addressee, status, responded_at)
select least(a.id, b.id), greatest(a.id, b.id), 'accepted', now()
from auth.users a, auth.users b
where lower(a.email) = 'brayansalazar11.bs@gmail.com' and lower(b.email) = 'claudiamec0110@gmail.com'
on conflict do nothing;

insert into public.friendships (requester, addressee, status, responded_at)
select least(ae.invited_by, u.id), greatest(ae.invited_by, u.id), 'accepted', now()
from public.allowed_emails ae join auth.users u on lower(u.email) = ae.email
where ae.invited_by is not null and ae.invited_by <> u.id
on conflict do nothing;

-- Invitados que aún no se registran: solicitud pendiente de quien los invitó.
insert into public.friendships (requester, addressee_email)
select ae.invited_by, ae.email from public.allowed_emails ae
where ae.invited_by is not null and not exists (select 1 from auth.users u where lower(u.email) = ae.email)
on conflict do nothing;

-- ─── Privacidad: cada quien ve lo suyo y lo de sus amigos ─────────────────
drop policy "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_friends" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.are_friends(auth.uid(), id) or public.shares_challenge(id));

drop policy "medals_read" on public.medals;
create policy "medals_read" on public.medals
  for select to authenticated using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));

drop policy "activity_read" on public.activity;
create policy "activity_read" on public.activity
  for select to authenticated
  using (actor = auth.uid() or auth.uid() = any (targets) or public.are_friends(auth.uid(), actor));

-- Estadísticas: las tuyas o las de tus amigos.
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
  if uid <> auth.uid() and not public.are_friends(auth.uid(), uid) then raise exception 'NOT_FRIENDS'; end if;
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
    'days_in_range', (select count(*) from public.daily_totals where user_id = uid and target is not null
                        and kcal between target * 0.9 and target * 1.1),
    'challenges_played', (select count(*) from public.challenge_members m join public.challenges c on c.id = m.challenge_id
                            where m.user_id = uid and m.status = 'accepted' and c.status = 'finished'),
    'challenges_won', (select count(*) from public.challenge_members m join public.challenges c on c.id = m.challenge_id
                         where m.user_id = uid and m.winner and c.status = 'finished'),
    'medals', (select count(*) from public.medals where user_id = uid)
  );
end $$;

-- Los retos solo se crean con amigos.
do $$
declare
  src text;
begin
  select pg_get_functiondef('public.create_challenge(uuid[], text, int)'::regprocedure) into src;
  if src not like '%NOT_FRIENDS%' then
    src := replace(src,
      E'  insert into public.challenges (created_by, mode, length_days)',
      E'  if exists (select 1 from unnest(opponents) x where not public.are_friends(me, x)) then raise exception ''NOT_FRIENDS''; end if;\n\n  insert into public.challenges (created_by, mode, length_days)');
    if src not like '%NOT_FRIENDS%' then raise exception 'create_challenge no se pudo actualizar'; end if;
    execute src;
  end if;
end $$;

alter publication supabase_realtime add table public.friendships;
