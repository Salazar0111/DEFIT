import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, MessageCircle, Send, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";

const APP_URL = "https://defit-eta.vercel.app";

const ERRORS = {
  BAD_EMAIL: "Ese correo no parece válido.",
  NOT_ALLOWED: "Solo el administrador puede invitar.",
};

const shareText = (name) =>
  `${name} te invitó a DEFIT: contamos calorías y competimos en retos. Regístrate con este correo aquí: ${APP_URL}`;

export default function InviteFriends({ profile }) {
  const demo = profile.id === "demo";
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [lastInvited, setLastInvited] = useState(null);
  // Solo quien tiene permiso (el administrador) ve esta sección.
  const [allowed, setAllowed] = useState(demo);

  const load = async () => {
    if (demo) { setInvites([{ email: "claudiamec0110@gmail.com", joined: true }]); return; }
    const { data } = await supabase.rpc("my_invites");
    setInvites(data || []);
  };
  useEffect(() => {
    if (demo) { load(); return; }
    supabase.rpc("can_invite").then(({ data }) => { setAllowed(!!data); if (data) load(); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const invite = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (!demo) {
        const { data, error } = await supabase.rpc("invite_friend", { friend_email: email });
        if (error) throw new Error(ERRORS[Object.keys(ERRORS).find((k) => error.message.includes(k))] || "No se pudo invitar.");
        if (data === "exists") { setMsg({ ok: true, text: "Ese correo ya tiene acceso. Solo mándale el link." }); }
        else { setMsg({ ok: true, text: "Listo, ya puede registrarse con ese correo." }); }
      }
      setLastInvited(email.trim().toLowerCase());
      setEmail("");
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const sendLink = async () => {
    const text = shareText((profile.name || "").split(" ")[0]);
    if (navigator.share) {
      try { await navigator.share({ title: "DEFIT", text }); return; } catch { /* cancelado */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (!allowed) return null;

  return (
    <section className="glass" style={{ padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2>Invitar amigos</h2>
        <span className="caption num">{invites.length} invitados</span>
      </div>
      <p className="muted" style={{ fontSize: "var(--t-small)" }}>
        Escribe su correo para darle acceso y mándale el link. Así podrán retarse.
      </p>

      <form onSubmit={invite} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--sp-2)", alignItems: "end" }}>
        <div className="field">
          <label htmlFor="inv-email">Correo de tu amigo</label>
          <input id="inv-email" type="email" inputMode="email" autoComplete="off" placeholder="amigo@correo.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button className="btn btn-primary" disabled={busy || !email} aria-label="Invitar">
          <UserPlus size={18} strokeWidth={2} />
        </button>
      </form>

      <AnimatePresence>
        {msg && (
          <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status"
            style={{ fontSize: "var(--t-small)", fontWeight: 700, color: msg.ok ? "var(--text)" : "var(--danger)" }}>
            {msg.text}
          </motion.p>
        )}
      </AnimatePresence>

      {lastInvited && (
        <motion.button initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="btn btn-glass" onClick={sendLink}>
          <MessageCircle size={18} strokeWidth={1.8} /> Mandar el link a {lastInvited}
        </motion.button>
      )}

      {invites.length > 0 && (
        <div>
          {invites.map((i) => (
            <div key={i.email} style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", padding: "10px 0", borderTop: "1px solid var(--hairline)" }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: "var(--t-small)", overflow: "hidden", textOverflow: "ellipsis" }}>{i.email}</span>
              {i.joined ? (
                <span className="caption" style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, color: "var(--accent)" }}>
                  <Check size={14} strokeWidth={2.4} /> Ya entró
                </span>
              ) : (
                <button className="caption" onClick={sendLink} style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                  <Clock size={14} strokeWidth={2} /> Pendiente · <Send size={13} strokeWidth={2} /> Reenviar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
