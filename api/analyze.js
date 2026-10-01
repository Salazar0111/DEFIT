// Estimación de calorías con IA. Solo usuarios con sesión de Supabase y con cuota disponible.
// El cliente no envía prompts: solo una foto o el texto de un alimento.

const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 2000; // un desayuno con muchos ingredientes se cortaba a medias con 900
const DAILY_LIMIT = 40;
const MAX_IMAGE_CHARS = 1_400_000; // base64 de una foto de ~900px

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const INSTRUCTIONS = `Eres nutricionista. Separa la comida en sus ingredientes y estima gramos, calorías y macronutrientes de cada uno, con valores realistas para porciones colombianas típicas cuando no se indique la cantidad.
Responde SOLO con un objeto JSON, sin texto adicional ni markdown, con esta forma exacta:
{"food":true,"name":"nombre corto del plato en español","portion":"porción total, ej: 1 plato","ingredients":[{"name":"ingrediente","grams":número,"kcal":número,"protein_g":número,"carbs_g":número,"fat_g":número}]}
Incluye aceites, salsas y bebidas si se ven o se mencionan. Máximo 12 ingredientes.
Si no hay comida identificable, responde {"food":false}.`;

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

function buildMessage(body) {
  if (body?.mode === "photo" && typeof body.image === "string" && body.image.length <= MAX_IMAGE_CHARS) {
    return [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: body.image } },
      { type: "text", text: `${INSTRUCTIONS}\n\nAnaliza la comida de esta foto.` },
    ];
  }
  if (body?.mode === "text" && typeof body.query === "string") {
    const q = body.query.trim().slice(0, 200);
    if (q) return `${INSTRUCTIONS}\n\nAlimento: ${JSON.stringify(q)}`;
  }
  return null;
}

// Lee el JSON de la respuesta. Si quedó cortado (límite de tokens), recupera los ingredientes completos.
function parseFood(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;
  const body = text.slice(start);
  try { return JSON.parse(body.slice(0, body.lastIndexOf("}") + 1)); } catch { /* sigue */ }
  const cut = body.lastIndexOf("},");
  if (cut > 0) {
    try { return JSON.parse(body.slice(0, cut + 1) + "]}"); } catch { /* sigue */ }
  }
  return null;
}

async function askModel(apiKey, content) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, messages: [{ role: "user", content }] }),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error("analyze: IA respondió", response.status, JSON.stringify(data).slice(0, 300));
    return { error: "ai_status" };
  }
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const parsed = parseFood(text);
  if (!parsed) console.error("analyze: JSON ilegible", data.stop_reason, text.slice(0, 300));
  return { parsed };
}

const num = (v, max) => Math.min(Math.max(Math.round(Number(v) * 10) / 10 || 0, 0), max);

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

  const content = buildMessage(req.body);
  if (!content) return res.status(400).json({ error: "Solicitud inválida o imagen demasiado grande." });

  const quotaResp = await supabaseFetch("/rest/v1/rpc/consume_ai_quota", token, {
    method: "POST",
    body: JSON.stringify({ max_calls: DAILY_LIMIT }),
  });
  if (!quotaResp.ok) return res.status(500).json({ error: "No se pudo verificar la cuota." });
  if ((await quotaResp.json()) !== true) {
    return res.status(429).json({ error: `Llegaste al límite de ${DAILY_LIMIT} análisis por hoy.` });
  }

  try {
    // Un reintento por si la respuesta llegó ilegible o el servicio falló un instante.
    let r = await askModel(apiKey, content).catch((e) => { console.error("analyze: fallo de red", e?.message); return { error: "net" }; });
    if (!r.parsed && r.error !== "ai_status") {
      r = await askModel(apiKey, content).catch((e) => { console.error("analyze: fallo de red", e?.message); return { error: "net" }; });
    }
    if (r.error === "ai_status") return res.status(502).json({ error: "El servicio de IA no respondió bien. Intenta de nuevo." });
    const parsed = r.parsed;
    if (!parsed) return res.status(502).json({ error: "No se pudo analizar. Intenta de nuevo." });
    if (parsed.food === false) {
      return res.status(422).json({ error: "No identifiqué comida. Prueba con otra foto o escríbela." });
    }
    const ingredients = (Array.isArray(parsed.ingredients) ? parsed.ingredients : []).slice(0, 12).map((i) => ({
      name: String(i?.name || "Ingrediente").slice(0, 60),
      grams: num(i?.grams, 3000),
      kcal: Math.round(num(i?.kcal, 5000)),
      protein_g: num(i?.protein_g, 500),
      carbs_g: num(i?.carbs_g, 1000),
      fat_g: num(i?.fat_g, 500),
    }));
    if (!ingredients.length) return res.status(422).json({ error: "No identifiqué comida. Prueba con otra foto o escríbela." });
    return res.status(200).json({
      name: String(parsed.name || "Comida").slice(0, 80),
      portion: String(parsed.portion || "").slice(0, 80),
      ingredients,
    });
  } catch (e) {
    console.error("analyze: error", e?.message);
    return res.status(502).json({ error: "No se pudo analizar. Intenta de nuevo." });
  }
}
