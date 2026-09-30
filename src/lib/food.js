export const MEALS = [
  { id: "breakfast", label: "Desayuno" },
  { id: "lunch", label: "Almuerzo" },
  { id: "dinner", label: "Cena" },
  { id: "snack", label: "Snacks" },
];

// Día local (YYYY-MM-DD) en la zona del usuario.
export const dayKey = (date = new Date(), tz = "America/Bogota") =>
  date.toLocaleDateString("en-CA", { timeZone: tz });

export const shiftDay = (day, delta) => {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toLocaleDateString("en-CA");
};

export const dayLabel = (day, today) => {
  if (day === today) return "Hoy";
  if (day === shiftDay(today, -1)) return "Ayer";
  const s = new Date(day + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "short" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Comida sugerida según la hora.
export const mealForNow = (now = new Date()) => {
  const h = now.getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 22) return "dinner";
  return "snack";
};

export const totals = (entries) =>
  entries.reduce(
    (t, e) => ({
      kcal: t.kcal + e.kcal,
      protein_g: t.protein_g + Number(e.protein_g),
      carbs_g: t.carbs_g + Number(e.carbs_g),
      fat_g: t.fat_g + Number(e.fat_g),
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

// Reduce la foto a 900px en JPEG y la devuelve en base64 (sin encabezado).
export const photoToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      let { width: w, height: h } = img;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round((h / w) * MAX); w = MAX; }
        else { w = Math.round((w / h) * MAX); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8).split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la foto.")); };
    img.src = url;
  });
