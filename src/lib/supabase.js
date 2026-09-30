import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

// Llama al endpoint de IA con la sesión del usuario.
export async function callAI(messages) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");

  const resp = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages }),
  });
  const d = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(d.error || `HTTP ${resp.status}`);
  const txt = (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(txt.replace(/```json|```/g, "").trim());
}
