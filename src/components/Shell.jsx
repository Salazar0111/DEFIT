import { AnimatePresence, motion } from "motion/react";
import { House, UtensilsCrossed, Dumbbell, Trophy, UserRound } from "lucide-react";
import Avatar from "./Avatar";

export const TABS = [
  { id: "home", label: "Hoy", Icon: House },
  { id: "food", label: "Comida", Icon: UtensilsCrossed },
  { id: "workout", label: "Entreno", Icon: Dumbbell },
  { id: "challenges", label: "Retos", Icon: Trophy },
  { id: "profile", label: "Perfil", Icon: UserRound },
];

const today = () => {
  const s = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function Shell({ profile, tab, onTab, children }) {
  return (
    <div style={styles.app}>
      {/* Encabezado: respeta la isla / notch con safe-area-inset-top */}
      <header className="glass" style={styles.header}>
        <Avatar id={profile.avatar} size={42} ring onClick={() => onTab("profile")} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="caption">{today()}</p>
          <h1 style={styles.name}>Hola, {profile.name}</h1>
        </div>
      </header>

      <main style={styles.main}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="glass" style={styles.nav} aria-label="Navegación principal">
        {TABS.map(({ id, label, Icon }) => {
          const active = id === tab;
          return (
            <button key={id} onClick={() => onTab(id)} style={styles.tab} aria-current={active ? "page" : undefined}>
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  style={styles.pill}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon size={22} strokeWidth={active ? 2 : 1.6} style={{ position: "relative", color: active ? "var(--accent)" : "var(--text)" }} />
              <span style={{ ...styles.tabLabel, color: active ? "var(--accent)" : "var(--text)", opacity: active ? 1 : 0.8 }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

const styles = {
  app: { position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto", minHeight: "100dvh" },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    gap: "var(--sp-3)",
    padding: "calc(var(--safe-top) + 12px) 20px 14px",
    borderRadius: "0 0 var(--r-lg) var(--r-lg)",
    borderTop: "none",
  },
  name: {
    fontSize: "var(--t-h2)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  main: { padding: "20px 16px calc(var(--safe-bottom) + 112px)" },
  nav: {
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "calc(var(--safe-bottom) + 12px)",
    width: "calc(100% - 24px)",
    maxWidth: 456,
    zIndex: 30,
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    padding: 6,
    borderRadius: "var(--r-pill)",
    background: "var(--glass-strong)",
  },
  tab: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "8px 0 6px",
    borderRadius: "var(--r-pill)",
  },
  pill: {
    position: "absolute",
    inset: 0,
    borderRadius: "var(--r-pill)",
    background: "color-mix(in srgb, var(--accent) 16%, transparent)",
    border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
  },
  tabLabel: { position: "relative", fontSize: 12, fontWeight: 700, letterSpacing: "0.01em" },
};
