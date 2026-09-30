-- Registro solo para correos autorizados (reemplaza el código de invitación).
-- Para sumar a alguien: insert into public.allowed_emails (email) values ('correo@ejemplo.com');

drop trigger if exists before_auth_user_created on auth.users;
drop function if exists public.check_invite_code();
drop table if exists public.invite_codes;

create table public.allowed_emails (
  email       text primary key check (email = lower(trim(email))),
  note        text,
  created_at  timestamptz not null default now()
);

-- Sin políticas: la lista no se puede leer ni editar desde la app.
alter table public.allowed_emails enable row level security;

insert into public.allowed_emails (email, note) values
  ('brayansalazar11.bs@gmail.com', 'Brayan'),
  ('claudiamec0110@gmail.com', 'Claudia');

create or replace function public.check_allowed_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.allowed_emails where email = lower(trim(new.email))) then
    raise exception 'EMAIL_NOT_ALLOWED';
  end if;
  return new;
end $$;

create trigger before_auth_user_created before insert on auth.users
  for each row execute function public.check_allowed_email();
