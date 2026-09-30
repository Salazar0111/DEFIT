// Cálculo del plan calórico.
// Metabolismo basal con Mifflin-St Jeor, ajuste por contextura y factor de actividad.
// El déficit se aplica solo a la comida: meta = gasto total − déficit.

export const FRAMES = [
  { id: "small", label: "Pequeña", hint: "Huesos finos. Al rodear tu muñeca con pulgar y dedo medio, se superponen.", adj: -0.04 },
  { id: "medium", label: "Mediana", hint: "Al rodear tu muñeca, pulgar y dedo medio apenas se tocan.", adj: 0 },
  { id: "large", label: "Grande", hint: "Huesos anchos. Al rodear tu muñeca, pulgar y dedo medio no se tocan.", adj: 0.04 },
];

export const ACTIVITIES = [
  { id: "sedentary", label: "Sedentario", hint: "Poco o nada de ejercicio. Trabajo sentado.", factor: 1.2 },
  { id: "moderate", label: "Moderado", hint: "Entrenas 3 a 5 días por semana.", factor: 1.55 },
  { id: "daily", label: "Todos los días", hint: "Entrenas 6 o 7 días por semana, con intensidad.", factor: 1.725 },
];

export const DEFICITS = [
  { kcal: 600, label: "Moderado" },
  { kcal: 800, label: "Intenso" },
  { kcal: 1000, label: "Agresivo" },
];

// Mínimos de referencia habituales en nutrición.
export const FLOOR = { f: 1200, m: 1500 };

const KCAL_PER_KG = 7700;

export function ageFrom(birthdate, now = new Date()) {
  if (!birthdate) return null;
  const b = new Date(birthdate + "T12:00:00");
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function computePlan({ sex, birthdate, height_cm, weight_kg, frame, activity, deficit = 0 }) {
  const age = ageFrom(birthdate);
  const w = Number(weight_kg);
  const h = Number(height_cm);
  if (!sex || !age || !w || !h || !frame || !activity) return null;

  const mifflin = 10 * w + 6.25 * h - 5 * age + (sex === "m" ? 5 : -161);
  const frameAdj = FRAMES.find((f) => f.id === frame).adj;
  const bmr = Math.round(mifflin * (1 + frameAdj));

  const factor = ACTIVITIES.find((a) => a.id === activity).factor;
  const tdee = Math.round(bmr * factor);
  // Lo que suma el entrenamiento sobre una vida sedentaria.
  const training = Math.round(bmr * (factor - 1.2));

  const target = tdee - deficit;
  const floor = FLOOR[sex];
  const warnings = [];
  if (deficit > 0 && target < floor) {
    warnings.push(`Tu meta quedaría en ${target.toLocaleString("es-CO")} kcal, por debajo del mínimo de referencia de ${floor.toLocaleString("es-CO")} kcal.`);
  } else if (deficit > 0 && target < bmr) {
    warnings.push(`Comerías menos que tu metabolismo basal (${bmr.toLocaleString("es-CO")} kcal). Es sostenible por poco tiempo.`);
  }
  if (deficit > 0 && deficit / tdee > 0.35) {
    warnings.push(`Es un recorte del ${Math.round((deficit / tdee) * 100)}% de tu gasto diario. Consúltalo con un profesional.`);
  }

  return {
    age,
    bmr,
    tdee,
    training,
    target,
    floor,
    weeklyKg: deficit > 0 ? Math.round(((deficit * 7) / KCAL_PER_KG) * 100) / 100 : 0,
    warnings,
  };
}

export const fmt = (n) => Math.round(n).toLocaleString("es-CO");
