import { CalendarCheck, Crown, Flag, Flame, Sparkles, Star, Target, Trophy, Zap } from "lucide-react";

// Medallas provisionales. Para reemplazar el arte, pon un SVG en /public/medals/<id>.svg
// y marca art: true; el componente Medal lo usará en lugar del placeholder.
export const MEDALS = [
  { id: "first_entry", name: "Primer bocado", desc: "Registraste tu primera comida.", Icon: Sparkles, metal: "silver", enamel: ["#7dd3fc", "#0369a1"], group: "daily" },
  { id: "day_in_range", name: "Día cumplido", desc: "Quedaste entre 90% y 110% de tu meta.", Icon: Target, metal: "bronze", enamel: ["#86efac", "#15803d"], group: "daily" },
  { id: "streak_7", name: "Racha de 7", desc: "Registraste comida 7 días seguidos.", Icon: Flame, metal: "bronze", enamel: ["#fdba74", "#c2410c"], group: "daily" },
  { id: "streak_30", name: "Racha de 30", desc: "Registraste comida 30 días seguidos.", Icon: Zap, metal: "silver", enamel: ["#fca5a5", "#b91c1c"], group: "daily" },
  { id: "streak_100", name: "Racha de 100", desc: "100 días seguidos registrando.", Icon: Crown, metal: "gold", enamel: ["#fde68a", "#b45309"], group: "daily" },
  { id: "week_logged", name: "Semana registrada", desc: "Registraste los 7 días de la semana.", Icon: CalendarCheck, metal: "silver", enamel: ["#c4b5fd", "#6d28d9"], group: "weekly" },
  { id: "perfect_week", name: "Semana perfecta", desc: "Cumpliste tu meta los 7 días de la semana.", Icon: Star, metal: "gold", enamel: ["#f9a8d4", "#be185d"], group: "weekly" },
  { id: "challenge_done", name: "Reto completado", desc: "Terminaste un reto.", Icon: Flag, metal: "silver", enamel: ["#93c5fd", "#1d4ed8"], group: "challenge" },
  { id: "challenge_won", name: "Reto ganado", desc: "Ganaste un reto.", Icon: Trophy, metal: "gold", enamel: ["#fcd34d", "#a16207"], group: "challenge" },
];

export const MEDAL_GROUPS = [
  { id: "daily", label: "Diarias" },
  { id: "weekly", label: "Semanales" },
  { id: "challenge", label: "Retos" },
];

export const METALS = {
  bronze: ["#f3c89b", "#b87333", "#6b3d17"],
  silver: ["#ffffff", "#c0c6d0", "#6b7280"],
  gold: ["#fff3b0", "#e2b13c", "#8a5a00"],
};

export const medalById = (id) => MEDALS.find((m) => m.id === id);
