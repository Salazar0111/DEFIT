import { motion } from "motion/react";
import { ChevronRight, Lock, SlidersHorizontal, Swords } from "lucide-react";
import { avatarSrc } from "../lib/avatars";
import { challengeTitle } from "./ChallengesScreen";
import { fmt } from "../lib/plan";
import { useFood } from "../lib/useFood";
import { dayKey, totals } from "../lib/food";

const ease = [0.16, 1, 0.3, 1];

export default function HomeScreen({ profile, ch, onEditPlan, onOpenChallenges }) {
  const { entries } = useFood(profile, dayKey(new Date(), profile.timezone));
  const eaten = totals(entries).kcal;
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

      {ch && <ChallengeTeaser ch={ch} me={profile.id} onOpen={onOpenChallenges} />}

      <section className="glass" style={{ padding: "var(--sp-4) var(--sp-5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-2)" }}>
          <h2>Tu plan</h2>
          <button className="btn btn-glass" style={{ minHeight: 40, padding: "0 16px", fontSize: "var(--t-small)" }} onClick={onEditPlan}>
            {ch?.planLocked ? <Lock size={16} strokeWidth={1.8} /> : <SlidersHorizontal size={16} strokeWidth={1.8} />} Ajustar
          </button>
        </div>
        <Row label="Gasto total diario" value={`${fmt(profile.tdee)} kcal`} />
        <Row label={profile.deficit > 0 ? "Déficit en comida" : "Objetivo"}
          value={profile.deficit > 0 ? `−${fmt(profile.deficit)} kcal` : "Mantener"} />
        <Row label="Peso de partida" value={`${Number(profile.weight_kg).toLocaleString("es-CO")} kg`} last />
      </section>

    </div>
  );
}

// Resumen del reto activo o de una invitación pendiente.
function ChallengeTeaser({ ch, me, onOpen }) {
  const invite = ch.challenges.find((c) => c.status === "pending" && c.members.some((m) => m.user_id === me && m.status === "invited"));
  const active = ch.challenges.find((c) => c.status === "active");
  const c = invite || active;
  if (!c) return null;
  const players = c.members.filter((m) => m.status === "accepted" || m.user_id === me);
  return (
    <motion.button className="glass" onClick={onOpen} whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
      style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", alignItems: "center", gap: "var(--sp-3)", textAlign: "left", color: "var(--text)",
        ...(invite && { borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }) }}>
      <div style={{ display: "flex" }}>
        {players.slice(0, 3).map((m, i) => (
          <img key={m.user_id} src={avatarSrc(m.profile?.avatar)} alt=""
            style={{ width: 40, height: 40, borderRadius: "50%", marginLeft: i ? -12 : 0, boxShadow: "0 0 0 2px var(--bg)" }} />
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}><Swords size={13} strokeWidth={2} />{invite ? "Te retaron" : "Reto en curso"}</p>
        <p style={{ fontWeight: 700 }}>{challengeTitle(c)}</p>
        {!invite && (
          <p className="caption num">{players.map((m) => `${m.user_id === me ? "Tú" : m.profile?.name} ${m.done}`).join(" · ")} días</p>
        )}
      </div>
      <ChevronRight size={20} strokeWidth={1.8} style={{ color: "var(--text-2)" }} />
    </motion.button>
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
