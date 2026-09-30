import { useEffect } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { X } from "lucide-react";

// Hoja inferior tipo iOS, de vidrio, que se cierra arrastrando hacia abajo.
export default function Sheet({ open, onClose, title, children }) {
  const drag = useDragControls();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" style={styles.scrim} onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
          <motion.div key="sheet" className="glass glass-strong" style={styles.sheet} role="dialog" aria-modal="true" aria-label={title}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y" dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose(); }}>
            <div style={styles.handle} onPointerDown={(e) => drag.start(e)}>
              <div style={styles.grabber} />
            </div>
            <div style={styles.head} onPointerDown={(e) => { if (e.target.closest("button")) return; drag.start(e); }}>
              <h2>{title}</h2>
              <button className="btn-glass" style={styles.close} onClick={onClose} aria-label="Cerrar">
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div style={styles.body}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const styles = {
  scrim: { position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.35)" },
  sheet: {
    position: "fixed", zIndex: 41, left: 0, right: 0, bottom: 0, margin: "0 auto", maxWidth: 480,
    maxHeight: "calc(100dvh - var(--safe-top) - 24px)", display: "flex", flexDirection: "column",
    borderRadius: "var(--r-lg) var(--r-lg) 0 0", borderBottom: "none",
    padding: "8px 20px calc(var(--safe-bottom) + 20px)",
    background: "color-mix(in srgb, var(--bg) 78%, transparent)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)", backdropFilter: "blur(40px) saturate(180%)",
  },
  handle: { padding: "4px 0 12px", touchAction: "none", cursor: "grab" },
  grabber: { width: 40, height: 5, borderRadius: 99, background: "var(--text-2)", opacity: 0.4, margin: "0 auto" },
  head: { touchAction: "none", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-4)" },
  close: { width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", border: "1px solid var(--glass-border)" },
  body: { overflowY: "auto", overscrollBehavior: "contain", margin: "0 -4px", padding: "0 4px" },
};
