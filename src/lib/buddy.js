import { fmt } from "./plan";

// Ánimo del personaje según cómo va tu día.
export function dayMood({ eaten, target, entries, hour = new Date().getHours() }) {
  if (!entries) return hour < 11 ? "sleepy" : "worried";
  if (eaten > target * 1.1) return "worried";
  if (eaten >= target * 0.9) return "party";
  return "happy";
}

const pick = (list, seed) => list[seed % list.length];

export function dayPhrase({ mood, eaten, target, name, seed = 0 }) {
  const left = Math.max(target - eaten, 0);
  const over = Math.max(eaten - target, 0);
  if (mood === "sleepy") return pick([`Buenos días, ${name}. ¿Qué vamos a desayunar?`, "Todavía estoy despertando. Registra tu primera comida.", "Zzz… una foto de tu desayuno me despierta."], seed);
  if (mood === "worried" && !eaten) return pick(["Hoy no has registrado nada. No me dejes solo.", "Tu día sigue en blanco. ¿Comiste algo?"], seed);
  if (mood === "worried") return pick([`Nos pasamos por ${fmt(over)} kcal. Mañana compensamos.`, "Uy, se nos fue la mano hoy. Sin drama, mañana seguimos.", `${fmt(over)} kcal de más. Una caminata ayuda.`], seed);
  if (mood === "party") return pick(["¡Estás en tu rango! Así se hace.", "Día cumplido. Guárdalo así.", "Meta en la mira. Me encanta."], seed);
  return pick([`Vas bien. Te quedan ${fmt(left)} kcal.`, `Quedan ${fmt(left)} kcal para cerrar el día.`, "Buen ritmo. Sigue registrando."], seed);
}

// Reacción al guardar una comida: compara antes y después.
export function foodReaction({ before, after, target }) {
  const inRange = (k) => k >= target * 0.9 && k <= target * 1.1;
  if (after > target * 1.1 && before <= target * 1.1) return { mood: "surprised", text: "¡Uy! Esa te sacó del rango." };
  if (after > target * 1.1) return { mood: "worried", text: "Seguimos por encima. Anotado." };
  if (inRange(after) && !inRange(before)) return { mood: "party", text: "¡Entraste en tu rango!" };
  if (inRange(after)) return { mood: "party", text: "Sigues en tu rango." };
  return { mood: "happy", text: `Anotado. Te quedan ${fmt(target - after)} kcal.` };
}
