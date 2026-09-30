// Ingredientes de una comida. Cada uno guarda su densidad (valores por gramo),
// así al cambiar los gramos las calorías y macros se recalculan en proporción.

const r1 = (n) => Math.round(n * 10) / 10;
let seq = 0;
const uid = () => `i${Date.now().toString(36)}${(seq++).toString(36)}`;

export function makeIngredient({ name = "", grams = 100, kcal = 0, protein_g = 0, carbs_g = 0, fat_g = 0 } = {}) {
  const g = Number(grams) || 0;
  const base = g > 0 ? g : 100; // sin gramos conocidos, se toma como valores por 100 g
  return {
    id: uid(),
    name,
    grams: g || 100,
    per: {
      kcal: (Number(kcal) || 0) / base,
      protein_g: (Number(protein_g) || 0) / base,
      carbs_g: (Number(carbs_g) || 0) / base,
      fat_g: (Number(fat_g) || 0) / base,
    },
  };
}

// Valores actuales de un ingrediente según sus gramos.
export const valuesOf = (i) => ({
  kcal: Math.round(i.per.kcal * i.grams),
  protein_g: r1(i.per.protein_g * i.grams),
  carbs_g: r1(i.per.carbs_g * i.grams),
  fat_g: r1(i.per.fat_g * i.grams),
});

export const withGrams = (i, grams) => ({ ...i, grams: Math.max(0, Math.round(Number(grams) || 0)) });

// Corregir las kcal a mano (p. ej. desde la etiqueta): ajusta la densidad y escala los macros igual.
export const withKcal = (i, kcal) => {
  const k = Math.max(0, Number(kcal) || 0);
  if (!i.grams) return i;
  const old = i.per.kcal * i.grams;
  const f = old > 0 ? k / old : 1;
  return {
    ...i,
    per: old > 0
      ? { kcal: i.per.kcal * f, protein_g: i.per.protein_g * f, carbs_g: i.per.carbs_g * f, fat_g: i.per.fat_g * f }
      : { ...i.per, kcal: k / i.grams },
  };
};

export const sumIngredients = (list) =>
  list.reduce((t, i) => {
    const v = valuesOf(i);
    return { kcal: t.kcal + v.kcal, protein_g: r1(t.protein_g + v.protein_g), carbs_g: r1(t.carbs_g + v.carbs_g), fat_g: r1(t.fat_g + v.fat_g) };
  }, { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

// Para guardar en la base de datos.
export const serialize = (list) => list.map((i) => ({ name: i.name.trim() || "Ingrediente", grams: i.grams, ...valuesOf(i) }));

// Desde una comida guardada. Las antiguas (sin ingredientes) quedan como uno solo.
export function fromEntry(e) {
  if (Array.isArray(e.ingredients) && e.ingredients.length) return e.ingredients.map(makeIngredient);
  return [makeIngredient({ name: e.name, grams: 100, kcal: e.kcal, protein_g: e.protein_g, carbs_g: e.carbs_g, fat_g: e.fat_g })];
}
