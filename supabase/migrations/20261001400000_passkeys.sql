-- Entrar con Face ID (passkeys / WebAuthn). La verificación la hace /api/passkey con la clave de servicio.

create table public.passkeys (
  id          text primary key,                 -- credential id (base64url)
  user_id     uuid not null references auth.users (id) on delete cascade,
  public_key  text not null,                    -- base64url
  counter     bigint not null default 0,
  transports  text[] not null default '{}',
  device      text,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz
);

create index passkeys_user on public.passkeys (user_id);

alter table public.passkeys enable row level security;

-- Cada quien ve y borra sus llaves; crearlas solo lo hace el servidor.
create policy "passkeys_read_own" on public.passkeys for select to authenticated using (user_id = auth.uid());
create policy "passkeys_delete_own" on public.passkeys for delete to authenticated using (user_id = auth.uid());

-- Retos criptográficos de un solo uso (solo el servidor los lee y escribe).
create table public.webauthn_challenges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  challenge  text not null,
  kind       text not null check (kind in ('register', 'login')),
  expires_at timestamptz not null default now() + interval '5 minutes'
);

alter table public.webauthn_challenges enable row level security;
