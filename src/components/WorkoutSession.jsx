import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, TrendingUp, X } from "lucide-react";
import { e1rm, exerciseById } from "../lib/exercises";
import { fx } from "../lib/feedback";

const REST_S = 90;
const ease = [0.16, 1, 0.3, 1];
const kgFmt = (n) => Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 });
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Pantalla de gym: un ejercicio a la vez, botones grandes, el peso de la última vez ya cargado.
export default function WorkoutSession({ session, lastSets, best = {}, onFinish, onCancel }) {
  const exercises = session.exercises.map((e) => ({ ...e, info: exerciseById(e.id) })).filter((e) => e.info);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState([]); // series hechas: { exercise_id, exercise_name, set_no, kg, reps }
  const [kg, setKg] = useState(0);
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(0);
  const [startedAt] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const wake = useRef(null);
  const bests = useRef({ ...best });      // mejores marcas previas; se actualizan al romper un récord
  const [records, setRecords] = useState({}); // exercise_id -> { name, kg, reps }
  const [flash, setFlash] = useState(null);   // aviso de récord de la última serie

  const ex = exercises[idx];
  const mine = done.filter((s) => s.exercise_id === ex?.id);
  const setNo = mine.length + 1;

  // Precarga: lo último que hiciste en ese ejercicio, o lo que acabas de hacer en la serie anterior.
  useEffect(() => {
    if (!ex) return;
    const last = mine[mine.length - 1] || lastSets[ex.id];
    setKg(last ? Number(last.kg) : 0);
    setReps(last ? last.reps : ex.reps);
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  useEffect(() => {
    if (rest <= 0) return;
    const t = setTimeout(() => { if (rest === 1) fx("rest"); setRest((r) => r - 1); }, 1000);
    return () => clearTimeout(t);
  }, [rest]);

  // Mantiene la pantalla encendida mientras entrenas (si el teléfono lo permite).
  useEffect(() => {
    navigator.wakeLock?.request("screen").then((l) => { wake.current = l; }).catch(() => {});
    return () => { wake.current?.release?.().catch(() => {}); };
  }, []);

  const doneSet = () => {
    const s = { exercise_id: ex.id, exercise_name: ex.info.name, set_no: setNo, kg, reps };
    setDone((d) => [...d, s]);
    // Récord: supera tu mejor peso o tu fuerza estimada (solo si ya habías hecho el ejercicio).
    const b = bests.current[ex.id];
    const e = reps <= 10 ? e1rm(kg, reps) : 0;
    const isRecord = !!(b && b.kg > 0 && (kg > b.kg || (e > 0 && e > b.e1rm)));
    if (!isRecord) fx("success");
    if (isRecord) {
      bests.current[ex.id] = { kg: Math.max(b.kg, kg), e1rm: Math.max(b.e1rm, e) };
      setRecords((r) => ({ ...r, [ex.id]: { name: ex.info.name, kg, reps } }));
      setFlash({ key: Date.now(), text: `${ex.info.name}: ${kgFmt(kg)} kg × ${reps}` });
      fx("record");
      setTimeout(() => setFlash(null), 2600);
    }
    if (setNo >= ex.sets) {
      if (idx < exercises.length - 1) { setIdx(idx + 1); setRest(REST_S); } else { setRest(0); setConfirmEnd(true); }
    } else {
      setRest(REST_S);
    }
  };

  const go = (d) => setIdx((i) => Math.max(0, Math.min(exercises.length - 1, i + d)));
  const volume = Math.round(done.reduce((t, s) => t + s.kg * s.reps, 0));

  return (
    <motion.div style={styles.wrap} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.3, ease }}>
      <div style={styles.top}>
        <button className="btn-glass" style={styles.iconBtn} onClick={() => setConfirmEnd(true)} aria-label="Terminar"><X size={20} strokeWidth={1.8} /></button>
        <div style={{ textAlign: "center" }}>
          <p className="eyebrow">{session.name}</p>
          <p className="num" style={{ fontWeight: 700 }}>{clock(elapsed)}</p>
        </div>
        <span style={{ width: 44 }} />
      </div>

      <div style={styles.dots} aria-hidden="true">
        {exercises.map((e, i) => (
          <span key={e.id + i} style={{ ...styles.dot, opacity: i === idx ? 1 : i < idx ? 0.6 : 0.25, width: i === idx ? 22 : 8 }} />
        ))}
      </div>

      {ex && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={ex.id + idx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease }} style={styles.body}>
            <div>
              <p className="caption">Ejercicio {idx + 1} de {exercises.length}</p>
              <h1 style={{ fontSize: 30 }}>{ex.info.name}</h1>
              <p className="muted" style={{ fontWeight: 700 }}>
                Serie {Math.min(setNo, ex.sets)} de {ex.sets}
                {lastSets[ex.id] && <> · última vez {kgFmt(lastSets[ex.id].kg)} kg × {lastSets[ex.id].reps}</>}
              </p>
            </div>

            <Stepper label="Peso" unit="kg" value={kg} onChange={setKg} step={2.5} big />
            <Stepper label="Repeticiones" unit="reps" value={reps} onChange={setReps} step={1} />

            <button className="btn btn-primary" style={styles.doneBtn} onClick={doneSet} disabled={reps < 1}>
              <Check size={22} strokeWidth={2.4} /> Serie hecha
            </button>

            {mine.length > 0 && (
              <p className="caption num" style={{ textAlign: "center" }}>
                Hechas: {mine.map((s) => `${kgFmt(s.kg)}×${s.reps}`).join("  ·  ")}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-text" disabled={idx === 0} onClick={() => go(-1)}><ChevronLeft size={18} strokeWidth={2} /> Anterior</button>
              <button className="btn btn-text" disabled={idx === exercises.length - 1} onClick={() => go(1)}>Saltar ejercicio <ChevronRight size={18} strokeWidth={2} /></button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {flash && (
          <motion.div key={flash.key} className="glass glass-strong" role="status" style={styles.flash}
            initial={{ y: -40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}>
            <span style={styles.flashIcon}><TrendingUp size={20} strokeWidth={2.2} /></span>
            <div>
              <p style={{ fontWeight: 700 }}>Nuevo récord</p>
              <p className="caption">{flash.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rest > 0 && (
          <motion.div className="glass glass-strong" style={styles.rest} initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}>
            <div style={{ flex: 1 }}>
              <p className="eyebrow">Descanso</p>
              <p className="num" style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em" }}>{clock(rest)}</p>
            </div>
            <button className="btn btn-glass" onClick={() => setRest((r) => r + 30)}>+30 s</button>
            <button className="btn btn-primary" onClick={() => setRest(0)}>Listo</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmEnd && (
          <motion.div style={styles.scrim} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="glass glass-strong" style={styles.sheet} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}>
              <h2>{done.length ? "Terminar el entreno" : "Salir sin registrar"}</h2>
              {done.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Object.keys(records).length ? 4 : 3}, 1fr)`, gap: "var(--sp-2)", textAlign: "center" }}>
                  <Stat label="Tiempo" value={clock(elapsed)} />
                  <Stat label="Series" value={done.length} />
                  <Stat label="Volumen" value={`${volume.toLocaleString("es-CO")} kg`} />
                  {Object.keys(records).length > 0 && <Stat label="Récords" value={Object.keys(records).length} />}
                </div>
              ) : <p className="muted">No has hecho ninguna serie todavía.</p>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)" }}>
                <button className="btn btn-glass" onClick={() => setConfirmEnd(false)}>Seguir</button>
                {done.length > 0
                  ? <button className="btn btn-primary" onClick={() => onFinish({ sets: done, durationS: elapsed, records: Object.values(records) })}>Guardar</button>
                  : <button className="btn btn-primary" onClick={onCancel}>Salir</button>}
              </div>
              {done.length > 0 && <button className="btn btn-text" onClick={onCancel}>Descartar entreno</button>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Stepper({ label, unit, value, onChange, step, big }) {
  const set = (v) => { fx("tick"); onChange(Math.max(0, Math.round(v * 100) / 100)); };
  return (
    <div className="glass" style={styles.stepper}>
      <p className="eyebrow">{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
        <button style={styles.stepBtn} onClick={() => set(value - step)} aria-label={`Menos ${label.toLowerCase()}`}><Minus size={26} strokeWidth={2.2} /></button>
        <label style={{ flex: 1, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
          <input type="number" inputMode="decimal" value={value} step={step} aria-label={label}
            onChange={(e) => set(Number(e.target.value))}
            style={{ ...styles.input, fontSize: big ? 56 : 44 }} />
          <span className="muted" style={{ fontWeight: 700 }}>{unit}</span>
        </label>
        <button style={styles.stepBtn} onClick={() => set(value + step)} aria-label={`Más ${label.toLowerCase()}`}><Plus size={26} strokeWidth={2.2} /></button>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (<div><p className="caption">{label}</p><p className="num" style={{ fontWeight: 700, fontSize: 20 }}>{value}</p></div>);
}

const styles = {
  wrap: {
    position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", gap: "var(--sp-3)", maxWidth: 480, margin: "0 auto",
    padding: "calc(var(--safe-top) + 12px) 20px calc(var(--safe-bottom) + 16px)", background: "var(--bg)", overflowY: "auto",
  },
  top: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", color: "var(--text)", border: "1px solid var(--glass-border)" },
  dots: { display: "flex", gap: 6, justifyContent: "center", alignItems: "center", minHeight: 10 },
  dot: { height: 8, borderRadius: 99, background: "var(--accent)", display: "block", transition: "all 250ms" },
  body: { flex: 1, display: "flex", flexDirection: "column", gap: "var(--sp-4)", paddingBottom: 120 },
  stepper: { padding: "var(--sp-3) var(--sp-4)", borderRadius: "var(--r-lg)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" },
  stepBtn: {
    width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, color: "var(--text)",
    background: "var(--field)", border: "1px solid var(--hairline)",
  },
  input: {
    width: "100%", minWidth: 0, maxWidth: 160, textAlign: "center", background: "none", border: "none", outline: "none",
    fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text)", fontVariantNumeric: "tabular-nums",
  },
  doneBtn: { minHeight: 68, fontSize: 20, borderRadius: "var(--r-lg)" },
  flash: { position: "fixed", zIndex: 86, top: "calc(var(--safe-top) + 12px)", left: 16, right: 16, maxWidth: 448, margin: "0 auto", display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "12px 16px", borderRadius: "var(--r-lg)" },
  flashIcon: { width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center", color: "#fff", background: "linear-gradient(180deg, #3ddc84, #1b8a4c)", flexShrink: 0 },
  rest: { position: "fixed", zIndex: 85, left: 16, right: 16, bottom: "calc(var(--safe-bottom) + 16px)", maxWidth: 448, margin: "0 auto", display: "flex", alignItems: "center", gap: "var(--sp-2)", padding: "var(--sp-3) var(--sp-4)", borderRadius: "var(--r-lg)" },
  scrim: { position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" },
  sheet: { width: "100%", maxWidth: 480, padding: "var(--sp-5)", paddingBottom: "calc(var(--safe-bottom) + var(--sp-5))", borderRadius: "var(--r-lg) var(--r-lg) 0 0", display: "flex", flexDirection: "column", gap: "var(--sp-4)" },
};
