import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

// Estima calorías con IA: { mode: "photo", image } o { mode: "text", query }.
export async function estimateFood(payload) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");

  const resp = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const d = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(d.error || "No se pudo analizar. Intenta de nuevo.");
  return d;
}
