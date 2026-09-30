import { useEffect, useState } from "react";
import { UtensilsCrossed, Scale, Trophy, House } from "lucide-react";
import { supabase } from "./lib/supabase";
import { applyPalette } from "./lib/palettes";
import Shell from "./components/Shell";
import AuthScreen from "./screens/AuthScreen";
import ProfileScreen from "./screens/ProfileScreen";
import Placeholder from "./screens/Placeholder";

// Solo en desarrollo: /?demo muestra la app con un perfil ficticio, sin iniciar sesión.
const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has("demo");
const DEMO_PROFILE = { id: "demo", name: "Brayan", avatar: "a3", palette: "noche-azul", onboarded: true };

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("home");

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
  else {
    const screens = {
      home: <Placeholder Icon={House} phase="Fase 2" title="Tu día" text="Aquí verás tus calorías de hoy contra tu meta, calculada con tus datos en el cuestionario inicial." />,
      food: <Placeholder Icon={UtensilsCrossed} phase="Fase 3" title="Comida" text="Registra por foto, búsqueda o manual. La IA estima calorías y macros." />,
      weight: <Placeholder Icon={Scale} phase="Fase 3" title="Peso" text="Tu registro de peso y su evolución en el tiempo." />,
      challenges: <Placeholder Icon={Trophy} phase="Fase 4" title="Retos" text="Reta a alguien a cumplir su meta calórica. Progreso en tiempo real y medallas." />,
      profile: <ProfileScreen profile={profile} onChange={patchProfile} />,
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
