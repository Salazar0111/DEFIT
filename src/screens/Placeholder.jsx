import { motion } from "motion/react";

// Pantallas que llegan en las próximas fases.
export default function Placeholder({ Icon, title, text, phase }) {
  return (
    <div className="glass" style={{ padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.05 }}
        style={{
          width: 56, height: 56, borderRadius: 18, display: "grid", placeItems: "center",
          background: "color-mix(in srgb, var(--accent) 14%, transparent)",
          border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)",
          color: "var(--accent)",
        }}
      >
        <Icon size={26} strokeWidth={1.6} />
      </motion.div>
      <p className="eyebrow">{phase}</p>
      <h1>{title}</h1>
      <p className="muted">{text}</p>
    </div>
  );
}
