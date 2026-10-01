import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, MessageCircle, Send, UserPlus, X } from "lucide-react";
import { avatarSrc } from "../lib/avatars";

const APP_URL = "https://defit-eta.vercel.app";
const shareText = (name) =>
  `${name} te invitó a DEFIT: contamos calorías y competimos en retos. Regístrate con este correo aquí: ${APP_URL}`;

const share = async (name) => {
  const text = shareText((name || "").split(" ")[0]);
  if (navigator.share) {
    try { await navigator.share({ title: "DEFIT", text }); return; } catch { /* cancelado */ }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
};

// Solicitudes que me enviaron: aceptar o rechazar.
export function Requests({ ch }) {
  const incoming = ch.requests.filter((r) => r.direction === "in");
  const [error, setError] = useState("");
  const answer = async (id, accept) => {
    setError("");
    try { await ch.respondFriend(id, accept); } catch (e) { setError(e.message); }
  };
  if (!incoming.length) return null;
  return (
    <div>
      <p className="eyebrow" style={{ marginBottom: "var(--sp-2)" }}>Solicitudes</p>
      <section className="glass" style={{ padding: "var(--sp-2) var(--sp-4)" }}>
        <AnimatePresence initial={false}>
          {incoming.map((r, i) => (
            <motion.div key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
              style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "14px 0", borderTop: i ? "1px solid var(--hairline)" : "none" }}>
              <img src={avatarSrc(r.avatar)} alt="" style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700 }}>{r.name}</p>
                <p className="caption">Quiere ser tu amigo</p>
              </div>
              <button className="btn btn-glass" style={{ minHeight: 38, width: 38, padding: 0 }} aria-label={`Rechazar a ${r.name}`} onClick={() => answer(r.id, false)}>
                <X size={17} strokeWidth={2.2} />
              </button>
              <button className="btn btn-primary" style={{ minHeight: 38, padding: "0 16px", fontSize: "var(--t-small)" }} onClick={() => answer(r.id, true)}>
                <Check size={16} strokeWidth={2.4} /> Aceptar
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)", paddingBottom: 10 }}>{error}</p>}
      </section>
    </div>
  );
}

// Enviar una solicitud por correo. Las enviadas quedan pendientes hasta que la otra persona responda.
export default function AddFriend({ profile, ch }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [lastInvited, setLastInvited] = useState(null);
  const outgoing = ch.requests.filter((r) => r.direction === "out");

  const send = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const to = email.trim().toLowerCase();
      const r = await ch.sendFriendRequest(to);
      setMsg({
        ok: r !== "not_found" && r !== "self",
        text: {
          sent: "Solicitud enviada. Le llegará un aviso.",
          friends: "Ya son amigos.",
          invited: "Listo: ya puede registrarse con ese correo y la solicitud lo espera.",
          self: "Ese es tu propio correo.",
          not_found: "No encontramos a nadie con ese correo en DEFIT.",
        }[r] || "Listo.",
      });
      setLastInvited(r === "invited" ? to : null);
      if (r !== "not_found" && r !== "self") setEmail("");
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass" style={{ padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <h2>Agregar amigo</h2>
      <p className="muted" style={{ fontSize: "var(--t-small)" }}>
        Escribe el correo con el que se registró. Cuando acepte tu solicitud podrán verse los perfiles y retarse.
      </p>

      <form onSubmit={send} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--sp-2)", alignItems: "end" }}>
        <div className="field">
          <label htmlFor="friend-email">Correo de tu amigo</label>
          <input id="friend-email" type="email" inputMode="email" autoComplete="off" placeholder="amigo@correo.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button className="btn btn-primary" disabled={busy || !email} aria-label="Enviar solicitud">
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
        <motion.button initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="btn btn-glass" onClick={() => share(profile.name)}>
          <MessageCircle size={18} strokeWidth={1.8} /> Mandar el link a {lastInvited}
        </motion.button>
      )}

      {outgoing.length > 0 && (
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>Enviadas</p>
          {outgoing.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", padding: "10px 0", borderTop: "1px solid var(--hairline)" }}>
              {r.avatar && <img src={avatarSrc(r.avatar)} alt="" style={{ width: 30, height: 30, borderRadius: "50%" }} />}
              <span style={{ flex: 1, minWidth: 0, fontSize: "var(--t-small)", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name || r.email}</span>
              {r.email ? (
                <button className="caption" onClick={() => share(profile.name)} style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                  <Clock size={14} strokeWidth={2} /> Aún sin registrarse · <Send size={13} strokeWidth={2} /> Link
                </button>
              ) : (
                <span className="caption" style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                  <Clock size={14} strokeWidth={2} /> Pendiente
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
