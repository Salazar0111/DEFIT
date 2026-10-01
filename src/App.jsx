import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Crown, HandHeart, Lock, ScanFace, Zap } from "lucide-react";
import { enablePush, pushStatus } from "./lib/push";
import { passkeySupported, registerPasskey } from "./lib/passkey";
import { supabase } from "./lib/supabase";
import { applyPalette } from "./lib/palettes";
import Shell from "./components/Shell";
import AuthScreen from "./screens/AuthScreen";
import ProfileScreen from "./screens/ProfileScreen";
import Onboarding from "./screens/Onboarding";
import HomeScreen from "./screens/HomeScreen";
import FoodScreen from "./screens/FoodScreen";
import WorkoutScreen from "./screens/WorkoutScreen";
import ChallengesScreen from "./screens/ChallengesScreen";
import Sheet from "./components/Sheet";
import Tour from "./components/Tour";
import TabTip from "./components/TabTip";
import Medal from "./components/Medal";
import { useChallenges } from "./lib/useChallenges";
import { useDayTypes } from "./lib/useDayTypes";
import { useWorkouts } from "./lib/useWorkouts";
import { computePlanV2 } from "./lib/plan";
import { medalById } from "./lib/medals";
import { fx } from "./lib/feedback";
import { avatarSrc } from "./lib/avatars";
import { challengeTitle } from "./screens/ChallengesScreen";

// Solo en desarrollo: /?demo muestra la app con un perfil ficticio, sin iniciar sesión.
// /?demo=nuevo arranca desde el cuestionario inicial.
const params = new URLSearchParams(location.search);
const DEMO = import.meta.env.DEV && params.has("demo");
const V1 = params.get("demo") === "v1"; // cuenta antigua: plan v1, sin plan por día
const DEMO_PROFILE0 = params.get("demo") === "nuevo"
  ? { id: "demo", name: "Brayan", avatar: "a1", palette: "noche-azul", onboarded: false }
  : {
      id: "demo", name: "Brayan", avatar: "a3", palette: "noche-azul", onboarded: true,
      sex: "m", birthdate: "1995-05-10", height_cm: 178, weight_kg: 92, frame: "medium",
      activity: null, deficit: 600, bmr: 1883, tdee: 2431, target_kcal: 1831, protein_g: 184, plan_version: 2,
      lifestyle: "seated", trains: true, train_type: "weights", train_days: [1, 2, 4, 5, 6], leg_days: [2, 5],
      session_min: 60, intensity: "moderate", goal: "lose", target_mode: "by_day",
      day_plan: {
        1: { kind: "weights", muscles: ["chest", "shoulders"], key: "train" },
        2: { kind: "weights", muscles: ["legs", "core"], key: "leg" },
        4: { kind: "both", muscles: ["back", "arms"], key: "cw" },
        5: { kind: "both", muscles: ["legs"], key: "cwl" },
        6: { kind: "cardio", muscles: [], key: "cardio" },
      },
      targets: { rest: 1660, train: 1890, leg: 2028, cardio: 2392, cw: 2141, cwl: 2210 },
      burns: { rest: 0, train: 230, leg: 368, cardio: 732, cw: 481, cwl: 550 },
      cardio: { mode: "run", speed: 8, incline: 1 },
      // ?demo&tour muestra el tutorial; ?demo&tips, las burbujas por pestaña.
      tips_seen: params.has("tour") ? [] : params.has("tips") ? ["tour"] : ["tour", "home", "food", "workout", "challenges", "profile"],
    };

const DEMO_PROFILE = V1
  ? { ...DEMO_PROFILE0, plan_version: 2, trains: true, train_days: [1], leg_days: [], day_plan: { 1: { key: "cw", kind: "both", muscles: ["chest", "arms"] } }, targets: { cardio: 1857, cw: 1757, cwl: 1832, leg: 1807, rest: 1407, train: 1657 }, burns: { cardio: 450, cw: 350, cwl: 425, leg: 400, rest: 0, train: 250 }, cardio: null, target_mode: "by_day", tdee: 2457, target_kcal: 1457, deficit: 1000, tips_seen: ["tour", "home", "food", "profile", "workout", "challenges"] }
  : DEMO_PROFILE0;

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState(() => {
    const t = params.get("tab");
    return ["home", "food", "workout", "challenges", "profile"].includes(t) ? t : "home";
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
  const dt = useDayTypes(profile);
  const wk = useWorkouts(profile, patchProfile);
  // Tutoriales vistos (guardados en el perfil para no repetirse en otros dispositivos).
  const seen = (key) => (profile.tips_seen || []).includes(key);
  const markSeen = async (key) => {
    if (seen(key)) return;
    const tips_seen = [...(profile.tips_seen || []), key];
    patchProfile({ tips_seen });
    if (profile.id !== "demo") await supabase.from("profiles").update({ tips_seen }).eq("id", profile.id);
  };
  // Cuentas con plan v2 anterior: se completan las kcal estimadas y las metas de todos los tipos de día
  // (las que ya tienen no cambian). Si el plan está bloqueado por un reto, se intenta de nuevo más tarde.
  const KEYS = ["rest", "train", "leg", "cardio", "cw", "cwl"];
  const incomplete = (profile.plan_version || 1) >= 2 && (!profile.burns || KEYS.some((k) => profile.targets?.[k] == null));
  useEffect(() => {
    if (profile.id === "demo" || !incomplete) return;
    const p = computePlanV2({ ...profile, deficit: profile.deficit || 0 });
    if (!p) return;
    const patch = { burns: p.burn, targets: { ...p.targets, ...(profile.targets || {}) } };
    supabase.from("profiles").update(patch).eq("id", profile.id).then(({ error }) => { if (!error) patchProfile(patch); });
  }, [profile.id, incomplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const showTour = !seen("tour");
  const replayTour = () => patchProfile({ tips_seen: (profile.tips_seen || []).filter((k) => k !== "tour") });

  const [notice, setNotice] = useState("");
  // Un solo momento a la vez: primero el resultado de un reto, luego medallas, luego empujones.
  // Entre un momento y otro hay una pausa para que las hojas no se crucen.
  const [pause, setPause] = useState(false);
  const after = (fn) => () => { fn(); setPause(true); setTimeout(() => setPause(false), 650); };
  const result = !pause && !showTour && ch.unseenResult;
  const newMedal = !pause && !result && ch.medals.find((m) => !m.seen);
  const poke = !pause && !result && !newMedal && ch.pokes[0];
  // Cada empujón se cierra solo a los 6 s (o al tocarlo) y da paso al siguiente.
  useEffect(() => {
    if (!poke) return;
    const t = setTimeout(after(() => ch.markPokeSeen(poke.id)), 6000);
    return () => clearTimeout(t);
  }, [poke?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sonido al aparecer cada momento (medalla, resultado, empujón).
  useEffect(() => { if (newMedal) fx("medal"); }, [newMedal?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (result) fx(result.members.some((m) => m.user_id === profile.id && m.winner) ? "record" : "soft"); }, [result?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (poke) fx("soft"); }, [poke?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ofrece "Entrar con Face ID" una sola vez por dispositivo si aún no tiene llave.
  const [offerFaceIdRaw, setOfferFaceId] = useState(false);
  const offerFaceId = offerFaceIdRaw && !showTour;
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

  // Tras guardar la primera comida se ofrecen las notificaciones (una sola vez; si las deja para después, no se insiste).
  const [offerNotif, setOfferNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState("");
  useEffect(() => {
    const onMeal = () => {
      if (seen("notifask")) return;
      pushStatus().then((st) => { if (st === "off") setTimeout(() => setOfferNotif(true), 3200); }).catch(() => {});
    };
    window.addEventListener("defit:meal-saved", onMeal);
    return () => window.removeEventListener("defit:meal-saved", onMeal);
  }); // sin deps: siempre ve el perfil actual
  const closeNotif = () => { setOfferNotif(false); markSeen("notifask"); };
  const activateNotif = async () => {
    setNotifMsg("");
    try { if (profile.id !== "demo") await enablePush(profile.id); closeNotif(); }
    catch (e) { setNotifMsg(e.message); }
  };

  const editPlan = () => {
    if (!ch.planLocked) return onEditPlan();
    setNotice("Tu plan está fijo mientras estés en un reto. Podrás ajustarlo cuando termine.");
    setTimeout(() => setNotice(""), 4000);
  };

  const screens = {
    home: <HomeScreen seen={seen} markSeen={markSeen} profile={profile} ch={ch} dt={dt} onEditPlan={editPlan} onOpenChallenges={() => setTab("challenges")} />,
    food: <FoodScreen profile={profile} dt={dt} />,
    workout: <WorkoutScreen seen={seen} markSeen={markSeen} profile={profile} wk={wk} dt={dt} onEditPlan={editPlan} />,
    challenges: <ChallengesScreen profile={profile} ch={ch} />,
    profile: <ProfileScreen profile={profile} ch={ch} onChange={patchProfile} onEditPlan={editPlan} planLocked={ch.planLocked} onReplayTour={replayTour} />,
  };

  return (
    <>
      <Shell profile={profile} tab={tab} onTab={setTab}>
        <TabTip tab={tab} avatar={profile.avatar} show={!showTour && !seen(tab)} onDismiss={() => markSeen(tab)} />
        {screens[tab]}
      </Shell>

      <AnimatePresence>
        {showTour && <Tour key="tour" profile={profile} onDone={() => markSeen("tour")} onGoProfile={() => setTab("profile")} />}
      </AnimatePresence>

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

      <Sheet open={offerNotif && !offerFaceId && !showTour && !result && !newMedal && !poke} onClose={closeNotif} title="Recordatorios">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-3)", textAlign: "center", paddingBottom: "var(--sp-4)" }}>
          <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
            style={{ width: 88, height: 88, borderRadius: 28, display: "grid", placeItems: "center", color: "var(--on-accent)",
              background: "linear-gradient(180deg, var(--accent), var(--accent-strong))" }}>
            <Bell size={42} strokeWidth={1.6} />
          </motion.span>
          <h1>¿Te avisamos?</h1>
          <p className="muted">Ya registraste tu primera comida. Activa las notificaciones para recordarte tus comidas y avisarte de retos y empujones de tus amigos.</p>
          {notifMsg && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{notifMsg}</p>}
          <button className="btn btn-primary btn-block" onClick={activateNotif}><Bell size={18} strokeWidth={2} /> Activar notificaciones</button>
          <button className="btn btn-text" onClick={closeNotif}>Ahora no</button>
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
