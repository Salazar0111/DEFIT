import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { supabase } from "./supabase";

// Entrar con Face ID (passkeys). La llave vive en el llavero de iCloud y la verifica /api/passkey.

export const passkeySupported = () => browserSupportsWebAuthn();

async function call(action, body = {}, token) {
  const resp = await fetch("/api/passkey", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify({ action, ...body }),
  });
  const d = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(d.error || "No se pudo completar.");
  return d;
}

const deviceName = () => {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Mac/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android";
  return "Este dispositivo";
};

export async function registerPasskey() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const { options, challengeId } = await call("register-options", {}, token);
  let response;
  try {
    response = await startRegistration({ optionsJSON: options });
  } catch (e) {
    if (e?.name === "InvalidStateError") throw new Error("Este dispositivo ya tiene Face ID activado.");
    throw new Error("Se canceló la activación.");
  }
  await call("register-verify", { response, challengeId, device: deviceName() }, token);
}

export async function loginWithPasskey() {
  const { options, challengeId } = await call("login-options");
  let response;
  try {
    response = await startAuthentication({ optionsJSON: options });
  } catch {
    throw new Error("Se canceló el ingreso con Face ID.");
  }
  const { token_hash } = await call("login-verify", { response, challengeId });
  const { error } = await supabase.auth.verifyOtp({ token_hash, type: "email" });
  if (error) throw new Error("No se pudo iniciar sesión. Intenta de nuevo.");
}
