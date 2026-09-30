import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera } from "lucide-react";
import { isPhotoAvatar } from "../lib/avatars";
import { uploadAvatar } from "../lib/photoAvatar";

// Casilla "Tu foto" de la cuadrícula de avatares: sube una foto de la galería o la cámara.
export default function PhotoTile({ userId, current, onPhoto, style }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = isPhotoAvatar(current);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setError("");
    try { onPhoto(await uploadAvatar(userId, file)); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      <motion.button type="button" onClick={() => ref.current?.click()} disabled={busy} whileTap={{ scale: 0.88 }} aria-label="Usar mi foto" aria-pressed={active}
        animate={{ scale: active ? 1.06 : 1 }}
        style={{
          ...style, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          background: "var(--field)", color: "var(--text)", fontSize: 12, fontWeight: 700,
          boxShadow: active ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent)" : "0 0 0 1px var(--hairline)",
        }}>
        {active ? <img src={current} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }} />
          : <><Camera size={22} strokeWidth={1.7} /><span>{busy ? "Subiendo…" : "Mi foto"}</span></>}
      </motion.button>
      {error && <p role="alert" style={{ gridColumn: "1 / -1", color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
    </>
  );
}
