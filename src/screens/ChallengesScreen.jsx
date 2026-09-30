import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Crown, Plus, Swords, Check, X, Lock, HandHeart, Zap, Flag, Trophy, Handshake, Medal as MedalIcon, CircleX } from "lucide-react";
import { PersonSheetContent } from "../components/PersonCard";
import Sheet from "../components/Sheet";
import Medal from "../components/Medal";
import { Segmented } from "./AddFood";
import { avatarSrc } from "../lib/avatars";
import { MEDALS, MEDAL_GROUPS, medalById } from "../lib/medals";
import { inRange } from "../lib/useChallenges";
import { dayLabel } from "../lib/food";
import { fmt } from "../lib/plan";

const ease = [0.16, 1, 0.3, 1];
const DAYS = 86400000;
const between = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / DAYS);

export const challengeTitle = (c) =>
  c.mode === "duration" ? `Más días cumplidos en ${c.length_days}` : `Primero en cumplir ${c.length_days} días`;

export default function ChallengesScreen({ profile, ch }) {
  const [view, setView] = useState("challenges");
  const [creating, setCreating] = useState(false);
  const [openMedal, setOpenMedal] = useState(null);
  const [person, setPerson] = useState(null);
  const me = profile.id;
  const openPerson = (uid) => { const p = ch.people[uid]; if (p) setPerson(p); };

  const invites = ch.challenges.filter((c) => c.status === "pending" && c.members.some((m) => m.user_id === me && m.status === "invited"));
  const waiting = ch.challenges.filter((c) => c.status === "pending" && !invites.includes(c));
  const active = ch.challenges.filter((c) => c.status === "active");
  const finished = ch.challenges.filter((c) => c.status === "finished");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <Segmented value={view} onChange={setView} layoutId="ch-view"
        options={[{ id: "challenges", label: "Retos" }, { id: "activity", label: "Actividad" }, { id: "medals", label: "Medallas" }]} />

      <AnimatePresence mode="wait" initial={false}>
        {view === "activity" ? (
          <motion.div key="a" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease }}>
            <ActivityFeed ch={ch} me={me} onOpenPerson={openPerson} />
          </motion.div>
        ) : view === "challenges" ? (
          <motion.div key="c" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.25, ease }} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>

            {invites.map((c) => <Invite key={c.id} c={c} me={me} ch={ch} />)}
            {active.map((c) => <ChallengeCard key={c.id} c={c} me={me} today={ch.today} onOpenPerson={openPerson} />)}
            {waiting.map((c) => <Waiting key={c.id} c={c} me={me} ch={ch} />)}

            {!ch.loading && !invites.length && !active.length && !waiting.length && (
              <section className="glass" style={{ padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
                <Swords size={26} strokeWidth={1.6} style={{ color: "var(--accent)" }} />
                <h2>Reta a alguien</h2>
                <p className="muted">Gana quien más días cumpla su meta calórica. Cada uno compite contra su propia meta, así que es justo aunque sean distintas.</p>
              </section>
            )}

            {finished.length > 0 && (
              <section className="glass" style={{ padding: "var(--sp-2) var(--sp-4)" }}>
                <p className="eyebrow" style={{ padding: "10px 0 6px" }}>Terminados</p>
                {finished.map((c) => <FinishedRow key={c.id} c={c} me={me} />)}
              </section>
            )}
            <div style={{ height: 64 }} aria-hidden="true" />
          </motion.div>
        ) : (
          <motion.div key="m" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease }} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
            {MEDAL_GROUPS.map((g) => (
              <section key={g.id} className="glass" style={{ padding: "var(--sp-5)" }}>
                <p className="eyebrow" style={{ marginBottom: "var(--sp-4)" }}>{g.label}</p>
                <div style={styles.medalGrid}>
                  {MEDALS.filter((m) => m.group === g.id).map((m) => {
                    const earned = ch.medals.filter((x) => x.kind === m.id);
                    return (
                      <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                        <Medal medal={m} size={76} locked={!earned.length} count={earned.length} onClick={() => setOpenMedal(m.id)} />
                        <span style={{ fontSize: "var(--t-caption)", fontWeight: 700, lineHeight: 1.2 }}>{m.name}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {createPortal(
        <>
          <AnimatePresence>
            {view === "challenges" && (
              <motion.button className="btn btn-primary" style={styles.fab} onClick={() => setCreating(true)}
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                whileTap={{ scale: 0.94 }} transition={{ type: "spring", stiffness: 380, damping: 24 }}>
                <Plus size={20} strokeWidth={2.2} /> Nuevo reto
              </motion.button>
            )}
          </AnimatePresence>
          <Sheet open={creating} onClose={() => setCreating(false)} title="Nuevo reto">
            <NewChallenge ch={ch} profile={profile} onDone={() => setCreating(false)} />
          </Sheet>
          <Sheet open={!!person} onClose={() => setPerson(null)} title="Perfil">
            {person && <PersonSheetContent person={person} ch={ch} me={me} />}
          </Sheet>
          <Sheet open={!!openMedal} onClose={() => setOpenMedal(null)} title="Medalla">
            {openMedal && <MedalDetail medal={medalById(openMedal)} earned={ch.medals.filter((x) => x.kind === openMedal)} today={ch.today} />}
          </Sheet>
        </>,
        document.body
      )}
    </div>
  );
}

// ─── Tarjeta de reto activo: enfrentamiento con avatares y progreso en vivo ──
function ChallengeCard({ c, me, today, onOpenPerson }) {
  const players = c.members.filter((m) => m.status === "accepted").sort((a, b) => (a.user_id === me ? -1 : b.user_id === me ? 1 : 0));
  const best = Math.max(...players.map((p) => p.done));
  const started = today >= c.start_day;
  const dayN = started ? Math.min(between(c.start_day, today) + 1, between(c.start_day, c.end_day) + 1) : 0;
  const total = between(c.start_day, c.end_day) + 1;
  const goal = c.length_days;

  return (
    <motion.section layout className="glass" style={{ padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div>
        <p className="eyebrow">{started ? `Día ${dayN} de ${c.mode === "duration" ? total : `máx. ${total}`}` : "Empieza mañana"}</p>
        <h2 style={{ marginTop: 4 }}>{challengeTitle(c)}</h2>
      </div>

      <div style={styles.vs}>
        {players.map((p, i) => (
          <div key={p.user_id} style={{ display: "contents" }}>
            {i > 0 && <span style={styles.vsTag}>VS</span>}
            <Player p={p} leader={started && best > 0 && p.done === best} isMe={p.user_id === me} onClick={() => onOpenPerson(p.user_id)} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        {players.map((p) => (
          <div key={p.user_id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--t-small)" }}>
              <span style={{ fontWeight: 700 }}>{p.user_id === me ? "Tú" : p.profile?.name}</span>
              <span className="num" style={{ fontWeight: 700 }}>{p.done} / {goal} días</span>
            </div>
            <div style={styles.track}>
              <motion.div style={{ ...styles.fill, opacity: p.user_id === me ? 1 : 0.6 }}
                initial={false} animate={{ width: `${Math.min(p.done / goal, 1) * 100}%` }} transition={{ duration: 0.9, ease }} />
            </div>
            {p.today !== null && (
              <p className="caption">
                Hoy: <span className="num" style={{ fontWeight: 700, color: "var(--text)" }}>{fmt(p.today)}</span> de {fmt(p.target_kcal)} kcal
                {inRange(p.today, p.target_kcal) && <span style={styles.ok}> · en rango</span>}
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function Player({ p, leader, isMe, onClick }) {
  return (
    <button onClick={onClick} aria-label={`Ver perfil de ${isMe ? "ti" : p.profile?.name}`}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0, color: "var(--text)" }}>
      <div style={{ position: "relative" }}>
        <AnimatePresence>
          {leader && (
            <motion.span initial={{ y: 8, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: -12 }} exit={{ y: 8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }} style={styles.crown}>
              <Crown size={22} strokeWidth={2} fill="#fcd34d" color="#a16207" />
            </motion.span>
          )}
        </AnimatePresence>
        {/* El avatar rebota cada vez que su progreso cambia */}
        <motion.img key={`${p.done}-${p.today}`} src={avatarSrc(p.profile?.avatar)} alt=""
          initial={{ scale: 0.85 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9, rotate: -8 }}
          transition={{ type: "spring", stiffness: 420, damping: 12 }}
          style={{ ...styles.avatar, boxShadow: leader ? "0 0 0 3px var(--accent), 0 10px 26px color-mix(in srgb, var(--accent) 40%, transparent)" : "0 0 0 1px var(--hairline)" }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: "var(--t-small)", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {isMe ? "Tú" : p.profile?.name}
      </span>
      {!isMe && <span className="caption" style={{ marginTop: -4 }}>Toca para animar</span>}
    </button>
  );
}

function Invite({ c, me, ch }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const from = c.members.find((m) => m.user_id === c.created_by);
  const act = async (accept) => {
    setBusy(true); setError("");
    try { await ch.respond(c.id, accept); } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <motion.section layout initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="glass" style={{ ...styles.invite }}>
      <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center" }}>
        <motion.img src={avatarSrc(from?.profile?.avatar)} alt="" style={{ width: 52, height: 52, borderRadius: "50%" }}
          animate={{ rotate: [0, -10, 10, -6, 0] }} transition={{ duration: 0.8, delay: 0.3, repeat: 2, repeatDelay: 2.5 }} />
        <div style={{ flex: 1 }}>
          <p className="eyebrow">Te retaron</p>
          <h2 style={{ fontSize: 18 }}>{from?.profile?.name} te reta: {challengeTitle(c).toLowerCase()}</h2>
        </div>
      </div>
      <p className="muted" style={{ fontSize: "var(--t-small)" }}>
        {c.mode === "duration" ? `Dura ${c.length_days} días.` : `Plazo máximo de ${c.length_days * 2} días.`} Empieza al día siguiente de que todos acepten.
        Tu meta actual queda fija mientras dure.
      </p>
      {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--sp-2)" }}>
        <button className="btn btn-glass" disabled={busy} onClick={() => act(false)}><X size={18} strokeWidth={2} /> No</button>
        <button className="btn btn-primary" disabled={busy} onClick={() => act(true)}><Check size={18} strokeWidth={2.2} /> Acepto</button>
      </div>
    </motion.section>
  );
}

function Waiting({ c, me, ch }) {
  const pending = c.members.filter((m) => m.status === "invited").map((m) => m.profile?.name).join(", ");
  return (
    <section className="glass" style={{ padding: "var(--sp-4) var(--sp-5)", display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
      <div style={{ flex: 1 }}>
        <p className="eyebrow">Esperando respuesta</p>
        <p style={{ fontWeight: 700 }}>{challengeTitle(c)}</p>
        <p className="caption">{pending ? `Falta: ${pending}` : "Empieza mañana"}</p>
      </div>
      {c.created_by === me && pending && (
        <button className="btn btn-glass" style={{ minHeight: 40, padding: "0 14px", fontSize: "var(--t-small)" }} onClick={() => ch.cancel(c.id)}>
          Cancelar
        </button>
      )}
    </section>
  );
}

function FinishedRow({ c, me }) {
  const winners = c.members.filter((m) => m.winner);
  const iWon = winners.some((w) => w.user_id === me);
  const label = !winners.length ? "Nadie cumplió" : winners.length > 1 ? (iWon ? "Empate" : "Empataron") : iWon ? "Ganaste" : `Ganó ${winners[0].profile?.name}`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "12px 0", borderTop: "1px solid var(--hairline)" }}>
      <div style={{ display: "flex" }}>
        {c.members.filter((m) => m.status === "accepted").map((m, i) => (
          <img key={m.user_id} src={avatarSrc(m.profile?.avatar)} alt="" style={{ width: 32, height: 32, borderRadius: "50%", marginLeft: i ? -10 : 0, boxShadow: "0 0 0 2px var(--bg)" }} />
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: "var(--t-small)" }}>{challengeTitle(c)}</p>
        <p className="caption num">{c.members.filter((m) => m.status === "accepted").map((m) => `${m.user_id === me ? "Tú" : m.profile?.name} ${m.days_done}`).join(" · ")}</p>
      </div>
      <span style={{ ...styles.result, ...(iWon && styles.resultWin) }}>{label}</span>
    </div>
  );
}

// ─── Muro de actividad ──────────────────────────────────────────────────────
const since = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
};

// Frase del evento. Si lo hiciste tú, se conjuga en segunda persona ("Retaste a…").
function describe(a, me, nameOf) {
  const mine = a.actor === me;
  const who = <b>{nameOf(a.actor)}</b>;
  const them = <b>{a.targets.map((t) => (t === me ? "ti" : nameOf(t))).join(" y ")}</b>;
  const v = (yo, otro) => (mine ? yo : otro);
  const lead = (verb) => (mine ? <>{verb}</> : <>{who} {verb.charAt(0).toLowerCase() + verb.slice(1)}</>);
  const whose = a.targets.length === 1 && a.targets[0] === me ? <>tu reto</> : <>el reto de {them}</>;
  const what = a.data?.mode === "first_to" ? `llegar primero a ${a.data.length} días` : a.data?.length ? `${a.data.length} días de reto` : "un reto";
  switch (a.kind) {
    case "challenge_invite": return { Icon: Swords, text: <>{lead(v("Retaste", "Retó"))} a {them} · {what}</> };
    case "challenge_accept": return { Icon: Handshake, text: <>{lead(v("Aceptaste", "Aceptó"))} {whose}</> };
    case "challenge_decline": return { Icon: CircleX, text: <>{lead(v("Rechazaste", "Rechazó"))} {whose}</> };
    case "challenge_won": return { Icon: Trophy, win: true, text: <>{lead(v("Le ganaste", "Le ganó"))} el reto a {them}{a.data?.days ? ` con ${a.data.days} días cumplidos` : ""}</> };
    case "challenge_draw": return { Icon: Flag, text: <>{mine ? <>Empataste con {them}</> : <>{who} y {them} empataron</>} el reto</> };
    case "medal": return { Icon: MedalIcon, medal: medalById(a.data?.medal), text: <>{lead(v("Ganaste", "Ganó"))} la medalla <b>{medalById(a.data?.medal)?.name || ""}</b></> };
    case "poke": return a.data?.kind === "cheer"
      ? { Icon: HandHeart, text: <>{lead(v("Le mandaste", "Le mandó"))} ánimo a {them}</> }
      : { Icon: Zap, text: <>{lead(v("Picaste", "Picó"))} a {them}</> };
    default: return { Icon: Flag, text: null };
  }
}

function ActivityFeed({ ch, me, onOpenPerson }) {
  const name = (uid) => ch.people[uid]?.name || "Alguien";
  if (!ch.activity.length) {
    return (
      <section className="glass" style={{ padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
        <h2>Aún no hay movimiento</h2>
        <p className="muted">Aquí verás los retos, resultados, medallas y empujones de todo el grupo.</p>
      </section>
    );
  }
  return (
    <section className="glass" style={{ padding: "var(--sp-2) var(--sp-4)" }}>
      <AnimatePresence initial={false}>
        {ch.activity.map((a, i) => {
          const d = describe(a, me, name);
          const actor = ch.people[a.actor];
          const target = ch.people[a.targets[0]];
          return (
            <motion.div key={a.id} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}
              style={{ display: "flex", gap: "var(--sp-3)", alignItems: "flex-start", padding: "14px 0", borderTop: i ? "1px solid var(--hairline)" : "none" }}>
              <button onClick={() => onOpenPerson(a.actor)} style={{ position: "relative", flexShrink: 0 }} aria-label={`Ver perfil de ${a.actor === me ? "ti" : name(a.actor)}`}>
                <img src={avatarSrc(actor?.avatar, d.win ? "party" : undefined)} alt="" style={{ width: 44, height: 44, borderRadius: "50%", display: "block" }} />
                {target && (
                  <img src={avatarSrc(target.avatar, d.win ? "worried" : undefined)} alt=""
                    style={{ position: "absolute", right: -8, bottom: -6, width: 26, height: 26, borderRadius: "50%", boxShadow: "0 0 0 2px var(--bg)" }} />
                )}
              </button>
              <div style={{ flex: 1, minWidth: 0, paddingLeft: target ? 6 : 0 }}>
                <p style={{ fontSize: "var(--t-small)", lineHeight: 1.4 }}>{d.text}</p>
                <p className="caption" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <d.Icon size={13} strokeWidth={2} /> {since(a.created_at)}
                </p>
              </div>
              {d.medal && <Medal medal={d.medal} size={40} />}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </section>
  );
}

// ─── Crear reto ────────────────────────────────────────────────────────────
const LENGTHS = { duration: [7, 14, 30], first_to: [5, 10, 20] };

function NewChallenge({ ch, profile, onDone }) {
  const [picked, setPicked] = useState([]);
  const [mode, setMode] = useState("duration");
  const [length, setLength] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id) => setPicked((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]));
  const submit = async () => {
    setBusy(true); setError("");
    try { await ch.create(picked, mode, length); onDone(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (!ch.friends.length) {
    return <p className="muted">Todavía no hay nadie más con su plan listo. Cuando tus amigos completen su cuestionario, aparecerán aquí.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div>
        <p className="eyebrow" style={{ marginBottom: "var(--sp-3)" }}>¿A quién retas?</p>
        <div style={{ display: "flex", gap: "var(--sp-4)", flexWrap: "wrap" }}>
          {ch.friends.map((f) => {
            const on = picked.includes(f.id);
            return (
              <motion.button key={f.id} onClick={() => toggle(f.id)} whileTap={{ scale: 0.9 }} aria-pressed={on}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 72 }}>
                <motion.img src={avatarSrc(f.avatar)} alt="" animate={{ scale: on ? 1.08 : 1 }}
                  style={{ width: 60, height: 60, borderRadius: "50%", boxShadow: on ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent)" : "0 0 0 1px var(--hairline)" }} />
                <span style={{ fontSize: "var(--t-caption)", fontWeight: 700 }}>{f.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        <p className="eyebrow">Tipo de reto</p>
        <Segmented value={mode} layoutId="ch-mode" onChange={(m) => { setMode(m); setLength(LENGTHS[m][0]); }}
          options={[{ id: "duration", label: "Por tiempo" }, { id: "first_to", label: "El primero en llegar" }]} />
        <p className="muted" style={{ fontSize: "var(--t-small)" }}>
          {mode === "duration"
            ? "Gana quien más días cumpla su meta (entre 90% y 110%) durante el reto."
            : "Gana el primero que acumule los días cumplidos. Plazo máximo: el doble de días."}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-2)" }}>
          {LENGTHS[mode].map((n) => (
            <button key={n} onClick={() => setLength(n)} aria-pressed={length === n}
              style={{ ...styles.chip, ...(length === n && styles.chipOn) }}>
              <span className="num" style={{ fontSize: 22, fontWeight: 700 }}>{n}</span>
              <span style={{ fontSize: "var(--t-caption)" }}>días</span>
            </button>
          ))}
        </div>
      </div>

      <p className="caption" style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
        <Lock size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
        Tu meta de {fmt(profile.target_kcal)} kcal queda fija hasta que termine el reto.
      </p>
      {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
      <button className="btn btn-primary btn-block" disabled={busy || !picked.length} onClick={submit}>
        <Swords size={18} strokeWidth={2} /> {busy ? "Enviando…" : "Enviar reto"}
      </button>
    </div>
  );
}

function MedalDetail({ medal, earned, today }) {
  const last = earned[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-3)", textAlign: "center", paddingBottom: "var(--sp-4)" }}>
      <motion.div initial={{ scale: 0.6, rotateY: -180 }} animate={{ scale: 1, rotateY: 0 }} transition={{ type: "spring", stiffness: 120, damping: 14 }}>
        <Medal medal={medal} size={200} locked={!earned.length} spin />
      </motion.div>
      <p className="caption">Arrástrala para girarla</p>
      <h1>{medal.name}</h1>
      <p className="muted">{medal.desc}</p>
      {earned.length > 0 ? (
        <p style={{ fontWeight: 700 }}>
          {earned.length === 1 ? "Ganada una vez" : `Ganada ${earned.length} veces`}
          {last?.period_key && /^\d{4}-/.test(last.period_key) && <span className="muted"> · última: {dayLabel(last.period_key, today).toLowerCase()}</span>}
        </p>
      ) : (
        <p style={{ fontWeight: 700 }}>Aún no la tienes</p>
      )}
    </div>
  );
}

const styles = {
  vs: { display: "flex", alignItems: "center", justifyContent: "space-around", gap: "var(--sp-2)", padding: "var(--sp-2) 0" },
  vsTag: { fontWeight: 700, fontSize: 13, letterSpacing: "0.2em", color: "var(--text-2)" },
  avatar: { width: 84, height: 84, borderRadius: "50%", display: "block" },
  crown: { position: "absolute", top: -16, left: -6, zIndex: 1, filter: "drop-shadow(0 2px 3px rgba(0,0,0,.3))" },
  track: { height: 10, borderRadius: 99, background: "var(--hairline)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--accent), var(--accent-strong))" },
  ok: { color: "var(--accent)", fontWeight: 700 },
  invite: {
    padding: "var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-3)",
    borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)",
  },
  result: {
    fontSize: "var(--t-caption)", fontWeight: 700, padding: "6px 10px", borderRadius: 99, whiteSpace: "nowrap",
    background: "var(--field)", border: "1px solid var(--hairline)",
  },
  resultWin: { background: "color-mix(in srgb, var(--accent) 18%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" },
  chip: {
    display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", borderRadius: "var(--r-md)",
    background: "var(--field)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--hairline)", color: "var(--text)",
  },
  chipOn: { background: "linear-gradient(180deg, var(--accent), var(--accent-strong))", borderColor: "transparent", color: "var(--on-accent)" },
  medalGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-5) var(--sp-3)" },
  fab: {
    position: "fixed", zIndex: 25, left: "50%", x: "-50%", whiteSpace: "nowrap",
    bottom: "calc(var(--safe-bottom) + 96px)", padding: "0 22px", minHeight: 50,
  },
};
