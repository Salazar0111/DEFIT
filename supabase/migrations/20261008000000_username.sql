-- Nombre de usuario único (@usuario) para encontrarse entre amigos.
alter table public.profiles add column username text;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');
create unique index profiles_username_unique on public.profiles (username) where username is not null;

-- Las solicitudes ahora muestran también el usuario.
drop function public.my_friend_requests();
create function public.my_friend_requests()
returns table (id bigint, direction text, user_id uuid, name text, avatar text, email text, created_at timestamptz, username text)
language sql stable security definer set search_path = '' as $$
  select f.id, 'in', f.requester, p.name, p.avatar, null::text, f.created_at, p.username
  from public.friendships f join public.profiles p on p.id = f.requester
  where f.addressee = auth.uid() and f.status = 'pending'
  union all
  select f.id, 'out', f.addressee, p.name, p.avatar, null::text, f.created_at, p.username
  from public.friendships f join public.profiles p on p.id = f.addressee
  where f.requester = auth.uid() and f.status = 'pending'
  union all
  select f.id, 'out', null, null, null, f.addressee_email, f.created_at, null::text
  from public.friendships f
  where f.requester = auth.uid() and f.addressee is null
  order by created_at desc
$$;
revoke all on function public.my_friend_requests() from public, anon;
grant execute on function public.my_friend_requests() to authenticated;

-- Enviar solicitud por correo o por @usuario. Con @usuario solo se encuentra a quien ya tiene cuenta.
create or replace function public.send_friend_request(friend_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  ident text := lower(trim(friend_email));
  e text;
  other uuid;
  f public.friendships;
  my_name text;
begin
  if me is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if length(ident) > 120 then raise exception 'BAD_EMAIL'; end if;
  select name into my_name from public.profiles where id = me;

  if position('@' in ident) = 0 or ident ~ '^@[a-z0-9_]{3,20}$' then
    -- usuario
    select id into other from public.profiles where username = ltrim(ident, '@');
    if other is null then
      if ident !~ '^@?[a-z0-9_]{3,20}$' then raise exception 'BAD_EMAIL'; end if;
      return 'not_found';
    end if;
  else
    if ident !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'BAD_EMAIL'; end if;
    e := ident;
    select id into other from auth.users where lower(email) = e;
  end if;

  if other is not null then
    if other = me then return 'self'; end if;
    select * into f from public.friendships
      where (requester = me and addressee = other) or (requester = other and addressee = me);
    if found then
      if f.status = 'accepted' then return 'friends'; end if;
      if f.status = 'pending' then
        if f.requester = me then return 'sent'; end if;
        update public.friendships set status = 'accepted', responded_at = now() where id = f.id;
        perform public.notify_users(array[other], my_name || ' aceptó tu solicitud', 'Ya son amigos en DEFIT.', '/?tab=challenges');
        return 'friends';
      end if;
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

  if not exists (select 1 from public.allowed_emails where email = e) then
    if not public.can_invite() then return 'not_found'; end if;
    insert into public.allowed_emails (email, invited_by) values (e, me);
  end if;
  insert into public.friendships (requester, addressee_email) values (me, e) on conflict do nothing;
  return 'invited';
end $$;
