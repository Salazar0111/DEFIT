-- Registro solo con código de invitación.
-- Los códigos viven en una tabla sin políticas: nadie los puede leer desde la app.

create table public.invite_codes (
  code        text primary key,
  active      boolean not null default true,
  uses        int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.invite_codes enable row level security;

-- Antes de crear el usuario: valida el código, cuenta el uso y lo quita de los metadatos.
create or replace function public.check_invite_code()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  given text := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
begin
  update public.invite_codes set uses = uses + 1
  where code = given and active;
  if not found then
    raise exception 'INVITE_CODE_INVALID';
  end if;
  new.raw_user_meta_data := new.raw_user_meta_data - 'invite_code';
  return new;
end $$;

create trigger before_auth_user_created before insert on auth.users
  for each row execute function public.check_invite_code();
