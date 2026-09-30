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

let iosSwitch = null;
const isIOS = () => typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

function buzz(name) {
  const pat = PATTERNS[name];
  if (!pat) return;
  if (!isIOS() && navigator.vibrate) { navigator.vibrate(pat); return; }
  if (!isIOS()) return;
  // iPhone: alternar un <input type="checkbox" switch> genera un toque suave (requiere gesto del usuario).
  if (!iosSwitch) {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

// fx("success") → sonido y háptica según las preferencias del dispositivo.
export function fx(name) {
  try {
    if (prefs.sound && SOUNDS[name]) SOUNDS[name]();
    if (prefs.haptics) buzz(name);
  } catch { /* el feedback nunca debe romper la app */ }
}
