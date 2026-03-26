"use client";

/** Full app markup (formerly content/body.html). */

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
};

export default function BodyContent() {
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
    <symbol id="gl-numbers" viewBox="0 0 24 24"><text x="4" y="14" fontFamily="Cormorant Garamond,serif" fontSize="12" fill="currentColor" fontWeight="400">1</text><text x="12" y="20" fontFamily="Cormorant Garamond,serif" fontSize="10" fill="currentColor" fontWeight="300" opacity=".7">9</text><text x="14" y="10" fontFamily="Cormorant Garamond,serif" fontSize="9" fill="currentColor" fontWeight="300" opacity=".5">7</text></symbol>
    <symbol id="gl-yinyang" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M12 2a10 10 0 000 20c0-5.5-2.5-10 0-10s0 4.5 0 10" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="12" cy="17" r="1.5" fill="none" stroke="currentColor" strokeWidth="1"/></symbol>
</defs></svg>


<div className="account-dd" id="accountDD" onClick={(e) => e.stopPropagation()}>
<div className="sb-header">
<div className="sb-avatar">ნ</div>
<div className="sb-info"><div className="sb-name">ლუკა პ.</div><div className="sb-email">luka.test@astrolo.ge</div>
<span className="sb-tier premium" id="sbTier"><span className="dot"></span> PREMIUM</span></div></div>


<div className="sb-section" id="navSection">
<div className="sb-section-title">ჩემი რუკა</div>
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
<a className="tbl" href="#"><div className="lm"><svg style={{width: '14px', height: '14px', color: '#f0ead6', fill: '#f0ead6'}}><use href="#gl-sparkle"/></svg></div><span className="lt">ASTROLO.GE</span></a>
<div className="tbr"><div className="lg"><button className="lo active" onClick={(e) => { (window as unknown as ProtoGlobals).setLang?.("ka", e.currentTarget); }}>ქარ</button><button className="lo" onClick={(e) => { (window as unknown as ProtoGlobals).setLang?.("en", e.currentTarget); }}>EN</button></div>
<button className="pb" onClick={() => { (window as unknown as ProtoGlobals).openSidebar?.(); }}><div className="pa">ლ</div><span className="pn">ლუკა.პ</span></button></div></nav>




<div id="view-natal">

<div className="hero"><div className="hero-glow"></div>
<div className="sigil"><svg className="mini-chart" id="miniChart" viewBox="-40 -40 500 500" style={{overflow: 'visible'}}></svg><div className="chart-tip" id="chartTip"><div className="tip-planet"></div><div className="tip-sign"></div><div className="tip-house"></div></div></div>
<div className="hero-sub">სულის ნახაზი</div>
<h1>ნატალური რუკის წაკითხვა</h1>
<div className="hero-chips">
<span><span className="chip-label"><svg style={{color: 'var(--gd)'}}><use href="#gl-sun"/></svg></span> სასწორი 22°20'</span>
<span><span className="chip-label"><svg style={{color: 'var(--gd)'}}><use href="#gl-moon"/></svg></span> ქალწული 2°40'</span>
<span><span className="chip-label">ASC</span> ლომი 17°20'</span>
<span><span className="chip-label">MC</span> კურო 7°39'</span></div></div>


<div className="nb"><div className="ct">
<button className="nbtn active" onClick={() => { (window as unknown as ProtoGlobals).go?.("s1"); }}>მიმოხილვა</button><button className="nbtn" onClick={() => { (window as unknown as ProtoGlobals).go?.("s2"); }}>მისია</button><button className="nbtn locked" onClick={() => { (window as unknown as ProtoGlobals).go?.("s3"); }}>მახასიათებლები<span className="lock-dot"></span></button><button className="nbtn locked" onClick={() => { (window as unknown as ProtoGlobals).go?.("s4"); }}>ურთიერთობები<span className="lock-dot"></span></button><button className="nbtn locked" onClick={() => { (window as unknown as ProtoGlobals).go?.("s5"); }}>საქმე<span className="lock-dot"></span></button><button className="nbtn" onClick={() => { (window as unknown as ProtoGlobals).go?.("s6"); }}>ჩრდილი</button><button className="nbtn locked" onClick={() => { (window as unknown as ProtoGlobals).go?.("s7"); }}>სამშვინველი<span className="lock-dot"></span></button><button className="nbtn locked" onClick={() => { (window as unknown as ProtoGlobals).go?.("s8"); }}>სრულყოფილება<span className="lock-dot"></span></button>
</div></div>

<div className="ct">


<section id="s1"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-sparkle"/></svg></div><h2>ციური არქიტექტურა</h2><div className="st">შენი პლანეტარული ლანდშაფტი</div></div>
<div className="c"><table className="pt"><thead><tr><th>პლანეტა</th><th>ნიშანი</th><th>გრადუსი</th><th>სახლი</th><th>სტიქია</th></tr></thead><tbody>
<tr><td className="pl-btn pl-sun" data-pl="sun"><span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span> მზე</td><td>სასწორი <span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span></td><td>22°20'</td><td>III</td><td><span className="et ea">ჰაერი</span></td></tr>
<tr><td className="pl-btn pl-moon" data-pl="moon"><span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span> მთვარე</td><td>ქალწული <span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span></td><td>2°40'</td><td>II</td><td><span className="et ee">მიწა</span></td></tr>
<tr><td className="pl-btn pl-mercury" data-pl="mercury"><span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span> მერკური</td><td>მორიელი <span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span></td><td>5°55'</td><td>IV</td><td><span className="et ew">წყალი</span></td></tr>
<tr><td className="pl-btn pl-venus" data-pl="venus"><span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span> ვენერა</td><td>სასწორი <span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span></td><td>18°40'</td><td>III</td><td><span className="et ea">ჰაერი</span></td></tr>
<tr><td className="pl-btn pl-mars" data-pl="mars"><span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span> მარსი</td><td>ქალწული <span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span></td><td>5°07'</td><td>II</td><td><span className="et ee">მიწა</span></td></tr>
<tr><td className="pl-btn pl-jupiter" data-pl="jupiter"><span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span> იუპიტერი</td><td>თევზები <span className="gi gi-water"><svg><use href="#gl-pisces"/></svg></span></td><td className="retro">19°32' ℞</td><td>VIII</td><td><span className="et ew">წყალი</span></td></tr>
<tr><td className="pl-btn pl-saturn" data-pl="saturn"><span className="gi gi-pl"><svg><use href="#gl-saturn"/></svg></span> სატურნი</td><td>კურო <span className="gi gi-earth"><svg><use href="#gl-taurus"/></svg></span></td><td className="retro">0°47' ℞</td><td>X</td><td><span className="et ee">მიწა</span></td></tr>
<tr><td className="pl-btn pl-uranus" data-pl="uranus"><span className="gi gi-pl"><svg><use href="#gl-uranus"/></svg></span> ურანი</td><td>მერწყული <span className="gi gi-air"><svg><use href="#gl-aquarius"/></svg></span></td><td className="retro">8°49' ℞</td><td>VII</td><td><span className="et ea">ჰაერი</span></td></tr>
<tr><td className="pl-btn pl-neptune" data-pl="neptune"><span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span> ნეპტუნი</td><td>თხის რქა <span className="gi gi-earth"><svg><use href="#gl-capricorn"/></svg></span></td><td>29°24'</td><td>VI</td><td><span className="et ee">მიწა</span></td></tr>
<tr><td className="pl-btn pl-pluto" data-pl="pluto"><span className="gi gi-pl"><svg><use href="#gl-pluto"/></svg></span> პლუტონი</td><td>მშვილდოსანი <span className="gi gi-fire"><svg><use href="#gl-sagittarius"/></svg></span></td><td>6°18'</td><td>V</td><td><span className="et ef">ცეცხლი</span></td></tr>
</tbody></table><div style={{marginTop: '14px'}}><span className="pb2">ASC <span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span> 17°20'</span><span className="pb2">MC <span className="gi gi-earth"><svg><use href="#gl-taurus"/></svg></span> 7°39'</span><span className="pb2"><span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span> <span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span> 29°54'</span><span className="pb2"><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span> <span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span> 4°03'</span></div></div>

<div className="c"><div className="b">მთავარი ასპექტები</div><h3>პლანეტარული საუბრები</h3>
<div className="al"><span className="asy">☌</span><span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span> მერკური ☌ <span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span> ლილითი — ~5° მორიელი, IV<span className="alb">კონიუნქცია</span></div>
<div className="al"><span className="asy">☌</span><span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span> მთვარე ☌ <span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span> მარსი — ქალწული, II<span className="alb">კონიუნქცია</span></div>
<div className="al"><span className="asy">☌</span><span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span> მზე ☌ <span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span> ვენერა — სასწორი, III<span className="alb">კონიუნქცია</span></div>
<div className="al"><span className="asy">△</span><span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span> მზე/ვენერა △ <span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span> ჩრდ.კვანძი<span className="alb">ტრინი</span></div>
<div className="al"><span className="asy">☍</span><span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span> იუპიტერი ☍ <span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span> მთვარე/მარსი<span className="alb">ოპოზიცია</span></div>
<div className="al"><span className="asy">□</span><span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span> მერკური □ <span className="gi gi-pl"><svg><use href="#gl-uranus"/></svg></span> ურანი<span className="alb">კვადრატი</span></div>
<div className="al"><span className="asy">△</span><span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span> ნეპტუნი △ <span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span> მთვარე/მარსი<span className="alb">ტრინი</span></div>
<div className="al"><span className="asy">⚹</span><span className="gi gi-pl"><svg><use href="#gl-saturn"/></svg></span> სატურნი ⚹ <span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span> იუპიტერი<span className="alb">სექსტილი</span></div>
<button className="tb2" onClick={(e) => { (window as unknown as ProtoGlobals).toggleExp?.(e.currentTarget); }}>ასპექტების ინტერპრეტაცია ↓</button>
<div className="ce"><p><strong><span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span> ☌ <span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span> (მორიელი IV):</strong> გონება და ტაბუ შერწყმულია — ფორენზიკული, ფსიქოლოგიურად მკვეთრი ინტელექტი.</p><p><strong><span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span> ☌ <span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span> (ქალწული II):</strong> ემოციები და ნება შეკრულია. უზარმაზარი პროდუქტიულობა, მაგრამ ემოციური გადაღლის საფრთხე.</p><p><strong><span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span> ☌ <span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span> (სასწორი III):</strong> იდენტობა და სიყვარული განუყრელია.</p><p><strong><span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span> ☍ <span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span>:</strong> სულიერ ნდობასა და მატერიალურ შფოთვას შორის დაძაბულობა.</p><p><strong><span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span> □ <span className="gi gi-pl"><svg><use href="#gl-uranus"/></svg></span>:</strong> გონებრივი ელექტროობა. ინსაითები ელვის სახით.</p></div></div>

<div className="g2">
<div className="c aa"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span> მზე <span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> 22°20' — III</div><h3>სასწორის შუქი — ჰარმონიის ფილოსოფოსი</h3><p>შენს ცენტრში მედიატორის არქეტიპი დგას — კომუნიკაცია შენთვის არა უბრალოდ უნარია, არამედ არსებობის გზა. იდენტობა დიალოგში ყალიბდება, სილამაზის ძიებაში ცოცხლდება.</p><p><strong>ჯვარედინი კავშირი:</strong> მზე (<span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span>) მართავს ლომის ასცენდენტს — მთელი სიცოცხლე ჰარმონიული კომუნიკაციის გავლით მიედინება.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> სცადე ეს კვირაში</div><p>ეძებე გარემო, სადაც დიალოგს აფასებენ. როცა საუბარი ხელოვნებად იქცევა, შენ შიგნიდან ინათებ.</p></div></div>
<div className="c ae"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span> მთვარე <span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span> 2°40' — II</div><h3>ქალწულის მთვარე — წმინდა ანალიტიკოსი</h3><p>შენი ემოციური სხეული წესრიგს ეძებს — გრძნობები თვითშეფასებასთანაა გადაჯაჭვული. როცა ყველაფერი ადგილზეა, შინაგანი სიმშვიდე მოდის; როცა ქაოსია — შფოთვა.</p><p><strong>ჯვარედინი კავშირი:</strong> ნეპტუნის ტრინი (<span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span>△<span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span>) არბილებს სიხისტეს — ინტუიცია შრომისმოყვარეობას ავსებს.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> ჩუმი პრაქტიკა</div><p>შექმენი ერთი რიტუალი პროდუქტიული შედეგის გარეშე. უმიზნო სეირნობა — სწორედ ის განკურნებაა.</p></div></div></div>

<div className="c af"><div className="b">ASC <span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span> 17°20' + <span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span> 29°54' — I</div><h3>ლომის ნათება — კარიბჭე, საიდანაც კარმა შემოდის</h3><p>მაგნიტური აურა შენი ბუნებრივი თვისებაა — ადამიანები შენკენ მიიწევიან, ხშირად შენი ძალისხმევის გარეშე. ჩრდილოეთი კვანძი (<span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span>) ასცენდენტთან ახლოს — <em className="hl">ეს არის მთელი სულის ევოლუციის მიმართულება.</em></p><p><strong>ჯვარედინი კავშირი:</strong> მზე სასწორში (<span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span>) მართავს ლომის ასცენდენტს — გამოსხივება ხიბლით მოდის, არა ძალით.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> გაბედე ეს</div><p>ყურადღება მიაქციე, როგორ იკავებ ფიზიკურ სივრცეს — ტანსაცმელი, პოზა, მოძრაობა.</p></div></div></section>

<div className="sec-div"><div className="sec-div-line"></div></div>


<section id="s2"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-node"/></svg></div><h2>სულის კონტრაქტი</h2><div className="st">რატომ ხარ აქ</div></div>
<div className="c"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span> ლომში 29°54' — I სახლი</div><h3>მსახურებიდან სუვერენიტეტისკენ — ბოლო გამოცდა</h3><p>ანარეტიკული გრადუსი — 29° — „დასრულების გრადუსი." ყოველი არჩევანი ავთენტურობისკენ — დასრულება; ყოველი დამალვა — გამეორება.</p><p>სამხრეთი კვანძი მერწყულში (VII): ჯგუფებში გაქრობა, ემოციების ინტელექტუალიზაცია.</p><p><strong>მზე-ვენერას ტრინი <span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span>:</strong> <em className="hl">არ გჭირდება სხვა ადამიანად გახდე — უბრალოდ იყავი მეტად შენ.</em></p>
<button className="tb2" onClick={(e) => { (window as unknown as ProtoGlobals).toggleExp?.(e.currentTarget); }}>კარმული ანალიზი ↓</button><div className="ce"><p><strong>ჩვევები:</strong> ურთიერთობებში ბევრს იძლევი, ცოტას იღებ. ყურადღების მიღება გაუხერხებელია.</p><p><strong>ზრდის პრაქტიკა:</strong> პირადი სურვილების პრიორიტიზაცია. კომპლიმენტების მიღება გადახვევის გარეშე.</p></div></div>
<div className="g2">
<div className="c aw"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span> იუპიტერი თევზებში ℞ — VIII</div><h3>მისტიკოსის მემკვიდრეობა</h3><p>სულიერი სიბრძნის რეზერვუარი. რეტროგრადული — შიგნით მიმართული. VIII სახლი — სულიერი სიმდიდრე კრიზისით აქტიურდება.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> სცადე ეს კვირაში</div><p>აწარმოე „სინქრონიულობის ჟურნალი." VIII სახლის იუპიტერით, სამყარო დამთხვევების გზით საუბრობს.</p></div></div>
<div className="c ae"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-saturn"/></svg></span> სატურნი კუროში ℞ — X</div><h3>ღირსეულობის კარმული გაკვეთილი</h3><p>სატურნი MC-ზე — ავტორიტეტი მოწიფულობასთან ერთად მოდის. „ნელა ყვავის." რასაც სატურნი აშენებს — მუდმივია.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> შეკითხვა საკუთარი თავისთვის</div><p>იკითხე: „ვაშენებ რაღაცას, რომლითაც 20 წლის შემდეგ ვიამაყებ?"</p></div></div></div>
<div className="c"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span> ლილითი ☌ <span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span> — მორიელი, IV</div><h3>წინაპრის ხმა — ჭრილობიდან ნიჭამდე</h3><p>გადაჩუმებული სიმართლის კარმული ხელმოწერა საოჯახო ხაზში. სადღაც შენს გვარში სიმართლის თქმა საშიში იყო.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> წინაპრული განკურნება</div><p>შექმენი „ოჯახის ჩრდილის ჟურნალი" — წერა (<span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span>) ფარული სიმართლეების (<span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span>/<span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span>) წინაპრულ სახლში (IV) — კარმული განკურნებაა.</p></div></div>
<div className="pq"><p>„შენი მისია — აირჩიო ხილვადობა დამალვის ნაცვლად, სიმართლე კომფორტის ნაცვლად, შემოქმედებითი თამამობა მემკვიდრეობითი სიჩუმის ნაცვლად."</p></div></section>


<div className="lock-wrap locked" id="lock-s3"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-diamond"/></svg></div><h2>შინაგანი ლანდშაფტი</h2><div className="st">რისგან ხარ შექმნილი</div></div><div className="lock-preview"><div className="b">სტიქიური ბალანსი</div><h3>მიწა და ჰაერი — დამიწებული ინტელექტი</h3><div className="lock-hint">✦ ცეცხლი გააძლიერე ფიზიკური აქტივობით — ცეკვა, საბრძოლო ხელოვნება.</div><div className="blur-lines"><div className="blur-line" style={{width: '100%'}}></div><div className="blur-line" style={{width: '93%'}}></div><div className="blur-line" style={{width: '97%'}}></div><div className="blur-line" style={{width: '86%'}}></div><div className="blur-line" style={{width: '91%'}}></div></div><button className="unlock-cta" onClick={() => { (window as unknown as ProtoGlobals).showUpgrade?.(); }}><span>✦</span> სრული წაკითხვის განბლოკვა</button></div></div>
<section id="s3"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-diamond"/></svg></div><h2>შინაგანი ლანდშაფტი</h2><div className="st">რისგან ხარ შექმნილი</div></div>
<div className="c"><div className="b">სტიქიური და მოდალური ბალანსი</div><h3>მიწა და ჰაერი — დამიწებული ინტელექტი</h3><p><span className="pb2"><span className="et ee">მიწა ×4</span> <span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span> <span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span> <span className="gi gi-pl"><svg><use href="#gl-saturn"/></svg></span> <span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span></span><span className="pb2"><span className="et ea">ჰაერი ×3</span> <span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span> <span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span> <span className="gi gi-pl"><svg><use href="#gl-uranus"/></svg></span></span><span className="pb2"><span className="et ew">წყალი ×2</span> <span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span> <span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span></span><span className="pb2"><span className="et ef">ცეცხლი ×1</span> <span className="gi gi-pl"><svg><use href="#gl-pluto"/></svg></span></span></p><p>მიწა + ჰაერი = პრაქტიკული ხილვადობა. ცეცხლის სიმწირე — ენერგია ნელი, მაგრამ ღრმა წვაა.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> ენერგიის ბალანსი</div><ul><li>ცეცხლი გააძლიერე ფიზიკური აქტივობით</li><li>შეურყევადი ვალდებულებები დანიშნე</li><li>ინტროვერტულობა პატივი ეცი, მაგრამ მის უკან არ დაიმალო</li></ul></div></div>
<div className="g2"><div className="c aw"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span> გონებრივი არქიტექტურა</div><h3>მორიელის მერკური — სიღრმის მყვინთელი</h3><p>გონება ფსკერს ეძებს. IV სახლში — ფორენზიკული აზროვნება. <span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span>-თან კონიუნქცია — ტაბუისტური თემებისკენ მიზიდულობა.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> გონების საკვები</div><p>გონებას საიდუმლოებები სჭირდება ამოსახსნელად — კვლევითი პროექტები, ფსიქოლოგიური წიგნები.</p></div></div>
<div className="c aa"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span> ურთიერთობის ინტელექტი</div><h3>ვენერა სასწორში — ესთეტიკოსი დომიცილში</h3><p>ვენერა საკუთარ სახლში — ძლიერი, ელეგანტური. III სახლში — სიყვარულის ენა ინტელექტუალური კომპანიონობა.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> რას ხედავ სარკეში?</div><p>ურთიერთობებში იკითხე: „ეს ადამიანი მხედავს, თუ ჩემს სამსახურს ხედავს?"</p></div></div></div>
<div className="c"><div className="b">პიროვნების სინთეზი</div><h3>როგორ ქსოვს ყველაფერი ერთმანეთში</h3><p><strong>დიპლომატი რენტგენის თვალით</strong> (<span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> + <span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span>): ზუსტად ხედავ და ზუსტად იცი როგორ თქვა.</p><p><strong>პერფექციონისტის ძრავა</strong> (<span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span>☌<span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span> <span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span>): flow state ხელოსნობაში. <span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span> ტრინი — მუშაობა ლოცვად.</p><p><strong>ჩუმი მაგნიტი</strong> (ASC<span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span> + <span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span>): გამოსხივება ძალისხმევის გარეშე.</p><p><strong>ფსიქიკური ღრუბელი</strong> (<span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span><span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span> + <span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span><span className="gi gi-water"><svg><use href="#gl-pisces"/></svg></span>VIII + <span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span>△<span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span>): ფსიქიკურ ინფორმაციას მუდმივად შთანთქავ.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> ყოველდღიური პრაქტიკა</div><ul><li>ენერგეტიკული ჰიგიენა — ყოველდღე</li><li>„უმიზნო დრო" — <span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span> ტრინს სჭირდება</li><li>კომპლიმენტის მიღება: „მადლობა" — მეტი არაფერი</li><li>ყოველდღიური წერა — <span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span> ითხოვს გამოსავალს</li></ul></div></div></section>


<div className="lock-wrap locked" id="lock-s4"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-venus"/></svg></div><h2>გულის არქიტექტურა</h2><div className="st">როგორ უყვარხარ და როგორ გიყვარს</div></div><div className="lock-preview"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span> ვენერა სასწორში — III</div><h3>ინტელექტუალური მიჯაჭვულობა — სიყვარულის ენა</h3><div className="lock-hint">✦ სიყვარულის ენა — ინტელექტუალური კომპანიონობა და ესთეტიკური ჰარმონია.</div><div className="blur-lines"><div className="blur-line" style={{width: '100%'}}></div><div className="blur-line" style={{width: '91%'}}></div><div className="blur-line" style={{width: '96%'}}></div><div className="blur-line" style={{width: '85%'}}></div></div><button className="unlock-cta" onClick={() => { (window as unknown as ProtoGlobals).showUpgrade?.(); }}><span>✦</span> სრული წაკითხვის განბლოკვა</button></div></div>
<section id="s4"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-venus"/></svg></div><h2>გულის არქიტექტურა</h2><div className="st">როგორ უყვარხარ და როგორ გიყვარს</div></div>
<div className="c aa"><div className="b">სიყვარულის ენა და ღირებულებები</div><h3>ვენერა სასწორში — ინტელექტუალური მიჯაჭვულობა</h3><p>სიყვარულის ენა — ინტელექტუალური კომპანიონობა და ესთეტიკური ჰარმონია. ვენერა დომიცილში — სიყვარულში ბუნებრივი ელეგანტურობა. III სახლში — სიყვარული სიტყვით გამოიხატება.</p><p><strong>რას იზიდავ vs რა გჭირდება:</strong> <span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> იზიდავს ჰარმონიას, ინტელექტს, ესთეტიკას. <span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span>-ს სჭირდება წესრიგი, პრაქტიკული ზრუნვა, სხეულის ენა. <em className="hl">ეს დაძაბულობა — სილამაზესა და სიზუსტეს შორის — შენი ურთიერთობების ცენტრალური თემაა.</em></p><p><strong>ტრინი <span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span> ჩრდილოეთ კვანძთან:</strong> სიყვარული ევოლუციის ინსტრუმენტია. ურთიერთობა, რომელიც ავთენტურობისკენ გიბიძგებს — სწორი ურთიერთობაა.</p>
<button className="tb2" onClick={(e) => { (window as unknown as ProtoGlobals).toggleExp?.(e.currentTarget); }}>მიჯაჭვულობის სტილი ↓</button><div className="ce"><p><strong><span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span> + <span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> + <span className="gi gi-pl"><svg><use href="#gl-saturn"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-taurus"/></svg></span>℞:</strong> უსაფრთხო-თავიდან ამრიდებელი ჰიბრიდი. ზრუნავ პრაქტიკულად (<span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span>), მაგრამ ემოციურ სიახლოვეს ინტელექტუალიზებ (<span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span>). სატურნი რეტროგრადული — ნდობა ნელა ყალიბდება.</p><p><strong>ურთიერთობის ნიმუშები:</strong></p><p>1. <strong>„ლამაზი დისტანცია"</strong> (<span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> + <span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span>) — ჰარმონიით დისტანციას ინარჩუნებ.</p><p>2. <strong>„მსახურების ტყვე"</strong> (<span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span> + <span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span><span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span>) — სხვას ემსახურები, საკუთარ სურვილებს ვერ ამბობ.</p><p>3. <strong>„სიმართლის გადავადება"</strong> (<span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span><span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span> + <span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span>) — ხედავ ყველაფერს, მაგრამ ჰარმონიისთვის ჩუმდები.</p></div>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> შეკითხვა სიყვარულისთვის</div><p>იკითხე: „ეს ადამიანი ჩემს სიღრმეს აფასებს, თუ მხოლოდ ჩემს ჰარმონიას?"</p></div></div>

<div className="g2"><div className="c ae"><div className="b">სურვილის ენერგია</div><h3>მარსი ქალწულში — ხელოსნის ვნება</h3><p>სექსუალობა სიზუსტესა და ყურადღებაში გამოიხატება. <span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span>-თან კონიუნქცია — ემოცია და სურვილი გადაჯაჭვულია. დეტალებში ზრუნვა — შენი ეროტიკული ენაა.</p><p><strong>კონფლიქტის სტილი:</strong> მიკრო-აგრესია ნაცვლად ღია კონფრონტაციისა. <span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span> კრიტიკით იბრძვის, არა ყვირილით. <span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span><span className="gi gi-water"><svg><use href="#gl-pisces"/></svg></span> ოპოზიცია — კონფლიქტის შემდეგ სულიერი ნდობის მოთხოვნილება.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> სხეული გეუბნება</div><p>კონფლიქტში: „რას ვგრძნობ?" — არა „რა არის სწორი?"</p></div></div>
<div className="c aa"><div className="b">VII სახლი — სარკე</div><h3>მერწყულის დესცენდენტი — თავისუფლების პროექცია</h3><p>VII სახლის კუსპი მერწყულში — პარტნიორებში ეძებ თავისუფლებას, რომელიც საკუთარ თავში ვერ ხედავ. <span className="gi gi-pl"><svg><use href="#gl-uranus"/></svg></span> ურანი VII სახლში რეტროგრადული — ურთიერთობები მოულოდნელად გარდაიქმნება.</p><p><strong>ინტეგრაციის გასაღები:</strong> <em className="hl">შენ ხარ ის თავისუფალი სული, რომელსაც სხვებში ეძებ.</em> ASC<span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span> → DSC<span className="gi gi-air"><svg><use href="#gl-aquarius"/></svg></span> = გამოსხივება ↔ დამოუკიდებლობა. ორივე შენია.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> რას ხედავ პარტნიორში?</div><p>ყურადღება მიაქციე, რა თვისებები გაღიზიანებს პარტნიორში — ეს შენი დაუინტეგრირებელი ნაწილია.</p></div></div></div>

<div className="c aw"><div className="b">კავშირის ჭრილობა და ნიჭი</div><h3>ინტიმურობის კარიბჭე — სადაც ტკივილი ნიჭად იქცევა</h3><p><span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span> მორიელში IV — ოჯახში სიმართლე საშიში იყო. ეს ინტიმურობაშიც მეორდება: ხედავ ყველაფერს, მაგრამ ჰარმონიისთვის ჩუმდები.</p><p><strong>თავდაცვის მექანიზმი:</strong> ინტელექტუალიზაცია, ემოციური სივრცის კონტროლი. <span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> ფილტრავს, <span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span> აკვირდება, <span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span> ანალიზებს — სამი ფენა პარტნიორსა და შენს სიმართლეს შორის.</p><p><strong>ნიჭი:</strong> <em className="hl">შეგიძლია სხვებს ასწავლო, როგორ მოსმენონ ის, რისი მოსმენაც ეშინიათ.</em></p>
<button className="tb2" onClick={(e) => { (window as unknown as ProtoGlobals).toggleExp?.(e.currentTarget); }}>ინტეგრაციის პრაქტიკა ↓</button><div className="ce"><p>1. <strong>„მიკრო-გულწრფელობა"</strong> — პატარა სიმართლეები ხშირად, ნაცვლად დიდი აფეთქებებისა.</p><p>2. <strong>სხეულის მოსმენა კონფლიქტში:</strong> ყბა, მუცელი, გულმკერდი — სადაც იჭერ, იქ სიმართლეა.</p><p>3. <strong>„ხედვის ჟურნალი":</strong> დაწერე, რას ხედავ პარტნიორში, რასაც ვერ ამბობ. <span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span>-ს წერა სჭირდება.</p><p>4. <strong>ტრანსფორმაციული საუბარი:</strong> „მინდა გითხრა რაღაც, რისი თქმაც მეშინია" — <span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span> + <span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> + <span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span> ერთად.</p></div>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> მინიშნება</div><p>ჭრილობა → სხეული → ხელოვნება → სიბრძნე. <span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span><span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span>IV → <span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span> → <span className="gi gi-pl"><svg><use href="#gl-pluto"/></svg></span><span className="gi gi-fire"><svg><use href="#gl-sagittarius"/></svg></span>V → <span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span><span className="gi gi-water"><svg><use href="#gl-pisces"/></svg></span>VIII</p></div></div>

<div className="c af"><div className="b">ურთიერთობის ევოლუცია</div><h3>რას გასწავლის სიყვარული — კარმული ნიმუშები</h3><p><strong>სამხრეთი კვანძი <span className="gi gi-air"><svg><use href="#gl-aquarius"/></svg></span> VII:</strong> ძველი ნიმუში — ჯგუფებში გაქრობა, ემოციების ინტელექტუალიზაცია, „ყველასთან ერთად, არავისთან ახლოს." კომფორტული, მაგრამ სტაგნაციური.</p><p><strong>ჩრდილოეთი კვანძი <span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span> I:</strong> ახალი გზა — ურთიერთობებში საკუთარი სურვილების გამოხატვა. „მე მინდა" — არა „რა ჯობია ყველასთვის." <em className="hl">ჩრდილოეთი კვანძის ურთიერთობა — ის, რომელიც გაიძულებს ცენტრში დადგე.</em></p><p><strong>განსხვავება:</strong> <span className="gi gi-air"><svg><use href="#gl-aquarius"/></svg></span> ურთიერთობა = მეგობრული, თავისუფალი, ზედაპირული. <span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span> ურთიერთობა = ინტენსიური, ავთენტური, შემაშფოთებელი — მაგრამ ევოლუციური.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> გაბედე ეს</div><p>თუ ურთიერთობაში კომფორტულად გრძნობ თავს, იკითხე: „ვიზრდები, თუ ვიმალები?" <span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span> ზრდას ითხოვს, არა კომფორტს.</p></div></div>
<div className="pq"><p>„სიყვარული შენთვის — სარკეა, რომელშიც ხედავ ყველაფერს, რისი ხილვაც მარტო ვერ ხერხდება. <span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> + <span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span><span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span> + <span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span><span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span> = სიმართლე, სილამაზე, გამბედაობა."</p></div></section>

<div className="sec-div"><div className="sec-div-line"></div></div>


<div className="lock-wrap locked" id="lock-s5"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-mars"/></svg></div><h2>თვითრეალიზაცია</h2><div className="st">რა საქმისთვის მოხვედი</div></div><div className="lock-preview"><div className="b">MC <span className="gi gi-earth"><svg><use href="#gl-taurus"/></svg></span> კურო 7°39'</div><h3>MC კუროში — გამძლეობის მშენებელი</h3><div className="lock-hint">✦ კარიერა ხელშესახებს, ლამაზს და გამძლეს უნდა აწარმოებდეს.</div><div className="blur-lines"><div className="blur-line" style={{width: '100%'}}></div><div className="blur-line" style={{width: '88%'}}></div><div className="blur-line" style={{width: '95%'}}></div><div className="blur-line" style={{width: '82%'}}></div></div><button className="unlock-cta" onClick={() => { (window as unknown as ProtoGlobals).showUpgrade?.(); }}><span>✦</span> სრული წაკითხვის განბლოკვა</button></div></div>
<section id="s5"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-mars"/></svg></div><h2>თვითრეალიზაცია</h2><div className="st">რა საქმისთვის მოხვედი</div></div>
<div className="c"><div className="b">MC <span className="gi gi-earth"><svg><use href="#gl-taurus"/></svg></span> კურო 7°39' — X</div><h3>MC კუროში — გამძლეობის მშენებელი</h3><p>შენი პროფესიული გზა ხელშესახებს, ლამაზს და გამძლეს უნდა აწარმოებდეს. სატურნი MC-სთან (<span className="gi gi-pl"><svg><use href="#gl-saturn"/></svg></span>☌MC) ნიშნავს — ავტორიტეტი მოწიფულობასთან ერთად მოდის, „ნელა ყვავის."</p><button className="tb2" onClick={(e) => { (window as unknown as ProtoGlobals).toggleExp?.(e.currentTarget); }}>პროფესიული გზები ↓</button><div className="ce"><p><strong>Tier 1:</strong> თერაპიული პრაქტიკა, სარედაქციო, კონსულტაცია, დიზაინი</p><p><strong>Tier 2:</strong> ფინანსები, უძრავი ქონება, გასტრონომია</p><p><strong>Tier 3:</strong> ასტროლოგია, წინაპრული განკურნება, ბრენდ-სტრატეგია</p></div></div>
<div className="g2"><div className="c ae"><div className="b">მარსი ქალწულში — II</div><h3>ხელოსნის ძრავა</h3><p>სიზუსტით მოქმედება. <span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span>-თან კონიუნქცია: flow state. <span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span> ტრინი: მუშაობა = მედიტაცია.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> ჰარმონიზაციის რიტუალი</div><p>იპოვე „flow ხელობა" — აქტივობა, სადაც დრო ჩერდება.</p></div></div>
<div className="c aa"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span> სასწორი — III</div><h3>ხიდის მშენებლის ხმა</h3><p>კომუნიკაცია, როგორც ხელოვნება. რთული იდეების ელეგანტურ ფორმაში გარდაქმნის უნარი.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> სცადე ეს კვირაში</div><p>დაიწყე საკომუნიკაციო პროექტი — ბლოგი, პოდკასტი. <span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> სილამაზე + <span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span> სიღრმე + <span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span> სიზუსტე.</p></div></div></div>
<div className="pq"><p>„შენ არა კარიერას აშენებ — არამედ ნაშრომს. ხელშესახებს, ლამაზს, მუდმივს."</p></div></section>


<section id="s6"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-moon"/></svg></div><h2>განდევნილი სიღრმე</h2><div className="st">რა იმალება სინათლის ქვეშ</div></div>
<div className="c"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span> ლილითი ☌ <span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span> — მორიელი, IV</div><h3>გადაჩუმებული სიმართლის ეპიცენტრი</h3><p>ოჯახური კონდიცირება: ზედმეტად ნათლად ხედვა საშიშია.</p><p><strong>გამოვლინებები:</strong> ინფორმაციით კონტროლი. სტრატეგიული სიჩუმე. აფეთქებული გამჟღავნება. ობსესიური რუმინაცია. თვითცენზურა.</p>
<button className="tb2" onClick={(e) => { (window as unknown as ProtoGlobals).toggleExp?.(e.currentTarget); }}>ინტეგრაციის გზა ↓</button><div className="ce"><p>1. <strong>მუხტის ამოცნობა:</strong> ყბის დაჭერა, გულმკერდის წნევა — <span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span> გამოხატვას ითხოვს.</p><p>2. <strong>ჩრდილისა და სიბრძნის გარჩევა.</strong></p><p>3. <strong>უსაფრთხო სივრცეები:</strong> თერაპია, ჟურნალი.</p><p>4. <strong>კალიბრებული სიმართლე:</strong> <span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> + <span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span> + <span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span> = სიმართლე, რომელიც კურნავს.</p></div></div>
<div className="g2"><div className="c"><div className="b"><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> სასწორის ჩრდილი</div><h3>ცრუ მშვიდობისმყოფელის ციხე</h3><p>კომპულსიური ჰარმონია. საკუთარ სიმართლეს ზედაპირს სწირავ.</p><p><strong>ციკლი:</strong> ბრაზის ჩახშობა → სიკეთის თამაში → წყენის დაგროვება → აფეთქება.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> მინიშნება</div><p>„მიკრო-გულწრფელობა" — პატარა სიმართლეები ხშირად.</p></div></div>
<div className="c"><div className="b"><span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span> ქალწულის ჩრდილი</div><h3>შინაგანი ინკვიზიტორი</h3><p><span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span>☌<span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span> ქალწულში — „არ კმარა. ცადე მეტად."</p><p><strong>სხეულში:</strong> საჭმლის მომნელებელი, ყბის დაჭიმვა — ემოციების „დაშბორდი."</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> როცა კრიტიკოსი იღვიძებს...</div><p>როცა კრიტიკოსი აქტიურდება: „ეს ჩემი ხმაა თუ მემკვიდრეობითი?"</p></div></div></div>
<div className="c af"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-pluto"/></svg></span> პლუტონი <span className="gi gi-fire"><svg><use href="#gl-sagittarius"/></svg></span> — V</div><h3>შემოქმედებითი ქვესკნელი</h3><p>ყველაფერი ან არაფერი. სიხარულის შიში — თუ ბავშვობაში სიხარულს დასჯა მოსდევდა.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> ნება დართე</div><p>ნება დართე საკუთარ თავს ცუდად შექმნა. განზრახ, მხიარულად არასრულყოფილი.</p></div></div></section>


<div className="lock-wrap locked" id="lock-s7"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-sparkle"/></svg></div><h2>სამშვინველის გზა</h2><div className="st">სულიერი ზრდის გზა</div></div><div className="lock-preview"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span> იუპიტერი თევზებში ℞ — VIII</div><h3>მისტიკოსის მემკვიდრეობა</h3><div className="lock-hint">✦ რეტროგრადული ბუნება = სიბრძნე შიგნით მიმართული.</div><div className="blur-lines"><div className="blur-line" style={{width: '100%'}}></div><div className="blur-line" style={{width: '90%'}}></div><div className="blur-line" style={{width: '96%'}}></div><div className="blur-line" style={{width: '84%'}}></div></div><button className="unlock-cta" onClick={() => { (window as unknown as ProtoGlobals).showUpgrade?.(); }}><span>✦</span> სრული წაკითხვის განბლოკვა</button></div></div>
<section id="s7"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-sparkle"/></svg></div><h2>სამშვინველის გზა</h2><div className="st">სულიერი ზრდის გზა</div></div>
<div className="c"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span> იუპიტერი თევზებში ℞ — VIII</div><h3>მისტიკოსის მემკვიდრეობა — ნუმინოზურის არხი</h3><p>იუპიტერი რეტროგრადული თევზებში VIII სახლში — პირდაპირი არხი ნუმინოზურთან.</p>
<button className="tb2" onClick={(e) => { (window as unknown as ProtoGlobals).toggleExp?.(e.currentTarget); }}>სულიერი ნიჭები ↓</button><div className="ce"><div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> სულიერი პრაქტიკის მენიუ</div><ul><li>სიზმრების ჟურნალი → <span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span> თევზებში VIII</li><li>წყლის პრაქტიკები → <span className="gi gi-water"><svg><use href="#gl-pisces"/></svg></span> + <span className="gi gi-water"><svg><use href="#gl-cancer"/></svg></span>XII</li><li>წინაპრული მედიტაცია → <span className="gi gi-water"><svg><use href="#gl-cancer"/></svg></span>XII + <span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span>IV</li><li>სხეულზე დაფუძნებული → <span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-capricorn"/></svg></span>VI</li><li>პერიოდული მარტოობა → <span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span>℞</li></ul></div></div></div>
<div className="g2"><div className="c ae"><div className="b"><span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span> ნეპტუნი თხის რქაში — VI</div><h3>წმინდა დისციპლინა</h3><p>სულიერი პრაქტიკა ყოველდღიურ ცხოვრებაში. 29°24' — კარმული პრიორიტეტი.</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> ჩუმი პრაქტიკა</div><p>შექმენი „წმინდა განრიგი" — სხეულის მოვლა, სიჩუმე, შეგნებული მუშაობა.</p></div></div>
<div className="c aw"><div className="b">XII სახლი — კირჩხიბი</div><h3>წინაპრული საკურთხეველი</h3><p><span className="gi gi-water"><svg><use href="#gl-cancer"/></svg></span> XII-ში — სულიერი გამოცდილებები წინაპრულ მეხსიერებას უკავშირდება. <span className="gi gi-water"><svg><use href="#gl-cancer"/></svg></span>XII ↔ <span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span>IV = ერთი ღერძი.</p></div></div>
<div className="c"><div className="b">ევოლუციური სინთეზი</div><h3>ინტეგრირებული სულიერი გზა</h3><p className="hl" style={{fontSize: '1rem', lineHeight: 2}}>გახდი გამოსხივებული არსება (<span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span>/ASC), რომელიც უხილავ სიბრძნეს ჩენელირებს (<span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span><span className="gi gi-water"><svg><use href="#gl-pisces"/></svg></span>VIII), ყოველდღიური პრაქტიკით (<span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-capricorn"/></svg></span>VI), კურნავს წინაპრულ სიჩუმეს (<span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span><span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span>IV / <span className="gi gi-water"><svg><use href="#gl-cancer"/></svg></span>XII), ქმნის სილამაზეს (<span className="gi gi-earth"><svg><use href="#gl-taurus"/></svg></span>MC), და სამყაროს სიმართლეს ელეგანტურობით სთავაზობს (<span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span>III).</p>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> შვიდი საყრდენი</div><ul><li><strong>ხილვადობა:</strong> იყავი ხილული ბოდიშის გარეშე — <span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span></li><li><strong>სიმართლე:</strong> თქვი, რასაც ხედავ, სიყვარულით — <span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span><span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span></li><li><strong>სილამაზე:</strong> ყველაფერს უფრო ლამაზი გახადე — <span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span></li><li><strong>ხელობა:</strong> დახვეწე ოსტატობა მოთმინებით — <span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-moon"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span></li><li><strong>მინდობა:</strong> გაუშვი კონტროლი — <span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span><span className="gi gi-water"><svg><use href="#gl-pisces"/></svg></span>VIII</li><li><strong>სტრუქტურა:</strong> აშენე წმინდა რუტინა — <span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-capricorn"/></svg></span>VI</li><li><strong>წინაპრობა:</strong> განკურნე, რაც შენამდე იყო — <span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span>IV / <span className="gi gi-water"><svg><use href="#gl-cancer"/></svg></span>XII</li></ul></div></div>
<div className="pq"><p>„მოხვედი, რომ აღარ დამალო სინათლე სხვებისთვის მსახურების უკან. კოსმოსი გთხოვს: შექმენი, უხელმძღვანელე, იყავი ხილული."</p></div></section>


<div className="lock-wrap locked" id="lock-s8"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-diamond"/></svg></div><h2>სრულყოფილება</h2><div className="st">უმაღლესი გამოხატულება</div></div><div className="lock-preview"><div className="b">ინტეგრირებული ხედვა</div><h3>როცა ყველაფერი გაცნობიერებულია</h3><div className="lock-hint">✦ ეს არ არის ფანტაზია — ეს შენი რუკის ნახაზია.</div><div className="blur-lines"><div className="blur-line" style={{width: '100%'}}></div><div className="blur-line" style={{width: '91%'}}></div><div className="blur-line" style={{width: '96%'}}></div><div className="blur-line" style={{width: '83%'}}></div></div><button className="unlock-cta" onClick={() => { (window as unknown as ProtoGlobals).showUpgrade?.(); }}><span>✦</span> სრული წაკითხვის განბლოკვა</button></div></div>
<section id="s8"><div className="sh"><div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-diamond"/></svg></div><h2>სრულყოფილება — როცა ყველა ვარსკვლავი ანათებს</h2><div className="st">შენი ცხოვრების უმაღლესი გამოხატულება</div></div>
<div className="c" style={{background: 'linear-gradient(135deg,var(--sf),var(--sf2))', border: '1px solid rgba(201,168,76,.12)'}}><div className="b">ინტეგრირებული ხედვა</div><h3>როცა ყველაფერი გაცნობიერებულია</h3><p><span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span> <span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span> სრულად აქტიურია — გამოსხივება ბუნებრივია. <span className="gi gi-water"><svg><use href="#gl-scorpio"/></svg></span> <span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span> ინტეგრირებულია — სიღრმეებს განკურნებით სთავაზობ. <span className="gi gi-earth"><svg><use href="#gl-taurus"/></svg></span> MC — აშენებულია რაღაც მუდმივი.</p><p><em className="hl">ეს არ არის ფანტაზია — ეს არის შენი რუკის ნახაზი, სრულად გააქტიურებული.</em></p></div>
<div className="c"><div className="b">ყოველდღიური განხორციელება</div><h3>როგორ აქტიურდება უმაღლესი გამოხატულება</h3>
<div className="h"><div className="ht"><svg><use href="#gl-sparkle"/></svg> ყოველდღიური პრაქტიკა</div><ul><li><strong>დილა:</strong> სხეულის პრაქტიკა (<span className="gi gi-pl"><svg><use href="#gl-neptune"/></svg></span>VI) + სიჩუმე (<span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span>VIII) + განზრახვა (<span className="gi gi-fire"><svg><use href="#gl-leo"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-node"/></svg></span>)</li><li><strong>მუშაობა:</strong> flow ხელობაში (<span className="gi gi-pl"><svg><use href="#gl-mars"/></svg></span><span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span>) + ელეგანტური კომუნიკაცია (<span className="gi gi-pl"><svg><use href="#gl-sun"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-venus"/></svg></span><span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span>III)</li><li><strong>ურთიერთობა:</strong> მიკრო-გულწრფელობა + თანდასწრება</li><li><strong>საღამო:</strong> სიზმრების ჟურნალი (<span className="gi gi-pl"><svg><use href="#gl-jupiter"/></svg></span><span className="gi gi-water"><svg><use href="#gl-pisces"/></svg></span>) + ჩრდილის რეფლექსია (<span className="gi gi-pl"><svg><use href="#gl-lilith"/></svg></span><span className="gi gi-pl"><svg><use href="#gl-mercury"/></svg></span>IV)</li><li><strong>ყოველკვირეული:</strong> ესთეტიკური „თარიღი" საკუთარ თავთან</li></ul></div></div>
<div className="pq"><p>„შენ ხარ ნათება, რომელიც ხარ — არა ის, რომელიც უნდა გახდე. ყველაფერი უკვე ჩაწერილია შენს რუკაში."</p></div></section>

</div>


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
<div style={{height: '56px'}}></div>
<div className="ct">

<div className="bnav">
  <button className="bb" onClick={() => { const b = document.getElementById("devNatal"); if (b) (window as unknown as ProtoGlobals).switchView?.("natal", b); }}>← ჩემი რუკა</button>
  <span className="ndv">·</span>
  <button className="bb active">
    <svg style={{width: '10px', height: '10px', fill: 'var(--gold)'}}><use href="#gl-conjunction"/></svg>
    <span id="breadcrumbLabel">სინასტრია</span>
  </button>
  <span className="ndv">·</span>
  <button className="bb" onClick={() => { alert("→ გიორგის რუკა"); }} id="breadcrumbPartner">გიორგის რუკა →</button>
</div>


<div className="chero section-reveal">
  <div className="chero-glow"></div>
  <div className="chero-sigil">
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g className="sigil-ring">
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(201,168,76,.15)" strokeWidth=".8"/>
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(201,168,76,.08)" strokeWidth=".5" strokeDasharray="2 4"/>
      </g>
      <g className="sigil-inner">
        <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(201,168,76,.1)" strokeWidth=".6"/>
        <path d="M38 38a14 14 0 1 0 0 24 10 10 0 0 1 0-24z" fill="none" stroke="rgba(201,168,76,.6)" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="58" cy="50" r="7" fill="none" stroke="rgba(201,168,76,.6)" strokeWidth="1.2"/>
        <circle cx="58" cy="50" r="1.5" fill="rgba(201,168,76,.5)"/>
      </g>
    </svg>
  </div>
  <h1 id="heroTitle">ვარსკვლავები ორისთვის</h1>
  <div className="tg" id="heroSub">სინასტრიის სიღრმისეული ანალიზი</div>
</div>


<div className="pcards section-reveal">
  <div className="pc" id="pc1" onClick={() => { alert("→ ჩემი ნატალური რუკა"); }}>
    <div className="pc-you-dot"></div>
    <div className="pc-tooltip">ჩემი რუკა →</div>
    <div className="pc-avatar"><span className="pc-avatar-letter">ლ</span></div>
    <div className="pc-name">ლუკა.პ</div>
    <div className="pc-sub">სასწორი · ქალწული · ლომი</div>
    <div className="pc-placements">
      <div className="pc-row"><span className="pc-row-label"><svg><use href="#gl-sun"/></svg></span><span className="pc-row-val">სასწორი 22°20'</span></div>
      <div className="pc-row"><span className="pc-row-label"><svg><use href="#gl-moon"/></svg></span><span className="pc-row-val">ქალწული 2°40'</span></div>
      <div className="pc-row"><span className="pc-row-label"><svg><use href="#gl-asc"/></svg></span><span className="pc-row-val">ლომი 17°20'</span></div>
      <div className="pc-row"><span className="pc-row-label"><svg><use href="#gl-venus"/></svg></span><span className="pc-row-val">სასწორი 18°40'</span></div>
      <div className="pc-row"><span className="pc-row-label"><svg><use href="#gl-mars"/></svg></span><span className="pc-row-val">ქალწული 5°07'</span></div>
    </div>
  </div>

  <div className="bridge">
    <div className="bridge-line"></div>
    <div className="bridge-icon">
      <svg style={{width: '16px', height: '16px', fill: 'none', stroke: 'var(--gold)', strokeWidth: '1.4'}}><use href="#gl-conjunction"/></svg>
    </div>
    <div className="bridge-line"></div>
  </div>

  <div className="pc" id="pc2" onClick={() => { alert("→ გიორგის რუკა"); }}>
    <div className="pc-tooltip" id="partnerTooltip">გიორგის რუკა →</div>
    <div className="pc-avatar"><span className="pc-avatar-letter">გ</span></div>
    <div className="pc-name">გიორგი ბ.</div>
    <div className="pc-sub">ვერძი · კირჩხიბი · მშვილდოსანი</div>
    <div className="pc-placements">
      <div className="pc-row"><span className="pc-row-label"><svg><use href="#gl-sun"/></svg></span><span className="pc-row-val">ვერძი 8°14'</span></div>
      <div className="pc-row"><span className="pc-row-label"><svg><use href="#gl-moon"/></svg></span><span className="pc-row-val">კირჩხიბი 15°33'</span></div>
      <div className="pc-row"><span className="pc-row-label"><svg><use href="#gl-asc"/></svg></span><span className="pc-row-val">მშვილდოსანი 3°45'</span></div>
      <div className="pc-row"><span className="pc-row-label"><svg><use href="#gl-venus"/></svg></span><span className="pc-row-val">თევზები 22°10'</span></div>
      <div className="pc-row"><span className="pc-row-label"><svg><use href="#gl-mars"/></svg></span><span className="pc-row-val">თხის რქა 11°28'</span></div>
    </div>
  </div>
</div>


<div className="wheel-section section-reveal">
  <div className="wheel-wrap">
    <div className="wheel-ring"></div>
    <svg className="wheel-svg" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="93" fill="none" stroke="rgba(201,168,76,.06)" strokeWidth="4"/>
      <circle className="wheel-arc" cx="100" cy="100" r="93" fill="none" stroke="url(#wg)" strokeWidth="4" strokeDasharray="584" strokeDashoffset="146" strokeLinecap="round"/>
      <defs><linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8a6d2b"/><stop offset="100%" stopColor="#c9a84c"/></linearGradient></defs>
    </svg>
    <div className="wheel-center">
      <div className="wheel-num">75</div>
      <div className="wheel-label">თავსებადობა</div>
    </div>
  </div>
</div>


<div className="cats section-reveal" id="cg">
  <div className="cat"><div className="cat-top"><span className="cat-name">ემოციური კავშირი</span><span className="cat-score" style={{color: 'var(--water)'}}>82%</span></div><div className="cat-bar"><div className="cat-fill" style={{width: '82%', background: 'var(--water)'}}></div></div><div className="cat-desc">მთვარე-მთვარის სექსტილი — ემოციური ენა თავსებადია.</div></div>
  <div className="cat"><div className="cat-top"><span className="cat-name">ინტელექტუალური</span><span className="cat-score" style={{color: 'var(--air)'}}>68%</span></div><div className="cat-bar"><div className="cat-fill" style={{width: '68%', background: 'var(--air)'}}></div></div><div className="cat-desc">მერკური-მზის კვადრატი — საუბრები ინტენსიურია.</div></div>
  <div className="cat couple-only"><div className="cat-top"><span className="cat-name">ვნება და მიზიდულობა</span><span className="cat-score" style={{color: 'var(--rose)'}}>91%</span></div><div className="cat-bar"><div className="cat-fill" style={{width: '91%', background: 'var(--rose)'}}></div></div><div className="cat-desc">ვენერა-ვენერას ტრინი — იშვიათი ჰარმონია.</div></div>
  <div className="cat friend-only"><div className="cat-top"><span className="cat-name">ღირებულებები</span><span className="cat-score" style={{color: 'var(--air)'}}>85%</span></div><div className="cat-bar"><div className="cat-fill" style={{width: '85%', background: 'var(--air)'}}></div></div><div className="cat-desc">ვენერა-ვენერას ტრინი — საერთო ესთეტიკა და ღირებულებები.</div></div>
  <div className="cat"><div className="cat-top"><span className="cat-name">კარმული კავშირი</span><span className="cat-score" style={{color: 'var(--gold)'}}>88%</span></div><div className="cat-bar"><div className="cat-fill" style={{width: '88%', background: 'var(--gold)'}}></div></div><div className="cat-desc">კვანძების ოპოზიცია — ბედისწერის პარტნიორობა.</div></div>
  <div className="cat"><div className="cat-top"><span className="cat-name">ზრდის პოტენციალი</span><span className="cat-score" style={{color: 'var(--earth)'}}>79%</span></div><div className="cat-bar"><div className="cat-fill" style={{width: '79%', background: 'var(--earth)'}}></div></div><div className="cat-desc">სატურნი-მარსის ტრინი — ერთობლივი მშენებლობა.</div></div>
  <div className="cat"><div className="cat-top"><span className="cat-name">გამოწვევის ზონა</span><span className="cat-score" style={{color: 'var(--fire)'}}>54%</span></div><div className="cat-bar"><div className="cat-fill" style={{width: '54%', background: 'var(--fire)'}}></div></div><div className="cat-desc">მარსი-მარსის კვადრატი — კონფლიქტის სტილი განსხვავებული.</div></div>
</div>


<div className="snav couple-only" id="snavCouple">
  <button className="snb active" onClick={() => { (window as unknown as ProtoGlobals).go?.("e1"); }}>ემოციური</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("e2"); }}>ვნება</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("e3"); }}>კარმული</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("e4n"); }}>ნუმეროლოგია</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("e4"); }}>ზრდა</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("e5"); }}>ჩრდილი</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("e7"); }}>პრაქტიკა</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("e6"); }}>პოტენციალი</button>
</div>


<div className="snav friend-only" id="snavFriend">
  <button className="snb active" onClick={() => { (window as unknown as ProtoGlobals).go?.("e1"); }}>ემოციური</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("f2"); }}>ინტელექტუალური</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("e3"); }}>კარმული</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("e4"); }}>ზრდა</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("f7"); }}>თავგადასავლები</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("e5f"); }}>ჩრდილი</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("f6"); }}>პოტენციალი</button>
  <button className="snb" onClick={() => { (window as unknown as ProtoGlobals).go?.("f8"); }}>პრაქტიკა</button>
</div>


<section className="analysis-section" id="e1">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--water)'}}><use href="#gl-moon"/></svg></div>
    <h2>ემოციური ქსოვილი</h2>
    <div className="st">როგორ გრძნობთ ერთმანეთს</div>
  </div>
  <div className="card el-water">
    <div className="card-badge"><svg><use href="#gl-moon"/></svg> ნინოს მთვარე <span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span> 2°40' ⚹ გიორგის მთვარე <span className="gi gi-water"><svg><use href="#gl-cancer"/></svg></span> 15°33'</div>
    <h3>ორი მთვარე — ერთი ზღვა, სხვადასხვა ტალღა</h3>
    <p>მთვარე-მთვარის სექსტილი ქალწულსა და კირჩხიბს შორის ქმნის ემოციურ თანაარსებობას ძალისხმევის გარეშე. ნინოს ქალწულის მთვარე ემოციებს ანალიზით ამუშავებს — წესრიგი, დახმარება, პრაქტიკული ზრუნვა. გიორგის კირჩხიბის მთვარეს — სახლი, სითბო, ტრადიცია.</p>
    <p><strong>ორივეს ემოციური მოთხოვნილებები ერთმანეთს ავსებს, არა ემთხვევა.</strong> ნინო გიორგის სტრუქტურასა და პრაქტიკულ ზრუნვას აძლევს. გიორგი ნინოს — ემოციურ სიღრმესა და დაუცველობის ნებართვას.</p>
    <div className="hint">
      <div className="hint-title"><svg><use href="#gl-sparkle"/></svg> <span className="couple-only">ურთიერთობის რჩევა</span><span className="friend-only">მეგობრობის რჩევა</span></div>
      <p>როცა ნინო „ასწორებს" — ეს სიყვარულის გამოხატვაა, არა კრიტიკა. როცა გიორგი „იკეტება" — ეს მთვარის თვითდაცვაა, არა უარყოფა.</p>
    </div>
    <span className="aspect-tag harmony">ჰარმონია</span>
  </div>
  <div className="card">
    <div className="card-badge"><svg><use href="#gl-sun"/></svg> ნინოს მზე <span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> 22°20' □ გიორგის მთვარე <span className="gi gi-water"><svg><use href="#gl-cancer"/></svg></span> 15°33'</div>
    <h3>სინათლე, რომელიც ჭრილობას ეხება</h3>
    <p>მზე-მთვარის კვადრატი — ერთ-ერთი ყველაზე რთული და ამავე დროს ყველაზე მზარდი სინასტრიული ასპექტი. ნინოს სასწორის მზე — ჰარმონიაზე, ბალანსზე აგებული — კვადრატში დგას გიორგის კირჩხიბის მთვარესთან.</p>
    <p><strong>პრაქტიკულად:</strong> ნინოს „ობიექტურობა" გიორგის ცივად ეჩვენება. გიორგის „ემოციურობა" ნინოს ირაციონალურად.</p>
    <button className="expand-btn" onClick={(e) => { (window as unknown as ProtoGlobals).toggleExp?.(e.currentTarget); }}>სიღრმისეულად ↓</button>
    <div className="expandable">
      <p>ყველაზე მტკივნეული მომენტი — როცა ნინო „დიპლომატიურ რეჟიმში" შედის, სწორედ მაშინ, როცა გიორგის უბრალოდ სჭირდება: „მესმის, მტკივა."</p>
      <div className="hint">
        <div className="hint-title"><svg><use href="#gl-sparkle"/></svg> ინტეგრაცია</div>
        <ul>
          <li>ნინოსთვის: „გასწორების" ნაცვლად — 30 წამი ჩუმად ახლოს ყოფნა</li>
          <li>გიორგისთვის: ნინოს „ობიექტურობა" = სიყვარული სამართლიანობით</li>
        </ul>
      </div>
    </div>
    <span className="aspect-tag tension">დაძაბულობა</span>
  </div>
</section>


<section className="analysis-section couple-only" id="e2">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--rose)'}}><use href="#gl-venus"/></svg></div>
    <h2>ვნების ალქიმია</h2>
    <div className="st">მიზიდულობა, ვნება, ესთეტიკა</div>
  </div>
  <div className="card el-rose">
    <div className="card-badge"><svg><use href="#gl-venus"/></svg> ნინოს ვენერა <span className="gi gi-air"><svg><use href="#gl-libra"/></svg></span> 18°40' △ გიორგის ვენერა <span className="gi gi-water"><svg><use href="#gl-pisces"/></svg></span> 22°10'</div>
    <h3>სიყვარულის ორი ენა, ერთი მელოდია</h3>
    <p>ვენერა-ვენერას ტრინი — სინასტრიის ერთ-ერთი ყველაზე სასურველი ასპექტი. ნინოს ვენერა სასწორში (დომიცილი) სიყვარულს ინტელექტუალური კომპანიონობით გამოხატავს. გიორგის ვენერა თევზებში (ეგზალტაცია) — ინტუიციით, თავდადებით.</p>
    <p><strong>ორივე ვენერა „ღირსებაშია"</strong> — იშვიათი სიტუაცია. ტრინი ნიშნავს — სტილები ერთმანეთს აძლიერებს.</p>
    <div className="hint">
      <div className="hint-title"><svg><use href="#gl-sparkle"/></svg> ვნების შენარჩუნება</div>
      <p>ტრინის საშიშროება — „კომფორტის ხაფანგი." ყოველკვირეული „ესთეტიკური თარიღი": გალერეა, კონცერტი, ერთად საჭმლის მომზადება.</p>
    </div>
    <span className="aspect-tag harmony">ჰარმონია</span>
  </div>
  <div className="card el-fire">
    <div className="card-badge"><svg><use href="#gl-mars"/></svg> ნინოს მარსი <span className="gi gi-earth"><svg><use href="#gl-virgo"/></svg></span> 5°07' □ გიორგის მარსი <span className="gi gi-earth"><svg><use href="#gl-capricorn"/></svg></span> 11°28'</div>
    <h3>ორი მეომარი — სხვადასხვა იარაღით</h3>
    <p>მარსი-მარსის კვადრატი: <strong>როგორ იბრძვით, მოქმედებთ, გამოხატავთ ბრაზს</strong> — ფუნდამენტურად განსხვავებულია. ნინოს მარსი ქალწულში „ასწორებს." გიორგის მარსი თხის რქაში „ბრძანებს."</p>
    <p><strong>ინტეგრაცია:</strong> გაცნობიერებისას — ერთმანეთის საუკეთესო „რეცენზენტები": ნინო ხედავს, რა გაუტყდა; გიორგი — საით წავიდეთ.</p>
    <span className="aspect-tag tension">დაძაბულობა</span>
  </div>
</section>


<section className="analysis-section friend-only" id="f2">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--air)'}}><use href="#gl-mercury"/></svg></div>
    <h2>ორი გონება — ერთი ცეცხლი</h2>
    <div className="st">ინტელექტუალური სინერგია და ღირებულებები</div>
  </div>
  <div className="card el-air">
    <div className="card-badge"><svg><use href="#gl-mercury"/></svg> მერკურის დინამიკა</div>
    <h3>გონების ორი სიჩქარე</h3>
    <p>როგორ ფიქრობთ, კამათობთ, ხსნით — ეს მეგობრობის ინტელექტუალური ხერხემალია. მერკურის ასპექტი განსაზღვრავს, სად მიედინება საუბარი ბუნებრივად და სად ჩნდება გაუგებრობა.</p>
    <div className="hint">
      <div className="hint-title"><svg><use href="#gl-sparkle"/></svg> საუბრის ხელოვნება</div>
      <p>ერთობლივი პროექტი, რომელიც ორივეს გონებას მოითხოვს — წიგნის კლუბი, ერთობლივი კრეატივი, სტრატეგიული თამაში — ტრინის ენერგიას აქტიურებს.</p>
    </div>
    <span className="aspect-tag harmony">ჰარმონია</span>
  </div>
  <div className="card el-air">
    <div className="card-badge"><svg><use href="#gl-venus"/></svg> ვენერა-ვენერა — საერთო ღირებულებები</div>
    <h3>საერთო სამყაროს არქიტექტურა</h3>
    <p>ვენერა მეგობრობაში = ღირებულებები, ესთეტიკა, რას აფასებთ ცხოვრებაში. ვენერა-ვენერას ტრინი ნიშნავს — ბუნებრივად ეთანხმებით, რა არის ლამაზი, სამართლიანი, ღირებული.</p>
    <span className="aspect-tag harmony">ჰარმონია</span>
  </div>
  <div className="card el-fire">
    <div className="card-badge"><svg><use href="#gl-mars"/></svg> მარსი-მარსი — ამბიცია & კონკურენცია</div>
    <h3>ორი მეომარი, ერთი არენა</h3>
    <p>მარსი-მარსის კვადრატი მეგობრობაში = ჯანსაღი კონკურენცია vs დესტრუქციული ჩხუბი. როგორ ამოძრავებთ ერთმანეთს? სად ხდება კონკურენცია შთაგონებად და სად — შურად?</p>
    <span className="aspect-tag tension">დაძაბულობა</span>
  </div>
</section>


<section className="analysis-section" id="e3">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-node"/></svg></div>
    <h2>ბედისწერის ძაფები</h2>
    <div className="st">კარმული კავშირები</div>
  </div>
  <div className="card el-water">
    <div className="card-badge"><svg><use href="#gl-node"/></svg> კვანძების ოპოზიცია — ლომი/მერწყული ↔ მერწყული/ლომი</div>
    <h3>ბედისწერის სარკე — ერთმანეთის მასწავლებლები</h3>
    <p>ჩრდილოეთი კვანძების ოპოზიცია — კლასიკური კარმული <span className="couple-only">პარტნიორობის</span><span className="friend-only">მეგობრობის</span> ხელმოწერა. ნინოს ჩრდილოეთი კვანძი ლომში = გიორგის სამხრეთი კვანძი ლომში, და პირიქით. <strong>რაც ერთისთვის ახალი გაკვეთილია, მეორისთვის ძველი ჩვევაა.</strong></p>
    <p><strong>29° ანარეტიკული:</strong> ნინოს ჩრდილოეთი კვანძი 29°54' — ეს კავშირი მრავალი სიცოცხლის კარმულ ციკლს ასრულებს.</p>
    <button className="expand-btn" onClick={(e) => { (window as unknown as ProtoGlobals).toggleExp?.(e.currentTarget); }}>წარსული სიცოცხლეები ↓</button>
    <div className="expandable">
      <p>კვანძების ოპოზიცია ხშირად ნიშნავს — ეს სულები ადრეც შეხვედრილან, შესაძლოა საპირისპირო როლებში.</p>
      <div className="hint">
        <div className="hint-title"><svg><use href="#gl-sparkle"/></svg> კარმული მუშაობა</div>
        <ul>
          <li>„რა ვისწავლე შენგან, რაც მარტო ვერ ვისწავლიდი?" — ოპოზიციის არსი</li>
          <li>ნინოსთვის: ნება დართე გიორგის „ასწავლოს" თამამობა</li>
          <li>გიორგისთვის: ნება დართე ნინოს „ასწავლოს" ობიექტურობა</li>
        </ul>
      </div>
    </div>
    <span className="aspect-tag magnetic">კარმული</span>
  </div>
</section>


<section className="analysis-section couple-only" id="e4n">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-numbers"/></svg></div>
    <h2>რიცხვების ენა</h2>
    <div className="st">ნუმეროლოგიური თავსებადობა</div>
  </div>
  <div className="card el-gold">
    <div className="card-badge">სიცოცხლის გზის რიცხვი</div>
    <h3>7 და 4 — მისტიკოსი და მშენებელი</h3>
    <p><strong>ნინოს სიცოცხლის გზა: 7</strong> (1990.10.15 → 1+9+9+0+1+0+1+5 = 26 → 2+6 = 8... [გამოთვლა ასტროლოგის მიერ]). სიცოცხლის გზა 7 — ძიება, ანალიზი, სულიერი სიღრმე. ინტროვერტული სიბრძნე.</p>
    <p><strong>გიორგის სიცოცხლის გზა: 4</strong> — სტრუქტურა, მშენებლობა, პრაქტიკული ფუნდამენტი. დისციპლინის არქიტექტორი.</p>
    <p><strong>7 + 4 კომბინაცია:</strong> მისტიკოსი და მშენებელი ერთად ქმნიან ნივთს, რომელსაც სული აქვს. 7 აძლევს ხედვას, 4 — ფორმას. <em>ეს ნუმეროლოგიური თემა ეხმიანება კვანძების ოპოზიციას — სწავლება ორმხრივია.</em></p>
    <div className="hint">
      <div className="hint-title"><svg><use href="#gl-sparkle"/></svg> ნუმეროლოგიური რჩევა</div>
      <p>7-ს სჭირდება მარტოობის სივრცე აზროვნებისთვის. 4-ს — კონკრეტული გეგმა. პატივი ეცით ორივეს რიტმს: 7 ამუშავებს, 4 აშენებს.</p>
    </div>
    <span className="aspect-tag harmony">ჰარმონია</span>
  </div>
  <div className="card">
    <div className="card-badge">სულის რეზონანსი</div>
    <h3>ციფრული სარკეები — რა ეხმიანება ვარსკვლავებს</h3>
    <p>ნუმეროლოგიური ციკლები ხშირად ასტროლოგიურ თემებს იმეორებს. ნინოს 7 ეხმიანება ქალწულის მთვარის ანალიტიკურობას და მორიელის მერკურის სიღრმეს. გიორგის 4 — თხის რქის მარსის სტრატეგიულ ამბიციას.</p>
    <p><strong>ერთობლივი რიცხვი (7+4=11):</strong> 11 — სამაგისტრო რიცხვი. ინტუიცია, სულიერი ხელმძღვანელობა, უმაღლესი მიზანი. <em>ეს <span className="couple-only">ურთიერთობა</span><span className="friend-only">მეგობრობა</span> უფრო მეტია, ვიდრე ორი ადამიანის ჯამი.</em></p>
    <span className="aspect-tag magnetic">მაგნიტური</span>
  </div>
  <div className="pull-quote">
    <p>„რიცხვები და ვარსკვლავები ერთ ისტორიას ყვებიან — 7 ეძებს, 4 აშენებს, 11 ანათებს. ეს კავშირი რიცხვებშიც დაწერილია."</p>
  </div>
</section>


<section className="analysis-section" id="e4">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--earth)'}}><use href="#gl-yinyang"/></svg></div>
    <h2>ზრდის ფუნდამენტი</h2>
    <div className="st">სტაბილურობა, ნდობა, პოტენციალი</div>
  </div>
  <div className="card el-earth">
    <div className="card-badge"><svg><use href="#gl-saturn"/></svg> ნინოს სატურნი <span className="gi gi-earth"><svg><use href="#gl-taurus"/></svg></span> 0°47' △ გიორგის მარსი <span className="gi gi-earth"><svg><use href="#gl-capricorn"/></svg></span> 11°28'</div>
    <h3>მშენებლები — ორი ხელი, ერთი სახლი</h3>
    <p>სატურნი-მარსის მიწის ტრინი — სინასტრიის ყველაზე პრაქტიკული ასპექტი. <strong>ეს <span className="couple-only">წყვილი</span><span className="friend-only">მეგობრები</span> შეიძლება ერთად ააშენოს რაღაც ხელშესახები — <span className="couple-only">ბიზნესი, სახლი, ოჯახი</span><span className="friend-only">ბიზნესი, პროექტი, კრეატივი</span> — და ის გაუძლებს დროს.</strong></p>
    <div className="hint">
      <div className="hint-title"><svg><use href="#gl-sparkle"/></svg> ერთობლივი მშენებლობა</div>
      <p>ერთობლივი პროექტი — ტრინის ენერგიას აქტიურებს. მთავარია: რაღაცის ხელშესახები შექმნა ერთად.</p>
    </div>
    <span className="aspect-tag harmony">ჰარმონია</span>
  </div>
</section>


<section className="analysis-section couple-only" id="e5">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--silver)'}}><use href="#gl-pluto"/></svg></div>
    <h2>საერთო ჩრდილი</h2>
    <div className="st">რას იმალავს ეს ურთიერთობა</div>
  </div>
  <div className="card el-shadow">
    <div className="card-badge"><svg><use href="#gl-pluto"/></svg> ნინოს პლუტონი <span className="gi gi-fire"><svg><use href="#gl-sagittarius"/></svg></span> 6°18' ☌ გიორგის ASC <span className="gi gi-fire"><svg><use href="#gl-sagittarius"/></svg></span> 3°45'</div>
    <h3>ტრანსფორმაციის კარიბჭე — ძალაუფლების თამაში</h3>
    <p>პლუტონი პარტნიორის ასცენდენტზე — სინასტრიის ყველაზე ინტენსიური ასპექტი. ნინო გიორგის ცხოვრებაში შემოვიდა როგორც <strong>ტრანსფორმაციის აგენტი.</strong></p>
    <p><strong>ჩრდილი:</strong> ძალაუფლების დინამიკა, ხშირად გაუცნობიერებელი.</p>
    <p><strong>ინტეგრაცია:</strong> „შენ დამეხმარე გამხდარიყავი ის, რაც ვარ" — ეს არის ამ ასპექტის საუკეთესო გამოხატვა.</p>
    <div className="hint">
      <div className="hint-title"><svg><use href="#gl-sparkle"/></svg> ჩრდილის ინტეგრაცია</div>
      <ul>
        <li>აღიარეთ: „ამ ურთიერთობაში ძალაუფლების დინამიკა არსებობს"</li>
        <li>ნინოსთვის: „ცვლილების დაყენების" სურვილი ხშირად პლუტონის ჩრდილია</li>
        <li>გიორგისთვის: ნება დართე ტრანსფორმაციას</li>
      </ul>
    </div>
    <span className="aspect-tag magnetic">მაგნიტური</span>
  </div>
</section>


<section className="analysis-section friend-only" id="e5f">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--silver)'}}><use href="#gl-pluto"/></svg></div>
    <h2>საერთო ჩრდილი</h2>
    <div className="st">რას იმალავს ეს მეგობრობა</div>
  </div>
  <div className="card el-shadow">
    <div className="card-badge"><svg><use href="#gl-pluto"/></svg> პროექცია & კონკურენცია</div>
    <h3>სარკე, რომელსაც ვერ გაექცევი</h3>
    <p>ყველა ღრმა მეგობრობაში არის ადგილი, სადაც ერთი მეორეზე საკუთარ ჩრდილს აპროექტებს. კონკურენცია, შური, ან „მეც ისეთი მინდა ვიყო" — ეს ჩრდილის ენერგიაა, რომელიც გაცნობიერებისას ზრდის ძრავა ხდება.</p>
    <span className="aspect-tag tension">დაძაბულობა</span>
  </div>
  <div className="card el-shadow">
    <div className="card-badge"><svg><use href="#gl-pluto"/></svg> კოლექტიური ბრმა წერტილი</div>
    <h3>რას ვერ ხედავთ ერთად</h3>
    <p>ყველა მეგობრობას აქვს „თემა, რომელზეც არ ვლაპარაკობთ." სამხრეთი კვანძის ჩვევები ერთმანეთს აძლიერებს — კომფორტის ზონა, რომელიც ზრდის ნაცვლად სტაგნაციას აწარმოებს. <strong>საიდუმლო:</strong> ის საუბარი, რომელსაც აცდენთ — სწორედ ის არის ზრდის კარიბჭე.</p>
    <span className="aspect-tag tension">დაძაბულობა</span>
  </div>
</section>


<section className="analysis-section friend-only" id="f6">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-diamond"/></svg></div>
    <h2>უმაღლესი შესაძლებლობა</h2>
    <div className="st">როცა ორივე ვარსკვლავი ანათებს</div>
  </div>
  <div className="card" style={{border: '1px solid rgba(201,168,76,.12)', background: 'linear-gradient(135deg,var(--sf),var(--sf2))'}}>
    <div className="card-badge"><svg><use href="#gl-sparkle"/></svg> ინტეგრირებული ხედვა</div>
    <h3>როცა ორივე ვარსკვლავი ანათებს</h3>
    <p>ეს მეგობრობა უმაღლეს გამოხატვისას — <strong>ორი სრულიად განსხვავებული სამყაროს შეხვედრა, რომელიც ერთად მესამე, უფრო მდიდარ სამყაროს ქმნის.</strong></p>
    <p><strong>ვენერას ტრინი</strong> = ღირებულებების ფუნდამენტი ძლიერია. <strong>კვანძების ოპოზიცია</strong> = ერთმანეთს ასწავლით. <strong>სატურნი-მარსის ტრინი</strong> = ერთად ააშენებთ.</p>
    <p>5, 10, 20 წლის შემდეგ — ეს მეგობრობა იქნება ფუნდამენტი, რომელზეც ორივეს ცხოვრება დგას. არა რომანტიკით, არამედ <strong>არჩევანით.</strong></p>
  </div>
  <div className="pull-quote">
    <p>„ეს მეგობრობა არ არის შემთხვევითი — ეს არის ორი სულის არჩევანი, რომ ერთმანეთს ასწავლიან იმას, რაც მარტო ვერ ისწავლიდნენ."</p>
  </div>
</section>


<section className="analysis-section friend-only" id="f8">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--earth)'}}><use href="#gl-sparkle"/></svg></div>
    <h2>მეგობრობის რიტუალი</h2>
    <div className="st">როგორ იზრდება ეს კავშირი</div>
  </div>
  <div className="card el-earth">
    <div className="card-badge"><svg><use href="#gl-moon"/></svg> რიტმების ცნობიერება</div>
    <h3>როცა მეგობრობას სუნთქვა სჭირდება</h3>
    <p>ღრმა მეგობრობა ციკლურია — ახლობლობის და დისტანციის ტალღები ბუნებრივია. მთვარის ტრანზიტი ერთმანეთის მთვარის ნიშანში = ემოციური რეზონანსის ფანჯარა, სადაც საუბრები ღრმაა და ნდობა ბუნებრივი.</p>
    <p><strong>სატურნი-მარსის ტრინი</strong> = ეს მეგობრობა ყველაზე ძლიერია, როცა რაღაცას ერთად აკეთებთ. ერთობლივი პროექტი, მოგზაურობა, გამოწვევა — სწორედ ეს აქტიურებს ტრინის ენერგიას.</p>
    <div className="hint">
      <div className="hint-title"><svg><use href="#gl-sparkle"/></svg> მეგობრობის კომპასი</div>
      <p>როცა დისტანცია იზრდება — ეს არა პრობლემაა, არამედ მთვარის ციკლის ბუნებრივი ნაწილი. მთავარია: <strong>დაბრუნების რიტუალი.</strong> ერთი საუბარი, ერთი შეხვედრა, ერთი „როგორ ხარ ნამდვილად?" — და კავშირი ისევ ცოცხლდება.</p>
    </div>
    <span className="aspect-tag harmony">ჰარმონია</span>
  </div>
</section>


<section className="analysis-section couple-only" id="e7">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--earth)'}}><use href="#gl-sparkle"/></svg></div>
    <h2>ჰარმონიზაციის რიტუალი</h2>
    <div className="st">პრაქტიკული რჩევები ამ წყვილისთვის</div>
  </div>
  <div className="card el-earth">
    <div className="card-badge"><svg><use href="#gl-moon"/></svg> მთვარის ციკლები</div>
    <h3>როცა მთვარე კირჩხიბში გადადის — გიორგის დღეებია</h3>
    <p>ყოველ 28 დღეში მთვარე კირჩხიბში 2.5 დღით შედის — ეს გიორგის ემოციური „მაღალი ტალღაა." ამ დღეებში ნინოს ქალწულის მთვარემ უნდა დაივიწყოს „გასწორება" და უბრალოდ იყოს ახლოს.</p>
    <p><strong>საპირისპიროდ:</strong> როცა მთვარე ქალწულში გადადის — ნინოს მთვარის დრო. გიორგი ხედავს, რომ ნინო „პროდუქტიულობის რეჟიმში" შედის — ეს არა დისტანციაა, არამედ თვითმოვლა.</p>
    <div className="hint">
      <div className="hint-title"><svg><use href="#gl-sparkle"/></svg> რიტმების ცნობიერება</div>
      <p>ეს წყვილი ციკლურ რიტმებში ცხოვრობს — მთვარის ტრანზიტები ემოციური კლიმატის „ამინდის პროგნოზია." გიორგის კირჩხიბის მთვარის ტრანზიტი = ემოციური სიღრმის ფანჯარა, სადაც სიახლოვე ბუნებრივია. ნინოს ქალწულის მთვარის ტრანზიტი = პრაქტიკული ზრუნვის ფანჯარა, სადაც „ერთად გაკეთება" = სიყვარულის ენა.</p>
      <p><strong>ახალმთვარეობა ყოველთვიურად:</strong> „რას ვქმნით ერთად?" — სატურნი-მარსის ტრინის ინტენცია. სრულმთვარეობა: „რა გაიზარდა ჩვენს შორის?" — ვენერას ტრინის რეფლექსია.</p>
    </div>
    <span className="aspect-tag harmony">ჰარმონია</span>
  </div>
  <div className="card">
    <div className="card-badge"><svg><use href="#gl-saturn"/></svg> კონფლიქტის პროტოკოლი</div>
    <h3>კამათის წესი — ამ კონკრეტული წყვილისთვის</h3>
    <p>მარსი-მარსის კვადრატი + მზე-მთვარის კვადრატი = კამათი გარდაუვალია. მაგრამ კამათის <strong>სტილი</strong> არჩევანია.</p>
    <p><strong>ნინოსთვის:</strong> სანამ „ანალიზს" დაიწყებ — ერთი წინადადება: „მესმის, რომ გტკივა." მერე ანალიზი.</p>
    <p><strong>გიორგისთვის:</strong> „მჭირდება სივრცე" ≠ „არ მიყვარხარ." სთხოვე 20 წუთი, არა უცებ წასვლა.</p>
    <span className="aspect-tag tension">დაძაბულობა</span>
  </div>
</section>


<section className="analysis-section friend-only" id="f7">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--earth)'}}><use href="#gl-jupiter"/></svg></div>
    <h2>საერთო თავგადასავლები</h2>
    <div className="st">რა უნდა გააკეთოთ ერთად</div>
  </div>
  <div className="card el-air">
    <div className="card-badge"><svg><use href="#gl-jupiter"/></svg> იუპიტერის გაფართოება</div>
    <h3>სად აფართოებთ ერთმანეთის სამყაროს</h3>
    <p>ეს მეგობრობა ყველაზე ცოცხალია, როცა ერთად რაღაც ახალს აკეთებთ — მოგზაურობა, ახალი უნარის სწავლა, ერთობლივი პროექტი. იუპიტერის ენერგია მოითხოვს <strong>გაფართოებას</strong>, არა რუტინას.</p>
    <div className="hint">
      <div className="hint-title"><svg><use href="#gl-sparkle"/></svg> თავგადასავლების სია</div>
      <ul>
        <li>ერთობლივი მოგზაურობა — მშვილდოსნის ენერგია ითხოვს ჰორიზონტის გაფართოებას</li>
        <li>შემოქმედებითი პროექტი — ვენერას ტრინი ესთეტიკურ თანამშრომლობას უჭერს მხარს</li>
        <li>ინტელექტუალური გამოწვევა — წიგნის კლუბი, დებატები, სტრატეგიული თამაშები</li>
        <li>ფიზიკური აქტივობა ერთად — მარსების კვადრატს ჯანსაღ კონკურენციაში გადაიყვანს</li>
      </ul>
    </div>
    <span className="aspect-tag harmony">ჰარმონია</span>
  </div>
</section>


<section className="analysis-section couple-only" id="e6">
  <div className="section-head">
    <div className="section-icon"><svg style={{color: 'var(--gold)'}}><use href="#gl-diamond"/></svg></div>
    <h2>უმაღლესი შესაძლებლობა</h2>
    <div className="st">როცა ორივე ვარსკვლავი ანათებს</div>
  </div>
  <div className="card" style={{border: '1px solid rgba(201,168,76,.12)', background: 'linear-gradient(135deg,var(--sf),var(--sf2))'}}>
    <div className="card-badge"><svg><use href="#gl-sparkle"/></svg> სრულყოფილების ნახაზი</div>
    <h3>როცა ყველა ასპექტი ინტეგრირებულია</h3>
    <p>ეს ურთიერთობა უმაღლეს გამოხატვისას — <strong>ორი სრულიად განსხვავებული სამყაროს შეხვედრა, რომელიც ერთად მესამე, უფრო მდიდარ სამყაროს ქმნის.</strong></p>
    <p><strong>ვენერას ტრინი</strong> = სიყვარულის ფუნდამენტი ძლიერია. <strong>სატურნი-მარსის ტრინი</strong> = ერთად შეგიძლიათ ააშენოთ. <strong>კვანძების ოპოზიცია</strong> = ერთმანეთს ასწავლით. <strong>პლუტონი ასცენდენტზე</strong> = ტრანსფორმაციის აგენტი.</p>
    <p>გამოწვევის ზონა — მზე-მთვარის კვადრატი და მარსების კვადრატი — სწორედ ის ხახუნია, რომელიც ზრდას იწვევს.</p>
  </div>
  <div className="pull-quote">
    <p>„ეს ურთიერთობა არ არის შემთხვევითი — ეს არის ორი სულის შეთანხმება, რომ ერთმანეთს ასწავლიან იმას, რაც მარტო ვერ ისწავლიდნენ. ვერ იქნებით კომფორტულები მუდმივად — მაგრამ ვერც ისეთები, რაც ადრე იყავით."</p>
  </div>
</section>

</div>


<footer className="footer"><div className="ct">
<div className="footer-social">
<a href="#" className="social-link" title="Instagram"><svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>
<a href="#" className="social-link" title="Facebook"><svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
<a href="#" className="social-link" title="TikTok"><svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a>
<a href="#" className="social-link" title="Telegram"><svg viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></a>
</div>
<div className="footer-links"><a href="#">ჩვენს შესახებ</a><a href="#">კონფიდენციალობა</a><a href="#">პირობები</a><a href="#">კონტაქტი</a></div>
<div className="footer-copy">© 2026 ASTROLO.GE</div>
</div></footer>
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
        <div className="field"><label>ელ-ფოსტა</label><input type="email" id="login-email" placeholder="name@example.com" autoComplete="email"/></div>
        <div className="field"><label>პაროლი</label><div className="field-pw"><input type="password" id="login-pw" placeholder="••••••••" autoComplete="current-password"/><button className="pw-toggle" onClick={(e) => { (window as unknown as ProtoGlobals).togglePw?.(e.currentTarget); }}>ჩვენება</button></div></div>
        <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '16px'}}><a href="#" onClick={(e) => { e.preventDefault(); (window as unknown as ProtoGlobals).showAuthPage?.("page-forgot"); }} style={{fontSize: '.72rem', color: 'var(--gd)', textDecoration: 'none', transition: 'color .3s'}}>დაგავიწყდა?</a></div>
        <button className="auth-btn" onClick={() => { (window as unknown as ProtoGlobals).handleLogin?.(); }}><span className="btn-text">შესვლა</span></button>
        <div className="nav-row" style={{marginTop: '10px'}}><button className="auth-btn-ghost" onClick={() => { (window as unknown as ProtoGlobals).showAuthPage?.("page-signup"); }} style={{width: '100%'}}>ანგარიშის შექმნა →</button></div>
        <div className="nav-row" style={{marginTop: '8px'}}><button className="auth-btn-ghost" onClick={() => { (window as unknown as ProtoGlobals).goAuthStep?.(2); }} style={{width: '100%', color: 'var(--fire)', borderColor: 'rgba(212,100,74,.15)', fontSize: '.66rem'}}>⚡ გამოტოვება → (dev)</button></div>
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
        <button className="auth-btn" onClick={() => { (window as unknown as ProtoGlobals).handleSignup?.(); }} style={{marginTop: '4px'}}><span className="btn-text">ანგარიშის შექმნა</span></button>
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
        <div className="gender-row"><div className="gender-opt" onClick={(e) => { (window as unknown as ProtoGlobals).selectGender?.(e.currentTarget, "female"); }}><span className="g-icon">♀</span>ქალი</div><div className="gender-opt" onClick={(e) => { (window as unknown as ProtoGlobals).selectGender?.(e.currentTarget, "male"); }}><span className="g-icon">♂</span>კაცი</div></div>
        <button className="auth-btn" onClick={() => { (window as unknown as ProtoGlobals).handleBirthData?.(); }} style={{marginTop: '6px'}}><span className="btn-text">რუკის აგება ✦</span></button>
        <div className="nav-row"><button className="auth-btn-ghost" onClick={() => { (window as unknown as ProtoGlobals).goAuthStep?.(1); }}>← უკან</button><button className="auth-btn-ghost" onClick={() => { (window as unknown as ProtoGlobals).startLoading?.(); }} style={{color: 'var(--fire)', borderColor: 'rgba(212,100,74,.15)', fontSize: '.66rem'}}>⚡ გამოტოვება → (dev)</button></div>
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




<div className="dev-panel" id="devPanel">
  <div className="dev-label">VIEW</div>
  <button className="dev-btn" onClick={(e) => { (window as unknown as ProtoGlobals).switchView?.("auth", e.currentTarget); }} id="devAuth">☽ AUTH</button>
  <button className="dev-btn active" onClick={(e) => { (window as unknown as ProtoGlobals).switchView?.("natal", e.currentTarget); }} id="devNatal">⊙ NATAL</button>
  <div className="dev-row">
    <button className="dev-btn" onClick={(e) => { (window as unknown as ProtoGlobals).switchSynastry?.("couple", e.currentTarget); }} id="devCouple">☌ COUPLE</button>
    <button className="dev-btn" onClick={(e) => { (window as unknown as ProtoGlobals).switchSynastry?.("friend", e.currentTarget); }} id="devFriend">☌ FRIEND</button>
  </div>
  <div className="dev-sep"></div>
  <div className="dev-label">ACCOUNT</div>
  <div className="dev-row">
    <button className="dev-btn" onClick={(e) => { (window as unknown as ProtoGlobals).setTier?.("free", e.currentTarget); }} id="devFree">FREE</button>
    <button className="dev-btn active" onClick={(e) => { (window as unknown as ProtoGlobals).setTier?.("premium", e.currentTarget); }} id="devPremium">PREMIUM</button>
    <button className="dev-btn" onClick={(e) => { (window as unknown as ProtoGlobals).setTier?.("premium-plus", e.currentTarget); }} id="devPremPlus">PREM+</button>
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
  <div className="dev-label">SLOT 2 <span style={{fontSize:'.55rem',opacity:.5}}>override</span></div>
  <div className="dev-row">
    <button className="dev-btn slot-btn" onClick={(e) => { (window as unknown as ProtoGlobals).toggleSlot?.(2, e.currentTarget); }} id="devSlot2Toggle">🔒 locked</button>
    <button className="dev-btn slot-btn" onClick={(e) => { (window as unknown as ProtoGlobals).occupySlot?.(2, e.currentTarget); }} id="devSlot2Occupy">👤 occupy</button>
  </div>
  <div className="dev-sep"></div>
  <button className="dev-btn discount-btn" onClick={(e) => { (window as unknown as ProtoGlobals).toggleDiscount?.(e.currentTarget); }} id="devDiscount">₾10 DISCOUNT</button>
  <div className="dev-sep"></div>
  <div className="dev-label">TEST USER</div>
  <div className="dev-row">
    <button className="dev-btn" id="devLuka" onClick={async (e) => {
      const btn = e.currentTarget;
      btn.textContent = '...';
      const { createClient } = await import('@/lib/supabase/client');
      const sb = createClient();
      await sb.auth.signInWithPassword({ email: 'luka.test@astrolo.ge', password: 'testpass123!' });
      window.location.reload();
    }}>👤 ლუკა.პ</button>
    <button className="dev-btn" id="devNino" onClick={async (e) => {
      const btn = e.currentTarget;
      btn.textContent = '...';
      const { createClient } = await import('@/lib/supabase/client');
      const sb = createClient();
      await sb.auth.signInWithPassword({ email: 'nino.test@astrolo.ge', password: 'testpass123!' });
      window.location.reload();
    }}>👤 ნინო.მ</button>
  </div>
  <button className="dev-btn" id="devLogout" onClick={async (e) => {
    const btn = e.currentTarget;
    btn.textContent = '...';
    const { createClient } = await import('@/lib/supabase/client');
    const sb = createClient();
    await sb.auth.signOut();
    window.location.reload();
  }}>↩ LOGOUT</button>
  <div className="dev-sep"></div>
  <div className="dev-label">DATA</div>
  <button className="dev-btn" id="devSeed" onClick={async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'SEEDING...';
    try {
      const res = await fetch('/api/dev/seed', { method: 'POST' });
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let lastStep = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const msg = JSON.parse(line);
            lastStep = msg.step || lastStep;
            btn.textContent = lastStep;
            if (msg.status === 'error') throw new Error(msg.step);
          } catch { /* skip parse errors */ }
        }
      }
      btn.textContent = 'DONE! Signing in...';
      const { createClient } = await import('@/lib/supabase/client');
      const sb = createClient();
      await sb.auth.signInWithPassword({ email: 'luka.test@astrolo.ge', password: 'testpass123!' });
      window.location.reload();
    } catch (err) {
      btn.textContent = 'SEED FAILED';
      btn.disabled = false;
      console.error('Seed error:', err);
    }
  }}>🌱 SEED TEST DATA</button>
</div>
</div>
  );
}
