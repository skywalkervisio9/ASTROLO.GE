"use client";
/* eslint-disable react/no-unescaped-entities */

/** Full app markup (formerly content/body.html). */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import SynastryViewWrapper from './synastry/SynastryViewWrapper';

// Dev-mode unlock: the ⚙ DEV toggle bar at the bottom is the entry point on
// every device. Tapping it while locked prompts for the password; while
// unlocked it just expands/collapses the panel. The dev controls and the
// auth-page Test User buttons only render once unlocked.
const DEV_MODE_KEY = 'astrolo:dev-mode';
const DEV_MODE_PASSWORD = 'astrolo';

// localStorage-backed external store. The `storage` event only fires across
// tabs, so we also dispatch a same-tab CustomEvent on writes.
const DEV_MODE_EVENT = 'astrolo:dev-mode-change';
const subscribeDevMode = (cb: () => void) => {
  window.addEventListener('storage', cb);
  window.addEventListener(DEV_MODE_EVENT, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(DEV_MODE_EVENT, cb);
  };
};
const getDevModeSnapshot = () => window.localStorage.getItem(DEV_MODE_KEY) === '1';
const getDevModeServerSnapshot = () => false;
const setDevModeFlag = (on: boolean) => {
  if (on) window.localStorage.setItem(DEV_MODE_KEY, '1');
  else window.localStorage.removeItem(DEV_MODE_KEY);
  window.dispatchEvent(new CustomEvent(DEV_MODE_EVENT));
};

type ProtoGlobals = {
  switchView?: (view: string, btn?: HTMLElement) => void;
  switchSynastry?: (mode: string, btn: HTMLElement) => void;
  setMode?: (mode: string, btn: HTMLElement) => void;
  setTier?: (tier: string, btn: HTMLElement) => void;
  toggleSlot?: (slot: number, btn: HTMLElement) => void;
  occupySlot?: (slot: number, btn: HTMLElement) => void;
  toggleDiscount?: (btn: HTMLElement) => void;
  openSidebar?: () => void;
  closeSidebar?: () => void;
  openInviteModal?: () => void;
  closeInviteModal?: () => void;
  selectInviteType?: (type: string, el: HTMLElement) => void;
  generateInviteLink?: () => void;
  copyInviteLink?: (btn: HTMLElement) => void;
  showUpgrade?: () => void;
  showPaymentPage?: (type: string) => void;
  selectPayMethod?: (method: string, el: HTMLElement) => void;
  setLang?: (l: string, b: HTMLElement) => void;
  shareReading?: () => void;
  shareToSocial?: (platform: string) => void;
  go?: (id: string) => void;
  toggleExp?: (btn: HTMLElement) => void;
  showAuthPage?: (id: string) => void;
  goAuthStep?: (n: number) => void;
  togglePw?: (btn: HTMLElement) => void;
  selectGender?: (el: HTMLElement, v: string) => void;
  toggleTimeUnknown?: () => void;
  handleGoogle?: () => void;
  handleLogin?: () => void;
  handleSignup?: () => void;
  handleForgot?: () => void;
  handleBirthData?: () => void;
  startLoading?: () => void;
  openSettings?: () => void;
};

// ── Dev helper: sign in as a test user, then confirm the session is
// actually in the cookie before navigating. Without this wait, the next
// server render at /r/[slug] can run before the Supabase session cookie
// lands, and the page renders as a guest instead of the owner.
async function devSignInAndGo(data: {
  email: string;
  password: string;
  shareSlug?: string | null;
}) {
  const { createClient } = await import('@/lib/supabase/client');
  const sb = createClient();
  const { data: signInData, error } = await sb.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });
  if (error || !signInData.session) {
    console.error('[dev] sign-in failed', { email: data.email, error });
    alert(`Dev sign-in failed for ${data.email}: ${error?.message ?? 'no session'}\n\nThe password in /api/dev/test-user may not match this account.`);
    return;
  }
  console.log('[dev] signed in as', data.email, 'user_id:', signInData.session.user.id);

  // Poll getSession() briefly — @supabase/ssr writes the cookie as part
  // of signInWithPassword, but the storage adapter resolves a tick later.
  for (let i = 0; i < 20; i++) {
    const { data: { session } } = await sb.auth.getSession();
    if (session) break;
    await new Promise(r => setTimeout(r, 50));
  }

  const target = data.shareSlug ? `/r/${data.shareSlug}` : window.location.pathname;
  window.location.assign(target);
}

export default function BodyContent() {
  const devMode = useSyncExternalStore(subscribeDevMode, getDevModeSnapshot, getDevModeServerSnapshot);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const unlockInputRef = useRef<HTMLInputElement>(null);

  const openUnlockDialog = useCallback(() => {
    setUnlockError(null);
    setUnlockOpen(true);
    setTimeout(() => unlockInputRef.current?.focus(), 0);
  }, []);

  const closeUnlockDialog = useCallback(() => {
    setUnlockOpen(false);
    setUnlockError(null);
    if (unlockInputRef.current) unlockInputRef.current.value = '';
  }, []);

  const submitUnlock = useCallback(() => {
    const pw = unlockInputRef.current?.value ?? '';
    if (pw === DEV_MODE_PASSWORD) {
      setDevModeFlag(true);
      closeUnlockDialog();
    } else {
      setUnlockError('Incorrect password');
    }
  }, [closeUnlockDialog]);

  const onDevToggleClick = useCallback(() => {
    if (!getDevModeSnapshot()) {
      openUnlockDialog();
      return;
    }
    document.getElementById('devPanel')?.classList.toggle('open');
  }, [openUnlockDialog]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { unlockDev?: () => void; lockDev?: () => void };
    w.unlockDev = openUnlockDialog;
    w.lockDev = () => setDevModeFlag(false);
    return () => {
      delete w.unlockDev;
      delete w.lockDev;
    };
  }, [openUnlockDialog]);

  return (
<div>
<div className="stars" id="stars"></div>
<canvas id="shootingStar" style={{position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 300}}></canvas>
<div className="pbar" id="prog"></div>


<svg xmlns="http://www.w3.org/2000/svg" style={{display: 'none'}}><defs>
<symbol id="gl-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></symbol>
<symbol id="gl-moon" viewBox="0 0 24 24"><path d="M16 4a8 8 0 1 0 0 16 6 6 0 0 1 0-16z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></symbol>
<symbol id="gl-venus" viewBox="0 0 24 24"><circle cx="12" cy="9" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="14" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="9" y1="19" x2="15" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></symbol>
<symbol id="gl-mars" viewBox="0 0 24 24"><circle cx="10" cy="14" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><line x1="14" y1="10" x2="20" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><polyline points="15,4 20,4 20,9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></symbol>
<symbol id="gl-sparkle" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" fill="currentColor" opacity=".8"/></symbol>
<symbol id="gl-brand-sparkle" viewBox="0 0 24 24"><path d="M12 1.5l2.6 7.8L22.5 12l-7.9 2.7L12 22.5l-2.6-7.8L1.5 12l7.9-2.7z" fill="currentColor"/></symbol>
<symbol id="gl-node" viewBox="0 0 24 24"><circle cx="8" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M8 12V6M16 12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></symbol>
<symbol id="gl-diamond" viewBox="0 0 24 24"><path d="M12 2L22 12L12 22L2 12Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></symbol>

<symbol id="gl-libra" viewBox="0 0 24 24"><path d="M4 18h16M4 15h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/><path d="M12 15c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" stroke="currentColor" strokeWidth="1.3" fill="none"/></symbol>

<symbol id="gl-aries" viewBox="0 0 24 24"><path d="M12 22V6M12 6c0-2 2-4 5-4s4 2 4 4-2 4-4 7M12 6c0-2-2-4-5-4S3 4 3 6s2 4 4 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></symbol>
<symbol id="gl-taurus" viewBox="0 0 24 24"><circle cx="12" cy="15" r="6" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M4 4c2 4 5 5 8 5s6-1 8-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></symbol>
<symbol id="gl-gemini" viewBox="0 0 24 24"><path d="M6 3c3 2 6 2 12 0M6 21c3-2 6-2 12 0M8 3v18M16 3v18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></symbol>
<symbol id="gl-cancer" viewBox="0 0 24 24"><circle cx="8" cy="10" r="4" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="16" cy="14" r="4" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M12 10c4 0 8-1 9-5M12 14c-4 0-8 1-9 5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></symbol>
<symbol id="gl-leo" viewBox="0 0 24 24"><circle cx="8" cy="14" r="4" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M12 14c0-4 2-8 5-8s4 2 4 5c0 4-3 6-3 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></symbol>
<symbol id="gl-virgo" viewBox="0 0 24 24"><path d="M4 4v14c0 2 1 3 3 3M10 4v14c0 2 1 3 3 3s3-2 3-4V4M16 12c2 2 4 4 4 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></symbol>
<symbol id="gl-scorpio" viewBox="0 0 24 24"><path d="M4 4v14c0 2 1 3 3 3M10 4v14c0 2 1 3 3 3M16 4v14c0 2 1 3 3 1l2-2M19 14l2 2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></symbol>
<symbol id="gl-sagittarius" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><polyline points="12,4 20,4 20,12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="7" y1="13" x2="13" y2="19" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></symbol>
<symbol id="gl-capricorn" viewBox="0 0 24 24"><path d="M5 4v12c0 3 2 5 5 5s4-2 4-4V4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M14 14c2 0 4 1 5 3s1 4-1 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></symbol>
<symbol id="gl-aquarius" viewBox="0 0 24 24"><path d="M3 9l3 3 3-3 3 3 3-3 3 3 3-3M3 15l3 3 3-3 3 3 3-3 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></symbol>
<symbol id="gl-pisces" viewBox="0 0 24 24"><path d="M6 3c0 6-1 9 0 12s1 3 0 6M18 3c0 6 1 9 0 12s-1 3 0 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></symbol>

<symbol id="gl-share" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="6" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="18" cy="19" r="3" fill="none" stroke="currentColor" strokeWidth="1.4"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" strokeWidth="1.4"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" strokeWidth="1.4"/></symbol>
<symbol id="gl-arrow-up" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></symbol>
<symbol id="gl-print" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></symbol>
<symbol id="gl-mercury" viewBox="0 0 24 24"><circle cx="12" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.4"/><line x1="12" y1="15" x2="12" y2="22" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="9" y1="19" x2="15" y2="19" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M7 5a6 6 0 0110 0" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></symbol>
<symbol id="gl-jupiter" viewBox="0 0 24 24"><path d="M14 4v16M10 12h10M6 4c4 0 6 3 6 8s-2 8-6 8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></symbol>
<symbol id="gl-neptune" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="8" y1="18" x2="16" y2="18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M5 10l3.5-4L12 10l3.5-4L19 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></symbol>
<symbol id="gl-uranus" viewBox="0 0 24 24"><circle cx="12" cy="17" r="4" fill="none" stroke="currentColor" strokeWidth="1.4"/><line x1="12" y1="13" x2="12" y2="2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="8" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="12" cy="2" r="1.2" fill="currentColor"/></symbol>
<symbol id="gl-lilith" viewBox="0 0 24 24"><path d="M12 3c-4 0-6 3-6 6s3 5 6 5 6-2 6-5-2-6-6-6z" fill="none" stroke="currentColor" strokeWidth="1.3"/><line x1="12" y1="14" x2="12" y2="22" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="8" y1="18" x2="16" y2="18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></symbol>
<symbol id="gl-saturn" viewBox="0 0 24 24"><path d="M8 2l-3 3M5 5l2 2M9 9c-3 3-3 7 0 10s7 3 10 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="9" y1="9" x2="9" y2="20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="6" y1="14" x2="12" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></symbol>
<symbol id="gl-pluto" viewBox="0 0 24 24"><circle cx="12" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M12 7m-2 0a2 2 0 104 0 2 2 0 10-4 0" fill="none" stroke="currentColor" strokeWidth="1.2"/><line x1="12" y1="12" x2="12" y2="20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="8" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></symbol>
    <symbol id="gl-asc" viewBox="0 0 24 24"><path d="M12 3L6 21h2.5l1.5-5h8l1.5 5H22L12 3z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></symbol>
    <symbol id="gl-conjunction" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.4"/><line x1="12" y1="5" x2="12" y2="2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></symbol>
    <symbol id="gl-trine" viewBox="0 0 24 24"><path d="M12 3L22 20H2L12 3z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></symbol>
    <symbol id="gl-square" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></symbol>
    <symbol id="gl-sextile" viewBox="0 0 24 24"><path d="M12 2l2.6 4.5H22l-3.7 6L22 17.5h-7.4L12 22l-2.6-4.5H2l3.7-5.5L2 7.5h7.4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></symbol>
    <symbol id="gl-opposition" viewBox="0 0 24 24"><circle cx="5" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="19" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.4"/><line x1="8.5" y1="12" x2="15.5" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></symbol>
    <symbol id="gl-numbers" viewBox="0 0 24 24"><text x="4" y="14" fontFamily="Cormorant Garamond,serif" fontSize="12" fill="currentColor" fontWeight="400">1</text><text x="12" y="20" fontFamily="Cormorant Garamond,serif" fontSize="10" fill="currentColor" fontWeight="300" opacity=".7">9</text><text x="14" y="10" fontFamily="Cormorant Garamond,serif" fontSize="9" fill="currentColor" fontWeight="300" opacity=".5">7</text></symbol>
    <symbol id="gl-yinyang" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M12 2a10 10 0 000 20c0-5.5-2.5-10 0-10s0 4.5 0 10" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="12" cy="17" r="1.5" fill="none" stroke="currentColor" strokeWidth="1"/></symbol>
</defs></svg>


<div className="account-dd" id="accountDD" onClick={(e) => e.stopPropagation()}>
<div className="sb-header">
<span className="sb-tier premium" id="sbTier" style={{position:'absolute',top:'50px',right:'16px'}}><span className="dot"></span> PREMIUM</span>
<div className="sb-avatar"></div>
<div className="sb-info"><div className="sb-name"></div><div className="sb-email"></div></div>
<button className="stg-gear" id="stgBtn" type="button" aria-label="Settings" onClick={(e) => { e.stopPropagation(); (window as unknown as ProtoGlobals).openSettings?.(); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.08a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.08a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button>
</div>


<div className="sb-section" id="navSection">
<div className="sb-section-title">ჩემი რუკა<span className="sb-dob" id="sbDob"></span></div>
<div className="sb-nav-row" id="sbNavRow">
  <div className="sb-nav-item active" onClick={() => { alert("→ ნატალური რუკა"); }}><span className="sb-nav-icon"><svg><use href="#gl-sun"/></svg></span><div className="sb-nav-text"><span className="sb-nav-label">ნატალური რუკა</span></div></div>
  <div className="sb-nav-item has-partner" id="synNavItem" onClick={() => { alert("→ სინასტრია"); }}><span className="sb-nav-icon"><svg><use href="#gl-venus"/></svg></span><div className="sb-nav-text"><span className="sb-nav-label">სინასტრია</span><span className="sb-nav-partner" id="synPartnerName">(გიორგი მაისურაძე)</span></div><span className="mode-badge couple" id="modeBadge">მეწყვილე</span></div>
  <div className="sb-nav-item invite-btn" id="inviteNavBtn" onClick={() => { (window as unknown as ProtoGlobals).showUpgrade?.(); }}><span className="sb-nav-icon">+</span><div className="sb-nav-text"><span className="sb-nav-label" id="inviteBtnLabel">მოწვევა</span></div></div>
</div>
</div>


<div className="sb-section"><div className="sb-section-title">გაზიარება</div>
<button className="sb-share-main" onClick={() => { (window as unknown as ProtoGlobals).shareReading?.(); }} style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px', background: 'rgba(201,168,76,.04)', border: '1px solid rgba(201,168,76,.1)', borderRadius: '10px', color: 'var(--gold)', fontFamily: 'var(--fb)', fontSize: '.74rem', cursor: 'pointer', transition: 'all .35s', marginBottom: '8px'}}><svg style={{width: '13px', height: '13px', fill: 'var(--gold)'}}><use href="#gl-share"/></svg> რუკის გაზიარება</button>
<div className="sb-share-inline">
<button className="sb-share-icon" onClick={() => { (window as unknown as ProtoGlobals).shareToSocial?.("fb"); }} title="Facebook"><svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></button>
<button className="sb-share-icon" onClick={() => { (window as unknown as ProtoGlobals).shareToSocial?.("ig"); }} title="Instagram"><svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></button>
<button className="sb-share-icon" onClick={() => { window.print(); }} title="Print"><svg><use href="#gl-print"/></svg></button>
</div></div>

<div className="sb-footer"><button className="sb-logout" onClick={() => { alert("გასვლა..."); }}>გასვლა</button></div>
</div>


<div className="invite-modal" id="inviteModal">
<div className="invite-modal-bg" onClick={() => { (window as unknown as ProtoGlobals).closeInviteModal?.(); }}></div>
<div className="invite-modal-card">
<div className="invite-title" id="inviteModalTitle">ვის ეგზავნება ბმული?</div>
<div className="invite-sub" id="inviteModalSub">აირჩიე კავშირის ტიპი — ბმული ავტომატურად გენერირდება</div>
<div className="invite-price-tag" id="invitePriceTag"></div>
<div className="invite-opts" id="inviteOptsWrap">
  <div className="invite-opt" onClick={(e) => { (window as unknown as ProtoGlobals).selectInviteType?.("couple", e.currentTarget); }}>
    <span className="invite-opt-icon"><span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span> <span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span></span>
    <div className="invite-opt-label">მეწყვილე</div>
    <div className="invite-opt-desc">რომანტიკული პარტნიორი — სრული სინასტრია</div>
  </div>
  <div className="invite-opt" onClick={(e) => { (window as unknown as ProtoGlobals).selectInviteType?.("friend", e.currentTarget); }}>
    <span className="invite-opt-icon">✦ ✦</span>
    <div className="invite-opt-label">მეგობარი</div>
    <div className="invite-opt-desc">მეგობრული თავსებადობა — ზოგადი ანალიზი</div>
  </div>
</div>

<div className="invite-upgrade" id="inviteUpgrade" style={{display: 'none'}}>
  <div className="upgrade-icon">✦</div>
  <div className="upgrade-text">სინასტრიის ფუნქცია ხელმისაწვდომია მხოლოდ პრემიუმ ანგარიშით</div>
  <div className="upgrade-price"><strong>₾15</strong> ერთჯერადი</div>
  <button className="btn-cta-green" onClick={() => { (window as unknown as ProtoGlobals).showPaymentPage?.("premium"); (window as unknown as ProtoGlobals).closeInviteModal?.(); }} style={{maxWidth:'280px', margin:'0 auto'}}>გახდი პრემიუმი</button>
</div>
<div className="invite-link-box" id="inviteLinkBox">
  <span className="invite-link-url" id="inviteLinkUrl">astrolo.ge/inv/x7k9m2p</span>
  <button className="invite-link-copy" onClick={(e) => { (window as unknown as ProtoGlobals).copyInviteLink?.(e.currentTarget); }}>კოპირება</button>
</div>
<div className="invite-actions" id="inviteActions">
  <button className="invite-btn-secondary" onClick={() => { (window as unknown as ProtoGlobals).closeInviteModal?.(); }}>დახურვა</button>
  <button className="invite-btn-primary" id="inviteGenBtn" disabled onClick={() => { (window as unknown as ProtoGlobals).generateInviteLink?.(); }}>აირჩიე ტიპი</button>
</div>
</div>
</div>


<button className="scroll-top" id="scrollTop" onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); }}><svg style={{width: '16px', height: '16px', fill: 'var(--gold)'}}><use href="#gl-arrow-up"/></svg></button>


<nav className="tb">
<a className="tbl" href="#" aria-label="ASTROLO.GE"><span className="lm"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#gl-brand-sparkle"/></svg></span><span className="lt">ASTROLO<span className="lt-ge"><span className="lt-dot">.</span>GE</span></span></a>
<div className="tbr"><div className="lg"><button className="lo active" onClick={(e) => { (window as unknown as ProtoGlobals).setLang?.("ka", e.currentTarget); }}>ქარ</button><button className="lo" onClick={(e) => { (window as unknown as ProtoGlobals).setLang?.("en", e.currentTarget); }}>EN</button></div>
<button type="button" className="pb" onClick={() => { (window as unknown as ProtoGlobals).openSidebar?.(); }}><div className="pa"></div><span className="pn"></span></button></div></nav>




<div id="view-natal">

<div className="hero"><div className="hero-glow"></div>
<div className="sigil"><svg className="mini-chart" id="miniChart" viewBox="-40 -40 500 500" style={{overflow: 'visible'}}></svg><div className="chart-tip" id="chartTip"><div className="tip-planet"></div><div className="tip-sign"></div><div className="tip-house"></div></div></div>
<div className="hero-sub">სულის ნახაზი</div>
<h1>ნატალური რუკის წაკითხვა</h1>
<div className="hero-chips"></div></div>


<div className="nb"><div className="ct"></div></div>

{/* Content sections injected by hydrateReading() */}
<div className="ct" id="readingSkeletonHost"></div>


{/* ── REMOVED: 8 hardcoded demo sections (s1-s8) ── hydrateReading() builds all content dynamically ── */}


<footer className="footer"><div className="ct">
<div className="footer-social">
<a href="#" className="social-link" title="Instagram"><svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>
<a href="#" className="social-link" title="Facebook"><svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
<a href="#" className="social-link" title="TikTok"><svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a>
</div>
<div className="footer-links"><a href="#">ჩვენს შესახებ</a><a href="#">კონფიდენციალობა</a><a href="#">პირობები</a><a href="#">კონტაქტი</a></div>
<div className="footer-copy">© 2026 ASTROLO.GE</div>
</div></footer>
</div>




<div id="view-synastry">
<SynastryViewWrapper />
</div>





<div id="view-auth">
<div className="auth-wrap" id="authWrap">
  <div className="auth-card">
    <div className="steps-bar" id="stepsBar">
      <div className="step-dot active" id="sd1"></div><div className="step-line" id="sl1"></div>
      <div className="step-dot" id="sd2"></div><div className="step-line" id="sl2"></div>
      <div className="step-dot" id="sd3"></div>
    </div>

    
    <div className="auth-page active" id="page-login">
      <div className="auth-sigil"><div className="auth-sigil-icon">☽</div></div>
      <div className="auth-header"><h1>შესვლა</h1><div className="sub">შენი ციური ნახაზი გელოდება</div></div>
      <div className="auth-panel">
        <div className="msg error" id="login-error"></div>
        <button className="google-btn" onClick={() => { (window as unknown as ProtoGlobals).handleGoogle?.(); }}><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Google-ით შესვლა</button>
        <div className="auth-divider"><span>ან ელ-ფოსტით</span></div>
        <div className="field"><label>ელ-ფოსტა</label><input type="email" id="login-email" placeholder="name@example.com" autoComplete="email" onKeyDown={(e) => { if (e.key === 'Enter') (window as unknown as ProtoGlobals).handleLogin?.(); }}/></div>
        <div className="field"><label>პაროლი</label><div className="field-pw"><input type="password" id="login-pw" placeholder="••••••••" autoComplete="current-password" onKeyDown={(e) => { if (e.key === 'Enter') (window as unknown as ProtoGlobals).handleLogin?.(); }}/><button className="pw-toggle" onClick={(e) => { (window as unknown as ProtoGlobals).togglePw?.(e.currentTarget); }}>ჩვენება</button></div></div>
        <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '16px'}}><a href="#" onClick={(e) => { e.preventDefault(); (window as unknown as ProtoGlobals).showAuthPage?.("page-forgot"); }} style={{fontSize: '.72rem', color: 'var(--gd)', textDecoration: 'none', transition: 'color .3s'}}>დაგავიწყდა?</a></div>
        <button className="auth-btn" onClick={() => { (window as unknown as ProtoGlobals).handleLogin?.(); }}><span className="btn-text">შესვლა</span></button>
        <div className="nav-row" style={{marginTop: '10px'}}><button className="auth-btn-ghost" onClick={() => { (window as unknown as ProtoGlobals).showAuthPage?.("page-signup"); }} style={{width: '100%'}}>რეგისტრაცია →</button></div>
        {devMode && <div className="nav-row" style={{marginTop: '8px'}}><button className="auth-btn-ghost" onClick={() => { (window as unknown as Record<string, () => void>).handleTestUser?.(); }} style={{width: '100%', color: 'var(--fire)', borderColor: 'rgba(212,100,74,.15)', fontSize: '.66rem'}}>⚡ Test User</button></div>}
      </div>
    </div>

    
    <div className="auth-page" id="page-signup">
      <div className="auth-sigil"><div className="auth-sigil-icon">✦</div></div>
      <div className="auth-header"><h1>რეგისტრაცია</h1><div className="sub">დაიწყე შენი ციური მოგზაურობა</div></div>
      <div className="auth-panel">
        <div className="msg error" id="signup-error"></div>
        <div className="invite-badge" id="invite-badge" style={{display: 'none'}}><span className="inv-dot"></span> მოწვევა: სინასტრია</div>
        <button className="google-btn" onClick={() => { (window as unknown as ProtoGlobals).handleGoogle?.(); }}><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Google-ით რეგისტრაცია</button>
        <div className="auth-divider"><span>ან ელ-ფოსტით</span></div>
        <div className="field"><label>სახელი</label><input type="text" id="signup-name" autoComplete="name"/></div>
        <div className="field"><label>ელ-ფოსტა</label><input type="email" id="signup-email" placeholder="name@example.com" autoComplete="email"/></div>
        <div className="field"><label>პაროლი</label><div className="field-pw"><input type="password" id="signup-pw" placeholder="მინ. 8 სიმბოლო" autoComplete="new-password"/><button className="pw-toggle" onClick={(e) => { (window as unknown as ProtoGlobals).togglePw?.(e.currentTarget); }}>ჩვენება</button></div></div>
        <button className="auth-btn" onClick={() => { (window as unknown as ProtoGlobals).handleSignup?.(); }} style={{marginTop: '4px'}}><span className="btn-text">რეგისტრაცია</span></button>
        <div className="terms">რეგისტრაციით ეთანხმები <a href="#">პირობებს</a> და <a href="#">კონფიდენციალობას</a></div>
        <div className="auth-footer">უკვე გაქვს ანგარიში? <a href="#" onClick={(e) => { e.preventDefault(); (window as unknown as ProtoGlobals).showAuthPage?.("page-login"); }}>შესვლა</a></div>
      </div>
    </div>

    
    <div className="auth-page" id="page-forgot">
      <div className="auth-sigil"><div className="auth-sigil-icon">✧</div></div>
      <div className="auth-header"><h1>პაროლის აღდგენა</h1><div className="sub">შეიყვანე ელ-ფოსტა</div></div>
      <div className="auth-panel">
        <button className="back-link" onClick={() => { (window as unknown as ProtoGlobals).showAuthPage?.("page-login"); }}><span>←</span> შესვლაზე დაბრუნება</button>
        <div className="msg error" id="forgot-error"></div>
        <div id="forgot-form"><div className="field"><label>ელ-ფოსტა</label><input type="email" id="forgot-email" placeholder="name@example.com"/></div><button className="auth-btn" onClick={() => { (window as unknown as ProtoGlobals).handleForgot?.(); }}><span className="btn-text">ბმულის გაგზავნა</span></button></div>
        <div id="forgot-success" style={{display: 'none'}}><div className="reset-success"><div className="check-icon">✓</div><h3>ბმული გაგზავნილია</h3><p>თუ ანგარიში არსებობს, მალე მიიღებ აღდგენის ბმულს.</p></div><button className="auth-btn" onClick={() => { (window as unknown as ProtoGlobals).showAuthPage?.("page-login"); }} style={{marginTop: '12px'}}><span className="btn-text">დაბრუნება</span></button></div>
      </div>
    </div>

    
    <div className="auth-page" id="page-birth">
      <div className="auth-sigil"><div className="auth-sigil-icon">⊛</div></div>
      <div className="auth-header"><h1>დაბადების მონაცემები</h1><div className="sub">ნატალური რუკის აგებისთვის</div></div>
      <div className="auth-panel">
        <div className="msg error" id="birth-error"></div>
        <div className="auth-hint"><div className="hint-t">✦ რატომ გვჭირდება?</div><p>ნატალური რუკა ზუსტ პლანეტარულ პოზიციებს ეფუძნება შენი დაბადების მომენტში. რაც უფრო ზუსტი — მით უფრო ღრმა ანალიზი.</p></div>
        <div className="field-row-3"><div className="field"><label>დღე</label><select id="birth-day"><option value="">—</option></select></div><div className="field"><label>თვე</label><select id="birth-month"><option value="">—</option></select></div><div className="field"><label>წელი</label><select id="birth-year"><option value="">—</option></select></div></div>
        <div className="field-row"><div className="field"><label>საათი</label><select id="birth-hour"><option value="">—</option></select></div><div className="field"><label>წუთი</label><select id="birth-min"><option value="">—</option></select></div></div>
        <label className="check-row"><input type="checkbox" id="time-unknown" onChange={() => { (window as unknown as ProtoGlobals).toggleTimeUnknown?.(); }}/><div className="check-box">✓</div><span className="check-label">დაბადების დრო უცნობია</span></label>
        <div className="field" style={{position: 'relative'}}><label>დაბადების ადგილი</label><input type="text" id="birth-place" autoComplete="off" placeholder="ქალაქი, ქვეყანა"/><div className="place-suggestions" id="placeSuggestions"></div></div>
        <label style={{display: 'block', fontSize: '.6rem', letterSpacing: '.14em', color: 'var(--gd)', marginBottom: '6px', fontWeight: 400}}>სქესი</label>
        <div className="gender-row"><div className="gender-opt" data-gender="female" onClick={(e) => { (window as unknown as ProtoGlobals).selectGender?.(e.currentTarget, "female"); }}><span className="g-icon">♀</span>ქალი</div><div className="gender-opt" data-gender="male" onClick={(e) => { (window as unknown as ProtoGlobals).selectGender?.(e.currentTarget, "male"); }}><span className="g-icon">♂</span>კაცი</div></div>
        <button className="auth-btn" onClick={() => { (window as unknown as { __authBirthSubmit?: () => void }).__authBirthSubmit?.(); }} style={{marginTop: '6px'}}><span className="btn-text">რუკის აგება ✦</span></button>
        <div className="nav-row"><button className="auth-btn-ghost" onClick={() => { (window as unknown as ProtoGlobals).goAuthStep?.(1); }}>← უკან</button>{devMode && <button className="auth-btn-ghost" onClick={() => { (window as unknown as Record<string, () => void>).handleTestUser?.(); }} style={{color: 'var(--fire)', borderColor: 'rgba(212,100,74,.15)', fontSize: '.66rem'}}>⚡ Test User</button>}</div>
      </div>
    </div>
  </div>
</div>
</div>


{/* ═══ PAYMENT VIEWS ═══ */}
<div className="payment-view" id="paymentView">
<div className="pay-container" id="payContent">

  {/* ── Premium Upgrade Page ── */}
  <div id="payPremium">
    <div className="pay-sigil"><svg><use href="#gl-sparkle"/></svg></div>
    <div className="pay-badge">PREMIUM — ერთჯერადი გადახდა</div>
    <div className="pay-title">სრული ვარსკვლავური<br/>კითხვა გახსენი</div>
    <div className="pay-subtitle">ყველა 8 სექცია, სინასტრიის წვდომა და მოწვევის საშუალება — ერთხელ, სამუდამოდ.</div>
    <div className="pay-price">
      <span className="pay-price-old" id="payOldPrice" style={{display:'none'}}>₾15</span>
      <span className="pay-price-amount" id="payAmount">₾15</span>
      <span className="pay-discount-badge" id="payDiscountBadge" style={{display:'none'}}>-33%</span>
    </div>
    <div className="pay-note">ყოველთვიური გადასახადი არ არის</div>

    <div className="pay-compare">
      <div className="pay-compare-header">
        <span className="pay-compare-label">FREE vs PREMIUM</span>
        <span className="pay-compare-badge">● PREMIUM</span>
      </div>
      <div className="pay-compare-table">
        <div className="pay-compare-row"><span className="row-label">სექციები</span><span className="row-free">3 სექცია</span><span className="row-premium">8 სექცია ✦</span></div>
        <div className="pay-compare-row"><span className="row-label">სინასტრია</span><span className="row-free">—</span><span className="row-premium">✦ ჩართულია</span></div>
        <div className="pay-compare-row"><span className="row-label">მოწვევა</span><span className="row-free">—</span><span className="row-premium">✦ 1 უფასოდ</span></div>
        <div className="pay-compare-row"><span className="row-label">ვარსკვლავური ბარათები</span><span className="row-free">ნაწილობრივ</span><span className="row-premium">✦ სრულად</span></div>
      </div>
    </div>

    <div className="pay-benefits">
      <div className="pay-benefit"><div className="pay-benefit-icon">✦</div><div className="pay-benefit-text"><h4>ყველა 8 სექცია სრულად</h4><p>მახასიათებლები, ურთიერთობები, საქმე, ჩრდილი, სულიერი, პოტენციალი</p></div></div>
      <div className="pay-benefit"><div className="pay-benefit-icon">☌</div><div className="pay-benefit-text"><h4>სინასტრიის წვდომა</h4><p>მეგობარი ან წყვილი — 6-სექციანი თავსებადობის ანალიზი</p></div></div>
      <div className="pay-benefit"><div className="pay-benefit-icon">✉</div><div className="pay-benefit-text"><h4>1 მოწვევის ბმული — უფასოდ</h4><p>მოწვეულ მომხმარებელს ეძლევა სრული რუკა + სინასტრია</p></div></div>
      <div className="pay-benefit"><div className="pay-benefit-icon">∞</div><div className="pay-benefit-text"><h4>სამუდამო წვდომა</h4><p>ერთხელ გადახდა — ყოველთვის გადახდა</p></div></div>
    </div>
  </div>

  {/* ── Natal Unlock Page (Invited users) ── */}
  <div id="payNatalUnlock" style={{display:'none'}}>
    <div className="pay-sigil"><svg><use href="#gl-sparkle"/></svg></div>
    <div className="pay-badge">ნატალური რუკის განბლოკვა</div>
    <div className="pay-title">სრული ნატალური<br/>რუკის წაკითხვა</div>
    <div className="pay-subtitle">ყველა 8 სექცია — მახასიათებლები, ურთიერთობები, საქმე, ჩრდილი, სულიერი, პოტენციალი.</div>
    <div className="pay-price"><span className="pay-price-amount">₾5</span></div>
    <div className="pay-note">ერთჯერადი გადახდა</div>

    <div className="pay-benefits">
      <div className="pay-benefit"><div className="pay-benefit-icon">✦</div><div className="pay-benefit-text"><h4>ყველა 8 სექცია სრულად</h4><p>მიმოხილვა და მისიის გარდა — დანარჩენი 6 სექციაც გაიხსნება</p></div></div>
      <div className="pay-benefit"><div className="pay-benefit-icon">☌</div><div className="pay-benefit-text"><h4>სინასტრია უკვე ჩართულია</h4><p>შენი სინასტრიის წაკითხვა უკვე ხელმისაწვდომია მოწვევის გზით</p></div></div>
    </div>
  </div>

  {/* ── Synastry Slot Purchase Page ── */}
  <div id="paySynastrySlot" style={{display:'none'}}>
    <div className="pay-sigil"><svg><use href="#gl-conjunction"/></svg></div>
    <div className="pay-badge">დამატებითი სინასტრია</div>
    <div className="pay-title">ახალი სინასტრიის<br/>სლოტის განბლოკვა</div>
    <div className="pay-subtitle">მოიწვიე კიდევ ერთი ადამიანი — მეწყვილე ან მეგობარი — სინასტრიის ანალიზისთვის.</div>
    <div className="pay-price"><span className="pay-price-amount">₾5</span></div>
    <div className="pay-note">ერთჯერადი გადახდა / სლოტზე</div>

    <div className="pay-benefits">
      <div className="pay-benefit"><div className="pay-benefit-icon">✦</div><div className="pay-benefit-text"><h4>ახალი სინასტრიის სლოტი</h4><p>მეწყვილე ან მეგობარი — სრული თავსებადობის ანალიზი</p></div></div>
      <div className="pay-benefit"><div className="pay-benefit-icon">✉</div><div className="pay-benefit-text"><h4>მოწვევის ბმულის გენერაცია</h4><p>გადახდის შემდეგ ავტომატურად მიიღებ ბმულს გასაზიარებლად</p></div></div>
    </div>
  </div>

  {/* ── Shared: Payment Method Selector ── */}
  <div className="pay-method-label">გადახდის მეთოდი</div>
  <div className="pay-methods">
    <div className="pay-method selected" id="payBog" onClick={(e) => { (window as unknown as ProtoGlobals).selectPayMethod?.('bog', e.currentTarget); }}>
      <div className="pay-method-check">✓</div>
      <div className="pay-method-name bog">BOG</div>
      <div className="pay-method-cards">Visa · Mastercard · AmEx</div>
    </div>
    <div className="pay-method" id="payTbc" onClick={(e) => { (window as unknown as ProtoGlobals).selectPayMethod?.('tbc', e.currentTarget); }}>
      <div className="pay-method-check">✓</div>
      <div className="pay-method-name tbc">TBC</div>
      <div className="pay-method-cards">Visa · Mastercard · QR</div>
    </div>
  </div>

  {/* ── Shared: CTA Button ── */}
  <button className="btn-cta-green" id="payCta" onClick={() => { alert('→ გადამისამართება ბანკის გვერდზე…'); }}>
    <span id="payCtaText">✦ PREMIUM-ის განბლოკვა — ₾15</span>
  </button>
</div>
</div>

<div className="loading-overlay" id="loadingScreen">
  <div className="constellation" id="constellation"></div>
  <div className="orrery"><div className="zodiac-ring" id="zodiacRing"></div><div className="orbit o5"></div><div className="orbit o4"></div><div className="orbit o3"></div><div className="orbit o2"></div><div className="orbit o1"></div><div className="orrery-center"></div></div>
  <div className="loading-text"><div className="loading-title">ვარსკვლავები ლაპარაკობენ…</div><div className="loading-msg" id="loadingMsg"></div><div className="loading-progress"><div className="loading-fill" id="loadingFill"></div></div></div>
<div className="fun-fact" id="funFact"><div className="fun-fact-label">✦ იცოდი?</div><p id="funFactText"></p></div>
</div>




{unlockOpen && (
  <div className="dev-unlock-overlay" onClick={closeUnlockDialog}>
    <div className="dev-unlock-card" onClick={(e) => e.stopPropagation()}>
      <div className="dev-unlock-title">Developer access</div>
      <input
        ref={unlockInputRef}
        type="password"
        className="dev-unlock-input"
        placeholder="Password"
        autoComplete="off"
        onKeyDown={(e) => { if (e.key === 'Enter') submitUnlock(); if (e.key === 'Escape') closeUnlockDialog(); }}
      />
      {unlockError && <div className="dev-unlock-error">{unlockError}</div>}
      <div className="dev-unlock-actions">
        <button className="dev-unlock-btn ghost" onClick={closeUnlockDialog}>Cancel</button>
        <button className="dev-unlock-btn primary" onClick={submitUnlock}>Unlock</button>
      </div>
    </div>
  </div>
)}
<div className="dev-panel" id="devPanel">
  <button className="dev-toggle" onClick={onDevToggleClick}>⚙ DEV</button>
  {devMode && (
  <div className="dev-panel-body">
  <div className="dev-row" style={{justifyContent:'flex-end',width:'100%'}}>
    <button className="dev-btn" onClick={() => setDevModeFlag(false)} title="Lock developer mode">🔒 Lock</button>
  </div>
  <div className="dev-label">VIEW</div>
  <button className="dev-btn" onClick={() => { window.location.href = "/auth"; }} id="devAuth">☽ AUTH</button>
  <button className="dev-btn active" onClick={() => { window.location.href = "/"; }} id="devNatal">⊙ NATAL</button>
  <div className="dev-row">
    <button className="dev-btn" onClick={(e) => { (window as unknown as ProtoGlobals).switchSynastry?.("couple", e.currentTarget); }} id="devCouple">☌ COUPLE</button>
    <button className="dev-btn" onClick={(e) => { (window as unknown as ProtoGlobals).switchSynastry?.("friend", e.currentTarget); }} id="devFriend">☌ FRIEND</button>
  </div>
  <div className="dev-sep"></div>
  <div className="dev-label">ACCOUNT</div>
  <div className="dev-row">
    <button className="dev-btn" onClick={(e) => { (window as unknown as ProtoGlobals).setTier?.("free", e.currentTarget); }} id="devFree">FREE</button>
    <button className="dev-btn active" onClick={(e) => { (window as unknown as ProtoGlobals).setTier?.("premium", e.currentTarget); }} id="devPremium">PREMIUM</button>
  </div>
  <div className="dev-row">
    <button className="dev-btn" onClick={(e) => { (window as unknown as ProtoGlobals).setTier?.("invited", e.currentTarget); }} id="devInvited">INVITED</button>
    <button className="dev-btn" onClick={(e) => { (window as unknown as ProtoGlobals).setTier?.("invited-plus", e.currentTarget); }} id="devInvitedPlus">INVITED+</button>
  </div>
  <div className="dev-sep"></div>
  <div className="dev-label">SLOT 1 <span style={{fontSize:'.55rem',opacity:.5}}>override</span></div>
  <div className="dev-row">
    <button className="dev-btn slot-btn" onClick={(e) => { (window as unknown as ProtoGlobals).toggleSlot?.(1, e.currentTarget); }} id="devSlot1Toggle">🔒 locked</button>
    <button className="dev-btn slot-btn" onClick={(e) => { (window as unknown as ProtoGlobals).occupySlot?.(1, e.currentTarget); }} id="devSlot1Occupy">👤 occupy</button>
  </div>

  <div className="dev-row">
    <button className="dev-btn slot-btn" onClick={(e) => { (window as unknown as ProtoGlobals).toggleSlot?.(2, e.currentTarget); }} id="devSlot2Toggle">🔒 locked</button>
    <button className="dev-btn slot-btn" onClick={(e) => { (window as unknown as ProtoGlobals).occupySlot?.(2, e.currentTarget); }} id="devSlot2Occupy">👤 occupy</button>
  </div>
  <div className="dev-sep"></div>
  <div className="dev-label">TEST USER</div>
  <div className="dev-row">
    <button className="dev-btn" id="devPrevPrevLogin" onClick={async (e) => {
      const btn = e.currentTarget;
      btn.textContent = '...';
      try {
        const res = await fetch('/api/dev/test-user?offset=2', { headers: { 'x-dev-password': DEV_MODE_PASSWORD } });
        if (!res.ok) { btn.textContent = 'NONE'; setTimeout(() => { btn.textContent = '⬅⬅ Prev2'; }, 1500); return; }
        const data = await res.json() as { email: string; password: string; shareSlug?: string | null; hasReading: boolean };
        await devSignInAndGo(data);
      } catch { btn.textContent = 'ERROR'; setTimeout(() => { btn.textContent = '⬅⬅ Prev2'; }, 1500); }
    }}>⬅⬅ Prev2</button>
    <button className="dev-btn" id="devPrevLogin" onClick={async (e) => {
      const btn = e.currentTarget;
      btn.textContent = '...';
      try {
        const res = await fetch('/api/dev/test-user?offset=1', { headers: { 'x-dev-password': DEV_MODE_PASSWORD } });
        if (!res.ok) { btn.textContent = 'NONE'; setTimeout(() => { btn.textContent = '⬅ Prev'; }, 1500); return; }
        const data = await res.json() as { email: string; password: string; shareSlug?: string | null; hasReading: boolean };
        await devSignInAndGo(data);
      } catch { btn.textContent = 'ERROR'; setTimeout(() => { btn.textContent = '⬅ Prev'; }, 1500); }
    }}>⬅ Prev</button>
    <button className="dev-btn" id="devLastUser" onClick={async (e) => {
      const btn = e.currentTarget;
      btn.textContent = '...';
      try {
        const res = await fetch('/api/dev/test-user', { headers: { 'x-dev-password': DEV_MODE_PASSWORD } });
        if (!res.ok) { btn.textContent = 'NONE'; setTimeout(() => { btn.textContent = '🔁 Last'; }, 1500); return; }
        const data = await res.json() as { email: string; password: string; shareSlug?: string | null; hasReading: boolean };
        if (!data.email || !data.password) { btn.textContent = 'NONE'; setTimeout(() => { btn.textContent = '🔁 Last'; }, 1500); return; }
        await devSignInAndGo(data);
      } catch { btn.textContent = 'ERROR'; setTimeout(() => { btn.textContent = '🔁 Last'; }, 1500); }
    }}>🔁 Last</button>
  </div>
  </div>
  )}{/* dev-panel-body */}
</div>
</div>
  );
}
