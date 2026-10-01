import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dumbbell, Trophy, Flag, Medal as MedalIcon, Swords, Handshake, CircleX, FlagOff, Ban, HandHeart, Zap } from "lucide-react";
import Medal from "./Medal";
import { medalById } from "../lib/medals";

export const since = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
};

// Frase del evento. Si lo hiciste tú, se conjuga en segunda persona ("Retaste a…").
function describe(a, me, nameOf) {
  const mine = a.actor === me;
  const who = <b>{nameOf(a.actor)}</b>;
  const them = <b>{a.targets.map((t) => (t === me ? "ti" : nameOf(t))).join(" y ")}</b>;
  const v = (yo, otro) => (mine ? yo : otro);
  const lead = (verb) => (mine ? <>{verb}</> : <>{who} {verb.charAt(0).toLowerCase() + verb.slice(1)}</>);
  const whose = a.targets.length === 1 && a.targets[0] === me ? <>tu reto</> : <>el reto de {them}</>;
  const what = a.data?.mode === "first_to" ? `llegar primero a ${a.data.length} días` : a.data?.length ? `${a.data.length} días de reto` : "un reto";
  switch (a.kind) {
    case "challenge_invite": return { Icon: Swords, text: <>{lead(v("Retaste", "Retó"))} a {them} · {what}</> };
    case "challenge_accept": return { Icon: Handshake, text: <>{lead(v("Aceptaste", "Aceptó"))} {whose}</> };
    case "challenge_decline": return { Icon: CircleX, text: <>{lead(v("Rechazaste", "Rechazó"))} {whose}</> };
    case "challenge_won": return { Icon: Trophy, win: true, text: <>{lead(v("Le ganaste", "Le ganó"))} el reto a {them}{a.data?.days ? ` con ${a.data.days} días cumplidos` : ""}{a.data?.decided_by === "closeness" ? " (desempate por cercanía a la meta)" : a.data?.decided_by === "forfeit" ? " (se rindió)" : ""}</> };
    case "challenge_draw": return { Icon: Flag, text: <>{mine ? <>Empataste con {them}</> : <>{who} y {them} empataron</>} el reto</> };
    case "challenge_forfeit": return { Icon: FlagOff, text: <>{lead(v("Te rendiste", "Se rindió"))} en el reto con {them}</> };
    case "challenge_cancelled": return { Icon: Ban, text: <>{mine ? <>Tú y {them}</> : <>{who} y {them}</>} cancelaron el reto</> };
    case "pr": return { Icon: Dumbbell, text: <>{lead(v("Rompiste", "Rompió"))} su récord en <b>{a.data?.exercise}</b>: {Number(a.data?.kg).toLocaleString("es-CO")} kg × {a.data?.reps}</> };
    case "medal": return { Icon: MedalIcon, medal: medalById(a.data?.medal), text: <>{lead(v("Ganaste", "Ganó"))} la medalla <b>{medalById(a.data?.medal)?.name || ""}</b></> };
    case "poke": return a.data?.kind === "cheer"
      ? { Icon: HandHeart, text: <>{lead(v("Le mandaste", "Le mandó"))} ánimo a {them}</> }
      : { Icon: Zap, text: <>{lead(v("Picaste", "Picó"))} a {them}</> };
    default: return { Icon: Flag, text: null };
  }
}


// Logros recientes de una persona: retos ganados, medallas y récords. Es el "muro" de su perfil.
export function Wall({ uid, ch, me }) {
  const [items, setItems] = useState(null);
  const name = (id) => ch.people[id]?.name || "Alguien";

  useEffect(() => {
    let alive = true;
    ch.wallOf(uid).then((w) => alive && setItems(w));
    return () => { alive = false; };
  }, [uid, ch.medals.length, ch.challenges.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <p className="eyebrow" style={{ marginBottom: "var(--sp-2)" }}>Logros recientes</p>
      {items && items.length === 0 && <p className="muted" style={{ fontSize: "var(--t-small)" }}>Todavía no hay logros para mostrar.</p>}
      <AnimatePresence initial={false}>
        {(items || []).map((a, i) => {
          const d = describe(a, me, name);
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center", padding: "12px 0", borderTop: i ? "1px solid var(--hairline)" : "none" }}>
              <span style={{ width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0,
                background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}>
                <d.Icon size={18} strokeWidth={1.9} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "var(--t-small)", lineHeight: 1.4 }}>{d.text}</p>
                <p className="caption">{since(a.created_at)}</p>
              </div>
              {d.medal && <Medal medal={d.medal} size={40} />}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
