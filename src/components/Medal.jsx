import { useId } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Lock } from "lucide-react";
import { METALS } from "../lib/medals";

// Medalla interactiva (placeholder). Se inclina siguiendo el dedo y, con `spin`,
// gira sobre su eje al arrastrarla, como las medallas de Fitness.
export default function Medal({ medal, size = 88, locked = false, count = 0, spin = false, onClick }) {
  const uid = useId().replace(/:/g, "");
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 220, damping: 18 });
  const sry = useSpring(ry, { stiffness: spin ? 60 : 220, damping: spin ? 12 : 18 });
  const shine = useTransform(sry, [-40, 40], ["-60%", "60%"]);

  const onMove = (e) => {
    if (spin) return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 30);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 30);
  };
  const reset = () => { if (!spin) { rx.set(0); ry.set(0); } };

  const [m1, m2, m3] = METALS[medal.metal];
  const [e1, e2] = medal.enamel;
  const Icon = medal.Icon;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onPointerUp={reset}
      drag={spin ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0}
      onDrag={(_, info) => ry.set(ry.get() + info.delta.x * 1.4)}
      onDragEnd={(_, info) => ry.set(ry.get() + info.velocity.x * 0.35)}
      whileTap={spin ? undefined : { scale: 0.94 }}
      aria-label={`${medal.name}${locked ? " (bloqueada)" : ""}`}
      style={{ width: size, height: size, perspective: 600, padding: 0, position: "relative", flexShrink: 0, touchAction: spin ? "pan-y" : "auto" }}
    >
      <motion.div style={{ width: "100%", height: "100%", rotateX: srx, rotateY: sry, transformStyle: "preserve-3d",
        filter: locked ? "grayscale(1) opacity(0.35)" : "drop-shadow(0 8px 14px rgba(0,0,0,.35))" }}>
        {medal.art ? (
          <img src={`/medals/${medal.id}.svg`} alt="" draggable={false} style={{ width: "100%", height: "100%", display: "block" }} />
        ) : (
          <>
            <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
              <defs>
                <linearGradient id={`m${uid}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={m1} /><stop offset=".5" stopColor={m2} /><stop offset="1" stopColor={m3} />
                </linearGradient>
                <radialGradient id={`e${uid}`} cx="35%" cy="30%" r="80%">
                  <stop offset="0" stopColor={e1} /><stop offset="1" stopColor={e2} />
                </radialGradient>
                <clipPath id={`c${uid}`}><circle cx="50" cy="50" r="46" /></clipPath>
              </defs>
              {/* Canto con estrías */}
              <circle cx="50" cy="50" r="48" fill={`url(#m${uid})`} />
              {Array.from({ length: 48 }).map((_, i) => (
                <line key={i} x1="50" y1="3" x2="50" y2="7" stroke={m3} strokeOpacity=".35" strokeWidth="1"
                  transform={`rotate(${i * 7.5} 50 50)`} />
              ))}
              <circle cx="50" cy="50" r="40" fill={`url(#m${uid})`} transform="rotate(180 50 50)" />
              <circle cx="50" cy="50" r="35" fill={`url(#e${uid})`} />
              <circle cx="50" cy="50" r="35" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1" />
              {/* Brillo que se desplaza al inclinar */}
              <g clipPath={`url(#c${uid})`}>
                <motion.rect x="-20" y="-10" width="30" height="130" fill="#fff" opacity=".22" transform="rotate(25 50 50)" style={{ x: shine }} />
              </g>
            </svg>
            <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", transform: "translateZ(12px)" }}>
              <Icon size={size * 0.3} strokeWidth={1.8} style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.35))" }} />
            </span>
          </>
        )}
      </motion.div>
      {locked && (
        <span style={{ position: "absolute", right: 2, bottom: 2, width: size * 0.28, height: size * 0.28, borderRadius: "50%",
          display: "grid", placeItems: "center", background: "var(--glass-strong)", border: "1px solid var(--glass-border)", color: "var(--text)" }}>
          <Lock size={size * 0.14} strokeWidth={2} />
        </span>
      )}
      {!locked && count > 1 && (
        <span className="num" style={{ position: "absolute", right: -2, top: -2, minWidth: 24, height: 24, padding: "0 6px", borderRadius: 99,
          display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, background: "var(--accent-strong)", color: "var(--on-accent)",
          boxShadow: "0 0 0 2px var(--bg)" }}>
          {count}
        </span>
      )}
    </motion.button>
  );
}
