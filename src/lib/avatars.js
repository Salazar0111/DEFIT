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

// Ánimos: /public/avatars/<id>/<mood>.svg (happy, sleepy, worried, party, surprised).
export const MOODS = ["happy", "sleepy", "worried", "party", "surprised"];

// Una foto de perfil se guarda en la misma columna `avatar`, como URL.
export const isPhotoAvatar = (id) => typeof id === "string" && /^(https?:|blob:|data:)/.test(id);

export const avatarSrc = (id, mood) => {
  if (isPhotoAvatar(id)) return id;
  const a = AVATARS.some((x) => x.id === id) ? id : "a1";
  return mood && MOODS.includes(mood) ? `/avatars/${a}/${mood}.svg` : `/avatars/${a}.svg`;
};
