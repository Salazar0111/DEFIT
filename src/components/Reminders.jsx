import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellOff, Share, SquarePlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { REMINDERS, disablePush, enablePush, pushStatus, sendTestPush } from "../lib/push";

const DEFAULTS = {
  breakfast: { on: true, at: "07:30" }, lunch: { on: true, at: "13:00" }, dinner: { on: true, at: "19:30" },
  weigh: { on: true, at: "07:00" }, nudge: { on: true, at: "21:30" },
};

export default function Reminders({ profile, onChange }) {
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const cfg = { ...DEFAULTS, ...(profile.reminders || {}) };
  const demo = profile.id === "demo";

  useEffect(() => {
    if (demo) { setStatus("on"); return; } // demo: muestra la lista sin pedir permisos
    pushStatus().then(setStatus).catch(() => setStatus("unsupported"));
  }, [demo]);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3500); };

  const update = async (kind, patch) => {
    const reminders = { ...cfg, [kind]: { ...cfg[kind], ...patch } };
    onChange({ reminders });
    if (!demo) await supabase.from("profiles").update({ reminders }).eq("id", profile.id);
  };

  const toggle = async () => {
    setBusy(true);
    try {
      if (status === "on") { await disablePush(); setStatus("off"); }
      else { await enablePush(profile.id); setStatus("on"); flash("Listo. Te llegarán los recordatorios."); }
    } catch (e) {
      flash(e.message);
      setStatus(await pushStatus());
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try { await sendTestPush(); flash("Enviada. Debería llegarte en segundos."); }
    catch (e) { flash(e.message); }
    finally { setBusy(false); }
  };

  return (
    <section className="glass" style={{ padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--sp-3)" }}>
        <h2>Notificaciones</h2>
        {(status === "on" || status === "off") && (
          <Switch on={status === "on"} disabled={busy} onChange={toggle} label="Activar notificaciones" />
        )}
      </div>

      {status === "install" && (
        <div style={styles.note}>
          <p style={{ fontWeight: 700 }}>Instala DEFIT para recibir avisos</p>
          <p className="muted" style={{ fontSize: "var(--t-small)" }}>
            En iPhone, las notificaciones solo funcionan con la app en tu pantalla de inicio:
          </p>
          <p style={styles.step}><Share size={16} strokeWidth={1.8} /> Toca Compartir en Safari</p>
          <p style={styles.step}><SquarePlus size={16} strokeWidth={1.8} /> Elige “Agregar a pantalla de inicio”</p>
          <p className="muted" style={{ fontSize: "var(--t-small)" }}>Luego abre DEFIT desde el ícono y vuelve aquí.</p>
        </div>
      )}
      {status === "denied" && (
        <div style={styles.note}>
          <p style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}><BellOff size={18} strokeWidth={1.8} /> Notificaciones bloqueadas</p>
          <p className="muted" style={{ fontSize: "var(--t-small)" }}>Actívalas en los ajustes del teléfono para DEFIT y vuelve a intentarlo.</p>
        </div>
      )}
      {status === "unsupported" && (
        <p className="muted" style={{ fontSize: "var(--t-small)" }}>Este navegador no soporta notificaciones push.</p>
      )}
      {status === "off" && (
        <p className="muted" style={{ fontSize: "var(--t-small)" }}>Actívalas para recibir al instante retos, empujones y resultados, y recordatorios solo cuando falte algo por registrar.</p>
      )}

      <AnimatePresence initial={false}>
        {status === "on" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <p className="caption" style={{ marginBottom: 4 }}>Retos, empujones y resultados llegan siempre al instante. Estos son tus recordatorios:</p>
            {REMINDERS.map((r, i) => (
              <div key={r.id} style={{ ...styles.row, borderTop: i ? "1px solid var(--hairline)" : "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, opacity: cfg[r.id].on ? 1 : 0.6 }}>{r.label}</p>
                  <p className="caption">{r.hint}</p>
                </div>
                <input type="time" value={cfg[r.id].at} disabled={!cfg[r.id].on} aria-label={`Hora de ${r.label}`}
                  onChange={(e) => e.target.value && update(r.id, { at: e.target.value })} style={styles.time} />
                <Switch small on={cfg[r.id].on} onChange={() => update(r.id, { on: !cfg[r.id].on })} label={r.label} />
              </div>
            ))}
            <button className="btn btn-glass" style={{ marginTop: "var(--sp-3)" }} disabled={busy} onClick={test}>
              <Bell size={18} strokeWidth={1.8} /> Enviar notificación de prueba
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {msg && (
          <motion.p role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ fontWeight: 700, fontSize: "var(--t-small)" }}>{msg}</motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}

function Switch({ on, onChange, disabled, label, small }) {
  const w = small ? 44 : 52, h = small ? 26 : 30, k = h - 6;
  return (
    <button role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onChange}
      style={{
        width: w, height: h, borderRadius: 99, padding: 3, flexShrink: 0, display: "flex",
        justifyContent: on ? "flex-end" : "flex-start",
        background: on ? "linear-gradient(180deg, var(--accent), var(--accent-strong))" : "var(--hairline)",
        border: "1px solid var(--glass-border)", transition: "background 250ms", opacity: disabled ? 0.6 : 1,
      }}>
      <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 34 }}
        style={{ width: k, height: k, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,.25)" }} />
    </button>
  );
}

const styles = {
  note: {
    display: "flex", flexDirection: "column", gap: "var(--sp-2)", padding: "var(--sp-4)", borderRadius: "var(--r-md)",
    background: "var(--field)", border: "1px solid var(--hairline)",
  },
  step: { display: "flex", alignItems: "center", gap: 8, fontSize: "var(--t-small)", fontWeight: 700 },
  row: { display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "12px 0" },
  time: {
    height: 36, padding: "0 8px", borderRadius: 10, background: "var(--field)", border: "1px solid var(--hairline)",
    fontWeight: 700, fontVariantNumeric: "tabular-nums",
  },
};
