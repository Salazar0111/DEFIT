// Biblioteca de ejercicios y rutinas sugeridas. Los ids son estables: los récords y el historial se guardan por id.

export const MUSCLES = [
  { id: "chest", label: "Pecho" }, { id: "back", label: "Espalda" }, { id: "shoulders", label: "Hombros" },
  { id: "arms", label: "Brazos" }, { id: "legs", label: "Pierna" }, { id: "core", label: "Core" },
];

export const EXERCISES = [
  { id: "bench", name: "Press de banca", muscle: "chest" },
  { id: "incline-db", name: "Press inclinado con mancuernas", muscle: "chest" },
  { id: "chest-fly", name: "Aperturas en polea", muscle: "chest" },
  { id: "pushup", name: "Flexiones", muscle: "chest" },
  { id: "pulldown", name: "Jalón al pecho", muscle: "back" },
  { id: "row", name: "Remo con barra", muscle: "back" },
  { id: "seated-row", name: "Remo en polea", muscle: "back" },
  { id: "pullup", name: "Dominadas", muscle: "back" },
  { id: "deadlift", name: "Peso muerto", muscle: "back" },
  { id: "ohp", name: "Press militar", muscle: "shoulders" },
  { id: "lateral", name: "Elevaciones laterales", muscle: "shoulders" },
  { id: "facepull", name: "Facepull", muscle: "shoulders" },
  { id: "curl", name: "Curl de bíceps", muscle: "arms" },
  { id: "hammer", name: "Curl martillo", muscle: "arms" },
  { id: "triceps-push", name: "Extensión de tríceps en polea", muscle: "arms" },
  { id: "dips", name: "Fondos", muscle: "arms" },
  { id: "squat", name: "Sentadilla", muscle: "legs" },
  { id: "leg-press", name: "Prensa de pierna", muscle: "legs" },
  { id: "rdl", name: "Peso muerto rumano", muscle: "legs" },
  { id: "lunge", name: "Zancadas", muscle: "legs" },
  { id: "leg-ext", name: "Extensión de cuádriceps", muscle: "legs" },
  { id: "leg-curl", name: "Curl de isquiotibiales", muscle: "legs" },
  { id: "hip-thrust", name: "Hip thrust", muscle: "legs" },
  { id: "calf", name: "Elevación de gemelos", muscle: "legs" },
  { id: "plank", name: "Plancha", muscle: "core" },
  { id: "crunch", name: "Crunch en polea", muscle: "core" },
  { id: "leg-raise", name: "Elevación de piernas", muscle: "core" },
];

export const exerciseById = (id) => EXERCISES.find((e) => e.id === id);

const ex = (id, sets = 3, reps = 10) => ({ id, sets, reps });

const FULL_A = { name: "Cuerpo completo A", leg: true, exercises: [ex("squat", 3, 8), ex("bench", 3, 8), ex("row", 3, 10), ex("ohp", 3, 10), ex("curl", 2, 12), ex("plank", 3, 45)] };
const FULL_B = { name: "Cuerpo completo B", leg: true, exercises: [ex("rdl", 3, 8), ex("incline-db", 3, 10), ex("pulldown", 3, 10), ex("lunge", 3, 10), ex("lateral", 3, 12), ex("triceps-push", 2, 12)] };
const PUSH = { name: "Empuje", leg: false, exercises: [ex("bench", 4, 8), ex("incline-db", 3, 10), ex("ohp", 3, 10), ex("lateral", 3, 12), ex("triceps-push", 3, 12), ex("dips", 3, 10)] };
const PULL = { name: "Jalón", leg: false, exercises: [ex("deadlift", 3, 6), ex("pulldown", 4, 10), ex("row", 3, 10), ex("facepull", 3, 15), ex("curl", 3, 10), ex("hammer", 3, 12)] };
const LEGS = { name: "Pierna", leg: true, exercises: [ex("squat", 4, 8), ex("leg-press", 3, 10), ex("rdl", 3, 10), ex("leg-ext", 3, 12), ex("leg-curl", 3, 12), ex("calf", 4, 15)] };
const UPPER = { name: "Tren superior", leg: false, exercises: [ex("bench", 4, 8), ex("row", 4, 10), ex("ohp", 3, 10), ex("pulldown", 3, 10), ex("curl", 3, 12), ex("triceps-push", 3, 12)] };
const LOWER = { name: "Tren inferior", leg: true, exercises: [ex("squat", 4, 8), ex("rdl", 3, 10), ex("lunge", 3, 10), ex("leg-curl", 3, 12), ex("calf", 4, 15), ex("crunch", 3, 15)] };

// Rutinas sugeridas según los días por semana. Se reparten en orden sobre los días elegidos.
export const TEMPLATES = {
  1: [{ id: "full-1", name: "Cuerpo completo", days: [FULL_A] }],
  2: [{ id: "full-2", name: "Cuerpo completo A y B", days: [FULL_A, FULL_B] }],
  3: [
    { id: "full-3", name: "Cuerpo completo A-B-A", days: [FULL_A, FULL_B, { ...FULL_A, name: "Cuerpo completo A" }] },
    { id: "ppl-3", name: "Empuje · Jalón · Pierna", days: [PUSH, PULL, LEGS] },
  ],
  4: [{ id: "ul-4", name: "Superior · Inferior × 2", days: [UPPER, LOWER, { ...UPPER }, { ...LOWER }] }],
  5: [{ id: "ulppl-5", name: "Superior · Inferior + Empuje · Jalón · Pierna", days: [UPPER, LOWER, PUSH, PULL, LEGS] }],
  6: [{ id: "ppl-6", name: "Empuje · Jalón · Pierna × 2", days: [PUSH, PULL, LEGS, { ...PUSH }, { ...PULL }, { ...LEGS }] }],
  7: [{ id: "ppl-7", name: "Empuje · Jalón · Pierna × 2 + completo", days: [PUSH, PULL, LEGS, { ...PUSH }, { ...PULL }, { ...LEGS }, FULL_A] }],
};

export const templatesFor = (n) => TEMPLATES[Math.min(Math.max(n, 1), 7)];

// Asigna las sesiones de la plantilla a los días de entreno de la persona.
export function buildRoutine(template, trainDays) {
  const days = {};
  [...trainDays].sort().forEach((dow, i) => {
    const s = template.days[i % template.days.length];
    days[dow] = { name: s.name, leg: s.leg, exercises: s.exercises.map((e) => ({ ...e })) };
  });
  return { template: template.id, name: template.name, days };
}

// Fuerza estimada a 1 repetición (Epley). Fiable con 1–10 repeticiones.
export const e1rm = (kg, reps) => (reps <= 1 ? kg : Math.round(kg * (1 + reps / 30) * 10) / 10);

// Rutina generada desde el plan por día: cada día arma su sesión con los músculos elegidos.
const BY_MUSCLE = { chest: ["bench", "incline-db", "chest-fly"], back: ["pulldown", "row", "seated-row"], shoulders: ["ohp", "lateral", "facepull"],
  arms: ["curl", "triceps-push", "hammer"], legs: ["squat", "leg-press", "rdl", "leg-curl", "calf"], core: ["plank", "crunch"] };
const MUSCLE_NAME = { chest: "Pecho", back: "Espalda", shoulders: "Hombros", arms: "Brazos", legs: "Pierna", core: "Core" };
const PICKS = { legs: 4, core: 1 };

export function sessionFromMuscles(kind, muscles, key) {
  const cardio = kind !== "weights";
  const label = muscles.length === 0 ? "Cardio" : muscles.length === 1 ? MUSCLE_NAME[muscles[0]] : muscles.length === 2 ? `${MUSCLE_NAME[muscles[0]]} y ${MUSCLE_NAME[muscles[1]].toLowerCase()}` : `${MUSCLE_NAME[muscles[0]]}, ${MUSCLE_NAME[muscles[1]].toLowerCase()} y más`;
  const exercises = [];
  muscles.forEach((m) => {
    const n = muscles.length >= 4 ? 1 : PICKS[m] || (muscles.length === 1 ? 4 : 2);
    BY_MUSCLE[m].slice(0, n).forEach((id) => exercises.push({ id, sets: id === "plank" ? 3 : m === "legs" ? 4 : 3, reps: id === "plank" ? 45 : m === "legs" ? 8 : 10 }));
  });
  return { name: kind === "both" ? `${label} + cardio` : label, kind, key, muscles, leg: muscles.includes("legs"), cardio, exercises };
}

export function buildRoutineFromPlan(dayPlan) {
  const days = {};
  Object.entries(dayPlan).forEach(([dow, e]) => {
    days[dow] = sessionFromMuscles(e.kind, e.muscles || [], e.key);
  });
  return { template: "plan", name: "Según tu plan", days };
}
