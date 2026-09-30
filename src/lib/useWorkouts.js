import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { dayKey, shiftDay } from "./food";
import { e1rm } from "./exercises";

// En modo demo las sesiones viven en memoria.
const demoLogs = [];
const demoSets = [
  { exercise_id: "squat", kg: 57.5, reps: 8, created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
  { exercise_id: "bench", kg: 60, reps: 8, created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
  { exercise_id: "row", kg: 50, reps: 10, created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
];

function demoProgress(id) {
  const base = { squat: 50, bench: 52.5, row: 45 }[id] || 40;
  return [0, 1, 2, 3, 4, 5].map((i) => ({
    day: new Date(Date.now() - (35 - i * 7) * 86400000).toISOString().slice(0, 10), kg: base + i * 2.5, reps: 8, created_at: new Date(Date.now() - (35 - i * 7) * 86400000).toISOString(), log_id: i,
  }));
}

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

  // Última serie y mejores marcas de cada ejercicio (para precargar y marcar récords en vivo).
  const lastSets = async (ids) => {
    let rows;
    if (demo) rows = demoSets.filter((x) => ids.includes(x.exercise_id));
    else {
      const { data } = await supabase.from("workout_sets").select("exercise_id, kg, reps, created_at")
        .in("exercise_id", ids).order("created_at", { ascending: false }).limit(ids.length * 60);
      rows = data || [];
    }
    const last = {}, best = {};
    rows.forEach((x) => {
      if (!last[x.exercise_id]) last[x.exercise_id] = x;
      const b = best[x.exercise_id] || { kg: 0, e1rm: 0 };
      best[x.exercise_id] = { kg: Math.max(b.kg, Number(x.kg)), e1rm: x.reps <= 10 ? Math.max(b.e1rm, e1rm(Number(x.kg), x.reps)) : b.e1rm };
    });
    return { last, best };
  };

  // Progreso de un ejercicio: una marca por sesión (mejor fuerza estimada), de la más antigua a la más reciente.
  const progress = async (exerciseId) => {
    let rows;
    if (demo) rows = demoProgress(exerciseId);
    else {
      const { data } = await supabase.from("workout_sets").select("kg, reps, created_at, log_id").eq("exercise_id", exerciseId).order("created_at").limit(600);
      rows = data || [];
    }
    const bySession = new Map();
    rows.forEach((x) => {
      const key = x.log_id ?? x.created_at.slice(0, 10);
      const val = x.reps <= 10 ? e1rm(Number(x.kg), x.reps) : Number(x.kg);
      const cur = bySession.get(key);
      if (!cur || val > cur.e1rm) bySession.set(key, { day: x.created_at.slice(0, 10), kg: Number(x.kg), reps: x.reps, e1rm: val });
    });
    return [...bySession.values()];
  };

  // Ejercicios con sesiones registradas y su mejor marca.
  const myExercises = async () => {
    let rows;
    if (demo) rows = ["squat", "bench", "row"].flatMap((id) => demoProgress(id).map((p) => ({ exercise_id: id, exercise_name: null, ...p })));
    else {
      const { data } = await supabase.from("workout_sets").select("exercise_id, exercise_name, kg, reps, created_at").order("created_at", { ascending: false }).limit(800);
      rows = data || [];
    }
    const map = {};
    rows.forEach((x) => {
      const v = x.reps <= 10 ? e1rm(Number(x.kg), x.reps) : Number(x.kg);
      const c = map[x.exercise_id];
      if (!c || v > c.e1rm) map[x.exercise_id] = { id: x.exercise_id, kg: Number(x.kg), reps: x.reps, e1rm: v };
    });
    return Object.values(map).sort((a, b) => b.e1rm - a.e1rm);
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

  return { today, logs, routine: profile.routine || null, saveRoutine, lastSets, progress, myExercises, finish, trainedToday: logs.some((l) => l.day === today) };
}
