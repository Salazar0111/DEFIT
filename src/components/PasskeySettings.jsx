import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ScanFace, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { passkeySupported, registerPasskey } from "../lib/passkey";

// Perfil → Entrar con Face ID: activar en este dispositivo y ver/quitar las llaves guardadas.
export default function PasskeySettings({ profile }) {
  const demo = profile.id === "demo";
  const [keys, setKeys] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    if (demo) return;
    const { data } = await supabase.from("passkeys").select("id, device, created_at, last_used_at").order("created_at");
    setKeys(data || []);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!passkeySupported()) return null;

  const activate = async () => {
    setBusy(true); setMsg(null);
    try { await registerPasskey(); setMsg({ ok: true, text: "Listo. La próxima vez entra con Face ID." }); await load(); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    setKeys((k) => k.filter((x) => x.id !== id));
    await supabase.from("passkeys").delete().eq("id", id);
  };

  return (
    <section className="glass" style={{ padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
        <ScanFace size={24} strokeWidth={1.7} style={{ color: "var(--accent)" }} />
        <h2 style={{ flex: 1 }}>Entrar con Face ID</h2>
      </div>
      <p className="muted" style={{ fontSize: "var(--t-small)" }}>
        Entra sin escribir tu contraseña. Tu llave se guarda en el llavero de tu teléfono.
      </p>

      {keys.map((k) => (
        <div key={k.id} style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "10px 0", borderTop: "1px solid var(--hairline)" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700 }}>{k.device || "Dispositivo"}</p>
            <p className="caption">Activado el {new Date(k.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</p>
          </div>
          <button onClick={() => remove(k.id)} aria-label="Quitar" style={{ width: 36, height: 36, display: "grid", placeItems: "center", color: "var(--text-2)" }}>
            <Trash2 size={17} strokeWidth={1.7} />
          </button>
        </div>
      ))}

      <button className="btn btn-primary" disabled={busy} onClick={activate}>
        <ScanFace size={18} strokeWidth={2} /> {busy ? "Esperando Face ID…" : keys.length ? "Activar en otro dispositivo" : "Activar en este teléfono"}
      </button>

      <AnimatePresence>
        {msg && (
          <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status"
            style={{ fontSize: "var(--t-small)", fontWeight: 700, color: msg.ok ? "var(--text)" : "var(--danger)" }}>{msg.text}</motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
