import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Search, PenLine, ArrowRight, RotateCcw } from "lucide-react";
import { estimateFood } from "../lib/supabase";
import { MEALS, mealForNow, photoToBase64 } from "../lib/food";

const ease = [0.16, 1, 0.3, 1];
const MODES = [
  { id: "photo", label: "Foto", Icon: Camera },
  { id: "search", label: "Buscar", Icon: Search },
  { id: "manual", label: "Manual", Icon: PenLine },
];
const EMPTY = { name: "", kcal: "", protein_g: "", carbs_g: "", fat_g: "", portion: "" };

export default function AddFood({ onSave, demo }) {
  const [mode, setMode] = useState("photo");
  const [meal, setMeal] = useState(mealForNow());
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null); // resultado editable antes de guardar
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const reset = () => { setDraft(null); setPreview(null); setError(""); setQuery(""); };

  const run = async (payload) => {
    setBusy(true);
    setError("");
    try {
      const r = demo
        ? await new Promise((ok) => setTimeout(() => ok({ name: "Bandeja paisa", kcal: 1150, protein_g: 52, carbs_g: 98, fat_g: 58, portion: "1 plato ~650 g" }), 900))
        : await estimateFood(payload);
      setDraft({ ...r, source: payload.mode === "photo" ? "photo" : "search" });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    try { await run({ mode: "photo", image: await photoToBase64(file) }); }
    catch (err) { setError(err.message); }
  };

  const save = async () => {
    const d = draft;
    if (!d.name.trim() || d.kcal === "" || Number(d.kcal) < 0) { setError("Ponle nombre y calorías."); return; }
    setSaving(true);
    try {
      await onSave({
        meal,
        name: d.name.trim().slice(0, 80),
        kcal: Math.round(Number(d.kcal)),
        protein_g: Number(d.protein_g) || 0,
        carbs_g: Number(d.carbs_g) || 0,
        fat_g: Number(d.fat_g) || 0,
        portion: d.portion?.trim() || null,
        source: d.source || "manual",
      });
      reset();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <Segmented value={meal} onChange={setMeal} options={MEALS.map((m) => ({ id: m.id, label: m.label }))} layoutId="meal-pill" />

      <AnimatePresence mode="wait" initial={false}>
        {draft ? (
          <motion.div key="draft" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease }} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
            {preview && <img src={preview} alt="" style={styles.thumb} />}
            <DraftForm draft={draft} onChange={(p) => setDraft((x) => ({ ...x, ...p }))} />
            {error && <p role="alert" style={styles.error}>{error}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--sp-2)" }}>
              <button className="btn btn-glass" onClick={reset} aria-label="Descartar"><RotateCcw size={18} strokeWidth={1.8} /></button>
              <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Guardando…" : "Agregar"}</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="pick" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease }} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
            <Segmented value={mode} onChange={(m) => { setMode(m); setError(""); }} options={MODES} layoutId="mode-pill" />

            {mode === "photo" && (
              <>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
                <button className="glass" style={styles.photoBtn} onClick={() => fileRef.current?.click()} disabled={busy}>
                  {preview && <img src={preview} alt="" style={styles.photoBg} />}
                  {busy ? <Analyzing /> : (
                    <>
                      <span style={styles.photoIcon}><Camera size={28} strokeWidth={1.6} /></span>
                      <span style={{ fontWeight: 700 }}>Tomar o elegir foto</span>
                      <span className="caption">La IA estima calorías y macros</span>
                    </>
                  )}
                </button>
              </>
            )}

            {mode === "search" && (
              <form onSubmit={(e) => { e.preventDefault(); if (query.trim()) run({ mode: "text", query }); }}
                style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                <div className="field">
                  <label htmlFor="food-q">¿Qué comiste?</label>
                  <input id="food-q" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={200}
                    placeholder="Ej: 2 arepas con queso y un café con leche" autoComplete="off" />
                </div>
                <button className="btn btn-primary btn-block" disabled={busy || !query.trim()}>
                  {busy ? "Calculando…" : <>Calcular <ArrowRight size={18} strokeWidth={2} /></>}
                </button>
              </form>
            )}

            {mode === "manual" && (
              <button className="btn btn-primary btn-block" onClick={() => setDraft({ ...EMPTY, source: "manual" })}>
                Escribir los datos
              </button>
            )}

            {error && <p role="alert" style={styles.error}>{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DraftForm({ draft, onChange }) {
  const f = (key, label, props = {}) => (
    <div className="field" style={props.style}>
      <label htmlFor={`d-${key}`}>{label}</label>
      <input id={`d-${key}`} value={draft[key] ?? ""} onChange={(e) => onChange({ [key]: e.target.value })} {...props.input} />
    </div>
  );
  const n = { type: "number", inputMode: "decimal", min: 0, placeholder: "0" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {f("name", "Nombre", { input: { maxLength: 80, placeholder: "Ej: Arroz con pollo" } })}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
        {f("kcal", "Calorías (kcal)", { input: { ...n, inputMode: "numeric" } })}
        {f("portion", "Porción", { input: { maxLength: 80, placeholder: "1 plato" } })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--sp-3)" }}>
        {f("protein_g", "Proteína (g)", { input: n })}
        {f("carbs_g", "Carbos (g)", { input: n })}
        {f("fat_g", "Grasa (g)", { input: n })}
      </div>
    </div>
  );
}

export function Segmented({ value, onChange, options, layoutId }) {
  return (
    <div style={styles.seg} role="tablist">
      {options.map(({ id, label, Icon }) => {
        const active = id === value;
        return (
          <button key={id} role="tab" aria-selected={active} onClick={() => onChange(id)} style={styles.segBtn}>
            {active && <motion.span layoutId={layoutId} style={styles.segPill} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, color: active ? "var(--on-accent)" : "var(--text)" }}>
              {Icon && <Icon size={16} strokeWidth={1.9} />}{label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Analyzing() {
  return (
    <span style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-3)" }}>
      <motion.span style={styles.pulse} animate={{ scale: [1, 1.25, 1], opacity: [0.9, 0.4, 0.9] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} />
      <span style={{ fontWeight: 700 }}>Analizando tu comida…</span>
    </span>
  );
}

const styles = {
  seg: {
    display: "flex", padding: 4, gap: 4, borderRadius: "var(--r-pill)",
    background: "var(--field)", border: "1px solid var(--hairline)",
  },
  segBtn: {
    position: "relative", flex: 1, minHeight: 40, borderRadius: "var(--r-pill)",
    fontSize: "var(--t-small)", fontWeight: 700, display: "grid", placeItems: "center",
  },
  segPill: {
    position: "absolute", inset: 0, borderRadius: "var(--r-pill)",
    background: "linear-gradient(180deg, var(--accent), var(--accent-strong))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)",
  },
  photoBtn: {
    position: "relative", overflow: "hidden", minHeight: 220, borderRadius: "var(--r-md)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--sp-2)",
    color: "var(--text)", borderStyle: "dashed",
  },
  photoBg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.25, filter: "blur(2px)" },
  photoIcon: {
    width: 64, height: 64, borderRadius: 20, display: "grid", placeItems: "center", marginBottom: "var(--sp-1)",
    background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)",
  },
  pulse: { width: 56, height: 56, borderRadius: "50%", background: "radial-gradient(circle, var(--accent), transparent 70%)" },
  thumb: { width: "100%", height: 160, objectFit: "cover", borderRadius: "var(--r-md)" },
  error: { color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" },
};
