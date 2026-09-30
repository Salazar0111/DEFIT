import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Crown, HandHeart, Lock, ScanFace, Zap } from "lucide-react";
import { passkeySupported, registerPasskey } from "./lib/passkey";
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
import { avatarSrc } from "./lib/avatars";
import { challengeTitle } from "./screens/ChallengesScreen";

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
  // Un solo momento a la vez: primero el resultado de un reto, luego medallas, luego empujones.
  // Entre un momento y otro hay una pausa para que las hojas no se crucen.
  const [pause, setPause] = useState(false);
  const after = (fn) => () => { fn(); setPause(true); setTimeout(() => setPause(false), 650); };
  const result = !pause && ch.unseenResult;
  const newMedal = !pause && !result && ch.medals.find((m) => !m.seen);
  const poke = !pause && !result && !newMedal && ch.pokes[0];
  // Cada empujón se cierra solo a los 6 s (o al tocarlo) y da paso al siguiente.
  useEffect(() => {
    if (!poke) return;
    const t = setTimeout(after(() => ch.markPokeSeen(poke.id)), 6000);
    return () => clearTimeout(t);
  }, [poke?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ofrece "Entrar con Face ID" una sola vez por dispositivo si aún no tiene llave.
  const [offerFaceId, setOfferFaceId] = useState(false);
  const [faceIdMsg, setFaceIdMsg] = useState("");
  useEffect(() => {
    if (profile.id === "demo" || !passkeySupported()) return;
    try { if (localStorage.getItem("defit.faceIdAsked")) return; } catch { return; }
    supabase.from("passkeys").select("id", { count: "exact", head: true }).then(({ count }) => {
      if (!count) setTimeout(() => setOfferFaceId(true), 1500);
    });
  }, [profile.id]);
  const closeFaceId = () => { setOfferFaceId(false); try { localStorage.setItem("defit.faceIdAsked", "1"); } catch {} };
  const activateFaceId = async () => {
    setFaceIdMsg("");
    try { await registerPasskey(); closeFaceId(); }
    catch (e) { setFaceIdMsg(e.message); }
  };

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
    profile: <ProfileScreen profile={profile} ch={ch} onChange={patchProfile} onEditPlan={editPlan} planLocked={ch.planLocked} />,
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

      <Sheet open={!!result} onClose={after(() => ch.markResultSeen(result.id))} title="Resultado del reto">
        {result && <ResultCelebration c={result} me={profile.id} onClose={after(() => ch.markResultSeen(result.id))} />}
      </Sheet>

      <AnimatePresence>
        {poke && (
          <motion.div key={poke.id} className="glass glass-strong" style={styles.poke} role="status" onClick={after(() => ch.markPokeSeen(poke.id))}
            initial={{ y: 200, x: "-50%", opacity: 0 }} animate={{ y: 0, x: "-50%", opacity: 1 }} exit={{ y: 200, x: "-50%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}>
            <motion.img src={avatarSrc(ch.people[poke.from_user]?.avatar, poke.kind === "cheer" ? "party" : "surprised")} alt=""
              animate={{ y: [0, -22, 0, -10, 0], rotate: poke.kind === "tease" ? [0, -12, 12, -8, 0] : [0, 0] }}
              transition={{ duration: 1, delay: 0.3, repeat: 1, repeatDelay: 1.2 }}
              style={{ width: 72, height: 72, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                {poke.kind === "cheer" ? <HandHeart size={18} strokeWidth={2} /> : <Zap size={18} strokeWidth={2} />}
                {ch.people[poke.from_user]?.name} {poke.kind === "cheer" ? "te manda ánimo" : "te está alcanzando"}
              </p>
              <p className="caption">{poke.kind === "cheer" ? "¡Vamos! Tú puedes cumplir la meta de hoy." : "Registra tus comidas o te pasa por encima."}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={offerFaceId && !result && !newMedal && !poke} onClose={closeFaceId} title="Entra más rápido">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-3)", textAlign: "center", paddingBottom: "var(--sp-4)" }}>
          <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
            style={{ width: 88, height: 88, borderRadius: 28, display: "grid", placeItems: "center", color: "var(--on-accent)",
              background: "linear-gradient(180deg, var(--accent), var(--accent-strong))" }}>
            <ScanFace size={44} strokeWidth={1.6} />
          </motion.span>
          <h1>¿Entrar con Face ID?</h1>
          <p className="muted">La próxima vez entras mirando tu teléfono, sin escribir la contraseña.</p>
          {faceIdMsg && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{faceIdMsg}</p>}
          <button className="btn btn-primary btn-block" onClick={activateFaceId}><ScanFace size={18} strokeWidth={2} /> Activar Face ID</button>
          <button className="btn btn-text" onClick={closeFaceId}>Ahora no</button>
        </div>
      </Sheet>

      <Sheet open={!!newMedal} onClose={after(ch.markMedalsSeen)} title="Nueva medalla">
        {newMedal && medalById(newMedal.kind) && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-3)", textAlign: "center", paddingBottom: "var(--sp-4)" }}>
            {/* La medalla cae girando y tu personaje la recibe celebrando */}
            <div style={{ position: "relative", height: 290, width: "100%", display: "flex", justifyContent: "center" }}>
              <motion.div style={{ position: "absolute", top: 0 }} initial={{ y: -260, scale: 0.5, rotateY: -720 }} animate={{ y: 0, scale: 1, rotateY: 0 }}
                transition={{ type: "spring", stiffness: 60, damping: 11, delay: 0.25 }}>
                <Medal medal={medalById(newMedal.kind)} size={180} spin />
              </motion.div>
              <motion.img src={avatarSrc(profile.avatar, "party")} alt="" width={96} height={96}
                initial={{ y: 60, opacity: 0 }} animate={{ y: [60, 0, -18, 0], opacity: 1 }} transition={{ duration: 1, delay: 0.9 }}
                style={{ position: "absolute", bottom: 0, width: 96, height: 96, borderRadius: "50%", boxShadow: "0 0 0 3px var(--bg)" }} />
            </div>
            <h1>{medalById(newMedal.kind).name}</h1>
            <p className="muted">{medalById(newMedal.kind).desc}</p>
            <button className="btn btn-primary btn-block" onClick={after(ch.markMedalsSeen)}>Genial</button>
          </div>
        )}
      </Sheet>
    </>
  );
}

// Final del reto: el ganador salta con corona, el resto aplaude.
function ResultCelebration({ c, me, onClose }) {
  const players = c.members.filter((m) => m.status === "accepted").sort((a, b) => Number(b.winner) - Number(a.winner));
  const winners = players.filter((m) => m.winner);
  const iWon = winners.some((w) => w.user_id === me);
  const title = !winners.length ? "Nadie cumplió esta vez" : winners.length > 1 ? "¡Empate!" : iWon ? "¡Ganaste el reto!" : `Ganó ${winners[0].profile?.name}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-4)", textAlign: "center", paddingBottom: "var(--sp-4)" }}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "var(--sp-5)", paddingTop: "var(--sp-5)" }}>
        {players.map((m, i) => (
          <div key={m.user_id} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            {m.winner && (
              <motion.span style={{ position: "absolute", top: -26, zIndex: 1 }} initial={{ y: -60, opacity: 0, rotate: -30 }}
                animate={{ y: 0, opacity: 1, rotate: -8 }} transition={{ type: "spring", stiffness: 220, damping: 10, delay: 0.7 }}>
                <Crown size={34} strokeWidth={2} fill="#fcd34d" color="#a16207" />
              </motion.span>
            )}
            <motion.img src={avatarSrc(m.profile?.avatar, m.winner ? "party" : "happy")} alt=""
              initial={{ scale: 0 }}
              animate={m.winner ? { scale: 1, y: [0, -30, 0, -18, 0] } : { scale: 1, rotate: [0, -6, 6, -6, 6, 0] }}
              transition={m.winner
                ? { scale: { type: "spring", delay: 0.2 + i * 0.1 }, y: { duration: 1.1, delay: 0.9, repeat: Infinity, repeatDelay: 0.8 } }
                : { scale: { type: "spring", delay: 0.2 + i * 0.1 }, rotate: { duration: 0.9, delay: 1, repeat: Infinity, repeatDelay: 0.6 } }}
              style={{ width: m.winner ? 110 : 84, height: m.winner ? 110 : 84, borderRadius: "50%",
                boxShadow: m.winner ? "0 0 0 3px var(--accent), 0 14px 30px color-mix(in srgb, var(--accent) 40%, transparent)" : "0 0 0 1px var(--hairline)" }} />
            <span style={{ fontWeight: 700, fontSize: "var(--t-small)" }}>{m.user_id === me ? "Tú" : m.profile?.name}</span>
            <span className="caption num">{m.days_done} días {m.winner ? "" : "· aplaude"}</span>
          </div>
        ))}
      </div>
      <h1>{title}</h1>
      <p className="muted">
        {challengeTitle(c)}.{" "}
        {c.decided_by === "closeness" && "Empataron en días; ganó quien estuvo más cerca de su meta. "}
        {c.decided_by === "forfeit" && (iWon ? "Tu rival se rindió. " : "Te rendiste. ")}
        {iWon ? "Tienes una medalla nueva esperándote." : "Revancha cuando quieras."}
      </p>
      <button className="btn btn-primary btn-block" onClick={onClose}>{iWon ? "Ver mi medalla" : "Continuar"}</button>
    </div>
  );
}

const styles = {
  poke: {
    position: "fixed", zIndex: 46, left: "50%", bottom: "calc(var(--safe-bottom) + 100px)", width: "calc(100% - 32px)", maxWidth: 440,
    display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "14px 16px", borderRadius: "var(--r-lg)", cursor: "pointer",
  },
  toast: {
    position: "fixed", zIndex: 50, left: "50%", top: "calc(var(--safe-top) + 12px)", width: "calc(100% - 32px)", maxWidth: 440,
    display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "14px 16px", borderRadius: "var(--r-md)",
  },
};
