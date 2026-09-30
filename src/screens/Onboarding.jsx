import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, Check, TriangleAlert, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { AVATARS, avatarSrc } from "../lib/avatars";
import { PALETTES, applyPalette } from "../lib/palettes";
import { ACTIVITIES, DEFICITS, FRAMES, ageFrom, computePlan, fmt } from "../lib/plan";

const ease = [0.16, 1, 0.3, 1];

// edit = true: solo los pasos del plan (desde Perfil u Hoy), con opción de cancelar.
export default function Onboarding({ profile, edit = false, onDone, onCancel }) {
  const [d, setD] = useState({
    name: profile.name || "",
    avatar: profile.avatar || "a1",
    palette: profile.palette || "noche-azul",
    sex: profile.sex || null,
    birthdate: profile.birthdate || "",
    height_cm: profile.height_cm ?? "",
    weight_kg: profile.weight_kg ?? "",
    frame: profile.frame || null,
    activity: profile.activity || null,
    goal: profile.deficit > 0 ? "deficit" : profile.deficit === 0 ? "maintain" : null,
    deficit: profile.deficit > 0 ? profile.deficit : 600,
  });
  const [ack, setAck] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (patch) => { setD((x) => ({ ...x, ...patch })); setAck(false); };
  const deficit = d.goal === "deficit" ? d.deficit : 0;
  const plan = useMemo(() => computePlan({ ...d, deficit }), [d, deficit]);

  const steps = [
    !edit && "welcome",
    !edit && "palette",
    "sex", "birthdate", "body", "frame", "activity", "goal", "summary",
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
    activity: !!d.activity,
    goal: !!d.goal && (!plan?.warnings.length || ack),
    summary: !!plan,
  }[current];

  const go = (delta) => { setDir(delta); setStep((s) => Math.max(0, Math.min(steps.length - 1, s + delta))); };

  const finish = async () => {
    setSaving(true);
    setError("");
    const patch = {
      sex: d.sex,
      birthdate: d.birthdate,
      height_cm: Number(d.height_cm),
      weight_kg: Number(d.weight_kg),
      frame: d.frame,
      activity: d.activity,
      deficit,
      bmr: plan.bmr,
      tdee: plan.tdee,
      target_kcal: plan.target,
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
                <Head eyebrow="Tu cuerpo · 1 de 5" title="¿Cuál es tu sexo biológico?" text="Cambia la fórmula de tu metabolismo basal." />
                <Option active={d.sex === "f"} title="Mujer" onClick={() => set({ sex: "f" })} />
                <Option active={d.sex === "m"} title="Hombre" onClick={() => set({ sex: "m" })} />
              </>
            )}

            {current === "birthdate" && (
              <>
                <Head eyebrow="Tu cuerpo · 2 de 5" title="¿Cuándo naciste?" text="Tu edad se actualiza sola cada año." />
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
                <Head eyebrow="Tu cuerpo · 3 de 5" title="Altura y peso actual" text="Pésate en ayunas para un dato real." />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                  <BigNumber id="ob-h" label="Altura" unit="cm" value={d.height_cm} onChange={(v) => set({ height_cm: v })} />
                  <BigNumber id="ob-w" label="Peso" unit="kg" value={d.weight_kg} step="0.1" onChange={(v) => set({ weight_kg: v })} />
                </div>
              </>
            )}

            {current === "frame" && (
              <>
                <Head eyebrow="Tu cuerpo · 4 de 5" title="¿Cuál es tu contextura?" text="Ajusta levemente tu metabolismo basal." />
                {FRAMES.map((f) => (
                  <Option key={f.id} active={d.frame === f.id} title={f.label} text={f.hint} onClick={() => set({ frame: f.id })} />
                ))}
              </>
            )}

            {current === "activity" && (
              <>
                <Head eyebrow="Tu cuerpo · 5 de 5" title="¿Qué tanto entrenas?" text="Define cuántas calorías quemas entrenando." />
                {ACTIVITIES.map((a) => {
                  const p = computePlan({ ...d, activity: a.id, deficit: 0 });
                  return (
                    <Option key={a.id} active={d.activity === a.id} title={a.label} text={a.hint} onClick={() => set({ activity: a.id })}
                      trail={p?.training > 0 && <span className="num" style={styles.trail}>+{fmt(p.training)}<small> kcal</small></span>} />
                  );
                })}
              </>
            )}

            {current === "goal" && (
              <>
                <Head eyebrow="Tu objetivo" title="¿Qué quieres lograr?" text={plan ? `Tu gasto diario es de ${fmt(plan.tdee)} kcal.` : ""} />
                <Option active={d.goal === "maintain"} title="Mantenerme" text="Comer lo mismo que gasto."
                  onClick={() => set({ goal: "maintain" })}
                  trail={plan && <span className="num" style={styles.trail}>{fmt(plan.tdee)}<small> kcal</small></span>} />
                <Option active={d.goal === "deficit"} title="Bajar de peso" text="Comer menos de lo que gasto."
                  onClick={() => set({ goal: "deficit" })} />

                <AnimatePresence>
                  {d.goal === "deficit" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease }} style={{ overflow: "hidden" }}>
                      <p className="eyebrow" style={{ margin: "var(--sp-3) 0 var(--sp-2)" }}>Nivel de déficit en comida</p>
                      <div style={styles.levels}>
                        {DEFICITS.map((lv) => {
                          const p = computePlan({ ...d, deficit: lv.kcal });
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {current === "summary" && plan && (
              <>
                <Head eyebrow="Tu plan" title="Esta es tu meta diaria" />
                <div className="glass" style={styles.hero}>
                  <motion.span className="num" style={styles.heroNum}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5, ease }}>
                    {fmt(plan.target)}
                  </motion.span>
                  <span className="muted" style={{ fontWeight: 700 }}>kcal para comer al día</span>
                </div>
                <div className="glass" style={{ padding: "var(--sp-2) var(--sp-4)" }}>
                  <Row label="Metabolismo basal" value={`${fmt(plan.bmr)} kcal`} />
                  <Row label="Quemas entrenando" value={plan.training > 0 ? `+${fmt(plan.training)} kcal` : "Sin entrenamiento"} />
                  <Row label="Gasto total diario" value={`${fmt(plan.tdee)} kcal`} strong />
                  {deficit > 0 && <Row label="Déficit en comida" value={`−${fmt(deficit)} kcal`} />}
                  {deficit > 0 && <Row label="Cambio estimado" value={`−${plan.weeklyKg.toLocaleString("es-CO")} kg por semana`} last />}
                  {deficit === 0 && <Row label="Objetivo" value="Mantener tu peso" last />}
                </div>
                {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      <div style={styles.bottom}>
        {current === "summary" ? (
          <button className="btn btn-primary btn-block" disabled={saving || !valid} onClick={finish}>
            {saving ? "Guardando…" : edit ? "Guardar plan" : "Empezar"}
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
  ack: { display: "flex", alignItems: "center", gap: "var(--sp-2)", cursor: "pointer" },
  hero: { padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--sp-1)" },
  heroNum: { fontSize: 64, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--accent)" },
};
