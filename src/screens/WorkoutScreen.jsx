import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, Dumbbell, Play, RefreshCw, Shuffle, Moon } from "lucide-react";
import Sheet from "../components/Sheet";
import WorkoutSession from "../components/WorkoutSession";
import { WEEKDAYS } from "../lib/plan";
import { buildRoutine, exerciseById, templatesFor } from "../lib/exercises";

const ease = [0.16, 1, 0.3, 1];
const dowOf = (day) => ((new Date(day + "T12:00:00").getDay() + 6) % 7) + 1;

export default function WorkoutScreen({ profile, wk, dt, onEditPlan }) {
  const [session, setSession] = useState(null);
  const [picking, setPicking] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [last, setLast] = useState({});

  const { routine, today } = wk;
  const days = profile.train_days || [];
  const todayDow = dowOf(today);
  const plannedToday = routine?.days?.[todayDow];
  const weekDone = new Set(wk.logs.map((l) => dowOf(l.day)));

  if (!profile.trains || days.length === 0) {
    return (
      <section className="glass" style={styles.card}>
        <span style={styles.icon}><Dumbbell size={26} strokeWidth={1.6} /></span>
        <h1>Entrenamiento</h1>
        <p className="muted">Cuéntanos qué días entrenas y te armamos una rutina, te ayudamos a registrar cada serie y guardamos tus récords.</p>
        <button className="btn btn-primary" onClick={onEditPlan}>Configurar mi entrenamiento</button>
      </section>
    );
  }

  if (!routine) {
    const options = templatesFor(days.length);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div>
          <p className="eyebrow">Tu rutina</p>
          <h1 style={{ fontSize: 28 }}>Elige cómo entrenar</h1>
          <p className="muted">Sugerencias para {days.length} {days.length === 1 ? "día" : "días"} a la semana. Después puedes cambiar cualquier ejercicio.</p>
        </div>
        {options.map((t) => (
          <motion.button key={t.id} className="glass" style={{ ...styles.card, textAlign: "left", color: "var(--text)" }} whileTap={{ scale: 0.98 }}
            onClick={() => wk.saveRoutine(buildRoutine(t, days))}>
            <h2>{t.name}</h2>
            <p className="caption">{[...new Set(t.days.map((d) => d.name))].join(" · ")}</p>
            <span className="btn btn-glass" style={{ alignSelf: "flex-start", minHeight: 38 }}>Usar esta rutina</span>
          </motion.button>
        ))}
      </div>
    );
  }

  const start = async (s) => {
    setLast(await wk.lastSets(s.exercises.map((e) => e.id)).catch(() => ({})));
    setSession(s);
  };
  const finishSession = async ({ sets, durationS }) => {
    setError("");
    try {
      await wk.finish({ name: session.name, leg: !!session.leg, durationS, sets });
      // El día queda como entreno o pierna, y su meta se ajusta sola.
      await dt.setType(today, session.leg ? "leg" : "train").catch(() => {});
      setSession(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (e) { setError(e.message); }
  };

  const restToday = async () => {
    setError("");
    try { await dt.setType(today, "rest"); } catch (e) { setError(e.message); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <section className="glass" style={{ padding: "var(--sp-4)" }}>
        <div style={styles.week}>
          {WEEKDAYS.map((w) => {
            const planned = routine.days[w.n];
            const done = weekDone.has(w.n);
            const isToday = w.n === todayDow;
            return (
              <div key={w.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span className="caption" style={{ fontWeight: isToday ? 700 : 400, color: isToday ? "var(--text)" : undefined }}>{w.short}</span>
                <span style={{ ...styles.dayDot, ...(planned && (planned.leg ? styles.leg : styles.train)), ...(isToday && styles.today) }}>
                  {done ? <Check size={16} strokeWidth={3} /> : null}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <AnimatePresence>
        {saved && (
          <motion.div className="glass" role="status" style={{ ...styles.card, flexDirection: "row", alignItems: "center", gap: "var(--sp-3)" }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Check size={20} strokeWidth={2.4} style={{ color: "var(--accent)" }} />
            <p style={{ fontWeight: 700 }}>Entreno guardado. Tu meta de hoy ya se ajustó.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {plannedToday ? (
        <section className="glass" style={styles.card}>
          <p className="eyebrow">Hoy toca</p>
          <h1 style={{ fontSize: 30 }}>{plannedToday.name}</h1>
          <ul style={styles.list}>
            {plannedToday.exercises.map((e) => (
              <li key={e.id} style={styles.li}>
                <span style={{ flex: 1 }}>{exerciseById(e.id)?.name}</span>
                <span className="num caption">{e.sets} × {e.reps}</span>
              </li>
            ))}
          </ul>
          <button className="btn btn-primary" style={{ minHeight: 60, fontSize: 18 }} onClick={() => start(plannedToday)}>
            <Play size={20} strokeWidth={2.2} /> {wk.trainedToday ? "Entrenar otra vez" : "Empezar"}
          </button>
        </section>
      ) : (
        <section className="glass" style={styles.card}>
          <span style={styles.icon}><Moon size={24} strokeWidth={1.6} /></span>
          <h2>Hoy es día de descanso</h2>
          <p className="muted">Si quieres entrenar igual, elige una de tus sesiones.</p>
          <button className="btn btn-primary" onClick={() => setPicking(true)}>Elegir sesión</button>
        </section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)" }}>
        <button className="btn btn-glass" style={{ fontSize: "var(--t-small)" }} onClick={() => setPicking(true)}>
          <Shuffle size={16} strokeWidth={1.9} /> Hice otra cosa
        </button>
        <button className="btn btn-glass" style={{ fontSize: "var(--t-small)" }} onClick={restToday}>
          <Moon size={16} strokeWidth={1.9} /> Hoy no entrené
        </button>
      </div>
      {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
      <button className="btn btn-text" style={{ alignSelf: "center", fontSize: "var(--t-small)", color: "var(--text-2)" }} onClick={() => setChanging(true)}>
        <RefreshCw size={15} strokeWidth={2} /> Cambiar rutina
      </button>

      {createPortal(
        <>
          <Sheet open={picking} onClose={() => setPicking(false)} title="¿Qué entrenaste?">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", paddingBottom: "var(--sp-3)" }}>
              {Object.values(routine.days).filter((d, i, a) => a.findIndex((x) => x.name === d.name) === i).map((d) => (
                <button key={d.name} className="glass" style={{ ...styles.pick }} onClick={() => { setPicking(false); start(d); }}>
                  <span style={{ fontWeight: 700 }}>{d.name}</span>
                  <span className="caption">{d.exercises.length} ejercicios</span>
                </button>
              ))}
              <button className="btn btn-text" onClick={() => { setPicking(false); restToday(); }}>No entrené hoy</button>
            </div>
          </Sheet>
          <Sheet open={changing} onClose={() => setChanging(false)} title="Cambiar rutina">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", paddingBottom: "var(--sp-3)" }}>
              {templatesFor(days.length).map((t) => (
                <button key={t.id} className="glass" style={styles.pick} onClick={() => { wk.saveRoutine(buildRoutine(t, days)); setChanging(false); }}>
                  <span style={{ fontWeight: 700 }}>{t.name}</span>
                  <span className="caption">{[...new Set(t.days.map((d) => d.name))].join(" · ")}</span>
                </button>
              ))}
            </div>
          </Sheet>
          <AnimatePresence>
            {session && (
              <WorkoutSession key="session" session={session} lastSets={last} onCancel={() => setSession(null)} onFinish={finishSession} />
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}

const styles = {
  card: { padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-3)", borderRadius: "var(--r-lg)" },
  icon: { width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)" },
  week: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  dayDot: {
    width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", color: "#fff",
    background: "var(--field)", border: "1px solid var(--hairline)",
  },
  train: { background: "color-mix(in srgb, var(--accent) 70%, transparent)", borderColor: "transparent" },
  leg: { background: "color-mix(in srgb, #3ddc84 75%, transparent)", borderColor: "transparent" },
  today: { boxShadow: "0 0 0 2px var(--bg), 0 0 0 4px var(--text)" },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" },
  li: { display: "flex", gap: "var(--sp-3)", padding: "10px 0", borderTop: "1px solid var(--hairline)", fontSize: "var(--t-small)", fontWeight: 700 },
  pick: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "var(--sp-4)", borderRadius: "var(--r-md)", color: "var(--text)", textAlign: "left" },
};
