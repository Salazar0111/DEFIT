// Proxy a la API de Anthropic. Solo usuarios con sesión de Supabase y con cuota disponible.

const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 600;
const DAILY_LIMIT = 40;
const MAX_BODY_BYTES = 1_500_000; // ~1 foto de 900px en base64 más texto

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function supabaseFetch(path, token, init = {}) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

// Solo se aceptan mensajes de usuario con texto o imágenes (sin system ni tools).
function validMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 4) return false;
  return messages.every((m) => {
    if (m?.role !== "user" && m?.role !== "assistant") return false;
    if (typeof m.content === "string") return m.content.length <= 4000;
    return (
      Array.isArray(m.content) &&
      m.content.length <= 4 &&
      m.content.every((b) => b?.type === "text" || (b?.type === "image" && b.source?.type === "base64"))
    );
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Faltan variables de entorno en el servidor." });
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Inicia sesión para usar el análisis." });

  const userResp = await supabaseFetch("/auth/v1/user", token);
  if (!userResp.ok) return res.status(401).json({ error: "Sesión inválida o expirada." });

  if (JSON.stringify(req.body || {}).length > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "La imagen es demasiado grande." });
  }
  const { messages } = req.body || {};
  if (!validMessages(messages)) return res.status(400).json({ error: "Solicitud inválida." });

  const quotaResp = await supabaseFetch("/rest/v1/rpc/consume_ai_quota", token, {
    method: "POST",
    body: JSON.stringify({ max_calls: DAILY_LIMIT }),
  });
  if (!quotaResp.ok) return res.status(500).json({ error: "No se pudo verificar la cuota." });
  if ((await quotaResp.json()) !== true) {
    return res.status(429).json({ error: `Llegaste al límite de ${DAILY_LIMIT} análisis por hoy.` });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, messages }),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({ error: data?.error?.message || "Error del servicio de IA." });
    }
    return res.status(200).json({ content: data.content });
  } catch (error) {
    return res.status(502).json({ error: "No se pudo contactar el servicio de IA." });
  }
}
