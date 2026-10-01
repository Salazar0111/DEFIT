import { motion } from "motion/react";
import { ChevronRight, Lock, SlidersHorizontal, Swords } from "lucide-react";
import { avatarSrc } from "../lib/avatars";
import { challengeTitle } from "./ChallengesScreen";
import CalcExplainer, { Equation, dayMath } from "../components/CalcExplainer";
import MethodExplainer from "../components/MethodExplainer";
import { Info } from "lucide-react";
import { DAY_KEY_LABELS, MUSCLE_LABELS, MUSCLE_ORDER, cardioEquivalent, dayKeyOf, fmt, kindOfKey } from "../lib/plan";
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

export default function HomeScreen({ profile, ch, dt, onEditPlan, onOpenChallenges, seen = () => true, markSeen = () => {} }) {
  const today = dayKey(new Date(), profile.timezone);
  const [method, setMethod] = useState(false);
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

      {type && <DayTypePicker profile={profile} dt={dt} today={today} seen={seen} markSeen={markSeen} />}

      <WeightCard profile={profile} onEditPlan={onEditPlan} />

      {ch && <ChallengeTeaser ch={ch} me={profile.id} onOpen={onOpenChallenges} />}


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

// Qué haces hoy: descanso, pesas, cardio o ambos, más los músculos que trabajas. Cambia la meta al instante.
function DayTypePicker({ profile, dt, today, seen, markSeen }) {
  const [error, setError] = useState("");
  const [explain, setExplain] = useState(false);
  const [open, setOpen] = useState(false);       // cambiar el tipo de día y los músculos
  const [note, setNote] = useState(false);       // anotar calorías del reloj o minutos
  const { type, target, adjust, est, watch, muscles } = dt.info(today);
  const kind = kindOfKey(type);
  const [kcal, setKcal] = useState("");
  const [mins, setMins] = useState("");
  const hasCardio = ["cardio", "cw", "cwl"].includes(type);
  // Con reloj manda el reloj; sin reloj, los minutos de cardio que hiciste ajustan el día.
  const saveWatch = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (Number(kcal) > 0) await dt.setWatchKcal(today, kcal);
      else if (Number(mins) > 0) await dt.setWatchKcal(today, cardioEquivalent(profile, type, mins));
      setKcal(""); setMins(""); setNote(false); fx("success");
    } catch (err) { setError(err.message); }
  };
  const KINDS = [{ id: "rest", label: "Descanso" }, { id: "weights", label: "Pesas" }, { id: "cardio", label: "Cardio" }, { id: "both", label: "Cardio y pesas" }];
  const apply = async (k, m) => {
    setError("");
    fx("tick");
    try { await dt.setType(today, k === "rest" ? "rest" : dayKeyOf(k, m), k === "rest" || k === "cardio" ? [] : m); } catch (e) { setError(e.message); }
  };
  const pickKind = (k) => apply(k, k === "rest" || k === "cardio" ? [] : muscles);
  const toggleMuscle = (m) => apply(kind, muscles.includes(m) ? muscles.filter((x) => x !== m) : [...muscles, m]);
  const label = DAY_KEY_LABELS[type] || "Descanso";
  const detail = muscles.length && kind !== "rest" && kind !== "cardio" ? muscles.map((m) => MUSCLE_LABELS[m]).join(", ") : "";

  return (
    <section className="glass" style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--sp-2)" }}>
        <p className="eyebrow">Hoy</p>
        <button onClick={() => setExplain(true)} aria-label="¿Cómo se calcula tu meta?"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--t-caption)", fontWeight: 700, color: "var(--accent)" }}>
          <Info size={16} strokeWidth={2} /> ¿Cómo se calcula?
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--sp-3)" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{label}</p>
          {detail && <p className="caption" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</p>}
        </div>
        <button className="btn btn-glass" style={{ minHeight: 40, padding: "0 16px", fontSize: "var(--t-small)" }} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Listo" : "Cambiar"}
        </button>
      </div>

      <motion.div key={target} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>
        <Equation math={dayMath(profile, { type, target, est, adjust, watch })} compact />
      </motion.div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }} style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: 4, borderRadius: "var(--r-pill)", background: "var(--field)", border: "1px solid var(--hairline)" }}>
              {KINDS.map((o) => {
                const active = o.id === kind;
                return (
                  <button key={o.id} onClick={() => pickKind(o.id)} aria-pressed={active}
                    style={{ position: "relative", minHeight: 42, padding: "0 4px", borderRadius: "var(--r-pill)", fontWeight: 700, fontSize: 13 }}>
                    {active && (
                      <motion.span layoutId="daytype-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        style={{ position: "absolute", inset: 0, borderRadius: "var(--r-pill)", background: "linear-gradient(180deg, var(--accent), var(--accent-strong))" }} />
                    )}
                    <span style={{ position: "relative", color: active ? "var(--on-accent)" : "var(--text)" }}>{o.label}</span>
                  </button>
                );
              })}
            </div>
            {(kind === "weights" || kind === "both") && (
              <div>
                <p className="caption" style={{ fontWeight: 700, marginBottom: 8 }}>Músculos de hoy</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {MUSCLE_ORDER.map((m) => {
                    const on = muscles.includes(m);
                    return (
                      <button key={m} onClick={() => toggleMuscle(m)} aria-pressed={on}
                        style={{ padding: "8px 14px", borderRadius: 99, fontWeight: 700, fontSize: "var(--t-small)", color: "var(--text)",
                          background: on ? (m === "legs" ? "color-mix(in srgb, #3ddc84 25%, transparent)" : "color-mix(in srgb, var(--accent) 22%, transparent)") : "var(--field)",
                          border: `1px solid ${on ? (m === "legs" ? "color-mix(in srgb, #3ddc84 60%, transparent)" : "color-mix(in srgb, var(--accent) 55%, transparent)") : "var(--hairline)"}` }}>
                        {MUSCLE_LABELS[m]}
                      </button>
                    );
                  })}
                </div>
                {!muscles.length && <p className="caption" style={{ marginTop: 8 }}>Elige los músculos que trabajaste.</p>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {est > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--sp-2)", paddingTop: "var(--sp-2)", borderTop: "1px solid var(--hairline)" }}>
          <p className="caption num" style={{ flex: 1, minWidth: 0 }}>
            {watch > 0 ? `Registrado: ${fmt(watch)} kcal · ${adjust === 0 ? "sin ajuste" : `${adjust > 0 ? "+" : "−"}${fmt(Math.abs(adjust))} a tu meta`}` : "¿Cuánto marcó tu reloj?"}
          </p>
          <button className="btn btn-glass" style={{ minHeight: 38, padding: "0 14px", fontSize: "var(--t-caption)" }} onClick={() => setNote(true)}>
            {watch > 0 ? "Cambiar" : "Anotar entreno"}
          </button>
        </div>
      )}
      {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}

      {kind !== "rest" && est > 0 && !seen("daycalc") && (
        <div style={{ padding: "var(--sp-3) var(--sp-4)", borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <p style={{ fontWeight: 700, fontSize: "var(--t-small)" }}>Tu meta ya incluye este entreno</p>
          <p className="muted" style={{ fontSize: "var(--t-small)", lineHeight: 1.45 }}>
            La app estima unas {fmt(est)} kcal. Si quieres afinar, toca «Anotar entreno» con lo que marcó tu reloj: solo se suma la diferencia, no el total.
          </p>
          <div style={{ display: "flex", gap: "var(--sp-2)" }}>
            <button className="btn btn-primary" style={{ minHeight: 36, padding: "0 14px", fontSize: "var(--t-caption)" }} onClick={() => markSeen("daycalc")}>Entendido</button>
            <button className="btn btn-glass" style={{ minHeight: 36, padding: "0 14px", fontSize: "var(--t-caption)" }} onClick={() => setExplain(true)}>Ver cómo</button>
          </div>
        </div>
      )}

      {createPortal(
        <>
          <Sheet open={explain} onClose={() => setExplain(false)} title="Cómo se calcula tu meta">
            {explain && <CalcExplainer profile={profile} info={{ type, target, est, adjust, watch }} />}
          </Sheet>
          <Sheet open={note} onClose={() => setNote(false)} title="Anotar entreno">
            {note && (
              <form onSubmit={saveWatch} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", paddingBottom: "var(--sp-3)" }}>
                <p className="muted" style={{ fontSize: "var(--t-small)", lineHeight: 1.5 }}>
                  Tu meta ya incluye unas <b className="num" style={{ color: "var(--text)" }}>{fmt(est)} kcal</b> de este entreno. Lo que anotes reemplaza esa estimación: solo se suma la diferencia.
                </p>
                {hasCardio && (
                  <div className="field">
                    <label htmlFor="cardio-mins">Minutos de cardio que hiciste</label>
                    <input id="cardio-mins" type="number" inputMode="numeric" min="0" max="600" placeholder={`Planeado: ${profile.session_min || 45}`} value={mins} onChange={(e) => setMins(e.target.value)} />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="watch-kcal">Calorías del entreno según tu reloj</label>
                  <input id="watch-kcal" type="number" inputMode="numeric" min="0" max="5000" placeholder={watch ? String(watch) : `Estimado: ${fmt(est)}`} value={kcal} onChange={(e) => setKcal(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-block" disabled={!kcal && !mins}>Guardar</button>
                {watch > 0 && (
                  <button type="button" className="btn btn-text" onClick={async () => { await dt.setWatchKcal(today, 0).catch(() => {}); setNote(false); }}>Quitar lo anotado</button>
                )}
              </form>
            )}
          </Sheet>
        </>,
        document.body
      )}
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
