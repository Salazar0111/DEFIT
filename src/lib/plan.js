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

// ─── Plan v2: vida diaria + entrenamiento por tipo de día + 5 objetivos ──────────────────

export const LIFESTYLES = [
  { id: "seated", label: "Sentado", hint: "Oficina, estudio o trabajo de escritorio.", factor: 1.2 },
  { id: "standing", label: "De pie o caminando", hint: "Comercio, docencia, servicio o mucho movimiento.", factor: 1.35 },
  { id: "physical", label: "Trabajo físico", hint: "Construcción, carga, campo o deporte como oficio.", factor: 1.5 },
];

export const TRAIN_TYPES = [
  { id: "weights", label: "Pesas" },
  { id: "cardio", label: "Cardio" },
  { id: "both", label: "Ambos" },
];

export const SESSION_MINUTES = [45, 60, 90];

// 1 = lunes … 7 = domingo (isodow, igual que la base de datos)
export const WEEKDAYS = [
  { n: 1, short: "L", long: "Lunes" }, { n: 2, short: "M", long: "Martes" }, { n: 3, short: "X", long: "Miércoles" },
  { n: 4, short: "J", long: "Jueves" }, { n: 5, short: "V", long: "Viernes" }, { n: 6, short: "S", long: "Sábado" },
  { n: 7, short: "D", long: "Domingo" },
];

export const GOALS = [
  { id: "lose", label: "Bajar peso", hint: "Comer menos de lo que gastas." },
  { id: "recomp", label: "Recomposición", hint: "Bajar grasa y ganar músculo a la vez. Exige pesas." },
  { id: "maintain", label: "Mantener", hint: "Comer lo mismo que gastas." },
  { id: "gain_clean", label: "Ganar peso limpio", hint: "+10% sobre tu gasto. Sube músculo con poca grasa." },
  { id: "gain_fast", label: "Ganar peso más rápido", hint: "+20% sobre tu gasto. Sube más, sobre todo grasa." },
];

export const DAY_TYPES = [
  { id: "rest", label: "Descanso" },
  { id: "train", label: "Entreno" },
  { id: "leg", label: "Pierna" },
];

// MET de referencia (Compendio de Actividad Física 2024). Se resta 1 para no contar dos veces el basal.
const MET = {
  leg: { moderate: 5.0, intense: 6.0 },
  weights: { moderate: 3.5, intense: 4.5 },
  cardio: { moderate: 5.5, intense: 7.0 },
  both: { moderate: 4.5, intense: 5.5 },
};

const round = (n) => Math.round(n);

// type: "leg", "weights", "cardio" o "both".
export function trainKcal(type, intensity, minutes, weight) {
  const met = MET[type]?.[intensity] ?? 0;
  return Math.max(0, round((met - 1) * weight * (minutes / 60)));
}

// Metabolismo basal: Katch-McArdle si se conoce la grasa corporal; si no, Mifflin-St Jeor con ajuste por contextura.
export function basal({ sex, age, height_cm, weight_kg, frame, body_fat }) {
  const w = Number(weight_kg), h = Number(height_cm);
  if (body_fat) {
    const lbm = w * (1 - Number(body_fat) / 100);
    return round(370 + 21.6 * lbm);
  }
  const mifflin = 10 * w + 6.25 * h - 5 * age + (sex === "m" ? 5 : -161);
  return round(mifflin * (1 + (FRAMES.find((f) => f.id === frame)?.adj ?? 0)));
}

export const defaultMinutes = 60;

// Devuelve el plan completo: metas por tipo de día, meta promedio, proteína, advertencias y cambio estimado.
export function computePlanV2(d) {
  const age = ageFrom(d.birthdate);
  const w = Number(d.weight_kg);
  if (!d.sex || !age || !w || !Number(d.height_cm) || !d.lifestyle || !d.goal) return null;

  const bmr = basal({ ...d, age });
  const base = round(bmr * LIFESTYLES.find((l) => l.id === d.lifestyle).factor);
  const trains = !!d.trains && (d.train_days || []).length > 0;
  const trainType = d.train_type || "weights";
  const minutes = d.session_min || defaultMinutes;
  const intensity = d.intensity || "moderate";
  const legDays = trainType === "cardio" ? [] : (d.leg_days || []).filter((n) => (d.train_days || []).includes(n));
  const plainDays = trains ? (d.train_days || []).filter((n) => !legDays.includes(n)) : [];

  const burn = {
    rest: 0,
    train: trains ? trainKcal(trainType, intensity, minutes, w) : 0,
    leg: trains ? trainKcal(trainType === "cardio" ? "cardio" : "leg", intensity, minutes, w) : 0,
  };
  const exp = { rest: base, train: base + burn.train, leg: base + burn.leg };
  const count = { rest: 7 - plainDays.length - legDays.length, train: plainDays.length, leg: legDays.length };
  const weeklyExp = exp.rest * count.rest + exp.train * count.train + exp.leg * count.leg;
  const avgExp = weeklyExp / 7;

  // Ajuste por objetivo sobre el gasto promedio.
  const deficit = d.goal === "lose" ? d.deficit || 600 : 0;
  const adj = { lose: -deficit, recomp: -0.1 * avgExp, maintain: 0, gain_clean: 0.1 * avgExp, gain_fast: 0.2 * avgExp }[d.goal];
  const avgTarget = avgExp + adj;

  let targets;
  if (d.target_mode === "fixed" || !trains) {
    targets = { rest: round(avgTarget), train: round(avgTarget), leg: round(avgTarget) };
  } else if (d.goal === "recomp" && count.rest > 0) {
    // Recomposición: los días de entreno quedan en mantenimiento y el déficit va en los descansos (con tope).
    const totalDeficit = -adj * 7;
    const perRest = Math.min(totalDeficit / count.rest, exp.rest * 0.25);
    const left = totalDeficit - perRest * count.rest;
    const trainDays = count.train + count.leg;
    const perTrain = trainDays ? left / trainDays : 0;
    targets = { rest: round(exp.rest - perRest), train: round(exp.train - perTrain), leg: round(exp.leg - perTrain) };
  } else {
    // Mismo ajuste total, repartido según lo que cada día gasta.
    targets = { rest: round(exp.rest + adj), train: round(exp.train + adj), leg: round(exp.leg + adj) };
  }
  const weeklyTarget = targets.rest * count.rest + targets.train * count.train + targets.leg * count.leg;
  const target = round(weeklyTarget / 7);

  const floor = FLOOR[d.sex];
  const lowest = Math.min(...Object.entries(targets).filter(([k]) => count[k] > 0).map(([, v]) => v));
  // warnings = riesgos de comer poco (piden confirmación). notes = avisos informativos, sin alarma.
  const warnings = [];
  const notes = [];
  if (d.goal === "lose") {
    if (lowest < floor) warnings.push(`Tu día más bajo quedaría en ${fmt(lowest)} kcal, por debajo del mínimo de referencia de ${fmt(floor)} kcal.`);
    else if (lowest < bmr) warnings.push(`Tu día más bajo quedaría por debajo de tu metabolismo basal (${fmt(bmr)} kcal). Es sostenible por poco tiempo.`);
    if (deficit / avgExp > 0.35) warnings.push(`Es un recorte del ${Math.round((deficit / avgExp) * 100)}% de tu gasto diario. Consúltalo con un profesional.`);
  } else if (d.goal === "recomp") {
    // El déficit de la recomposición es pequeño: solo se avisa si un día cae bajo el mínimo de referencia.
    if (lowest < floor) warnings.push(`Tu día más bajo quedaría en ${fmt(lowest)} kcal, por debajo del mínimo de referencia de ${fmt(floor)} kcal.`);
    else notes.push("Los días de entreno quedan cerca de tu mantenimiento y el ajuste va en los días de descanso.");
  } else if (d.goal === "gain_fast") {
    notes.push(trains
      ? "Con +20% la evidencia muestra que sumas sobre todo grasa, no más músculo. +10% rinde igual con menos grasa."
      : "Sin entrenar con pesas, el peso que ganes será mayormente grasa.");
  } else if (d.goal === "gain_clean" && !trains) {
    notes.push("Sin entrenar con pesas, el peso que ganes será mayormente grasa.");
  }

  // Proteína (g/kg): más alta al bajar o recomponer y al entrenar.
  const gkg = trains
    ? { lose: 2.2, recomp: 2.2, maintain: 1.8, gain_clean: 2.0, gain_fast: 2.0 }[d.goal]
    : { lose: 1.8, recomp: 1.8, maintain: 1.6, gain_clean: 1.6, gain_fast: 1.6 }[d.goal];
  const protein = round(gkg * w);

  return {
    age, bmr, base, burn, exp, count, targets, target, protein, floor, warnings, notes, trains,
    legDays, plainDays,
    avgExp: round(avgExp),
    adjustment: round(adj),
    weeklyKg: Math.round(((weeklyTarget - weeklyExp) / 7700) * 100) / 100,
  };
}

// Tipo de día según el calendario del plan (isodow 1–7).
export function scheduledType(profile, dateStr) {
  const dow = ((new Date(dateStr + "T12:00:00").getDay() + 6) % 7) + 1;
  if ((profile.leg_days || []).includes(dow)) return "leg";
  if ((profile.train_days || []).includes(dow)) return "train";
  return "rest";
}

// Meta de un día: cambio puntual (si hay) o calendario; las cuentas con plan v1 tienen una sola meta.
export function dayTarget(profile, dateStr, override) {
  if (!profile.targets || (profile.plan_version || 1) < 2) return { type: null, target: profile.target_kcal || 0 };
  const type = override || scheduledType(profile, dateStr);
  return { type, target: profile.targets[type] ?? profile.target_kcal };
}
