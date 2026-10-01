import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Camera, Flame, Swords, Target } from "lucide-react";
import { avatarSrc } from "../lib/avatars";

const SLIDES = [
  {
    mood: "happy", Icon: null,
    title: (name) => `Hola, ${name}`,
    text: "Soy tu compañero en DEFIT. Te acompaño a cumplir tu meta de calorías y a ganarle a tus amigos. Te muestro cómo funciona en un minuto.",
  },
  {
    mood: "surprised", Icon: Camera,
    title: () => "Registra lo que comes",
    text: "En Comida saca una foto de tu plato o escribe lo que comiste. La IA calcula las calorías y tú puedes corregirlas antes de guardar.",
  },
  {
    mood: "party", Icon: Target,
    title: () => "Cumple tu día",
    text: "Tu día cuenta como cumplido si comes entre el 90% y el 110% de tu meta. En Hoy lo ves en el anillo, y yo te digo cómo vas.",
  },
  {
    mood: "happy", Icon: Swords,
    title: () => "Reta a tus amigos",
    text: "En Retos desafía a uno o varios amigos: gana quien cumpla más días. Si empatan, gana quien estuvo más cerca de su meta. Toca a tu rival para animarlo o picarlo.",
  },
  {
    mood: "party", Icon: Flame,
    title: () => "Rachas y medallas",
    text: "Registrar todos los días suma racha. Cada noche, justo después de las 12, reviso tu día y te entrego las medallas que ganaste.",
  },
  {
    mood: "sleepy", Icon: Bell,
    title: () => "No te pierdas nada",
    text: "Te pediremos activar las notificaciones cuando registres tu primera comida, para avisarte de retos, empujones y resultados. En iPhone, abre DEFIT desde el ícono de tu pantalla de inicio.",
  },
];

// Tour de bienvenida: el personaje de la persona explica lo esencial. Se desliza o se avanza con botones.
export default function Tour({ profile, onDone, onGoProfile }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  const name = (profile.name || "").split(" ")[0];
  const go = (d) => { const n = i + d; if (n < 0 || n >= SLIDES.length) return; setDir(d); setI(n); };

  return (
    <motion.div style={styles.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label="Cómo funciona DEFIT">
      <div style={styles.top}>
        <div style={styles.dots}>
          {SLIDES.map((_, k) => (
            <motion.span key={k} animate={{ width: k === i ? 22 : 7, opacity: k === i ? 1 : 0.35 }} style={styles.dot} />
          ))}
        </div>
        {!last && <button className="btn btn-text" style={{ minHeight: 36 }} onClick={onDone}>Saltar</button>}
      </div>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div key={i} custom={dir}
          initial={{ opacity: 0, x: dir * 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -60 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.4}
          onDragEnd={(_, info) => { if (info.offset.x < -60) go(1); else if (info.offset.x > 60) go(-1); }}
          style={styles.slide}>
          <div style={{ position: "relative" }}>
            <motion.img src={avatarSrc(profile.avatar, s.mood)} alt="" draggable={false}
              initial={{ scale: 0.7, y: 20 }} animate={{ scale: 1, y: [20, -12, 0] }} transition={{ duration: 0.6 }}
              style={{ width: 168, height: 168, borderRadius: "50%", display: "block" }} />
            {s.Icon && (
              <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.3 }}
                style={styles.badge}>
                <s.Icon size={26} strokeWidth={1.8} />
              </motion.span>
            )}
          </div>
          <h1 style={{ fontSize: 30, textAlign: "center" }}>{s.title(name)}</h1>
          <p className="muted" style={{ textAlign: "center", fontSize: 17, lineHeight: 1.5, maxWidth: 340 }}>{s.text}</p>
        </motion.div>
      </AnimatePresence>

      <div style={styles.bottom}>
        {last ? (
          <button className="btn btn-primary btn-block" onClick={onDone}>Empezar a usar DEFIT</button>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: i ? "1fr 2fr" : "1fr", gap: "var(--sp-2)", width: "100%" }}>
            {i > 0 && <button className="btn btn-glass" onClick={() => go(-1)}>Atrás</button>}
            <button className="btn btn-primary" onClick={() => go(1)}>Siguiente</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const styles = {
  wrap: {
    position: "fixed", inset: 0, zIndex: 90, display: "flex", flexDirection: "column",
    padding: "calc(var(--safe-top) + 16px) 24px calc(var(--safe-bottom) + 24px)",
    background: "color-mix(in srgb, var(--bg) 90%, transparent)",
    WebkitBackdropFilter: "blur(30px) saturate(160%)", backdropFilter: "blur(30px) saturate(160%)",
  },
  top: { display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44, maxWidth: 480, width: "100%", margin: "0 auto" },
  dots: { display: "flex", gap: 6, alignItems: "center" },
  dot: { height: 7, borderRadius: 99, background: "var(--accent)", display: "block" },
  slide: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: "var(--sp-4)", maxWidth: 480, width: "100%", margin: "0 auto", touchAction: "pan-y", cursor: "grab",
  },
  badge: {
    position: "absolute", right: -6, bottom: -4, width: 56, height: 56, borderRadius: 18, display: "grid", placeItems: "center",
    color: "var(--on-accent)", background: "linear-gradient(180deg, var(--accent), var(--accent-strong))",
    boxShadow: "0 0 0 4px var(--bg), 0 10px 24px color-mix(in srgb, var(--accent-strong) 45%, transparent)",
  },
  bottom: { display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-2)", maxWidth: 480, width: "100%", margin: "0 auto" },
};
