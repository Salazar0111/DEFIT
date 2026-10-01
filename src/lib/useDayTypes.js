import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { dayKey, shiftDay } from "./food";
import { dayTarget, scheduledMuscles } from "./plan";

const demoOverrides = {};
const demoWatch = {};

// Cambios puntuales del tipo de día (descanso / entreno / pierna) y la meta resultante de cada día.
export function useDayTypes(profile) {
  const demo = profile.id === "demo";
  const today = dayKey(new Date(), profile.timezone);
  const [overrides, setOverrides] = useState(demo ? { ...demoOverrides } : {});
  const [watch, setWatch] = useState(demo ? { ...demoWatch } : {});

  useEffect(() => {
    if (demo || (profile.plan_version || 1) < 2) return;
    supabase.from("day_types").select("day, type, muscles").gte("day", shiftDay(today, -30))
      .then(({ data }) => setOverrides(Object.fromEntries((data || []).map((r) => [r.day, { type: r.type, muscles: r.muscles || [] }]))));
    supabase.from("day_burn").select("day, kcal").gte("day", shiftDay(today, -30))
      .then(({ data }) => setWatch(Object.fromEntries((data || []).map((r) => [r.day, r.kcal]))));
  }, [demo, profile.id, profile.plan_version, today]);

  const info = useCallback((day) => ({
    ...dayTarget(profile, day, overrides[day]?.type, watch[day]),
    muscles: overrides[day] ? overrides[day].muscles : scheduledMuscles(profile, day),
  }), [profile, overrides, watch]);

  // type: rest | train | leg | cardio | cw | cwl; muscles: los que trabajas ese día.
  const setType = async (day, type, muscles = []) => {
    const prev = overrides;
    setOverrides((o) => ({ ...o, [day]: { type, muscles } }));
    if (demo) { demoOverrides[day] = { type, muscles }; return; }
    const { error } = await supabase.rpc("set_day_type", { d: day, t: type, m: muscles });
    if (error) { setOverrides(prev); throw new Error(error.message.includes("DAY_LOCKED") ? "Solo puedes cambiar hoy, o ayer hasta el mediodía." : "No se pudo cambiar. Intenta de nuevo."); }
  };

  // Calorías que marcó tu reloj ese día (0 o vacío = quitar).
  const setWatchKcal = async (day, kcal) => {
    const prev = watch;
    const k = Math.round(Number(kcal)) || 0;
    setWatch((w) => { const n = { ...w }; if (k > 0) n[day] = k; else delete n[day]; return n; });
    if (demo) { if (k > 0) demoWatch[day] = k; else delete demoWatch[day]; return; }
    const { error } = await supabase.rpc("set_watch_kcal", { d: day, k });
    if (error) { setWatch(prev); throw new Error(error.message.includes("DAY_LOCKED") ? "Solo puedes cambiar hoy, o ayer hasta el mediodía." : "No se pudo guardar. Intenta de nuevo."); }
  };

  return { overrides, watch, info, setType, setWatchKcal, today };
}
