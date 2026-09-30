import { useEffect, useRef } from "react";

// 8 animation types → all exercises map to one of these
export const ANIM_MAP = {
  // BENCH (horizontal push)
  bench: "bench",
  // OVERHEAD (vertical press + laterals)
  overhead: "overhead", raise: "overhead",
  // PULL (rows, pulldowns, pullups)
  pull: "pull", pulldown: "pull", row: "pull", pullup: "pull", facepull: "pull", pullover: "pull",
  // HINGE (deadlift pattern)
  hinge: "hinge",
  // SQUAT (squat pattern)
  squat: "squat", legpress: "squat", lunge: "squat",
  // ISOLATION (arms, flies, abduction)
  curl: "isolation", tricep: "isolation", fly: "isolation", dip: "isolation", abduct: "isolation",
  // LEGS (seated/lying leg work)
  legext: "legs", legcurl: "legs", thrust: "legs", calf: "legs",
  // CORE
  plank: "core", crunch: "core", legraise: "core",
};

export default function ExerciseAnimation({ type, color = "#b5ff47" }) {
  const resolvedType = ANIM_MAP[type] || "squat";
  const c = color;

  // Palette
  const B  = "#2a3550";  // body
  const BL = "#324060";  // body lighter (front limbs)
  const E  = "#101828";  // equipment
  const EL = "#182232";  // equipment lighter
  const J  = "#1e2d43";  // joint

  const glow = `drop-shadow(0 0 10px ${c}) drop-shadow(0 0 4px ${c})`;
  const softGlow = `drop-shadow(0 0 6px ${c})`;

  const css = (id, rules) => `<style id="${id}">${rules}</style>`;

  /* ─── 1. BENCH PRESS ─────────────────────────────────────────────────────── */
  if (resolvedType === "bench") return (
    <svg viewBox="0 0 260 150" width="100%" style={{ overflow:"visible", maxHeight:200 }}>
      <defs>
        <filter id="glow-b"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="chest-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c} stopOpacity="0.9"/>
          <stop offset="100%" stopColor={c} stopOpacity="0.1"/>
        </radialGradient>
      </defs>

      {/* Rack posts */}
      <rect x="46" y="22" width="10" height="95" rx="5" fill={E}/>
      <rect x="200" y="22" width="10" height="95" rx="5" fill={E}/>
      {/* Rack crossbars */}
      <rect x="42" y="22" width="18" height="10" rx="5" fill={EL}/>
      <rect x="196" y="22" width="18" height="10" rx="5" fill={EL}/>
      {/* Bar */}
      <rect x="8" y="28" width="244" height="9" rx="4.5" fill={EL}/>
      {/* Weight plates */}
      <rect x="8" y="20" width="16" height="25" rx="4" fill={E}/>
      <rect x="236" y="20" width="16" height="25" rx="4" fill={E}/>
      {/* Bench legs */}
      <rect x="68" y="100" width="8" height="38" rx="4" fill={E}/>
      <rect x="184" y="100" width="8" height="38" rx="4" fill={E}/>
      {/* Bench pad */}
      <rect x="58" y="88" width="144" height="14" rx="7" fill={EL}/>
      <rect x="62" y="86" width="136" height="8" rx="4" fill={B}/>

      {/* PERSON */}
      {/* Head */}
      <ellipse cx="210" cy="79" rx="17" ry="17" fill={B}/>
      <ellipse cx="210" cy="76" rx="13" ry="12" fill={J}/>
      {/* Torso */}
      <rect x="82" y="64" width="110" height="28" rx="14" fill={B}/>
      {/* Chest muscle highlight */}
      <ellipse cx="137" cy="78" rx="40" ry="13" fill="url(#chest-grad)" filter="url(#glow-b)" opacity="0.0">
        <animate attributeName="opacity" values="0.0;0.9;0.9;0.0" dur="2s" repeatCount="indefinite" keyTimes="0;0.4;0.6;1" calcMode="spline" keySplines="0.4 0 0.6 1;0 0 1 1;0.4 0 0.6 1"/>
      </ellipse>
      {/* Legs */}
      <rect x="44" y="70" width="48" height="18" rx="9" fill={B}/>
      <rect x="34" y="60" width="16" height="32" rx="8" fill={BL}/>

      {/* LEFT ARM — pivot at shoulder (99, 64) */}
      <g>
        <rect x="92" y="24" width="16" height="42" rx="8" fill={BL}/>
        <animateTransform attributeName="transform" type="rotate"
          values="-34 100 65; 0 100 65; -34 100 65"
          dur="2s" repeatCount="indefinite" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      </g>
      {/* RIGHT ARM — pivot at shoulder (163, 64) */}
      <g>
        <rect x="154" y="24" width="16" height="42" rx="8" fill={BL}/>
        <animateTransform attributeName="transform" type="rotate"
          values="34 162 65; 0 162 65; 34 162 65"
          dur="2s" repeatCount="indefinite" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      </g>

      {/* Label */}
      <text x="130" y="144" textAnchor="middle" fill={c} fontSize="11" fontWeight="700" fontFamily="sans-serif" opacity="0.8">PECTORAL · TRÍCEPS</text>
    </svg>
  );

  /* ─── 2. OVERHEAD PRESS ──────────────────────────────────────────────────── */
  if (resolvedType === "overhead") return (
    <svg viewBox="0 0 200 270" width="100%" style={{ overflow:"visible", maxHeight:240 }}>
      <defs>
        <filter id="glow-o"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="delt-l" cx="0%" cy="50%" r="100%"><stop offset="0%" stopColor={c} stopOpacity="0.9"/><stop offset="100%" stopColor={c} stopOpacity="0"/></radialGradient>
        <radialGradient id="delt-r" cx="100%" cy="50%" r="100%"><stop offset="0%" stopColor={c} stopOpacity="0.9"/><stop offset="100%" stopColor={c} stopOpacity="0"/></radialGradient>
      </defs>

      {/* BAR (animates up) */}
      <g>
        <rect x="12" y="92" width="176" height="9" rx="4.5" fill={EL}/>
        <rect x="12" y="84" width="20" height="24" rx="5" fill={E}/>
        <rect x="168" y="84" width="20" height="24" rx="5" fill={E}/>
        <animateTransform attributeName="transform" type="translate"
          values="0,0; 0,-62; 0,0" dur="2.2s" repeatCount="indefinite" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      </g>

      {/* BODY — static */}
      {/* Head */}
      <ellipse cx="100" cy="30" rx="18" ry="20" fill={B}/>
      <ellipse cx="100" cy="28" rx="14" ry="14" fill={J}/>
      {/* Neck */}
      <rect x="92" y="48" width="16" height="12" rx="6" fill={B}/>
      {/* Torso */}
      <path d="M 74,60 Q 60,90 68,140 H 132 Q 140,90 126,60 Z" fill={B}/>
      {/* Shoulder glow */}
      <ellipse cx="68" cy="72" rx="16" ry="10" fill="url(#delt-l)" filter="url(#glow-o)" opacity="0">
        <animate attributeName="opacity" values="0;0.9;0;0" dur="2.2s" repeatCount="indefinite" keyTimes="0;0.5;0.7;1"/>
      </ellipse>
      <ellipse cx="132" cy="72" rx="16" ry="10" fill="url(#delt-r)" filter="url(#glow-o)" opacity="0">
        <animate attributeName="opacity" values="0;0.9;0;0" dur="2.2s" repeatCount="indefinite" keyTimes="0;0.5;0.7;1"/>
      </ellipse>
      {/* Legs */}
      <rect x="70" y="140" width="24" height="48" rx="12" fill={B}/>
      <rect x="70" y="188" width="22" height="40" rx="11" fill={BL}/>
      <rect x="106" y="140" width="24" height="48" rx="12" fill={B}/>
      <rect x="106" y="188" width="22" height="40" rx="11" fill={BL}/>

      {/* LEFT ARM — pivots at shoulder, follows bar */}
      <g>
        <rect x="46" y="62" width="15" height="44" rx="7" fill={BL}/>
        <rect x="46" y="104" width="13" height="36" rx="6" fill={B}/>
        <animateTransform attributeName="transform" type="rotate"
          values="0 53 62; -38 53 62; 0 53 62" dur="2.2s" repeatCount="indefinite" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      </g>
      {/* RIGHT ARM */}
      <g>
        <rect x="139" y="62" width="15" height="44" rx="7" fill={BL}/>
        <rect x="141" y="104" width="13" height="36" rx="6" fill={B}/>
        <animateTransform attributeName="transform" type="rotate"
          values="0 147 62; 38 147 62; 0 147 62" dur="2.2s" repeatCount="indefinite" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      </g>

      <text x="100" y="262" textAnchor="middle" fill={c} fontSize="11" fontWeight="700" fontFamily="sans-serif" opacity="0.8">DELTOIDES · HOMBROS</text>
    </svg>
  );

  /* ─── 3. PULL (rows, pulldowns, pullups) ─────────────────────────────────── */
  if (resolvedType === "pull") return (
    <svg viewBox="0 0 200 270" width="100%" style={{ overflow:"visible", maxHeight:240 }}>
      <defs>
        <filter id="glow-p"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="lat-l" cx="0%" cy="50%" r="100%"><stop offset="0%" stopColor={c} stopOpacity="0.9"/><stop offset="100%" stopColor={c} stopOpacity="0"/></radialGradient>
        <radialGradient id="lat-r" cx="100%" cy="50%" r="100%"><stop offset="0%" stopColor={c} stopOpacity="0.9"/><stop offset="100%" stopColor={c} stopOpacity="0"/></radialGradient>
      </defs>

      {/* Cable machine */}
      <rect x="88" y="8" width="24" height="6" rx="3" fill={EL}/>
      <line x1="100" y1="14" x2="100" y2="95" stroke={EL} strokeWidth="3"/>
      <rect x="78" y="92" width="44" height="10" rx="5" fill={EL}/>

      {/* SEAT */}
      <rect x="65" y="190" width="70" height="12" rx="6" fill={EL}/>
      <rect x="85" y="202" width="30" height="52" rx="6" fill={E}/>

      {/* BODY */}
      <ellipse cx="100" cy="58" rx="18" ry="19" fill={B}/>
      <ellipse cx="100" cy="56" rx="14" ry="13" fill={J}/>
      <rect x="92" y="75" width="16" height="10" rx="5" fill={B}/>
      <path d="M 74,85 Q 60,115 68,165 H 132 Q 140,115 126,85 Z" fill={B}/>

      {/* LAT glow sides of torso */}
      <ellipse cx="68" cy="125" rx="14" ry="28" fill="url(#lat-l)" filter="url(#glow-p)" opacity="0">
        <animate attributeName="opacity" values="0;0.9;0;0" dur="2s" repeatCount="indefinite" keyTimes="0;0.5;0.75;1"/>
      </ellipse>
      <ellipse cx="132" cy="125" rx="14" ry="28" fill="url(#lat-r)" filter="url(#glow-p)" opacity="0">
        <animate attributeName="opacity" values="0;0.9;0;0" dur="2s" repeatCount="indefinite" keyTimes="0;0.5;0.75;1"/>
      </ellipse>

      {/* Legs (seated) */}
      <rect x="68" y="168" width="26" height="24" rx="10" fill={B}/>
      <rect x="106" y="168" width="26" height="24" rx="10" fill={B}/>

      {/* LEFT ARM — rotates from extended overhead to pulled down */}
      <g>
        <rect x="48" y="58" width="14" height="42" rx="7" fill={BL}/>
        <rect x="50" y="98" width="12" height="34" rx="6" fill={B}/>
        <animateTransform attributeName="transform" type="rotate"
          values="-55 55 82; 0 55 82; -55 55 82" dur="2s" repeatCount="indefinite" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      </g>
      {/* RIGHT ARM */}
      <g>
        <rect x="138" y="58" width="14" height="42" rx="7" fill={BL}/>
        <rect x="138" y="98" width="12" height="34" rx="6" fill={B}/>
        <animateTransform attributeName="transform" type="rotate"
          values="55 145 82; 0 145 82; 55 145 82" dur="2s" repeatCount="indefinite" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      </g>

      <text x="100" y="262" textAnchor="middle" fill={c} fontSize="11" fontWeight="700" fontFamily="sans-serif" opacity="0.8">DORSALES · ESPALDA</text>
    </svg>
  );

  /* ─── 4. HINGE (deadlift) ────────────────────────────────────────────────── */
  if (resolvedType === "hinge") return (
    <svg viewBox="0 0 200 270" width="100%" style={{ overflow:"visible", maxHeight:240 }}>
      <defs>
        <filter id="glow-h"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      {/* Floor */}
      <rect x="10" y="245" width="180" height="8" rx="4" fill={E}/>
      {/* Bar */}
      <rect x="10" y="218" width="180" height="10" rx="5" fill={EL}/>
      <rect x="10" y="210" width="22" height="26" rx="5" fill={E}/>
      <rect x="168" y="210" width="22" height="26" rx="5" fill={E}/>

      {/* Hamstring glow (shows when bending) */}
      <g>
        <ellipse cx="100" cy="198" rx="22" ry="34" fill={c} opacity="0" filter="url(#glow-h)" style={{ transformOrigin:"100px 198px" }}>
          <animate attributeName="opacity" values="0.8;0;0.8" dur="2.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </ellipse>
      </g>

      {/* Full body group — rotates at hips to simulate hinge */}
      <g>
        {/* UPPER BODY subgroup — pivots at hips (100,185) */}
        <g>
          {/* Torso */}
          <path d="M 82,95 Q 70,130 78,185 H 122 Q 130,130 118,95 Z" fill={B}/>
          {/* Head */}
          <ellipse cx="100" cy="75" rx="18" ry="20" fill={B}/>
          <ellipse cx="100" cy="73" rx="14" ry="14" fill={J}/>
          {/* Neck */}
          <rect x="92" y="93" width="16" height="10" rx="5" fill={B}/>
          {/* LEFT ARM — hangs down */}
          <rect x="64" y="108" width="14" height="40" rx="7" fill={BL}/>
          <rect x="64" y="146" width="12" height="36" rx="6" fill={B}/>
          {/* RIGHT ARM */}
          <rect x="122" y="108" width="14" height="40" rx="7" fill={BL}/>
          <rect x="124" y="146" width="12" height="36" rx="6" fill={B}/>
          {/* Hinge: whole upper body rotates */}
          <animateTransform attributeName="transform" type="rotate"
            values="0 100 185; -48 100 185; 0 100 185" dur="2.5s" repeatCount="indefinite" calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
        </g>

        {/* LEGS — static */}
        {/* Thigh L */}
        <rect x="74" y="185" width="22" height="44" rx="11" fill={B}/>
        <rect x="74" y="229" width="20" height="10" rx="5" fill={B}/>
        {/* Thigh R */}
        <rect x="104" y="185" width="22" height="44" rx="11" fill={B}/>
        <rect x="106" y="229" width="20" height="10" rx="5" fill={B}/>
      </g>

      <text x="100" y="262" textAnchor="middle" fill={c} fontSize="11" fontWeight="700" fontFamily="sans-serif" opacity="0.8">ISQUIOTIBIALES · GLÚTEOS</text>
    </svg>
  );

  /* ─── 5. SQUAT ───────────────────────────────────────────────────────────── */
  if (resolvedType === "squat") return (
    <svg viewBox="0 0 200 270" width="100%" style={{ overflow:"visible", maxHeight:240 }}>
      <defs>
        <filter id="glow-s"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="quad-l" cx="50%" cy="30%" r="80%"><stop offset="0%" stopColor={c} stopOpacity="0.85"/><stop offset="100%" stopColor={c} stopOpacity="0"/></radialGradient>
        <radialGradient id="quad-r" cx="50%" cy="30%" r="80%"><stop offset="0%" stopColor={c} stopOpacity="0.85"/><stop offset="100%" stopColor={c} stopOpacity="0"/></radialGradient>
      </defs>

      {/* Squat rack */}
      <rect x="18" y="20" width="8" height="200" rx="4" fill={E}/>
      <rect x="174" y="20" width="8" height="200" rx="4" fill={E}/>
      <rect x="14" y="62" width="16" height="10" rx="4" fill={EL}/>
      <rect x="170" y="62" width="16" height="10" rx="4" fill={EL}/>

      {/* Floor */}
      <rect x="10" y="245" width="180" height="8" rx="4" fill={E}/>

      {/* Whole body goes down/up */}
      <g>
        {/* Bar across shoulders */}
        <rect x="22" y="62" width="156" height="8" rx="4" fill={EL}/>
        <rect x="22" y="54" width="20" height="22" rx="4" fill={E}/>
        <rect x="158" y="54" width="20" height="22" rx="4" fill={E}/>

        {/* HEAD */}
        <ellipse cx="100" cy="36" rx="18" ry="19" fill={B}/>
        <ellipse cx="100" cy="34" rx="14" ry="13" fill={J}/>
        {/* NECK */}
        <rect x="92" y="53" width="16" height="12" rx="5" fill={B}/>
        {/* TORSO */}
        <path d="M 76,64 Q 62,95 70,140 H 130 Q 138,95 124,64 Z" fill={B}/>
        {/* ARMS along bar */}
        <rect x="42" y="65" width="36" height="14" rx="7" fill={BL}/>
        <rect x="122" y="65" width="36" height="14" rx="7" fill={BL}/>

        {/* QUADS glow */}
        <ellipse cx="80" cy="172" rx="16" ry="26" fill="url(#quad-l)" filter="url(#glow-s)" opacity="0">
          <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.45;0.55;1"/>
        </ellipse>
        <ellipse cx="120" cy="172" rx="16" ry="26" fill="url(#quad-r)" filter="url(#glow-s)" opacity="0">
          <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.45;0.55;1"/>
        </ellipse>

        {/* LEGS (thighs → shins) — also go down */}
        {/* Thigh L */}
        <rect x="68" y="140" width="24" height="46" rx="12" fill={B}/>
        <rect x="70" y="186" width="20" height="36" rx="10" fill={BL}/>
        {/* Thigh R */}
        <rect x="108" y="140" width="24" height="46" rx="12" fill={B}/>
        <rect x="110" y="186" width="20" height="36" rx="10" fill={BL}/>
        {/* Feet */}
        <rect x="60" y="222" width="32" height="12" rx="6" fill={B}/>
        <rect x="108" y="222" width="32" height="12" rx="6" fill={B}/>

        {/* Animate whole body down and up */}
        <animateTransform attributeName="transform" type="translate"
          values="0,0; 0,40; 0,0" dur="2.5s" repeatCount="indefinite" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      </g>

      <text x="100" y="262" textAnchor="middle" fill={c} fontSize="11" fontWeight="700" fontFamily="sans-serif" opacity="0.8">CUÁDRICEPS · GLÚTEOS</text>
    </svg>
  );

  /* ─── 6. ISOLATION (curl, tricep, fly) ──────────────────────────────────── */
  if (resolvedType === "isolation") return (
    <svg viewBox="0 0 200 270" width="100%" style={{ overflow:"visible", maxHeight:240 }}>
      <defs>
        <filter id="glow-i"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      {/* Floor */}
      <rect x="10" y="245" width="180" height="8" rx="4" fill={E}/>

      {/* HEAD */}
      <ellipse cx="100" cy="26" rx="18" ry="19" fill={B}/>
      <ellipse cx="100" cy="24" rx="14" ry="13" fill={J}/>
      {/* NECK */}
      <rect x="92" y="43" width="16" height="10" rx="5" fill={B}/>
      {/* TORSO */}
      <path d="M 76,53 Q 62,85 70,148 H 130 Q 138,85 124,53 Z" fill={B}/>
      {/* LEGS */}
      <rect x="70" y="148" width="24" height="46" rx="12" fill={B}/>
      <rect x="70" y="192" width="22" height="40" rx="10" fill={BL}/>
      <rect x="108" y="148" width="24" height="46" rx="12" fill={B}/>
      <rect x="110" y="192" width="22" height="40" rx="10" fill={BL}/>

      {/* RIGHT ARM — fixed (holding still) */}
      <rect x="126" y="68" width="14" height="40" rx="7" fill={BL}/>
      <rect x="128" y="106" width="12" height="34" rx="6" fill={B}/>
      {/* Dumbbell right */}
      <rect x="124" y="138" width="16" height="6" rx="3" fill={E}/>
      <rect x="118" y="134" width="10" height="14" rx="4" fill={EL}/>
      <rect x="134" y="134" width="10" height="14" rx="4" fill={EL}/>

      {/* LEFT ARM — upper arm fixed, forearm curls up */}
      <rect x="60" y="68" width="14" height="40" rx="7" fill={BL}/>

      {/* Bicep glow */}
      <ellipse cx="67" cy="88" rx="10" ry="18" fill={c} opacity="0" filter="url(#glow-i)">
        <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2s" repeatCount="indefinite" keyTimes="0;0.4;0.6;1"/>
      </ellipse>

      {/* Forearm curling — pivots at elbow (67, 108) */}
      <g>
        <rect x="60" y="108" width="12" height="34" rx="6" fill={B}/>
        {/* Dumbbell */}
        <rect x="57" y="140" width="18" height="6" rx="3" fill={E}/>
        <rect x="52" y="136" width="10" height="14" rx="4" fill={EL}/>
        <rect x="68" y="136" width="10" height="14" rx="4" fill={EL}/>
        <animateTransform attributeName="transform" type="rotate"
          values="0 67 108; -100 67 108; 0 67 108" dur="2s" repeatCount="indefinite" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      </g>

      <text x="100" y="262" textAnchor="middle" fill={c} fontSize="11" fontWeight="700" fontFamily="sans-serif" opacity="0.8">BÍCEPS · MÚSCULOS AISLADOS</text>
    </svg>
  );

  /* ─── 7. LEGS (thrust, leg ext/curl, calf) ───────────────────────────────── */
  if (resolvedType === "legs") return (
    <svg viewBox="0 0 200 200" width="100%" style={{ overflow:"visible", maxHeight:220 }}>
      <defs>
        <filter id="glow-l"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      {/* Bench/support */}
      <rect x="10" y="120" width="60" height="14" rx="7" fill={EL}/>
      <rect x="10" y="134" width="12" height="40" rx="6" fill={E}/>
      <rect x="58" y="134" width="12" height="40" rx="6" fill={E}/>
      {/* Back rest */}
      <rect x="8" y="60" width="12" height="62" rx="6" fill={EL}/>

      {/* BODY */}
      <ellipse cx="46" cy="40" rx="17" ry="18" fill={B}/>
      <ellipse cx="46" cy="38" rx="13" ry="12" fill={J}/>
      <rect x="38" y="56" width="16" height="10" rx="5" fill={B}/>
      {/* Torso seated */}
      <rect x="24" y="65" width="42" height="56" rx="12" fill={B}/>
      {/* Arms at sides */}
      <rect x="14" y="80" width="12" height="32" rx="6" fill={BL}/>
      <rect x="64" y="80" width="12" height="32" rx="6" fill={BL}/>

      {/* THIGHS (horizontal when seated) */}
      <rect x="22" y="120" width="60" height="20" rx="10" fill={B}/>
      {/* Second leg slightly offset */}
      <rect x="32" y="114" width="58" height="18" rx="9" fill={BL}/>

      {/* Glute glow */}
      <ellipse cx="46" cy="118" rx="30" ry="12" fill={c} opacity="0" filter="url(#glow-l)">
        <animate attributeName="opacity" values="0;0.8;0.8;0" dur="2s" repeatCount="indefinite" keyTimes="0;0.4;0.6;1"/>
      </ellipse>

      {/* SHIN — extends from knee and rotates up */}
      <g>
        {/* Shin */}
        <rect x="76" y="138" width="18" height="44" rx="9" fill={B}/>
        {/* Foot */}
        <rect x="72" y="180" width="28" height="12" rx="6" fill={BL}/>
        {/* Weight plate at foot */}
        <rect x="96" y="170" width="10" height="24" rx="4" fill={EL}/>
        <animateTransform attributeName="transform" type="rotate"
          values="0 85 138; -80 85 138; 0 85 138" dur="2s" repeatCount="indefinite" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/>
      </g>

      {/* Hip/glute muscle label */}
      <text x="140" y="100" textAnchor="middle" fill={c} fontSize="11" fontWeight="700" fontFamily="sans-serif" opacity="0.8">GLÚTEOS</text>
      <text x="140" y="115" textAnchor="middle" fill={c} fontSize="10" fontWeight="600" fontFamily="sans-serif" opacity="0.6">CUÁDRICEPS</text>
    </svg>
  );

  /* ─── 8. CORE (plank, crunch, leg raise) ─────────────────────────────────── */
  if (resolvedType === "core") return (
    <svg viewBox="0 0 260 150" width="100%" style={{ overflow:"visible", maxHeight:200 }}>
      <defs>
        <filter id="glow-c"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="abs-grad" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={c} stopOpacity="0.9"/><stop offset="100%" stopColor={c} stopOpacity="0.1"/></radialGradient>
      </defs>

      {/* Floor/mat */}
      <rect x="10" y="118" width="240" height="10" rx="5" fill={EL}/>
      <rect x="10" y="126" width="240" height="6" rx="3" fill={E}/>

      {/* Person doing plank */}
      {/* Head */}
      <ellipse cx="228" cy="100" rx="16" ry="16" fill={B}/>
      <ellipse cx="228" cy="98" rx="12" ry="11" fill={J}/>
      {/* Torso horizontal */}
      <rect x="84" y="88" width="140" height="26" rx="13" fill={B}/>

      {/* ABS glow */}
      <ellipse cx="155" cy="101" rx="40" ry="10" fill="url(#abs-grad)" filter="url(#glow-c)" opacity="0">
        <animate attributeName="opacity" values="0;0.9;0.9;0" dur="3s" repeatCount="indefinite" keyTimes="0;0.3;0.7;1"/>
      </ellipse>

      {/* Right arm (elbow to hand) */}
      <rect x="196" y="100" width="14" height="20" rx="7" fill={BL}/>
      {/* Left arm */}
      <rect x="84" y="100" width="14" height="20" rx="7" fill={BL}/>
      {/* Hands/fists */}
      <ellipse cx="203" cy="122" rx="9" ry="7" fill={B}/>
      <ellipse cx="91" cy="122" rx="9" ry="7" fill={B}/>

      {/* LEGS — horizontal, slightly animated */}
      <rect x="20" y="90" width="70" height="20" rx="10" fill={B}/>
      <rect x="16" y="94" width="70" height="18" rx="9" fill={BL}/>

      {/* Toes */}
      <ellipse cx="24" cy="108" rx="8" ry="6" fill={B}/>
      <ellipse cx="30" cy="108" rx="8" ry="6" fill={BL}/>

      {/* Slight pulsing animation on the whole body */}
      <g>
        <ellipse cx="155" cy="101" rx="60" ry="6" fill={c} opacity="0" filter="url(#glow-c)">
          <animate attributeName="opacity" values="0;0.4;0" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="ry" values="6;10;6" dur="3s" repeatCount="indefinite"/>
        </ellipse>
      </g>

      <text x="130" y="144" textAnchor="middle" fill={c} fontSize="11" fontWeight="700" fontFamily="sans-serif" opacity="0.8">CORE · ABDOMINALES</text>
    </svg>
  );

  return null;
}
