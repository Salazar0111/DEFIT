import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Check, ChevronDown, Eye, Lock, LogOut, ShieldCheck, SlidersHorizontal } from "lucide-react";
import MethodExplainer from "../components/MethodExplainer";
import UsernamePrompt from "../components/UsernamePrompt";
import AdminPanel from "../components/AdminPanel";
import { GOALS, computePlanV2, fmt } from "../lib/plan";
import { createPortal } from "react-dom";
import Sheet from "../components/Sheet";
import { supabase } from "../lib/supabase";
import { AVATARS, avatarSrc } from "../lib/avatars";
import { PALETTES } from "../lib/palettes";
import Reminders from "../components/Reminders";
import PhotoTile from "../components/PhotoTile";
import FeedbackSettings from "../components/FeedbackSettings";
import { PersonStats, PersonSheetContent } from "../components/PersonCard";
import PasskeySettings from "../components/PasskeySettings";

export default function ProfileScreen({ profile, ch, onChange, onEditPlan, planLocked, onReplayTour }) {
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [settings, setSettings] = useState(false);
  const [method, setMethod] = useState(false);
  const [editUser, setEditUser] = useState(false);
  const [admin, setAdmin] = useState(false);       // ¿es administrador?
  const [adminOpen, setAdminOpen] = useState(false);
  useEffect(() => {
    if (profile.id === "demo") { setAdmin(true); return; }
    supabase.rpc("is_admin").then(({ data }) => setAdmin(!!data));
  }, [profile.id]);
  const [planError, setPlanError] = useState("");

  const save = async (patch) => {
    onChange(patch); // optimista: la UI cambia al instante
    if (profile.id === "demo") return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    setSaving(false);
    if (error) onChange({ avatar: profile.avatar, palette: profile.palette });
  };

  const v2 = (profile.plan_version || 1) >= 2;
  const goalLabel = GOALS.find((g) => g.id === profile.goal)?.label || (profile.deficit > 0 ? "Bajar peso" : "Mantener");
  const byDay = profile.target_mode !== "fixed";
  const toggleMode = async () => {
    setPlanError("");
    const mode = byDay ? "fixed" : "by_day";
    const plan = computePlanV2({ ...profile, target_mode: mode, deficit: profile.deficit || 0 });
    if (!plan) return;
    const patch = { target_mode: mode, targets: plan.targets, target_kcal: plan.target, burns: plan.burn };
    if (profile.id !== "demo") {
      const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (error) { setPlanError(error.message.includes("PLAN_LOCKED") ? "No puedes cambiarlo durante un reto." : "No se pudo guardar. Intenta de nuevo."); return; }
    }
    onChange(patch);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      {ch && (
        <section className="glass" style={styles.section}>
          <div style={styles.head}>
            <h2>Tus logros</h2>
            <button className="btn btn-glass" style={{ minHeight: 36, padding: "0 14px", fontSize: "var(--t-caption)" }} onClick={() => setPreview(true)}>
              <Eye size={15} strokeWidth={2} /> Cómo me ven
            </button>
          </div>
          <PersonStats uid={profile.id} ch={ch} />
        </section>
      )}

      <section className="glass" style={{ ...styles.section, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "var(--sp-3)" }}>
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">Tu usuario</p>
          <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.username ? `@${profile.username}` : "Sin elegir"}</p>
        </div>
        <button className="btn btn-glass" style={{ minHeight: 36, padding: "0 14px", fontSize: "var(--t-caption)" }} onClick={() => setEditUser(true)}>
          {profile.username ? "Cambiar" : "Elegir"}
        </button>
      </section>

      <section className="glass" style={styles.section}>
        <div style={styles.head}>
          <h2>Tu avatar</h2>
          <span className="caption">{saving ? "Guardando…" : ""}</span>
        </div>
        <div style={styles.avatarGrid}>
          <PhotoTile userId={profile.id} current={profile.avatar} onPhoto={(url) => save({ avatar: url })} style={styles.avatarBtn} />
          {AVATARS.map((a) => {
            const active = a.id === profile.avatar;
            return (
              <motion.button
                key={a.id}
                onClick={() => save({ avatar: a.id })}
                whileTap={{ scale: 0.88 }}
                animate={{ scale: active ? 1.06 : 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
                aria-label={a.name}
                aria-pressed={active}
                style={{
                  ...styles.avatarBtn,
                  boxShadow: active
                    ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent)"
                    : "0 0 0 1px var(--hairline)",
                }}
              >
                <img src={avatarSrc(a.id)} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", display: "block" }} />
              </motion.button>
            );
          })}
        </div>
      </section>

      <section className="glass" style={styles.section}>
        <div style={styles.head}>
          <h2>Tu plan</h2>
          <button className="btn btn-glass" style={{ minHeight: 36, padding: "0 14px", fontSize: "var(--t-caption)" }} onClick={onEditPlan}>
            {planLocked ? <Lock size={15} strokeWidth={1.8} /> : <SlidersHorizontal size={15} strokeWidth={1.8} />} {planLocked ? "Fijo en reto" : "Ajustar"}
          </button>
        </div>
        <div>
          <PlanRow label="Objetivo" value={goalLabel} />
          <PlanRow label="Meta promedio" value={`${fmt(profile.target_kcal || 0)} kcal`} />
          <PlanRow label="Gasto promedio" value={`${fmt(profile.tdee || 0)} kcal`} />
          {profile.protein_g > 0 && <PlanRow label="Proteína diaria" value={`${fmt(profile.protein_g)} g`} />}
          <PlanRow label="Peso de partida" value={`${Number(profile.weight_kg).toLocaleString("es-CO")} kg`} last />
        </div>
        {v2 && (
          <button className="btn btn-text" style={{ minHeight: 36, fontSize: "var(--t-caption)", color: "var(--accent)", alignSelf: "flex-start", padding: 0 }} onClick={() => onEditPlan("days")}>
            Cambiar mis días de entreno
          </button>
        )}
        <button className="btn btn-text" style={{ minHeight: 36, fontSize: "var(--t-caption)", color: "var(--accent)", alignSelf: "flex-start", padding: 0 }} onClick={() => setMethod(true)}>
          Cómo se estiman tus calorías
        </button>
      </section>

      <section className="glass" style={{ padding: 0, overflow: "hidden" }}>
        <button onClick={() => setSettings((o) => !o)} aria-expanded={settings}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "var(--sp-4) var(--sp-5)", color: "var(--text)" }}>
          <span style={{ fontSize: "var(--t-h2)", fontWeight: 700, letterSpacing: "-0.02em" }}>Ajustes</span>
          <motion.span animate={{ rotate: settings ? 180 : 0 }} style={{ display: "grid" }}><ChevronDown size={22} strokeWidth={1.8} /></motion.span>
        </button>
        <AnimatePresence initial={false}>
          {settings && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }}
              style={{ overflow: "hidden" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", padding: "0 var(--sp-3) var(--sp-4)" }}>
                <div className="glass" style={styles.section}>
                  <h2>Colores</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
                    {PALETTES.map((p) => {
                      const active = p.id === profile.palette;
                      return (
                        <button key={p.id} onClick={() => save({ palette: p.id })} style={styles.paletteRow} aria-pressed={active}>
                          <span style={{ ...styles.swatch, background: p.bg }}><span style={{ ...styles.swatchDot, background: p.accent }} /></span>
                          <span style={{ flex: 1, textAlign: "left" }}>
                            <span style={{ display: "block", fontWeight: 700 }}>{p.name}</span>
                            <span className="caption">{p.hint}</span>
                          </span>
                          {active && (<motion.span layoutId="palette-check" style={styles.check}><Check size={16} strokeWidth={2.4} /></motion.span>)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {v2 && profile.trains && (
                  <div className="glass" style={{ ...styles.section, gap: "var(--sp-2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700 }}>Meta distinta cada día</p>
                        <p className="caption">Más calorías los días de entreno y menos en descanso, con el mismo total semanal.</p>
                      </div>
                      <button role="switch" aria-checked={byDay} aria-label="Meta distinta cada día" onClick={toggleMode}
                        style={{ width: 52, height: 30, borderRadius: 99, padding: 3, display: "flex", justifyContent: byDay ? "flex-end" : "flex-start", flexShrink: 0,
                          background: byDay ? "linear-gradient(180deg, var(--accent), var(--accent-strong))" : "var(--hairline)", border: "1px solid var(--glass-border)", transition: "background 250ms" }}>
                        <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 34 }} style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,.25)" }} />
                      </button>
                    </div>
                    {planError && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{planError}</p>}
                  </div>
                )}

                <Reminders profile={profile} onChange={onChange} />
                <FeedbackSettings />
                <PasskeySettings profile={profile} />

                {onReplayTour && (
                  <button className="btn btn-glass btn-block" onClick={onReplayTour}>
                    <BookOpen size={18} strokeWidth={1.8} /> Ver tutorial
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {admin && (
        <button className="btn btn-glass btn-block" onClick={() => setAdminOpen(true)}>
          <ShieldCheck size={18} strokeWidth={1.8} /> Panel de administración
        </button>
      )}

      {createPortal(
        <Sheet open={adminOpen} onClose={() => setAdminOpen(false)} title="Administración">
          {adminOpen && <AdminPanel demo={profile.id === "demo"} />}
        </Sheet>,
        document.body
      )}

      {createPortal(
        <UsernamePrompt key={profile.username || "new"} profile={profile} open={editUser} onClose={() => setEditUser(false)}
          onSaved={(username) => { onChange({ username }); setEditUser(false); }} />,
        document.body
      )}

      {createPortal(
        <Sheet open={method} onClose={() => setMethod(false)} title="Cómo estimamos tus calorías">
          {method && <MethodExplainer />}
        </Sheet>,
        document.body
      )}

      {ch && createPortal(
        <Sheet open={preview} onClose={() => setPreview(false)} title="Tu perfil público">
          {preview && <PersonSheetContent person={profile} ch={ch} me={profile.id} preview />}
        </Sheet>,
        document.body
      )}

      <button className="btn btn-glass btn-block" onClick={() => supabase.auth.signOut()}>
        <LogOut size={18} strokeWidth={1.8} /> Cerrar sesión
      </button>
    </div>
  );
}

function PlanRow({ label, value, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--sp-3)", padding: "11px 0", borderBottom: last ? "none" : "1px solid var(--hairline)" }}>
      <span className="muted">{label}</span>
      <span className="num" style={{ fontWeight: 700, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const styles = {
  section: { padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--sp-2)" },
  avatarGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-4)" },
  avatarBtn: { aspectRatio: "1", borderRadius: "50%", padding: 0 },
  paletteRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--sp-3)",
    padding: "var(--sp-3)",
    borderRadius: "var(--r-md)",
    background: "var(--field)",
    border: "1px solid var(--hairline)",
    minHeight: 64,
  },
  swatch: {
    width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center",
    border: "1px solid var(--hairline)", flexShrink: 0,
  },
  swatchDot: { width: 16, height: 16, borderRadius: "50%" },
  check: {
    width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center",
    background: "var(--accent-strong)", color: "var(--on-accent)",
  },
};
