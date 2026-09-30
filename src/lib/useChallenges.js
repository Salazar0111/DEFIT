import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { dayKey, shiftDay } from "./food";

export const inRange = (kcal, target) => target > 0 && kcal >= target * 0.9 && kcal <= target * 1.1;

// Desviación promedio frente a la meta en días cerrados (sin registro = 100%). Sirve de desempate.
function deviation(totals, target, from, to) {
  if (!target || !from || to < from) return null;
  let sum = 0, n = 0;
  for (let d = from; d <= to; d = shiftDay(d, 1)) {
    const t = totals.find((x) => x.day === d);
    sum += t ? Math.abs(t.kcal - target) / target : 1;
    n++;
  }
  return n ? sum / n : null;
}

// Líder: más días cumplidos; si empatan, el más cercano a su meta.
export function leaders(players) {
  const live = players.filter((p) => !p.forfeited);
  const best = Math.max(0, ...live.map((p) => p.done));
  if (best === 0) return { ids: [], tie: false };
  const top = live.filter((p) => p.done === best);
  if (top.length === 1) return { ids: [top[0].user_id], tie: false };
  const min = Math.min(...top.map((p) => p.dev ?? 1));
  return { ids: top.filter((p) => (p.dev ?? 1) === min).map((p) => p.user_id), tie: true };
}

const ERRORS = {
  PLAN_REQUIRED: "Primero completa tu plan calórico.",
  PLAN_LOCKED: "No puedes cambiar tu plan mientras estás en un reto.",
  NOT_PENDING: "Este reto ya no está pendiente.",
  BAD_OPPONENTS: "Elige al menos a una persona.",
  POKE_LIMIT: "Ya usaste los 3 empujones de hoy con esta persona.",
  NOT_ACTIVE: "Este reto ya no está activo.",
  ALREADY_REQUESTED: "Ya hay una propuesta de cancelar pendiente.",
  NO_REQUEST: "La propuesta ya no está vigente.",
  NO_ACTIVE_CHALLENGE: "Solo puedes empujar a alguien con quien tengas un reto activo.",
};
const friendly = (e) => ERRORS[Object.keys(ERRORS).find((k) => e?.message?.includes(k))] || "Algo falló. Intenta de nuevo.";

// Progreso en vivo de cada miembro a partir de los totales diarios.
function withProgress(ch, totals, today) {
  const yesterday = shiftDay(today, -1);
  const members = ch.members.map((m) => {
    if (!ch.start_day || m.status !== "accepted") return { ...m, done: m.days_done, today: null };
    const last = ch.end_day && ch.end_day < yesterday ? ch.end_day : yesterday;
    const mine = totals.filter((t) => t.user_id === m.user_id);
    const done = ch.status === "finished"
      ? m.days_done
      : mine.filter((t) => t.day >= ch.start_day && t.day <= last && inRange(t.kcal, m.target_kcal)).length;
    const running = ch.status === "active" && today >= ch.start_day && today <= ch.end_day;
    const dev = ch.status === "finished" ? (m.deviation != null ? Number(m.deviation) : null) : deviation(mine, m.target_kcal, ch.start_day, last);
    return { ...m, done, dev, today: running ? (mine.find((t) => t.day === today)?.kcal || 0) : null };
  });
  return { ...ch, members };
}

export function useChallenges(profile) {
  const demo = profile.id === "demo";
  const today = dayKey(new Date(), profile.timezone);
  const [state, setState] = useState({ loading: true, challenges: [], friends: [], medals: [], activity: [], pokes: [], people: {} });
  const timer = useRef(null);

  const load = useCallback(async () => {
    if (demo) { setState({ loading: false, ...demoData(profile, today) }); return; }
    const [{ data: mine }, { data: friends }, { data: medals }, { data: activity }, { data: pokes }] = await Promise.all([
      supabase.from("challenge_members").select("challenge_id").eq("user_id", profile.id),
      supabase.from("profiles").select("id, name, avatar, onboarded").neq("id", profile.id),
      supabase.from("medals").select("*").eq("user_id", profile.id).order("earned_at", { ascending: false }),
      supabase.from("activity").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("pokes").select("*").eq("to_user", profile.id).eq("seen", false).order("created_at"),
    ]);
    const ids = (mine || []).map((m) => m.challenge_id);
    let challenges = [];
    if (ids.length) {
      const { data } = await supabase.from("challenges").select("*, members:challenge_members(*)")
        .in("id", ids).neq("status", "cancelled").order("created_at", { ascending: false });
      challenges = data || [];
      const userIds = [...new Set(challenges.flatMap((c) => c.members.map((m) => m.user_id)))];
      const from = challenges.map((c) => c.start_day).filter(Boolean).sort()[0] || today;
      const { data: totals } = await supabase.from("daily_totals").select("user_id, day, kcal")
        .in("user_id", userIds).gte("day", from).lte("day", today);
      challenges = challenges.map((c) => withProgress(c, totals || [], today));
    }
    const people = Object.fromEntries([...(friends || []), profile].map((p) => [p.id, p]));
    challenges = challenges.map((c) => ({ ...c, members: c.members.map((m) => ({ ...m, profile: people[m.user_id] })) }));
    setState({
      loading: false, challenges, people,
      friends: (friends || []).filter((f) => f.onboarded),
      medals: medals || [], activity: activity || [], pokes: pokes || [],
    });
  }, [demo, profile, today]);

  useEffect(() => { load(); }, [load]);

  // Tiempo real: cualquier cambio en totales, retos o medallas recarga (con pequeña espera).
  useEffect(() => {
    if (demo) return;
    const reload = () => { clearTimeout(timer.current); timer.current = setTimeout(load, 300); };
    const ch = supabase.channel(`defit-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_totals" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "challenge_members" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "medals", filter: `user_id=eq.${profile.id}` }, reload)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity" }, reload)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pokes", filter: `to_user=eq.${profile.id}` }, reload)
      .subscribe();
    return () => { clearTimeout(timer.current); supabase.removeChannel(ch); };
  }, [demo, profile.id, load]);

  const rpc = async (fn, args) => {
    if (demo) return null;
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw new Error(friendly(error));
    await load();
    return data;
  };

  const planLocked = state.challenges.some((c) =>
    ["pending", "active"].includes(c.status) &&
    c.members.some((m) => m.user_id === profile.id && m.status === "accepted" && !m.forfeited));

  const markMedalsSeen = async () => {
    const unseen = state.medals.filter((m) => !m.seen).map((m) => m.id);
    if (!unseen.length) return;
    setState((s) => ({ ...s, medals: s.medals.map((m) => ({ ...m, seen: true })) }));
    if (demo) return;
    await supabase.from("medals").update({ seen: true }).in("id", unseen);
  };

  // Los empujones se muestran uno por uno, del más antiguo al más reciente.
  const markPokeSeen = async (id) => {
    setState((s) => ({ ...s, pokes: s.pokes.filter((p) => p.id !== id) }));
    if (!demo) await supabase.from("pokes").update({ seen: true }).eq("id", id);
  };

  // Retos terminados cuyo resultado aún no he visto (para la celebración).
  const unseenResult = state.challenges.find((c) =>
    c.status === "finished" && c.members.some((m) => m.user_id === profile.id && m.status === "accepted" && m.result_seen === false));

  const markResultSeen = async (id) => {
    setState((s) => ({ ...s, challenges: s.challenges.map((c) => c.id !== id ? c : {
      ...c, members: c.members.map((m) => (m.user_id === profile.id ? { ...m, result_seen: true } : m)) }) }));
    if (!demo) await supabase.rpc("mark_result_seen", { cid: id });
  };

  const stats = async (uid) => {
    if (demo) return demoStats(uid === profile.id);
    const { data } = await supabase.rpc("profile_stats", { uid });
    return data;
  };

  const medalsOf = async (uid) => {
    if (uid === profile.id) return state.medals;
    if (demo) return ["first_entry", "day_in_range", "day_in_range", "streak_7", "week_logged", "challenge_done"].map((kind, id) => ({ id, kind }));
    const { data } = await supabase.from("medals").select("*").eq("user_id", uid).order("earned_at", { ascending: false });
    return data || [];
  };

  // ¿Tengo un reto activo con esta persona? (para permitir empujones)
  const activeWith = (uid) => state.challenges.some((c) => c.status === "active" &&
    c.members.some((m) => m.user_id === uid && m.status === "accepted"));

  const sendPoke = async (uid, kind) => {
    if (demo) return 2;
    const { data, error } = await supabase.rpc("send_poke", { target: uid, kind });
    if (error) throw new Error(friendly(error));
    return data;
  };

  return {
    ...state,
    unseenResult,
    markResultSeen,
    markPokeSeen,
    stats,
    medalsOf,
    activeWith,
    sendPoke,
    today,
    planLocked,
    reload: load,
    markMedalsSeen,
    create: (opponents, mode, length) => rpc("create_challenge", { opponents, mode, length_days: length }),
    respond: (id, accept) => rpc("respond_challenge", { cid: id, accept }),
    cancel: (id) => rpc("cancel_challenge", { cid: id }),
    forfeit: (id) => rpc("forfeit_challenge", { cid: id }),
    requestCancel: (id) => rpc("request_cancel", { cid: id }),
    respondCancel: (id, accept) => rpc("respond_cancel", { cid: id, accept }),
  };
}

// ─── Datos de demo ─────────────────────────────────────────────────────────
function demoData(profile, today) {
  const showMoments = new URLSearchParams(location.search).has("final"); // ?demo&final muestra las celebraciones
  const claudia = { id: "c", name: "Claudia", avatar: "a5", onboarded: true };
  const d = (n) => shiftDay(today, n);
  const totals = [
    ...[-3, -2, -1].map((n, i) => ({ user_id: profile.id, day: d(n), kcal: [2100, 2400, 2050][i] })),
    ...[-3, -2, -1].map((n, i) => ({ user_id: "c", day: d(n), kcal: [1500, 1480, 1700][i] })),
    { user_id: profile.id, day: today, kcal: 1320 }, { user_id: "c", day: today, kcal: 1100 },
  ];
  const mk = (c) => withProgress(c, totals, today);
  const people = { [profile.id]: profile, c: claudia };
  const challenges = [
    mk({ id: 1, created_by: "c", mode: "duration", length_days: 7, status: "active", start_day: d(-3), end_day: d(3),
      members: [
        { user_id: profile.id, status: "accepted", target_kcal: profile.target_kcal || 2119, days_done: 0, winner: false },
        { user_id: "c", status: "accepted", target_kcal: 1500, days_done: 0, winner: false },
      ] }),
    { id: 2, created_by: "c", mode: "first_to", length_days: 10, status: "pending", start_day: null, end_day: null,
      members: [
        { user_id: "c", status: "accepted", target_kcal: 1500, days_done: 0, winner: false },
        { user_id: profile.id, status: "invited", target_kcal: null, days_done: 0, winner: false },
      ] },
    { id: 3, created_by: profile.id, mode: "duration", length_days: 7, status: "finished", start_day: d(-20), end_day: d(-14),
      members: [
        { user_id: profile.id, status: "accepted", target_kcal: 2119, days_done: 6, winner: true, result_seen: !new URLSearchParams(location.search).has("final") },
        { user_id: "c", status: "accepted", target_kcal: 1500, days_done: 4, winner: false, result_seen: true },
      ] },
  ].map((c) => ({ ...c, members: c.members.map((m) => ({ ...m, done: m.done ?? m.days_done, profile: people[m.user_id] })) }));
  const medals = [
    { id: 1, kind: "first_entry", period_key: "first", seen: true },
    { id: 2, kind: "day_in_range", period_key: d(-1), seen: true },
    { id: 3, kind: "day_in_range", period_key: d(-3), seen: true },
    { id: 4, kind: "streak_7", period_key: d(-1), seen: !showMoments },
    { id: 5, kind: "challenge_won", period_key: "3", seen: true },
    { id: 6, kind: "challenge_done", period_key: "3", seen: true },
  ];
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
  const activity = [
    { id: 5, kind: "poke", actor: "c", targets: [profile.id], data: { kind: "tease" }, created_at: ago(12) },
    { id: 4, kind: "challenge_invite", actor: "c", targets: [profile.id], data: { mode: "first_to", length: 10 }, created_at: ago(90) },
    { id: 3, kind: "medal", actor: profile.id, targets: [], data: { medal: "streak_7" }, created_at: ago(60 * 9) },
    { id: 2, kind: "challenge_accept", actor: "c", targets: [profile.id], data: { mode: "duration", length: 7 }, created_at: ago(60 * 80) },
    { id: 1, kind: "challenge_won", actor: profile.id, targets: ["c"], data: { days: 6, mode: "duration", length: 7 }, created_at: ago(60 * 24 * 14) },
  ];
  const pokes = showMoments ? [
    { id: 1, from_user: "c", to_user: profile.id, kind: "cheer", created_at: ago(20) },
    { id: 2, from_user: "c", to_user: profile.id, kind: "tease", created_at: ago(12) },
  ] : [];
  return { challenges, friends: [claudia], medals, activity, pokes, people };
}

function demoStats(me) {
  return me
    ? { current_streak: 9, best_streak: 12, days_logged: 31, days_in_range: 19, challenges_played: 2, challenges_won: 1, medals: 6 }
    : { current_streak: 14, best_streak: 14, days_logged: 28, days_in_range: 22, challenges_played: 2, challenges_won: 1, medals: 8 };
}
