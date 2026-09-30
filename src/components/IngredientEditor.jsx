import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, X, Sparkles, PenLine } from "lucide-react";
import { makeIngredient, sumIngredients, valuesOf, withGrams, withKcal } from "../lib/ingredients";
import { fmt } from "../lib/plan";

const ease = [0.16, 1, 0.3, 1];
const STEP = 10;

// Editor de una comida por ingredientes: nombre, gramos con − / + y kcal corregibles.
export default function IngredientEditor({ name, onName, items, onItems, onEstimate }) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = sumIngredients(items);

  const update = (id, fn) => onItems(items.map((i) => (i.id === id ? fn(i) : i)));
  const remove = (id) => onItems(items.filter((i) => i.id !== id));

  const addWithAI = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true); setError("");
    try {
      const r = await onEstimate(query);
      onItems([...items, ...r.ingredients.map(makeIngredient)]);
      setQuery(""); setAdding(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addManual = () => {
    onItems([...items, makeIngredient({ name: "", grams: 100, kcal: 0 })]);
    setAdding(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      <input aria-label="Nombre de la comida" value={name} onChange={(e) => onName(e.target.value)} maxLength={80}
        placeholder="Nombre de la comida" style={styles.title} />

      {/* Totales, recalculados en vivo */}
      <div style={styles.totals}>
        <div>
          <motion.span key={t.kcal} initial={{ opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }} className="num" style={styles.kcal}>
            {fmt(t.kcal)}
          </motion.span>
          <span className="muted" style={{ fontWeight: 700 }}> kcal</span>
        </div>
        <span className="caption num">P {Math.round(t.protein_g)} · C {Math.round(t.carbs_g)} · G {Math.round(t.fat_g)}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <AnimatePresence initial={false}>
          {items.map((i) => {
            const v = valuesOf(i);
            return (
              <motion.div key={i.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease }} style={{ overflow: "hidden" }}>
                <div style={styles.row}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                    <input aria-label="Ingrediente" value={i.name} placeholder="Ingrediente" maxLength={60}
                      onChange={(e) => update(i.id, (x) => ({ ...x, name: e.target.value }))} style={styles.name} />
                    <button onClick={() => remove(i.id)} aria-label={`Quitar ${i.name || "ingrediente"}`} style={styles.iconBtn}>
                      <X size={16} strokeWidth={2} />
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                    <div style={styles.stepper}>
                      <button aria-label="Menos gramos" style={styles.stepBtn} onClick={() => update(i.id, (x) => withGrams(x, x.grams - STEP))}>
                        <Minus size={16} strokeWidth={2.2} />
                      </button>
                      <label style={styles.gramsBox}>
                        <input type="number" inputMode="numeric" aria-label="Gramos" value={i.grams}
                          onChange={(e) => update(i.id, (x) => withGrams(x, e.target.value))} style={styles.gramsInput} />
                        <span className="caption">g</span>
                      </label>
                      <button aria-label="Más gramos" style={styles.stepBtn} onClick={() => update(i.id, (x) => withGrams(x, x.grams + STEP))}>
                        <Plus size={16} strokeWidth={2.2} />
                      </button>
                    </div>
                    <label style={styles.kcalBox}>
                      <input type="number" inputMode="numeric" aria-label="Calorías del ingrediente" value={v.kcal}
                        onChange={(e) => update(i.id, (x) => withKcal(x, e.target.value))} style={styles.kcalInput} />
                      <span className="caption">kcal</span>
                    </label>
                  </div>
                  <span className="caption num">P {v.protein_g} · C {v.carbs_g} · G {v.fat_g}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {adding ? (
          <motion.form key="add" onSubmit={addWithAI} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--sp-2)" }}>
              <div className="field">
                <input autoFocus aria-label="Ingrediente para agregar" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ej: 2 huevos fritos" maxLength={200} />
              </div>
              <button className="btn btn-primary" disabled={busy || !query.trim()} aria-label="Calcular con IA">
                <Sparkles size={18} strokeWidth={2} />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" className="btn btn-text" style={{ fontSize: "var(--t-small)" }} onClick={addManual}>
                <PenLine size={15} strokeWidth={2} /> Escribirlo a mano
              </button>
              <button type="button" className="btn btn-text" style={{ fontSize: "var(--t-small)" }} onClick={() => setAdding(false)}>Cancelar</button>
            </div>
            {busy && <p className="caption">Calculando…</p>}
            {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
          </motion.form>
        ) : (
          <motion.button key="btn" className="btn btn-glass" onClick={() => setAdding(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Plus size={18} strokeWidth={2} /> Agregar ingrediente
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  title: {
    width: "100%", minWidth: 0, background: "none", border: "none", outline: "none", padding: 0,
    fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)",
  },
  totals: {
    display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--sp-2)", flexWrap: "wrap",
    padding: "12px 14px", borderRadius: "var(--r-md)", background: "var(--field)", border: "1px solid var(--hairline)",
  },
  kcal: { fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em" },
  row: { display: "flex", flexDirection: "column", gap: 8, padding: "12px 0", borderTop: "1px solid var(--hairline)" },
  name: {
    flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", padding: 0,
    fontSize: "var(--t-body)", fontWeight: 700, color: "var(--text)",
  },
  iconBtn: { width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", color: "var(--text-2)", flexShrink: 0 },
  stepper: {
    display: "flex", alignItems: "center", flex: 1, minWidth: 0, borderRadius: "var(--r-pill)",
    background: "var(--field)", border: "1px solid var(--hairline)",
  },
  stepBtn: { width: 44, height: 44, display: "grid", placeItems: "center", color: "var(--text)", flexShrink: 0 },
  gramsBox: { flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 },
  gramsInput: {
    width: "100%", minWidth: 0, maxWidth: 70, textAlign: "right", background: "none", border: "none", outline: "none",
    fontSize: 18, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums",
  },
  kcalBox: {
    display: "flex", alignItems: "baseline", gap: 2, height: 44, padding: "0 12px", borderRadius: "var(--r-pill)",
    background: "var(--field)", border: "1px solid var(--hairline)", width: 108, flexShrink: 0,
  },
  kcalInput: {
    width: "100%", minWidth: 0, textAlign: "right", background: "none", border: "none", outline: "none",
    fontSize: 18, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums", lineHeight: "44px",
  },
};
