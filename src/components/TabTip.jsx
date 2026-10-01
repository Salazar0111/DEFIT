import { AnimatePresence, motion } from "motion/react";
import { avatarSrc } from "../lib/avatars";

export const TAB_TIPS = {
  home: "Este es tu día. El anillo muestra cuántas calorías te quedan y yo cambio de ánimo según cómo vas. Tócame y te cuento más.",
  food: "Toca «Agregar comida»: saca una foto o escribe lo que comiste y la IA calcula. Si algo no cuadra, usa «Ajustar ingredientes». Con las flechas ves días anteriores y con la caneca borras algo.",
  workout: "Aquí ves tu semana y la sesión de hoy. Toca «Empezar» y registra cada serie. Si entrenaste otra cosa, usa «Hice otra cosa».",
  challenges: "Crea un reto con «Nuevo reto». En Social ves a tus amigos y lo que pasa en el grupo, y en Medallas tus premios.",
  profile: "Aquí ves tu plan y cómo te ven tus amigos. En «Ajustes» están colores, notificaciones, Face ID y el tutorial.",
};

// Burbuja del personaje la primera vez que se entra a una pestaña.
export default function TabTip({ tab, avatar, show, onDismiss }) {
  return (
    <AnimatePresence>
      {show && TAB_TIPS[tab] && (
        <motion.div key={tab} layout initial={{ opacity: 0, y: -12, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -12, height: 0, marginBottom: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: "hidden", marginBottom: "var(--sp-4)" }}>
          <div className="glass" style={styles.card}>
            <motion.img src={avatarSrc(avatar, "happy")} alt="" initial={{ rotate: -12, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.15 }}
              style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
              <p style={{ fontSize: "var(--t-small)", lineHeight: 1.45, fontWeight: 700 }}>{TAB_TIPS[tab]}</p>
              <button className="btn btn-primary" style={{ alignSelf: "flex-start", minHeight: 34, padding: "0 16px", fontSize: "var(--t-caption)" }} onClick={onDismiss}>
                Entendido
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles = {
  card: {
    display: "flex", gap: "var(--sp-3)", alignItems: "flex-start", padding: "var(--sp-4)", borderRadius: "var(--r-md)",
    borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
  },
};
