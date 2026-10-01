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

// Tipos de día (clave que fija la meta): descanso, pesas, pierna, cardio, cardio y pesas, cardio y pierna.
export const DAY_KEY_LABELS = { rest: "Descanso", train: "Pesas", leg: "Pierna", cardio: "Cardio", cw: "Cardio y pesas", cwl: "Cardio y pierna" };
export const DAY_KEY_ORDER = ["rest", "train", "leg", "cardio", "cw", "cwl"];
export const DAY_TYPES = DAY_KEY_ORDER.map((id) => ({ id, label: DAY_KEY_LABELS[id] }));

// Actividades extra: se suman a un día de pesas o cardio, o son el entreno del día. Cada una guarda sus minutos y su nivel.
// MET del Compendio de Actividad Física 2024: Pilates mat 1,8 (02103) y general 2,8 (02105);
// bicicleta estacionaria 50 W 4,0 (01214), 101–125 W 6,8 (01224), 126–150 W 8,0 (01228) y clase de spinning 9,0 (01270).
export const EXTRAS = [
  { id: "pilates", code: "p", label: "Pilates", levels: [
    { id: "mat", label: "Suelo (mat)", hint: "Ejercicios en colchoneta.", met: 1.8 },
    { id: "general", label: "General", hint: "Colchoneta con ritmo medio o con máquinas.", met: 2.8 },
  ], defaultLevel: "general" },
  { id: "cycling", code: "b", label: "Ciclismo", levels: [
    { id: "light", label: "Suave", hint: "Puedes conversar sin problema (~50 W).", met: 4.0 },
    { id: "moderate", label: "Moderado", hint: "Ritmo constante (~100–125 W).", met: 6.8 },
    { id: "hard", label: "Fuerte", hint: "Respiras con esfuerzo (~126–150 W).", met: 8.0 },
    { id: "spin", label: "Clase de spinning", hint: "Con intervalos y cambios de ritmo.", met: 9.0 },
  ], defaultLevel: "moderate" },
];
export const EXTRAS_DEFAULT = { pilates: { minutes: 45, level: "general" }, cycling: { minutes: 45, level: "moderate" } };
const extraById = (id) => EXTRAS.find((e) => e.id === id);

// Una clave de día es la base (rest, train, leg, cardio, cw, cwl) más las actividades extra: "train+p", "rest+pb".
export const splitKey = (key = "rest") => {
  const [base, codes = ""] = String(key).split("+");
  return { base, extras: EXTRAS.filter((e) => codes.includes(e.code)).map((e) => e.id) };
};
export const makeKey = (base, extras = []) => {
  const codes = EXTRAS.filter((e) => extras.includes(e.id)).map((e) => e.code).join("");
  return codes ? `${base}+${codes}` : base;
};
export const ALL_KEYS = DAY_KEY_ORDER.flatMap((b) => ["", "p", "b", "pb"].map((c) => (c ? `${b}+${c}` : b)));

// Nombre del día: "Pesas", "Pesas + pilates", "Pilates y ciclismo".
export const keyLabel = (key) => {
  const { base, extras } = splitKey(key);
  const names = extras.map((id) => extraById(id).label);
  if (!names.length) return DAY_KEY_LABELS[base] || "Descanso";
  if (base === "rest") return names.join(" y ").replace(/ y ([A-Z])/, (_, c) => ` y ${c.toLowerCase()}`);
  return `${DAY_KEY_LABELS[base]} + ${names.join(" y ").toLowerCase()}`;
};

// Calorías de una actividad extra: (MET − 1) × peso × horas. Con kcal conocidas se usan tal cual.
export function extraBurn(id, cfg, weight, minutes) {
  const e = extraById(id);
  const c = (cfg || EXTRAS_DEFAULT)[id] || EXTRAS_DEFAULT[id];
  const met = (e.levels.find((l) => l.id === c.level) || e.levels.find((l) => l.id === e.defaultLevel)).met;
  const m = minutes == null ? c.minutes : Number(minutes) || 0;
  return Math.max(0, Math.round((met - 1) * Number(weight) * (m / 60)));
}

export const MUSCLE_LABELS = { chest: "Pecho", back: "Espalda", shoulders: "Hombros", arms: "Brazos", legs: "Pierna", core: "Core" };
export const MUSCLE_ORDER = ["chest", "back", "shoulders", "arms", "legs", "core"];

// kind: "weights" | "cardio" | "both". Con pierna entre los músculos, el día gasta más.
export const dayKeyOf = (kind, muscles = [], extras = []) => {
  const legs = muscles.includes("legs");
  if (!kind) return makeKey("rest", extras);     // solo actividades extra
  if (kind === "cardio") return makeKey("cardio", extras);
  if (kind === "both") return makeKey(legs ? "cwl" : "cw", extras);
  return makeKey(legs ? "leg" : "train", extras);
};

// MET de referencia (Compendio de Actividad Física 2024). Se resta 1 para no contar dos veces el basal.
const MET = {
  leg: { moderate: 5.0, intense: 6.0 },
  weights: { moderate: 3.5, intense: 4.5 },
  cardio: { moderate: 5.5, intense: 7.0 },
  both: { moderate: 4.5, intense: 5.5 },
  cwl: { moderate: 5.25, intense: 6.5 },
};

const round = (n) => Math.round(n);

// Trotadora: ecuaciones metabólicas del ACSM según velocidad e inclinación.
//   Caminar: VO2 = 0,1·v + 1,8·v·pendiente + 3,5     Correr: VO2 = 0,2·v + 0,9·v·pendiente + 3,5
// (v en m/min, pendiente como fracción, VO2 en ml/kg/min; 1 MET = 3,5). Caminar es válido hasta ~7 km/h.
export const CARDIO_DEFAULT = { mode: "run", speed: 8, incline: 1 };
export function treadmillMET({ mode = "run", speed = 8, incline = 0 } = {}) {
  const v = (Number(speed) * 1000) / 60;
  const g = Math.max(0, Number(incline) || 0) / 100;
  const vo2 = mode === "walk" ? 0.1 * v + 1.8 * v * g + 3.5 : 0.2 * v + 0.9 * v * g + 3.5;
  return vo2 / 3.5;
}

// MET de un tipo de día. El cardio usa la trotadora de la persona; sin ella, un valor genérico.
function keyMet(key, intensity, cardio) {
  const cardioMet = cardio ? treadmillMET(cardio) : MET.cardio[intensity];
  const w = MET.weights[intensity], l = MET.leg[intensity];
  return { train: w, leg: l, cardio: cardioMet, cw: (w + cardioMet) / 2, cwl: (l + cardioMet) / 2 }[key] ?? 0;
}

// Calorías de un entreno: (MET − 1) × peso × horas. key: train, leg, cardio, cw o cwl.
export function burnKcal(key, intensity, minutes, weight, cardio, extrasCfg) {
  const { base, extras } = splitKey(key);
  const main = Math.max(0, round((keyMet(base, intensity, cardio) - 1) * weight * (minutes / 60)));
  return main + extras.reduce((t, id) => t + extraBurn(id, extrasCfg, weight), 0);
}

// Metabolismo basal: Katch-McArdle si se conoce la grasa corporal; si no, Mifflin-St Jeor (sin ajustes propios).
export function basal({ sex, age, height_cm, weight_kg, frame, body_fat }) {
  const w = Number(weight_kg), h = Number(height_cm);
  if (body_fat) {
    const lbm = w * (1 - Number(body_fat) / 100);
    return round(370 + 21.6 * lbm);
  }
  const mifflin = 10 * w + 6.25 * h - 5 * age + (sex === "m" ? 5 : -161);
  return round(mifflin);
}

export const defaultMinutes = 60;

// Planes anteriores (un solo tipo de entreno y días de pierna) → plan por día.
export function legacyDayPlan(d) {
  const out = {};
  const kind = d.train_type || "weights";
  (d.train_days || []).forEach((n) => {
    const muscles = (d.leg_days || []).includes(n) ? ["legs"] : [];
    out[n] = { kind, muscles, key: dayKeyOf(kind, muscles) };
  });
  return out;
}

// Plan por día normalizado: { dow: { kind, muscles, key } }.
export function normalizeDayPlan(d) {
  const raw = d.day_plan && Object.keys(d.day_plan).length ? d.day_plan : legacyDayPlan(d);
  return Object.fromEntries(Object.entries(raw).map(([n, e]) => [n, { kind: e.kind || null, muscles: e.muscles || [], extras: e.extras || [], key: e.key || dayKeyOf(e.kind, e.muscles, e.extras) }]));
}

// Devuelve el plan completo: metas por tipo de día, meta promedio, proteína, avisos y cambio estimado.
export function computePlanV2(d) {
  const age = ageFrom(d.birthdate);
  const w = Number(d.weight_kg);
  if (!d.sex || !age || !w || !Number(d.height_cm) || !d.lifestyle || !d.goal) return null;

  const bmr = basal({ ...d, age });
  const base = round(bmr * LIFESTYLES.find((l) => l.id === d.lifestyle).factor);
  const dp = d.trains ? normalizeDayPlan(d) : {};
  const trainDays = Object.keys(dp).map(Number).sort((a, b) => a - b);
  const trains = trainDays.length > 0;
  const minutes = d.session_min || defaultMinutes;
  const intensity = d.intensity || "moderate";

  // Cuántos días hay de cada tipo y qué gasta cada uno.
  const count = { rest: 7 - trainDays.length };
  trainDays.forEach((n) => { count[dp[n].key] = (count[dp[n].key] || 0) + 1; });
  const keys = ALL_KEYS.filter((k) => count[k] > 0);   // tipos que hay en tu semana
  const burn = { rest: 0 };
  const exp = { rest: base };
  ALL_KEYS.filter((k) => k !== "rest").forEach((k) => {   // pero cualquier tipo se puede elegir un día
    burn[k] = burnKcal(k, intensity, minutes, w, d.cardio, d.extras);
    exp[k] = base + burn[k];
  });
  const weeklyExp = keys.reduce((t, k) => t + exp[k] * count[k], 0);
  const avgExp = weeklyExp / 7;

  // Ajuste por objetivo sobre el gasto promedio.
  const deficit = d.goal === "lose" ? d.deficit || 600 : 0;
  const adj = { lose: -deficit, recomp: -0.1 * avgExp, maintain: 0, gain_clean: 0.1 * avgExp, gain_fast: 0.2 * avgExp }[d.goal];
  const avgTarget = avgExp + adj;

  const targets = {};
  const trainKeys = ALL_KEYS.filter((k) => k !== "rest");
  if (d.target_mode === "fixed" || !trains) {
    ALL_KEYS.forEach((k) => { targets[k] = round(avgTarget); });
  } else if (d.goal === "recomp" && count.rest > 0) {
    // Recomposición: los días de entreno quedan en mantenimiento y el déficit va en los descansos (con tope).
    const totalDeficit = -adj * 7;
    const perRest = Math.min(totalDeficit / count.rest, exp.rest * 0.25);
    const left = totalDeficit - perRest * count.rest;
    const trainCount = trainKeys.reduce((t, k) => t + (count[k] || 0), 0);
    const perTrain = trainCount ? left / trainCount : 0;
    targets.rest = round(exp.rest - perRest);
    trainKeys.forEach((k) => { targets[k] = round(exp[k] - perTrain); });
  } else {
    // Mismo ajuste total, repartido según lo que cada día gasta.
    ALL_KEYS.forEach((k) => { targets[k] = round(exp[k] + adj); });
  }
  const weeklyTarget = keys.reduce((t, k) => t + targets[k] * count[k], 0);
  const target = round(weeklyTarget / 7);

  const floor = FLOOR[d.sex];
  const lowest = Math.min(...keys.map((k) => targets[k]));
  const hasWeights = trains && trainDays.some((n) => dp[n].kind === "weights" || dp[n].kind === "both");
  // warnings = riesgos de comer poco (piden confirmación). notes = avisos informativos, sin alarma.
  const warnings = [];
  const notes = [];
  if (d.goal === "lose") {
    if (lowest < floor) warnings.push(`Tu día más bajo quedaría en ${fmt(lowest)} kcal, por debajo del mínimo de referencia de ${fmt(floor)} kcal.`);
    else if (lowest < bmr) warnings.push(`Tu día más bajo quedaría por debajo de tu metabolismo basal (${fmt(bmr)} kcal). Es sostenible por poco tiempo.`);
    if (deficit / avgExp > 0.35) warnings.push(`Es un recorte del ${Math.round((deficit / avgExp) * 100)}% de tu gasto diario. Consúltalo con un profesional.`);
  } else if (d.goal === "recomp") {
    if (lowest < floor) warnings.push(`Tu día más bajo quedaría en ${fmt(lowest)} kcal, por debajo del mínimo de referencia de ${fmt(floor)} kcal.`);
    else notes.push("Los días de entreno quedan cerca de tu mantenimiento y el ajuste va en los días de descanso.");
  } else if (d.goal === "gain_fast") {
    notes.push(hasWeights
      ? "Con +20% la evidencia muestra que sumas sobre todo grasa, no más músculo. +10% rinde igual con menos grasa."
      : "Sin entrenar con pesas, el peso que ganes será mayormente grasa.");
  } else if (d.goal === "gain_clean" && !hasWeights) {
    notes.push("Sin entrenar con pesas, el peso que ganes será mayormente grasa.");
  }

  // Proteína (g/kg): más alta al bajar o recomponer y al entrenar con pesas.
  const gkg = hasWeights
    ? { lose: 2.2, recomp: 2.2, maintain: 1.8, gain_clean: 2.0, gain_fast: 2.0 }[d.goal]
    : { lose: 1.8, recomp: 1.8, maintain: 1.6, gain_clean: 1.6, gain_fast: 1.6 }[d.goal];
  const protein = round(gkg * w);

  return {
    age, bmr, base, burn, exp, count, keys, targets, target, protein, floor, warnings, notes, trains, hasWeights,
    dayPlan: dp, trainDays,
    legDays: trainDays.filter((n) => ["leg", "cwl"].includes(splitKey(dp[n].key).base)),
    avgExp: round(avgExp),
    adjustment: round(adj),
    weeklyKg: Math.round(((weeklyTarget - weeklyExp) / 7700) * 100) / 100,
  };
}

// Tipo de día según el calendario del plan (isodow 1–7).
export function scheduledType(profile, dateStr) {
  const dow = ((new Date(dateStr + "T12:00:00").getDay() + 6) % 7) + 1;
  if (profile.day_plan && Object.keys(profile.day_plan).length) return profile.day_plan[dow]?.key || "rest";
  if ((profile.leg_days || []).includes(dow)) return "leg";
  if ((profile.train_days || []).includes(dow)) return "train";
  return "rest";
}

// Lo que registras (reloj o minutos de cardio) reemplaza la estimación de ese tipo de día, sin topes.
// Solo hay un piso: la meta no baja de la de un día sin entreno.
export function watchAdjust(est, watch) {
  if (!watch || !est || est <= 0) return 0;
  return Math.max(-est, watch - est);
}

// Cardio real del día: kcal equivalentes del día completo según los minutos que hiciste.
// Cardio solo: reemplaza la estimación. Cardio y pesas: se cambia la mitad de cardio estimada por la real.
export function cardioEquivalent(profile, key, minutes, cardioOverride) {
  const cardio = cardioOverride || profile.cardio;
  const m = Number(minutes) || 0;
  const est = profile.burns?.[key] || 0;
  if (m <= 0 || est <= 0) return 0;
  const w = Number(profile.weight_kg) || 0;
  const intensity = profile.intensity || "moderate";
  const actual = burnKcal("cardio", intensity, m, w, cardio);
  if (key === "cardio") return actual;
  const planned = burnKcal("cardio", intensity, (profile.session_min || defaultMinutes) / 2, w, profile.cardio);
  return Math.max(0, est - planned + actual);
}

// Músculos que tocan ese día según el plan (vacío si descansa o es cardio).
export function scheduledMuscles(profile, dateStr) {
  const dow = ((new Date(dateStr + "T12:00:00").getDay() + 6) % 7) + 1;
  return profile.day_plan?.[dow]?.muscles || ((profile.leg_days || []).includes(dow) ? ["legs"] : []);
}

// Tipo de día a partir de lo elegido hoy: descanso, pesas, cardio o ambos, más los músculos.
export const kindOfKey = (key) => ({ rest: "rest", train: "weights", leg: "weights", cardio: "cardio", cw: "both", cwl: "both" }[splitKey(key).base] || "rest");

// Registro de actividades extra del día. logged = { pilates: { minutes } | { kcal }, ... }.
// Devuelve el tipo de día resultante y las kcal que se anotan (lo que ya había + lo registrado).
export function extrasLog(profile, key, existingWatch, logged) {
  const w = Number(profile.weight_kg) || 0;
  const { base, extras } = splitKey(key);
  const ids = Object.keys(logged).filter((id) => logged[id] && (Number(logged[id].minutes) > 0 || Number(logged[id].kcal) > 0));
  const nextKey = makeKey(base, [...new Set([...extras, ...ids])]);
  const actual = ids.reduce((t, id) => t + (Number(logged[id].kcal) > 0 ? Number(logged[id].kcal) : extraBurn(id, profile.extras, w, logged[id].minutes)), 0);
  const before = makeKey(base, extras.filter((id) => !ids.includes(id)));
  const baseline = existingWatch > 0 ? existingWatch : (profile.burns?.[before] || 0);
  return { key: nextKey, kcal: Math.round(baseline + actual) };
}

// Meta de un día: cambio puntual (si hay) o calendario, más el ajuste por reloj; las cuentas con plan v1 tienen una sola meta.
export function dayTarget(profile, dateStr, override, watch) {
  if (!profile.targets || (profile.plan_version || 1) < 2) return { type: null, target: profile.target_kcal || 0, adjust: 0, est: 0 };
  const type = override || scheduledType(profile, dateStr);
  const est = profile.burns?.[type] || 0;
  const adjust = watchAdjust(est, watch);
  return { type, target: (profile.targets[type] ?? profile.target_kcal) + adjust, adjust, est, watch: watch || null };
}
