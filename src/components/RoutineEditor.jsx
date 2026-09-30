import { useMemo, useState } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "motion/react";
import { ArrowLeftRight, GripVertical, Minus, Plus, Search, X } from "lucide-react";
import Sheet from "./Sheet";
import { EXERCISES, MUSCLES, exerciseById } from "../lib/exercises";

const ease = [0.16, 1, 0.3, 1];

// Edita una sesión de la rutina: cambiar, agregar, quitar, reordenar y ajustar series y repeticiones.
export default function RoutineEditor({ session, sameCount, onSave, onClose }) {
  const [items, setItems] = useState(session.exercises.map((e) => ({ ...e })));
  const [picker, setPicker] = useState(null); // { mode: "add" } | { mode: "swap", id, muscle }

  const patch = (id, p) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const remove = (id) => setItems((list) => list.filter((i) => i.id !== id));
  const used = new Set(items.map((i) => i.id));

  const pick = (exId) => {
    if (picker.mode === "add") {
      setItems((list) => [...list, { id: exId, sets: 3, reps: 10 }]);
    } else {
      setItems((list) => list.map((i) => (i.id === picker.id ? { ...i, id: exId } : i)));
    }
    setPicker(null);
  };

  return (
    <>
      <Sheet open onClose={onClose} title={session.name}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", paddingBottom: "var(--sp-3)" }}>
          <p className="caption">
            Arrastra para reordenar. {sameCount > 1 ? `Los cambios se aplican a tus ${sameCount} días de «${session.name}».` : ""}
          </p>

          <Reorder.Group axis="y" values={items} onReorder={setItems} as="div" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
            {items.map((it) => (
              <Row key={it.id} item={it} onPatch={(p) => patch(it.id, p)} onRemove={() => remove(it.id)}
                onSwap={() => setPicker({ mode: "swap", id: it.id, muscle: exerciseById(it.id)?.muscle })} />
            ))}
          </Reorder.Group>

          <button className="btn btn-glass" onClick={() => setPicker({ mode: "add" })}><Plus size={18} strokeWidth={2} /> Agregar ejercicio</button>

          <div style={styles.bar}>
            <button className="btn btn-primary btn-block" disabled={!items.length} onClick={() => onSave(items)}>Guardar rutina</button>
          </div>
        </div>
      </Sheet>

      {picker && (
        <ExercisePicker title={picker.mode === "swap" ? "Cambiar ejercicio" : "Agregar ejercicio"} initialMuscle={picker.muscle}
          exclude={used} onPick={pick} onClose={() => setPicker(null)} />
      )}
    </>
  );
}

function Row({ item, onPatch, onRemove, onSwap }) {
  const controls = useDragControls();
  const info = exerciseById(item.id);
  return (
    <Reorder.Item value={item} as="div" dragListener={false} dragControls={controls} layout
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} whileDrag={{ scale: 1.02, zIndex: 5 }} style={styles.row}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
        <span onPointerDown={(e) => controls.start(e)} style={styles.handle} aria-label="Arrastrar para reordenar" role="button">
          <GripVertical size={20} strokeWidth={1.8} />
        </span>
        <p style={{ flex: 1, minWidth: 0, fontWeight: 700 }}>{info?.name || item.id}</p>
        <button onClick={onSwap} style={styles.iconBtn} aria-label={`Cambiar ${info?.name}`}><ArrowLeftRight size={17} strokeWidth={1.9} /></button>
        <button onClick={onRemove} style={styles.iconBtn} aria-label={`Quitar ${info?.name}`}><X size={18} strokeWidth={2} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)" }}>
        <Mini label="Series" value={item.sets} min={1} max={10} onChange={(v) => onPatch({ sets: v })} />
        <Mini label="Reps" value={item.reps} min={1} max={60} onChange={(v) => onPatch({ reps: v })} />
      </div>
    </Reorder.Item>
  );
}

function Mini({ label, value, min, max, onChange }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div style={styles.mini}>
      <button style={styles.miniBtn} onClick={() => set(value - 1)} aria-label={`Menos ${label.toLowerCase()}`}><Minus size={16} strokeWidth={2.2} /></button>
      <span style={{ flex: 1, textAlign: "center" }}>
        <span className="num" style={{ fontWeight: 700, fontSize: 18 }}>{value}</span> <span className="caption">{label.toLowerCase()}</span>
      </span>
      <button style={styles.miniBtn} onClick={() => set(value + 1)} aria-label={`Más ${label.toLowerCase()}`}><Plus size={16} strokeWidth={2.2} /></button>
    </div>
  );
}

// Biblioteca de ejercicios con buscador y filtro por músculo.
function ExercisePicker({ title, initialMuscle, exclude, onPick, onClose }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState(initialMuscle || "all");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return EXERCISES.filter((e) => !exclude.has(e.id) && (muscle === "all" || e.muscle === muscle) && (!t || e.name.toLowerCase().includes(t)));
  }, [q, muscle, exclude]);

  return (
    <Sheet open onClose={onClose} title={title}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", paddingBottom: "var(--sp-3)" }}>
        <div className="field" style={{ position: "relative" }}>
          <Search size={18} strokeWidth={1.8} style={{ position: "absolute", left: 14, top: 17, color: "var(--text-2)" }} />
          <input aria-label="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" style={{ paddingLeft: 42 }} />
        </div>
        <div style={styles.chips}>
          {[{ id: "all", label: "Todos" }, ...MUSCLES].map((m) => (
            <button key={m.id} onClick={() => setMuscle(m.id)} aria-pressed={muscle === m.id} style={{ ...styles.chip, ...(muscle === m.id && styles.chipOn) }}>{m.label}</button>
          ))}
        </div>
        <AnimatePresence initial={false}>
          {list.map((e) => (
            <motion.button key={e.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }}
              onClick={() => onPick(e.id)} style={styles.item}>
              <span style={{ fontWeight: 700 }}>{e.name}</span>
              <span className="caption">{MUSCLES.find((m) => m.id === e.muscle)?.label}</span>
            </motion.button>
          ))}
        </AnimatePresence>
        {!list.length && <p className="muted">No hay ejercicios con ese nombre.</p>}
      </div>
    </Sheet>
  );
}

const styles = {
  row: { display: "flex", flexDirection: "column", gap: "var(--sp-2)", padding: "var(--sp-3)", borderRadius: "var(--r-md)", background: "var(--field)", border: "1px solid var(--hairline)", touchAction: "pan-y" },
  handle: { width: 32, height: 40, display: "grid", placeItems: "center", color: "var(--text-2)", cursor: "grab", touchAction: "none", flexShrink: 0 },
  iconBtn: { width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center", color: "var(--text-2)", flexShrink: 0 },
  mini: { display: "flex", alignItems: "center", borderRadius: "var(--r-pill)", background: "var(--bg)", border: "1px solid var(--hairline)" },
  miniBtn: { width: 44, height: 44, display: "grid", placeItems: "center", color: "var(--text)", flexShrink: 0 },
  bar: { position: "sticky", bottom: 0, paddingTop: "var(--sp-3)", background: "linear-gradient(to top, var(--bg) 70%, transparent)" },
  chips: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 },
  chip: { padding: "8px 14px", borderRadius: 99, fontWeight: 700, fontSize: "var(--t-small)", whiteSpace: "nowrap", background: "var(--field)", border: "1px solid var(--hairline)", color: "var(--text)" },
  chipOn: { background: "linear-gradient(180deg, var(--accent), var(--accent-strong))", borderColor: "transparent", color: "var(--on-accent)" },
  item: { display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start", padding: "12px 4px", borderTop: "1px solid var(--hairline)", color: "var(--text)", textAlign: "left" },
};
