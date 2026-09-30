// Candado con Face ID / Touch ID usando el autenticador del dispositivo (WebAuthn).
// Es un bloqueo local de privacidad: la sesión de Supabase sigue siendo la que autentica.
// La preferencia vive en este dispositivo (cada teléfono decide si lo activa).

const KEY = "defit.lock";

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const random = (n) => crypto.getRandomValues(new Uint8Array(n));

export async function lockAvailable() {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

export function lockConfig(userId) {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    return c && c.userId === userId ? c : null;
  } catch {
    return null;
  }
}

export async function enableLock(profile, email) {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: random(32),
      rp: { name: "DEFIT", id: location.hostname },
      user: { id: random(16), name: email || profile.name || "defit", displayName: profile.name || "DEFIT" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60000,
    },
  });
  if (!cred) throw new Error("No se pudo activar.");
  try { localStorage.setItem(KEY, JSON.stringify({ userId: profile.id, credId: b64(cred.rawId) })); } catch {}
}

export function disableLock() {
  try { localStorage.removeItem(KEY); } catch {}
}

// Pide Face ID. Debe llamarse desde un toque del usuario (Safari lo exige).
export async function unlock(config) {
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: random(32),
      allowCredentials: [{ type: "public-key", id: unb64(config.credId) }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  return !!res;
}
