// Recordatorios push de DEFIT.
// - Cron (cada 5 min, con CRON_SECRET): revisa la hora local de cada usuario y envía
//   solo los recordatorios que aún tienen sentido (p. ej. no avisa del almuerzo si ya lo registró).
// - Prueba (usuario con sesión, body { test: true }): envía una notificación a sus dispositivos.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const WINDOW_MIN = 10; // tolera una corrida perdida del cron
const MEALS = { breakfast: "desayuno", lunch: "almuerzo", dinner: "cena" } as const;
const fmt = (n: number) => Math.round(n).toLocaleString("es-CO");

type Sub = { endpoint: string; p256dh: string; auth: string };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendTo(subs: Sub[], payload: Record<string, string>) {
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 },
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return sent;
}

// Hora local del usuario: { day: "YYYY-MM-DD", minutes: minutos desde medianoche }.
function localNow(tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

async function buildMessage(kind: string, p: Record<string, any>, day: string) {
  const first = (p.name || "").split(" ")[0];
  if (kind in MEALS) {
    const meal = MEALS[kind as keyof typeof MEALS];
    const { count } = await supabase.from("food_entries").select("id", { count: "exact", head: true })
      .eq("user_id", p.id).eq("day", day).eq("meal", kind);
    if (count) return null;
    return { title: `Hora de registrar tu ${meal}`, body: `${first}, toma una foto de tu plato y listo.`, url: "/?tab=food" };
  }
  if (kind === "nudge") {
    const { data } = await supabase.from("food_entries").select("kcal").eq("user_id", p.id).eq("day", day);
    const eaten = (data || []).reduce((t, e) => t + e.kcal, 0);
    if (!data?.length) {
      return { title: "Tu día está en blanco", body: `${first}, registra lo que comiste hoy para no romper tu racha.`, url: "/?tab=food" };
    }
    // Meta del día (según descanso, entreno o pierna); las cuentas con plan anterior tienen una sola.
    const { data: dayGoal } = await supabase.rpc("day_target", { uid: p.id, d: day });
    const target = dayGoal || p.target_kcal || 0;
    const inRange = target && eaten >= target * 0.9 && eaten <= target * 1.1;
    return {
      title: inRange ? "Día cumplido" : "Resumen del día",
      body: `Llevas ${fmt(eaten)} de ${fmt(target)} kcal.${inRange ? " Estás en tu rango." : " ¿Falta algo por registrar?"}`,
      url: "/?tab=food",
    };
  }
  return null;
}

async function runCron() {
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth, user_id");
  if (!subs?.length) return { users: 0, sent: 0 };
  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const { data: profiles } = await supabase.from("profiles")
    .select("id, name, timezone, reminders, target_kcal, onboarded").in("id", userIds);

  let sent = 0;
  for (const p of profiles || []) {
    if (!p.onboarded) continue;
    const { day, minutes } = localNow(p.timezone || "America/Bogota");
    for (const [kind, cfg] of Object.entries(p.reminders || {}) as [string, { on: boolean; at: string }][]) {
      if (!cfg?.on || !cfg.at) continue;
      const diff = minutes - toMinutes(cfg.at);
      if (diff < 0 || diff >= WINDOW_MIN) continue;
      // Marca antes de enviar: si otra corrida llega al tiempo, el insert falla y no se duplica.
      const { error } = await supabase.from("reminder_log").insert({ user_id: p.id, day, kind });
      if (error) continue;
      const msg = await buildMessage(kind, p, day);
      if (!msg) continue;
      sent += await sendTo(subs.filter((s) => s.user_id === p.id), { ...msg, tag: kind });
    }
  }
  return { users: profiles?.length || 0, sent };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const auth = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";

  if (auth && auth === Deno.env.get("CRON_SECRET")) {
    const body = await req.json().catch(() => ({}));
    // Eventos de retos (invitación, aceptación, resultado) enviados desde la base de datos.
    if (body.event && Array.isArray(body.user_ids) && body.user_ids.length) {
      const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").in("user_id", body.user_ids);
      const sent = await sendTo(subs || [], {
        // Etiqueta única: con una etiqueta fija el teléfono reemplaza la notificación anterior.
        title: String(body.title || "DEFIT"), body: String(body.body || ""), url: String(body.url || "/"), tag: `ev-${crypto.randomUUID()}`,
      });
      return json({ sent });
    }
    return json(await runCron());
  }

  // Notificación de prueba para el usuario con sesión.
  const { data: { user } } = await supabase.auth.getUser(auth);
  if (!user) return json({ error: "No autorizado" }, 401);
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", user.id);
  const sent = await sendTo(subs || [], {
    title: "Recordatorios activos",
    body: "Así te van a llegar los avisos de DEFIT.",
    tag: "test",
    url: "/",
  });
  return json({ sent });
});
