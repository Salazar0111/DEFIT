-- Invitar amigos desde la app: cada persona autoriza hasta 5 correos.

alter table public.allowed_emails add column invited_by uuid references auth.users (id) on delete set null;

create or replace function public.invite_friend(friend_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  e text := lower(trim(friend_email));
begin
  if me is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(e) > 120 then raise exception 'BAD_EMAIL'; end if;
  if exists (select 1 from public.allowed_emails where email = e) then return 'exists'; end if;
  if (select count(*) from public.allowed_emails where invited_by = me) >= 5 then raise exception 'INVITE_LIMIT'; end if;
  insert into public.allowed_emails (email, invited_by) values (e, me);
  return 'invited';
end $$;

-- Mis invitaciones y si ya se registraron.
create or replace function public.my_invites()
returns table (email text, joined boolean, created_at timestamptz) language sql stable security definer set search_path = '' as $$
  select a.email, exists (select 1 from auth.users u where lower(u.email) = a.email), a.created_at
  from public.allowed_emails a where a.invited_by = auth.uid() order by a.created_at desc
$$;

revoke all on function public.invite_friend(text) from public, anon;
revoke all on function public.my_invites() from public, anon;
grant execute on function public.invite_friend(text) to authenticated;
grant execute on function public.my_invites() to authenticated;
