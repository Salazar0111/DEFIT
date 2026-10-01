-- Sin tope: lo que registres (calorías del reloj o minutos de cardio) reemplaza la estimación de ese día.
-- Solo queda un piso lógico: la meta no baja de la de un día sin entreno.
create or replace function public.day_target(uid uuid, d date)
returns int language plpgsql stable security definer set search_path = '' as $$
declare
  p public.profiles;
  ov text;
  t text;
  dow int := extract(isodow from d)::int;
  base int;
  est int;
  w int;
  adj int := 0;
begin
  select * into p from public.profiles where id = uid;
  if p.id is null then return null; end if;
  if p.plan_version < 2 or p.targets is null then return p.target_kcal; end if;
  select type into ov from public.day_types where user_id = uid and day = d;
  t := coalesce(
    ov,
    p.day_plan -> dow::text ->> 'key',
    case when p.day_plan is not null then 'rest'
         when dow = any(p.leg_days) then 'leg' when dow = any(p.train_days) then 'train' else 'rest' end);
  base := coalesce((p.targets ->> t)::int, p.target_kcal);
  est := coalesce((p.burns ->> t)::int, 0);
  select kcal into w from public.day_burn where user_id = uid and day = d;
  if w is not null and est > 0 then
    adj := greatest(-est, w - est);
  end if;
  return base + adj;
end $$;

-- Refresca las metas de los días recientes que ya tenían un registro del reloj.
update public.daily_totals t set target_kcal = public.day_target(t.user_id, t.day)
where exists (select 1 from public.day_burn b where b.user_id = t.user_id and b.day = t.day);
