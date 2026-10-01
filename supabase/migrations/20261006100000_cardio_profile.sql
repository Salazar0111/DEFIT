-- Cardio en trotadora: { "mode": "walk" | "run", "speed": km/h, "incline": % }
alter table public.profiles add column cardio jsonb;
