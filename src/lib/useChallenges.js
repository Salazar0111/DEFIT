import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { dayKey, shiftDay } from "./food";

export const inRange = (kcal, target) => target > 0 && kcal >= target * 0.9 && kcal <= target * 1.1;

const ERRORS = {
  PLAN_REQUIRED: "Primero completa tu plan calórico.",
  PLAN_LOCKED: "No puedes cambiar tu plan mientras estás en un reto.",
  NOT_PENDING: "Este reto ya no está pendiente.",
  BAD_OPPONENTS: "Elige al menos a una persona.",
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
    return { ...m, done, today: running ? (mine.find((t) => t.day === today)?.kcal || 0) : null };
  });
  return { ...ch, members };
}

export function useChallenges(profile) {
  const demo = profile.id === "demo";
  const today = dayKey(new Date(), profile.timezone);
  const [state, setState] = useState({ loading: true, challenges: [], friends: [], medals: [] });
  const timer = useRef(null);

  const load = useCallback(async () => {
    if (demo) { setState({ loading: false, ...demoData(profile, today) }); return; }
    const [{ data: mine }, { data: friends }, { data: medals }] = await Promise.all([
      supabase.from("challenge_members").select("challenge_id").eq("user_id", profile.id),
      supabase.from("profiles").select("id, name, avatar, onboarded").neq("id", profile.id),
      supabase.from("medals").select("*").eq("user_id", profile.id).order("earned_at", { ascending: false }),
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
    setState({ loading: false, challenges, friends: (friends || []).filter((f) => f.onboarded), medals: medals || [] });
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
    c.members.some((m) => m.user_id === profile.id && m.status === "accepted"));

  const markMedalsSeen = async () => {
    const unseen = state.medals.filter((m) => !m.seen).map((m) => m.id);
    if (!unseen.length) return;
    setState((s) => ({ ...s, medals: s.medals.map((m) => ({ ...m, seen: true })) }));
    if (demo) return;
    await supabase.from("medals").update({ seen: true }).in("id", unseen);
  };

  return {
    ...state,
    today,
    planLocked,
    reload: load,
    markMedalsSeen,
    create: (opponents, mode, length) => rpc("create_challenge", { opponents, mode, length_days: length }),
    respond: (id, accept) => rpc("respond_challenge", { cid: id, accept }),
    cancel: (id) => rpc("cancel_challenge", { cid: id }),
  };
}

// ─── Datos de demo ─────────────────────────────────────────────────────────
function demoData(profile, today) {
  const claudia = { id: "c", name: "Claudia", avatar: "a5", onboarded: true };
  const d = (n) => shiftDay(today, n);
  const totals = [
    ...[-3, -2, -1].map((n, i) => ({ user_id: profile.id, day: d(n), kcal: [2100, 2400, 2050][i] })),
    ...[-3, -2, -1].map((n, i) => ({ user_id: "c", day: d(n), kcal: [1500, 1480, 1390][i] })),
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
        { user_id: profile.id, status: "accepted", target_kcal: 2119, days_done: 6, winner: true },
        { user_id: "c", status: "accepted", target_kcal: 1500, days_done: 4, winner: false },
      ] },
  ].map((c) => ({ ...c, members: c.members.map((m) => ({ ...m, done: m.done ?? m.days_done, profile: people[m.user_id] })) }));
  const medals = [
    { id: 1, kind: "first_entry", period_key: "first", seen: true },
    { id: 2, kind: "day_in_range", period_key: d(-1), seen: true },
    { id: 3, kind: "day_in_range", period_key: d(-3), seen: true },
    { id: 4, kind: "streak_7", period_key: d(-1), seen: false },
    { id: 5, kind: "challenge_won", period_key: "3", seen: true },
    { id: 6, kind: "challenge_done", period_key: "3", seen: true },
  ];
  return { challenges, friends: [claudia], medals };
}
