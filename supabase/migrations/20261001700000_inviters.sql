-- Solo las personas en public.inviters pueden invitar (hoy, el dueño de la app).
-- Tabla sin políticas: nadie puede darse el permiso desde la app.
create table public.inviters (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.inviters enable row level security;

insert into public.inviters (user_id)
select u.id from auth.users u where lower(u.email) = 'brayansalazar11.bs@gmail.com';

create or replace function public.can_invite()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.inviters where user_id = auth.uid())
$$;

create or replace function public.invite_friend(friend_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  e text := lower(trim(friend_email));
begin
  if me is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.can_invite() then raise exception 'NOT_ALLOWED'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(e) > 120 then raise exception 'BAD_EMAIL'; end if;
  if exists (select 1 from public.allowed_emails where email = e) then return 'exists'; end if;
  insert into public.allowed_emails (email, invited_by) values (e, me);
  return 'invited';
end $$;

revoke all on function public.can_invite() from public, anon;
grant execute on function public.can_invite() to authenticated;
