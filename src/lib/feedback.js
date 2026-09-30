// Sonido y háptica sutiles. Los sonidos se sintetizan con Web Audio (sin archivos), muy bajos y cortos.
// Háptica: navigator.vibrate en Android; en iPhone (Safari 17.4+) un interruptor invisible que produce
// un toque suave cuando se activa desde un gesto del usuario. Las preferencias viven en cada dispositivo.

const KEY = "defit.fx";
const read = () => { try { return { sound: true, haptics: true, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { sound: true, haptics: true }; } };
let prefs = read();

export const getFx = () => ({ ...prefs });
export function setFx(patch) {
  prefs = { ...prefs, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {}
}

// ─── Audio ─────────────────────────────────────────────────────────────────
let ctx = null;
const audio = () => {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
};

// iOS solo permite audio después de un gesto: se desbloquea con el primer toque.
if (typeof window !== "undefined") {
  const unlock = () => {
    const c = audio();
    if (c && c.state === "suspended") c.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
}

// Una nota suave: ataque corto y caída exponencial, para que suene como un "gota" y no como un pitido.
function note(freq, at, dur, gain = 0.05, type = "sine") {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const SOUNDS = {
  tick: () => {},
  success: () => { note(587, 0, 0.16, 0.045); note(880, 0.07, 0.22, 0.04); },
  soft: () => note(660, 0, 0.2, 0.035),
  rest: () => { note(784, 0, 0.18, 0.045); note(784, 0.16, 0.24, 0.04); },
  record: () => { [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.07, 0.3, 0.04)); note(2093, 0.3, 0.35, 0.012, "triangle"); },
  medal: () => { note(784, 0, 0.35, 0.04); note(1175, 0.09, 0.5, 0.035); note(1568, 0.18, 0.6, 0.014, "triangle"); },
  error: () => note(196, 0, 0.18, 0.05),
};

// ─── Háptica ───────────────────────────────────────────────────────────────
const PATTERNS = {
  tick: [6],
  success: [9, 45, 13],
  soft: [10],
  rest: [12, 70, 12],
  record: [12, 50, 12, 50, 24],
  medal: [14, 60, 10, 60, 20],
  error: [30],
};

let iosLabel = null;
const isIOS = () => typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// iOS 17.4 o más nuevo: Safari da un toque háptico cuando se activa un <input type="checkbox" switch>.
// Funciona al llamar label.click() dentro de un gesto del usuario, con la etiqueta oculta en <head>.
export const iosHapticsSupported = () => {
  if (!isIOS()) return null;
  const m = navigator.userAgent.match(/OS (\d+)[_.](\d+)/);
  if (!m) return true; // no se puede saber: se intenta
  return Number(m[1]) > 17 || (Number(m[1]) === 17 && Number(m[2]) >= 4);
};

function iosTap() {
  if (!iosLabel) {
    iosLabel = document.createElement("label");
    iosLabel.setAttribute("aria-hidden", "true");
    iosLabel.style.display = "none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    iosLabel.appendChild(input);
    document.head.appendChild(iosLabel);
  }
  iosLabel.click();
}

function buzz(name) {
  const pat = PATTERNS[name];
  if (!pat) return;
  if (!isIOS()) { navigator.vibrate?.(pat); return; }
  // En iPhone no hay patrones: un toque por cada pulso, separados en el tiempo.
  let at = 0;
  pat.forEach((ms, i) => {
    if (i % 2 === 0) { if (at === 0) iosTap(); else setTimeout(iosTap, at); } // el primero, dentro del gesto
    at += ms;
  });
}

// fx("success") → sonido y háptica según las preferencias del dispositivo.
export function fx(name) {
  try {
    if (prefs.sound && SOUNDS[name]) SOUNDS[name]();
    if (prefs.haptics) buzz(name);
  } catch { /* el feedback nunca debe romper la app */ }
}
