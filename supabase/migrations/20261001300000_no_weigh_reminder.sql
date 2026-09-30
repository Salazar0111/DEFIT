-- Se quita el recordatorio de pesarse: el registro de peso queda solo en su pestaña.
update public.profiles set reminders = reminders - 'weigh';
alter table public.profiles alter column reminders set default '{
  "breakfast": {"on": true, "at": "07:30"},
  "lunch":     {"on": true, "at": "13:00"},
  "dinner":    {"on": true, "at": "19:30"},
  "nudge":     {"on": true, "at": "21:30"}
}'::jsonb;
