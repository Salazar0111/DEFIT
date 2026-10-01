import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Images, Minus, Plus, ScanLine } from "lucide-react";
import { photoToBase64 } from "../lib/food";
import { makeIngredient } from "../lib/ingredients";
import { fmt } from "../lib/plan";

// Valores por gramo de la etiqueta: de la columna "por 100 g", o de la porción si solo hay esa.
const perGram = (l) => {
  if (l.per_100) return { kcal: l.per_100.kcal / 100, protein_g: l.per_100.protein_g / 100, carbs_g: l.per_100.carbs_g / 100, fat_g: l.per_100.fat_g / 100 };
  const s = l.per_serving;
  return { kcal: s.kcal / l.serving_g, protein_g: s.protein_g / l.serving_g, carbs_g: s.carbs_g / l.serving_g, fat_g: s.fat_g / l.serving_g };
};

const STEP = 0.5;
const round = (n) => Math.round(n * 100) / 100;

// Foto de la tabla nutricional de un producto: eliges cuántas porciones (o gramos) comiste, no todo el paquete.
// onAdd recibe un ingrediente con los valores de la cantidad elegida.
export default function LabelScanner({ estimate, onAdd, onCancel, autoOpen = false }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [label, setLabel] = useState(null);
  const [name, setName] = useState("");
  const [by, setBy] = useState("portions"); // portions | grams
  const [portions, setPortions] = useState(1);
  const [grams, setGrams] = useState(100);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setError("");
    try {
      const l = await estimate({ mode: "label", image: await photoToBase64(file) });
      setLabel(l); setName(l.name || "Producto");
      if (l.serving_g) { setBy("portions"); setPortions(1); setGrams(l.serving_g); }
      else { setBy("grams"); setGrams(100); }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const hasServing = !!label?.serving_g;
  const totalG = label ? (by === "portions" && hasServing ? round(portions * label.serving_g) : Number(grams) || 0) : 0;
  const g = label ? perGram(label) : null;
  const total = g ? { kcal: Math.round(g.kcal * totalG), protein: Math.round(g.protein_g * totalG * 10) / 10, carbs: Math.round(g.carbs_g * totalG * 10) / 10, fat: Math.round(g.fat_g * totalG * 10) / 10 } : null;

  const add = () => onAdd(makeIngredient({
    name: name.trim() || "Producto", grams: totalG || 1,
    kcal: g.kcal * totalG, protein_g: g.protein_g * totalG, carbs_g: g.carbs_g * totalG, fat_g: g.fat_g * totalG,
  }), name.trim() || "Producto");

  const files = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onFile} />
    </>
  );

  if (!label) {
    return (
      <div className="glass" style={{ padding: "var(--sp-4)", display: "flex", flexDirection: "column", gap: "var(--sp-3)", alignItems: "center", textAlign: "center" }}>
        {files}
        <span style={{ width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }}>
          <ScanLine size={26} strokeWidth={1.7} />
        </span>
        <p style={{ fontWeight: 700 }}>{busy ? "Leyendo la tabla…" : "Foto de la tabla nutricional"}</p>
        {!busy && <p className="caption">Que se vea completa y de frente. Después eliges cuántas porciones comiste.</p>}
        {!busy && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)", width: "100%" }}>
            <button className="btn btn-primary" onClick={() => cameraRef.current?.click()}><Camera size={18} strokeWidth={2} /> Cámara</button>
            <button className="btn btn-glass" onClick={() => galleryRef.current?.click()}><Images size={18} strokeWidth={1.8} /> Galería</button>
          </div>
        )}
        {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
        <button className="btn btn-text" style={{ fontSize: "var(--t-small)" }} onClick={onCancel}>Cancelar</button>
      </div>
    );
  }

  return (
    <motion.div className="glass" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: "var(--sp-4)", display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {files}
      <input aria-label="Nombre del producto" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
        style={{ width: "100%", background: "none", border: "none", outline: "none", padding: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }} />
      <p className="caption">
        {label.serving_text ? `Porción: ${label.serving_text}` : hasServing ? `Porción: ${fmt(label.serving_g)} g` : "La etiqueta no trae porción: escribe los gramos."}
        {label.servings_per_pack ? ` · Paquete: ${fmt(label.servings_per_pack)} porciones` : ""}
      </p>

      {hasServing && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: "var(--r-pill)", background: "var(--field)", border: "1px solid var(--hairline)" }}>
          {[["portions", "Porciones"], ["grams", "Gramos"]].map(([id, text]) => (
            <button key={id} onClick={() => { setBy(id); if (id === "grams") setGrams(totalG || label.serving_g); }} aria-pressed={by === id}
              style={{ minHeight: 38, borderRadius: "var(--r-pill)", fontSize: "var(--t-small)", fontWeight: 700,
                background: by === id ? "linear-gradient(180deg, var(--accent), var(--accent-strong))" : "none", color: by === id ? "var(--on-accent)" : "var(--text)" }}>
              {text}
            </button>
          ))}
        </div>
      )}

      {by === "portions" && hasServing ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--sp-4)" }}>
            <button className="btn btn-glass" style={{ width: 52, minHeight: 52, padding: 0 }} aria-label="Menos porción" onClick={() => setPortions((p) => Math.max(STEP, round(p - STEP)))}><Minus size={20} strokeWidth={2.2} /></button>
            <label style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <input type="number" inputMode="decimal" step="0.25" min="0" aria-label="Porciones" value={portions}
                onChange={(e) => setPortions(Math.max(0, Number(e.target.value) || 0))}
                style={{ width: 80, textAlign: "center", background: "none", border: "none", outline: "none", fontSize: 38, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }} />
              <span className="muted" style={{ fontWeight: 700 }}>{portions === 1 ? "porción" : "porciones"}</span>
            </label>
            <button className="btn btn-glass" style={{ width: 52, minHeight: 52, padding: 0 }} aria-label="Más porción" onClick={() => setPortions((p) => round(p + STEP))}><Plus size={20} strokeWidth={2.2} /></button>
          </div>
          {label.servings_per_pack > 1 && (
            <div style={{ display: "flex", gap: "var(--sp-2)", justifyContent: "center", flexWrap: "wrap" }}>
              {[["Media", 0.5], ["1 porción", 1], ["Todo el paquete", 1]].map(([text, f], i) => {
                const value = i === 0 ? round(label.servings_per_pack / 2) : i === 1 ? 1 : label.servings_per_pack;
                return <button key={text} className="btn btn-glass" style={{ minHeight: 34, padding: "0 12px", fontSize: "var(--t-caption)" }} onClick={() => setPortions(value)}>{i === 0 ? "Mitad del paquete" : text}</button>;
              })}
            </div>
          )}
          <p className="caption" style={{ textAlign: "center" }}>= {fmt(totalG)} g</p>
        </>
      ) : (
        <div className="field">
          <label htmlFor="label-grams">Gramos que comiste</label>
          <input id="label-grams" type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(Math.max(0, Number(e.target.value) || 0))} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "12px 14px", borderRadius: "var(--r-md)", background: "var(--field)", border: "1px solid var(--hairline)" }}>
        <div>
          <AnimatePresence mode="popLayout"><motion.span key={total.kcal} initial={{ opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }} className="num" style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em" }}>{fmt(total.kcal)}</motion.span></AnimatePresence>
          <span className="muted" style={{ fontWeight: 700 }}> kcal</span>
        </div>
        <span className="caption num">P {Math.round(total.protein)} · C {Math.round(total.carbs)} · G {Math.round(total.fat)}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--sp-2)" }}>
        <button className="btn btn-glass" onClick={() => setLabel(null)} aria-label="Escanear otra">Otra foto</button>
        <button className="btn btn-primary" disabled={!totalG} onClick={add}>Agregar</button>
      </div>
    </motion.div>
  );
}
