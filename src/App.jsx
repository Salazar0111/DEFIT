import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PLAN = {
  1: { name:"PUSH", emoji:"🏋️", muscles:"Pecho · Hombros · Tríceps", color:"#f97316",
    ex:[{id:'p1',name:"Press de banca con barra",sets:"4 × 8 reps"},{id:'p2',name:"Press inclinado mancuernas",sets:"4 × 10 reps"},{id:'p3',name:"Press militar",sets:"4 × 10 reps"},{id:'p4',name:"Elevaciones laterales",sets:"4 × 12 reps"},{id:'p5',name:"Extensiones tríceps polea",sets:"4 × 12 reps"},{id:'p6',name:"Fondos en paralelas",sets:"3 × 10 reps"}]},
  2: { name:"PULL", emoji:"🔙", muscles:"Espalda · Bíceps", color:"#a855f7",
    ex:[{id:'pu1',name:"Peso muerto convencional",sets:"4 × 6 reps"},{id:'pu2',name:"Jalón al pecho",sets:"4 × 10 reps"},{id:'pu3',name:"Remo con barra",sets:"4 × 10 reps"},{id:'pu4',name:"Pull-over en polea",sets:"3 × 12 reps"},{id:'pu5',name:"Curl bíceps con barra",sets:"4 × 10 reps"},{id:'pu6',name:"Curl martillo",sets:"3 × 12 reps"}]},
  3: { name:"LEGS", emoji:"🦵", muscles:"Cuádriceps · Isquios · Glúteos", color:"#10b981",
    ex:[{id:'l1',name:"Sentadilla con barra",sets:"4 × 8 reps"},{id:'l2',name:"Prensa de pierna",sets:"4 × 10 reps"},{id:'l3',name:"Extensiones cuádriceps",sets:"3 × 12 reps"},{id:'l4',name:"Curl isquiotibiales",sets:"4 × 12 reps"},{id:'l5',name:"Hip thrust con barra",sets:"4 × 10 reps"},{id:'l6',name:"Elevación de gemelos",sets:"4 × 15 reps"}]},
  4: null,
  5: { name:"UPPER", emoji:"⬆️", muscles:"Pecho + Espalda + Hombros", color:"#eab308",
    ex:[{id:'u1',name:"Press banca mancuernas",sets:"4 × 10 reps"},{id:'u2',name:"Dominadas / jalón cerrado",sets:"4 × 10 reps"},{id:'u3',name:"Remo en máquina",sets:"4 × 12 reps"},{id:'u4',name:"Cruces en polea",sets:"3 × 12 reps"},{id:'u5',name:"Press Arnold",sets:"3 × 10 reps"},{id:'u6',name:"Facepull",sets:"3 × 15 reps"}]},
  6: { name:"LOWER+CORE", emoji:"🔥", muscles:"Piernas posterior + Core", color:"#ef4444",
    ex:[{id:'lc1',name:"Peso muerto rumano",sets:"4 × 10 reps"},{id:'lc2',name:"Zancadas mancuernas",sets:"4 × 12/lado"},{id:'lc3',name:"Sentadilla búlgara",sets:"3 × 10/lado"},{id:'lc4',name:"Abducción en máquina",sets:"3 × 15 reps"},{id:'lc5',name:"Plancha frontal",sets:"4 × 45 seg"},{id:'lc6',name:"Crunch en polea",sets:"4 × 15 reps"},{id:'lc7',name:"Elevación piernas colgado",sets:"3 × 12 reps"}]},
  0: null,
};

const T = { cal:1900, pro:165, carb:175, fat:60 };
const SW = 97.5, GW = 79.5;
const DN = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const TIPS = [
  "Bebe 500ml de agua antes de cada comida para reducir el hambre.",
  "Prioriza la proteína: 165g diarios protegen tu músculo en el déficit.",
  "Duerme 7-8h. El 80% de la hormona del crecimiento se libera durmiendo.",
  "El déficit calórico hace el 80% del trabajo. La cocina manda.",
  "La disciplina supera a la motivación. Entrena aunque no tengas ganas.",
  "Pésate siempre en ayunas, mismo día y hora para datos reales.",
  "10,000 pasos/día aceleran tu pérdida de grasa sin sacrificar músculo.",
];
const NOTIF_MSGS = {
  workout:"💪 ¡A entrenar! La disciplina es libertad.",
  breakfast:"🥣 ¡Desayuno! Arranca el día con proteína.",
  lunch:"🍱 ¡Almuerzo! La comida principal del día.",
  dinner:"🌙 ¡Cena! Proteína + verduras para cerrar bien.",
};

const tk = () => new Date().toISOString().split('T')[0];

// ─── STYLES ────────────────────────────────────────────────────────────────────

const S = {
  bg:"#090b0f", card:"#101318", card2:"#161921", border:"#1e2330",
  accent:"#b5ff47", accentDim:"#b5ff4715", orange:"#ff8c42",
  text:"#e2e8f4", muted:"#4b5563", soft:"#8899aa",
};

// ─── HELPERS ───────────────────────────────────────────────────────────────────

// Converts any image (including HEIC) to compressed JPEG via canvas
const toJpeg = (file) => new Promise((resolve) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const MAX = 900;
    let w = img.width, h = img.height;
    if (w > MAX || h > MAX) {
      if (w > h) { h = Math.round((h / w) * MAX); w = MAX; }
      else { w = Math.round((w / h) * MAX); h = MAX; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob || file); }, 'image/jpeg', 0.82);
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
  img.src = url;
});

// Call our Vercel proxy
const callAI = async (messages) => {
  const resp = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const d = await resp.json();
  if (d.error) throw new Error(d.error);
  const txt = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(txt.replace(/```json|```/g, '').trim());
};

// localStorage helpers
const lsGet = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
const lsSet = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ─── MINI COMPONENTS ──────────────────────────────────────────────────────────

function CalRing({ cur, max }) {
  const r = 48, circ = 2 * Math.PI * r, pct = Math.min(cur / max, 1);
  const over = cur > max, color = over ? "#ef4444" : S.accent;
  return (
    <svg width="116" height="116" style={{ transform:"rotate(-90deg)", overflow:"visible" }}>
      <circle cx="58" cy="58" r={r} fill="none" stroke="#1a1d24" strokeWidth="11" />
      <circle cx="58" cy="58" r={r} fill="none" stroke={color} strokeWidth="11"
        strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round"
        style={{ filter: over ? "none" : "drop-shadow(0 0 7px #b5ff4777)" }} />
    </svg>
  );
}

function MBar({ label, cur, max, color }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
        <span style={{ color:S.muted }}>{label}</span>
        <span style={{ color:"#cbd5e1", fontWeight:600 }}>{Math.round(cur)}<span style={{ color:"#334155" }}>/{max}g</span></span>
      </div>
      <div style={{ height:5, background:S.card2, borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${Math.min((cur/max)*100,100)}%`, background:color, borderRadius:99, transition:"width 0.5s" }} />
      </div>
    </div>
  );
}

function Input({ placeholder, value, onChange, type = "text", inputMode }) {
  return (
    <input type={type} inputMode={inputMode} placeholder={placeholder} value={value} onChange={onChange}
      style={{ background:S.card2, border:`1px solid ${S.border}`, color:S.text, borderRadius:14,
        padding:"12px 14px", fontSize:14, outline:"none", fontFamily:"inherit", width:"100%" }} />
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("home");
  const [food, setFood] = useState([]);
  const [checks, setChecks] = useState({});
  const [selDay, setSelDay] = useState(new Date().getDay());
  const [wlog, setWlog] = useState([{ date:"2026-06-16", w:97.5 }]);
  const [wIn, setWIn] = useState("");
  const [alrt, setAlrt] = useState({ workout:"18:00", breakfast:"07:30", lunch:"13:00", dinner:"20:00" });
  const [analyzing, setAnalyzing] = useState(false);
  const [pending, setPending] = useState(null);
  const [notifPerm, setNotifPerm] = useState("default");
  // Food modes: 'photo' | 'search' | 'manual'
  const [foodMode, setFoodMode] = useState("photo");
  // Search mode state
  const [searchQuery, setSearchQuery] = useState("");
  // Manual mode state
  const [manual, setManual] = useState({ name:"", cal:"", pro:"", carb:"", fat:"", portion:"" });

  const fileRef = useRef(null);
  const alrtRef = useRef(alrt);
  const notifiedRef = useRef({});

  useEffect(() => { alrtRef.current = alrt; }, [alrt]);

  useEffect(() => {
    // Load from localStorage
    const f = lsGet(`fd_${tk()}`); if(f) setFood(f);
    const c = lsGet(`ck_${tk()}`); if(c) setChecks(c);
    const w = lsGet("wlog"); if(w) setWlog(w);
    const a = lsGet("alrt"); if(a) setAlrt(a);

    if("Notification" in window) setNotifPerm(Notification.permission);

    // Notification scheduler
    const iv = setInterval(() => {
      if(Notification.permission !== "granted") return;
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      Object.entries(alrtRef.current).forEach(([k, v]) => {
        const nk = `${tk()}_${k}`;
        if(v === time && NOTIF_MSGS[k] && !notifiedRef.current[nk]) {
          new Notification("⚡ FitPlan", { body: NOTIF_MSGS[k] });
          notifiedRef.current[nk] = true;
        }
      });
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  // Save helpers
  const sf = v => { setFood(v); lsSet(`fd_${tk()}`, v); };
  const sc = v => { setChecks(v); lsSet(`ck_${tk()}`, v); };
  const swl = v => { setWlog(v); lsSet("wlog", v); };
  const sal = v => { setAlrt(v); lsSet("alrt", v); };

  // Derived
  const tCal = food.reduce((s,e)=>s+e.cal,0);
  const tPro  = food.reduce((s,e)=>s+e.pro,0);
  const tCarb = food.reduce((s,e)=>s+e.carb,0);
  const tFat  = food.reduce((s,e)=>s+e.fat,0);
  const today   = new Date().getDay();
  const todW    = PLAN[today];
  const selW    = PLAN[selDay];
  const doneEx  = todW ? todW.ex.filter(e => checks[e.id]).length : 0;
  const totalEx = todW ? todW.ex.length : 0;
  const curW    = wlog.length > 0 ? wlog[wlog.length-1].w : SW;
  const lost    = +(SW - curW).toFixed(1);
  const tip     = TIPS[new Date().getDay() % TIPS.length];

  // ── FOOD ANALYSIS ──────────────────────────────────────────────────────────

  const analyzePhoto = async (file) => {
    setAnalyzing(true); setPending(null);
    try {
      const jpeg = await toJpeg(file);
      const b64 = await new Promise((res,rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej; r.readAsDataURL(jpeg);
      });
      const p = await callAI([{ role:"user", content:[
        { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:b64 }},
        { type:"text", text:'Eres nutricionista experto. Analiza esta imagen de comida. Responde SOLO con JSON puro sin markdown ni backticks: {"name":"nombre en español","cal":número_kcal,"pro":gramos,"carb":gramos,"fat":gramos,"portion":"ej: 1 plato ~350g","notes":"nota breve útil"}' }
      ]}]);
      setPending({ ...p, img: URL.createObjectURL(file) });
    } catch(e) {
      alert("No se pudo analizar la foto. Verifica tu conexión e intenta de nuevo.");
    } finally { setAnalyzing(false); }
  };

  const analyzeSearch = async () => {
    if(!searchQuery.trim()) return;
    setAnalyzing(true); setPending(null);
    try {
      const p = await callAI([{ role:"user",
        content: `Eres nutricionista experto. Estima los macros nutricionales para: "${searchQuery}". Responde SOLO con JSON puro sin markdown ni backticks: {"name":"nombre exacto en español","cal":número_kcal,"pro":gramos,"carb":gramos,"fat":gramos,"portion":"la porción consultada","notes":"nota breve útil"}`
      }]);
      setPending({ ...p, img: null });
    } catch(e) {
      alert("No se pudo estimar. Verifica tu conexión e intenta de nuevo.");
    } finally { setAnalyzing(false); }
  };

  const confirmFood = () => {
    if(!pending) return;
    const e = { id:Date.now(), name:pending.name, cal:pending.cal, pro:pending.pro,
      carb:pending.carb, fat:pending.fat, portion:pending.portion, img:pending.img,
      time:new Date().toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"}) };
    sf([...food, e]); setPending(null); setSearchQuery("");
  };

  const addManual = () => {
    const { name, cal, pro, carb, fat, portion } = manual;
    if(!name || !cal) return;
    const e = { id:Date.now(), name, cal:+cal, pro:+(pro||0), carb:+(carb||0), fat:+(fat||0),
      portion: portion || `${cal} kcal`, img:null,
      time:new Date().toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"}) };
    sf([...food, e]);
    setManual({ name:"", cal:"", pro:"", carb:"", fat:"", portion:"" });
  };

  const addWeight = () => {
    const v = parseFloat(wIn); if(!v || isNaN(v)) return;
    const up = [...wlog.filter(x=>x.date!==tk()), {date:tk(),w:v}].sort((a,b)=>a.date.localeCompare(b.date));
    swl(up); setWIn("");
  };

  const reqNotif = async () => {
    if(!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setNotifPerm(p);
  };

  const testNotif = msg => {
    if(notifPerm==="granted") new Notification("⚡ FitPlan", { body:msg });
    else alert("Primero activa las notificaciones.");
  };

  const card = { background:S.card, borderRadius:20, padding:"16px", border:`1px solid ${S.border}` };
  const modeBtn = (mode, label, emoji) => (
    <button onClick={()=>{ setFoodMode(mode); setPending(null); }}
      style={{ flex:1, padding:"10px 6px", borderRadius:14, border:"none", cursor:"pointer",
        fontFamily:"inherit", fontSize:13, fontWeight:600,
        background: foodMode===mode ? S.accent : S.card2,
        color: foodMode===mode ? "#090b0f" : S.muted, transition:"all 0.15s" }}>
      {emoji} {label}
    </button>
  );

  // ─── HOME ─────────────────────────────────────────────────────────────────

  const Home = (
    <div style={{ padding:"16px 16px 0", display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 style={{ color:S.text, fontSize:22, fontWeight:800, letterSpacing:-0.5, margin:0 }}>Hola, campeón 👋</h1>
          <p style={{ color:S.muted, fontSize:12, marginTop:3, textTransform:"capitalize" }}>
            {new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})}
          </p>
        </div>
        <div style={{ background:S.accentDim, border:`1px solid ${S.accent}33`, borderRadius:14, padding:"8px 14px", textAlign:"center" }}>
          <div style={{ color:S.accent, fontWeight:800, fontSize:17, fontVariantNumeric:"tabular-nums" }}>-{lost} kg</div>
          <div style={{ color:S.muted, fontSize:10, marginTop:1 }}>perdidos</div>
        </div>
      </div>

      <div style={{ ...card, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ position:"relative", flexShrink:0 }}>
          <CalRing cur={tCal} max={T.cal} />
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <span style={{ color:S.text, fontWeight:800, fontSize:21, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{tCal}</span>
            <span style={{ color:S.muted, fontSize:10, lineHeight:1, marginTop:3 }}>/{T.cal} kcal</span>
            <span style={{ color:tCal>T.cal?"#ef4444":S.accent, fontSize:10, marginTop:3, fontWeight:600 }}>
              {tCal>T.cal ? "¡límite!" : `${T.cal-tCal} restantes`}
            </span>
          </div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ color:S.soft, fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Macros de hoy</p>
          <MBar label="Proteína" cur={tPro} max={T.pro} color={S.accent} />
          <MBar label="Carbohidratos" cur={tCarb} max={T.carb} color="#60a5fa" />
          <MBar label="Grasa" cur={tFat} max={T.fat} color={S.orange} />
        </div>
      </div>

      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ color:S.text, fontWeight:600, fontSize:14 }}>Entrenamiento de hoy</span>
          {todW && <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99, background:todW.color+"22", color:todW.color }}>{todW.name}</span>}
        </div>
        {todW ? (
          <>
            <p style={{ color:S.muted, fontSize:12, marginBottom:10 }}>{todW.muscles}</p>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1, height:6, background:S.card2, borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${totalEx>0?(doneEx/totalEx)*100:0}%`, background:S.accent, borderRadius:99, transition:"width 0.5s" }} />
              </div>
              <span style={{ color:S.text, fontWeight:700, fontSize:14, fontVariantNumeric:"tabular-nums" }}>{doneEx}/{totalEx}</span>
            </div>
            {doneEx===totalEx && totalEx>0 && <p style={{ color:S.accent, fontSize:12, fontWeight:600, marginTop:8 }}>🏆 ¡Rutina completada!</p>}
          </>
        ) : <p style={{ color:S.muted, fontSize:13 }}>😴 Día de descanso — Recarga energías.</p>}
      </div>

      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:10 }}>
          <div>
            <p style={{ color:S.muted, fontSize:11, marginBottom:4 }}>Peso actual</p>
            <span style={{ color:S.text, fontWeight:800, fontSize:28, fontVariantNumeric:"tabular-nums" }}>{curW}</span>
            <span style={{ color:S.soft, fontSize:14 }}> kg</span>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:S.accent, fontWeight:700, fontSize:14 }}>{lost>0?`-${lost}`:lost} kg</div>
            <div style={{ color:S.muted, fontSize:11 }}>meta: {GW} kg</div>
          </div>
        </div>
        <div style={{ height:8, background:S.card2, borderRadius:99, overflow:"hidden", marginBottom:6 }}>
          <div style={{ height:"100%", width:`${Math.min((lost/18)*100,100)}%`,
            background:"linear-gradient(90deg, #5eead4, #b5ff47)", borderRadius:99 }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:S.muted }}>
          <span>{SW} kg</span>
          <span style={{ color:S.accent, fontWeight:600 }}>{Math.round((lost/18)*100)}% del objetivo</span>
          <span>{GW} kg</span>
        </div>
      </div>

      <div style={{ ...card, background:S.accentDim, border:`1px solid ${S.accent}33` }}>
        <p style={{ color:S.accent, fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>💡 Consejo del día</p>
        <p style={{ color:S.text, fontSize:13, lineHeight:1.6, margin:0 }}>{tip}</p>
      </div>
    </div>
  );

  // ─── FOOD ─────────────────────────────────────────────────────────────────

  const Food = (
    <div style={{ padding:"16px 16px 0", display:"flex", flexDirection:"column", gap:14 }}>
      <h2 style={{ color:S.text, fontSize:18, fontWeight:800, margin:0 }}>🍽️ Registro de comidas</h2>

      {/* Daily summary */}
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ color:S.muted, fontSize:13 }}>Calorías del día</span>
          <span style={{ fontWeight:700, fontSize:13, color:tCal>T.cal?"#ef4444":S.accent, fontVariantNumeric:"tabular-nums" }}>
            {tCal} / {T.cal} kcal
          </span>
        </div>
        <div style={{ height:8, background:S.card2, borderRadius:99, overflow:"hidden", marginBottom:12 }}>
          <div style={{ height:"100%", width:`${Math.min((tCal/T.cal)*100,100)}%`,
            background:tCal>T.cal?"#ef4444":S.accent, borderRadius:99, transition:"width 0.5s" }} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[["Prot.",tPro,T.pro,S.accent],["Carbs",tCarb,T.carb,"#60a5fa"],["Grasa",tFat,T.fat,S.orange]].map(([l,v,m,c])=>(
            <div key={l} style={{ background:S.card2, borderRadius:12, padding:"8px 4px", textAlign:"center" }}>
              <div style={{ fontWeight:700, fontSize:15, color:c, fontVariantNumeric:"tabular-nums" }}>{Math.round(v)}g</div>
              <div style={{ fontSize:10, color:S.muted }}>{l}/{m}g</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mode selector */}
      <div style={{ display:"flex", gap:8 }}>
        {modeBtn("photo","Foto","📸")}
        {modeBtn("search","Buscar","🔍")}
        {modeBtn("manual","Manual","✏️")}
      </div>

      {/* Pending result (shared across photo & search modes) */}
      {pending && (
        <div style={card}>
          <p style={{ color:S.text, fontWeight:600, fontSize:14, marginBottom:12 }}>✨ Resultado del análisis</p>
          <div style={{ display:"flex", gap:12, marginBottom:10 }}>
            {pending.img
              ? <img src={pending.img} alt="" style={{ width:78, height:78, borderRadius:14, objectFit:"cover", flexShrink:0 }}/>
              : <div style={{ width:78, height:78, background:S.card2, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, flexShrink:0 }}>🍽️</div>}
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ color:S.text, fontWeight:700, fontSize:15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", margin:0 }}>{pending.name}</p>
              <p style={{ color:S.muted, fontSize:12, marginTop:3 }}>{pending.portion}</p>
              <p style={{ color:S.accent, fontWeight:800, fontSize:20, marginTop:4, fontVariantNumeric:"tabular-nums" }}>{pending.cal} kcal</p>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                {[["P",pending.pro,S.accent],["C",pending.carb,"#60a5fa"],["G",pending.fat,S.orange]].map(([l,v,c])=>(
                  <span key={l} style={{ fontSize:12, color:c, fontWeight:600 }}>{l}:{v}g</span>
                ))}
              </div>
            </div>
          </div>
          {pending.notes && <p style={{ color:S.muted, fontSize:12, fontStyle:"italic", marginBottom:12 }}>"{pending.notes}"</p>}
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={confirmFood}
              style={{ flex:1, background:S.accent, color:"#090b0f", fontWeight:700, border:"none", borderRadius:14, padding:"13px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
              ✅ Agregar al log
            </button>
            <button onClick={()=>setPending(null)}
              style={{ flex:1, background:S.card2, color:S.text, border:"none", borderRadius:14, padding:"13px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── PHOTO MODE ── */}
      {foodMode === "photo" && !pending && (
        <>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }}
            onChange={e => { if(e.target.files[0]) analyzePhoto(e.target.files[0]); }} />
          {analyzing ? (
            <div style={{ ...card, textAlign:"center", padding:"36px 16px" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
              <p style={{ color:S.text, fontWeight:600, fontSize:15, margin:0 }}>Analizando tu comida...</p>
              <p style={{ color:S.muted, fontSize:12, marginTop:6 }}>Claude AI identifica calorías y macros</p>
            </div>
          ) : (
            <button onClick={()=>{ if(fileRef.current){ fileRef.current.value=""; fileRef.current.click(); }}}
              style={{ background:S.accent, color:"#090b0f", fontWeight:800, border:"none", borderRadius:18, padding:"18px", fontSize:15,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%",
                boxShadow:`0 0 24px ${S.accent}40`, fontFamily:"inherit" }}>
              <span style={{ fontSize:22 }}>📸</span> Fotografiar mi comida
            </button>
          )}
        </>
      )}

      {/* ── SEARCH MODE ── */}
      {foodMode === "search" && !pending && (
        <div style={card}>
          <p style={{ color:S.text, fontWeight:600, fontSize:14, marginBottom:12 }}>🔍 Buscar por nombre y peso</p>
          <p style={{ color:S.muted, fontSize:12, marginBottom:12, lineHeight:1.5 }}>
            Escribe el alimento con la cantidad. Ej: "200g arroz blanco cocinado" o "1 pechuga de pollo a la plancha"
          </p>
          <textarea value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
            placeholder="Ej: 2 huevos revueltos con 30g de avena"
            rows={3}
            style={{ background:S.card2, border:`1px solid ${S.border}`, color:S.text, borderRadius:14,
              padding:"12px 14px", fontSize:14, outline:"none", fontFamily:"inherit", width:"100%",
              resize:"none", lineHeight:1.5 }} />
          {analyzing ? (
            <div style={{ textAlign:"center", padding:"16px 0" }}>
              <p style={{ color:S.muted, fontSize:13 }}>🔍 Consultando a Claude AI...</p>
            </div>
          ) : (
            <button onClick={analyzeSearch} disabled={!searchQuery.trim()}
              style={{ marginTop:10, width:"100%", background:searchQuery.trim()?S.accent:"#1e2330",
                color:searchQuery.trim()?"#090b0f":S.muted, fontWeight:700, border:"none", borderRadius:14,
                padding:"13px", fontSize:14, cursor:searchQuery.trim()?"pointer":"not-allowed", fontFamily:"inherit" }}>
              Calcular macros →
            </button>
          )}
        </div>
      )}

      {/* ── MANUAL MODE ── */}
      {foodMode === "manual" && (
        <div style={card}>
          <p style={{ color:S.text, fontWeight:600, fontSize:14, marginBottom:14 }}>✏️ Ingreso manual</p>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <Input placeholder="Nombre del alimento *" value={manual.name} onChange={e=>setManual({...manual,name:e.target.value})} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <p style={{ color:S.muted, fontSize:11, marginBottom:4 }}>Calorías (kcal) *</p>
                <Input placeholder="Ej: 350" type="number" inputMode="numeric" value={manual.cal} onChange={e=>setManual({...manual,cal:e.target.value})} />
              </div>
              <div>
                <p style={{ color:S.muted, fontSize:11, marginBottom:4 }}>Porción / peso</p>
                <Input placeholder="Ej: 200g" value={manual.portion} onChange={e=>setManual({...manual,portion:e.target.value})} />
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[["Proteína (g)", "pro", S.accent],["Carbos (g)", "carb", "#60a5fa"],["Grasa (g)", "fat", S.orange]].map(([label,key,color])=>(
                <div key={key}>
                  <p style={{ color, fontSize:11, marginBottom:4 }}>{label}</p>
                  <input type="number" inputMode="decimal" placeholder="0" value={manual[key]}
                    onChange={e=>setManual({...manual,[key]:e.target.value})}
                    style={{ background:S.card2, border:`1px solid ${color}44`, color:S.text, borderRadius:12,
                      padding:"10px 12px", fontSize:14, outline:"none", fontFamily:"inherit", width:"100%",
                      textAlign:"center" }} />
                </div>
              ))}
            </div>
            <button onClick={addManual} disabled={!manual.name||!manual.cal}
              style={{ background:manual.name&&manual.cal?S.accent:"#1e2330",
                color:manual.name&&manual.cal?"#090b0f":S.muted, fontWeight:700, border:"none",
                borderRadius:14, padding:"13px", fontSize:14, cursor:manual.name&&manual.cal?"pointer":"not-allowed",
                fontFamily:"inherit", marginTop:4 }}>
              ➕ Agregar al log del día
            </button>
          </div>
        </div>
      )}

      {/* Food log */}
      {food.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:S.muted }}>
          <div style={{ fontSize:44, marginBottom:10 }}>🥗</div>
          <p style={{ fontSize:14, margin:0 }}>Sin comidas registradas hoy</p>
        </div>
      ) : (
        <div>
          <p style={{ color:S.muted, fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Comidas del día</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {food.map(e => (
              <div key={e.id} style={{ ...card, display:"flex", alignItems:"center", gap:12, padding:"12px" }}>
                {e.img ? <img src={e.img} alt="" style={{ width:52, height:52, borderRadius:12, objectFit:"cover", flexShrink:0 }}/>
                  : <div style={{ width:52, height:52, background:S.card2, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>🍽️</div>}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ color:S.text, fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", margin:0 }}>{e.name}</p>
                  <p style={{ color:S.muted, fontSize:11, marginTop:2 }}>{e.time} · {e.portion}</p>
                  <p style={{ color:S.accent, fontSize:12, fontWeight:600, marginTop:2 }}>{e.cal} kcal · P:{e.pro}g C:{e.carb}g G:{e.fat}g</p>
                </div>
                <button onClick={()=>sf(food.filter(f=>f.id!==e.id))}
                  style={{ background:"none", border:"none", color:S.muted, fontSize:22, cursor:"pointer", padding:"4px 6px", flexShrink:0 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ─── WORKOUT ─────────────────────────────────────────────────────────────

  const Workout = (
    <div style={{ padding:"16px 16px 0", display:"flex", flexDirection:"column", gap:14 }}>
      <h2 style={{ color:S.text, fontSize:18, fontWeight:800, margin:0 }}>💪 Rutina de entrenamiento</h2>

      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
        {DN.map((d,i) => {
          const w=PLAN[i], isTod=i===today, isSel=i===selDay;
          return (
            <button key={i} onClick={()=>setSelDay(i)}
              style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", padding:"8px 11px",
                borderRadius:14, border:"none", cursor:"pointer", transition:"all 0.15s", fontFamily:"inherit",
                background:isSel?S.accent:isTod?"#1e2330":S.card,
                color:isSel?"#090b0f":isTod?S.text:S.muted, fontWeight:isSel||isTod?700:500 }}>
              <span style={{ fontSize:11 }}>{d}</span>
              <span style={{ fontSize:18, marginTop:3 }}>{w?w.emoji:"😴"}</span>
            </button>
          );
        })}
      </div>

      {selW ? (
        <>
          <div style={{ ...card, background:`${selW.color}10`, border:`1px solid ${selW.color}30` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:34 }}>{selW.emoji}</span>
              <div style={{ flex:1 }}>
                <p style={{ color:S.text, fontWeight:800, fontSize:16, margin:0 }}>{selW.name}</p>
                <p style={{ color:S.soft, fontSize:12, marginTop:3 }}>{selW.muscles}</p>
              </div>
              {selDay===today && (
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:selW.color, fontWeight:800, fontSize:24, fontVariantNumeric:"tabular-nums" }}>{doneEx}/{totalEx}</div>
                  <div style={{ color:S.muted, fontSize:10 }}>ejercicios</div>
                </div>
              )}
            </div>
            {selDay===today && totalEx>0 && (
              <div style={{ height:6, background:S.card2, borderRadius:99, overflow:"hidden", marginTop:12 }}>
                <div style={{ height:"100%", width:`${(doneEx/totalEx)*100}%`, background:selW.color, borderRadius:99, transition:"width 0.5s" }} />
              </div>
            )}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {selW.ex.map((ex, idx) => {
              const isDone = selDay===today ? !!checks[ex.id] : false;
              return (
                <div key={ex.id} onClick={()=>selDay===today && sc({...checks,[ex.id]:!checks[ex.id]})}
                  style={{ ...card, display:"flex", alignItems:"center", gap:12, padding:"13px 14px",
                    opacity:isDone?0.5:1, cursor:selDay===today?"pointer":"default", transition:"opacity 0.2s" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                    background:isDone?"#16a34a22":selW.color+"20", color:isDone?S.accent:selW.color,
                    fontWeight:700, fontSize:13, flexShrink:0 }}>
                    {isDone?"✓":idx+1}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:isDone?S.muted:S.text, fontSize:13, fontWeight:600, margin:0,
                      textDecoration:isDone?"line-through":"none" }}>{ex.name}</p>
                    <p style={{ color:S.muted, fontSize:11, marginTop:3 }}>{ex.sets}</p>
                  </div>
                  {selDay===today && (
                    <div style={{ width:24, height:24, borderRadius:"50%", border:`2px solid ${isDone?S.accent:S.muted}`,
                      background:isDone?S.accent:"transparent", display:"flex", alignItems:"center",
                      justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
                      {isDone && <span style={{ color:"#090b0f", fontSize:11, fontWeight:900 }}>✓</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selDay===today && doneEx===totalEx && totalEx>0 && (
            <div style={{ background:"#052e16", border:"1px solid #16a34a", borderRadius:20, padding:"28px 16px", textAlign:"center" }}>
              <div style={{ fontSize:44, marginBottom:10 }}>🏆</div>
              <p style={{ color:S.accent, fontWeight:800, fontSize:18, margin:0 }}>¡Rutina completada!</p>
              <p style={{ color:S.soft, fontSize:13, marginTop:8 }}>El músculo crece ahora. Descansa y come bien.</p>
            </div>
          )}
        </>
      ) : (
        <div style={{ ...card, padding:"52px 16px", textAlign:"center" }}>
          <div style={{ fontSize:52, marginBottom:12 }}>😴</div>
          <p style={{ color:S.text, fontWeight:800, fontSize:18, margin:0 }}>Día de descanso</p>
          <p style={{ color:S.muted, fontSize:13, marginTop:8 }}>El músculo crece mientras recuperas. Sal a caminar 30 min.</p>
        </div>
      )}
    </div>
  );

  // ─── PROGRESS ─────────────────────────────────────────────────────────────

  const chartData = wlog.map(w => ({ date:w.date.slice(5), peso:w.w }));
  const Progress = (
    <div style={{ padding:"16px 16px 0", display:"flex", flexDirection:"column", gap:14 }}>
      <h2 style={{ color:S.text, fontSize:18, fontWeight:800, margin:0 }}>📈 Control de peso</h2>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        {[{l:"Inicio",v:`${SW}`,c:S.muted},{l:"Actual",v:`${curW}`,c:S.text},{l:"Meta",v:`${GW}`,c:S.accent}].map(s=>(
          <div key={s.l} style={{ ...card, textAlign:"center", padding:"14px 8px" }}>
            <div style={{ fontWeight:800, fontSize:17, color:s.c, fontVariantNumeric:"tabular-nums" }}>{s.v} <span style={{ fontSize:11, fontWeight:500 }}>kg</span></div>
            <div style={{ color:S.muted, fontSize:11, marginTop:4 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ color:S.muted, fontSize:13 }}>Objetivo: -18 kg</span>
          <span style={{ color:S.accent, fontWeight:700, fontSize:13 }}>{Math.round((lost/18)*100)}% completado</span>
        </div>
        <div style={{ height:10, background:S.card2, borderRadius:99, overflow:"hidden", marginBottom:8 }}>
          <div style={{ height:"100%", width:`${Math.min((lost/18)*100,100)}%`,
            background:"linear-gradient(90deg, #5eead4, #b5ff47)", borderRadius:99 }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:S.muted }}>
          <span>{SW} kg</span>
          <span style={{ color:S.accent, fontWeight:600 }}>-{lost} kg perdidos</span>
          <span>{GW} kg</span>
        </div>
      </div>

      {wlog.length > 1 && (
        <div style={card}>
          <p style={{ color:S.muted, fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:14 }}>Evolución de peso</p>
          <ResponsiveContainer width="100%" height={155}>
            <LineChart data={chartData} margin={{top:5,right:8,left:-22,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" />
              <XAxis dataKey="date" tick={{fill:"#4b5563",fontSize:9}} tickLine={false} axisLine={false} />
              <YAxis domain={["auto","auto"]} tick={{fill:"#4b5563",fontSize:9}} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{background:"#0d0f14",border:`1px solid ${S.border}`,borderRadius:10,fontSize:12}}
                labelStyle={{color:S.muted}} itemStyle={{color:S.orange}} />
              <ReferenceLine y={GW} stroke={S.accent} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="peso" stroke={S.orange} strokeWidth={2.5} dot={{fill:S.orange,r:3,strokeWidth:0}} name="kg" />
            </LineChart>
          </ResponsiveContainer>
          <p style={{ fontSize:10, color:S.muted, textAlign:"center", marginTop:6 }}>línea punteada = meta {GW} kg</p>
        </div>
      )}

      <div style={card}>
        <p style={{ color:S.text, fontWeight:600, fontSize:14, marginBottom:12 }}>📍 Registrar peso de hoy</p>
        <div style={{ display:"flex", gap:8 }}>
          <input type="number" step="0.1" inputMode="decimal" value={wIn} onChange={e=>setWIn(e.target.value)}
            placeholder="Ej: 96.3"
            style={{ flex:1, background:S.card2, border:`1px solid ${S.border}`, color:S.text, borderRadius:14,
              padding:"12px 16px", fontSize:14, outline:"none", fontVariantNumeric:"tabular-nums", fontFamily:"inherit" }} />
          <span style={{ background:S.card2, border:`1px solid ${S.border}`, borderRadius:14, padding:"0 14px",
            display:"flex", alignItems:"center", color:S.muted, fontSize:13 }}>kg</span>
          <button onClick={addWeight}
            style={{ background:S.accent, color:"#090b0f", fontWeight:700, border:"none", borderRadius:14,
              padding:"12px 18px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Guardar</button>
        </div>
      </div>

      <div style={card}>
        <p style={{ color:S.text, fontWeight:600, fontSize:14, marginBottom:12 }}>Historial de registros</p>
        {wlog.length === 0 ? (
          <p style={{ color:S.muted, fontSize:13, textAlign:"center", padding:"16px 0", margin:0 }}>Sin registros aún</p>
        ) : (
          <div style={{ maxHeight:220, overflowY:"auto" }}>
            {[...wlog].reverse().map((w,i,arr) => {
              const prev = arr[i+1];
              const diff = prev ? +(w.w - prev.w).toFixed(1) : null;
              return (
                <div key={w.date} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"10px 0", borderBottom:`1px solid ${S.border}` }}>
                  <span style={{ color:S.soft, fontSize:13 }}>
                    {new Date(w.date+"T12:00").toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"2-digit"})}
                  </span>
                  <span style={{ color:S.text, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{w.w} kg</span>
                  {diff !== null && (
                    <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:99,
                      background:diff<0?"#052e16":diff>0?"#450a0a":S.card2,
                      color:diff<0?S.accent:diff>0?"#f87171":S.muted }}>
                      {diff>0?"+":""}{diff} kg
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ─── ALERTS ───────────────────────────────────────────────────────────────

  const Alerts = (
    <div style={{ padding:"16px 16px 0", display:"flex", flexDirection:"column", gap:14 }}>
      <h2 style={{ color:S.text, fontSize:18, fontWeight:800, margin:0 }}>🔔 Alertas y horarios</h2>

      {notifPerm !== "granted" ? (
        <div style={{ background:"#2d1a02", border:"1px solid #92400e", borderRadius:20, padding:16 }}>
          <p style={{ color:"#fcd34d", fontWeight:700, fontSize:14, margin:"0 0 6px" }}>⚠️ Notificaciones desactivadas</p>
          <p style={{ color:S.muted, fontSize:12, lineHeight:1.5, margin:"0 0 14px" }}>Actívalas para recibir recordatorios automáticos de entreno y comidas.</p>
          <button onClick={reqNotif}
            style={{ width:"100%", background:"#f59e0b", color:"#090b0f", fontWeight:700, border:"none",
              borderRadius:14, padding:"13px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
            🔔 Activar notificaciones
          </button>
        </div>
      ) : (
        <div style={{ background:"#052e16", border:"1px solid #16a34a", borderRadius:20, padding:"13px 16px",
          display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>✅</span>
          <div>
            <p style={{ color:S.accent, fontWeight:600, fontSize:13, margin:0 }}>Notificaciones activas</p>
            <p style={{ color:S.muted, fontSize:11, marginTop:2 }}>Recibirás alertas en los horarios configurados</p>
          </div>
        </div>
      )}

      <div style={card}>
        <p style={{ color:S.text, fontWeight:600, fontSize:14, marginBottom:16 }}>⏰ Configurar horarios</p>
        {[{k:"workout",l:"🏋️ Entrenamiento"},{k:"breakfast",l:"🥣 Desayuno"},{k:"lunch",l:"🍱 Almuerzo"},{k:"dinner",l:"🌙 Cena"}].map(({k,l})=>(
          <div key={k} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <span style={{ color:S.soft, fontSize:14 }}>{l}</span>
            <input type="time" value={alrt[k]} onChange={e=>sal({...alrt,[k]:e.target.value})}
              style={{ background:S.card2, border:`1px solid ${S.border}`, color:S.text,
                borderRadius:12, padding:"8px 12px", fontSize:13, outline:"none", fontFamily:"inherit" }} />
          </div>
        ))}
      </div>

      <div style={card}>
        <p style={{ color:S.text, fontWeight:600, fontSize:14, marginBottom:12 }}>🧪 Probar alertas</p>
        {[
          {msg:"💪 ¡A entrenar! La disciplina es libertad.",l:"Probar alerta de entrenamiento"},
          {msg:"🍽️ ¡Hora de comer! No olvides la proteína.",l:"Probar alerta de comida"},
          {msg:"💧 ¡Hidratación! Mínimo 3L al día.",l:"Probar alerta de hidratación"},
        ].map(({msg,l},i)=>(
          <button key={i} onClick={()=>testNotif(msg)}
            style={{ display:"block", width:"100%", textAlign:"left", background:S.card2,
              border:`1px solid ${S.border}`, color:notifPerm==="granted"?S.text:S.muted,
              borderRadius:14, padding:"12px 16px", fontSize:13,
              cursor:notifPerm==="granted"?"pointer":"not-allowed", marginBottom:8, fontFamily:"inherit" }}>
            {l}
          </button>
        ))}
      </div>

      <div style={card}>
        <p style={{ color:S.text, fontWeight:600, fontSize:14, marginBottom:14 }}>📋 Horario diario ideal</p>
        {[
          {t:"07:30",a:"🥣 Desayuno",d:"550 kcal · alta proteína"},
          {t:"13:00",a:"🍱 Almuerzo",d:"750 kcal · comida principal"},
          {t:"17:30",a:"⚡ Pre-entreno",d:"Hidratación + carbos rápidos"},
          {t:"18:00",a:"🏋️ Gym",d:"45-60 min · alta intensidad"},
          {t:"20:00",a:"🌙 Cena",d:"600 kcal · proteína + verduras"},
          {t:"23:00",a:"😴 Dormir",d:"7-8h · recuperación muscular"},
        ].map(({t,a,d})=>(
          <div key={t} style={{ display:"flex", alignItems:"flex-start", gap:12, paddingTop:10, paddingBottom:10, borderBottom:`1px solid ${S.border}` }}>
            <span style={{ color:S.accent, fontFamily:"monospace", fontSize:12, width:44, flexShrink:0, paddingTop:1 }}>{t}</span>
            <div>
              <p style={{ color:S.text, fontSize:13, fontWeight:600, margin:0 }}>{a}</p>
              <p style={{ color:S.muted, fontSize:11, marginTop:2 }}>{d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── SHELL ────────────────────────────────────────────────────────────────

  const NAV = [
    {id:"home",icon:"🏠",l:"Inicio"},
    {id:"food",icon:"🍽️",l:"Comida"},
    {id:"workout",icon:"💪",l:"Rutina"},
    {id:"progress",icon:"📈",l:"Peso"},
    {id:"alerts",icon:"🔔",l:"Alertas"},
  ];
  const views = { home:Home, food:Food, workout:Workout, progress:Progress, alerts:Alerts };

  return (
    <div style={{ background:S.bg, minHeight:"100vh", display:"flex", flexDirection:"column",
      maxWidth:440, margin:"0 auto", position:"relative",
      fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      <div style={{ position:"sticky", top:0, zIndex:20, background:S.bg,
        borderBottom:`1px solid ${S.border}`, padding:"12px 16px",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, background:S.accent, borderRadius:9,
            display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 12px ${S.accent}55` }}>
            <span style={{ color:"#090b0f", fontWeight:900, fontSize:15 }}>F</span>
          </div>
          <span style={{ color:S.text, fontWeight:800, fontSize:16 }}>FitPlan</span>
        </div>
        <div style={{ display:"flex", gap:8, fontSize:12, color:S.muted }}>
          <span style={{ fontVariantNumeric:"tabular-nums" }}>{curW} kg</span>
          <span>·</span>
          <span style={{ color:S.accent, fontWeight:600 }}>-{lost} kg</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", paddingBottom:80 }}>
        {views[tab]}
      </div>

      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:440, zIndex:20,
        background:"#0c0e13ee", borderTop:`1px solid ${S.border}`,
        backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
        padding:"6px 8px 8px" }}>
        <div style={{ display:"flex", justifyContent:"space-around" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={()=>setTab(n.id)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                padding:"6px 12px", borderRadius:14, border:"none", cursor:"pointer",
                background:tab===n.id?S.accentDim:"transparent",
                color:tab===n.id?S.accent:S.muted, transition:"all 0.15s", fontFamily:"inherit" }}>
              <span style={{ fontSize:20, lineHeight:1 }}>{n.icon}</span>
              <span style={{ fontSize:10, fontWeight:tab===n.id?700:500, lineHeight:1 }}>{n.l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
