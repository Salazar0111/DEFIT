// Entrar con Face ID (passkeys). Acciones:
//   register-options / register-verify  → con sesión: guarda una llave del dispositivo
//   login-options / login-verify        → sin sesión: verifica la llave y devuelve un token de acceso
import { createClient } from "@supabase/supabase-js";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

const SUPA_URL = process.env.VITE_SUPABASE_URL;
const admin = createClient(SUPA_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Las llaves quedan ligadas al dominio: solo producción (y localhost en desarrollo).
const ALLOWED_HOSTS = ["defit-eta.vercel.app", "localhost"];

function relyingParty(req) {
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(":")[0];
  if (!ALLOWED_HOSTS.includes(host)) return null;
  const origin = host === "localhost" ? `http://${req.headers.host}` : `https://${host}`;
  return { rpID: host, origin };
}

async function userFromToken(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data?.user || null;
}

async function saveChallenge(kind, challenge, userId = null) {
  // Limpia retos vencidos de paso.
  await admin.from("webauthn_challenges").delete().lt("expires_at", new Date().toISOString());
  const { data, error } = await admin.from("webauthn_challenges")
    .insert({ kind, challenge, user_id: userId }).select("id").single();
  if (error) throw new Error("No se pudo iniciar.");
  return data.id;
}

// Toma el reto una sola vez (se borra al leerlo).
async function takeChallenge(id, kind, userId = null) {
  const { data } = await admin.from("webauthn_challenges").delete()
    .eq("id", id).eq("kind", kind).gt("expires_at", new Date().toISOString())
    .select("challenge, user_id").maybeSingle();
  if (!data || (userId && data.user_id !== userId)) return null;
  return data.challenge;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });
  if (!SUPA_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "Falta configuración del servidor." });
  const rp = relyingParty(req);
  if (!rp) return res.status(400).json({ error: "Dominio no permitido." });

  const { action, response, challengeId, device } = req.body || {};

  try {
    // ─── Registrar una llave (requiere sesión) ───
    if (action === "register-options" || action === "register-verify") {
      const user = await userFromToken(req);
      if (!user) return res.status(401).json({ error: "Inicia sesión primero." });

      if (action === "register-options") {
        const { data: existing } = await admin.from("passkeys").select("id, transports").eq("user_id", user.id);
        const { data: profile } = await admin.from("profiles").select("name").eq("id", user.id).single();
        const options = await generateRegistrationOptions({
          rpName: "DEFIT",
          rpID: rp.rpID,
          userName: user.email,
          userDisplayName: profile?.name || user.email,
          userID: new TextEncoder().encode(user.id),
          attestationType: "none",
          excludeCredentials: (existing || []).map((c) => ({ id: c.id, transports: c.transports })),
          authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" },
        });
        const id = await saveChallenge("register", options.challenge, user.id);
        return res.status(200).json({ options, challengeId: id });
      }

      const expected = await takeChallenge(challengeId, "register", user.id);
      if (!expected) return res.status(400).json({ error: "La solicitud venció. Intenta de nuevo." });
      const v = await verifyRegistrationResponse({
        response, expectedChallenge: expected, expectedOrigin: rp.origin, expectedRPID: rp.rpID, requireUserVerification: true,
      });
      if (!v.verified || !v.registrationInfo) return res.status(400).json({ error: "No se pudo verificar la llave." });
      const { credential } = v.registrationInfo;
      const { error } = await admin.from("passkeys").insert({
        id: credential.id,
        user_id: user.id,
        public_key: isoBase64URL.fromBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports || [],
        device: String(device || "").slice(0, 60) || null,
      });
      if (error) return res.status(500).json({ error: "No se pudo guardar la llave." });
      return res.status(200).json({ ok: true });
    }

    // ─── Entrar con una llave (sin sesión) ───
    if (action === "login-options") {
      const options = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: "required", allowCredentials: [] });
      const id = await saveChallenge("login", options.challenge);
      return res.status(200).json({ options, challengeId: id });
    }

    if (action === "login-verify") {
      const expected = await takeChallenge(challengeId, "login");
      if (!expected) return res.status(400).json({ error: "La solicitud venció. Intenta de nuevo." });
      const { data: key } = await admin.from("passkeys").select("*").eq("id", response?.id).maybeSingle();
      if (!key) return res.status(401).json({ error: "Esta llave no está registrada. Entra con tu contraseña y actívala en Perfil." });

      const v = await verifyAuthenticationResponse({
        response,
        expectedChallenge: expected,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        requireUserVerification: true,
        credential: { id: key.id, publicKey: isoBase64URL.toBuffer(key.public_key), counter: Number(key.counter), transports: key.transports },
      });
      if (!v.verified) return res.status(401).json({ error: "No se pudo verificar." });
      await admin.from("passkeys").update({ counter: v.authenticationInfo.newCounter, last_used_at: new Date().toISOString() }).eq("id", key.id);

      // Crea un token de acceso de un solo uso para esa cuenta (no envía correo).
      const { data: u } = await admin.auth.admin.getUserById(key.user_id);
      if (!u?.user?.email) return res.status(401).json({ error: "Cuenta no encontrada." });
      const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.user.email });
      if (error || !link?.properties?.hashed_token) return res.status(500).json({ error: "No se pudo iniciar sesión." });
      return res.status(200).json({ token_hash: link.properties.hashed_token });
    }

    return res.status(400).json({ error: "Acción inválida." });
  } catch (e) {
    return res.status(400).json({ error: "No se pudo completar. Intenta de nuevo." });
  }
}
