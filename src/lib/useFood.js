import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

// En modo demo las comidas viven en memoria.
const demoStore = [];
let demoId = 1;

export function useFood(profile, day) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const demo = profile.id === "demo";

  const load = useCallback(async () => {
    setLoading(true);
    if (demo) {
      setEntries(demoStore.filter((e) => e.day === day));
    } else {
      const { data } = await supabase.from("food_entries").select("*")
        .eq("user_id", profile.id).eq("day", day).order("created_at");
      setEntries(data || []);
    }
    setLoading(false);
  }, [demo, profile.id, day]);

  useEffect(() => { load(); }, [load]);

  const add = async (entry) => {
    const row = { ...entry, user_id: profile.id, day };
    if (demo) {
      const saved = { ...row, id: demoId++, created_at: new Date().toISOString() };
      demoStore.push(saved);
      setEntries((x) => [...x, saved]);
      return saved;
    }
    const { data, error } = await supabase.from("food_entries").insert(row).select().single();
    if (error) throw new Error("No se pudo guardar. Revisa tu conexión.");
    setEntries((x) => [...x, data]);
    return data;
  };

  const update = async (id, patch) => {
    if (demo) {
      const i = demoStore.findIndex((e) => e.id === id);
      if (i >= 0) demoStore[i] = { ...demoStore[i], ...patch };
      setEntries((x) => x.map((e) => (e.id === id ? { ...e, ...patch } : e)));
      return;
    }
    const { data, error } = await supabase.from("food_entries").update(patch).eq("id", id).select().single();
    if (error) throw new Error("No se pudo guardar. Revisa tu conexión.");
    setEntries((x) => x.map((e) => (e.id === id ? data : e)));
  };

  const remove = async (id) => {
    const prev = entries;
    setEntries((x) => x.filter((e) => e.id !== id));
    if (demo) { demoStore.splice(demoStore.findIndex((e) => e.id === id), 1); return; }
    const { error } = await supabase.from("food_entries").delete().eq("id", id);
    if (error) setEntries(prev);
  };

  return { entries, loading, add, update, remove, reload: load };
}
