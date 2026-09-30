import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lock } from "lucide-react";
import { supabase } from "./lib/supabase";
import { applyPalette } from "./lib/palettes";
import Shell from "./components/Shell";
import AuthScreen from "./screens/AuthScreen";
import ProfileScreen from "./screens/ProfileScreen";
import Onboarding from "./screens/Onboarding";
import HomeScreen from "./screens/HomeScreen";
import FoodScreen from "./screens/FoodScreen";
import WeightScreen from "./screens/WeightScreen";
import ChallengesScreen from "./screens/ChallengesScreen";
import Sheet from "./components/Sheet";
import Medal from "./components/Medal";
import { useChallenges } from "./lib/useChallenges";
import { medalById } from "./lib/medals";

// Solo en desarrollo: /?demo muestra la app con un perfil ficticio, sin iniciar sesión.
// /?demo=nuevo arranca desde el cuestionario inicial.
const params = new URLSearchParams(location.search);
const DEMO = import.meta.env.DEV && params.has("demo");
const DEMO_PROFILE = params.get("demo") === "nuevo"
  ? { id: "demo", name: "Brayan", avatar: "a1", palette: "noche-azul", onboarded: false }
  : {
      id: "demo", name: "Brayan", avatar: "a3", palette: "noche-azul", onboarded: true,
      sex: "m", birthdate: "1995-05-10", height_cm: 178, weight_kg: 92, frame: "medium",
      activity: "moderate", deficit: 800, bmr: 1883, tdee: 2919, target_kcal: 2119,
    };

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState(() => {
    const t = params.get("tab");
    return ["home", "food", "weight", "challenges", "profile"].includes(t) ? t : "home";
  });
  const [editingPlan, setEditingPlan] = useState(false);

  useEffect(() => {
    if (DEMO) { setSession({ user: { id: "demo" } }); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setProfile(null); setTab("home"); return; }
    if (DEMO) { setProfile(DEMO_PROFILE); return; }
    supabase.from("profiles").select("*").eq("id", session.user.id).single()
      .then(({ data }) => data && setProfile(data));
  }, [session?.user.id]);

  useEffect(() => { if (profile) applyPalette(profile.palette); }, [profile?.palette]);

  const patchProfile = (patch) => setProfile((p) => ({ ...p, ...patch }));

  let content = null;
  if (session === undefined || (session && !profile)) content = null;
  else if (!session) content = <AuthScreen />;
  else if (!profile.onboarded || editingPlan) {
    content = (
      <Onboarding
        key={editingPlan ? "edit" : "new"}
        profile={profile}
        edit={profile.onboarded}
        onDone={(patch) => { patchProfile(patch); setEditingPlan(false); setTab("home"); }}
        onCancel={() => setEditingPlan(false)}
      />
    );
  } else {
    content = <Main profile={profile} tab={tab} setTab={setTab} patchProfile={patchProfile} onEditPlan={() => setEditingPlan(true)} />;
  }

  return (
    <>
      <div className="ambient" aria-hidden="true" />
      {content}
    </>
  );
}

// App con sesión y plan listo. Aquí vive el estado de retos (en tiempo real) que comparten las pantallas.
function Main({ profile, tab, setTab, patchProfile, onEditPlan }) {
  const ch = useChallenges(profile);
  const [notice, setNotice] = useState("");
  const newMedal = ch.medals.find((m) => !m.seen);

  const editPlan = () => {
    if (!ch.planLocked) return onEditPlan();
    setNotice("Tu plan está fijo mientras estés en un reto. Podrás ajustarlo cuando termine.");
    setTimeout(() => setNotice(""), 4000);
  };

  const screens = {
    home: <HomeScreen profile={profile} ch={ch} onEditPlan={editPlan} onOpenChallenges={() => setTab("challenges")} />,
    food: <FoodScreen profile={profile} />,
    weight: <WeightScreen profile={profile} onEditPlan={editPlan} />,
    challenges: <ChallengesScreen profile={profile} ch={ch} />,
    profile: <ProfileScreen profile={profile} onChange={patchProfile} onEditPlan={editPlan} planLocked={ch.planLocked} />,
  };

  return (
    <>
      <Shell profile={profile} tab={tab} onTab={setTab}>
        {screens[tab]}
      </Shell>

      <AnimatePresence>
        {notice && (
          <motion.div role="status" className="glass glass-strong" style={styles.toast}
            initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }}>
            <Lock size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "var(--t-small)", fontWeight: 700 }}>{notice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={!!newMedal} onClose={ch.markMedalsSeen} title="Nueva medalla">
        {newMedal && medalById(newMedal.kind) && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-3)", textAlign: "center", paddingBottom: "var(--sp-4)" }}>
            <motion.div initial={{ scale: 0.3, rotateY: -540 }} animate={{ scale: 1, rotateY: 0 }}
              transition={{ type: "spring", stiffness: 70, damping: 12, delay: 0.2 }}>
              <Medal medal={medalById(newMedal.kind)} size={200} spin />
            </motion.div>
            <h1>{medalById(newMedal.kind).name}</h1>
            <p className="muted">{medalById(newMedal.kind).desc}</p>
            <button className="btn btn-primary btn-block" onClick={ch.markMedalsSeen}>Genial</button>
          </div>
        )}
      </Sheet>
    </>
  );
}

const styles = {
  toast: {
    position: "fixed", zIndex: 50, left: "50%", top: "calc(var(--safe-top) + 12px)", width: "calc(100% - 32px)", maxWidth: 440,
    display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "14px 16px", borderRadius: "var(--r-md)",
  },
};
