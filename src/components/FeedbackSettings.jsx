import { useState } from "react";
import { motion } from "motion/react";
import { Vibrate, Volume2 } from "lucide-react";
import { fx, getFx, iosHapticsSupported, setFx } from "../lib/feedback";

// Perfil → Sonido y vibración (por dispositivo).
export default function FeedbackSettings() {
  const [p, setP] = useState(getFx());
  const toggle = (key) => {
    const next = !p[key];
    setFx({ [key]: next });
    setP(getFx());
    if (next) fx(key === "sound" ? "success" : "soft"); // muestra cómo se siente
  };
  return (
    <section className="glass" style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", flexDirection: "column" }}>
      <Row Icon={Volume2} title="Sonidos" text="Tonos suaves al registrar, récords y medallas." on={p.sound} onToggle={() => toggle("sound")} />
      <div className="divider" />
      <Row Icon={Vibrate} title="Vibración" text="Toques suaves en los momentos clave." on={p.haptics} onToggle={() => toggle("haptics")} />
      {p.haptics && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", paddingBottom: "var(--sp-2)" }}>
          <button className="btn btn-glass" style={{ minHeight: 40, fontSize: "var(--t-small)" }} onClick={() => fx("success")}>Probar vibración</button>
          {iosHapticsSupported() === false && (
            <p className="caption">Tu iPhone tiene una versión de iOS anterior a la 17.4, que no permite esta vibración desde una app web.</p>
          )}
          {iosHapticsSupported() !== null && iosHapticsSupported() !== false && (
            <p className="caption">Si no la sientes, revisa en Ajustes → Sonidos y hápticos que «Hápticos del sistema» esté activado.</p>
          )}
        </div>
      )}
    </section>
  );
}

function Row({ Icon, title, text, on, onToggle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "12px 0" }}>
      <Icon size={22} strokeWidth={1.7} style={{ color: "var(--accent)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700 }}>{title}</p>
        <p className="caption">{text}</p>
      </div>
      <button role="switch" aria-checked={on} aria-label={title} onClick={onToggle}
        style={{ width: 52, height: 30, borderRadius: 99, padding: 3, display: "flex", justifyContent: on ? "flex-end" : "flex-start", flexShrink: 0,
          background: on ? "linear-gradient(180deg, var(--accent), var(--accent-strong))" : "var(--hairline)", border: "1px solid var(--glass-border)", transition: "background 250ms" }}>
        <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 34 }}
          style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,.25)" }} />
      </button>
    </div>
  );
}
