import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { dayKey, shiftDay } from "./food";

// En modo demo las sesiones viven en memoria.
const demoLogs = [];
const demoSets = [
  { exercise_id: "squat", kg: 57.5, reps: 8, created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
  { exercise_id: "bench", kg: 60, reps: 8, created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
  { exercise_id: "row", kg: 50, reps: 10, created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
];

export function useWorkouts(profile, patchProfile) {
  const demo = profile.id === "demo";
  const today = dayKey(new Date(), profile.timezone);
  const [logs, setLogs] = useState(demo ? [...demoLogs] : []);

  const load = useCallback(async () => {
    if (demo) { setLogs([...demoLogs]); return; }
    const { data } = await supabase.from("workout_logs").select("*").gte("day", shiftDay(today, -14)).order("created_at", { ascending: false });
    setLogs(data || []);
  }, [demo, today]);

  useEffect(() => { load(); }, [load]);

  const saveRoutine = async (routine) => {
    patchProfile({ routine });
    if (!demo) await supabase.from("profiles").update({ routine }).eq("id", profile.id);
  };

  // Última serie registrada de cada ejercicio (para precargar el peso y las repeticiones).
  const lastSets = async (ids) => {
    if (demo) return Object.fromEntries(ids.map((id) => [id, demoSets.find((s) => s.exercise_id === id)]).filter(([, v]) => v));
    const { data } = await supabase.from("workout_sets").select("exercise_id, kg, reps, created_at")
      .in("exercise_id", ids).order("created_at", { ascending: false }).limit(ids.length * 12);
    const out = {};
    (data || []).forEach((s) => { if (!out[s.exercise_id]) out[s.exercise_id] = s; });
    return out;
  };

  const finish = async ({ name, leg, durationS, sets }) => {
    if (demo) {
      demoLogs.unshift({ id: Date.now(), day: today, name, leg, duration_s: durationS });
      sets.forEach((s) => demoSets.unshift({ ...s, created_at: new Date().toISOString() }));
      setLogs([...demoLogs]);
      return;
    }
    const { data: log, error } = await supabase.from("workout_logs").insert({ user_id: profile.id, day: today, name, leg, duration_s: durationS }).select().single();
    if (error) throw new Error("No se pudo guardar el entreno. Revisa tu conexión.");
    if (sets.length) {
      const rows = sets.map((s) => ({ log_id: log.id, user_id: profile.id, exercise_id: s.exercise_id, exercise_name: s.exercise_name, set_no: s.set_no, kg: s.kg, reps: s.reps }));
      const { error: e2 } = await supabase.from("workout_sets").insert(rows);
      if (e2) throw new Error("Se guardó la sesión, pero no sus series.");
    }
    setLogs((l) => [log, ...l]);
  };

  return { today, logs, routine: profile.routine || null, saveRoutine, lastSets, finish, trainedToday: logs.some((l) => l.day === today) };
}
