import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, Check, Info, TriangleAlert, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { AVATARS, avatarSrc } from "../lib/avatars";
import PhotoTile from "../components/PhotoTile";
import { PALETTES, applyPalette } from "../lib/palettes";
import {
  DEFICITS, FRAMES, GOALS, LIFESTYLES, SESSION_MINUTES, TRAIN_TYPES, WEEKDAYS,
  ageFrom, computePlanV2, fmt,
} from "../lib/plan";

const ease = [0.16, 1, 0.3, 1];

// edit = true: solo los pasos del plan (desde Perfil u Hoy), con opción de cancelar.
export default function Onboarding({ profile, edit = false, onDone, onCancel }) {
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
    trains: v2 ? profile.trains : null,
    train_type: v2 ? profile.train_type : null,
    train_days: v2 ? profile.train_days || [] : [],
    leg_days: v2 ? profile.leg_days || [] : [],
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
  const weights = d.trains && d.train_type !== "cardio";

  const steps = [
    !edit && "welcome",
    !edit && "palette",
    "sex", "birthdate", "body", "frame", "lifestyle", "trains",
    d.trains && "ttype",
    d.trains && "days",
    weights && d.train_days.length > 0 && "legs",
    d.trains && "session",
    d.trains && "mode",
    "goal", "summary",
  ].filter(Boolean);
  const current = steps[step];

  const age = ageFrom(d.birthdate);
  const valid = {
    welcome: d.name.trim().length > 0,
    palette: true,
    sex: !!d.sex,
    birthdate: age >= 14 && age <= 100,
    body: Number(d.height_cm) >= 120 && Number(d.height_cm) <= 230 && Number(d.weight_kg) >= 30 && Number(d.weight_kg) <= 300,
    frame: !!d.frame,
    lifestyle: !!d.lifestyle,
    trains: d.trains !== null,
    ttype: !!d.train_type,
    days: d.train_days.length > 0,
    legs: true,
    session: true,
    mode: true,
    goal: !!d.goal && (!plan?.warnings.length || ack),
    summary: !!plan,
  }[current];

  const go = (delta) => { setDir(delta); setStep((s) => Math.max(0, Math.min(steps.length - 1, s + delta))); };

  const finish = async () => {
    setSaving(true);
    setError("");
    const trains = !!d.trains && d.train_days.length > 0;
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
      train_type: trains ? d.train_type : null,
      train_days: trains ? d.train_days : [],
      leg_days: trains && weights ? plan.legDays : [],
      session_min: trains ? d.session_min : null,
      intensity: trains ? d.intensity : null,
      goal: d.goal,
      target_mode: d.target_mode,
      deficit,
      bmr: plan.bmr,
      tdee: plan.avgExp,
      target_kcal: plan.target,
      targets: plan.targets,
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
              </>
            )}

            {current === "palette" && (
              <>
                <Head eyebrow="Tu estilo" title="Escoge los colores de tu app" text="Puedes cambiarlos cuando quieras desde tu perfil." />
                {PALETTES.map((p) => (
                  <Option key={p.id} active={d.palette === p.id} title={p.name} text={p.hint}
                    onClick={() => { set({ palette: p.id }); applyPalette(p.id); }}
                    lead={<span style={{ ...styles.swatch, background: p.bg }}><span style={{ ...styles.dot, background: p.accent }} /></span>} />
                ))}
              </>
            )}

            {current === "sex" && (
              <>
                <Head eyebrow="Tu cuerpo" title="¿Cuál es tu sexo biológico?" text="Cambia la fórmula de tu metabolismo basal." />
                <Option active={d.sex === "f"} title="Mujer" onClick={() => set({ sex: "f" })} />
                <Option active={d.sex === "m"} title="Hombre" onClick={() => set({ sex: "m" })} />
              </>
            )}

            {current === "birthdate" && (
              <>
                <Head eyebrow="Tu cuerpo" title="¿Cuándo naciste?" text="Tu edad se actualiza sola cada año." />
                <div className="field">
                  <label htmlFor="ob-birth">Fecha de nacimiento</label>
                  <input id="ob-birth" type="date" value={d.birthdate} max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => set({ birthdate: e.target.value })} />
                </div>
                {valid && <p className="muted">{age} años</p>}
              </>
            )}

            {current === "body" && (
              <>
                <Head eyebrow="Tu cuerpo" title="Altura y peso actual" text="Pésate en ayunas para un dato real." />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                  <BigNumber id="ob-h" label="Altura" unit="cm" value={d.height_cm} onChange={(v) => set({ height_cm: v })} />
                  <BigNumber id="ob-w" label="Peso" unit="kg" value={d.weight_kg} step="0.1" onChange={(v) => set({ weight_kg: v })} />
                </div>
                <BigNumber id="ob-bf" label="% de grasa (opcional)" unit="%" value={d.body_fat} step="0.1" onChange={(v) => set({ body_fat: v })} />
                <p className="caption">Si no lo sabes, déjalo vacío. Con este dato el cálculo es más preciso en personas con mucho músculo.</p>
              </>
            )}

            {current === "frame" && (
              <>
                <Head eyebrow="Tu cuerpo" title="¿Cuál es tu contextura?" text="Ajusta levemente tu metabolismo basal." />
                {FRAMES.map((f) => (
                  <Option key={f.id} active={d.frame === f.id} title={f.label} text={f.hint} onClick={() => set({ frame: f.id })} />
                ))}
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
                  onClick={() => set({ trains: true, train_type: d.train_type || "weights" })} />
                <Option active={d.trains === false} title="No por ahora" text="Sin rutina de ejercicio regular."
                  onClick={() => set({ trains: false, goal: d.goal === "recomp" ? null : d.goal })} />
              </>
            )}

            {current === "ttype" && (
              <>
                <Head eyebrow="Tu entrenamiento" title="¿Qué haces?" />
                {TRAIN_TYPES.map((t) => (
                  <Option key={t.id} active={d.train_type === t.id} title={t.label}
                    onClick={() => set({ train_type: t.id, leg_days: t.id === "cardio" ? [] : d.leg_days, goal: t.id === "cardio" && d.goal === "recomp" ? null : d.goal })} />
                ))}
              </>
            )}

            {current === "days" && (
              <>
                <Head eyebrow="Tu entrenamiento" title="¿Qué días entrenas?" text="Toca los días de tu semana." />
                <div style={styles.weekRow}>
                  {WEEKDAYS.map((w) => {
                    const on = d.train_days.includes(w.n);
                    return (
                      <motion.button key={w.n} whileTap={{ scale: 0.9 }} aria-pressed={on} aria-label={w.long}
                        onClick={() => set((x) => {
                          const has = x.train_days.includes(w.n);
                          return {
                            train_days: has ? x.train_days.filter((n) => n !== w.n) : [...x.train_days, w.n].sort(),
                            leg_days: has ? x.leg_days.filter((n) => n !== w.n) : x.leg_days,
                          };
                        })}
                        style={{ ...styles.dayBtn, ...(on && styles.dayOn) }}>
                        {w.short}
                      </motion.button>
                    );
                  })}
                </div>
                <p className="muted" style={{ textAlign: "center" }}>
                  {d.train_days.length ? `${d.train_days.length} ${d.train_days.length === 1 ? "día" : "días"} a la semana` : "Elige al menos un día"}
                </p>
              </>
            )}

            {current === "legs" && (
              <>
                <Head eyebrow="Tu entrenamiento" title="¿Cuáles son de pierna?" text="La pierna gasta más y pide más carbohidratos. Toca los días en que la entrenas, o ninguno." />
                <div style={styles.weekRow}>
                  {WEEKDAYS.map((w) => {
                    const trains = d.train_days.includes(w.n);
                    const on = d.leg_days.includes(w.n);
                    return (
                      <motion.button key={w.n} whileTap={{ scale: 0.9 }} disabled={!trains} aria-pressed={on} aria-label={w.long}
                        onClick={() => set((x) => ({ leg_days: x.leg_days.includes(w.n) ? x.leg_days.filter((n) => n !== w.n) : [...x.leg_days, w.n].sort() }))}
                        style={{ ...styles.dayBtn, ...(!trains && styles.dayOff), ...(on && styles.legOn) }}>
                        {w.short}
                      </motion.button>
                    );
                  })}
                </div>
                <p className="muted" style={{ textAlign: "center" }}>
                  {d.leg_days.length ? `${d.leg_days.length} ${d.leg_days.length === 1 ? "día" : "días"} de pierna` : "Ningún día de pierna"}
                </p>
              </>
            )}

            {current === "session" && (
              <>
                <Head eyebrow="Tu entrenamiento" title="¿Cuánto dura y qué tan duro?" />
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
              </>
            )}

            {current === "mode" && (
              <>
                <Head eyebrow="Tu meta diaria" title="¿Cómo quieres tu meta?" text="Con la misma cantidad total de la semana, solo cambia cómo se reparte." />
                <Option active={d.target_mode === "by_day"} title="Según el día (recomendado)"
                  text="Más calorías los días de entreno y pierna, menos en descanso."
                  onClick={() => set({ target_mode: "by_day" })} />
                <Option active={d.target_mode === "fixed"} title="La misma todos los días"
                  text="Una sola meta, sin cambiar nada cada día." onClick={() => set({ target_mode: "fixed" })} />
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
                      <Row label="Día de descanso" value={`${fmt(plan.targets.rest)} kcal`} />
                      {plan.plainDays.length > 0 && <Row label="Día de entreno" value={`${fmt(plan.targets.train)} kcal`} />}
                      {plan.legDays.length > 0 && <Row label="Día de pierna" value={`${fmt(plan.targets.leg)} kcal`} last />}
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
