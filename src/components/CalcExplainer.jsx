import { Plus, Equal } from "lucide-react";
import { DAY_KEY_LABELS, fmt } from "../lib/plan";

// Números de la cuenta del día: base sin entreno + entreno (estimado o registrado) = meta.
export function dayMath(profile, info) {
  const { type, target, est = 0, adjust = 0, watch } = info;
  const planned = profile.targets?.[type] ?? target;
  return { type, est, adjust, watch, base: planned - est, training: est + adjust, target };
}

// La cuenta, en una fila: Base + Entreno = Meta.
export function Equation({ math, compact = false }) {
  const parts = [
    { label: "Sin entreno", value: math.base },
    { label: math.watch ? "Entreno que anotaste" : "Entreno estimado", value: math.training },
    { label: "Meta de hoy", value: math.target, strong: true },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 8, justifyContent: "space-between" }}>
      {parts.map((p, i) => (
        <div key={p.label} style={{ display: "contents" }}>
          {i > 0 && (i === 2 ? <Equal size={14} strokeWidth={2.2} style={{ color: "var(--text-2)", flexShrink: 0 }} /> : <Plus size={14} strokeWidth={2.2} style={{ color: "var(--text-2)", flexShrink: 0 }} />)}
          <div style={{ flex: 1, minWidth: 0, textAlign: "center", padding: compact ? "6px 4px" : "10px 6px", borderRadius: 12,
            background: p.strong ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--field)", border: `1px solid ${p.strong ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--hairline)"}` }}>
            <p className="num" style={{ fontWeight: 700, fontSize: compact ? 15 : 18 }}>{fmt(p.value)}</p>
            <p className="caption" style={{ fontSize: 11, lineHeight: 1.2 }}>{p.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const Step = ({ n, title, children }) => (
  <div style={{ display: "flex", gap: "var(--sp-3)" }}>
    <span className="num" style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, fontWeight: 700, fontSize: 14,
      background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }}>{n}</span>
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <p style={{ fontWeight: 700 }}>{title}</p>
      <p className="muted" style={{ fontSize: "var(--t-small)", lineHeight: 1.5 }}>{children}</p>
    </div>
  </div>
);

// Tutorial: cómo se calcula la meta del día y qué pasa cuando anotas tu reloj o tus minutos.
export default function CalcExplainer({ profile, info }) {
  const m = dayMath(profile, info);
  const hasTraining = m.est > 0;
  const sample = hasTraining ? m.est + 100 : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)", paddingBottom: "var(--sp-4)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
        <p className="eyebrow">Hoy · {DAY_KEY_LABELS[m.type] || "Descanso"}</p>
        <Equation math={m} />
      </div>

      {hasTraining ? (
        <>
          <Step n="1" title="Tu meta ya incluye el entreno">
            La app estima que hoy quemas unas <b style={{ color: "var(--text)" }}>{fmt(m.est)} kcal</b> entrenando y ya las sumó a tu meta. Si no anotas nada, se queda así.
          </Step>
          <Step n="2" title="Si quieres más precisión, anótalo">
            Escribe las <b style={{ color: "var(--text)" }}>calorías que marcó tu reloj</b>, o los <b style={{ color: "var(--text)" }}>minutos de cardio</b> que hiciste.
          </Step>
          <Step n="3" title="Tu número reemplaza la estimación">
            No se suma encima: <b style={{ color: "var(--text)" }}>solo cambia la diferencia</b>. Así el entreno no se cuenta dos veces.
          </Step>
          <div className="glass" style={{ padding: "var(--sp-4)", borderRadius: "var(--r-md)", display: "flex", flexDirection: "column", gap: 6 }}>
            <p className="eyebrow">Ejemplo con tus números</p>
            <p style={{ fontSize: "var(--t-small)", lineHeight: 1.5 }}>
              La app suponía <b className="num">{fmt(m.est)}</b>. Tu reloj marca <b className="num">{fmt(sample)}</b>.
              Tu meta sube <b className="num">{fmt(sample - m.est)}</b>, no {fmt(sample)}: de <b className="num">{fmt(m.base + m.est)}</b> a <b className="num">{fmt(m.base + sample)}</b> kcal.
            </p>
            <p className="caption">Si marcara menos de lo estimado, la meta baja, sin pasar de lo que comerías ese día sin entrenar.</p>
          </div>
          <Step n="4" title="Anótalo una vez por día">
            Si entrenas dos veces, suma las dos. Fija primero el tipo de día y después anota las calorías.
          </Step>
        </>
      ) : (
        <>
          <Step n="1" title="Hoy tu meta no incluye entreno">
            Si entrenas, elige arriba qué hiciste (pesas, cardio o ambos) y la meta se ajusta sola.
          </Step>
          <Step n="2" title="Después puedes afinarla">
            Con el entreno elegido, anota las calorías de tu reloj o los minutos de cardio. Tu número reemplaza la estimación y <b style={{ color: "var(--text)" }}>solo cambia la diferencia</b>.
          </Step>
        </>
      )}
    </div>
  );
}
