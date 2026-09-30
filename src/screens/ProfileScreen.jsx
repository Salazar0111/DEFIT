import { useState } from "react";
import { motion } from "motion/react";
import { Check, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import { AVATARS, avatarSrc } from "../lib/avatars";
import { PALETTES } from "../lib/palettes";

export default function ProfileScreen({ profile, onChange }) {
  const [saving, setSaving] = useState(false);

  const save = async (patch) => {
    onChange(patch); // optimista: la UI cambia al instante
    if (profile.id === "demo") return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    setSaving(false);
    if (error) onChange({ avatar: profile.avatar, palette: profile.palette });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <section className="glass" style={styles.section}>
        <div style={styles.head}>
          <h2>Tu avatar</h2>
          <span className="caption">{saving ? "Guardando…" : ""}</span>
        </div>
        <div style={styles.avatarGrid}>
          {AVATARS.map((a) => {
            const active = a.id === profile.avatar;
            return (
              <motion.button
                key={a.id}
                onClick={() => save({ avatar: a.id })}
                whileTap={{ scale: 0.88 }}
                animate={{ scale: active ? 1.06 : 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
                aria-label={a.name}
                aria-pressed={active}
                style={{
                  ...styles.avatarBtn,
                  boxShadow: active
                    ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent)"
                    : "0 0 0 1px var(--hairline)",
                }}
              >
                <img src={avatarSrc(a.id)} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", display: "block" }} />
              </motion.button>
            );
          })}
        </div>
        <p className="caption">Avatares provisionales. Los finales llegan con tu diseño.</p>
      </section>

      <section className="glass" style={styles.section}>
        <h2>Paleta</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          {PALETTES.map((p) => {
            const active = p.id === profile.palette;
            return (
              <button key={p.id} onClick={() => save({ palette: p.id })} style={styles.paletteRow} aria-pressed={active}>
                <span style={{ ...styles.swatch, background: p.bg }}>
                  <span style={{ ...styles.swatchDot, background: p.accent }} />
                </span>
                <span style={{ flex: 1, textAlign: "left" }}>
                  <span style={{ display: "block", fontWeight: 700 }}>{p.name}</span>
                  <span className="caption">{p.hint}</span>
                </span>
                {active && (
                  <motion.span layoutId="palette-check" style={styles.check}>
                    <Check size={16} strokeWidth={2.4} />
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <button className="btn btn-glass btn-block" onClick={() => supabase.auth.signOut()}>
        <LogOut size={18} strokeWidth={1.8} /> Cerrar sesión
      </button>
    </div>
  );
}

const styles = {
  section: { padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  avatarGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-4)" },
  avatarBtn: { aspectRatio: "1", borderRadius: "50%", padding: 0 },
  paletteRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--sp-3)",
    padding: "var(--sp-3)",
    borderRadius: "var(--r-md)",
    background: "var(--field)",
    border: "1px solid var(--hairline)",
    minHeight: 64,
  },
  swatch: {
    width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center",
    border: "1px solid var(--hairline)", flexShrink: 0,
  },
  swatchDot: { width: 16, height: 16, borderRadius: "50%" },
  check: {
    width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center",
    background: "var(--accent-strong)", color: "var(--on-accent)",
  },
};
