import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, Dumbbell, HeartPulse, Pencil, Play, RefreshCw, Shuffle, Moon } from "lucide-react";
import { useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { avatarSrc } from "../lib/avatars";
import Sheet from "../components/Sheet";
import WorkoutSession from "../components/WorkoutSession";
import RoutineEditor from "../components/RoutineEditor";
import CalcExplainer from "../components/CalcExplainer";
import { WEEKDAYS, cardioEquivalent } from "../lib/plan";
import { buildRoutine, buildRoutineFromPlan, exerciseById, templatesFor } from "../lib/exercises";

const ease = [0.16, 1, 0.3, 1];
const dowOf = (day) => ((new Date(day + "T12:00:00").getDay() + 6) % 7) + 1;

export default function WorkoutScreen({ profile, wk, dt, onEditPlan, seen = () => true, markSeen = () => {} }) {
  const [session, setSession] = useState(null);
  const [picking, setPicking] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [cardioKcal, setCardioKcal] = useState("");
  const [cardioMinutes, setCardioMinutes] = useState("");
  const [intro, setIntro] = useState(null); // explicación antes del primer entreno
  const [last, setLast] = useState({});
  const [best, setBest] = useState({});
  const [newRecords, setNewRecords] = useState(null);
  const [marks, setMarks] = useState([]);
  const [detail, setDetail] = useState(null);
  const [editingDow, setEditingDow] = useState(null); // día de la semana cuya sesión se edita

  useEffect(() => { wk.myExercises().then(setMarks).catch(() => {}); }, [wk.logs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // Con plan por día, la rutina se arma sola con los músculos que eligió cada día.
  useEffect(() => {
    if (!wk.routine && profile.trains && profile.day_plan && Object.keys(profile.day_plan).length) wk.saveRoutine(buildRoutineFromPlan(profile.day_plan));
  }, [wk.routine, profile.trains, profile.day_plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const { routine, today } = wk;
  const days = profile.train_days || [];
  const hasPlan = !!profile.day_plan && Object.keys(profile.day_plan).length > 0;
  const todayDow = dowOf(today);
  const plannedToday = routine?.days?.[todayDow];
  const weekDone = new Set(wk.logs.map((l) => dowOf(l.day)));
  const estOf = (s) => (s && (profile.plan_version || 1) >= 2 ? profile.burns?.[s.key] || 0 : 0);
  // Datos para explicar la cuenta de una sesión (aunque el día aún no esté marcado con su tipo).
  const infoOf = (s) => ({ type: s.key, est: estOf(s), adjust: 0, watch: null, target: profile.targets?.[s.key] ?? profile.target_kcal });

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

  if (!routine && hasPlan) return null; // se está generando desde el plan
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

  const saveEdit = async (exercises) => {
    const name = routine.days[editingDow].name;
    const days = Object.fromEntries(Object.entries(routine.days).map(([dow, d]) =>
      [dow, d.name === name ? { ...d, leg: exercises.some((e) => exerciseById(e.id)?.muscle === "legs"), exercises: exercises.map((e) => ({ ...e })) } : d]));
    await wk.saveRoutine({ ...routine, days });
    setEditingDow(null);
  };

  const finishCardio = async (s) => {
    setError("");
    try {
      const k = Number(cardioKcal) || 0;
      const min = Number(cardioMinutes) || profile.session_min || 45;
      await wk.finish({ name: s.name, leg: false, durationS: min * 60, sets: [], watchKcal: k, cardioMin: min });
      // Con reloj, manda el reloj; sin reloj, los minutos que hiciste.
      if (k > 0) await dt.setWatchKcal(today, (dt.watch?.[today] || 0) + k).catch(() => {});
      else await dt.setWatchKcal(today, cardioEquivalent(profile, s.key || "cardio", min)).catch(() => {});
      setCardioKcal(""); setCardioMinutes("");
      await dt.setType(today, s.key || "cardio", s.muscles || []).catch(() => {});
      setSaved(true); setTimeout(() => setSaved(false), 4000);
    } catch (e) { setError(e.message); }
  };

  const start = async (s) => {
    if (!s.exercises?.length) return finishCardio(s);
    const r = await wk.lastSets(s.exercises.map((e) => e.id)).catch(() => ({ last: {}, best: {} }));
    setLast(r.last); setBest(r.best);
    setSession(s);
  };
  const finishSession = async ({ sets, durationS, records, watchKcal, cardioMin }) => {
    setError("");
    try {
      await wk.finish({ name: session.name, leg: !!session.leg, durationS, sets, watchKcal, cardioMin });
      // El reloj del día suma lo de todas las sesiones de hoy; sin reloj, se usan los minutos de cardio.
      if (watchKcal > 0) await dt.setWatchKcal(today, (dt.watch?.[today] || 0) + watchKcal).catch(() => {});
      else if (cardioMin > 0) await dt.setWatchKcal(today, cardioEquivalent(profile, session.key, cardioMin)).catch(() => {});
      // El día queda como entreno o pierna, y su meta se ajusta sola.
      await dt.setType(today, session.key || (session.leg ? "leg" : "train"), session.muscles || (session.leg ? ["legs"] : [])).catch(() => {});
      setSession(null);
      if (records?.length) setNewRecords(records); else { setSaved(true); setTimeout(() => setSaved(false), 4000); }
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
              <button key={w.n} disabled={!planned} onClick={() => setEditingDow(w.n)} aria-label={planned ? `Editar ${planned.name} del ${w.long}` : w.long}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "var(--text)" }}>
                <span className="caption" style={{ fontWeight: isToday ? 700 : 400, color: isToday ? "var(--text)" : undefined }}>{w.short}</span>
                <span style={{ ...styles.dayDot, ...(planned && (["leg", "cwl"].includes(planned.key) || (!planned.key && planned.leg) ? styles.leg : planned.key === "cardio" ? styles.cardio : styles.train)), ...(isToday && styles.today) }}>
                  {done ? <Check size={16} strokeWidth={3} /> : null}
                </span>
              </button>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="eyebrow">Hoy toca</p>
            <button className="btn btn-glass" style={{ minHeight: 36, padding: "0 14px", fontSize: "var(--t-caption)" }} onClick={() => setEditingDow(todayDow)}>
              <Pencil size={14} strokeWidth={2} /> Editar
            </button>
          </div>
          <h1 style={{ fontSize: 30 }}>{plannedToday.name}</h1>
          {plannedToday.exercises?.length > 0 ? (
            <>
              <ul style={styles.list}>
                {plannedToday.exercises.map((e) => (
                  <li key={e.id} style={styles.li}>
                    <span style={{ flex: 1 }}>{exerciseById(e.id)?.name}</span>
                    <span className="num caption">{e.sets} × {e.reps}</span>
                  </li>
                ))}
              </ul>
              {plannedToday.cardio && (
                <p className="caption" style={{ display: "flex", alignItems: "center", gap: 6 }}><HeartPulse size={15} strokeWidth={2} /> Incluye cardio al terminar.</p>
              )}
              {estOf(plannedToday) > 0 && (
                <p className="caption">Tu meta de hoy ya incluye unas <b className="num">{estOf(plannedToday).toLocaleString("es-CO")} kcal</b> de este entreno. Al terminar podrás anotar las de tu reloj.</p>
              )}
              <button className="btn btn-primary" style={{ minHeight: 60, fontSize: 18 }}
                onClick={() => (estOf(plannedToday) > 0 && !seen("startcalc") ? setIntro(plannedToday) : start(plannedToday))}>
                <Play size={20} strokeWidth={2.2} /> {wk.trainedToday ? "Entrenar otra vez" : "Empezar"}
              </button>
            </>
          ) : (
            <>
              <p className="muted" style={{ display: "flex", alignItems: "center", gap: 8 }}><HeartPulse size={18} strokeWidth={1.8} /> Planeado: {profile.session_min || 45} minutos de cardio.</p>
              {estOf(plannedToday) > 0 && (
                <p className="caption">Tu meta ya incluye unas <b className="num">{estOf(plannedToday).toLocaleString("es-CO")} kcal</b> de este cardio. Los minutos o las calorías que anotes reemplazan esa estimación: solo se suma la diferencia.</p>
              )}
              <div className="field">
                <label htmlFor="cardio-min">¿Cuántos minutos hiciste?</label>
                <input id="cardio-min" type="number" inputMode="numeric" min="1" max="600" placeholder={String(profile.session_min || 45)} value={cardioMinutes} onChange={(e) => setCardioMinutes(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="cardio-kcal">Calorías según tu reloj (opcional)</label>
                <input id="cardio-kcal" type="number" inputMode="numeric" min="0" max="5000" placeholder="Ej: 400" value={cardioKcal} onChange={(e) => setCardioKcal(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ minHeight: 60, fontSize: 18 }} onClick={() => finishCardio(plannedToday)}>
                <Check size={20} strokeWidth={2.4} /> {wk.trainedToday ? "Registrar otra vez" : "Marcar cardio hecho"}
              </button>
            </>
          )}
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
      {marks.length > 0 && (
        <section className="glass" style={{ padding: "var(--sp-2) var(--sp-4)" }}>
          <p className="eyebrow" style={{ padding: "10px 0 6px" }}>Tus marcas</p>
          {marks.slice(0, 6).map((m) => (
            <button key={m.id} onClick={() => wk.progress(m.id).then((p) => setDetail({ id: m.id, points: p }))}
              style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", width: "100%", padding: "12px 0", borderTop: "1px solid var(--hairline)", color: "var(--text)", textAlign: "left" }}>
              <span style={{ flex: 1, fontWeight: 700 }}>{exerciseById(m.id)?.name || m.id}</span>
              <span className="num" style={{ fontWeight: 700 }}>{m.kg.toLocaleString("es-CO")} kg × {m.reps}</span>
              <ChevronRight size={18} strokeWidth={1.8} style={{ color: "var(--text-2)" }} />
            </button>
          ))}
        </section>
      )}

      <button className="btn btn-text" style={{ alignSelf: "center", fontSize: "var(--t-small)", color: "var(--text-2)" }} onClick={() => setChanging(true)}>
        <RefreshCw size={15} strokeWidth={2} /> Cambiar rutina
      </button>

      {createPortal(
        <>
          {editingDow && routine.days[editingDow] && (
            <RoutineEditor key={editingDow} session={routine.days[editingDow]}
              sameCount={Object.values(routine.days).filter((d) => d.name === routine.days[editingDow].name).length}
              onSave={saveEdit} onClose={() => setEditingDow(null)} />
          )}
          <Sheet open={!!intro} onClose={() => setIntro(null)} title="Antes de empezar">
            {intro && (
              <>
                <CalcExplainer profile={profile} info={infoOf(intro)} />
                <button className="btn btn-primary btn-block" style={{ marginBottom: "var(--sp-3)" }}
                  onClick={() => { const s = intro; markSeen("startcalc"); setIntro(null); start(s); }}>
                  Entendido, empezar
                </button>
              </>
            )}
          </Sheet>
          <Sheet open={picking} onClose={() => setPicking(false)} title="¿Qué entrenaste?">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", paddingBottom: "var(--sp-3)" }}>
              {Object.values(routine.days).filter((d, i, a) => a.findIndex((x) => x.name === d.name) === i).map((d) => (
                <button key={d.name} className="glass" style={{ ...styles.pick }} onClick={() => { setPicking(false); estOf(d) > 0 && !seen("startcalc") && d.exercises?.length ? setIntro(d) : start(d); }}>
                  <span style={{ fontWeight: 700 }}>{d.name}</span>
                  <span className="caption">{d.exercises.length} ejercicios</span>
                </button>
              ))}
              <button className="btn btn-text" onClick={() => { setPicking(false); restToday(); }}>No entrené hoy</button>
            </div>
          </Sheet>
          <Sheet open={changing} onClose={() => setChanging(false)} title="Cambiar rutina">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", paddingBottom: "var(--sp-3)" }}>
              {hasPlan && (
                <button className="glass" style={styles.pick} onClick={() => { wk.saveRoutine(buildRoutineFromPlan(profile.day_plan)); setChanging(false); }}>
                  <span style={{ fontWeight: 700 }}>Generar desde mi plan</span>
                  <span className="caption">Una sesión por día, según los músculos que elegiste.</span>
                </button>
              )}
              {templatesFor(days.length).map((t) => (
                <button key={t.id} className="glass" style={styles.pick} onClick={() => { wk.saveRoutine(buildRoutine(t, days)); setChanging(false); }}>
                  <span style={{ fontWeight: 700 }}>{t.name}</span>
                  <span className="caption">{[...new Set(t.days.map((d) => d.name))].join(" · ")}</span>
                </button>
              ))}
            </div>
          </Sheet>
          <Sheet open={!!newRecords} onClose={() => { setNewRecords(null); setSaved(true); setTimeout(() => setSaved(false), 4000); }} title="Nuevo récord">
            {newRecords && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-3)", textAlign: "center", paddingBottom: "var(--sp-4)" }}>
                <motion.img src={avatarSrc(profile.avatar, "party")} alt="" initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0, y: [0, -20, 0] }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }} style={{ width: 120, height: 120, borderRadius: "50%" }} />
                <h1>{newRecords.length > 1 ? `${newRecords.length} récords hoy` : "Rompiste tu marca"}</h1>
                <div style={{ width: "100%" }}>
                  {newRecords.map((r) => (
                    <div key={r.name} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--hairline)" }}>
                      <span style={{ fontWeight: 700 }}>{r.name}</span>
                      <span className="num" style={{ fontWeight: 700 }}>{r.kg.toLocaleString("es-CO")} kg × {r.reps}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary btn-block" onClick={() => { setNewRecords(null); setSaved(true); setTimeout(() => setSaved(false), 4000); }}>Genial</button>
              </div>
            )}
          </Sheet>
          <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail ? exerciseById(detail.id)?.name : ""}>
            {detail && <ProgressDetail points={detail.points} />}
          </Sheet>
          <AnimatePresence>
            {session && (
              <WorkoutSession key="session" session={session} lastSets={last} best={best} estKcal={estOf(session)} onCancel={() => setSession(null)} onFinish={finishSession} />
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}

function ProgressDetail({ points }) {
  const first = points[0], last = points[points.length - 1];
  const gain = first && last ? Math.round((last.e1rm - first.e1rm) * 10) / 10 : 0;
  const bestP = points.reduce((b, p) => (p.e1rm > (b?.e1rm ?? 0) ? p : b), null);
  const data = points.map((p) => ({ day: p.day, v: p.e1rm }));
  const vs = data.map((d) => d.v);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", paddingBottom: "var(--sp-4)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)" }}>
        <div style={styles.stat}><p className="caption">Mejor marca</p><p className="num" style={{ fontWeight: 700, fontSize: 22 }}>{bestP ? `${bestP.kg.toLocaleString("es-CO")} × ${bestP.reps}` : "–"}</p></div>
        <div style={styles.stat}><p className="caption">Desde que empezaste</p><p className="num" style={{ fontWeight: 700, fontSize: 22, color: gain > 0 ? "var(--accent)" : undefined }}>{gain > 0 ? "+" : ""}{gain.toLocaleString("es-CO")} kg</p></div>
      </div>
      {data.length > 1 ? (
        <div style={{ height: 170, margin: "0 -8px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="pr-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style={{ stopColor: "var(--accent)", stopOpacity: 0.35 }} />
                  <stop offset="1" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={[Math.min(...vs) - 3, Math.max(...vs) + 3]} />
              <Tooltip cursor={{ stroke: "var(--hairline)" }} formatter={(v) => [`${v} kg`, "Fuerza estimada"]} labelFormatter={(d) => d} />
              <Area type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2.5} fill="url(#pr-fill)" dot={false} animationDuration={900}
                activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--bg)", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : <p className="muted">Con una sesión más ya verás tu gráfica.</p>}
      <p className="caption">La fuerza estimada es el peso que levantarías a 1 repetición (fórmula de Epley), calculada con tus series de 1 a 10 repeticiones.</p>
    </div>
  );
}

const styles = {
  stat: { padding: "14px", borderRadius: "var(--r-md)", background: "var(--field)", border: "1px solid var(--hairline)" },
  card: { padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-3)", borderRadius: "var(--r-lg)" },
  icon: { width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)" },
  week: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  dayDot: {
    width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", color: "#fff",
    background: "var(--field)", border: "1px solid var(--hairline)",
  },
  train: { background: "color-mix(in srgb, var(--accent) 70%, transparent)", borderColor: "transparent" },
  leg: { background: "color-mix(in srgb, #3ddc84 75%, transparent)", borderColor: "transparent" },
  cardio: { background: "color-mix(in srgb, #ffb02e 80%, transparent)", borderColor: "transparent" },
  today: { boxShadow: "0 0 0 2px var(--bg), 0 0 0 4px var(--text)" },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" },
  li: { display: "flex", gap: "var(--sp-3)", padding: "10px 0", borderTop: "1px solid var(--hairline)", fontSize: "var(--t-small)", fontWeight: 700 },
  pick: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "var(--sp-4)", borderRadius: "var(--r-md)", color: "var(--text)", textAlign: "left" },
};
