import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { fmt } from "../lib/plan";

const DAILY_LIMIT = 40;
const ago = (n) => new Date(Date.now() - n * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const today = () => ago(0);
const daysSince = (d) => (d ? Math.round((new Date(today() + "T12:00:00") - new Date(d + "T12:00:00")) / 86400000) : null);
const since = (d) => { const n = daysSince(d); return n == null ? "nunca" : n === 0 ? "hoy" : n === 1 ? "ayer" : `hace ${n} días`; };
const tokens = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 2 })} M` : n >= 1e3 ? `${(n / 1e3).toLocaleString("es-CO", { maximumFractionDigits: 1 })} mil` : String(n));

function demoData() {
  const mk = (id, name, username, last, a7, a30, meals, ai, tin, tout) => ({
    id, name, username, email: `${username}@correo.com`, joined: ago(40), onboarded: true, goal: "lose",
    last_active: ago(last), active_7: a7, active_30: a30, meals_30: meals, workouts_30: Math.round(meals / 4), challenges: 2,
    ai_today: ai[0], ai_7: ai[1], ai_30: ai[2], ai_total: ai[3], tok_in_30: tin, tok_out_30: tout, tok_in_total: tin * 2, tok_out_total: tout * 2,
  });
  const users = [
    mk("1", "Brayan", "brayan", 0, 7, 26, 120, [4, 22, 71, 140], 380000, 52000),
    mk("2", "Clau", "clau_fit", 0, 6, 24, 98, [3, 15, 55, 120], 290000, 40000),
    mk("3", "Luz", "luz65", 1, 3, 9, 30, [1, 4, 12, 20], 62000, 9000),
    mk("4", "Dani", "dani", 6, 0, 3, 8, [0, 0, 2, 2], 9000, 1500),
  ];
  const daily = Array.from({ length: 30 }, (_, i) => ({ day: ago(29 - i), active_users: 1 + ((i * 7) % 4), ai_calls: (i * 5) % 11, tok_in: ((i * 5) % 11) * 5200, tok_out: ((i * 5) % 11) * 700 }));
  return { users, daily };
}

export default function AdminPanel({ demo }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [price, setPrice] = useState(() => {
    try { return JSON.parse(localStorage.getItem("defit.price")) || { in: 3, out: 15 }; } catch { return { in: 3, out: 15 }; }
  });

  useEffect(() => {
    if (demo) { setData(demoData()); return; }
    Promise.all([supabase.rpc("admin_users"), supabase.rpc("admin_daily", { n: 30 })]).then(([u, d]) => {
      if (u.error || d.error) { setError("No se pudo cargar el panel."); return; }
      setData({ users: u.data || [], daily: (d.data || []).map((r) => ({ ...r, day: r.day })) });
    });
  }, [demo]);

  const setP = (k, v) => {
    const next = { ...price, [k]: v };
    setPrice(next);
    try { localStorage.setItem("defit.price", JSON.stringify(next)); } catch { /* sin almacenamiento */ }
  };
  const cost = (tin, tout) => (Number(tin) * (Number(price.in) || 0) + Number(tout) * (Number(price.out) || 0)) / 1e6;

  const t = useMemo(() => {
    if (!data) return null;
    const u = data.users;
    return {
      users: u.length,
      planned: u.filter((x) => x.onboarded).length,
      today: u.filter((x) => daysSince(x.last_active) === 0).length,
      week: u.filter((x) => (daysSince(x.last_active) ?? 99) < 7).length,
      aiToday: u.reduce((s, x) => s + x.ai_today, 0),
      ai30: u.reduce((s, x) => s + x.ai_30, 0),
      tin30: u.reduce((s, x) => s + Number(x.tok_in_30), 0),
      tout30: u.reduce((s, x) => s + Number(x.tok_out_30), 0),
      idle: u.filter((x) => (daysSince(x.last_active) ?? 99) >= 3),
      near: u.filter((x) => x.ai_today >= DAILY_LIMIT * 0.8),
      loyal: u.filter((x) => x.active_7 >= 3).length,
    };
  }, [data]);

  if (error) return <p role="alert" style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</p>;
  if (!data) return <p className="muted">Cargando…</p>;

  const chart = data.daily.map((d) => ({ ...d, label: d.day.slice(5) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)", paddingBottom: "var(--sp-5)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)" }}>
        <Tile label="Usuarios" value={t.users} sub={`${t.planned} con plan listo`} />
        <Tile label="Activos hoy" value={t.today} sub={`${t.week} en los últimos 7 días`} />
        <Tile label="Vuelven seguido" value={t.loyal} sub="3 o más días esta semana" />
        <Tile label="Análisis IA hoy" value={t.aiToday} sub={`${fmt(t.ai30)} en 30 días`} />
      </div>

      {(t.idle.length > 0 || t.near.length > 0) && (
        <div className="glass" style={{ padding: "var(--sp-4)", display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} strokeWidth={2} /> Avisos</p>
          {t.idle.map((x) => (
            <p key={x.id} style={{ fontSize: "var(--t-small)" }}><b>{x.name}</b> no usa la app {x.last_active ? `desde ${since(x.last_active)}` : "todavía"}.</p>
          ))}
          {t.near.map((x) => (
            <p key={x.id} style={{ fontSize: "var(--t-small)" }}><b>{x.name}</b> lleva {x.ai_today} de {DAILY_LIMIT} análisis de IA hoy.</p>
          ))}
        </div>
      )}

      <div>
        <p className="eyebrow" style={{ marginBottom: "var(--sp-2)" }}>Usuarios activos por día · 30 días</p>
        <div style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
              <XAxis dataKey="label" hide />
              <YAxis hide allowDecimals={false} domain={[0, "dataMax + 1"]} />
              <Tooltip cursor={{ stroke: "var(--hairline)" }} formatter={(v) => [v, "Activos"]} labelFormatter={(l) => l} />
              <Line type="monotone" dataKey="active_users" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: "var(--sp-2)" }}>Análisis de IA por día · 30 días</p>
        <div style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
              <XAxis dataKey="label" hide />
              <YAxis hide />
              <Tooltip cursor={{ fill: "var(--hairline)" }} formatter={(v) => [v, "Análisis"]} labelFormatter={(l) => l} />
              <Bar dataKey="ai_calls" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass" style={{ padding: "var(--sp-4)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
        <p className="eyebrow">Consumo de la IA · 30 días</p>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="muted">Tokens de entrada</span><b className="num">{tokens(t.tin30)}</b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="muted">Tokens de salida</span><b className="num">{tokens(t.tout30)}</b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="muted">Costo estimado</span><b className="num">US$ {cost(t.tin30, t.tout30).toLocaleString("es-CO", { maximumFractionDigits: 2 })}</b>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)", marginTop: 4 }}>
          <div className="field">
            <label htmlFor="p-in">US$ por millón (entrada)</label>
            <input id="p-in" type="number" inputMode="decimal" step="0.5" min="0" value={price.in} onChange={(e) => setP("in", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="p-out">US$ por millón (salida)</label>
            <input id="p-out" type="number" inputMode="decimal" step="0.5" min="0" value={price.out} onChange={(e) => setP("out", e.target.value)} />
          </div>
        </div>
        <p className="caption">La tarifa es de referencia: ajústala a la de tu plan de Anthropic. Los tokens se cuentan desde que se activó este panel; antes solo hay número de análisis.</p>
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: "var(--sp-2)" }}>Usuarios</p>
        <div className="glass" style={{ padding: "0 var(--sp-4)" }}>
          {data.users.map((x, i) => {
            const isOpen = open === x.id;
            const idle = (daysSince(x.last_active) ?? 99) >= 3;
            return (
              <div key={x.id} style={{ borderTop: i ? "1px solid var(--hairline)" : "none" }}>
                <button onClick={() => setOpen(isOpen ? null : x.id)} aria-expanded={isOpen}
                  style={{ display: "flex", width: "100%", alignItems: "center", gap: "var(--sp-3)", padding: "14px 0", textAlign: "left", color: "var(--text)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700 }}>{x.name}{x.username && <span className="caption" style={{ fontWeight: 400 }}> · @{x.username}</span>}</p>
                    <p className="caption" style={{ color: idle ? "var(--danger)" : undefined }}>Último uso: {since(x.last_active)} · {x.active_7}/7 días</p>
                  </div>
                  <span className="caption num" style={{ textAlign: "right" }}>IA hoy {x.ai_today}</span>
                </button>
                {isOpen && (
                  <div style={{ paddingBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px var(--sp-3)", fontSize: "var(--t-small)" }}>
                    <Cell k="Correo" v={x.email} wide />
                    <Cell k="Registro" v={x.joined} />
                    <Cell k="Plan listo" v={x.onboarded ? "Sí" : "No"} />
                    <Cell k="Días activos 7 / 30" v={`${x.active_7} / ${x.active_30}`} />
                    <Cell k="Comidas 30 días" v={x.meals_30} />
                    <Cell k="Entrenos 30 días" v={x.workouts_30} />
                    <Cell k="Retos jugados" v={x.challenges} />
                    <Cell k="IA 7 / 30 / total" v={`${x.ai_7} / ${x.ai_30} / ${x.ai_total}`} />
                    <Cell k="Tokens 30 días" v={`${tokens(Number(x.tok_in_30))} + ${tokens(Number(x.tok_out_30))}`} />
                    <Cell k="Costo 30 días" v={`US$ ${cost(x.tok_in_30, x.tok_out_30).toLocaleString("es-CO", { maximumFractionDigits: 2 })}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, sub }) {
  return (
    <div style={{ padding: "14px", borderRadius: "var(--r-md)", background: "var(--field)", border: "1px solid var(--hairline)" }}>
      <p className="caption">{label}</p>
      <p className="num" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>{value}</p>
      <p className="caption">{sub}</p>
    </div>
  );
}

function Cell({ k, v, wide }) {
  return (
    <div style={wide ? { gridColumn: "1 / -1" } : undefined}>
      <p className="caption">{k}</p>
      <p style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{v}</p>
    </div>
  );
}
