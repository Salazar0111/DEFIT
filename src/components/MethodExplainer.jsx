import { ExternalLink } from "lucide-react";

const Row = ({ title, uses, source }) => (
  <div style={{ padding: "12px 0", borderTop: "1px solid var(--hairline)", display: "flex", flexDirection: "column", gap: 4 }}>
    <p style={{ fontWeight: 700 }}>{title}</p>
    <p style={{ fontSize: "var(--t-small)" }}><span className="muted">Usa: </span>{uses}</p>
    <p className="caption" style={{ lineHeight: 1.45 }}>{source}</p>
  </div>
);

// Cómo se estiman las calorías: qué datos usa cada parte, de dónde salen y qué límites tiene.
export default function MethodExplainer() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", paddingBottom: "var(--sp-4)" }}>
      <div style={{ padding: "var(--sp-4)", borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
        <p style={{ fontWeight: 700 }}>Son estimaciones basadas en fórmulas científicas</p>
        <p className="muted" style={{ fontSize: "var(--t-small)", lineHeight: 1.5, marginTop: 4 }}>
          No son mediciones. Son el promedio de lo que gasta una persona con tus datos, y tu cuerpo puede variar un poco. Por eso conviene afinarlas con tu reloj y con tu peso.
        </p>
      </div>

      <div>
        <Row title="Metabolismo basal (lo que gastas en reposo)" uses="sexo, edad, altura y peso. Si indicas tu % de grasa, también lo usa."
          source="Fórmula Mifflin-St Jeor (1990), la más validada en adultos. Con % de grasa, Katch-McArdle." />
        <Row title="Tu día fuera del gym" uses="el tipo de trabajo que elegiste."
          source="Multiplicadores convencionales de actividad (1,2 · 1,35 · 1,5). Son aproximados." />
        <Row title="Calorías del entrenamiento" uses="tu peso, la duración, el tipo de entreno y la intensidad; en cardio, tu velocidad e inclinación. No usa tu sexo ni tu edad."
          source="Fórmula (MET − 1) × peso × horas, con los valores del Compendio de Actividad Física 2024. Para el cardio en trotadora usamos las ecuaciones metabólicas del Colegio Americano de Medicina del Deporte (ACSM), según tu velocidad e inclinación. Si no indicaste tu cardio, usamos un valor promedio." />
        <Row title="Ritmo de cambio de peso" uses="tu déficit o superávit semanal."
          source="Regla de 7.700 kcal por kilo. Es una aproximación: el cuerpo se adapta con el tiempo." />
        <Row title="Proteína diaria" uses="tu peso, tu objetivo y si entrenas con pesas."
          source="Rangos de la literatura científica para personas activas (1,6 a 2,2 g por kilo)." />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p className="eyebrow">Cómo afinarlas</p>
        <p style={{ fontSize: "var(--t-small)", lineHeight: 1.5 }}>
          Anota las calorías de tu reloj o los minutos de cardio, que reemplazan la estimación. Y mira tu peso cada 2 o 3 semanas: si no baja o sube como esperabas, ajusta tu plan.
        </p>
      </div>

      <a href="https://pubmed.ncbi.nlm.nih.gov/38242596/" target="_blank" rel="noreferrer"
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--t-small)", fontWeight: 700, color: "var(--accent)" }}>
        <ExternalLink size={15} strokeWidth={2} /> Compendio de Actividad Física 2024
      </a>
    </div>
  );
}
