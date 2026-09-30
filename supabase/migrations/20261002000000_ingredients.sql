-- Detalle por ingredientes de cada comida (nombre, gramos y valores por ingrediente).
alter table public.food_entries add column ingredients jsonb not null default '[]';
