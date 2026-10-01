import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Dumbbell, Crown, Plus, Swords, Check, X, Lock, HandHeart, Zap, Flag, Trophy, Handshake, Medal as MedalIcon, ChevronDown, CircleX, FlagOff, Ban } from "lucide-react";
import { PersonSheetContent } from "../components/PersonCard";
import AddFriend, { Requests } from "../components/AddFriend";
import Sheet from "../components/Sheet";
import Medal from "../components/Medal";
import { Segmented } from "./AddFood";
import { avatarSrc } from "../lib/avatars";
import { MEDALS, MEDAL_GROUPS, medalById } from "../lib/medals";
import { inRange, leaders } from "../lib/useChallenges";
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
  const [preset, setPreset] = useState([]);
  const me = profile.id;
  const openPerson = (uid) => { const p = ch.people[uid]; if (p) setPerson(p); };

  const invites = ch.challenges.filter((c) => c.status === "pending" && c.members.some((m) => m.user_id === me && m.status === "invited"));
  const waiting = ch.challenges.filter((c) => c.status === "pending" && !invites.includes(c));
  const active = ch.challenges.filter((c) => c.status === "active");
  const finished = ch.challenges.filter((c) => c.status === "finished");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <Segmented value={view} onChange={setView} layoutId="ch-view"
        options={[{ id: "challenges", label: "Retos" }, { id: "social", label: "Social" }, { id: "medals", label: "Medallas" }]} />

      <AnimatePresence mode="wait" initial={false}>
        {view === "social" ? (
          <motion.div key="f" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease }} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
            <Requests ch={ch} />
            <div><p className="eyebrow" style={{ marginBottom: "var(--sp-2)" }}>Amigos</p>
              <FriendsList ch={ch} me={me} onOpenPerson={openPerson} onChallenge={(id) => { setPreset([id]); setCreating(true); }} /></div>
            <AddFriend profile={profile} ch={ch} />
            <div style={{ height: 64 }} aria-hidden="true" />
          </motion.div>
        ) : view === "challenges" ? (
          <motion.div key="c" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.25, ease }} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>

            {invites.map((c) => <Invite key={c.id} c={c} me={me} ch={ch} />)}
            {active.map((c) => <ChallengeCard key={c.id} c={c} me={me} ch={ch} today={ch.today} onOpenPerson={openPerson} />)}
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
            {(view === "challenges" || view === "social") && (
              <motion.button className="btn btn-primary" style={styles.fab} onClick={() => setCreating(true)}
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                whileTap={{ scale: 0.94 }} transition={{ type: "spring", stiffness: 380, damping: 24 }}>
                <Plus size={20} strokeWidth={2.2} /> Nuevo reto
              </motion.button>
            )}
          </AnimatePresence>
          <Sheet open={creating} onClose={() => { setCreating(false); setPreset([]); }} title="Nuevo reto">
            {creating && <NewChallenge ch={ch} profile={profile} initial={preset} onDone={() => { setCreating(false); setPreset([]); }} />}
          </Sheet>
          <Sheet open={!!person} onClose={() => setPerson(null)} title="Perfil">
            {person && <PersonSheetContent person={person} ch={ch} me={me} onRemoved={() => setPerson(null)} />}
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
function ChallengeCard({ c, me, ch, today, onOpenPerson }) {
  const players = c.members.filter((m) => m.status === "accepted" && !m.forfeited).sort((a, b) => (a.user_id === me ? -1 : b.user_id === me ? 1 : 0));
  const lead = leaders(players);
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

      {players.length > 2 ? (
        <GroupBoard players={players} lead={lead} started={started} me={me} goal={goal} onOpenPerson={onOpenPerson} />
      ) : (
      <div style={styles.vs}>
        {players.map((p, i) => (
          <div key={p.user_id} style={{ display: "contents" }}>
            {i > 0 && <span style={styles.vsTag}>VS</span>}
            <Player p={p} leader={started && lead.ids.includes(p.user_id)} isMe={p.user_id === me} onClick={() => onOpenPerson(p.user_id)} />
          </div>
        ))}
      </div>
      )}

      {lead.tie && (
        <p className="caption" style={{ marginTop: "calc(var(--sp-2) * -1)" }}>
          Empatados en días. Va ganando quien está más cerca de su meta en promedio.
        </p>
      )}

      {players.length <= 2 && (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        {players.map((p) => (
          <div key={p.user_id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--t-small)" }}>
              <span style={{ fontWeight: 700 }}>{p.user_id === me ? "Tú" : p.profile?.name}</span>
              <span className="num" style={{ fontWeight: 700 }}>
                {p.done} / {goal} días
                {lead.tie && p.dev != null && <span className="caption"> · {Math.max(0, Math.round((1 - p.dev) * 100))}% cerca</span>}
              </span>
            </div>
            <div style={styles.track}>
              <motion.div style={{ ...styles.fill, opacity: p.user_id === me ? 1 : 0.6 }}
                initial={false} animate={{ width: `${Math.min(p.done / goal, 1) * 100}%` }} transition={{ duration: 0.9, ease }} />
            </div>
            {p.today !== null && (
              <p className="caption">
                Hoy: <span className="num" style={{ fontWeight: 700, color: "var(--text)" }}>{fmt(p.today)}</span> de {fmt(p.today_target || p.target_kcal)} kcal
                {inRange(p.today, p.today_target || p.target_kcal) && <span style={styles.ok}> · en rango</span>}
              </p>
            )}
          </div>
        ))}
      </div>
      )}

      <EndChallenge c={c} me={me} ch={ch} />
    </motion.section>
  );
}

// Retos de 3 o más: podio con los tres primeros y tabla de posiciones en vivo.
const byRank = (a, b) => b.done - a.done || (a.dev ?? 1) - (b.dev ?? 1);

function GroupBoard({ players, lead, started, me, goal, onOpenPerson }) {
  const ranked = [...players].sort(byRank);
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean); // 2.º, 1.º, 3.º
  const name = (p) => (p.user_id === me ? "Tú" : p.profile?.name);
  const heights = { 0: 88, 1: 64, 2: 48 }; // altura del escalón por posición (1.º, 2.º, 3.º)
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "var(--sp-3)", paddingTop: "var(--sp-3)" }}>
        {podium.map((p) => {
          const pos = ranked.indexOf(p);
          const first = pos === 0;
          return (
            <motion.button layout key={p.user_id} onClick={() => onOpenPerson(p.user_id)} transition={{ type: "spring", stiffness: 300, damping: 26 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 92, color: "var(--text)" }}>
              <div style={{ position: "relative" }}>
                {first && started && lead.ids.includes(p.user_id) && (
                  <motion.span initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1, rotate: -12 }} style={{ ...styles.crown, top: -18 }}>
                    <Crown size={22} strokeWidth={2} fill="#fcd34d" color="#a16207" />
                  </motion.span>
                )}
                <motion.img key={`${p.done}-${p.today}`} src={avatarSrc(p.profile?.avatar, first && started && p.done > 0 ? "party" : undefined)} alt=""
                  initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 12 }}
                  style={{ width: first ? 72 : 58, height: first ? 72 : 58, borderRadius: "50%", display: "block",
                    boxShadow: first ? "0 0 0 3px var(--accent)" : "0 0 0 1px var(--hairline)" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: "var(--t-caption)", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name(p)}</span>
              <div style={{ ...styles.step, height: heights[pos], ...(first && styles.stepFirst) }}>
                <span className="num" style={{ fontWeight: 700, fontSize: 18 }}>{pos + 1}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {ranked.map((p, i) => (
          <motion.button layout key={p.user_id} onClick={() => onOpenPerson(p.user_id)} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "10px 0", borderTop: "1px solid var(--hairline)", color: "var(--text)", textAlign: "left" }}>
            <span className="num" style={{ width: 18, fontWeight: 700, color: "var(--text-2)" }}>{i + 1}</span>
            <img src={avatarSrc(p.profile?.avatar)} alt="" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "var(--t-small)" }}>
                <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name(p)}</span>
                <span className="num" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{p.done}/{goal}</span>
              </div>
              <div style={{ ...styles.track, height: 6 }}>
                <motion.div style={{ ...styles.fill, opacity: p.user_id === me ? 1 : 0.6 }} initial={false}
                  animate={{ width: `${Math.min(p.done / goal, 1) * 100}%` }} transition={{ duration: 0.9, ease }} />
              </div>
              {p.today !== null && (
                <span className="caption">
                  Hoy {fmt(p.today)} de {fmt(p.today_target || p.target_kcal)}{inRange(p.today, p.today_target || p.target_kcal) && <span style={styles.ok}> · en rango</span>}
                </span>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </>
  );
}

// Terminar antes de tiempo: proponer cancelar (mutuo acuerdo) o rendirse.
function EndChallenge({ c, me, ch }) {
  const [confirm, setConfirm] = useState(null); // "forfeit" | "cancel"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requester = c.cancel_requested_by;
  const iVoted = (c.cancel_votes || []).includes(me);
  const requesterName = c.members.find((m) => m.user_id === requester)?.profile?.name;

  const run = async (fn) => {
    setBusy(true); setError("");
    try { await fn(); setConfirm(null); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", paddingTop: "var(--sp-3)", borderTop: "1px solid var(--hairline)" }}>
      {requester && requester !== me && !iVoted && (
        <div style={styles.cancelAsk}>
          <p style={{ fontWeight: 700 }}>{requesterName} propone cancelar el reto</p>
          <p className="caption">Si aceptas, termina sin ganador y ambos pueden ajustar su plan.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
            <button className="btn btn-glass" disabled={busy} onClick={() => run(() => ch.respondCancel(c.id, false))}>Seguir</button>
            <button className="btn btn-primary" disabled={busy} onClick={() => run(() => ch.respondCancel(c.id, true))}>Cancelar reto</button>
          </div>
        </div>
      )}
      {requester && (requester === me || iVoted) && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
          <p className="caption" style={{ flex: 1 }}>Propuesta de cancelar enviada. Esperando respuesta.</p>
          {requester === me && (
            <button className="btn btn-text" style={{ fontSize: "var(--t-small)" }} disabled={busy} onClick={() => run(() => ch.respondCancel(c.id, false))}>Retirar</button>
          )}
        </div>
      )}

      {!requester && !confirm && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--sp-2)" }}>
          <button className="btn btn-text" style={styles.endBtn} onClick={() => setConfirm("cancel")}><Ban size={15} strokeWidth={2} /> Proponer cancelar</button>
          <button className="btn btn-text" style={styles.endBtn} onClick={() => setConfirm("forfeit")}><FlagOff size={15} strokeWidth={2} /> Rendirme</button>
        </div>
      )}

      <AnimatePresence>
        {confirm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={styles.cancelAsk}>
              <p style={{ fontWeight: 700 }}>{confirm === "forfeit" ? "¿Seguro que te rindes?" : "¿Proponer cancelar el reto?"}</p>
              <p className="caption">
                {confirm === "forfeit"
                  ? "Pierdes el reto y tu rival gana su medalla. Tu plan se desbloquea."
                  : "Tu rival tiene que aceptar. Si acepta, el reto termina sin ganador."}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
                <button className="btn btn-glass" disabled={busy} onClick={() => setConfirm(null)}>Volver</button>
                <button className="btn btn-primary" disabled={busy}
                  onClick={() => run(() => (confirm === "forfeit" ? ch.forfeit(c.id) : ch.requestCancel(c.id)))}>
                  {confirm === "forfeit" ? "Me rindo" : "Proponer"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
    </div>
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
        <p className="caption num">{c.members.filter((m) => m.status === "accepted").map((m) => `${m.user_id === me ? "Tú" : m.profile?.name} ${m.forfeited ? "se rindió" : m.days_done}`).join(" · ")}</p>
      </div>
      <span style={{ ...styles.result, ...(iWon && styles.resultWin) }}>{label}</span>
    </div>
  );
}

// ─── Amigos ─────────────────────────────────────────────────────────────────
function FriendsList({ ch, me, onOpenPerson, onChallenge }) {
  const [stats, setStats] = useState({});
  useEffect(() => {
    let alive = true;
    ch.friends.forEach((f) => ch.stats(f.id).then((s) => alive && s && setStats((x) => ({ ...x, [f.id]: s }))));
    return () => { alive = false; };
  }, [ch.friends.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ch.friends.length) {
    return (
      <section className="glass" style={{ padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
        <h2>Aún no tienes amigos aquí</h2>
        <p className="muted">Envía una solicitud con el correo de alguien. Cuando la acepte, aparecerá en esta lista y podrán retarse.</p>
      </section>
    );
  }
  return (
    <section className="glass" style={{ padding: "var(--sp-2) var(--sp-4)" }}>
      {ch.friends.map((f, i) => {
        const s = stats[f.id];
        const active = ch.activeWith(f.id);
        return (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "14px 0", borderTop: i ? "1px solid var(--hairline)" : "none" }}>
            <button onClick={() => onOpenPerson(f.id)} style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", flex: 1, minWidth: 0, textAlign: "left", color: "var(--text)" }}>
              <img src={avatarSrc(f.avatar)} alt="" style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 700 }}>{f.name}</p>
                <p className="caption">
                  {s ? `Racha ${s.current_streak} ${s.current_streak === 1 ? "día" : "días"} · ${s.challenges_won} ${s.challenges_won === 1 ? "reto ganado" : "retos ganados"}` : "…"}
                </p>
                {active && <p className="caption" style={{ color: "var(--accent)", fontWeight: 700 }}>Reto en curso</p>}
              </div>
            </button>
            {!active && (
              <button className="btn btn-glass" style={{ minHeight: 38, padding: "0 14px", fontSize: "var(--t-caption)" }} onClick={() => onChallenge(f.id)}>
                <Swords size={15} strokeWidth={2} /> Retar
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ─── Crear reto ────────────────────────────────────────────────────────────
const LENGTHS = { duration: [7, 14, 30], first_to: [5, 10, 20] };

function NewChallenge({ ch, profile, onDone, initial = [] }) {
  const [picked, setPicked] = useState(initial);
  const [mode, setMode] = useState("duration");
  const [length, setLength] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [custom, setCustom] = useState(false);

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
        <p className="eyebrow" style={{ marginBottom: 4 }}>¿A quién retas?</p>
        <p className="caption" style={{ marginBottom: "var(--sp-3)" }}>
          {picked.length > 1 ? `Reto de grupo: ${picked.length + 1} personas` : "Puedes elegir a varios para un reto de grupo."}
        </p>
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

      <button className="btn btn-glass" style={{ justifyContent: "space-between" }} onClick={() => setCustom((o) => !o)} aria-expanded={custom}>
        <span style={{ textAlign: "left" }}>
          <span style={{ display: "block", fontWeight: 700 }}>{mode === "duration" ? "Por tiempo" : "El primero en llegar"} · {length} días</span>
          <span className="caption">{custom ? "Ocultar opciones" : "Toca para personalizar"}</span>
        </span>
        <ChevronDown size={20} strokeWidth={1.8} style={{ transform: custom ? "rotate(180deg)" : "none", transition: "transform 250ms" }} />
      </button>

      {custom && <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        <p className="eyebrow">Tipo de reto</p>
        <Segmented value={mode} layoutId="ch-mode" onChange={(m) => { setMode(m); setLength(LENGTHS[m][0]); }}
          options={[{ id: "duration", label: "Por tiempo" }, { id: "first_to", label: "El primero en llegar" }]} />
        <p className="muted" style={{ fontSize: "var(--t-small)" }}>
          {mode === "duration"
            ? "Gana quien más días cumpla su meta (entre 90% y 110%) durante el reto. Si empatan, gana quien estuvo más cerca de su meta."
            : "Gana el primero que acumule los días cumplidos. Plazo máximo: el doble de días. Si llegan el mismo día, gana quien estuvo más cerca de su meta."}
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
      </div>}

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
  step: {
    width: "100%", display: "grid", placeItems: "center", borderRadius: "12px 12px 4px 4px",
    background: "var(--field)", border: "1px solid var(--hairline)",
  },
  stepFirst: {
    background: "linear-gradient(180deg, color-mix(in srgb, var(--accent) 35%, transparent), color-mix(in srgb, var(--accent) 10%, transparent))",
    borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
  },
  endBtn: { minHeight: 36, fontSize: "var(--t-caption)", color: "var(--text-2)", gap: 6, padding: 0 },
  cancelAsk: {
    padding: "var(--sp-3) var(--sp-4)", borderRadius: "var(--r-md)",
    background: "var(--field)", border: "1px solid var(--hairline)",
  },
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
