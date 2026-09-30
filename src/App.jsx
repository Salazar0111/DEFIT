import { useEffect, useState } from "react";
import { UtensilsCrossed, Scale, Trophy } from "lucide-react";
import { supabase } from "./lib/supabase";
import { applyPalette } from "./lib/palettes";
import Shell from "./components/Shell";
import AuthScreen from "./screens/AuthScreen";
import ProfileScreen from "./screens/ProfileScreen";
import Placeholder from "./screens/Placeholder";
import Onboarding from "./screens/Onboarding";
import HomeScreen from "./screens/HomeScreen";

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
  const [tab, setTab] = useState("home");
  const [editingPlan, setEditingPlan] = useState(false);

  useEffect(() => {
    if (DEMO) { setSession({ user: { id: "demo" } }); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
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
    const screens = {
      home: <HomeScreen profile={profile} onEditPlan={() => setEditingPlan(true)} />,
      food: <Placeholder Icon={UtensilsCrossed} phase="Fase 3" title="Comida" text="Registra por foto, búsqueda o manual. La IA estima calorías y macros." />,
      weight: <Placeholder Icon={Scale} phase="Fase 3" title="Peso" text="Tu registro de peso y su evolución en el tiempo." />,
      challenges: <Placeholder Icon={Trophy} phase="Fase 4" title="Retos" text="Reta a alguien a cumplir su meta calórica. Progreso en tiempo real y medallas." />,
      profile: <ProfileScreen profile={profile} onChange={patchProfile} onEditPlan={() => setEditingPlan(true)} />,
    };
    content = (
      <Shell profile={profile} tab={tab} onTab={setTab}>
        {screens[tab]}
      </Shell>
    );
  }

  return (
    <>
      <div className="ambient" aria-hidden="true" />
      {content}
    </>
  );
}
