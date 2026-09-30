import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "../lib/supabase";
import { dayKey, dayLabel } from "../lib/food";

const ease = [0.16, 1, 0.3, 1];
const shortDay = (day, today) => {
  const l = dayLabel(day, today);
  if (l === "Hoy" || l === "Ayer") return l;
  return new Date(day + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" });
};
const kg = (n) => Number(n).toLocaleString("es-CO", { maximumFractionDigits: 1 });
const demoLogs = [
  { id: 1, day: "2026-09-02", weight_kg: 94.2 }, { id: 2, day: "2026-09-09", weight_kg: 93.6 },
  { id: 3, day: "2026-09-16", weight_kg: 93.1 }, { id: 4, day: "2026-09-23", weight_kg: 92.4 },
];

export default function WeightScreen({ profile, onEditPlan }) {
  const demo = profile.id === "demo";
  const today = dayKey(new Date(), profile.timezone);
  const [logs, setLogs] = useState([]);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (demo) { setLogs(demoLogs); return; }
    supabase.from("weight_logs").select("*").eq("user_id", profile.id).order("day")
      .then(({ data }) => setLogs(data || []));
  }, [demo, profile.id]);

  const save = async (e) => {
    e.preventDefault();
    const w = Number(String(value).replace(",", "."));
    if (!(w >= 30 && w <= 300)) { setError("Escribe un peso entre 30 y 300 kg."); return; }
    setError("");
    setSaving(true);
    const row = { user_id: profile.id, day: today, weight_kg: w };
    let saved = { ...row, id: Date.now() };
    if (!demo) {
      const { data, error } = await supabase.from("weight_logs").upsert(row, { onConflict: "user_id,day" }).select().single();
      if (error) { setSaving(false); setError("No se pudo guardar. Revisa tu conexión."); return; }
      saved = data;
    }
    setLogs((x) => [...x.filter((l) => l.day !== today), saved].sort((a, b) => a.day.localeCompare(b.day)));
    setValue("");
    setSaving(false);
  };

  const remove = async (id) => {
    setLogs((x) => x.filter((l) => l.id !== id));
    if (!demo) await supabase.from("weight_logs").delete().eq("id", id);
  };

  const first = logs[0];
  const last = logs[logs.length - 1];
  const change = first && last ? Math.round((last.weight_kg - first.weight_kg) * 10) / 10 : 0;
  const TrendIcon = change < 0 ? TrendingDown : change > 0 ? TrendingUp : Minus;
  const loggedToday = last?.day === today;
  // Si el peso se aleja 2 kg o más del usado en el plan, sugiere recalcular.
  const drift = last && profile.weight_kg ? Math.abs(last.weight_kg - profile.weight_kg) >= 2 : false;
  const chart = logs.map((l) => ({ day: l.day, w: Number(l.weight_kg) }));
  const ws = chart.map((c) => c.w);
  const pad = 1.5;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <section className="glass" style={{ padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "var(--sp-3)" }}>
          <div>
            <p className="eyebrow">Peso actual</p>
            <motion.p key={last?.weight_kg} className="num" style={styles.big}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
              {last ? kg(last.weight_kg) : "—"}<span style={styles.unit}> kg</span>
            </motion.p>
          </div>
          {logs.length > 1 && (
            <span style={{ ...styles.chip, ...(change < 0 && styles.chipGood) }}>
              <TrendIcon size={16} strokeWidth={2} />
              <span className="num">{change > 0 ? "+" : ""}{kg(change)} kg</span>
            </span>
          )}
        </div>

        {chart.length > 1 && (
          <div style={{ height: 160, margin: "0 -8px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="w-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" style={{ stopColor: "var(--accent)", stopOpacity: 0.35 }} />
                    <stop offset="1" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" hide />
                <YAxis hide domain={[Math.min(...ws) - pad, Math.max(...ws) + pad]} />
                <Tooltip cursor={{ stroke: "var(--hairline)" }} content={<ChartTip today={today} />} />
                <Area type="monotone" dataKey="w" stroke="var(--accent)" strokeWidth={2.5} fill="url(#w-fill)"
                  dot={false} activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--bg)", strokeWidth: 2 }}
                  animationDuration={900} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--sp-2)", alignItems: "end" }}>
          <div className="field">
            <label htmlFor="w-in">{loggedToday ? "Actualizar el peso de hoy" : "Registrar el peso de hoy"}</label>
            <input id="w-in" type="number" inputMode="decimal" step="0.1" placeholder="0,0 kg"
              value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={saving || !value}>{saving ? "…" : "Guardar"}</button>
        </form>
        {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
      </section>

      <AnimatePresence>
        {drift && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass" style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
            <p style={{ fontWeight: 700 }}>Tu peso cambió desde que armaste tu plan</p>
            <p className="muted" style={{ fontSize: "var(--t-small)" }}>
              Tu meta se calculó con {kg(profile.weight_kg)} kg. Recalcúlala para que siga siendo precisa.
            </p>
            <button className="btn btn-glass" onClick={onEditPlan}>Recalcular mi plan</button>
          </motion.section>
        )}
      </AnimatePresence>

      {logs.length > 0 && (
        <section className="glass" style={{ padding: "var(--sp-2) var(--sp-4)" }}>
          <p className="eyebrow" style={{ padding: "10px 0 6px" }}>Historial</p>
          <AnimatePresence initial={false}>
            {[...logs].reverse().map((l, i, arr) => {
              const prev = arr[i + 1];
              const d = prev ? Math.round((l.weight_kg - prev.weight_kg) * 10) / 10 : null;
              return (
                <motion.div key={l.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease }} style={{ overflow: "hidden" }}>
                  <div style={styles.row}>
                    <span style={{ flex: 1 }}>{shortDay(l.day, today)}</span>
                    {d !== null && d !== 0 && <span className="num caption">{d > 0 ? "+" : ""}{kg(d)}</span>}
                    <span className="num" style={{ fontWeight: 700, minWidth: 64, textAlign: "right" }}>{kg(l.weight_kg)} kg</span>
                    <button onClick={() => remove(l.id)} style={styles.del} aria-label="Eliminar registro">
                      <Trash2 size={16} strokeWidth={1.7} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </section>
      )}
    </div>
  );
}

function ChartTip({ active, payload, today }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="glass glass-strong" style={{ padding: "8px 12px", borderRadius: 12 }}>
      <p className="caption">{dayLabel(p.day, today)}</p>
      <p className="num" style={{ fontWeight: 700 }}>{kg(p.w)} kg</p>
    </div>
  );
}

const styles = {
  big: { fontSize: "var(--t-display)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05 },
  unit: { fontSize: 20, letterSpacing: 0, color: "var(--text-2)" },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 99, fontWeight: 700,
    fontSize: "var(--t-small)", background: "var(--field)", border: "1px solid var(--hairline)", whiteSpace: "nowrap",
  },
  chipGood: {
    background: "color-mix(in srgb, var(--accent) 18%, transparent)",
    borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
  },
  row: { display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "12px 0", borderTop: "1px solid var(--hairline)" },
  del: { width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", color: "var(--text-2)" },
};
