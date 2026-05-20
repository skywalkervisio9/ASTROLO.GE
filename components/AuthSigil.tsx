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
      <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth={0.9} opacity={0.4} className="as-halo" />
      <path
        d="M24 8l3 13 13 3-13 3-3 13-3-13-13-3 13-3z"
        fill="currentColor"
        opacity={0.85}
        className="as-spark"
      />
    </svg>
  );
}

function SignupAsterisk() {
  return (
    <svg viewBox={VB} className="as-svg">
      <circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth={1.4} />
      <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
        <line x1="24" y1="13" x2="24" y2="35" />
        <line x1="14" y1="18.5" x2="34" y2="29.5" />
        <line x1="34" y1="18.5" x2="14" y2="29.5" />
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
      <circle cx="24" cy="24" r="4" fill="currentColor" opacity={0.9} />
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
