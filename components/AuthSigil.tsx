// ============================================================
// Auth-step sigil icons. Each step has its own glyph; the login
// variant gets a subtle hover warp (transform + glow) so users
// notice the entry icon is "alive". Keeping the SVGs inline lets
// us animate them per-variant without a shared symbol sheet.
// ============================================================
import React from 'react';

type Kind = 'login' | 'signup' | 'forgot' | 'birth';

const VB = '0 0 48 48';

function LoginSparkle() {
  return (
    <svg viewBox={VB} className="as-svg as-login">
      <path
        d="M24 2l3.5 17.5L44 24l-16.5 4.5L24 46l-3.5-17.5L4 24l16.5-4.5z"
        fill="currentColor"
        opacity={0.9}
        className="as-spark"
      />
    </svg>
  );
}

function SignupAsterisk() {
  return (
    <svg viewBox={VB} className="as-svg">
      <g stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
        <line x1="24" y1="3" x2="24" y2="45" />
        <line x1="6" y1="13" x2="42" y2="35" />
        <line x1="42" y1="13" x2="6" y2="35" />
      </g>
    </svg>
  );
}

function ForgotKey() {
  return (
    <svg viewBox={VB} className="as-svg">
      <circle cx="16" cy="20" r="6" fill="none" stroke="currentColor" strokeWidth={1.6} />
      <circle cx="16" cy="20" r="2" fill="currentColor" />
      <path
        d="M22 20h18M34 20v6M40 20v4"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M38 32l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z"
        fill="currentColor"
        opacity={0.75}
      />
    </svg>
  );
}

function BirthBurst() {
  return (
    <svg viewBox={VB} className="as-svg">
      <g className="as-rays" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none">
        <line x1="24" y1="4" x2="24" y2="14" />
        <line x1="24" y1="34" x2="24" y2="44" />
        <line x1="4" y1="24" x2="14" y2="24" />
        <line x1="34" y1="24" x2="44" y2="24" />
        <line x1="10" y1="10" x2="16" y2="16" />
        <line x1="32" y1="32" x2="38" y2="38" />
        <line x1="38" y1="10" x2="32" y2="16" />
        <line x1="16" y1="32" x2="10" y2="38" />
      </g>
      <circle className="as-core" cx="24" cy="24" r="4" fill="currentColor" opacity={0.92} />
    </svg>
  );
}

export default function AuthSigil({ kind }: { kind: Kind }) {
  const inner =
    kind === 'login' ? <LoginSparkle /> :
    kind === 'signup' ? <SignupAsterisk /> :
    kind === 'forgot' ? <ForgotKey /> :
    <BirthBurst />;
  return <div className={`auth-sigil-svg auth-sigil-${kind}`}>{inner}</div>;
}
