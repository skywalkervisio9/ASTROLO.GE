"use client";

import { useState } from "react";
import "./showcase.css";

type Variant = {
  id: string;
  label: string;
  description: string;
  svg: React.ReactNode;
};

type Group = {
  category: string;
  key: string;
  context: string;
  currentLabel: string;
  currentNote: string;
  current: React.ReactNode;
  variants: Variant[];
};

// ─── Shared sizing ─────────────────────────────────────────────
const VB = "0 0 48 48";
const S = 1.6;

// ─── AUTH: LOGIN (moon) ────────────────────────────────────────
const loginVariants: Variant[] = [
  {
    id: "login-A",
    label: "Crescent + Star",
    description: "Refined crescent with a single accompanying star — luminous & serene",
    svg: (
      <svg viewBox={VB}>
        <path d="M30 6a18 18 0 1 0 0 36 14 14 0 0 1 0-36z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="currentColor" opacity=".85" />
      </svg>
    ),
  },
  {
    id: "login-B",
    label: "Moon Phases",
    description: "Three phases — waxing, full, waning — a small horizontal ritual",
    svg: (
      <svg viewBox={VB}>
        <path d="M11 24a5 5 0 1 0 0-.001" fill="none" stroke="currentColor" strokeWidth={S} />
        <path d="M9 18a6 6 0 0 1 0 12 4 4 0 0 0 0-12z" fill="currentColor" opacity=".75" />
        <circle cx="24" cy="24" r="6" fill="none" stroke="currentColor" strokeWidth={S} />
        <circle cx="24" cy="24" r="2" fill="currentColor" opacity=".6" />
        <path d="M39 18a6 6 0 0 0 0 12 4 4 0 0 1 0-12z" fill="currentColor" opacity=".75" />
      </svg>
    ),
  },
  {
    id: "login-C",
    label: "Radiant Crescent",
    description: "Crescent surrounded by soft radiating rays — an awakening glyph",
    svg: (
      <svg viewBox={VB}>
        <g stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" opacity=".55">
          <line x1="24" y1="4" x2="24" y2="9" />
          <line x1="24" y1="39" x2="24" y2="44" />
          <line x1="4" y1="24" x2="9" y2="24" />
          <line x1="39" y1="24" x2="44" y2="24" />
          <line x1="10" y1="10" x2="13" y2="13" />
          <line x1="35" y1="10" x2="38" y2="13" />
          <line x1="10" y1="38" x2="13" y2="35" />
          <line x1="35" y1="38" x2="38" y2="35" />
        </g>
        <path d="M30 12a12 12 0 1 0 0 24 9 9 0 0 1 0-24z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "login-D",
    label: "Hand-drawn Crescent",
    description: "Inked silhouette with a faint crater — tactile, manuscript feel",
    svg: (
      <svg viewBox={VB}>
        <path d="M30 8a16 16 0 1 0 0 32 12 12 0 0 1 0-32z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
        <circle cx="20" cy="18" r="1.4" fill="currentColor" opacity=".6" />
        <circle cx="17" cy="28" r="0.9" fill="currentColor" opacity=".45" />
        <circle cx="23" cy="32" r="0.7" fill="currentColor" opacity=".3" />
      </svg>
    ),
  },
];

// ─── AUTH: SIGNUP (sparkle / star) ─────────────────────────────
const signupVariants: Variant[] = [
  {
    id: "signup-A",
    label: "8-Point Compass",
    description: "Classical compass-star — strong directional, suggests beginning",
    svg: (
      <svg viewBox={VB}>
        <path d="M24 4l3 18 17 2-17 2-3 18-3-18-17-2 17-2z" fill="currentColor" opacity=".7" />
        <path d="M11 11l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" transform="rotate(45 24 24)" fill="none" stroke="currentColor" strokeWidth={1.2} opacity=".55" />
      </svg>
    ),
  },
  {
    id: "signup-B",
    label: "Sparkle + Halo",
    description: "Sparkle with a delicate orbital ring — wish, intention",
    svg: (
      <svg viewBox={VB}>
        <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth={0.9} opacity=".4" />
        <path d="M24 8l3 13 13 3-13 3-3 13-3-13-13-3 13-3z" fill="currentColor" opacity=".85" />
      </svg>
    ),
  },
  {
    id: "signup-C",
    label: "Three Sparkles",
    description: "A primary star with two attendant sparkles — companions, beginning",
    svg: (
      <svg viewBox={VB}>
        <path d="M22 14l2.4 7 7 2.4-7 2.4-2.4 7-2.4-7-7-2.4 7-2.4z" fill="currentColor" opacity=".9" />
        <path d="M37 10l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" fill="currentColor" opacity=".7" />
        <path d="M36 32l1.1 3 3 1.1-3 1.1-1.1 3-1.1-3-3-1.1 3-1.1z" fill="currentColor" opacity=".6" />
      </svg>
    ),
  },
  {
    id: "signup-D",
    label: "Burst",
    description: "Radiating burst — emergence, an event horizon",
    svg: (
      <svg viewBox={VB}>
        <g stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" fill="none">
          <line x1="24" y1="6" x2="24" y2="14" />
          <line x1="24" y1="34" x2="24" y2="42" />
          <line x1="6" y1="24" x2="14" y2="24" />
          <line x1="34" y1="24" x2="42" y2="24" />
          <line x1="11" y1="11" x2="16" y2="16" />
          <line x1="32" y1="32" x2="37" y2="37" />
          <line x1="37" y1="11" x2="32" y2="16" />
          <line x1="16" y1="32" x2="11" y2="37" />
        </g>
        <circle cx="24" cy="24" r="4" fill="currentColor" opacity=".85" />
      </svg>
    ),
  },
];

// ─── AUTH: FORGOT PASSWORD (currently ✧) ───────────────────────
const forgotVariants: Variant[] = [
  {
    id: "forgot-A",
    label: "Star + Key",
    description: "Star fused with a key — recovery, unlocking memory",
    svg: (
      <svg viewBox={VB}>
        <circle cx="16" cy="20" r="6" fill="none" stroke="currentColor" strokeWidth={S} />
        <circle cx="16" cy="20" r="2" fill="currentColor" />
        <path d="M22 20h18M34 20v6M40 20v4" stroke="currentColor" strokeWidth={S} strokeLinecap="round" fill="none" />
        <path d="M38 32l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z" fill="currentColor" opacity=".7" />
      </svg>
    ),
  },
  {
    id: "forgot-B",
    label: "Hourglass Star",
    description: "Hourglass with a sparkle — time, recollection",
    svg: (
      <svg viewBox={VB}>
        <path d="M14 8h20M14 40h20M14 8c0 10 20 14 20 22s-20 12-20 22M34 8c0 10-20 14-20 22s20 12 20 22" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" strokeLinecap="round" />
        <path d="M24 22l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor" opacity=".9" />
      </svg>
    ),
  },
  {
    id: "forgot-C",
    label: "Hollow Star (refined)",
    description: "Faceted, hollow star — a quiet, contemplative version of the current",
    svg: (
      <svg viewBox={VB}>
        <path d="M24 6l5 12 13 1-10 9 3 13-11-7-11 7 3-13-10-9 13-1z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
        <path d="M24 16l2 6 6 .5-5 4 1.5 6-4.5-3.5-4.5 3.5 1.5-6-5-4 6-.5z" fill="currentColor" opacity=".25" />
      </svg>
    ),
  },
  {
    id: "forgot-D",
    label: "Broken Circle",
    description: "Open ring with a star at the gap — interrupted, returning",
    svg: (
      <svg viewBox={VB}>
        <path d="M40 24a16 16 0 1 1-8-13.86" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
        <path d="M36 8l1.2 3.6 3.6 1.2-3.6 1.2-1.2 3.6-1.2-3.6-3.6-1.2 3.6-1.2z" fill="currentColor" opacity=".85" />
      </svg>
    ),
  },
];

// ─── AUTH: BIRTH DATA (currently ⊛) ────────────────────────────
const birthVariants: Variant[] = [
  {
    id: "birth-A",
    label: "Natal Wheel",
    description: "12-spoke wheel — the natal chart, the user's first chart",
    svg: (
      <svg viewBox={VB}>
        <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth={S} />
        <circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" strokeWidth={1} opacity=".5" />
        <circle cx="24" cy="24" r="2" fill="currentColor" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const x1 = (24 + Math.cos(a) * 10).toFixed(3);
          const y1 = (24 + Math.sin(a) * 10).toFixed(3);
          const x2 = (24 + Math.cos(a) * 18).toFixed(3);
          const y2 = (24 + Math.sin(a) * 18).toFixed(3);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={1} opacity=".7" />;
        })}
      </svg>
    ),
  },
  {
    id: "birth-B",
    label: "Astrolabe",
    description: "Outer ring with a fixed sighting line — finding one's place",
    svg: (
      <svg viewBox={VB}>
        <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth={S} />
        <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth={0.9} opacity=".5" />
        <line x1="6" y1="24" x2="42" y2="24" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
        <line x1="24" y1="6" x2="24" y2="42" stroke="currentColor" strokeWidth={1} opacity=".6" />
        <circle cx="24" cy="24" r="3" fill="none" stroke="currentColor" strokeWidth={1} />
        <circle cx="24" cy="6" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "birth-C",
    label: "Mandala Flower",
    description: "Six-petal cosmic flower — birth as blossoming",
    svg: (
      <svg viewBox={VB}>
        <g fill="none" stroke="currentColor" strokeWidth={1.3}>
          <circle cx="24" cy="24" r="8" />
          <circle cx="24" cy="16" r="8" opacity=".7" />
          <circle cx="24" cy="32" r="8" opacity=".7" />
          <circle cx="17" cy="20" r="8" opacity=".7" />
          <circle cx="31" cy="20" r="8" opacity=".7" />
          <circle cx="17" cy="28" r="8" opacity=".7" />
          <circle cx="31" cy="28" r="8" opacity=".7" />
        </g>
        <circle cx="24" cy="24" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "birth-D",
    label: "Orbit Trio",
    description: "Three concentric orbits with a dot — a cosmic seed",
    svg: (
      <svg viewBox={VB}>
        <ellipse cx="24" cy="24" rx="18" ry="7" fill="none" stroke="currentColor" strokeWidth={1.3} opacity=".7" />
        <ellipse cx="24" cy="24" rx="18" ry="7" fill="none" stroke="currentColor" strokeWidth={1.3} opacity=".7" transform="rotate(60 24 24)" />
        <ellipse cx="24" cy="24" rx="18" ry="7" fill="none" stroke="currentColor" strokeWidth={1.3} opacity=".7" transform="rotate(120 24 24)" />
        <circle cx="24" cy="24" r="3" fill="currentColor" />
      </svg>
    ),
  },
];

// ─── GENDER: FEMALE (Venus ♀) ──────────────────────────────────
const femaleVariants: Variant[] = [
  {
    id: "f-A",
    label: "Classical Venus",
    description: "Refined Venus glyph with even stroke — clean and traditional",
    svg: (
      <svg viewBox={VB}>
        <circle cx="24" cy="18" r="9" fill="none" stroke="currentColor" strokeWidth={S} />
        <line x1="24" y1="27" x2="24" y2="42" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
        <line x1="18" y1="36" x2="30" y2="36" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "f-B",
    label: "Venus Filled",
    description: "Solid filled disc — high-contrast, modern",
    svg: (
      <svg viewBox={VB}>
        <circle cx="24" cy="18" r="9" fill="currentColor" opacity=".88" />
        <line x1="24" y1="27" x2="24" y2="42" stroke="currentColor" strokeWidth={S * 1.2} strokeLinecap="round" />
        <line x1="18" y1="36" x2="30" y2="36" stroke="currentColor" strokeWidth={S * 1.2} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "f-C",
    label: "Venus + Halo",
    description: "Inner ring + Venus — softer, decorative",
    svg: (
      <svg viewBox={VB}>
        <circle cx="24" cy="18" r="9" fill="none" stroke="currentColor" strokeWidth={S} />
        <circle cx="24" cy="18" r="3" fill="currentColor" opacity=".7" />
        <line x1="24" y1="27" x2="24" y2="42" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
        <line x1="18" y1="36" x2="30" y2="36" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
      </svg>
    ),
  },
];

// ─── GENDER: MALE (Mars ♂) ─────────────────────────────────────
const maleVariants: Variant[] = [
  {
    id: "m-A",
    label: "Classical Mars",
    description: "Even stroke, balanced arrow — traditional Mars",
    svg: (
      <svg viewBox={VB}>
        <circle cx="20" cy="28" r="10" fill="none" stroke="currentColor" strokeWidth={S} />
        <line x1="28" y1="20" x2="40" y2="8" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
        <polyline points="30,8 40,8 40,18" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "m-B",
    label: "Mars Filled",
    description: "Solid disc + crisp arrow — high contrast",
    svg: (
      <svg viewBox={VB}>
        <circle cx="20" cy="28" r="10" fill="currentColor" opacity=".88" />
        <line x1="28" y1="20" x2="40" y2="8" stroke="currentColor" strokeWidth={S * 1.2} strokeLinecap="round" />
        <polyline points="30,8 40,8 40,18" fill="none" stroke="currentColor" strokeWidth={S * 1.2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "m-C",
    label: "Mars + Inner Disc",
    description: "Ringed disc — softer, decorative",
    svg: (
      <svg viewBox={VB}>
        <circle cx="20" cy="28" r="10" fill="none" stroke="currentColor" strokeWidth={S} />
        <circle cx="20" cy="28" r="3" fill="currentColor" opacity=".7" />
        <line x1="28" y1="20" x2="40" y2="8" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
        <polyline points="30,8 40,8 40,18" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// ─── SYNASTRY: CONJUNCTION (☌) ─────────────────────────────────
const conjunctionVariants: Variant[] = [
  {
    id: "c-A",
    label: "Traditional ☌",
    description: "Hollow circle with upward stroke — astronomical standard",
    svg: (
      <svg viewBox={VB}>
        <circle cx="24" cy="28" r="10" fill="none" stroke="currentColor" strokeWidth={S} />
        <line x1="24" y1="18" x2="24" y2="6" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "c-B",
    label: "Touching Circles",
    description: "Two circles meeting at a point — visualises 'together'",
    svg: (
      <svg viewBox={VB}>
        <circle cx="16" cy="24" r="9" fill="none" stroke="currentColor" strokeWidth={S} />
        <circle cx="32" cy="24" r="9" fill="none" stroke="currentColor" strokeWidth={S} />
        <circle cx="24" cy="24" r="1.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "c-C",
    label: "Overlapping Circles",
    description: "A vesica — two planets in shared space",
    svg: (
      <svg viewBox={VB}>
        <circle cx="18" cy="24" r="10" fill="none" stroke="currentColor" strokeWidth={S} />
        <circle cx="30" cy="24" r="10" fill="none" stroke="currentColor" strokeWidth={S} />
      </svg>
    ),
  },
  {
    id: "c-D",
    label: "Sun-style",
    description: "Filled center with halo — fused energy",
    svg: (
      <svg viewBox={VB}>
        <circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" strokeWidth={S} />
        <circle cx="24" cy="24" r="4" fill="currentColor" />
      </svg>
    ),
  },
];

// ─── SYNASTRY: TRINE (△) ───────────────────────────────────────
const trineVariants: Variant[] = [
  {
    id: "t-A",
    label: "Traditional △",
    description: "Equilateral triangle — astronomical standard",
    svg: (
      <svg viewBox={VB}>
        <path d="M24 8L42 40H6Z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "t-B",
    label: "Triangle + Inner Dot",
    description: "Centered point — anchored harmony",
    svg: (
      <svg viewBox={VB}>
        <path d="M24 8L42 40H6Z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
        <circle cx="24" cy="30" r="2.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "t-C",
    label: "Nested Triangle",
    description: "Triangle with inner outline — depth, layered flow",
    svg: (
      <svg viewBox={VB}>
        <path d="M24 6L44 40H4Z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
        <path d="M24 18L34 34H14Z" fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinejoin="round" opacity=".6" />
      </svg>
    ),
  },
  {
    id: "t-D",
    label: "Triquetra-ish",
    description: "Three meeting arcs — flowing, ornamental",
    svg: (
      <svg viewBox={VB}>
        <g fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round">
          <path d="M24 8c6 8 6 16 0 24" />
          <path d="M24 8c-6 8-6 16 0 24" />
          <path d="M11 32c8-4 18-4 26 0" />
        </g>
      </svg>
    ),
  },
];

// ─── SYNASTRY: SQUARE (□) ──────────────────────────────────────
const squareVariants: Variant[] = [
  {
    id: "sq-A",
    label: "Traditional □",
    description: "Astronomical standard — 90° tension",
    svg: (
      <svg viewBox={VB}>
        <rect x="8" y="8" width="32" height="32" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "sq-B",
    label: "Rotated Diamond",
    description: "Square on point — kinetic, energetic",
    svg: (
      <svg viewBox={VB}>
        <path d="M24 6L42 24L24 42L6 24Z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "sq-C",
    label: "Crossed Square",
    description: "Square with internal cross — friction, push-pull",
    svg: (
      <svg viewBox={VB}>
        <rect x="9" y="9" width="30" height="30" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
        <line x1="9" y1="9" x2="39" y2="39" stroke="currentColor" strokeWidth={1.1} opacity=".55" />
        <line x1="39" y1="9" x2="9" y2="39" stroke="currentColor" strokeWidth={1.1} opacity=".55" />
      </svg>
    ),
  },
  {
    id: "sq-D",
    label: "Stacked Squares",
    description: "Concentric squares — pressure, compounding tension",
    svg: (
      <svg viewBox={VB}>
        <rect x="8" y="8" width="32" height="32" fill="none" stroke="currentColor" strokeWidth={S} />
        <rect x="15" y="15" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.1} opacity=".5" />
      </svg>
    ),
  },
];

// ─── SYNASTRY: SEXTILE (✶) ─────────────────────────────────────
const sextileVariants: Variant[] = [
  {
    id: "sx-A",
    label: "Traditional ✶",
    description: "Three crossing lines — astronomical standard",
    svg: (
      <svg viewBox={VB}>
        <g stroke="currentColor" strokeWidth={S} strokeLinecap="round">
          <line x1="24" y1="6" x2="24" y2="42" />
          <line x1="8" y1="15" x2="40" y2="33" />
          <line x1="40" y1="15" x2="8" y2="33" />
        </g>
      </svg>
    ),
  },
  {
    id: "sx-B",
    label: "Hexagram",
    description: "Six-point star — gentle harmony",
    svg: (
      <svg viewBox={VB}>
        <path d="M24 6L40 34H8Z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
        <path d="M24 42L8 14h32Z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "sx-C",
    label: "Hexagon",
    description: "Pure hexagon — 60° expressed as form",
    svg: (
      <svg viewBox={VB}>
        <path d="M24 6L40 15v18L24 42L8 33V15Z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "sx-D",
    label: "Snowflake",
    description: "Six rays with subtle tips — delicate, flowing",
    svg: (
      <svg viewBox={VB}>
        <g stroke="currentColor" strokeWidth={S} strokeLinecap="round" fill="none">
          <line x1="24" y1="6" x2="24" y2="42" />
          <line x1="8" y1="15" x2="40" y2="33" />
          <line x1="40" y1="15" x2="8" y2="33" />
          <path d="M24 10l-2 2 2 2 2-2z M24 38l-2-2 2-2 2 2z" />
        </g>
      </svg>
    ),
  },
];

// ─── SYNASTRY: OPPOSITION (☍) ──────────────────────────────────
const oppositionVariants: Variant[] = [
  {
    id: "o-A",
    label: "Traditional ☍",
    description: "Two circles + connecting line — astronomical standard",
    svg: (
      <svg viewBox={VB}>
        <circle cx="10" cy="24" r="5" fill="none" stroke="currentColor" strokeWidth={S} />
        <circle cx="38" cy="24" r="5" fill="none" stroke="currentColor" strokeWidth={S} />
        <line x1="15" y1="24" x2="33" y2="24" stroke="currentColor" strokeWidth={S} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "o-B",
    label: "Arrows Apart",
    description: "Two outward arrows — visible polarity",
    svg: (
      <svg viewBox={VB}>
        <g stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1="22" y1="24" x2="6" y2="24" />
          <polyline points="11,18 6,24 11,30" />
          <line x1="26" y1="24" x2="42" y2="24" />
          <polyline points="37,18 42,24 37,30" />
        </g>
      </svg>
    ),
  },
  {
    id: "o-C",
    label: "Mirrored Crescents",
    description: "Two crescents facing away — reflection",
    svg: (
      <svg viewBox={VB}>
        <path d="M14 12a12 12 0 1 0 0 24 8 8 0 0 1 0-24z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
        <path d="M34 12a12 12 0 1 1 0 24 8 8 0 0 0 0-24z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "o-D",
    label: "Polar Dots",
    description: "Two dots on a long axis — minimal, elegant",
    svg: (
      <svg viewBox={VB}>
        <line x1="8" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth={S} strokeLinecap="round" opacity=".7" />
        <circle cx="8" cy="24" r="3.5" fill="currentColor" />
        <circle cx="40" cy="24" r="3.5" fill="currentColor" />
      </svg>
    ),
  },
];

// ═══════════════════════════════════════════════════════════════
// PLANET GLYPHS — table & popup share these. "current" cards mirror
// the real GlyphDefs #gl-* symbol (viewBox 24) so the comparison is
// honest; variants are authored at the showcase scale (viewBox 48).
// ═══════════════════════════════════════════════════════════════
const SB = 2.3; // bold stroke
const sunRays = Array.from({ length: 8 }).map((_, i) => {
  const a = (i * 45 * Math.PI) / 180;
  return (
    <line
      key={i}
      x1={(24 + Math.cos(a) * 14).toFixed(2)}
      y1={(24 + Math.sin(a) * 14).toFixed(2)}
      x2={(24 + Math.cos(a) * 18).toFixed(2)}
      y2={(24 + Math.sin(a) * 18).toFixed(2)}
    />
  );
});

const planetGroups: Group[] = [
  {
    category: "PLANET GLYPHS",
    key: "sun",
    context: "Planet table + popup (☉ Sun)",
    currentLabel: "#gl-sun",
    currentNote: "Thin ring + small dot",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth={1.5} />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      </svg>
    ),
    variants: [
      { id: "sun-A", label: "Classic", description: "Even ring with a centred dot — clean astronomical Sun", svg: (
        <svg viewBox={VB}><circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" strokeWidth={S} /><circle cx="24" cy="24" r="2.6" fill="currentColor" /></svg>
      ) },
      { id: "sun-B", label: "Bold / Filled", description: "Thicker ring + large solid core — high-contrast & notable", svg: (
        <svg viewBox={VB}><circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" strokeWidth={SB} /><circle cx="24" cy="24" r="4.6" fill="currentColor" /></svg>
      ) },
      { id: "sun-C", label: "Radiant", description: "Ring + core with eight short rays — luminous", svg: (
        <svg viewBox={VB}><g stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" opacity=".7">{sunRays}</g><circle cx="24" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth={S} /><circle cx="24" cy="24" r="2.4" fill="currentColor" /></svg>
      ) },
    ],
  },
  {
    category: "PLANET GLYPHS",
    key: "moon",
    context: "Planet table + popup (☽ Moon)",
    currentLabel: "#gl-moon",
    currentNote: "Open crescent outline",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <path d="M16 4a8 8 0 1 0 0 16 6 6 0 0 1 0-16z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    ),
    variants: [
      { id: "moon-A", label: "Crescent", description: "Refined open crescent — even stroke", svg: (
        <svg viewBox={VB}><path d="M31 9a15 15 0 1 0 0 30 11 11 0 0 1 0-30z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" /></svg>
      ) },
      { id: "moon-B", label: "Solid", description: "Filled silhouette — bold, like the reference moon", svg: (
        <svg viewBox={VB}><path d="M31 9a15 15 0 1 0 0 30 11 11 0 0 1 0-30z" fill="currentColor" opacity=".9" /></svg>
      ) },
      { id: "moon-C", label: "Crescent + Star", description: "Crescent with a single attendant star", svg: (
        <svg viewBox={VB}><path d="M33 10a14 14 0 1 0 0 28 10 10 0 0 1 0-28z" fill="none" stroke="currentColor" strokeWidth={S} strokeLinejoin="round" /><path d="M13 13l1.3 3.4 3.4 1.3-3.4 1.3-1.3 3.4-1.3-3.4-3.4-1.3 3.4-1.3z" fill="currentColor" opacity=".85" /></svg>
      ) },
    ],
  },
  {
    category: "PLANET GLYPHS",
    key: "mercury",
    context: "Planet table + popup (☿ Mercury)",
    currentLabel: "#gl-mercury",
    currentNote: "Horns + ring + cross",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <circle cx="12" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth={1.4} />
        <line x1="12" y1="15" x2="12" y2="22" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        <line x1="9" y1="19" x2="15" y2="19" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        <path d="M7 5a6 6 0 0110 0" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
      </svg>
    ),
    variants: [
      { id: "mer-A", label: "Classic", description: "Crescent horns, ring, cross — clean astronomical ☿", svg: (
        <svg viewBox={VB}><path d="M17 11a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><circle cx="24" cy="23" r="7" fill="none" stroke="currentColor" strokeWidth={S} /><line x1="24" y1="30" x2="24" y2="42" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><line x1="18.5" y1="37" x2="29.5" y2="37" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /></svg>
      ) },
      { id: "mer-B", label: "Bold / Filled", description: "Heavier strokes + filled disc — notable", svg: (
        <svg viewBox={VB}><path d="M17 11a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /><circle cx="24" cy="23" r="7" fill="currentColor" opacity=".88" /><line x1="24" y1="30" x2="24" y2="42" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /><line x1="18" y1="37" x2="30" y2="37" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /></svg>
      ) },
      { id: "mer-C", label: "Ring + Dot", description: "Open ring with a centred dot — lighter, distinct", svg: (
        <svg viewBox={VB}><path d="M17 11a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><circle cx="24" cy="23" r="7" fill="none" stroke="currentColor" strokeWidth={S} /><circle cx="24" cy="23" r="2.2" fill="currentColor" /><line x1="24" y1="30" x2="24" y2="42" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><line x1="18.5" y1="37" x2="29.5" y2="37" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /></svg>
      ) },
    ],
  },
  {
    category: "PLANET GLYPHS",
    key: "venus",
    context: "Planet table + popup (♀ Venus)",
    currentLabel: "#gl-venus",
    currentNote: "Ring + cross",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <circle cx="12" cy="9" r="5" fill="none" stroke="currentColor" strokeWidth={1.5} />
        <line x1="12" y1="14" x2="12" y2="22" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <line x1="9" y1="19" x2="15" y2="19" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    ),
    variants: [
      { id: "ven-A", label: "Classic", description: "Even stroke, balanced cross — traditional ♀", svg: (
        <svg viewBox={VB}><circle cx="24" cy="18" r="9" fill="none" stroke="currentColor" strokeWidth={S} /><line x1="24" y1="27" x2="24" y2="42" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><line x1="18" y1="36" x2="30" y2="36" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /></svg>
      ) },
      { id: "ven-B", label: "Bold / Filled", description: "Solid disc + crisp cross — high contrast", svg: (
        <svg viewBox={VB}><circle cx="24" cy="18" r="9" fill="currentColor" opacity=".88" /><line x1="24" y1="27" x2="24" y2="42" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /><line x1="18" y1="36" x2="30" y2="36" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /></svg>
      ) },
      { id: "ven-C", label: "Ring + Dot", description: "Ring with a soft inner dot — decorative", svg: (
        <svg viewBox={VB}><circle cx="24" cy="18" r="9" fill="none" stroke="currentColor" strokeWidth={S} /><circle cx="24" cy="18" r="3" fill="currentColor" opacity=".7" /><line x1="24" y1="27" x2="24" y2="42" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><line x1="18" y1="36" x2="30" y2="36" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /></svg>
      ) },
    ],
  },
  {
    category: "PLANET GLYPHS",
    key: "mars",
    context: "Planet table + popup (♂ Mars)",
    currentLabel: "#gl-mars",
    currentNote: "Ring + arrow",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <circle cx="10" cy="14" r="5.5" fill="none" stroke="currentColor" strokeWidth={1.5} />
        <line x1="14" y1="10" x2="20" y2="4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <polyline points="15,4 20,4 20,9" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    variants: [
      { id: "mar-A", label: "Classic", description: "Even stroke, balanced arrow — traditional ♂", svg: (
        <svg viewBox={VB}><circle cx="20" cy="28" r="10" fill="none" stroke="currentColor" strokeWidth={S} /><line x1="28" y1="20" x2="40" y2="8" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><polyline points="30,8 40,8 40,18" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) },
      { id: "mar-B", label: "Bold / Filled", description: "Solid disc + crisp arrow — high contrast", svg: (
        <svg viewBox={VB}><circle cx="20" cy="28" r="10" fill="currentColor" opacity=".88" /><line x1="28" y1="20" x2="40" y2="8" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /><polyline points="30,8 40,8 40,18" fill="none" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) },
      { id: "mar-C", label: "Ring + Dot", description: "Ring with a soft inner dot — decorative", svg: (
        <svg viewBox={VB}><circle cx="20" cy="28" r="10" fill="none" stroke="currentColor" strokeWidth={S} /><circle cx="20" cy="28" r="3" fill="currentColor" opacity=".7" /><line x1="28" y1="20" x2="40" y2="8" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><polyline points="30,8 40,8 40,18" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) },
    ],
  },
  {
    category: "PLANET GLYPHS",
    key: "jupiter",
    context: "Planet table + popup (♃ Jupiter)",
    currentLabel: "#gl-jupiter",
    currentNote: "Stylised '4' + bar",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <path d="M14 4v16M10 12h10M6 4c4 0 6 3 6 8s-2 8-6 8" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    variants: [
      { id: "jup-A", label: "Classic", description: "Refined current form — even stroke", svg: (
        <svg viewBox={VB}><path d="M28 8v32M20 24h20M12 8c8 0 12 6 12 16s-4 16-12 16" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) },
      { id: "jup-B", label: "Bold", description: "Heavier stroke — more notable in the table", svg: (
        <svg viewBox={VB}><path d="M28 8v32M20 24h20M12 8c8 0 12 6 12 16s-4 16-12 16" fill="none" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) },
      { id: "jup-C", label: "Open '4'", description: "Cross-bar with an open hook — airy alternate", svg: (
        <svg viewBox={VB}><path d="M14 14c0-5 4-8 9-8M14 14h16M30 6v34" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) },
    ],
  },
  {
    category: "PLANET GLYPHS",
    key: "saturn",
    context: "Planet table + popup (♄ Saturn)",
    currentLabel: "#gl-saturn",
    currentNote: "Scythe + cross",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <path d="M8 2l-3 3M5 5l2 2M9 9c-3 3-3 7 0 10s7 3 10 0" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        <line x1="9" y1="9" x2="9" y2="20" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        <line x1="6" y1="14" x2="12" y2="14" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      </svg>
    ),
    variants: [
      { id: "sat-A", label: "Classic", description: "Cross-topped stem with a sweeping tail — traditional ♄", svg: (
        <svg viewBox={VB}><path d="M16 8v24c0 6 5 9 10 7s8-7 4-12" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" /><line x1="16" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth={S} /><line x1="10" y1="13" x2="22" y2="13" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><line x1="16" y1="6" x2="16" y2="20" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /></svg>
      ) },
      { id: "sat-B", label: "Bold", description: "Heavier stroke — more notable", svg: (
        <svg viewBox={VB}><path d="M16 8v24c0 6 5 9 10 7s8-7 4-12" fill="none" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" strokeLinejoin="round" /><line x1="10" y1="13" x2="22" y2="13" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /><line x1="16" y1="6" x2="16" y2="20" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /></svg>
      ) },
      { id: "sat-C", label: "Rounded 'h'", description: "Softer h-curve tail — gentler alternate", svg: (
        <svg viewBox={VB}><path d="M14 10v18c0 8 12 9 14 1" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" /><line x1="8" y1="14" x2="20" y2="14" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><line x1="14" y1="7" x2="14" y2="21" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /></svg>
      ) },
    ],
  },
  {
    category: "PLANET GLYPHS",
    key: "uranus",
    context: "Planet table + popup (♅ Uranus)",
    currentLabel: "#gl-uranus",
    currentNote: "Astrological (ring + mast + dot)",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <circle cx="12" cy="17" r="4" fill="none" stroke="currentColor" strokeWidth={1.4} />
        <line x1="12" y1="13" x2="12" y2="2" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        <line x1="8" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        <circle cx="12" cy="2" r="1.2" fill="currentColor" />
      </svg>
    ),
    variants: [
      { id: "ura-A", label: "Astrological", description: "Ring, vertical mast, cross-bar, top dot — refined current", svg: (
        <svg viewBox={VB}><circle cx="24" cy="34" r="8" fill="none" stroke="currentColor" strokeWidth={S} /><line x1="24" y1="26" x2="24" y2="6" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><line x1="16" y1="14" x2="32" y2="14" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><circle cx="24" cy="6" r="2.4" fill="currentColor" /></svg>
      ) },
      { id: "ura-B", label: "H-style (⛢)", description: "Two masts + hanging disc — the astronomical form", svg: (
        <svg viewBox={VB}><line x1="14" y1="8" x2="14" y2="30" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><line x1="34" y1="8" x2="34" y2="30" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><line x1="14" y1="18" x2="34" y2="18" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><circle cx="24" cy="36" r="5" fill="none" stroke="currentColor" strokeWidth={S} /><line x1="24" y1="18" x2="24" y2="31" stroke="currentColor" strokeWidth={S} /></svg>
      ) },
      { id: "ura-C", label: "Bold", description: "Heavier astrological form — high contrast", svg: (
        <svg viewBox={VB}><circle cx="24" cy="34" r="8" fill="none" stroke="currentColor" strokeWidth={SB} /><line x1="24" y1="26" x2="24" y2="6" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /><line x1="15" y1="14" x2="33" y2="14" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /><circle cx="24" cy="6" r="3" fill="currentColor" /></svg>
      ) },
    ],
  },
  {
    category: "PLANET GLYPHS",
    key: "neptune",
    context: "Planet table + popup (♆ Neptune)",
    currentLabel: "#gl-neptune",
    currentNote: "Trident + cross",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        <line x1="8" y1="18" x2="16" y2="18" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        <path d="M5 10l3.5-4L12 10l3.5-4L19 10" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    variants: [
      { id: "nep-A", label: "Classic", description: "Three-prong trident with cross-bar — traditional ♆", svg: (
        <svg viewBox={VB}><path d="M10 20L17 12L24 20L31 12L38 20" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" /><line x1="24" y1="12" x2="24" y2="44" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><line x1="16" y1="36" x2="32" y2="36" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /></svg>
      ) },
      { id: "nep-B", label: "Bold", description: "Heavier trident — more notable", svg: (
        <svg viewBox={VB}><path d="M10 20L17 12L24 20L31 12L38 20" fill="none" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" strokeLinejoin="round" /><line x1="24" y1="12" x2="24" y2="44" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /><line x1="16" y1="36" x2="32" y2="36" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /></svg>
      ) },
      { id: "nep-C", label: "Curved Prongs", description: "Rounded trident with a shaft dot — softer", svg: (
        <svg viewBox={VB}><path d="M10 18c0-4 3-7 7-7M24 18c0-4-3-7-7-7M24 18c0-4 3-7 7-7M38 18c0-4-3-7-7-7M24 11v33" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><line x1="16" y1="37" x2="32" y2="37" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /></svg>
      ) },
    ],
  },
  {
    category: "PLANET GLYPHS",
    key: "pluto",
    context: "Planet table + popup (♇ Pluto)",
    currentLabel: "#gl-pluto",
    currentNote: "Orb + ring + cross",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <circle cx="12" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth={1.4} />
        <path d="M12 7m-2 0a2 2 0 104 0 2 2 0 10-4 0" fill="none" stroke="currentColor" strokeWidth={1.2} />
        <line x1="12" y1="12" x2="12" y2="20" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
        <line x1="8" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      </svg>
    ),
    variants: [
      { id: "plu-A", label: "Orb-in-crescent (♇)", description: "Disc cradled in an upturned crescent over a cross — standard ♇", svg: (
        <svg viewBox={VB}><path d="M14 18a10 10 0 0 0 20 0" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><circle cx="24" cy="13" r="4.5" fill="none" stroke="currentColor" strokeWidth={S} /><line x1="24" y1="26" x2="24" y2="42" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /><line x1="18" y1="35" x2="30" y2="35" stroke="currentColor" strokeWidth={S} strokeLinecap="round" /></svg>
      ) },
      { id: "plu-B", label: "P-L monogram", description: "The 'PL' ligature (Percival Lowell) — like the reference sheet", svg: (
        <svg viewBox={VB}><path d="M12 8v32M12 8h9a7 7 0 0 1 0 14h-9" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" /><path d="M26 18v22h12" fill="none" stroke="currentColor" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) },
      { id: "plu-C", label: "Bold orb-in-crescent", description: "Filled disc in crescent — high contrast", svg: (
        <svg viewBox={VB}><path d="M14 18a10 10 0 0 0 20 0" fill="none" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /><circle cx="24" cy="13" r="4.5" fill="currentColor" opacity=".88" /><line x1="24" y1="26" x2="24" y2="42" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /><line x1="18" y1="35" x2="30" y2="35" stroke="currentColor" strokeWidth={SB} strokeLinecap="round" /></svg>
      ) },
    ],
  },
];

// ─── Build all groups ──────────────────────────────────────────
const groups: Group[] = [
  ...planetGroups,
  {
    category: "AUTH STEPS",
    key: "login",
    context: "Login page header",
    currentLabel: "☽",
    currentNote: "Unicode U+263D (crescent moon)",
    current: <span style={{ fontSize: 30, lineHeight: 1 }}>☽</span>,
    variants: loginVariants,
  },
  {
    category: "AUTH STEPS",
    key: "signup",
    context: "Sign-up page header",
    currentLabel: "✦",
    currentNote: "Unicode U+2726 (4-point star)",
    current: <span style={{ fontSize: 30, lineHeight: 1 }}>✦</span>,
    variants: signupVariants,
  },
  {
    category: "AUTH STEPS",
    key: "forgot",
    context: "Forgot-password page header",
    currentLabel: "✧",
    currentNote: "Unicode U+2727 (hollow star)",
    current: <span style={{ fontSize: 30, lineHeight: 1 }}>✧</span>,
    variants: forgotVariants,
  },
  {
    category: "AUTH STEPS",
    key: "birth",
    context: "Birth-data page header",
    currentLabel: "⊛",
    currentNote: "Unicode U+229B (circled asterisk)",
    current: <span style={{ fontSize: 30, lineHeight: 1 }}>⊛</span>,
    variants: birthVariants,
  },
  {
    category: "GENDER PICKER",
    key: "female",
    context: "Birth-data gender select",
    currentLabel: "♀",
    currentNote: "Unicode U+2640 (Venus)",
    current: <span style={{ fontSize: 30, lineHeight: 1 }}>♀</span>,
    variants: femaleVariants,
  },
  {
    category: "GENDER PICKER",
    key: "male",
    context: "Birth-data gender select",
    currentLabel: "♂",
    currentNote: "Unicode U+2642 (Mars)",
    current: <span style={{ fontSize: 30, lineHeight: 1 }}>♂</span>,
    variants: maleVariants,
  },
  {
    category: "SYNASTRY ASPECTS",
    key: "conjunction",
    context: "Aspect glyph — 0°",
    currentLabel: "Conjunction",
    currentNote: "Inline SVG (GlyphDefs #gl-conjunction)",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth={1.4} />
        <line x1="12" y1="5" x2="12" y2="2" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      </svg>
    ),
    variants: conjunctionVariants,
  },
  {
    category: "SYNASTRY ASPECTS",
    key: "trine",
    context: "Aspect glyph — 120°",
    currentLabel: "Trine",
    currentNote: "Inline SVG (GlyphDefs #gl-trine)",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <path d="M12 4L21 20H3Z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    ),
    variants: trineVariants,
  },
  {
    category: "SYNASTRY ASPECTS",
    key: "square",
    context: "Aspect glyph — 90°",
    currentLabel: "Square",
    currentNote: "Inline SVG (GlyphDefs #gl-square)",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <rect x="4.5" y="4.5" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    ),
    variants: squareVariants,
  },
  {
    category: "SYNASTRY ASPECTS",
    key: "sextile",
    context: "Aspect glyph — 60°",
    currentLabel: "Sextile",
    currentNote: "Inline SVG (GlyphDefs #gl-sextile)",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <g stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="3.8" y1="7.5" x2="20.2" y2="16.5" />
          <line x1="20.2" y1="7.5" x2="3.8" y2="16.5" />
        </g>
      </svg>
    ),
    variants: sextileVariants,
  },
  {
    category: "SYNASTRY ASPECTS",
    key: "opposition",
    context: "Aspect glyph — 180°",
    currentLabel: "Opposition",
    currentNote: "Inline SVG (GlyphDefs #gl-opposition)",
    current: (
      <svg viewBox="0 0 24 24" style={{ width: 30, height: 30 }}>
        <circle cx="5.5" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth={1.4} />
        <circle cx="18.5" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth={1.4} />
        <line x1="8.5" y1="12" x2="15.5" y2="12" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      </svg>
    ),
    variants: oppositionVariants,
  },
];

// ─── Component ─────────────────────────────────────────────────
export default function SymbolsShowcaseClient() {
  const [picks, setPicks] = useState<Record<string, string>>({});

  const categories = Array.from(new Set(groups.map((g) => g.category)));

  return (
    <div className="sx-root">
      <header className="sx-header">
        <p className="sx-eyebrow">Branch · symbols-upgrade</p>
        <h1>Symbols Upgrade — Showcase</h1>
        <p className="sx-sub">
          Planet glyphs, auth-step icons and synastry aspect glyphs, with proposed SVG variants alongside the current symbol.
          Click a card to mark your choice — the picks panel below summarises your selections.
        </p>
      </header>

      {categories.map((cat) => (
        <section className="sx-category" key={cat}>
          <h2 className="sx-cat-title">{cat}</h2>
          {groups
            .filter((g) => g.category === cat)
            .map((g) => (
              <article className="sx-row" key={g.key}>
                <div className="sx-row-head">
                  <div className="sx-row-meta">
                    <span className="sx-row-key">{g.key}</span>
                    <span className="sx-row-context">{g.context}</span>
                  </div>
                </div>

                <div className="sx-grid">
                  <button
                    type="button"
                    className={`sx-card sx-card-current ${picks[g.key] === "current" ? "is-picked" : ""}`}
                    onClick={() => setPicks((p) => ({ ...p, [g.key]: "current" }))}
                  >
                    <div className="sx-tag">CURRENT</div>
                    <div className="sx-glyph">{g.current}</div>
                    <div className="sx-label">{g.currentLabel}</div>
                    <div className="sx-desc">{g.currentNote}</div>
                  </button>

                  {g.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`sx-card ${picks[g.key] === v.id ? "is-picked" : ""}`}
                      onClick={() => setPicks((p) => ({ ...p, [g.key]: v.id }))}
                    >
                      <div className="sx-tag">{v.id.toUpperCase()}</div>
                      <div className="sx-glyph">{v.svg}</div>
                      <div className="sx-label">{v.label}</div>
                      <div className="sx-desc">{v.description}</div>
                    </button>
                  ))}
                </div>
              </article>
            ))}
        </section>
      ))}

      <section className="sx-picks">
        <h2>Your picks</h2>
        {Object.keys(picks).length === 0 ? (
          <p className="sx-picks-empty">Nothing selected yet — click any card to mark your choice.</p>
        ) : (
          <ul>
            {groups
              .filter((g) => picks[g.key])
              .map((g) => {
                const pickId = picks[g.key];
                const label =
                  pickId === "current"
                    ? `CURRENT (${g.currentLabel})`
                    : `${pickId.toUpperCase()} — ${g.variants.find((v) => v.id === pickId)?.label}`;
                return (
                  <li key={g.key}>
                    <span className="sx-picks-key">{g.key}</span>
                    <span className="sx-picks-arrow">→</span>
                    <span className="sx-picks-val">{label}</span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}
