import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PLAN = {
  1: { name:"PUSH", emoji:"🏋️", muscles:"Pecho · Hombros · Tríceps", color:"#f97316",
    ex:[{id:'p1',name:"Press de banca con barra",sets:"4 × 8 reps",anim:"bench"},{id:'p2',name:"Press inclinado mancuernas",sets:"4 × 10 reps",anim:"bench"},{id:'p3',name:"Press militar",sets:"4 × 10 reps",anim:"overhead"},{id:'p4',name:"Elevaciones laterales",sets:"4 × 12 reps",anim:"raise"},{id:'p5',name:"Extensiones tríceps polea",sets:"4 × 12 reps",anim:"tricep"},{id:'p6',name:"Fondos en paralelas",sets:"3 × 10 reps",anim:"dip"}]},
  2: { name:"PULL", emoji:"🔙", muscles:"Espalda · Bíceps", color:"#a855f7",
    ex:[{id:'pu1',name:"Peso muerto convencional",sets:"4 × 6 reps",anim:"hinge"},{id:'pu2',name:"Jalón al pecho",sets:"4 × 10 reps",anim:"pulldown"},{id:'pu3',name:"Remo con barra",sets:"4 × 10 reps",anim:"row"},{id:'pu4',name:"Pull-over en polea",sets:"3 × 12 reps",anim:"pullover"},{id:'pu5',name:"Curl bíceps con barra",sets:"4 × 10 reps",anim:"curl"},{id:'pu6',name:"Curl martillo",sets:"3 × 12 reps",anim:"curl"}]},
  3: { name:"LEGS", emoji:"🦵", muscles:"Cuádriceps · Isquios · Glúteos", color:"#10b981",
    ex:[{id:'l1',name:"Sentadilla con barra",sets:"4 × 8 reps",anim:"squat"},{id:'l2',name:"Prensa de pierna",sets:"4 × 10 reps",anim:"legpress"},{id:'l3',name:"Extensiones cuádriceps",sets:"3 × 12 reps",anim:"legext"},{id:'l4',name:"Curl isquiotibiales",sets:"4 × 12 reps",anim:"legcurl"},{id:'l5',name:"Hip thrust con barra",sets:"4 × 10 reps",anim:"thrust"},{id:'l6',name:"Elevación de gemelos",sets:"4 × 15 reps",anim:"calf"}]},
  4: null,
  5: { name:"UPPER", emoji:"⬆️", muscles:"Pecho + Espalda + Hombros", color:"#eab308",
    ex:[{id:'u1',name:"Press banca mancuernas",sets:"4 × 10 reps",anim:"bench"},{id:'u2',name:"Dominadas / jalón cerrado",sets:"4 × 10 reps",anim:"pullup"},{id:'u3',name:"Remo en máquina",sets:"4 × 12 reps",anim:"row"},{id:'u4',name:"Cruces en polea",sets:"3 × 12 reps",anim:"fly"},{id:'u5',name:"Press Arnold",sets:"3 × 10 reps",anim:"overhead"},{id:'u6',name:"Facepull",sets:"3 × 15 reps",anim:"facepull"}]},
  6: { name:"LOWER+CORE", emoji:"🔥", muscles:"Piernas posterior + Core", color:"#ef4444",
    ex:[{id:'lc1',name:"Peso muerto rumano",sets:"4 × 10 reps",anim:"hinge"},{id:'lc2',name:"Zancadas mancuernas",sets:"4 × 12/lado",anim:"lunge"},{id:'lc3',name:"Sentadilla búlgara",sets:"3 × 10/lado",anim:"squat"},{id:'lc4',name:"Abducción en máquina",sets:"3 × 15 reps",anim:"abduct"},{id:'lc5',name:"Plancha frontal",sets:"4 × 45 seg",anim:"plank"},{id:'lc6',name:"Crunch en polea",sets:"4 × 15 reps",anim:"crunch"},{id:'lc7',name:"Elevación piernas colgado",sets:"3 × 12 reps",anim:"legraise"}]},
  0: null,
};

// Calories burned per completed exercise (97.5kg person, high intensity)
const EX_CAL = {
  p1:42,p2:38,p3:35,p4:18,p5:20,p6:28,
  pu1:52,pu2:32,pu3:38,pu4:22,pu5:20,pu6:18,
  l1:65,l2:48,l3:25,l4:28,l5:42,l6:20,
  u1:38,u2:42,u3:35,u4:22,u5:32,u6:18,
  lc1:55,lc2:48,lc3:45,lc4:22,lc5:15,lc6:18,lc7:22
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

const tk = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ─── STYLES ────────────────────────────────────────────────────────────────────

const S = {
  bg:"#090b0f", card:"#101318", card2:"#161921", border:"#1e2330",
  accent:"#b5ff47", accentDim:"#b5ff4715", orange:"#ff8c42",
  text:"#e2e8f4", muted:"#4b5563", soft:"#8899aa",
};

// ─── EXERCISE ANIMATIONS ──────────────────────────────────────────────────────

function ExerciseAnimation({ type, color = "#b5ff47" }) {
  const c = color;
  const g = { stroke: c, strokeWidth:"3", strokeLinecap:"round", fill:"none" };
  const dur = "2s";

  const Head = ({ cx=50, cy=13 }) => <circle cx={cx} cy={cy} r="9" fill={c}/>;

  const Standing = ({ armAnim, legAnim, children }) => (
    <>
      <Head/>
      <line x1="50" y1="22" x2="50" y2="58" {...g}/>
      {children}
      {!legAnim && <>
        <line x1="50" y1="58" x2="38" y2="82" {...g}/>
        <line x1="38" y1="82" x2="35" y2="105" {...g}/>
        <line x1="50" y1="58" x2="62" y2="82" {...g}/>
        <line x1="62" y1="82" x2="65" y2="105" {...g}/>
      </>}
    </>
  );

  const anims = {

    bench: (
      <svg viewBox="0 0 120 90" width="100%" style={{maxHeight:180}}>
        <rect x="8" y="62" width="104" height="7" rx="3" fill="#1e2330"/>
        <rect x="5" y="57" width="8" height="12" rx="2" fill="#1e2330"/>
        <rect x="107" y="57" width="8" height="12" rx="2" fill="#1e2330"/>
        <Head cx={106} cy={52}/>
        <line x1="97" y1="52" x2="25" y2="52" {...g}/>
        <line x1="25" y1="52" x2="14" y2="68" {...g}/>
        <line x1="14" y1="68" x2="10" y2="56" {...g}/>
        <line x1="25" y1="52" x2="20" y2="68" {...g}/>
        <line x1="20" y1="68" x2="16" y2="56" {...g}/>
        <line x1="112" y1="52" x2="112" y2="42" stroke={c} strokeWidth="4" strokeLinecap="round"/>
        <g>
          <line x1="0" y1="0" x2="-22" y2="0" {...g}/>
          <animateTransform attributeName="transform" type="translate" values="60,52; 60,52" dur={dur} repeatCount="indefinite"/>
        </g>
        <g transform="translate(60,52)">
          <line x1="0" y1="0" x2="0" y2="-26" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="0;40;0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
        <g transform="translate(75,52)">
          <line x1="0" y1="0" x2="0" y2="-26" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="0;-40;0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),

    overhead: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <Standing>
          <g transform="translate(50,30)">
            <line x1="-20" y1="0" x2="-30" y2="20" {...g}/>
            <animateTransform attributeName="transform" type="rotate" values="0 -20 0;-40 -20 0;0 -20 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>
          <g transform="translate(50,30)">
            <line x1="20" y1="0" x2="30" y2="20" {...g}/>
            <animateTransform attributeName="transform" type="rotate" values="0 20 0;40 20 0;0 20 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>
        </Standing>
        <line x1="15" y1="10" x2="85" y2="10" stroke={c} strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
      </svg>
    ),

    raise: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <Standing>
          <g transform="translate(50,30)">
            <line x1="0" y1="0" x2="-28" y2="0" {...g}/>
            <animateTransform attributeName="transform" type="rotate" values="50 0 0;0 0 0;50 0 0" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>
          <g transform="translate(50,30)">
            <line x1="0" y1="0" x2="28" y2="0" {...g}/>
            <animateTransform attributeName="transform" type="rotate" values="-50 0 0;0 0 0;-50 0 0" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>
        </Standing>
      </svg>
    ),

    tricep: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <Standing>
          <line x1="50" y1="30" x2="34" y2="50" {...g}/>
          <line x1="50" y1="30" x2="66" y2="50" {...g}/>
          <g transform="translate(66,50)">
            <line x1="0" y1="0" x2="0" y2="24" {...g}/>
            <animateTransform attributeName="transform" type="rotate" values="0;-40;0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>
        </Standing>
        <line x1="70" y1="10" x2="70" y2="50" stroke={c} strokeWidth="2" opacity="0.4" strokeDasharray="4 4"/>
      </svg>
    ),

    dip: (
      <svg viewBox="0 0 120 130" width="100%" style={{maxHeight:190}}>
        <line x1="15" y1="30" x2="15" y2="110" stroke="#1e2330" strokeWidth="5"/>
        <line x1="105" y1="30" x2="105" y2="110" stroke="#1e2330" strokeWidth="5"/>
        <g>
          <Head cx={60} cy={42}/>
          <line x1="60" y1="51" x2="60" y2="75" {...g}/>
          <line x1="60" y1="55" x2="15" y2="50" {...g}/>
          <line x1="60" y1="55" x2="105" y2="50" {...g}/>
          <line x1="60" y1="75" x2="48" y2="100" {...g}/>
          <line x1="48" y1="100" x2="45" y2="120" {...g}/>
          <line x1="60" y1="75" x2="72" y2="100" {...g}/>
          <line x1="72" y1="100" x2="75" y2="120" {...g}/>
          <animateTransform attributeName="transform" type="translate" values="0,0;0,14;0,0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),

    hinge: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <line x1="5" y1="110" x2="95" y2="110" stroke="#1e2330" strokeWidth="3"/>
        <g>
          <circle cx="50" cy="13" r="9" fill={c}/>
          <line x1="50" y1="22" x2="50" y2="58" {...g}/>
          <line x1="50" y1="30" x2="22" y2="46" {...g}/>
          <line x1="50" y1="30" x2="78" y2="46" {...g}/>
          <line x1="50" y1="58" x2="40" y2="82" {...g}/>
          <line x1="40" y1="82" x2="38" y2="108" {...g}/>
          <line x1="50" y1="58" x2="60" y2="82" {...g}/>
          <line x1="60" y1="82" x2="62" y2="108" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="0 50 58;-45 50 58;0 50 58" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
        <line x1="20" y1="108" x2="80" y2="108" stroke={c} strokeWidth="4" strokeLinecap="round" opacity="0.7"/>
      </svg>
    ),

    pulldown: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <line x1="10" y1="5" x2="90" y2="5" stroke="#1e2330" strokeWidth="4"/>
        <line x1="50" y1="5" x2="50" y2="18" stroke="#1e2330" strokeWidth="3"/>
        <Head cx={50} cy={55}/>
        <line x1="50" y1="64" x2="50" y2="90" {...g}/>
        <line x1="50" y1="90" x2="38" y2="120" {...g}/>
        <line x1="50" y1="90" x2="62" y2="120" {...g}/>
        <rect x="30" y="118" width="40" height="8" rx="3" fill="#1e2330"/>
        <g transform="translate(50,64)">
          <line x1="-30" y1="-46" x2="0" y2="0" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="-30 0 0;0 0 0;-30 0 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
        <g transform="translate(50,64)">
          <line x1="30" y1="-46" x2="0" y2="0" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="30 0 0;0 0 0;30 0 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),

    row: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <g transform="translate(50,58) rotate(-40 0 0) translate(-50,-58)">
          <Head/>
          <line x1="50" y1="22" x2="50" y2="58" {...g}/>
          <line x1="50" y1="58" x2="38" y2="82" {...g}/>
          <line x1="38" y1="82" x2="36" y2="108" {...g}/>
          <line x1="50" y1="58" x2="62" y2="82" {...g}/>
          <line x1="62" y1="82" x2="64" y2="108" {...g}/>
        </g>
        <g transform="translate(50,35) rotate(-40 0 0) translate(-50,-35)">
          <line x1="50" y1="35" x2="22" y2="50" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="-40 50 35;0 50 35;-40 50 35" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),

    pullover: (
      <svg viewBox="0 0 120 90" width="100%" style={{maxHeight:160}}>
        <rect x="8" y="62" width="104" height="7" rx="3" fill="#1e2330"/>
        <Head cx={106} cy={52}/>
        <line x1="97" y1="52" x2="25" y2="52" {...g}/>
        <line x1="25" y1="52" x2="14" y2="68" {...g}/>
        <line x1="14" y1="68" x2="10" y2="58" {...g}/>
        <g transform="translate(75,52)">
          <line x1="0" y1="0" x2="0" y2="-28" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="-60;0;-60" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),

    curl: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <Standing>
          <line x1="50" y1="30" x2="32" y2="55" {...g}/>
          <line x1="50" y1="30" x2="68" y2="55" {...g}/>
          <g transform="translate(32,55)">
            <line x1="0" y1="0" x2="-4" y2="24" {...g}/>
            <animateTransform attributeName="transform" type="rotate" values="0;-75;0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>
          <line x1="68" y1="55" x2="72" y2="79" {...g}/>
        </Standing>
        <circle cx="28" cy="84" r="4" fill={c} opacity="0.5">
          <animate attributeName="opacity" values="0.5;1;0.5" dur={dur} repeatCount="indefinite"/>
        </circle>
      </svg>
    ),

    squat: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <line x1="5" y1="118" x2="95" y2="118" stroke="#1e2330" strokeWidth="3"/>
        <g>
          <Head/>
          <line x1="50" y1="22" x2="50" y2="58" {...g}/>
          <line x1="50" y1="30" x2="26" y2="42" {...g}/>
          <line x1="50" y1="30" x2="74" y2="42" {...g}/>
          <line x1="50" y1="58" x2="35" y2="82" {...g}/>
          <line x1="35" y1="82" x2="33" y2="115" {...g}/>
          <line x1="50" y1="58" x2="65" y2="82" {...g}/>
          <line x1="65" y1="82" x2="67" y2="115" {...g}/>
          <animateTransform attributeName="transform" type="translate" values="0,0;0,14;0,0" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
        <line x1="18" y1="8" x2="82" y2="8" stroke={c} strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
      </svg>
    ),

    legpress: (
      <svg viewBox="0 0 120 100" width="100%" style={{maxHeight:180}}>
        <rect x="5" y="55" width="50" height="35" rx="6" fill="#1e2330"/>
        <rect x="5" y="50" width="8" height="40" rx="4" fill="#252830"/>
        <Head cx={30} cy={38}/>
        <line x1="30" y1="47" x2="30" y2="60" {...g}/>
        <g transform="translate(30,60)">
          <line x1="0" y1="0" x2="25" y2="-18" {...g}/>
          <line x1="25" y1="-18" x2="58" y2="-12" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="-20 0 0;10 0 0;-20 0 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
        <rect x="82" y="18" width="30" height="10" rx="5" fill="#1e2330"/>
      </svg>
    ),

    legext: (
      <svg viewBox="0 0 110 130" width="100%" style={{maxHeight:190}}>
        <rect x="5" y="50" width="50" height="60" rx="6" fill="#1e2330"/>
        <rect x="5" y="48" width="8" height="68" rx="4" fill="#252830"/>
        <Head cx={30} cy={25}/>
        <line x1="30" y1="34" x2="30" y2="55" {...g}/>
        <line x1="30" y1="55" x2="15" y2="56" {...g}/>
        <line x1="30" y1="55" x2="45" y2="56" {...g}/>
        <line x1="30" y1="55" x2="30" y2="80" {...g}/>
        <g transform="translate(30,80)">
          <line x1="0" y1="0" x2="30" y2="20" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="40;0;40" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),

    legcurl: (
      <svg viewBox="0 0 120 90" width="100%" style={{maxHeight:160}}>
        <rect x="8" y="50" width="104" height="8" rx="3" fill="#1e2330"/>
        <Head cx={100} cy={38}/>
        <line x1="92" y1="38" x2="25" y2="38" {...g}/>
        <line x1="25" y1="38" x2="12" y2="52" {...g}/>
        <line x1="12" y1="52" x2="10" y2="42" {...g}/>
        <line x1="92" y1="38" x2="110" y2="52" {...g}/>
        <line x1="110" y1="52" x2="112" y2="42" {...g}/>
        <line x1="25" y1="38" x2="40" y2="58" {...g}/>
        <g transform="translate(40,58)">
          <line x1="0" y1="0" x2="20" y2="-18" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="0;-60;0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),

    thrust: (
      <svg viewBox="0 0 120 100" width="100%" style={{maxHeight:170}}>
        <rect x="5" y="36" width="20" height="50" rx="6" fill="#1e2330"/>
        <line x1="5" y1="80" x2="115" y2="80" stroke="#1e2330" strokeWidth="3"/>
        <g>
          <Head cx={20} cy={32}/>
          <line x1="20" y1="41" x2="20" y2="58" {...g}/>
          <line x1="20" y1="55" x2="50" y2="58" {...g}/>
          <line x1="50" y1="58" x2="68" y2="75" {...g}/>
          <line x1="68" y1="75" x2="65" y2="95" {...g}/>
          <line x1="50" y1="58" x2="75" y2="70" {...g}/>
          <line x1="75" y1="70" x2="78" y2="90" {...g}/>
          <line x1="20" y1="52" x2="5" y2="55" {...g}/>
          <animateTransform attributeName="transform" type="translate" values="0,15;0,0;0,15" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
        <line x1="44" y1="42" x2="90" y2="42" stroke={c} strokeWidth="4" strokeLinecap="round" opacity="0.7">
          <animate attributeName="y1" values="57;42;57" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          <animate attributeName="y2" values="57;42;57" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </line>
      </svg>
    ),

    calf: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <line x1="5" y1="118" x2="95" y2="118" stroke="#1e2330" strokeWidth="3"/>
        <g>
          <Head/>
          <line x1="50" y1="22" x2="50" y2="58" {...g}/>
          <line x1="50" y1="30" x2="28" y2="46" {...g}/>
          <line x1="50" y1="30" x2="72" y2="46" {...g}/>
          <line x1="50" y1="58" x2="40" y2="88" {...g}/>
          <line x1="40" y1="88" x2="38" y2="115" {...g}/>
          <line x1="50" y1="58" x2="60" y2="88" {...g}/>
          <line x1="60" y1="88" x2="62" y2="115" {...g}/>
          <animateTransform attributeName="transform" type="translate" values="0,0;0,-10;0,0" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),

    pullup: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <line x1="5" y1="8" x2="95" y2="8" stroke="#1e2330" strokeWidth="6" strokeLinecap="round"/>
        <g>
          <Head cx={50} cy={52}/>
          <line x1="50" y1="61" x2="50" y2="88" {...g}/>
          <line x1="50" y1="78" x2="35" y2="100" {...g}/>
          <line x1="35" y1="100" x2="33" y2="122" {...g}/>
          <line x1="50" y1="78" x2="65" y2="100" {...g}/>
          <line x1="65" y1="100" x2="67" y2="122" {...g}/>
          <g transform="translate(50,61)">
            <line x1="-26" y1="-46" x2="0" y2="0" {...g}/>
            <animateTransform attributeName="transform" type="rotate" values="25 0 0;0 0 0;25 0 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>
          <g transform="translate(50,61)">
            <line x1="26" y1="-46" x2="0" y2="0" {...g}/>
            <animateTransform attributeName="transform" type="rotate" values="-25 0 0;0 0 0;-25 0 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>
          <animateTransform attributeName="transform" type="translate" values="0,14;0,0;0,14" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),

    fly: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <Standing>
          <g transform="translate(50,30)">
            <line x1="0" y1="0" x2="-28" y2="8" {...g}/>
            <animateTransform attributeName="transform" type="rotate" values="30 0 0;-10 0 0;30 0 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>
          <g transform="translate(50,30)">
            <line x1="0" y1="0" x2="28" y2="8" {...g}/>
            <animateTransform attributeName="transform" type="rotate" values="-30 0 0;10 0 0;-30 0 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>
        </Standing>
      </svg>
    ),

    facepull: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <line x1="90" y1="30" x2="90" y2="42" stroke="#1e2330" strokeWidth="5" strokeLinecap="round"/>
        <line x1="75" y1="36" x2="90" y2="36" stroke="#1e2330" strokeWidth="3"/>
        <Standing>
          <g transform="translate(50,32)">
            <line x1="-16" y1="0" x2="-30" y2="0" {...g}/>
            <animateTransform attributeName="transform" type="rotate" values="0 -16 0;-20 -16 0;0 -16 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>
          <g transform="translate(50,32)">
            <line x1="16" y1="0" x2="30" y2="0" {...g}/>
            <animateTransform attributeName="transform" type="rotate" values="0 16 0;20 16 0;0 16 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
          </g>
        </Standing>
      </svg>
    ),

    lunge: (
      <svg viewBox="0 0 110 130" width="100%" style={{maxHeight:190}}>
        <line x1="5" y1="118" x2="105" y2="118" stroke="#1e2330" strokeWidth="3"/>
        <Head cx={40}/>
        <line x1="40" y1="22" x2="40" y2="58" {...g}/>
        <line x1="40" y1="30" x2="20" y2="46" {...g}/>
        <line x1="40" y1="30" x2="60" y2="46" {...g}/>
        <g transform="translate(40,58)">
          <line x1="0" y1="0" x2="-12" y2="42" {...g}/>
          <line x1="-12" y1="42" x2="-10" y2="60" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="0;10;0" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
        <g transform="translate(40,58)">
          <line x1="0" y1="0" x2="30" y2="30" {...g}/>
          <line x1="30" y1="30" x2="30" y2="60" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="0;-15;0" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),

    abduct: (
      <svg viewBox="0 0 110 110" width="100%" style={{maxHeight:170}}>
        <rect x="25" y="45" width="60" height="45" rx="8" fill="#1e2330"/>
        <Head cx={55} cy={22}/>
        <line x1="55" y1="31" x2="55" y2="52" {...g}/>
        <line x1="55" y1="52" x2="30" y2="55" {...g}/>
        <line x1="55" y1="52" x2="80" y2="55" {...g}/>
        <g transform="translate(40,55)">
          <line x1="0" y1="0" x2="-5" y2="38" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="0;-18;0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
        <g transform="translate(70,55)">
          <line x1="0" y1="0" x2="5" y2="38" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="0;18;0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),

    plank: (
      <svg viewBox="0 0 120 80" width="100%" style={{maxHeight:140}}>
        <line x1="5" y1="70" x2="115" y2="70" stroke="#1e2330" strokeWidth="3"/>
        <Head cx={100} cy={44}/>
        <line x1="91" y1="44" x2="18" y2="44" {...g}/>
        <line x1="18" y1="44" x2="8" y2="68" {...g}/>
        <line x1="91" y1="44" x2="110" y2="68" {...g}/>
        <line x1="60" y1="44" x2="52" y2="68" {...g}/>
        <line x1="60" y1="44" x2="68" y2="68" {...g}/>
        <g>
          <ellipse cx="50" cy="40" rx="18" ry="4" fill={c} opacity="0.15">
            <animate attributeName="opacity" values="0.15;0.35;0.15" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="rx" values="18;22;18" dur="3s" repeatCount="indefinite"/>
          </ellipse>
        </g>
      </svg>
    ),

    crunch: (
      <svg viewBox="0 0 120 90" width="100%" style={{maxHeight:160}}>
        <line x1="5" y1="78" x2="115" y2="78" stroke="#1e2330" strokeWidth="3"/>
        <line x1="70" y1="55" x2="92" y2="78" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
        <line x1="70" y1="55" x2="94" y2="78" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
        <g>
          <Head cx={85} cy={52}/>
          <line x1="76" y1="52" x2="40" y2="52" {...g}/>
          <line x1="70" y1="52" x2="58" y2="42" {...g}/>
          <line x1="70" y1="52" x2="62" y2="40" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="0 70 52;-25 70 52;0 70 52" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),

    legraise: (
      <svg viewBox="0 0 100 130" width="100%" style={{maxHeight:190}}>
        <line x1="5" y1="8" x2="95" y2="8" stroke="#1e2330" strokeWidth="6" strokeLinecap="round"/>
        <Head cx={50} cy={44}/>
        <line x1="50" y1="53" x2="50" y2="78" {...g}/>
        <line x1="50" y1="65" x2="32" y2="80" {...g}/>
        <line x1="50" y1="65" x2="68" y2="80" {...g}/>
        <g transform="translate(44,15)">
          <line x1="0" y1="0" x2="0" y2="28" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="0;0;0" dur={dur} repeatCount="indefinite"/>
        </g>
        <g transform="translate(50,78)">
          <line x1="-8" y1="0" x2="-10" y2="40" {...g}/>
          <line x1="8" y1="0" x2="10" y2="40" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="0;-60;0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
        <g transform="translate(50,22)">
          <line x1="-18" y1="-14" x2="0" y2="0" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="25 0 0;0 0 0;25 0 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
        <g transform="translate(50,22)">
          <line x1="18" y1="-14" x2="0" y2="0" {...g}/>
          <animateTransform attributeName="transform" type="rotate" values="-25 0 0;0 0 0;-25 0 0" dur={dur} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </g>
      </svg>
    ),
  };

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:"100%", padding:"8px 0" }}>
      {anims[type] || anims.squat}
    </div>
  );
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

const toJpeg = (file) => new Promise((resolve) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const MAX = 900;
    let w = img.width, h = img.height;
    if (w > MAX || h > MAX) {
      if (w > h) { h = Math.round((h/w)*MAX); w = MAX; }
      else { w = Math.round((w/h)*MAX); h = MAX; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob || file); }, 'image/jpeg', 0.82);
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
  img.src = url;
});

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

const lsGet = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
const lsSet = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ─── MINI COMPONENTS ──────────────────────────────────────────────────────────

function CalRing({ cur, max }) {
  const r = 48, circ = 2 * Math.PI * r, pct = Math.min(cur / max, 1);
  const over = cur > max, color = over ? "#ef4444" : S.accent;
  return (
    <svg width="116" height="116" style={{ transform:"rotate(-90deg)", overflow:"visible" }}>
      <circle cx="58" cy="58" r={r} fill="none" stroke="#1a1d24" strokeWidth="11"/>
      <circle cx="58" cy="58" r={r} fill="none" stroke={color} strokeWidth="11"
        strokeDasharray={`${circ*pct} ${circ}`} strokeLinecap="round"
        style={{ filter: over ? "none" : "drop-shadow(0 0 7px #b5ff4777)" }}/>
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
        <div style={{ height:"100%", width:`${Math.min((cur/max)*100,100)}%`, background:color, borderRadius:99, transition:"width 0.5s" }}/>
      </div>
    </div>
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
  const [foodMode, setFoodMode] = useState("photo");
  const [searchQuery, setSearchQuery] = useState("");
  const [manual, setManual] = useState({ name:"", cal:"", pro:"", carb:"", fat:"", portion:"" });
  const [activeExercise, setActiveExercise] = useState(null); // {ex, workoutColor}

  const fileRef = useRef(null);
  const alrtRef = useRef(alrt);
  const notifiedRef = useRef({});

  useEffect(() => { alrtRef.current = alrt; }, [alrt]);

  useEffect(() => {
    const f = lsGet(`fd_${tk()}`); if(f) setFood(f);
    const c = lsGet(`ck_${tk()}`); if(c) setChecks(c);
    const w = lsGet("wlog"); if(w) setWlog(w);
    const a = lsGet("alrt"); if(a) setAlrt(a);
    if("Notification" in window) setNotifPerm(Notification.permission);

    const iv = setInterval(() => {
      if(Notification.permission !== "granted") return;
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      // Regular notifications
      Object.entries(alrtRef.current).forEach(([k, v]) => {
        const nk = `${tk()}_${k}`;
        if(v === time && NOTIF_MSGS[k] && !notifiedRef.current[nk]) {
          new Notification("⚡ FitPlan", { body: NOTIF_MSGS[k] });
          notifiedRef.current[nk] = true;
        }
      });
      // 11pm daily summary
      if(time === "23:00" && !notifiedRef.current[`${tk()}_summary`]) {
        const fc = lsGet(`fd_${tk()}`)||[];
        const cc = lsGet(`ck_${tk()}`)||{};
        const consumed = fc.reduce((s,e)=>s+e.cal,0);
        const burned = Object.keys(cc).filter(k=>cc[k]).reduce((s,k)=>s+(EX_CAL[k]||0),0);
        const net = consumed - burned;
        const deficit = 1900 - net;
        new Notification("📊 Resumen del día — FitPlan", {
          body: `Consumiste: ${consumed} kcal | Quemaste: ${burned} kcal | Neto: ${net} kcal | Déficit: ${deficit > 0 ? '+'+deficit : deficit} kcal`
        });
        notifiedRef.current[`${tk()}_summary`] = true;
      }
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const sf = v => { setFood(v); lsSet(`fd_${tk()}`, v); };
  const sc = v => { setChecks(v); lsSet(`ck_${tk()}`, v); };
  const swl = v => { setWlog(v); lsSet("wlog", v); };
  const sal = v => { setAlrt(v); lsSet("alrt", v); };

  const tCal  = food.reduce((s,e)=>s+e.cal,0);
  const tPro  = food.reduce((s,e)=>s+e.pro,0);
  const tCarb = food.reduce((s,e)=>s+e.carb,0);
  const tFat  = food.reduce((s,e)=>s+e.fat,0);
  const today   = new Date().getDay();
  const todW    = PLAN[today];
  const selW    = PLAN[selDay];
  const doneEx  = todW ? todW.ex.filter(e => checks[e.id]).length : 0;
  const totalEx = todW ? todW.ex.length : 0;
  const burnedCal = Object.keys(checks).filter(k => checks[k]).reduce((s,k) => s+(EX_CAL[k]||0), 0);
  const netCal  = tCal - burnedCal;
  const deficit = T.cal - netCal;
  const curW    = wlog.length > 0 ? wlog[wlog.length-1].w : SW;
  const lost    = +(SW - curW).toFixed(1);
  const tip     = TIPS[new Date().getDay() % TIPS.length];
  const hour    = new Date().getHours();

  const analyzePhoto = async file => {
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
        { type:"text", text:'Eres nutricionista experto. Analiza esta imagen de comida. Responde SOLO con JSON puro sin markdown ni backticks: {"name":"nombre en español","cal":número_kcal,"pro":gramos,"carb":gramos,"fat":gramos,"portion":"ej: 1 plato ~350g","notes":"nota breve"}' }
      ]}]);
      setPending({ ...p, img: URL.createObjectURL(file) });
    } catch(e) {
      alert("No se pudo analizar la foto. Verifica tu conexión.");
    } finally { setAnalyzing(false); }
  };

  const analyzeSearch = async () => {
    if(!searchQuery.trim()) return;
    setAnalyzing(true); setPending(null);
    try {
      const p = await callAI([{ role:"user",
        content:`Eres nutricionista experto. Estima los macros para: "${searchQuery}". Responde SOLO con JSON puro sin markdown: {"name":"nombre exacto en español","cal":número_kcal,"pro":gramos,"carb":gramos,"fat":gramos,"portion":"la porción consultada","notes":"nota breve"}`
      }]);
      setPending({ ...p, img: null });
    } catch(e) {
      alert("No se pudo estimar. Verifica tu conexión.");
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
      portion: portion||`${cal} kcal`, img:null,
      time:new Date().toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"}) };
    sf([...food, e]);
    setManual({ name:"", cal:"", pro:"", carb:"", fat:"", portion:"" });
  };

  const addWeight = () => {
    const v = parseFloat(wIn); if(!v||isNaN(v)) return;
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
      style={{ flex:1, padding:"10px 4px", borderRadius:14, border:"none", cursor:"pointer",
        fontFamily:"inherit", fontSize:12, fontWeight:600,
        background:foodMode===mode?S.accent:S.card2,
        color:foodMode===mode?"#090b0f":S.muted }}>
      {emoji} {label}
    </button>
  );

  // ─── EXERCISE MODAL ──────────────────────────────────────────────────────────

  const ExerciseModal = () => {
    if(!activeExercise) return null;
    const { ex, workoutColor } = activeExercise;
    const exCal = EX_CAL[ex.id] || 0;
    const isDone = !!checks[ex.id];
    return (
      <div onClick={()=>setActiveExercise(null)}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:50,
          display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
        <div onClick={e=>e.stopPropagation()}
          style={{ background:S.card, borderRadius:"24px 24px 0 0", padding:"24px 20px 36px",
            width:"100%", maxWidth:440, border:`1px solid ${S.border}` }}>
          <div style={{ width:40, height:4, background:S.border, borderRadius:99, margin:"0 auto 20px" }}/>
          <p style={{ color:S.text, fontWeight:800, fontSize:18, textAlign:"center", marginBottom:4 }}>{ex.name}</p>
          <p style={{ color:S.muted, fontSize:13, textAlign:"center", marginBottom:16 }}>{ex.sets}</p>
          <div style={{ background:S.card2, borderRadius:20, padding:"12px 8px", marginBottom:16,
            border:`1px solid ${workoutColor}22` }}>
            <ExerciseAnimation type={ex.anim} color={workoutColor}/>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            <div style={{ flex:1, background:S.card2, borderRadius:14, padding:"12px", textAlign:"center" }}>
              <div style={{ color:workoutColor, fontWeight:700, fontSize:18 }}>{ex.sets}</div>
              <div style={{ color:S.muted, fontSize:11, marginTop:2 }}>Series × Reps</div>
            </div>
            <div style={{ flex:1, background:S.card2, borderRadius:14, padding:"12px", textAlign:"center" }}>
              <div style={{ color:S.orange, fontWeight:700, fontSize:18 }}>~{exCal}</div>
              <div style={{ color:S.muted, fontSize:11, marginTop:2 }}>kcal quemadas</div>
            </div>
          </div>
          {selDay === today && (
            <button onClick={()=>{ sc({...checks,[ex.id]:!checks[ex.id]}); setActiveExercise(null); }}
              style={{ width:"100%", background:isDone?"#1e2330":workoutColor,
                color:isDone?S.text:"#090b0f", fontWeight:700, border:"none",
                borderRadius:16, padding:"16px", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
              {isDone ? "↩ Marcar como pendiente" : "✓ Marcar como completado"}
            </button>
          )}
        </div>
      </div>
    );
  };

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

      {/* Calories ring */}
      <div style={{ ...card, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ position:"relative", flexShrink:0 }}>
          <CalRing cur={netCal} max={T.cal}/>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <span style={{ color:S.text, fontWeight:800, fontSize:20, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{netCal}</span>
            <span style={{ color:S.muted, fontSize:9, lineHeight:1, marginTop:2 }}>/{T.cal} kcal</span>
            <span style={{ color:netCal>T.cal?"#ef4444":S.accent, fontSize:9, marginTop:2, fontWeight:600 }}>
              {netCal>T.cal ? "¡sobre límite!" : `${T.cal-netCal} restantes`}
            </span>
          </div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ color:S.soft, fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>Balance de hoy</p>
          <MBar label="Proteína" cur={tPro} max={T.pro} color={S.accent}/>
          <MBar label="Carbohidratos" cur={tCarb} max={T.carb} color="#60a5fa"/>
          <MBar label="Grasa" cur={tFat} max={T.fat} color={S.orange}/>
        </div>
      </div>

      {/* Calorie balance detail */}
      <div style={{ ...card }}>
        <p style={{ color:S.soft, fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>Balance calórico</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            {l:"Consumido",v:tCal,c:S.orange,icon:"🍽️"},
            {l:"Quemado",v:burnedCal,c:"#60a5fa",icon:"🔥"},
            {l:"Déficit",v:deficit,c:deficit>0?S.accent:"#ef4444",icon:"⚡"},
          ].map(({l,v,c,icon})=>(
            <div key={l} style={{ background:S.card2, borderRadius:14, padding:"10px 6px", textAlign:"center" }}>
              <div style={{ fontSize:16, marginBottom:3 }}>{icon}</div>
              <div style={{ fontWeight:800, fontSize:15, color:c, fontVariantNumeric:"tabular-nums" }}>{v>0&&l==="Déficit"?"+":""}{v}</div>
              <div style={{ fontSize:10, color:S.muted, marginTop:2 }}>{l} kcal</div>
            </div>
          ))}
        </div>
      </div>

      {/* Today workout */}
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ color:S.text, fontWeight:600, fontSize:14 }}>Entrenamiento de hoy</span>
          {todW && <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99, background:todW.color+"22", color:todW.color }}>{todW.name}</span>}
        </div>
        {todW ? (
          <>
            <p style={{ color:S.muted, fontSize:12, marginBottom:10 }}>{todW.muscles}</p>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <div style={{ flex:1, height:6, background:S.card2, borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${totalEx>0?(doneEx/totalEx)*100:0}%`, background:S.accent, borderRadius:99, transition:"width 0.5s" }}/>
              </div>
              <span style={{ color:S.text, fontWeight:700, fontSize:14, fontVariantNumeric:"tabular-nums" }}>{doneEx}/{totalEx}</span>
            </div>
            {burnedCal > 0 && <p style={{ color:"#60a5fa", fontSize:12, fontWeight:600 }}>🔥 {burnedCal} kcal quemadas en el gym</p>}
            {doneEx===totalEx && totalEx>0 && <p style={{ color:S.accent, fontSize:12, fontWeight:600, marginTop:4 }}>🏆 ¡Rutina completada!</p>}
          </>
        ) : <p style={{ color:S.muted, fontSize:13 }}>😴 Día de descanso — Recarga energías.</p>}
      </div>

      {/* Weight */}
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
            background:"linear-gradient(90deg, #5eead4, #b5ff47)", borderRadius:99 }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:S.muted }}>
          <span>{SW} kg</span>
          <span style={{ color:S.accent, fontWeight:600 }}>{Math.round((lost/18)*100)}% del objetivo</span>
          <span>{GW} kg</span>
        </div>
      </div>

      {/* Daily summary after 8pm */}
      {hour >= 20 && (
        <div style={{ ...card, background:"#0d1f0d", border:`1px solid ${S.accent}44` }}>
          <p style={{ color:S.accent, fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>📊 Resumen del día</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              {l:"Ingerido",v:`${tCal} kcal`,c:S.orange},
              {l:"Quemado gym",v:`${burnedCal} kcal`,c:"#60a5fa"},
              {l:"Neto",v:`${netCal} kcal`,c:S.text},
              {l:"Déficit logrado",v:`${deficit > 0 ? '+'+deficit : deficit} kcal`,c:deficit>0?S.accent:"#ef4444"},
            ].map(({l,v,c})=>(
              <div key={l} style={{ background:S.card2, borderRadius:12, padding:"10px" }}>
                <div style={{ color:c, fontWeight:700, fontSize:14, fontVariantNumeric:"tabular-nums" }}>{v}</div>
                <div style={{ color:S.muted, fontSize:10, marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ color:S.muted, fontSize:13 }}>Calorías netas</span>
          <span style={{ fontWeight:700, fontSize:13, color:netCal>T.cal?"#ef4444":S.accent, fontVariantNumeric:"tabular-nums" }}>
            {netCal} / {T.cal} kcal
          </span>
        </div>
        <div style={{ height:8, background:S.card2, borderRadius:99, overflow:"hidden", marginBottom:8 }}>
          <div style={{ height:"100%", width:`${Math.min((netCal/T.cal)*100,100)}%`,
            background:netCal>T.cal?"#ef4444":S.accent, borderRadius:99 }}/>
        </div>
        {burnedCal > 0 && (
          <p style={{ color:"#60a5fa", fontSize:11, marginBottom:10 }}>
            🔥 {tCal} consumidas − {burnedCal} quemadas = {netCal} kcal netas
          </p>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[["Prot.",tPro,T.pro,S.accent],["Carbs",tCarb,T.carb,"#60a5fa"],["Grasa",tFat,T.fat,S.orange]].map(([l,v,m,c])=>(
            <div key={l} style={{ background:S.card2, borderRadius:12, padding:"8px 4px", textAlign:"center" }}>
              <div style={{ fontWeight:700, fontSize:15, color:c, fontVariantNumeric:"tabular-nums" }}>{Math.round(v)}g</div>
              <div style={{ fontSize:10, color:S.muted }}>{l}/{m}g</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:8 }}>
        {modeBtn("photo","Foto","📸")}
        {modeBtn("search","Buscar","🔍")}
        {modeBtn("manual","Manual","✏️")}
      </div>

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
            <button onClick={confirmFood} style={{ flex:1, background:S.accent, color:"#090b0f", fontWeight:700, border:"none", borderRadius:14, padding:"13px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>✅ Agregar</button>
            <button onClick={()=>setPending(null)} style={{ flex:1, background:S.card2, color:S.text, border:"none", borderRadius:14, padding:"13px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>❌ Cancelar</button>
          </div>
        </div>
      )}

      {foodMode === "photo" && !pending && (
        <>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }}
            onChange={e => { if(e.target.files[0]) analyzePhoto(e.target.files[0]); }}/>
          {analyzing ? (
            <div style={{ ...card, textAlign:"center", padding:"36px 16px" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
              <p style={{ color:S.text, fontWeight:600, fontSize:15, margin:0 }}>Analizando tu comida...</p>
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

      {foodMode === "search" && !pending && (
        <div style={card}>
          <p style={{ color:S.text, fontWeight:600, fontSize:14, marginBottom:8 }}>🔍 Buscar por nombre y peso</p>
          <p style={{ color:S.muted, fontSize:12, marginBottom:12, lineHeight:1.5 }}>Ej: "200g arroz blanco cocinado" o "1 pechuga a la plancha"</p>
          <textarea value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
            placeholder="Escribe el alimento con la cantidad..." rows={3}
            style={{ background:S.card2, border:`1px solid ${S.border}`, color:S.text, borderRadius:14,
              padding:"12px 14px", fontSize:14, outline:"none", fontFamily:"inherit", width:"100%", resize:"none", lineHeight:1.5 }}/>
          {analyzing ? (
            <div style={{ textAlign:"center", padding:"16px 0" }}>
              <p style={{ color:S.muted, fontSize:13 }}>Consultando a Claude AI...</p>
            </div>
          ) : (
            <button onClick={analyzeSearch} disabled={!searchQuery.trim()}
              style={{ marginTop:10, width:"100%", background:searchQuery.trim()?S.accent:"#1e2330",
                color:searchQuery.trim()?"#090b0f":S.muted, fontWeight:700, border:"none",
                borderRadius:14, padding:"13px", fontSize:14, cursor:searchQuery.trim()?"pointer":"not-allowed", fontFamily:"inherit" }}>
              Calcular macros →
            </button>
          )}
        </div>
      )}

      {foodMode === "manual" && (
        <div style={card}>
          <p style={{ color:S.text, fontWeight:600, fontSize:14, marginBottom:14 }}>✏️ Ingreso manual</p>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <input placeholder="Nombre del alimento *" value={manual.name} onChange={e=>setManual({...manual,name:e.target.value})}
              style={{ background:S.card2, border:`1px solid ${S.border}`, color:S.text, borderRadius:14, padding:"12px 14px", fontSize:14, outline:"none", fontFamily:"inherit" }}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <p style={{ color:S.muted, fontSize:11, marginBottom:4 }}>Calorías (kcal) *</p>
                <input type="number" inputMode="numeric" placeholder="Ej: 350" value={manual.cal} onChange={e=>setManual({...manual,cal:e.target.value})}
                  style={{ background:S.card2, border:`1px solid ${S.border}`, color:S.text, borderRadius:14, padding:"12px 14px", fontSize:14, outline:"none", fontFamily:"inherit", width:"100%" }}/>
              </div>
              <div>
                <p style={{ color:S.muted, fontSize:11, marginBottom:4 }}>Porción / peso</p>
                <input placeholder="Ej: 200g" value={manual.portion} onChange={e=>setManual({...manual,portion:e.target.value})}
                  style={{ background:S.card2, border:`1px solid ${S.border}`, color:S.text, borderRadius:14, padding:"12px 14px", fontSize:14, outline:"none", fontFamily:"inherit", width:"100%" }}/>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[["Proteína (g)","pro",S.accent],["Carbos (g)","carb","#60a5fa"],["Grasa (g)","fat",S.orange]].map(([label,key,color])=>(
                <div key={key}>
                  <p style={{ color, fontSize:11, marginBottom:4 }}>{label}</p>
                  <input type="number" inputMode="decimal" placeholder="0" value={manual[key]}
                    onChange={e=>setManual({...manual,[key]:e.target.value})}
                    style={{ background:S.card2, border:`1px solid ${color}44`, color:S.text, borderRadius:12,
                      padding:"10px 8px", fontSize:14, outline:"none", fontFamily:"inherit", width:"100%", textAlign:"center" }}/>
                </div>
              ))}
            </div>
            <button onClick={addManual} disabled={!manual.name||!manual.cal}
              style={{ background:manual.name&&manual.cal?S.accent:"#1e2330", color:manual.name&&manual.cal?"#090b0f":S.muted,
                fontWeight:700, border:"none", borderRadius:14, padding:"13px", fontSize:14,
                cursor:manual.name&&manual.cal?"pointer":"not-allowed", fontFamily:"inherit", marginTop:4 }}>
              ➕ Agregar al log del día
            </button>
          </div>
        </div>
      )}

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
                borderRadius:14, border:"none", cursor:"pointer", fontFamily:"inherit",
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
                  <div style={{ color:selW.color, fontWeight:800, fontSize:22, fontVariantNumeric:"tabular-nums" }}>{doneEx}/{totalEx}</div>
                  <div style={{ color:S.muted, fontSize:10 }}>ejercicios</div>
                </div>
              )}
            </div>
            {selDay===today && totalEx>0 && (
              <>
                <div style={{ height:6, background:S.card2, borderRadius:99, overflow:"hidden", marginTop:12 }}>
                  <div style={{ height:"100%", width:`${(doneEx/totalEx)*100}%`, background:selW.color, borderRadius:99 }}/>
                </div>
                {burnedCal > 0 && <p style={{ color:"#60a5fa", fontSize:12, marginTop:8, fontWeight:600 }}>🔥 {burnedCal} kcal quemadas</p>}
              </>
            )}
          </div>

          <p style={{ color:S.muted, fontSize:11, margin:"0 0 -6px" }}>Toca un ejercicio para ver la animación</p>

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {selW.ex.map((ex, idx) => {
              const isDone = selDay===today ? !!checks[ex.id] : false;
              const exCal = EX_CAL[ex.id] || 0;
              return (
                <div key={ex.id} onClick={()=>setActiveExercise({ex, workoutColor:selW.color})}
                  style={{ ...card, display:"flex", alignItems:"center", gap:12, padding:"13px 14px",
                    opacity:isDone?0.55:1, cursor:"pointer", transition:"opacity 0.2s" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                    background:isDone?"#16a34a22":selW.color+"20", color:isDone?S.accent:selW.color,
                    fontWeight:700, fontSize:13, flexShrink:0 }}>
                    {isDone ? "✓" : idx+1}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:isDone?S.muted:S.text, fontSize:13, fontWeight:600, margin:0,
                      textDecoration:isDone?"line-through":"none" }}>{ex.name}</p>
                    <p style={{ color:S.muted, fontSize:11, marginTop:3 }}>{ex.sets} · <span style={{ color:"#60a5fa" }}>~{exCal} kcal</span></p>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
                    <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${isDone?S.accent:S.muted}`,
                      background:isDone?S.accent:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {isDone && <span style={{ color:"#090b0f", fontSize:10, fontWeight:900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:14 }}>▶</span>
                  </div>
                </div>
              );
            })}
          </div>

          {selDay===today && doneEx===totalEx && totalEx>0 && (
            <div style={{ background:"#052e16", border:"1px solid #16a34a", borderRadius:20, padding:"28px 16px", textAlign:"center" }}>
              <div style={{ fontSize:44, marginBottom:10 }}>🏆</div>
              <p style={{ color:S.accent, fontWeight:800, fontSize:18, margin:0 }}>¡Rutina completada!</p>
              <p style={{ color:"#60a5fa", fontSize:14, marginTop:8, fontWeight:600 }}>🔥 {burnedCal} kcal quemadas hoy</p>
            </div>
          )}
        </>
      ) : (
        <div style={{ ...card, padding:"52px 16px", textAlign:"center" }}>
          <div style={{ fontSize:52, marginBottom:12 }}>😴</div>
          <p style={{ color:S.text, fontWeight:800, fontSize:18, margin:0 }}>Día de descanso</p>
          <p style={{ color:S.muted, fontSize:13, marginTop:8 }}>El músculo crece mientras recuperas.</p>
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
            background:"linear-gradient(90deg, #5eead4, #b5ff47)", borderRadius:99 }}/>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2330"/>
              <XAxis dataKey="date" tick={{fill:"#4b5563",fontSize:9}} tickLine={false} axisLine={false}/>
              <YAxis domain={["auto","auto"]} tick={{fill:"#4b5563",fontSize:9}} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{background:"#0d0f14",border:`1px solid ${S.border}`,borderRadius:10,fontSize:12}} labelStyle={{color:S.muted}} itemStyle={{color:S.orange}}/>
              <ReferenceLine y={GW} stroke={S.accent} strokeDasharray="5 5"/>
              <Line type="monotone" dataKey="peso" stroke={S.orange} strokeWidth={2.5} dot={{fill:S.orange,r:3,strokeWidth:0}} name="kg"/>
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
              padding:"12px 16px", fontSize:14, outline:"none", fontVariantNumeric:"tabular-nums", fontFamily:"inherit" }}/>
          <span style={{ background:S.card2, border:`1px solid ${S.border}`, borderRadius:14, padding:"0 14px",
            display:"flex", alignItems:"center", color:S.muted, fontSize:13 }}>kg</span>
          <button onClick={addWeight}
            style={{ background:S.accent, color:"#090b0f", fontWeight:700, border:"none", borderRadius:14,
              padding:"12px 18px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Guardar</button>
        </div>
      </div>
      <div style={card}>
        <p style={{ color:S.text, fontWeight:600, fontSize:14, marginBottom:12 }}>Historial</p>
        {wlog.length === 0 ? (
          <p style={{ color:S.muted, fontSize:13, textAlign:"center", padding:"16px 0", margin:0 }}>Sin registros aún</p>
        ) : (
          <div style={{ maxHeight:220, overflowY:"auto" }}>
            {[...wlog].reverse().map((w,i,arr) => {
              const prev = arr[i+1];
              const diff = prev ? +(w.w-prev.w).toFixed(1) : null;
              return (
                <div key={w.date} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"10px 0", borderBottom:`1px solid ${S.border}` }}>
                  <span style={{ color:S.soft, fontSize:13 }}>
                    {new Date(w.date+"T12:00").toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"2-digit"})}
                  </span>
                  <span style={{ color:S.text, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{w.w} kg</span>
                  {diff!==null && (
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
          <p style={{ color:S.muted, fontSize:12, lineHeight:1.5, margin:"0 0 14px" }}>Actívalas para recibir recordatorios y el resumen de las 11pm.</p>
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
            <p style={{ color:S.muted, fontSize:11, marginTop:2 }}>Recibirás alertas + resumen a las 11pm</p>
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
                borderRadius:12, padding:"8px 12px", fontSize:13, outline:"none", fontFamily:"inherit" }}/>
          </div>
        ))}
        <div style={{ background:S.accentDim, border:`1px solid ${S.accent}33`, borderRadius:14, padding:"12px 14px" }}>
          <p style={{ color:S.accent, fontWeight:600, fontSize:12, margin:"0 0 4px" }}>📊 Resumen diario a las 11:00 PM</p>
          <p style={{ color:S.muted, fontSize:11, margin:0 }}>Recibirás automáticamente: calorías consumidas, quemadas, netas y déficit del día.</p>
        </div>
      </div>
      <div style={card}>
        <p style={{ color:S.text, fontWeight:600, fontSize:14, marginBottom:12 }}>🧪 Probar alertas</p>
        {[
          {msg:"💪 ¡A entrenar! La disciplina es libertad.",l:"Probar alerta de entrenamiento"},
          {msg:"🍽️ ¡Hora de comer! No olvides la proteína.",l:"Probar alerta de comida"},
          {msg:`📊 Resumen: ${tCal} consumidas, ${burnedCal} quemadas, déficit: ${deficit} kcal`,l:"Probar resumen del día"},
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
          {t:"23:00",a:"📊 Resumen del día",d:"Notificación automática con tu déficit"},
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
        backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", padding:"6px 8px 8px" }}>
        <div style={{ display:"flex", justifyContent:"space-around" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={()=>setTab(n.id)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                padding:"6px 12px", borderRadius:14, border:"none", cursor:"pointer",
                background:tab===n.id?S.accentDim:"transparent",
                color:tab===n.id?S.accent:S.muted, fontFamily:"inherit" }}>
              <span style={{ fontSize:20, lineHeight:1 }}>{n.icon}</span>
              <span style={{ fontSize:10, fontWeight:tab===n.id?700:500, lineHeight:1 }}>{n.l}</span>
            </button>
          ))}
        </div>
      </div>

      <ExerciseModal/>
    </div>
  );
}
