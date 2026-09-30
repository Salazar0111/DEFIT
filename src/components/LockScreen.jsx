import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ScanFace } from "lucide-react";
import { supabase } from "../lib/supabase";
import { avatarSrc } from "../lib/avatars";
import { disableLock, enableLock, lockAvailable, lockConfig, unlock } from "../lib/lock";

// Pantalla de bloqueo: tu personaje dormido hasta que desbloqueas con Face ID.
export function LockScreen({ profile, onUnlock }) {
  const [error, setError] = useState("");
  const [waking, setWaking] = useState(false);

  const tryUnlock = async () => {
    setError("");
    try {
      if (await unlock(lockConfig(profile.id))) {
        setWaking(true);
        setTimeout(onUnlock, 450);
      }
    } catch {
      setError("No se pudo verificar. Intenta de nuevo.");
    }
  };

  const usePassword = async () => {
    disableLock();
    await supabase.auth.signOut();
    onUnlock();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.wrap}>
      <motion.img src={avatarSrc(profile.avatar, waking ? "party" : "sleepy")} alt=""
        animate={waking ? { scale: [1, 1.15, 1], y: [0, -20, 0] } : { y: [0, 4, 0] }}
        transition={waking ? { duration: 0.45 } : { duration: 3, repeat: Infinity }}
        style={{ width: 132, height: 132, borderRadius: "50%" }} />
      <h1 style={{ textAlign: "center" }}>Hola, {(profile.name || "").split(" ")[0]}</h1>
      <p className="muted" style={{ textAlign: "center" }}>DEFIT está bloqueado.</p>
      <button className="btn btn-primary" style={{ minWidth: 240 }} onClick={tryUnlock}>
        <ScanFace size={20} strokeWidth={1.8} /> Desbloquear con Face ID
      </button>
      {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
      <button className="btn btn-text" onClick={usePassword}>Entrar con contraseña</button>
    </motion.div>
  );
}

// Interruptor en Perfil.
export function LockToggle({ profile }) {
  const [available, setAvailable] = useState(false);
  const [on, setOn] = useState(!!lockConfig(profile.id));
  const [error, setError] = useState("");

  useEffect(() => { lockAvailable().then(setAvailable); }, []);
  if (!available) return null;

  const toggle = async () => {
    setError("");
    if (on) { disableLock(); setOn(false); return; }
    try {
      const { data } = await supabase.auth.getUser();
      await enableLock(profile, data.user?.email);
      setOn(true);
    } catch {
      setError("No se activó. Revisa que Face ID esté configurado.");
    }
  };

  return (
    <section className="glass" style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
        <ScanFace size={22} strokeWidth={1.7} style={{ color: "var(--accent)" }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700 }}>Bloquear con Face ID</p>
          <p className="caption">Pide Face ID al abrir DEFIT en este teléfono.</p>
        </div>
        <button role="switch" aria-checked={on} aria-label="Bloquear con Face ID" onClick={toggle}
          style={{ width: 52, height: 30, borderRadius: 99, padding: 3, display: "flex", justifyContent: on ? "flex-end" : "flex-start",
            background: on ? "linear-gradient(180deg, var(--accent), var(--accent-strong))" : "var(--hairline)",
            border: "1px solid var(--glass-border)", transition: "background 250ms", flexShrink: 0 }}>
          <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 34 }}
            style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,.25)" }} />
        </button>
      </div>
      {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
    </section>
  );
}

const styles = {
  wrap: {
    position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: "var(--sp-4)", padding: "calc(var(--safe-top) + 24px) 24px calc(var(--safe-bottom) + 24px)",
    background: "color-mix(in srgb, var(--bg) 88%, transparent)",
    WebkitBackdropFilter: "blur(30px) saturate(160%)", backdropFilter: "blur(30px) saturate(160%)",
  },
};
