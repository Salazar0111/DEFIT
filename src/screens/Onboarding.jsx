import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, Check, Info, TriangleAlert, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { AVATARS, avatarSrc } from "../lib/avatars";
import PhotoTile from "../components/PhotoTile";
import { PALETTES, applyPalette } from "../lib/palettes";
import {
  DAY_KEY_LABELS, DEFICITS, FRAMES, GOALS, LIFESTYLES, MUSCLE_LABELS, MUSCLE_ORDER, SESSION_MINUTES, TRAIN_TYPES, WEEKDAYS,
  ageFrom, burnKcal, CARDIO_DEFAULT, computePlanV2, dayKeyOf, fmt, normalizeDayPlan,
} from "../lib/plan";

const ease = [0.16, 1, 0.3, 1];

// Firma del plan por día (días, tipo y músculos) para saber si cambió.
const sig = (dp) => Object.keys(dp).sort().map((n) => `${n}:${dp[n].kind}:${[...(dp[n].muscles || [])].sort().join(",")}`).join("|");

// focus = "days": solo los pasos para elegir días de entreno y qué se hace cada día.
// edit = true: solo los pasos del plan (desde Perfil u Hoy), con opción de cancelar.
export default function Onboarding({ profile, edit = false, focus = null, onDone, onCancel }) {
  const v2 = (profile.plan_version || 1) >= 2;
  const [d, setD] = useState({
    name: profile.name || "",
    avatar: profile.avatar || "a1",
    palette: profile.palette || "noche-azul",
    sex: profile.sex || null,
    birthdate: profile.birthdate || "",
    height_cm: profile.height_cm ?? "",
    weight_kg: profile.weight_kg ?? "",
    body_fat: profile.body_fat ?? "",
    frame: profile.frame || null,
    lifestyle: v2 ? profile.lifestyle : null,
    trains: focus === "days" ? true : v2 ? profile.trains : null,
    // Plan por día: { dow: { kind: "weights"|"cardio"|"both", muscles: [...] } }
    day_plan: (v2 || focus === "days") && profile.trains ? normalizeDayPlan(profile) : {},
    cardio: profile.cardio || CARDIO_DEFAULT,   // trotadora: { mode: "walk"|"run", speed, incline }
    session_min: profile.session_min || 60,
    intensity: profile.intensity || "moderate",
    target_mode: profile.target_mode || "by_day",
    goal: v2 ? profile.goal : profile.deficit > 0 ? "lose" : profile.onboarded ? "maintain" : null,
    deficit: profile.deficit > 0 ? profile.deficit : 600,
  });
  const [ack, setAck] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // patch puede ser una función del estado actual (evita perder toques rápidos seguidos).
  const set = (patch) => { setD((x) => ({ ...x, ...(typeof patch === "function" ? patch(x) : patch) })); setAck(false); };
  const deficit = d.goal === "lose" ? d.deficit : 0;
  const plan = useMemo(() => computePlanV2({ ...d, deficit }), [d, deficit]);
  const trainDays = Object.keys(d.day_plan).map(Number).sort((a, b) => a - b);
  const weights = !!d.trains && trainDays.some((n) => d.day_plan[n].kind !== "cardio");
  const hasCardio = !!d.trains && trainDays.some((n) => d.day_plan[n].kind !== "weights");

  const steps = focus === "days" ? [
    "days",
    trainDays.length > 0 && "dayplan",
    trainDays.length > 0 && "training",
    plan?.warnings.length > 0 && "goal",
    "summary",
  ].filter(Boolean) : [
    !edit && "welcome",
    "data", "lifestyle", "trains",
    d.trains && "days",
    d.trains && trainDays.length > 0 && "dayplan",
    d.trains && trainDays.length > 0 && "training",
    "goal", "summary",
  ].filter(Boolean);
  const current = steps[step];

  const age = ageFrom(d.birthdate);
  const valid = {
    welcome: d.name.trim().length > 0,
    data: !!d.sex && age >= 14 && age <= 100 && Number(d.height_cm) >= 120 && Number(d.height_cm) <= 230 && Number(d.weight_kg) >= 30 && Number(d.weight_kg) <= 300,
    lifestyle: !!d.lifestyle,
    trains: d.trains !== null,
    days: trainDays.length > 0,
    training: !hasCardio || (Number(d.cardio.speed) >= (d.cardio.mode === "walk" ? 3 : 6) && Number(d.cardio.speed) <= (d.cardio.mode === "walk" ? 7 : 22) && Number(d.cardio.incline) >= 0 && Number(d.cardio.incline) <= 15),
    dayplan: trainDays.every((n) => d.day_plan[n].kind === "cardio" || d.day_plan[n].muscles.length > 0),
    goal: !!d.goal && (!plan?.warnings.length || ack),
    summary: !!plan,
  }[current];

  const go = (delta) => { setDir(delta); setStep((s) => Math.max(0, Math.min(steps.length - 1, s + delta))); };

  const finish = async () => {
    setSaving(true);
    setError("");
    const trains = !!d.trains && trainDays.length > 0;
    const kinds = new Set(trainDays.map((n) => d.day_plan[n].kind));
    const dayPlan = Object.fromEntries(trainDays.map((n) => [n, { kind: d.day_plan[n].kind, muscles: d.day_plan[n].muscles, key: dayKeyOf(d.day_plan[n].kind, d.day_plan[n].muscles) }]));
    const patch = {
      sex: d.sex,
      birthdate: d.birthdate,
      height_cm: Number(d.height_cm),
      weight_kg: Number(d.weight_kg),
      body_fat: d.body_fat === "" ? null : Number(d.body_fat),
      frame: d.frame,
      activity: null,
      lifestyle: d.lifestyle,
      trains,
      train_type: !trains ? null : kinds.size === 1 ? [...kinds][0] : "both",
      train_days: trains ? trainDays : [],
      leg_days: trains ? plan.legDays : [],
      day_plan: trains ? dayPlan : null,
      cardio: trains && hasCardio ? { mode: d.cardio.mode, speed: Number(d.cardio.speed), incline: Number(d.cardio.incline) } : null,
      // La rutina se regenera desde el plan solo si cambiaron los días o los músculos.
      ...(profile.routine && sig(profile.trains ? normalizeDayPlan(profile) : {}) !== sig(trains ? dayPlan : {}) ? { routine: null } : {}),
      session_min: trains ? d.session_min : null,
      intensity: trains ? d.intensity : null,
      goal: d.goal,
      target_mode: d.target_mode,
      deficit,
      bmr: plan.bmr,
      tdee: plan.avgExp,
      target_kcal: plan.target,
      targets: plan.targets,
      burns: plan.burn,
      protein_g: plan.protein,
      plan_version: 2,
      plan_updated_at: new Date().toISOString(),
      onboarded: true,
      ...(!edit && { name: d.name.trim(), avatar: d.avatar, palette: d.palette }),
    };
    if (profile.id !== "demo") {
      const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (error) { setSaving(false); setError("No se pudo guardar. Revisa tu conexión e intenta de nuevo."); return; }
      const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
      await supabase.from("weight_logs").upsert(
        { user_id: profile.id, day, weight_kg: patch.weight_kg },
        { onConflict: "user_id,day" }
      );
    }
    setSaving(false);
    onDone(patch);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.top}>
        <button className="btn-glass" style={{ ...styles.iconBtn, visibility: step > 0 ? "visible" : "hidden" }}
          onClick={() => go(-1)} aria-label="Atrás">
          <ChevronLeft size={22} strokeWidth={1.8} />
        </button>
        <div style={styles.track} aria-hidden="true">
          <motion.div style={styles.bar} animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5, ease }} />
        </div>
        {edit ? (
          <button className="btn-glass" style={styles.iconBtn} onClick={onCancel} aria-label="Cancelar">
            <X size={20} strokeWidth={1.8} />
          </button>
        ) : <span style={{ width: 44 }} />}
      </div>

      <div style={styles.stage}>
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.section
            key={current}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.32, ease }}
            style={styles.section}
          >
            {current === "welcome" && (
              <>
                <Head eyebrow="Bienvenido" title="Primero, ¿cómo te llamamos?" />
                <div className="field">
                  <label htmlFor="ob-name">Nombre</label>
                  <input id="ob-name" value={d.name} maxLength={24} onChange={(e) => set({ name: e.target.value })} />
                </div>
                <p className="eyebrow" style={{ marginTop: "var(--sp-2)" }}>Elige tu avatar</p>
                <div style={styles.avatarGrid}>
                  <PhotoTile userId={profile.id} current={d.avatar} onPhoto={(url) => set({ avatar: url })} style={styles.avatarBtn} />
                  {AVATARS.map((a) => (
                    <motion.button key={a.id} onClick={() => set({ avatar: a.id })} whileTap={{ scale: 0.88 }}
                      animate={{ scale: d.avatar === a.id ? 1.08 : 1 }} aria-label={a.name} aria-pressed={d.avatar === a.id}
                      style={{ ...styles.avatarBtn, boxShadow: d.avatar === a.id ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent)" : "0 0 0 1px var(--hairline)" }}>
                      <img src={avatarSrc(a.id)} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", display: "block" }} />
                    </motion.button>
                  ))}
                </div>
                <p className="eyebrow" style={{ marginTop: "var(--sp-3)" }}>Colores</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-2)" }}>
                  {PALETTES.map((pl) => {
                    const on = d.palette === pl.id;
                    return (
                      <button key={pl.id} aria-pressed={on} onClick={() => { set({ palette: pl.id }); applyPalette(pl.id); }}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 4px", borderRadius: "var(--r-md)", color: "var(--text)",
                          background: "var(--field)", border: `1px solid ${on ? "var(--accent)" : "var(--hairline)"}`, boxShadow: on ? "0 0 0 1px var(--accent)" : "none" }}>
                        <span style={{ ...styles.swatch, background: pl.bg }}><span style={{ ...styles.dot, background: pl.accent }} /></span>
                        <span style={{ fontSize: "var(--t-caption)", fontWeight: 700 }}>{pl.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {false && current === "palette" && (
              <>
                <Head eyebrow="Tu estilo" title="Escoge los colores de tu app" text="Puedes cambiarlos cuando quieras desde tu perfil." />
                {PALETTES.map((p) => (
                  <Option key={p.id} active={d.palette === p.id} title={p.name} text={p.hint}
                    onClick={() => { set({ palette: p.id }); applyPalette(p.id); }}
                    lead={<span style={{ ...styles.swatch, background: p.bg }}><span style={{ ...styles.dot, background: p.accent }} /></span>} />
                ))}
              </>
            )}

            {current === "data" && (
              <>
                <Head eyebrow="Tus datos" title="Cuéntanos de ti" text="Con esto calculamos tu metabolismo. Pésate en ayunas para un dato real." />
                <p className="eyebrow">Sexo biológico</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: "var(--r-pill)", background: "var(--field)", border: "1px solid var(--hairline)" }}>
                  {[{ id: "f", label: "Mujer" }, { id: "m", label: "Hombre" }].map((o) => (
                    <button key={o.id} aria-pressed={d.sex === o.id} onClick={() => set({ sex: o.id })}
                      style={{ ...styles.kindBtn, ...(d.sex === o.id && styles.kindOn) }}>{o.label}</button>
                  ))}
                </div>
                <div className="field">
                  <label htmlFor="ob-birth">Fecha de nacimiento{valid && age ? ` · ${age} años` : ""}</label>
                  <input id="ob-birth" type="date" value={d.birthdate} max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => set({ birthdate: e.target.value })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                  <BigNumber id="ob-h" label="Altura" unit="cm" value={d.height_cm} onChange={(v) => set({ height_cm: v })} />
                  <BigNumber id="ob-w" label="Peso" unit="kg" value={d.weight_kg} step="0.1" onChange={(v) => set({ weight_kg: v })} />
                </div>
                <details style={{ marginTop: "var(--sp-1)" }}>
                  <summary className="caption" style={{ fontWeight: 700, cursor: "pointer", color: "var(--accent)" }}>¿Conoces tu % de grasa? (opcional)</summary>
                  <div style={{ marginTop: "var(--sp-2)" }}>
                    <BigNumber id="ob-bf" label="% de grasa" unit="%" value={d.body_fat} step="0.1" onChange={(v) => set({ body_fat: v })} />
                    <p className="caption" style={{ marginTop: 6 }}>Si lo sabes, el cálculo es más preciso en personas con mucho músculo. Si no, déjalo vacío.</p>
                  </div>
                </details>
              </>
            )}

            {current === "lifestyle" && (
              <>
                <Head eyebrow="Tu día" title="¿Cómo es tu día fuera del gym?" text="Cuenta tu trabajo y lo que caminas, sin contar el entrenamiento." />
                {LIFESTYLES.map((l) => (
                  <Option key={l.id} active={d.lifestyle === l.id} title={l.label} text={l.hint} onClick={() => set({ lifestyle: l.id })} />
                ))}
              </>
            )}

            {current === "trains" && (
              <>
                <Head eyebrow="Tu entrenamiento" title="¿Entrenas?" text="Si entrenas, ajustamos tus calorías según los días y el tipo de entreno." />
                <Option active={d.trains === true} title="Sí, entreno" text="Gimnasio, deporte o cardio con constancia."
                  onClick={() => set({ trains: true })} />
                <Option active={d.trains === false} title="No por ahora" text="Sin rutina de ejercicio regular."
                  onClick={() => set({ trains: false, day_plan: {}, goal: d.goal === "recomp" ? null : d.goal })} />
              </>
            )}

            {current === "days" && (
              <>
                <Head eyebrow="Tu entrenamiento" title="¿Qué días entrenas?" text="Toca los días de tu semana. En el siguiente paso eliges qué haces cada día." />
                <div style={styles.weekRow}>
                  {WEEKDAYS.map((w) => {
                    const on = !!d.day_plan[w.n];
                    return (
                      <motion.button key={w.n} whileTap={{ scale: 0.9 }} aria-pressed={on} aria-label={w.long}
                        onClick={() => set((x) => {
                          const dp = { ...x.day_plan };
                          if (dp[w.n]) delete dp[w.n]; else dp[w.n] = { kind: "weights", muscles: [] };
                          return { day_plan: dp };
                        })}
                        style={{ ...styles.dayBtn, ...(on && styles.dayOn) }}>
                        {w.short}
                      </motion.button>
                    );
                  })}
                </div>
                <p className="muted" style={{ textAlign: "center" }}>
                  {trainDays.length ? `${trainDays.length} ${trainDays.length === 1 ? "día" : "días"} a la semana` : "Elige al menos un día"}
                </p>
              </>
            )}

            {current === "dayplan" && (
              <>
                <Head eyebrow="Tu entrenamiento" title="¿Qué haces cada día?" text="Elige pesas, cardio o ambos, y los músculos que trabajas. La pierna es la que más gasta." />
                {trainDays.map((n) => {
                  const e = d.day_plan[n];
                  const w = WEEKDAYS.find((x) => x.n === n);
                  const key = dayKeyOf(e.kind, e.muscles);
                  return (
                    <div key={n} className="glass" style={styles.dayCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <h2>{w.long}</h2>
                        <span className="caption" style={{ fontWeight: 700 }}>{DAY_KEY_LABELS[key]}</span>
                      </div>
                      <div style={styles.kindRow}>
                        {TRAIN_TYPES.map((t) => {
                          const on = e.kind === t.id;
                          return (
                            <button key={t.id} aria-pressed={on} onClick={() => set((x) => ({ day_plan: { ...x.day_plan, [n]: { ...x.day_plan[n], kind: t.id, muscles: t.id === "cardio" ? [] : x.day_plan[n].muscles } } }))}
                              style={{ ...styles.kindBtn, ...(on && styles.kindOn) }}>{t.label}</button>
                          );
                        })}
                      </div>
                      {e.kind !== "cardio" && (
                        <div style={styles.muscles}>
                          {MUSCLE_ORDER.map((m) => {
                            const on = e.muscles.includes(m);
                            return (
                              <button key={m} aria-pressed={on} onClick={() => set((x) => {
                                const cur = x.day_plan[n].muscles;
                                return { day_plan: { ...x.day_plan, [n]: { ...x.day_plan[n], muscles: cur.includes(m) ? cur.filter((y) => y !== m) : [...cur, m] } } };
                              })} style={{ ...styles.muscle, ...(on && (m === "legs" ? styles.muscleLeg : styles.muscleOn)) }}>
                                {MUSCLE_LABELS[m]}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {e.kind !== "cardio" && e.muscles.length === 0 && <p className="caption">Elige al menos un músculo.</p>}
                    </div>
                  );
                })}
              </>
            )}

            {current === "training" && (
              <>
                <Head eyebrow="Tu entrenamiento" title="Duración, intensidad y cardio" />
                <p className="eyebrow">Duración de cada sesión</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-2)" }}>
                  {SESSION_MINUTES.map((m) => (
                    <button key={m} onClick={() => set({ session_min: m })} aria-pressed={d.session_min === m}
                      style={{ ...styles.chip, ...(d.session_min === m && styles.chipOn) }}>
                      <span className="num" style={{ fontSize: 22, fontWeight: 700 }}>{m}</span>
                      <span style={{ fontSize: "var(--t-caption)" }}>min</span>
                    </button>
                  ))}
                </div>
                <p className="eyebrow" style={{ marginTop: "var(--sp-3)" }}>Intensidad</p>
                <Option active={d.intensity === "moderate"} title="Moderada" text="Terminas cansado, pero con reserva." onClick={() => set({ intensity: "moderate" })} />
                <Option active={d.intensity === "intense"} title="Intensa" text="Llegas cerca del límite en casi todas las series." onClick={() => set({ intensity: "intense" })} />
                {hasCardio && (
                  <>
                <p className="eyebrow" style={{ marginTop: "var(--sp-4)" }}>Cardio en la trotadora</p>
                <p className="caption">La velocidad y la inclinación son lo que más cambia las calorías que gastas.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: "var(--r-pill)", background: "var(--field)", border: "1px solid var(--hairline)" }}>
                  {[{ id: "walk", label: "Caminar" }, { id: "run", label: "Trotar o correr" }].map((m) => {
                    const on = d.cardio.mode === m.id;
                    return (
                      <button key={m.id} aria-pressed={on}
                        onClick={() => set((x) => ({ cardio: { ...x.cardio, mode: m.id, speed: m.id === "walk" ? Math.min(Math.max(x.cardio.speed, 3), 7) : Math.max(x.cardio.speed, 6) } }))}
                        style={{ ...styles.kindBtn, ...(on && styles.kindOn) }}>{m.label}</button>
                    );
                  })}
                </div>
                <NumStepper label="Velocidad promedio" unit="km/h" value={d.cardio.speed} step={0.5}
                  min={d.cardio.mode === "walk" ? 3 : 6} max={d.cardio.mode === "walk" ? 7 : 22}
                  onChange={(v) => set((x) => ({ cardio: { ...x.cardio, speed: v } }))} />
                <NumStepper label="Inclinación" unit="%" value={d.cardio.incline} step={0.5} min={0} max={15}
                  onChange={(v) => set((x) => ({ cardio: { ...x.cardio, incline: v } }))} />
                <div style={styles.note}>
                  <Info size={18} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: "var(--t-small)", lineHeight: 1.5 }}>
                    Para tu peso, una hora así gasta unas <b className="num">{fmt(burnKcal("cardio", "moderate", 60, Number(d.weight_kg) || 70, d.cardio))} kcal</b>.
                    Es una estimación basada en las ecuaciones de la trotadora del Colegio Americano de Medicina del Deporte. Si tu reloj marca otra cifra, podrás anotarla.
                  </p>
                </div>
                  </>
                )}
                <div style={styles.note}>
                  <Info size={18} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: "var(--t-small)", lineHeight: 1.5 }}>
                    Con esto estimamos cuántas calorías gastas en cada entreno y las sumamos a tu meta de comida. Después podrás corregirlo con las calorías de tu reloj o los minutos de cardio: solo se suma la diferencia, no el total.
                  </p>
                </div>
              </>
            )}

            {current === "goal" && (
              <>
                <Head eyebrow="Tu objetivo" title="¿Qué quieres lograr?"
                  text={plan ? `Tu gasto promedio es de ${fmt(plan.avgExp)} kcal al día.` : ""} />
                {GOALS.filter((g) => g.id !== "recomp" || weights).map((g) => {
                  const p = computePlanV2({ ...d, goal: g.id, deficit: g.id === "lose" ? d.deficit : 0 });
                  return (
                    <Option key={g.id} active={d.goal === g.id} title={g.label} text={g.hint} onClick={() => set({ goal: g.id })}
                      trail={p && <span className="num" style={styles.trail}>{fmt(p.target)}<small> kcal</small></span>} />
                  );
                })}

                <AnimatePresence>
                  {d.goal === "lose" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease }} style={{ overflow: "hidden" }}>
                      <p className="eyebrow" style={{ margin: "var(--sp-3) 0 var(--sp-2)" }}>Nivel de déficit en comida</p>
                      <div style={styles.levels}>
                        {DEFICITS.map((lv) => {
                          const p = computePlanV2({ ...d, goal: "lose", deficit: lv.kcal });
                          const active = d.deficit === lv.kcal;
                          return (
                            <button key={lv.kcal} onClick={() => set({ deficit: lv.kcal })} aria-pressed={active}
                              style={{ ...styles.level, ...(active && styles.levelActive) }}>
                              {active && <motion.span layoutId="level-bg" style={styles.levelBg} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                              <span style={{ position: "relative", fontWeight: 700 }}>−{fmt(lv.kcal)}</span>
                              <span style={{ position: "relative", fontSize: "var(--t-caption)" }}>{lv.label}</span>
                              {p && <span className="num" style={{ position: "relative", fontSize: "var(--t-caption)", opacity: 0.85 }}>{fmt(p.target)} kcal</span>}
                              {p?.warnings.length > 0 && <TriangleAlert size={14} strokeWidth={2} style={{ position: "relative", color: active ? "var(--on-accent)" : "var(--danger)" }} />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {plan?.warnings.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={styles.warn}>
                      <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "flex-start" }}>
                        <TriangleAlert size={18} strokeWidth={2} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 2 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                          {plan.warnings.map((w) => <p key={w} style={{ fontSize: "var(--t-small)" }}>{w}</p>)}
                        </div>
                      </div>
                      <label style={styles.ack}>
                        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ accentColor: "var(--accent-strong)", width: 20, height: 20 }} />
                        <span style={{ fontSize: "var(--t-small)", fontWeight: 700 }}>Entiendo el riesgo y quiero este nivel</span>
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {plan?.notes.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={styles.note}>
                      <Info size={18} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                        {plan.notes.map((n) => <p key={n} style={{ fontSize: "var(--t-small)" }}>{n}</p>)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {current === "summary" && plan && (() => {
              const oldTarget = profile.onboarded ? profile.target_kcal : null;
              const diff = oldTarget ? plan.target - oldTarget : 0;
              const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
              const goalLabel = GOALS.find((g) => g.id === d.goal)?.label;
              return (
                <>
                  <Head eyebrow="Tu plan" title={oldTarget ? "Tu nueva meta" : "Esta es tu meta diaria"} />
                  <div className="glass" style={styles.hero}>
                    <motion.span className="num" style={styles.heroNum}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5, ease }}>
                      {fmt(plan.target)}
                    </motion.span>
                    <span className="muted" style={{ fontWeight: 700 }}>
                      kcal al día{plan.trains && d.target_mode === "by_day" ? " en promedio" : ""} · {goalLabel}
                    </span>
                    {oldTarget > 0 && (
                      <span className="num" style={{ fontWeight: 700, fontSize: "var(--t-small)" }}>
                        Antes {fmt(oldTarget)} → Ahora {fmt(plan.target)} ({diff > 0 ? "+" : "−"}{fmt(Math.abs(diff))})
                      </span>
                    )}
                  </div>

                  {plan.trains && d.target_mode === "by_day" && (
                    <div className="glass" style={{ padding: "var(--sp-2) var(--sp-4)" }}>
                      {plan.keys.map((k, i) => (
                        <Row key={k} label={`Día de ${DAY_KEY_LABELS[k].toLowerCase()}`} value={`${fmt(plan.targets[k])} kcal`} last={i === plan.keys.length - 1} />
                      ))}
                    </div>
                  )}

                  <div className="glass" style={{ padding: "var(--sp-2) var(--sp-4)" }}>
                    <Row label="Metabolismo basal" value={`${fmt(plan.bmr)} kcal`} />
                    <Row label="Tu día fuera del gym" value={`${fmt(plan.base)} kcal`} />
                    <Row label="Gasto promedio con entreno" value={`${fmt(plan.avgExp)} kcal`} strong />
                    {plan.adjustment !== 0 && <Row label={d.goal === "recomp" ? "Ajuste de recomposición" : plan.adjustment < 0 ? "Déficit" : "Superávit"} value={`${plan.adjustment < 0 ? "−" : "+"}${fmt(Math.abs(plan.adjustment))} kcal`} />}
                    <Row label="Proteína diaria" value={`${fmt(plan.protein)} g`} />
                    <Row label="Cambio estimado" value={plan.weeklyKg === 0 ? "Peso estable" : `${plan.weeklyKg > 0 ? "+" : "−"}${Math.abs(plan.weeklyKg).toLocaleString("es-CO")} kg por semana`} last />
                  </div>

                  <p className="caption" style={{ lineHeight: 1.5 }}>
                    Es una estimación basada en fórmulas científicas (Mifflin-St Jeor y Compendio de Actividad Física 2024), no una medición. Tu cuerpo puede variar: revisa tu peso cada 2 o 3 semanas y ajusta.
                  </p>
                  {oldTarget > 0 && (
                    <p className="caption">
                      Antes usábamos un solo factor de actividad para todo el día. Ahora separamos tu vida diaria del entrenamiento, que es más preciso y suele dar una meta más ajustada a lo que de verdad gastas.
                    </p>
                  )}
                  {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
                </>
              );
            })()}
          </motion.section>
        </AnimatePresence>
      </div>

      <div style={styles.bottom}>
        {current === "summary" ? (
          <button className="btn btn-primary btn-block" disabled={saving || !valid} onClick={finish}>
            {saving ? "Guardando…" : edit ? "Confirmar mi meta" : "Empezar"}
          </button>
        ) : (
          <button className="btn btn-primary btn-block" disabled={!valid} onClick={() => go(1)}>Continuar</button>
        )}
      </div>
    </div>
  );
}

// Número con − y + (velocidad, inclinación).
function NumStepper({ label, unit, value, onChange, step, min, max }) {
  const set = (v) => onChange(Math.min(max, Math.max(min, Math.round(v * 10) / 10)));
  return (
    <div className="glass" style={{ padding: "var(--sp-3) var(--sp-4)", borderRadius: "var(--r-md)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
      <p className="eyebrow">{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
        <button style={{ width: 52, height: 52, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--field)", border: "1px solid var(--hairline)", color: "var(--text)", fontSize: 24, fontWeight: 700 }}
          onClick={() => set(value - step)} aria-label={`Menos ${label.toLowerCase()}`}>−</button>
        <span style={{ flex: 1, textAlign: "center" }}>
          <span className="num" style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em" }}>{Number(value).toLocaleString("es-CO", { maximumFractionDigits: 1 })}</span>
          <span className="muted" style={{ fontWeight: 700 }}> {unit}</span>
        </span>
        <button style={{ width: 52, height: 52, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--field)", border: "1px solid var(--hairline)", color: "var(--text)", fontSize: 24, fontWeight: 700 }}
          onClick={() => set(value + step)} aria-label={`Más ${label.toLowerCase()}`}>+</button>
      </div>
    </div>
  );
}

function Head({ eyebrow, title, text }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", marginBottom: "var(--sp-3)" }}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 style={{ fontSize: 30 }}>{title}</h1>
      {text && <p className="muted">{text}</p>}
    </div>
  );
}

function Option({ active, title, text, onClick, lead, trail }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.98 }} aria-pressed={active}
      className="glass" style={{ ...styles.option, ...(active && styles.optionActive) }}>
      {lead}
      <span style={{ flex: 1, textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontWeight: 700, fontSize: 17 }}>{title}</span>
        {text && <span className="muted" style={{ fontSize: "var(--t-small)" }}>{text}</span>}
      </span>
      {trail}
      <span style={{ ...styles.radio, ...(active && styles.radioOn) }}>
        {active && <Check size={14} strokeWidth={3} />}
      </span>
    </motion.button>
  );
}

function BigNumber({ id, label, unit, value, onChange, step = "1" }) {
  return (
    <label htmlFor={id} className="glass" style={styles.bigNum}>
      <span className="eyebrow">{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <input id={id} type="number" inputMode="decimal" step={step} value={value} placeholder="0"
          onChange={(e) => onChange(e.target.value)} style={styles.bigInput} />
        <span className="muted" style={{ fontWeight: 700 }}>{unit}</span>
      </span>
    </label>
  );
}

function Row({ label, value, strong, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--sp-3)", padding: "14px 0", borderBottom: last ? "none" : "1px solid var(--hairline)" }}>
      <span className={strong ? "" : "muted"} style={{ fontWeight: strong ? 700 : 400 }}>{label}</span>
      <span className="num" style={{ fontWeight: 700, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const styles = {
  wrap: {
    position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto", minHeight: "100dvh",
    display: "flex", flexDirection: "column",
    padding: "calc(var(--safe-top) + 12px) 20px calc(var(--safe-bottom) + 20px)",
  },
  top: { display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-5)" },
  iconBtn: { width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", color: "var(--text)", border: "1px solid var(--glass-border)" },
  track: { flex: 1, height: 6, borderRadius: 99, background: "var(--hairline)", overflow: "hidden" },
  bar: { height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--accent), var(--accent-strong))" },
  stage: { flex: 1, position: "relative" },
  section: { display: "flex", flexDirection: "column", gap: "var(--sp-3)" },
  bottom: { paddingTop: "var(--sp-4)" },
  option: {
    display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "16px 18px", borderRadius: "var(--r-md)",
    minHeight: 68, color: "var(--text)", transition: "border-color 200ms, background 200ms",
  },
  optionActive: {
    borderColor: "color-mix(in srgb, var(--accent) 60%, transparent)",
    background: "color-mix(in srgb, var(--accent) 12%, var(--glass))",
  },
  radio: {
    width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
    border: "1.5px solid var(--text-2)", color: "var(--on-accent)", transition: "all 200ms",
  },
  radioOn: { background: "var(--accent-strong)", borderColor: "var(--accent-strong)" },
  trail: { fontWeight: 700, whiteSpace: "nowrap" },
  swatch: { width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", border: "1px solid var(--hairline)", flexShrink: 0 },
  dot: { width: 16, height: 16, borderRadius: "50%" },
  avatarGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-4)" },
  avatarBtn: { aspectRatio: "1", borderRadius: "50%", padding: 0 },
  bigNum: { display: "flex", flexDirection: "column", gap: "var(--sp-2)", padding: "var(--sp-4)", borderRadius: "var(--r-md)", cursor: "text" },
  bigInput: {
    width: "100%", minWidth: 0, background: "none", border: "none", outline: "none",
    fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text)", fontVariantNumeric: "tabular-nums",
  },
  weekRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "var(--sp-2)", margin: "var(--sp-3) 0" },
  dayBtn: {
    aspectRatio: "1", borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 17,
    background: "var(--field)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--hairline)", color: "var(--text)",
  },
  dayOn: { background: "linear-gradient(180deg, var(--accent), var(--accent-strong))", borderColor: "transparent", color: "var(--on-accent)" },
  legOn: { background: "linear-gradient(180deg, #3ddc84, #1b8a4c)", borderColor: "transparent", color: "#ffffff" },
  dayOff: { opacity: 0.35 },
  dayCard: { padding: "var(--sp-4)", borderRadius: "var(--r-md)", display: "flex", flexDirection: "column", gap: "var(--sp-3)" },
  kindRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, padding: 4, borderRadius: "var(--r-pill)", background: "var(--field)", border: "1px solid var(--hairline)" },
  kindBtn: { minHeight: 40, borderRadius: "var(--r-pill)", fontWeight: 700, fontSize: "var(--t-small)", color: "var(--text)" },
  kindOn: { background: "linear-gradient(180deg, var(--accent), var(--accent-strong))", color: "var(--on-accent)" },
  muscles: { display: "flex", flexWrap: "wrap", gap: 6 },
  muscle: { padding: "8px 14px", borderRadius: 99, fontWeight: 700, fontSize: "var(--t-small)", color: "var(--text)", background: "var(--field)", border: "1px solid var(--hairline)" },
  muscleOn: { background: "color-mix(in srgb, var(--accent) 22%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)" },
  muscleLeg: { background: "color-mix(in srgb, #3ddc84 25%, transparent)", borderColor: "color-mix(in srgb, #3ddc84 60%, transparent)" },
  chip: {
    display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", borderRadius: "var(--r-md)",
    background: "var(--field)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--hairline)", color: "var(--text)",
  },
  chipOn: { background: "linear-gradient(180deg, var(--accent), var(--accent-strong))", borderColor: "transparent", color: "var(--on-accent)" },
  levels: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-2)" },
  level: {
    position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    padding: "14px 6px", borderRadius: "var(--r-md)", background: "var(--field)",
    borderWidth: 1, borderStyle: "solid", borderColor: "var(--hairline)",
    color: "var(--text)", overflow: "hidden",
  },
  levelActive: { color: "var(--on-accent)", borderColor: "transparent" },
  levelBg: { position: "absolute", inset: 0, background: "linear-gradient(180deg, var(--accent), var(--accent-strong))" },
  warn: {
    marginTop: "var(--sp-3)", padding: "var(--sp-4)", borderRadius: "var(--r-md)", display: "flex", flexDirection: "column", gap: "var(--sp-3)",
    background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 35%, transparent)",
  },
  note: {
    marginTop: "var(--sp-3)", padding: "var(--sp-4)", borderRadius: "var(--r-md)", display: "flex", gap: "var(--sp-2)", alignItems: "flex-start",
    background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
  },
  ack: { display: "flex", alignItems: "center", gap: "var(--sp-2)", cursor: "pointer" },
  hero: { padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--sp-1)" },
  heroNum: { fontSize: 64, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--accent)" },
};
