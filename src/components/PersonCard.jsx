import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Flame, Trophy, Target, Medal as MedalIcon, HandHeart, Zap } from "lucide-react";
import Medal from "./Medal";
import { avatarSrc } from "../lib/avatars";
import { MEDALS } from "../lib/medals";

// Estadísticas y medallas de una persona. Sirve para tu perfil y para el de tus rivales.
export function PersonStats({ uid, ch, compact = false }) {
  const [stats, setStats] = useState(null);
  const [medals, setMedals] = useState([]);

  useEffect(() => {
    let alive = true;
    ch.stats(uid).then((s) => alive && setStats(s));
    ch.medalsOf(uid).then((m) => alive && setMedals(m));
    return () => { alive = false; };
  }, [uid, ch.medals.length, ch.challenges.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const earned = MEDALS.map((m) => ({ m, n: medals.filter((x) => x.kind === m.id).length })).filter((x) => x.n);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div style={styles.streak}>
        <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.6, repeat: Infinity }} style={styles.flame}>
          <Flame size={28} strokeWidth={1.8} />
        </motion.span>
        <div>
          <p className="num" style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {stats ? stats.current_streak : "–"} <span style={{ fontSize: 16 }}>{stats?.current_streak === 1 ? "día" : "días"}</span>
          </p>
          <p className="caption">Racha actual registrando · mejor: {stats?.best_streak ?? "–"}</p>
        </div>
      </div>

      <div style={styles.grid}>
        <Stat Icon={Trophy} value={stats ? `${stats.challenges_won}/${stats.challenges_played}` : "–"} label="Retos ganados" />
        <Stat Icon={Target} value={stats?.days_in_range ?? "–"} label="Días cumplidos" />
        <Stat Icon={Zap} value={stats?.days_logged ?? "–"} label="Días registrados" />
        <Stat Icon={MedalIcon} value={stats?.medals ?? "–"} label="Medallas" />
      </div>

      {!compact && (
        <div>
          <p className="eyebrow" style={{ marginBottom: "var(--sp-3)" }}>Premios ganados</p>
          {earned.length ? (
            <div style={{ display: "flex", gap: "var(--sp-3)", overflowX: "auto", padding: "4px 2px 8px", margin: "0 -2px" }}>
              {earned.map(({ m, n }) => (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 72, flexShrink: 0, textAlign: "center" }}>
                  <Medal medal={m} size={60} count={n} />
                  <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{m.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: "var(--t-small)" }}>Todavía sin medallas.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ Icon, value, label }) {
  return (
    <div style={styles.stat}>
      <Icon size={18} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
      <p className="num" style={{ fontSize: 22, fontWeight: 700 }}>{value}</p>
      <p className="caption">{label}</p>
    </div>
  );
}

// Contenido de la hoja al tocar el avatar de otra persona.
export function PersonSheetContent({ person, ch, me, preview = false }) {
  const isMe = person.id === me && !preview;
  const canPoke = !isMe && !preview && ch.activeWith(person.id);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");

  const poke = async (kind) => {
    setError("");
    try {
      const left = await ch.sendPoke(person.id, kind);
      setSent({ kind, left, key: Date.now() });
    } catch (e) { setError(e.message); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)", paddingBottom: "var(--sp-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)" }}>
        <motion.img key={sent?.key || 0} src={avatarSrc(person.avatar, sent ? (sent.kind === "cheer" ? "party" : "surprised") : "happy")} alt=""
          initial={{ scale: 0.8, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 12 }}
          style={{ width: 88, height: 88, borderRadius: "50%", boxShadow: "0 0 0 1px var(--hairline)" }} />
        <div>
          <h1>{isMe ? "Tú" : person.name}</h1>
          {preview && <p className="caption">Así te ven tus amigos</p>}
          {canPoke && <p className="caption">Tienen un reto activo</p>}
        </div>
      </div>

      {canPoke && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)" }}>
            <motion.button className="btn btn-primary" whileTap={{ scale: 0.94 }} onClick={() => poke("cheer")}>
              <HandHeart size={18} strokeWidth={2} /> Animar
            </motion.button>
            <motion.button className="btn btn-glass" whileTap={{ scale: 0.94 }} onClick={() => poke("tease")}>
              <Zap size={18} strokeWidth={2} /> Picarlo
            </motion.button>
          </div>
          <AnimatePresence mode="wait">
            {(sent || error) && (
              <motion.p key={sent?.key || error} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="caption" style={{ fontWeight: 700, color: error ? "var(--danger)" : "var(--text)" }}>
                {error || `Enviado. ${sent.left > 0 ? `Te quedan ${sent.left} hoy.` : "Era el último de hoy."}`}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      <PersonStats uid={person.id} ch={ch} />
    </div>
  );
}

const styles = {
  streak: {
    display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "var(--sp-4)", borderRadius: "var(--r-md)",
    background: "linear-gradient(135deg, color-mix(in srgb, #ff8a3d 22%, transparent), color-mix(in srgb, var(--accent) 12%, transparent))",
    border: "1px solid color-mix(in srgb, #ff8a3d 35%, transparent)",
  },
  flame: {
    width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", flexShrink: 0,
    background: "linear-gradient(180deg, #ffb057, #f0612e)", color: "#fff", boxShadow: "0 8px 20px rgba(240, 97, 46, .35)",
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)" },
  stat: {
    display: "flex", flexDirection: "column", gap: 2, padding: "14px", borderRadius: "var(--r-md)",
    background: "var(--field)", border: "1px solid var(--hairline)",
  },
};
