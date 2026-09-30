-- Tutoriales ya vistos por cada persona ('tour', 'home', 'food', 'weight', 'challenges', 'profile').
alter table public.profiles add column tips_seen text[] not null default '{}';
