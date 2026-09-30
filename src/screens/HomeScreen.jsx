import { motion } from "motion/react";
import { SlidersHorizontal } from "lucide-react";
import { fmt } from "../lib/plan";

const ease = [0.16, 1, 0.3, 1];

export default function HomeScreen({ profile, eaten = 0, onEditPlan }) {
  const target = profile.target_kcal || 0;
  const left = target - eaten;
  const pct = target ? Math.min(eaten / target, 1) : 0;
  const over = eaten > target * 1.1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <section className="glass" style={styles.ringCard}>
        <Ring pct={pct} over={over} />
        <div style={styles.ringCenter}>
          <motion.span key={left} className="num" style={styles.big}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
            {fmt(Math.abs(left))}
          </motion.span>
          <span style={{ fontWeight: 700, fontSize: "var(--t-small)" }}>{left >= 0 ? "kcal disponibles" : "kcal de más"}</span>
        </div>
        <div style={styles.stats}>
          <Stat label="Meta" value={fmt(target)} />
          <Stat label="Comido" value={fmt(eaten)} />
          <Stat label="Restante" value={fmt(Math.max(left, 0))} />
        </div>
      </section>

      <section className="glass" style={{ padding: "var(--sp-4) var(--sp-5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-2)" }}>
          <h2>Tu plan</h2>
          <button className="btn btn-glass" style={{ minHeight: 40, padding: "0 16px", fontSize: "var(--t-small)" }} onClick={onEditPlan}>
            <SlidersHorizontal size={16} strokeWidth={1.8} /> Ajustar
          </button>
        </div>
        <Row label="Gasto total diario" value={`${fmt(profile.tdee)} kcal`} />
        <Row label={profile.deficit > 0 ? "Déficit en comida" : "Objetivo"}
          value={profile.deficit > 0 ? `−${fmt(profile.deficit)} kcal` : "Mantener"} />
        <Row label="Peso de partida" value={`${Number(profile.weight_kg).toLocaleString("es-CO")} kg`} last />
      </section>

      <p className="caption" style={{ textAlign: "center" }}>El registro de comidas llega en la próxima fase.</p>
    </div>
  );
}

function Ring({ pct, over }) {
  const size = 236, stroke = 18, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", margin: "0 auto" }} aria-hidden="true">
      <defs>
        <linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={over ? "var(--danger)" : "var(--accent)"} />
          <stop offset="1" stopColor={over ? "var(--danger)" : "var(--accent-strong)"} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline)" strokeWidth={stroke} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring-g)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.max(pct, 0.001)) }}
        transition={{ duration: 1.1, ease }} />
    </svg>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span className="caption">{label}</span>
      <span className="num" style={{ fontWeight: 700, fontSize: 18 }}>{value}</span>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: last ? "none" : "1px solid var(--hairline)" }}>
      <span className="muted">{label}</span>
      <span className="num" style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

const styles = {
  ringCard: { position: "relative", padding: "var(--sp-5) var(--sp-4) var(--sp-4)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" },
  ringCenter: {
    position: "absolute", top: "var(--sp-5)", left: 0, right: 0, height: 236,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, pointerEvents: "none",
  },
  big: { fontSize: "var(--t-display)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 },
  stats: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", paddingTop: "var(--sp-3)", borderTop: "1px solid var(--hairline)" },
};
