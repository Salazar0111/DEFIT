import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, PenLine, ArrowRight, RotateCcw, Images, SlidersHorizontal, ChevronDown } from "lucide-react";
import { estimateFood } from "../lib/supabase";
import { MEALS, mealForNow, photoToBase64 } from "../lib/food";
import IngredientEditor from "../components/IngredientEditor";
import { fromEntry, makeIngredient, serialize, sumIngredients } from "../lib/ingredients";

const ease = [0.16, 1, 0.3, 1];
const DEMO_RESULT = {
  name: "Bandeja paisa", portion: "1 plato",
  ingredients: [
    { name: "Arroz blanco", grams: 150, kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.4 },
    { name: "Fríjoles", grams: 120, kcal: 160, protein_g: 10, carbs_g: 28, fat_g: 1 },
    { name: "Chicharrón", grams: 50, kcal: 280, protein_g: 14, carbs_g: 0, fat_g: 25 },
    { name: "Carne molida", grams: 80, kcal: 190, protein_g: 18, carbs_g: 0, fat_g: 13 },
    { name: "Huevo frito", grams: 50, kcal: 100, protein_g: 6, carbs_g: 0.5, fat_g: 8 },
    { name: "Plátano maduro", grams: 60, kcal: 120, protein_g: 1, carbs_g: 31, fat_g: 0.2 },
  ],
};

// initial: comida ya guardada que se quiere editar (salta el paso de elegir cómo registrar).
export default function AddFood({ onSave, demo, initial }) {
  const [adjust, setAdjust] = useState(!!initial);
  const [pickMeal, setPickMeal] = useState(false);
  const [meal, setMeal] = useState(initial?.meal || mealForNow());
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Comida editable antes de guardar: nombre + ingredientes (gramos y kcal corregibles).
  const [draft, setDraft] = useState(initial ? { name: initial.name, items: fromEntry(initial), source: initial.source, portion: initial.portion } : null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const reset = () => { setAdjust(false); setPickMeal(false); setDraft(null); setPreview(null); setError(""); setQuery(""); };

  const estimate = (payload) =>
    demo ? new Promise((ok) => setTimeout(() => ok(DEMO_RESULT), 800)) : estimateFood(payload);

  const run = async (payload) => {
    setBusy(true);
    setError("");
    try {
      const r = await estimate(payload);
      setDraft({ name: r.name, portion: r.portion, items: r.ingredients.map(makeIngredient), source: payload.mode === "photo" ? "photo" : "search" });
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
    const items = d.items.filter((i) => i.name.trim() || i.grams);
    const t = sumIngredients(items);
    if (!d.name.trim()) { setError("Ponle un nombre a la comida."); return; }
    if (!items.length || t.kcal <= 0) { setError("Agrega al menos un ingrediente con calorías."); return; }
    setSaving(true);
    try {
      await onSave({
        meal,
        name: d.name.trim().slice(0, 80),
        kcal: t.kcal,
        protein_g: t.protein_g,
        carbs_g: t.carbs_g,
        fat_g: t.fat_g,
        portion: d.portion?.trim() || null,
        source: d.source || "manual",
        ingredients: serialize(items),
      });
      if (!initial) reset();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      {/* La comida se elige sola según la hora; solo se muestra si quieres cambiarla */}
      {pickMeal ? (
        <Segmented value={meal} onChange={(m) => { setMeal(m); setPickMeal(false); }} options={MEALS.map((m) => ({ id: m.id, label: m.label }))} layoutId="meal-pill" />
      ) : (
        <button className="btn btn-text" style={{ alignSelf: "flex-start", minHeight: 36, padding: 0, color: "var(--text-2)", fontWeight: 700 }} onClick={() => setPickMeal(true)}>
          {MEALS.find((m) => m.id === meal)?.label} <ChevronDown size={16} strokeWidth={2} />
        </button>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {draft ? (
          <motion.div key="draft" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease }} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
            {preview && <img src={preview} alt="" style={styles.thumb} />}
            {adjust ? (
              <IngredientEditor name={draft.name} onName={(name) => setDraft((x) => ({ ...x, name }))}
                items={draft.items} onItems={(items) => setDraft((x) => ({ ...x, items }))}
                onEstimate={(query) => estimate({ mode: "text", query })} />
            ) : (
              <div className="glass" style={{ padding: "var(--sp-4)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
                <input aria-label="Nombre de la comida" value={draft.name} onChange={(e) => setDraft((x) => ({ ...x, name: e.target.value }))}
                  maxLength={80} placeholder="Nombre de la comida"
                  style={{ width: "100%", background: "none", border: "none", outline: "none", padding: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }} />
                <div>
                  <span className="num" style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em" }}>{sumIngredients(draft.items).kcal}</span>
                  <span className="muted" style={{ fontWeight: 700 }}> kcal</span>
                </div>
                <p className="caption num">P {Math.round(sumIngredients(draft.items).protein_g)} · C {Math.round(sumIngredients(draft.items).carbs_g)} · G {Math.round(sumIngredients(draft.items).fat_g)}</p>
                <p className="caption">{draft.items.map((i) => i.name).filter(Boolean).join(", ")}</p>
                <button className="btn btn-glass" style={{ marginTop: "var(--sp-1)" }} onClick={() => setAdjust(true)}>
                  <SlidersHorizontal size={17} strokeWidth={1.9} /> Ajustar ingredientes
                </button>
              </div>
            )}
            {error && <p role="alert" style={styles.error}>{error}</p>}
            <div style={styles.actionBar}>
              {!initial && <button className="btn btn-glass" onClick={reset} aria-label="Descartar"><RotateCcw size={18} strokeWidth={1.8} /></button>}
              <button className="btn btn-primary" style={initial ? { gridColumn: "1 / -1" } : undefined} disabled={saving} onClick={save}>
                {saving ? "Guardando…" : initial ? "Guardar cambios" : "Agregar"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="pick" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease }} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
            {/* capture abre la cámara directo; sin capture, iOS ofrece la fototeca */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
            <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onPhoto} />
            <div className="glass" style={styles.photoBox}>
              {preview && <img src={preview} alt="" style={styles.photoBg} />}
              {busy ? <Analyzing /> : (
                <>
                  <span style={styles.photoIcon}><Camera size={28} strokeWidth={1.6} /></span>
                  <span className="caption" style={{ position: "relative" }}>Foto de tu plato: la IA estima calorías y macros</span>
                  <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)", width: "100%", marginTop: "var(--sp-2)" }}>
                    <button className="btn btn-primary" onClick={() => cameraRef.current?.click()}>
                      <Camera size={18} strokeWidth={2} /> Cámara
                    </button>
                    <button className="btn btn-glass" onClick={() => galleryRef.current?.click()}>
                      <Images size={18} strokeWidth={1.8} /> Galería
                    </button>
                  </div>
                </>
              )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (query.trim() && !busy) run({ mode: "text", query }); }}
              style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--sp-2)" }}>
              <div className="field">
                <input aria-label="¿Qué comiste?" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={200}
                  placeholder="O escribe lo que comiste: 2 arepas con queso" autoComplete="off" />
              </div>
              <button className="btn btn-primary" disabled={busy || !query.trim()} aria-label="Calcular">
                <ArrowRight size={18} strokeWidth={2} />
              </button>
            </form>

            <button className="btn btn-text" style={{ alignSelf: "center", fontSize: "var(--t-small)" }}
              onClick={() => { setAdjust(true); setDraft({ name: "", portion: null, items: [makeIngredient({ name: "", grams: 100, kcal: 0 })], source: "manual" }); }}>
              <PenLine size={15} strokeWidth={2} /> Ingresar a mano
            </button>

            {error && <p role="alert" style={styles.error}>{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
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
  // Barra de guardar fija abajo: con muchos ingredientes el botón no queda lejos.
  actionBar: {
    position: "sticky", bottom: 0, zIndex: 2, display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--sp-2)",
    padding: "var(--sp-3) 0 2px", background: "linear-gradient(to top, var(--bg) 70%, transparent)",
  },
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
  photoBox: {
    position: "relative", overflow: "hidden", minHeight: 220, borderRadius: "var(--r-md)", padding: "var(--sp-5) var(--sp-4) var(--sp-4)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--sp-2)",
    color: "var(--text)", borderStyle: "dashed",
  },
  photoBg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.25, filter: "blur(2px)" },
  photoIcon: {
    position: "relative", width: 64, height: 64, borderRadius: 20, display: "grid", placeItems: "center", marginBottom: "var(--sp-1)",
    background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)",
  },
  pulse: { width: 56, height: 56, borderRadius: "50%", background: "radial-gradient(circle, var(--accent), transparent 70%)" },
  thumb: { width: "100%", height: 160, objectFit: "cover", borderRadius: "var(--r-md)" },
  error: { color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" },
};
