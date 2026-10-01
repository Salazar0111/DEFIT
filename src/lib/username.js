import { supabase } from "./supabase";

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const cleanUsername = (v) => String(v || "").toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "").slice(0, 20);

// Propuesta a partir del nombre: "María José" -> "mariajose".
export const suggestUsername = (name) =>
  cleanUsername(String(name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ""));

// Guarda el usuario. Devuelve el texto de error, o null si quedó bien.
export async function saveUsername(profile, raw) {
  const u = cleanUsername(raw);
  if (!USERNAME_RE.test(u)) return "Usa de 3 a 20 letras minúsculas, números o guion bajo.";
  if (profile.id === "demo") return null;
  const { error } = await supabase.from("profiles").update({ username: u }).eq("id", profile.id);
  if (error) return error.code === "23505" ? "Ese usuario ya está en uso." : "No se pudo guardar. Intenta de nuevo.";
  return null;
}
