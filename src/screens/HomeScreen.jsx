import { motion } from "motion/react";
import { ChevronRight, Lock, SlidersHorizontal, Swords } from "lucide-react";
import { avatarSrc } from "../lib/avatars";
import { challengeTitle } from "./ChallengesScreen";
import { fmt } from "../lib/plan";
import { useFood } from "../lib/useFood";
import { createPortal } from "react-dom";
import Sheet from "../components/Sheet";
import WeightScreen from "./WeightScreen";
import { supabase } from "../lib/supabase";
import { useEffect } from "react";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { dayMood, dayPhrase } from "../lib/buddy";
import { fx } from "../lib/feedback";
import { dayKey, totals } from "../lib/food";

const ease = [0.16, 1, 0.3, 1];

export default function HomeScreen({ profile, ch, dt, onEditPlan, onOpenChallenges }) {
  const today = dayKey(new Date(), profile.timezone);
  const { entries } = useFood(profile, today);
  const t = totals(entries);
  const eaten = t.kcal;
  const { type, target: dayGoal } = dt.info(today);
  const mood = dayMood({ eaten, target: dayGoal || 0, entries: entries.length });
  const target = dayGoal || 0;
  const left = target - eaten;
  const pct = target ? Math.min(eaten / target, 1) : 0;
  const over = eaten > target * 1.1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <section className="glass" style={styles.ringCard}>
        <Ring pct={pct} over={over} />
        <div style={styles.ringCenter}>
          <motion.span key={left} className="num" style={styles.big}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
            {fmt(Math.abs(left))}
          </motion.span>
          <span style={{ fontWeight: 700, fontSize: "var(--t-small)" }}>{left >= 0 ? "kcal disponibles" : "kcal de más"}</span>
        </div>
        <div style={styles.stats}>
          <Stat label="Meta" value={fmt(target)} />
          <Stat label="Comido" value={fmt(eaten)} />
          <Stat label="Restante" value={fmt(Math.max(left, 0))} />
        </div>
      </section>

      {(profile.plan_version || 1) < 2 && (
        <section className="glass" style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-2)",
          borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }}>
          <p style={{ fontWeight: 700 }}>Mejoramos cómo calculamos tu meta</p>
          <p className="muted" style={{ fontSize: "var(--t-small)" }}>
            Ahora tiene en cuenta tus días de entreno y de pierna. Te mostramos cómo cambia antes de aplicarla.
          </p>
          <button className="btn btn-primary" onClick={onEditPlan}>Actualizar mi plan</button>
        </section>
      )}

      <Buddy profile={profile} mood={mood} eaten={eaten} target={dayGoal} />

      {type && <DayTypePicker profile={profile} dt={dt} today={today} />}

      <WeightCard profile={profile} onEditPlan={onEditPlan} />

      {ch && <ChallengeTeaser ch={ch} me={profile.id} onOpen={onOpenChallenges} />}

      <section className="glass" style={{ padding: "var(--sp-4) var(--sp-5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-2)" }}>
          <h2>Tu plan</h2>
          <button className="btn btn-glass" style={{ minHeight: 40, padding: "0 16px", fontSize: "var(--t-small)" }} onClick={onEditPlan}>
            {ch?.planLocked ? <Lock size={16} strokeWidth={1.8} /> : <SlidersHorizontal size={16} strokeWidth={1.8} />} Ajustar
          </button>
        </div>
        <Row label="Gasto promedio" value={`${fmt(profile.tdee)} kcal`} />
        <Row label="Objetivo" value={goalText(profile)} />
        {profile.protein_g > 0 && <Row label="Proteína diaria" value={`${fmt(profile.protein_g)} g`} />}
        <Row label="Peso de partida" value={`${Number(profile.weight_kg).toLocaleString("es-CO")} kg`} last />
      </section>

    </div>
  );
}

// Tu personaje: cambia de ánimo según tu día. Al tocarlo salta y dice otra cosa.
function Buddy({ profile, mood, eaten, target }) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 3));
  const first = (profile.name || "").split(" ")[0];
  const text = dayPhrase({ mood, eaten, target: target || 0, name: first, seed });
  return (
    <section className="glass" style={{ padding: "var(--sp-4)", display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
      <motion.button key={`${mood}-${seed}`} onClick={() => setSeed((x) => x + 1)} aria-label="Tu personaje"
        initial={{ y: 0 }} animate={{ y: [0, -14, 0, -5, 0], rotate: [0, -4, 3, 0] }} transition={{ duration: 0.7, ease: "easeOut" }}
        whileTap={{ scale: 0.9 }} style={{ flexShrink: 0 }}>
        <motion.img src={avatarSrc(profile.avatar, mood)} alt="" width={72} height={72}
          animate={mood === "sleepy" ? { y: [0, 3, 0] } : mood === "party" ? { rotate: [0, -6, 6, 0] } : {}}
          transition={{ duration: mood === "sleepy" ? 3 : 1.6, repeat: Infinity, repeatDelay: mood === "party" ? 1.2 : 0 }}
          style={{ width: 72, height: 72, borderRadius: "50%", display: "block" }} />
      </motion.button>
      <AnimatePresence mode="wait">
        <motion.div key={text} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }} style={styles.bubble}>
          <p style={{ fontWeight: 700, fontSize: "var(--t-small)", lineHeight: 1.35 }}>{text}</p>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

const GOAL_TEXT = { lose: "Bajar peso", recomp: "Recomposición", maintain: "Mantener", gain_clean: "Ganar peso limpio", gain_fast: "Ganar peso más rápido" };
const goalText = (p) => GOAL_TEXT[p.goal] || (p.deficit > 0 ? `Bajar peso (−${fmt(p.deficit)} kcal)` : "Mantener");

// Peso: registro de un toque y acceso al historial.
function WeightCard({ profile, onEditPlan }) {
  const demo = profile.id === "demo";
  const [latest, setLatest] = useState(demo ? 92.4 : null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = dayKey(new Date(), profile.timezone);

  useEffect(() => {
    if (demo) return;
    supabase.from("weight_logs").select("weight_kg, day").order("day", { ascending: false }).limit(1)
      .then(({ data }) => setLatest(data?.[0]?.weight_kg ?? profile.weight_kg));
  }, [demo, profile.weight_kg]);

  const save = async (e) => {
    e.preventDefault();
    const w = Number(String(value).replace(",", "."));
    if (!(w >= 30 && w <= 300)) return;
    setSaving(true);
    if (!demo) await supabase.from("weight_logs").upsert({ user_id: profile.id, day: today, weight_kg: w }, { onConflict: "user_id,day" });
    setLatest(w); setValue(""); setSaving(false); fx("success");
  };

  return (
    <section className="glass" style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">Tu peso</p>
        <button className="btn btn-text" style={{ minHeight: 32, fontSize: "var(--t-caption)" }} onClick={() => setOpen(true)}>Ver historial</button>
      </div>
      <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "var(--sp-3)", alignItems: "center" }}>
        <p className="num" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>
          {latest ? Number(latest).toLocaleString("es-CO", { maximumFractionDigits: 1 }) : "–"}<span className="muted" style={{ fontSize: 16 }}> kg</span>
        </p>
        <div className="field"><input aria-label="Peso de hoy" type="number" inputMode="decimal" step="0.1" placeholder="Hoy" value={value} onChange={(e) => setValue(e.target.value)} style={{ height: 44 }} /></div>
        <button className="btn btn-glass" style={{ minHeight: 44 }} disabled={saving || !value}>Guardar</button>
      </form>
      {createPortal(
        <Sheet open={open} onClose={() => setOpen(false)} title="Historial de peso">
          {open && <WeightScreen profile={profile} onEditPlan={() => { setOpen(false); onEditPlan(); }} />}
        </Sheet>,
        document.body
      )}
    </section>
  );
}

// Tipo de día de hoy: descanso, entreno o pierna. Cambia la meta del día al instante.
function DayTypePicker({ profile, dt, today }) {
  const [error, setError] = useState("");
  const { type, target } = dt.info(today);
  const options = [{ id: "rest", label: "Descanso" }, { id: "train", label: profile.train_type === "cardio" ? "Cardio" : "Entreno" },
    ...(profile.train_type !== "cardio" && (profile.train_days || []).length ? [{ id: "leg", label: "Pierna" }] : [])];
  const pick = async (id) => {
    setError("");
    fx("tick");
    try { await dt.setType(today, id); } catch (e) { setError(e.message); }
  };
  return (
    <section className="glass" style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="eyebrow">Hoy es día de</p>
        <motion.span key={target} className="num caption" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontWeight: 700 }}>
          Meta {fmt(target)} kcal
        </motion.span>
      </div>
      <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: "var(--r-pill)", background: "var(--field)", border: "1px solid var(--hairline)" }}>
        {options.map((o) => {
          const active = o.id === type;
          return (
            <button key={o.id} onClick={() => pick(o.id)} aria-pressed={active}
              style={{ position: "relative", flex: 1, minHeight: 42, borderRadius: "var(--r-pill)", fontWeight: 700, fontSize: "var(--t-small)" }}>
              {active && (
                <motion.span layoutId="daytype-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  style={{ position: "absolute", inset: 0, borderRadius: "var(--r-pill)",
                    background: o.id === "leg" ? "linear-gradient(180deg, #3ddc84, #1b8a4c)" : "linear-gradient(180deg, var(--accent), var(--accent-strong))" }} />
              )}
              <span style={{ position: "relative", color: active ? (o.id === "leg" ? "#fff" : "var(--on-accent)") : "var(--text)" }}>{o.label}</span>
            </button>
          );
        })}
      </div>
      {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
    </section>
  );
}

// Resumen del reto activo o de una invitación pendiente.
function ChallengeTeaser({ ch, me, onOpen }) {
  const invite = ch.challenges.find((c) => c.status === "pending" && c.members.some((m) => m.user_id === me && m.status === "invited"));
  const active = ch.challenges.find((c) => c.status === "active");
  const c = invite || active;
  if (!c) return null;
  const players = c.members.filter((m) => m.status === "accepted" || m.user_id === me);
  return (
    <motion.button className="glass" onClick={onOpen} whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
      style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", alignItems: "center", gap: "var(--sp-3)", textAlign: "left", color: "var(--text)",
        ...(invite && { borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }) }}>
      <div style={{ display: "flex" }}>
        {players.slice(0, 3).map((m, i) => (
          <img key={m.user_id} src={avatarSrc(m.profile?.avatar)} alt=""
            style={{ width: 40, height: 40, borderRadius: "50%", marginLeft: i ? -12 : 0, boxShadow: "0 0 0 2px var(--bg)" }} />
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}><Swords size={13} strokeWidth={2} />{invite ? "Te retaron" : "Reto en curso"}</p>
        <p style={{ fontWeight: 700 }}>{challengeTitle(c)}</p>
        {!invite && (
          <p className="caption num">{players.map((m) => `${m.user_id === me ? "Tú" : m.profile?.name} ${m.done}`).join(" · ")} días</p>
        )}
      </div>
      <ChevronRight size={20} strokeWidth={1.8} style={{ color: "var(--text-2)" }} />
    </motion.button>
  );
}

function Ring({ pct, over }) {
  const size = 236, stroke = 18, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", margin: "0 auto" }} aria-hidden="true">
      <defs>
        <linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={over ? "var(--danger)" : "var(--accent)"} />
          <stop offset="1" stopColor={over ? "var(--danger)" : "var(--accent-strong)"} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline)" strokeWidth={stroke} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring-g)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.max(pct, 0.001)) }}
        transition={{ duration: 1.1, ease }} />
    </svg>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span className="caption">{label}</span>
      <span className="num" style={{ fontWeight: 700, fontSize: 18 }}>{value}</span>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: last ? "none" : "1px solid var(--hairline)" }}>
      <span className="muted">{label}</span>
      <span className="num" style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

const styles = {
  ringCard: { position: "relative", padding: "var(--sp-5) var(--sp-4) var(--sp-4)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" },
  ringCenter: {
    position: "absolute", top: "var(--sp-5)", left: 0, right: 0, height: 236,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, pointerEvents: "none",
  },
  big: { fontSize: "var(--t-display)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 },
  bubble: {
    position: "relative", flex: 1, padding: "12px 14px", borderRadius: "18px 18px 18px 6px",
    background: "var(--field)", border: "1px solid var(--hairline)",
  },
  stats: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", paddingTop: "var(--sp-3)", borderTop: "1px solid var(--hairline)" },
};
