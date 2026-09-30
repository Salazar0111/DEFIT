export const PALETTES = [
  { id: "rosa-claro", name: "Rosa", hint: "Fondo claro", bg: "#f3eff1", accent: "#e0457b" },
  { id: "noche-azul", name: "Azul", hint: "Fondo oscuro", bg: "#05070b", accent: "#4c8dff" },
  { id: "noche-verde", name: "Verde", hint: "Fondo oscuro", bg: "#040805", accent: "#3ddc84" },
];

const KEY = "defit.palette";

export function applyPalette(id) {
  const p = PALETTES.find((x) => x.id === id) || PALETTES[1];
  document.documentElement.dataset.palette = p.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", p.bg);
  try { localStorage.setItem(KEY, p.id); } catch {}
  return p.id;
}

// Paleta guardada en este dispositivo, para pintar bien antes de cargar el perfil.
export function cachedPalette() {
  try { return localStorage.getItem(KEY) || "noche-azul"; } catch { return "noche-azul"; }
}
