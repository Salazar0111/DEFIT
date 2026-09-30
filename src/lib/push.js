import { supabase } from "./supabase";

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const REMINDERS = [
  { id: "breakfast", label: "Desayuno", hint: "Si no lo has registrado" },
  { id: "lunch", label: "Almuerzo", hint: "Si no lo has registrado" },
  { id: "dinner", label: "Cena", hint: "Si no la has registrado" },
  { id: "weigh", label: "Pesarte", hint: "Si no te has pesado" },
  { id: "nudge", label: "Cierre del día", hint: "Tu resumen del día" },
];

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Estado de las notificaciones en este dispositivo.
export async function pushStatus() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIOS() && !isStandalone() ? "install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

const b64ToUint8 = (b64) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export async function enablePush(userId) {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permiso de notificaciones negado.");
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(VAPID) }));
  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert({
    endpoint: json.endpoint,
    user_id: userId,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent.slice(0, 200),
  });
  if (error) throw new Error("No se pudo guardar la suscripción.");
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

// Envía una notificación de prueba a los dispositivos del usuario.
export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke("reminders", { body: { test: true } });
  if (error) throw new Error("No se pudo enviar la prueba.");
  if (!data?.sent) throw new Error("No hay dispositivos suscritos.");
  return data.sent;
}
