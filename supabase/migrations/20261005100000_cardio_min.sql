-- Minutos de cardio de cada sesión (cardio solo o al terminar las pesas).
alter table public.workout_logs add column cardio_min int check (cardio_min between 1 and 600);
