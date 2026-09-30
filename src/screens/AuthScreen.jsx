import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Mail, ScanFace } from "lucide-react";
import { supabase } from "../lib/supabase";
import { loginWithPasskey, passkeySupported } from "../lib/passkey";

const ERRORS = {
  "Invalid login credentials": "Correo o contraseña incorrectos.",
  "Email not confirmed": "Confirma tu correo antes de entrar. Revisa tu bandeja.",
  "User already registered": "Ya existe una cuenta con ese correo.",
  // El trigger de Supabase rechaza correos que no están en allowed_emails.
  "Database error saving new user": "Este correo no tiene acceso todavía. Pide que te agreguen.",
};

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
};

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // login | signup | sent
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const faceId = async () => {
    setError("");
    setBusy(true);
    try { await loginWithPasskey(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setMode("sent");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      setError(ERRORS[err.message] || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <motion.div {...fade} style={styles.brand}>
        <div style={styles.mark}>D</div>
        <h1 style={styles.title}>DEFIT</h1>
        <p className="muted" style={{ fontSize: "var(--t-small)" }}>
          Cuenta lo que comes. Compite con los tuyos.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === "sent" ? (
          <motion.div key="sent" {...fade} className="glass" style={styles.card}>
            <div style={styles.iconBubble}><Mail size={22} strokeWidth={1.6} /></div>
            <h2>Revisa tu correo</h2>
            <p className="muted">
              Te enviamos un enlace a <strong style={{ color: "var(--text)" }}>{email}</strong>. Ábrelo para
              activar tu cuenta y luego inicia sesión aquí.
            </p>
            <button className="btn btn-glass btn-block" onClick={() => setMode("login")}>
              Ya lo confirmé
            </button>
          </motion.div>
        ) : (
          <motion.form key={mode} {...fade} onSubmit={submit} className="glass" style={styles.card}>
            <h2>{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h2>

            {mode === "login" && passkeySupported() && (
              <>
                <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={faceId}>
                  <ScanFace size={20} strokeWidth={1.8} /> Entrar con Face ID
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
                  <span className="divider" style={{ flex: 1 }} /><span className="caption">o con tu correo</span><span className="divider" style={{ flex: 1 }} />
                </div>
              </>
            )}

            {mode === "signup" && (
              <div className="field">
                <label htmlFor="name">Nombre</label>
                <input id="name" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Cómo quieres que te vean" autoComplete="given-name" required maxLength={24} />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com" autoComplete="email" inputMode="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres" minLength={8} required
                autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} role="alert"
                  style={{ color: "var(--danger)", fontSize: "var(--t-small)", fontWeight: 700 }}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button className={`btn btn-block ${mode === "login" && passkeySupported() ? "btn-glass" : "btn-primary"}`} disabled={busy}>
              {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {mode !== "sent" && (
        <button className="btn btn-text" style={{ alignSelf: "center" }}
          onClick={() => { setError(""); setMode(mode === "login" ? "signup" : "login"); }}>
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta"}
        </button>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    position: "relative",
    zIndex: 1,
    minHeight: "100dvh",
    maxWidth: 440,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "var(--sp-5)",
    padding: "calc(var(--safe-top) + 32px) 20px calc(var(--safe-bottom) + 24px)",
  },
  brand: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--sp-2)" },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    fontSize: 26,
    fontWeight: 700,
    color: "var(--on-accent)",
    background: "linear-gradient(145deg, var(--accent), var(--accent-strong))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 10px 28px color-mix(in srgb, var(--accent-strong) 45%, transparent)",
    marginBottom: "var(--sp-2)",
  },
  title: { fontSize: 40, letterSpacing: "-0.03em" },
  card: { display: "flex", flexDirection: "column", gap: "var(--sp-4)", padding: "var(--sp-5)" },
  iconBubble: {
    width: 48, height: 48, borderRadius: 16, display: "grid", placeItems: "center",
    background: "var(--glass-strong)", border: "1px solid var(--glass-border)",
  },
};
