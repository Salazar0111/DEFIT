import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Camera, Search } from "lucide-react";
import Sheet from "../components/Sheet";
import AddFood from "./AddFood";
import { useFood } from "../lib/useFood";
import { MEALS, dayKey, dayLabel, shiftDay, totals } from "../lib/food";
import { fmt } from "../lib/plan";
import { avatarSrc } from "../lib/avatars";
import { foodReaction } from "../lib/buddy";
import { fx } from "../lib/feedback";

const ease = [0.16, 1, 0.3, 1];

export default function FoodScreen({ profile, dt }) {
  const today = dayKey(new Date(), profile.timezone);
  const [day, setDay] = useState(today);
  const [adding, setAdding] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [editing, setEditing] = useState(null);
  const { entries, loading, add, update, remove } = useFood(profile, day);
  const t = totals(entries);
  const dayInfo = dt.info(day);
  const target = dayInfo.target || 0;
  const pct = target ? Math.min(t.kcal / target, 1) : 0;
  const inRange = target && t.kcal >= target * 0.9 && t.kcal <= target * 1.1;
  const over = target && t.kcal > target * 1.1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div style={styles.dayNav}>
        <button className="btn-glass" style={styles.navBtn} onClick={() => setDay(shiftDay(day, -1))} aria-label="Día anterior">
          <ChevronLeft size={20} strokeWidth={1.8} />
        </button>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2 key={day} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }} style={{ textAlign: "center", flex: 1 }}>
            {dayLabel(day, today)}
          </motion.h2>
        </AnimatePresence>
        <button className="btn-glass" style={{ ...styles.navBtn, visibility: day < today ? "visible" : "hidden" }}
          onClick={() => setDay(shiftDay(day, 1))} aria-label="Día siguiente">
          <ChevronRight size={20} strokeWidth={1.8} />
        </button>
      </div>

      <section className="glass" style={{ padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--sp-2)" }}>
          <div>
            <span className="num" style={styles.kcal}>{fmt(t.kcal)}</span>
            <span className="muted" style={{ fontWeight: 700 }}> / {fmt(target)} kcal</span>
          </div>
          {entries.length > 0 && (
            <span style={{ ...styles.badge, ...(inRange ? styles.badgeOk : over ? styles.badgeOver : {}) }}>
              {inRange ? "En tu rango" : over ? "Por encima" : "Por debajo"}
            </span>
          )}
        </div>
        <div style={styles.track}>
          <motion.div style={{ ...styles.fill, background: over ? "var(--danger)" : "linear-gradient(90deg, var(--accent), var(--accent-strong))" }}
            initial={false} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.8, ease }} />
          {/* Rango válido para retos: 90%–110% */}
          <span style={{ ...styles.tick, left: "90%" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-2)" }}>
          <Macro label="Proteína" g={t.protein_g} goal={profile.protein_g} />
          <Macro label="Carbos" g={t.carbs_g} />
          <Macro label="Grasa" g={t.fat_g} />
        </div>
      </section>

      {!loading && entries.length === 0 && (
        <section className="glass" style={styles.empty}>
          <div style={{ display: "flex", gap: "var(--sp-2)", color: "var(--accent)" }}>
            <Camera size={22} strokeWidth={1.6} /><Search size={22} strokeWidth={1.6} />
          </div>
          <h2>{day === today ? "Aún no registras nada hoy" : "Sin registros este día"}</h2>
          <p className="muted">Toma una foto de tu plato o escribe lo que comiste. Registrar todos los días suma para tus medallas.</p>
        </section>
      )}

      {MEALS.map((m) => {
        const items = entries.filter((e) => e.meal === m.id);
        if (!items.length) return null;
        return (
          <section key={m.id} className="glass" style={{ padding: "var(--sp-2) var(--sp-4)" }}>
            <div style={styles.mealHead}>
              <span className="eyebrow">{m.label}</span>
              <span className="num" style={{ fontWeight: 700, fontSize: "var(--t-small)" }}>{fmt(totals(items).kcal)} kcal</span>
            </div>
            <AnimatePresence initial={false}>
              {items.map((e) => (
                <motion.div key={e.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease }} style={{ overflow: "hidden" }}>
                  <div style={styles.item}>
                    <button onClick={() => setEditing(e)} aria-label={`Editar ${e.name}`}
                      style={{ minWidth: 0, flex: 1, textAlign: "left", color: "var(--text)" }}>
                      <p style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</p>
                      <p className="caption">
                        {[e.ingredients?.length > 1 ? `${e.ingredients.length} ingredientes` : e.portion, `P ${Math.round(e.protein_g)} · C ${Math.round(e.carbs_g)} · G ${Math.round(e.fat_g)}`].filter(Boolean).join(" · ")}
                      </p>
                    </button>
                    <span className="num" style={{ fontWeight: 700 }}>{fmt(e.kcal)}</span>
                    <button onClick={() => remove(e.id)} style={styles.del} aria-label={`Eliminar ${e.name}`}>
                      <Trash2 size={17} strokeWidth={1.7} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </section>
        );
      })}

      <div style={{ height: 64 }} aria-hidden="true" />

      {/* Portal: el contenedor de la pestaña usa transform y rompería el position: fixed. */}
      {createPortal(
        <>
          <motion.button className="btn btn-primary" style={styles.fab} onClick={() => setAdding(true)}
            whileTap={{ scale: 0.94 }} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}>
            <Plus size={20} strokeWidth={2.2} /> Agregar comida
          </motion.button>
          <Sheet open={adding} onClose={() => setAdding(false)} title={day === today ? "Agregar comida" : `Agregar · ${dayLabel(day, today)}`}>
            <AddFood demo={profile.id === "demo"} onSave={async (entry) => {
              await add(entry);
              setAdding(false);
              window.dispatchEvent(new Event("defit:meal-saved"));
              fx("success");
              // Tu personaje aparece y reacciona a la comida que acabas de guardar.
              setReaction({ ...foodReaction({ before: t.kcal, after: t.kcal + entry.kcal, target }), key: Date.now() });
              setTimeout(() => setReaction(null), 2600);
            }} />
          </Sheet>
          <Sheet open={!!editing} onClose={() => setEditing(null)} title="Editar comida">
            {editing && (
              <AddFood key={editing.id} demo={profile.id === "demo"} initial={editing}
                onSave={async (patch) => { await update(editing.id, patch); setEditing(null); }} />
            )}
          </Sheet>
          <AnimatePresence>
            {reaction && (
              <motion.div key={reaction.key} className="glass glass-strong" style={styles.reaction} role="status"
                initial={{ y: 160, opacity: 0, x: "-50%" }} animate={{ y: 0, opacity: 1, x: "-50%" }} exit={{ y: 160, opacity: 0, x: "-50%" }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }} onClick={() => setReaction(null)}>
                <motion.img src={avatarSrc(profile.avatar, reaction.mood)} alt="" width={64} height={64}
                  animate={{ y: [0, -16, 0], rotate: reaction.mood === "party" ? [0, -10, 10, 0] : [0, 0] }}
                  transition={{ duration: 0.6, delay: 0.25 }} style={{ width: 64, height: 64, borderRadius: "50%" }} />
                <p style={{ fontWeight: 700 }}>{reaction.text}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}

function Macro({ label, g, goal }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: "var(--r-sm)", background: "var(--field)", border: "1px solid var(--hairline)" }}>
      <p className="caption">{label}</p>
      <p className="num" style={{ fontWeight: 700 }}>{Math.round(g)}{goal ? <span className="caption"> / {goal}</span> : ""} g</p>
    </div>
  );
}

const styles = {
  dayNav: { display: "flex", alignItems: "center", gap: "var(--sp-2)" },
  navBtn: { width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center", border: "1px solid var(--glass-border)" },
  kcal: { fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em" },
  badge: {
    fontSize: "var(--t-caption)", fontWeight: 700, padding: "6px 10px", borderRadius: 99, whiteSpace: "nowrap",
    background: "var(--field)", border: "1px solid var(--hairline)",
  },
  badgeOk: { background: "color-mix(in srgb, var(--accent) 18%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" },
  badgeOver: { background: "color-mix(in srgb, var(--danger) 16%, transparent)", borderColor: "color-mix(in srgb, var(--danger) 40%, transparent)" },
  track: { position: "relative", height: 10, borderRadius: 99, background: "var(--hairline)", overflow: "visible" },
  fill: { height: "100%", borderRadius: 99 },
  tick: { position: "absolute", top: -3, width: 2, height: 16, borderRadius: 2, background: "var(--text-2)", opacity: 0.6 },
  empty: { padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" },
  mealHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 6px" },
  item: { display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "12px 0", borderTop: "1px solid var(--hairline)" },
  del: { width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", color: "var(--text-2)", flexShrink: 0 },
  reaction: {
    position: "fixed", zIndex: 45, left: "50%", bottom: "calc(var(--safe-bottom) + 100px)", width: "calc(100% - 32px)", maxWidth: 440,
    display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "12px 16px", borderRadius: "var(--r-lg)",
  },
  fab: {
    position: "fixed", zIndex: 25, left: "50%", x: "-50%",
    bottom: "calc(var(--safe-bottom) + 96px)", padding: "0 22px", minHeight: 50, whiteSpace: "nowrap",
  },
};
