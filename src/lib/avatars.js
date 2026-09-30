// Avatares provisionales. Para reemplazarlos, sobrescribe el SVG con el mismo
// nombre en /public/avatars/ (o agrega uno nuevo y súmalo a esta lista).
export const AVATARS = [
  { id: "a1", name: "Aguacate" },
  { id: "a2", name: "Dona" },
  { id: "a3", name: "Brócoli" },
  { id: "a4", name: "Huevo" },
  { id: "a5", name: "Fresa" },
  { id: "a6", name: "Taco" },
  { id: "a7", name: "Gota" },
  { id: "a8", name: "Mancuerna" },
];

export const avatarSrc = (id) => `/avatars/${AVATARS.some((a) => a.id === id) ? id : "a1"}.svg`;
