// ═══════════════════════════════════════════════════════════
// UNIFIED JAVASCRIPT — ASTROLO.GE
// ═══════════════════════════════════════════════════════════

let currentAccountType = 'premium';
let discountOn = true;
// Slot overrides: null = follow tier defaults, true/false = dev override
let slot1UnlockedOverride = null;
let slot1OccupiedOverride = null;
let slot2UnlockedOverride = null;
let slot2OccupiedOverride = null;

// ═══ VIEW SWITCHING ═══
function switchView(view, btn) {
  document.body.setAttribute('data-view', view);
  document.querySelectorAll('#devAuth,#devNatal,#devCouple,#devFriend').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Reset synced progress handler when leaving natal; raw scroll takes over
  if (view !== 'natal') window._syncNavProgress = null;

  // Update sidebar nav active states
  const natalNav = document.querySelector('#sbNavRow .sb-nav-item:first-child');
  const synNav = document.getElementById('synNavItem');
  if (view === 'natal') {
    if (natalNav) natalNav.classList.add('active');
    if (synNav) synNav.classList.remove('active');
  } else if (view === 'synastry') {
    if (natalNav) natalNav.classList.remove('active');
    if (synNav) synNav.classList.add('active');
  }

  // Re-initialize observers for the new view
  setTimeout(initObservers, 100);
}

// ═══ MODE SWITCHING (COUPLE / FRIEND) ═══
function setMode(mode, btn) {
  document.body.classList.remove('mode-couple','mode-friend');
  document.body.classList.add('mode-' + mode);
  document.querySelectorAll('#devCouple,#devFriend').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const modeBadge = document.getElementById('modeBadge');
  const partnerName = document.getElementById('synPartnerName');
  const heroTitle = document.getElementById('heroTitle');
  const heroSub = document.getElementById('heroSub');
  const breadcrumbLabel = document.getElementById('breadcrumbLabel');

  if (mode === 'couple') {
    modeBadge.className = 'mode-badge couple';
    modeBadge.textContent = 'მეწყვილე';
    if (partnerName) partnerName.textContent = '(გიორგი მაისურაძე)';
    if (heroTitle) heroTitle.textContent = 'ვარსკვლავები ორისთვის';
    if (heroSub) heroSub.textContent = 'სინასტრიის სიღრმისეული ანალიზი';
    if (breadcrumbLabel) breadcrumbLabel.textContent = 'სინასტრია';
  } else {
    modeBadge.className = 'mode-badge friend';
    modeBadge.textContent = 'მეგობარი';
    if (partnerName) partnerName.textContent = '(გიორგი მაისურაძე)';
    if (heroTitle) heroTitle.textContent = 'ვარსკვლავთა მეგობრობა';
    if (heroSub) heroSub.textContent = 'მეგობრული თავსებადობის ანალიზი';
    if (breadcrumbLabel) breadcrumbLabel.textContent = 'სინასტრია';
  }
}

// ═══ TIER SWITCHING (5 STATES) ═══
// FREE            — natal locked (overview + mission + 1 pick), synastry locked (click → premium payment)
// PREMIUM         — natal full, slot 1 unlocked+empty (pulsating CTA to invite)
// PREMIUM+        — natal full, slot 1 occupied, slot 2 unlocked+empty (pulsating)
// INVITED         — natal locked (like free), slot 1 occupied (inviter's synastry)
// INVITED+        — natal full, slot 1 occupied, slot 2 unlocked+empty (pulsating)
function setTier(tier, btn) {
  currentAccountType = tier;
  document.querySelectorAll('#devFree,#devPremium,#devPremPlus,#devInvited,#devInvitedPlus').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const badge = document.getElementById('sbTier');
  badge.style.color = '';
  badge.style.background = '';
  badge.style.borderColor = '';

  // Natal chart locked for free AND invited (not invited+, not premium)
  document.body.classList.toggle('free-tier', tier === 'free' || tier === 'invited');

  if (tier === 'free') {
    badge.className = 'sb-tier free';
    badge.innerHTML = 'FREE';
  } else if (tier === 'premium') {
    badge.className = 'sb-tier premium';
    badge.innerHTML = '<span class="dot"></span> PREMIUM';
  } else if (tier === 'premium-plus') {
    badge.className = 'sb-tier premplus';
    badge.innerHTML = '<span class="dot"></span> PREMIUM+';
  } else if (tier === 'invited') {
    badge.className = 'sb-tier invited';
    badge.innerHTML = '<span class="dot"></span> INVITED';
    badge.style.color = 'var(--rose)';
    badge.style.background = 'rgba(196,122,138,.06)';
    badge.style.borderColor = 'rgba(196,122,138,.12)';
  } else if (tier === 'invited-plus') {
    badge.className = 'sb-tier invited';
    badge.innerHTML = '<span class="dot"></span> INVITED+';
    badge.style.color = 'var(--rose)';
    badge.style.background = 'rgba(196,122,138,.06)';
    badge.style.borderColor = 'rgba(196,122,138,.12)';
  }

  rebuildSidebar();
}

// ═══ SLOT TOGGLE CONTROLS (override tier defaults) ═══
function toggleSlot(slotNum, btn) {
  if (slotNum === 1) {
    // Cycle: null → true (unlocked) → false (locked) → null (follow tier)
    if (slot1UnlockedOverride === null) { slot1UnlockedOverride = true; }
    else if (slot1UnlockedOverride === true) { slot1UnlockedOverride = false; slot1OccupiedOverride = null; }
    else { slot1UnlockedOverride = null; slot1OccupiedOverride = null; }
    const state = slot1UnlockedOverride;
    btn.classList.toggle('active', state === true);
    btn.textContent = state === null ? '— auto' : state ? '🔓 unlocked' : '🔒 locked';
    // Reset occupy
    const occBtn = document.getElementById('devSlot1Occupy');
    if (occBtn) { occBtn.classList.remove('active'); occBtn.textContent = '👤 occupy'; }
  } else {
    if (slot2UnlockedOverride === null) { slot2UnlockedOverride = true; }
    else if (slot2UnlockedOverride === true) { slot2UnlockedOverride = false; slot2OccupiedOverride = null; }
    else { slot2UnlockedOverride = null; slot2OccupiedOverride = null; }
    const state = slot2UnlockedOverride;
    btn.classList.toggle('active', state === true);
    btn.textContent = state === null ? '— auto' : state ? '🔓 unlocked' : '🔒 locked';
    const occBtn = document.getElementById('devSlot2Occupy');
    if (occBtn) { occBtn.classList.remove('active'); occBtn.textContent = '👤 occupy'; }
  }
  rebuildSidebar();
}

function occupySlot(slotNum, btn) {
  // Get effective unlock state
  const unlocked = slotNum === 1 ? getSlot1Unlocked() : getSlot2Unlocked();
  if (!unlocked) return;
  if (slotNum === 1) {
    slot1OccupiedOverride = slot1OccupiedOverride ? null : true;
    btn.classList.toggle('active', !!slot1OccupiedOverride);
    btn.textContent = slot1OccupiedOverride ? '👤 occupied' : '👤 occupy';
  } else {
    slot2OccupiedOverride = slot2OccupiedOverride ? null : true;
    btn.classList.toggle('active', !!slot2OccupiedOverride);
    btn.textContent = slot2OccupiedOverride ? '👤 occupied' : '👤 occupy';
  }
  rebuildSidebar();
}

// ═══ EFFECTIVE SLOT STATE (tier defaults + dev overrides) ═══
function getSlot1Unlocked() {
  if (slot1UnlockedOverride !== null) return slot1UnlockedOverride;
  // Tier defaults: premium=unlocked, premium+=unlocked, invited/invited+=unlocked (inviter paid)
  return currentAccountType !== 'free';
}
function getSlot1Occupied() {
  if (slot1OccupiedOverride !== null) return slot1OccupiedOverride;
  // Tier defaults: premium=empty (just became premium, invite available), premium+=occupied, invited/invited+=occupied
  return currentAccountType === 'premium-plus' || currentAccountType === 'invited' || currentAccountType === 'invited-plus';
}
function getSlot2Unlocked() {
  if (slot2UnlockedOverride !== null) return slot2UnlockedOverride;
  // Tier defaults: premium+=unlocked, invited+=unlocked
  return currentAccountType === 'premium-plus' || currentAccountType === 'invited-plus';
}
function getSlot2Occupied() {
  if (slot2OccupiedOverride !== null) return slot2OccupiedOverride;
  // Tier defaults: always empty (just paid, no partner yet)
  return false;
}

// ═══ SYNASTRY VIEW + MODE (combined) ═══
function switchSynastry(mode, btn) {
  setMode(mode, btn);
  switchView('synastry', btn);
}

// ═══ REBUILD SIDEBAR (single source of truth) ═══
function rebuildSidebar() {
  const synItem = document.getElementById('synNavItem');
  const partnerName = document.getElementById('synPartnerName');
  const modeBadge = document.getElementById('modeBadge');
  const inviteBtn = document.getElementById('inviteNavBtn');

  // Remove extra synastry nav items
  document.querySelectorAll('.sb-nav-item.syn-extra').forEach(el => el.remove());

  if (!synItem) return;

  // Reset all synastry nav state
  synItem.style.display = '';
  synItem.style.opacity = '';
  synItem.style.pointerEvents = '';
  synItem.classList.remove('has-partner', 'syn-cta-pulsate', 'locked-syn');

  // Get effective slot states (tier defaults + dev overrides)
  const s1Unlocked = getSlot1Unlocked();
  const s1Occupied = getSlot1Occupied();
  const s2Unlocked = getSlot2Unlocked();
  const s2Occupied = getSlot2Occupied();

  // ─── FREE: synastry visible but locked → click goes to premium payment ───
  if (currentAccountType === 'free') {
    synItem.classList.add('locked-syn');
    if (partnerName) partnerName.textContent = '';
    if (modeBadge) { modeBadge.className = 'mode-badge'; modeBadge.textContent = ''; }
    if (inviteBtn) inviteBtn.style.display = 'none';
    return;
  }

  // Show invite button for non-free tiers
  if (inviteBtn) inviteBtn.style.display = '';

  // ─── SLOT 1 ───
  if (s1Unlocked && s1Occupied) {
    // Partner connected → show partner name & mode badge
    synItem.classList.add('has-partner');
    if (partnerName) partnerName.textContent = '(გიორგი მაისურაძე)';
    if (modeBadge) { modeBadge.className = 'mode-badge couple'; modeBadge.textContent = 'მეწყვილე'; }
  } else if (s1Unlocked && !s1Occupied) {
    // Paid but no partner → pulsating CTA to invite
    synItem.classList.add('syn-cta-pulsate');
    if (partnerName) partnerName.textContent = '';
    if (modeBadge) { modeBadge.className = 'mode-badge'; modeBadge.textContent = ''; }
  } else {
    // Slot locked → locked synastry (click → payment)
    synItem.classList.add('locked-syn');
    if (partnerName) partnerName.textContent = '';
    if (modeBadge) { modeBadge.className = 'mode-badge'; modeBadge.textContent = ''; }
  }

  // ─── SLOT 2 ───
  buildSlot2NavItem(synItem, s2Unlocked, s2Occupied);
}

function buildSlot2NavItem(afterEl, unlocked, occupied) {
  if (!unlocked) return; // not paid → nothing

  if (!occupied) {
    // Paid but no partner → pulsating 2nd synastry CTA
    const el = document.createElement('div');
    el.className = 'sb-nav-item syn-cta-pulsate syn-extra';
    el.onclick = function() { openInviteModal(); };
    el.innerHTML = '<span class="sb-nav-icon"><svg><use href="#gl-conjunction"/></svg></span><div class="sb-nav-text"><span class="sb-nav-label">სინასტრია</span></div>';
    afterEl.insertAdjacentElement('afterend', el);
  } else {
    // Partner connected → show 2nd synastry with name
    const el = document.createElement('div');
    el.className = 'sb-nav-item has-partner syn-extra';
    el.onclick = function() { switchView('synastry'); };
    el.innerHTML = '<span class="sb-nav-icon"><svg><use href="#gl-conjunction"/></svg></span><div class="sb-nav-text"><span class="sb-nav-label">სინასტრია</span><span class="sb-nav-partner">(ანა გელაშვილი)</span></div><span class="mode-badge friend">მეგობარი</span>';
    afterEl.insertAdjacentElement('afterend', el);
  }
}

// ═══ DISCOUNT TOGGLE ═══
function toggleDiscount(btn) {
  discountOn = !discountOn;
  btn.classList.toggle('active', discountOn);
  // Update payment page prices
  const oldPrice = document.getElementById('payOldPrice');
  const amount = document.getElementById('payAmount');
  const discBadge = document.getElementById('payDiscountBadge');
  const ctaText = document.getElementById('payCtaText');
  if (discountOn) {
    if (oldPrice) oldPrice.style.display = '';
    if (amount) amount.textContent = '₾10';
    if (discBadge) discBadge.style.display = '';
    if (ctaText) ctaText.textContent = '✦ PREMIUM-ის განბლოკვა — ₾10';
  } else {
    if (oldPrice) oldPrice.style.display = 'none';
    if (amount) amount.textContent = '₾15';
    if (discBadge) discBadge.style.display = 'none';
    if (ctaText) ctaText.textContent = '✦ PREMIUM-ის განბლოკვა — ₾15';
  }
}

// ═══ PAYMENT PAGES ═══
function showPaymentPage(type) {
  // Hide all payment sub-pages
  document.getElementById('payPremium').style.display = 'none';
  document.getElementById('payNatalUnlock').style.display = 'none';
  document.getElementById('paySynastrySlot').style.display = 'none';
  const ctaText = document.getElementById('payCtaText');

  if (type === 'premium') {
    document.getElementById('payPremium').style.display = '';
    const price = discountOn ? '₾10' : '₾15';
    ctaText.textContent = '✦ PREMIUM-ის განბლოკვა — ' + price;
  } else if (type === 'natal-unlock') {
    document.getElementById('payNatalUnlock').style.display = '';
    ctaText.textContent = '✦ ნატალური რუკის განბლოკვა — ₾5';
  } else if (type === 'synastry-slot') {
    document.getElementById('paySynastrySlot').style.display = '';
    ctaText.textContent = '✦ სლოტის განბლოკვა — ₾5';
  }

  switchView('payment');
}

function selectPayMethod(method, el) {
  document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('selected'));
  el.classList.add('selected');
}

// ═══ SIDEBAR ═══
let ddOpen = false;
function openSidebar() {
  // If public view (not logged in), redirect to auth
  if (window.__ASTROLO_PUBLIC_VIEW) {
    window.location.href = '/auth';
    return;
  }
  ddOpen = !ddOpen; document.getElementById('accountDD').classList.toggle('open', ddOpen);
}
function closeSidebar() { ddOpen = false; document.getElementById('accountDD').classList.remove('open'); }
document.addEventListener('click', e => {
  if (ddOpen && !e.target.closest('.account-dd') && !e.target.closest('.pb')) closeSidebar();
});

// Wire up sidebar nav items to switch views
document.querySelector('#sbNavRow .sb-nav-item:first-child').onclick = function() {
  closeSidebar();
  switchView('natal', document.getElementById('devNatal'));
};
document.getElementById('synNavItem').onclick = function() {
  // FREE: locked → premium payment page
  if (this.classList.contains('locked-syn')) { closeSidebar(); showPaymentPage('premium'); return; }
  // Pulsating CTA → open invite modal
  if (this.classList.contains('syn-cta-pulsate')) { openInviteModal(); return; }
  // Partner connected → view synastry reading
  closeSidebar();
  switchView('synastry');
};

// ═══ INVITE MODAL ═══
let selectedInviteType = null;
function openInviteModal() {
  closeSidebar();
  selectedInviteType = null;
  const modal = document.getElementById('inviteModal');
  const optsWrap = document.getElementById('inviteOptsWrap');
  const upgradeWrap = document.getElementById('inviteUpgrade');
  const actions = document.getElementById('inviteActions');
  const priceTag = document.getElementById('invitePriceTag');
  const title = document.getElementById('inviteModalTitle');
  const sub = document.getElementById('inviteModalSub');

  document.querySelectorAll('.invite-opt').forEach(o => o.classList.remove('selected'));
  document.getElementById('inviteLinkBox').classList.remove('show');
  priceTag.classList.remove('show'); priceTag.textContent = '';

  if (currentAccountType === 'free') {
    // Free users go to premium payment page instead
    closeInviteModal();
    showPaymentPage('premium');
    return;
  } else {
    title.textContent = 'ვის ეგზავნება ბმული?';
    sub.textContent = 'აირჩიე კავშირის ტიპი — ბმული ავტომატურად გენერირდება';
    optsWrap.style.display = 'flex';
    upgradeWrap.style.display = 'none';
    actions.style.display = 'flex';
    document.getElementById('inviteGenBtn').disabled = true;
    document.getElementById('inviteGenBtn').textContent = 'აირჩიე ტიპი';
    // Show ₾5 price tag when all free slots are occupied (buying additional)
    const s1Occ = getSlot1Occupied();
    const needsPurchase = s1Occ; // if slot 1 is occupied, next invite costs ₾5
    if (needsPurchase) {
      priceTag.textContent = '₾5 — დამატებითი სინასტრია';
      priceTag.classList.add('show');
    }
  }
  modal.classList.add('open');
}
function closeInviteModal() { document.getElementById('inviteModal').classList.remove('open'); }
function selectInviteType(type, el) {
  selectedInviteType = type;
  document.querySelectorAll('.invite-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('inviteGenBtn').disabled = false;
  document.getElementById('inviteGenBtn').textContent = type === 'couple' ? 'ბმულის შექმნა (მეწყვილე)' : 'ბმულის შექმნა (მეგობარი)';
  document.getElementById('inviteLinkBox').classList.remove('show');
}
function generateInviteLink() {
  if (!selectedInviteType) return;
  const code = Math.random().toString(36).substring(2, 9);
  const url = 'astrolo.ge/inv/' + code;
  document.getElementById('inviteLinkUrl').textContent = url;
  document.getElementById('inviteLinkBox').classList.add('show');
  navigator.clipboard?.writeText('https://' + url);
  document.getElementById('inviteGenBtn').textContent = '✓ დაკოპირდა!';
  document.getElementById('inviteGenBtn').disabled = true;
}
function copyInviteLink(btn) {
  const url = document.getElementById('inviteLinkUrl').textContent;
  navigator.clipboard?.writeText('https://' + url);
  const orig = btn.textContent; btn.textContent = '✓'; setTimeout(() => btn.textContent = orig, 1500);
}
function showUpgrade() {
  if (currentAccountType === 'free') {
    showPaymentPage('premium');
  } else {
    // All paid tiers → open invite modal (handles slot purchase internally)
    openInviteModal();
  }
}

// ═══ LANGUAGE ═══
var _currentUser = null; // stored by hydrateReading, used for lang switch re-hydration

function setLang(l, b) {
  document.querySelectorAll('.lo').forEach(x => x.classList.remove('active'));
  if (b) b.classList.add('active');
  document.body.classList.toggle('lang-en', l === 'en');
  applyTranslations(l);
  // If we already have a user, fetch and re-hydrate directly without React
  if (_currentUser && (l === 'ka' || l === 'en')) {
    fetch('/api/reading/natal?lang=' + l, { credentials: 'include' })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (data && data.reading) hydrateReading(data.reading, _currentUser);
      })
      .catch(function() {});
  }
}
window.setLang = setLang;

// Translation map for all fixed UI text
const TR = {
  // Section nav buttons (natal)
  '.nbtn': ['მიმოხილვა','მისია','მახასიათებლები','ურთიერთობები','საქმე','ჩრდილი','სამშვინველი','სრულყოფილება'],
  '.nbtn_en': ['Overview','Mission','Characteristics','Relationships','Work','Shadow','Soul','Perfection'],
  // Section nav buttons (synastry couple)
  '#snavCouple .snb': ['ემოციური','ვნება','კარმული','ნუმეროლოგია','ზრდა','ჩრდილი','პრაქტიკა','პოტენციალი'],
  '#snavCouple .snb_en': ['Emotional','Passion','Karmic','Numerology','Growth','Shadow','Practice','Potential'],
  // Section nav buttons (synastry friend)
  '#snavFriend .snb': ['ემოციური','ინტელექტუალური','კარმული','ზრდა','თავგადასავლები','ჩრდილი','პოტენციალი','პრაქტიკა'],
  '#snavFriend .snb_en': ['Emotional','Intellectual','Karmic','Growth','Adventures','Shadow','Potential','Practice'],
  // Sidebar labels
  'sidebar': {
    ka: { myMap: 'ჩემი რუკა', natal: 'ნატალური რუკა', synastry: 'სინასტრია', invite: 'მოწვევა', share: 'გაზიარება', shareBtn: 'რუკის გაზიარება', logout: 'გასვლა', couple: 'მეწყვილე', friend: 'მეგობარი' },
    en: { myMap: 'MY CHART', natal: 'Natal Chart', synastry: 'Synastry', invite: 'Invite', share: 'SHARE', shareBtn: 'Share reading', logout: 'Sign out', couple: 'Couple', friend: 'Friend' }
  },
  // Hero
  'hero': {
    ka: { sub: 'სულის ნახაზი', h1: 'ნატალური რუკის წაკითხვა' },
    en: { sub: 'SOUL BLUEPRINT', h1: 'Natal Chart Reading' }
  },
  // Synastry hero
  'synHero': {
    ka: { couple: 'ვარსკვლავები ორისთვის', friend: 'ვარსკვლავთა მეგობრობა', coupleSub: 'სინასტრიის სიღრმისეული ანალიზი', friendSub: 'მეგობრული თავსებადობის ანალიზი' },
    en: { couple: 'Stars for Two', friend: 'Stellar Friendship', coupleSub: 'Deep synastry analysis', friendSub: 'Friendship compatibility analysis' }
  },
  // Breadcrumb
  'bread': { ka: { back: '← ჩემი რუკა', syn: 'სინასტრია', partner: 'გიორგის რუკა →' }, en: { back: '← My Chart', syn: 'Synastry', partner: "Giorgi's Chart →" } },
  // Footer
  'footer': { ka: ['ჩვენს შესახებ','კონფიდენციალობა','პირობები','კონტაქტი'], en: ['About','Privacy','Terms','Contact'] },
  // Compatibility
  'compat': { ka: 'თავსებადობა', en: 'Compatibility' },
  // Auth
  'auth': {
    ka: { login: 'შესვლა', loginSub: 'შენი ციური ნახაზი გელოდება', signup: 'რეგისტრაცია', signupSub: 'დაიწყე შენი ციური მოგზაურობა', forgot: 'პაროლის აღდგენა', google: 'Google-ით შესვლა', googleSignup: 'Google-ით რეგისტრაცია', orEmail: 'ან ელ-ფოსტით', email: 'ელ-ფოსტა', password: 'პაროლი', name: 'სახელი', forgotLink: 'დაგავიწყდა?', createAccount: 'რეგისტრაცია', haveAccount: 'უკვე გაქვს ანგარიში?', sendReset: 'ბმულის გაგზავნა', resetSent: 'ბმული გაგზავნილია', backToLogin: 'შესვლაზე დაბრუნება', birthData: 'დაბადების მონაცემები', birthSub: 'ნატალური რუკის აგებისთვის', birthHint: 'რატომ გვჭირდება?', birthHintText: 'ნატალური რუკა ზუსტ პლანეტარულ პოზიციებს ეფუძნება შენი დაბადების მომენტში. რაც უფრო ზუსტი — მით უფრო ღრმა ანალიზი.', day: 'დღე', month: 'თვე', year: 'წელი', hour: 'საათი', minute: 'წუთი', timeUnknown: 'დაბადების დრო უცნობია', place: 'დაბადების ადგილი', gender: 'სქესი', female: 'ქალი', male: 'კაცი', generateChart: 'რუკის აგება ✦', back: '← უკან', showPw: 'ჩვენება' },
    en: { login: 'Sign In', loginSub: 'Your celestial blueprint awaits', signup: 'Create Account', signupSub: 'Begin your celestial journey', forgot: 'Reset Password', google: 'Continue with Google', googleSignup: 'Continue with Google', orEmail: 'or with email', email: 'EMAIL', password: 'PASSWORD', name: 'NAME', forgotLink: 'Forgot password?', createAccount: 'Create Account', haveAccount: 'Already have an account?', sendReset: 'Send Reset Link', resetSent: 'Check your email', backToLogin: 'Back to Sign In', birthData: 'Birth Data', birthSub: 'Required for your natal chart', birthHint: 'Why do we need this?', birthHintText: 'Your natal chart maps exact planetary positions at birth. More precision means a deeper reading.', day: 'DAY', month: 'MONTH', year: 'YEAR', hour: 'HOUR', minute: 'MINUTE', timeUnknown: 'Birth time unknown', place: 'PLACE OF BIRTH', gender: 'GENDER', female: 'Female', male: 'Male', generateChart: 'Generate Chart ✦', back: '← Back', showPw: 'Show' }
  }
};

function applyTranslations(l) {
  // Natal nav buttons
  const nbtns = document.querySelectorAll('.nbtn');
  const nLabels = l === 'en' ? TR['.nbtn_en'] : TR['.nbtn'];
  nbtns.forEach((btn, i) => { if (nLabels[i]) btn.childNodes[0].textContent = nLabels[i]; });

  // Synastry nav buttons (couple)
  const cbtns = document.querySelectorAll('#snavCouple .snb');
  const cLabels = l === 'en' ? TR['#snavCouple .snb_en'] : TR['#snavCouple .snb'];
  cbtns.forEach((btn, i) => { if (cLabels[i]) btn.textContent = cLabels[i]; });

  // Synastry nav buttons (friend)
  const fbtns = document.querySelectorAll('#snavFriend .snb');
  const fLabels = l === 'en' ? TR['#snavFriend .snb_en'] : TR['#snavFriend .snb'];
  fbtns.forEach((btn, i) => { if (fLabels[i]) btn.textContent = fLabels[i]; });

  // Sidebar
  const sb = TR.sidebar[l];
  const secTitle = document.querySelector('.sb-section-title');
  if (secTitle) secTitle.textContent = sb.myMap;
  const natalLabel = document.querySelector('#sbNavRow .sb-nav-item:first-child .sb-nav-label');
  if (natalLabel) natalLabel.textContent = sb.natal;
  const synLabel = document.querySelector('#synNavItem .sb-nav-label');
  if (synLabel) synLabel.textContent = sb.synastry;
  const invLabel = document.getElementById('inviteBtnLabel');
  if (invLabel) invLabel.textContent = sb.invite;
  const shareTitle = document.querySelectorAll('.sb-section-title')[1];
  if (shareTitle) shareTitle.textContent = sb.share;
  const shareBtn = document.querySelector('.sb-share-main');
  if (shareBtn) { const svgEl = shareBtn.querySelector('svg'); shareBtn.innerHTML = ''; if (svgEl) shareBtn.appendChild(svgEl); shareBtn.appendChild(document.createTextNode(' ' + sb.shareBtn)); }
  const logoutBtn = document.querySelector('.sb-logout');
  if (logoutBtn) logoutBtn.textContent = sb.logout;
  const modeBadge = document.getElementById('modeBadge');
  if (modeBadge) {
    const isCouple = modeBadge.classList.contains('couple');
    modeBadge.textContent = isCouple ? sb.couple : sb.friend;
  }

  // Hero
  const heroSub = document.querySelector('.hero-sub');
  if (heroSub) heroSub.textContent = TR.hero[l].sub;
  const heroH1 = document.querySelector('.hero h1');
  if (heroH1) heroH1.textContent = TR.hero[l].h1;

  // Synastry hero
  const synH1 = document.getElementById('heroTitle');
  const synSub = document.getElementById('heroSub');
  if (synH1 && synSub) {
    const isCouple = document.body.classList.contains('mode-couple');
    synH1.textContent = isCouple ? TR.synHero[l].couple : TR.synHero[l].friend;
    synSub.textContent = isCouple ? TR.synHero[l].coupleSub : TR.synHero[l].friendSub;
  }

  // Breadcrumb
  const bc = TR.bread[l];
  const backBtn = document.querySelector('.bnav .bb:first-child');
  if (backBtn) backBtn.textContent = bc.back;
  const synBread = document.getElementById('breadcrumbLabel');
  if (synBread) synBread.textContent = bc.syn;
  const partnerBread = document.getElementById('breadcrumbPartner');
  if (partnerBread) partnerBread.textContent = bc.partner;

  // Footer links
  document.querySelectorAll('.footer-links').forEach(fl => {
    const links = fl.querySelectorAll('a');
    TR.footer[l].forEach((t, i) => { if (links[i]) links[i].textContent = t; });
  });

  // Wheel label
  const wheelLabel = document.querySelector('.wheel-label');
  if (wheelLabel) wheelLabel.textContent = TR.compat[l];

  // Auth pages
  const a = TR.auth[l];
  function setGoogleBtn(btn, text) {
    if (!btn) return;
    var svg = btn.querySelector('svg');
    btn.textContent = ' ' + text;
    if (svg) btn.insertBefore(svg, btn.firstChild);
  }
  // Login
  var pl = document.getElementById('page-login');
  if (pl) {
    var h = pl.querySelector('.auth-header h1'); if (h) h.textContent = a.login;
    var sub = pl.querySelector('.auth-header .sub'); if (sub) sub.textContent = a.loginSub;
    setGoogleBtn(pl.querySelector('.google-btn'), a.google);
    var ds = pl.querySelector('.auth-divider span'); if (ds) ds.textContent = a.orEmail;
    var fls = pl.querySelectorAll('.field label'); if (fls[0]) fls[0].textContent = a.email; if (fls[1]) fls[1].textContent = a.password;
    var fa = pl.querySelector('a[href="#"]'); if (fa) fa.textContent = a.forgotLink;
    var bt = pl.querySelector('.auth-btn .btn-text'); if (bt) bt.textContent = a.login;
    var sg = pl.querySelector('.auth-btn-ghost'); if (sg) sg.textContent = a.signup + ' →';
    pl.querySelectorAll('.pw-toggle').forEach(function(b) { b.textContent = a.showPw; });
  }
  // Signup
  var ps = document.getElementById('page-signup');
  if (ps) {
    var h2 = ps.querySelector('.auth-header h1'); if (h2) h2.textContent = a.signup;
    var sub2 = ps.querySelector('.auth-header .sub'); if (sub2) sub2.textContent = a.signupSub;
    setGoogleBtn(ps.querySelector('.google-btn'), a.googleSignup);
    var ds2 = ps.querySelector('.auth-divider span'); if (ds2) ds2.textContent = a.orEmail;
    var sfl = ps.querySelectorAll('.field label'); if (sfl[0]) sfl[0].textContent = a.name; if (sfl[1]) sfl[1].textContent = a.email; if (sfl[2]) sfl[2].textContent = a.password;
    var sbt = ps.querySelector('.auth-btn .btn-text'); if (sbt) sbt.textContent = a.createAccount;
    var af = ps.querySelector('.auth-footer'); if (af) { var afl = af.querySelector('a'); if (afl) { af.childNodes[0].textContent = a.haveAccount + ' '; afl.textContent = a.login; } }
    ps.querySelectorAll('.pw-toggle').forEach(function(b) { b.textContent = a.showPw; });
  }
  // Forgot
  var pf = document.getElementById('page-forgot');
  if (pf) {
    var h3 = pf.querySelector('.auth-header h1'); if (h3) h3.textContent = a.forgot;
    var bl = pf.querySelector('.back-link'); if (bl) { var sp = bl.querySelector('span'); bl.textContent = ' ' + a.backToLogin; if (sp) bl.insertBefore(sp, bl.firstChild); }
    var fbt = pf.querySelector('#forgot-form .auth-btn .btn-text'); if (fbt) fbt.textContent = a.sendReset;
    var rsh = pf.querySelector('.reset-success h3'); if (rsh) rsh.textContent = a.resetSent;
  }
  // Birth
  var pb = document.getElementById('page-birth');
  if (pb) {
    var h4 = pb.querySelector('.auth-header h1'); if (h4) h4.textContent = a.birthData;
    var sub4 = pb.querySelector('.auth-header .sub'); if (sub4) sub4.textContent = a.birthSub;
    var ht = pb.querySelector('.hint-t'); if (ht) ht.textContent = '✦ ' + a.birthHint;
    var hp = pb.querySelector('.auth-hint p'); if (hp) hp.textContent = a.birthHintText;
    var r3 = pb.querySelectorAll('.field-row-3 .field label'); if (r3[0]) r3[0].textContent = a.day; if (r3[1]) r3[1].textContent = a.month; if (r3[2]) r3[2].textContent = a.year;
    var tr2 = pb.querySelectorAll('.field-row .field label'); if (tr2[0]) tr2[0].textContent = a.hour; if (tr2[1]) tr2[1].textContent = a.minute;
    var cl = pb.querySelector('.check-label'); if (cl) cl.textContent = a.timeUnknown;
    var plEl = pb.querySelector('#birth-place'); if (plEl) { var plL = plEl.closest ? plEl.closest('.field').querySelector('label') : null; if (plL) plL.textContent = a.place; }
    var gl = pb.querySelector('label[style]'); if (gl) gl.textContent = a.gender;
    var gopts = pb.querySelectorAll('.gender-opt'); gopts.forEach(function(opt, i) { var ic = opt.querySelector('.g-icon'); opt.textContent = ''; if (ic) opt.appendChild(ic); opt.appendChild(document.createTextNode(i === 0 ? a.female : a.male)); });
    var gbt = pb.querySelector('.auth-btn .btn-text'); if (gbt) gbt.textContent = a.generateChart;
    var bkg = pb.querySelector('.auth-btn-ghost'); if (bkg) bkg.textContent = a.back;
  }
}

// ═══ SHARE ═══
function shareReading() {
  const url = window.location.href;
  const view = document.body.getAttribute('data-view');
  const title = view === 'synastry' ? 'ASTROLO.GE — სინასტრია' : 'ASTROLO.GE — ჩემი ნატალური რუკა';
  if (navigator.share) { navigator.share({ title, url }).catch(() => {}); }
  else { navigator.clipboard?.writeText(url); }
}
function shareToSocial(platform) {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent('ASTROLO.GE');
  const urls = {
    fb: 'https://www.facebook.com/sharer/sharer.php?u=' + url,
    ig: 'https://www.instagram.com/',
    tg: 'https://t.me/share/url?url=' + url + '&text=' + text
  };
  window.open(urls[platform], '_blank', 'width=600,height=400');
}

// ═══ NAVIGATION ═══
function go(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function toggleExp(btn) {
  if (!btn._origText) btn._origText = btn.textContent;
  const el = btn.nextElementSibling;
  const open = el.classList.toggle('open');
  btn.textContent = open ? 'ნაკლები ↑' : btn._origText;
}


// ═══ STARS ═══
(function() {
  const c = document.getElementById('stars');
  for (let i = 0; i < 100; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.setProperty('--d', (2 + Math.random() * 4) + 's');
    s.style.animationDelay = Math.random() * 5 + 's';
    if (Math.random() > .75) { s.style.width = '1px'; s.style.height = '1px'; }
    c.appendChild(s);
  }
})();

// ═══ SCROLL PROGRESS ═══
window.addEventListener('scroll', () => {
  if (typeof window._syncNavProgress === 'function') {
    window._syncNavProgress();
  } else {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    document.getElementById('prog').style.width = (window.scrollY / h * 100) + '%';
  }
  document.getElementById('scrollTop').classList.toggle('show', window.scrollY > 600);

  // Reading progress (natal)
  const progFill = document.getElementById('progFill');
  if (progFill) {
    // Updated in observer
  }
});

// ═══ OBSERVERS ═══
function initObservers() {
  const view = document.body.getAttribute('data-view');

  // Section reveal
  const revealObs = new IntersectionObserver(es => {
    es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('vis'); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });

  if (view === 'natal') {
    document.querySelectorAll('#view-natal section, #view-natal .lock-wrap').forEach(s => {
      if (!s.classList.contains('vis')) revealObs.observe(s);
    });
    // Nav active + progress bar — scroll-driven so both stay in sync
    const secs = Array.from(document.querySelectorAll('#view-natal section'));
    const nbs  = Array.from(document.querySelectorAll('.nbtn'));
    var _firstSecTop = null;
    var _lastSecBottom = null;
    function _calcSecBounds() {
      if (!secs.length) return;
      _firstSecTop    = secs[0].getBoundingClientRect().top + window.scrollY;
      _lastSecBottom  = secs[secs.length - 1].getBoundingClientRect().bottom + window.scrollY;
    }
    _calcSecBounds();
    window.addEventListener('resize', _calcSecBounds);

    window._syncNavProgress = function() {
      var offset = 130; // px from top to consider a section "in view"
      var activeIdx = 0;
      for (var _si = 0; _si < secs.length; _si++) {
        if (secs[_si].getBoundingClientRect().top <= offset) activeIdx = _si;
      }
      nbs.forEach(function(b) { b.classList.remove('active'); });
      if (nbs[activeIdx]) nbs[activeIdx].classList.add('active');

      // Progress bar: 0 = top of first section, 100 = bottom of last section scrolled into view
      var scrollable = (_lastSecBottom || 0) - window.innerHeight - (_firstSecTop || 0);
      var pct = scrollable > 0
        ? Math.min(100, Math.max(0, (window.scrollY - (_firstSecTop || 0)) / scrollable * 100))
        : 0;
      var prog = document.getElementById('prog');
      if (prog) prog.style.width = pct + '%';
    };
    window._syncNavProgress();

    // Reading progress
    const readSections = new Set();
    const readObs = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > .3) {
          readSections.add(e.target.id);
          const total = document.querySelectorAll('#view-natal section').length;
          const pct = Math.round(readSections.size / total * 100);
          const fill = document.getElementById('progFill');
          const count = document.getElementById('progCount');
          if (fill) fill.style.width = pct + '%';
          if (count) count.textContent = readSections.size + '/' + total;
        }
      });
    }, { threshold: .3 });
    document.querySelectorAll('#view-natal section').forEach(s => readObs.observe(s));
  }

  if (view === 'synastry') {
    document.querySelectorAll('#view-synastry .section-reveal, #view-synastry .analysis-section').forEach(s => {
      if (!s.classList.contains('vis')) revealObs.observe(s);
    });

    // Animated bars
    const catObs = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting) {
          e.target.querySelectorAll('.cat-fill').forEach(f => {
            const w = f.style.width; f.style.width = '0';
            setTimeout(() => f.style.width = w, 150);
          });
          catObs.unobserve(e.target);
        }
      });
    }, { threshold: .25 });
    document.querySelectorAll('#view-synastry .cats').forEach(el => catObs.observe(el));

    // Wheel arc
    const wheelObs = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting) {
          const arc = e.target.querySelector('.wheel-arc');
          if (arc) {
            const final = arc.getAttribute('stroke-dashoffset');
            arc.setAttribute('stroke-dashoffset', '584');
            arc.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.22,.61,.36,1)';
            setTimeout(() => { arc.style.strokeDashoffset = final; }, 200);
          }
          wheelObs.unobserve(e.target);
        }
      });
    }, { threshold: .3 });
    document.querySelectorAll('#view-synastry .wheel-section').forEach(el => wheelObs.observe(el));

    // Section nav active
    const synSections = document.querySelectorAll('#view-synastry .analysis-section');
    const synNavObs = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id;
          document.querySelectorAll('.snav .snb').forEach(b => b.classList.remove('active'));
          const target = document.querySelector('.snb[onclick*="\'' + id + '\'"]');
          if (target) target.classList.add('active');
        }
      });
    }, { threshold: .15, rootMargin: '-80px 0px -60% 0px' });
    synSections.forEach(s => synNavObs.observe(s));
  }
}

// Safe closest — SVG elements (e.g. <use>) lack .closest(), walk up to nearest HTMLElement first
function _closest(el, sel) {
  var node = el;
  while (node && !(node instanceof HTMLElement)) node = node.parentNode;
  return node ? node.closest(sel) : null;
}

// ═══ MOUSE-TRACKING GLOW (delegated) ═══
document.addEventListener('mousemove', e => {
  const el = _closest(e.target, '.c,.nbtn,.card,.cat,.pc,.bb,.snb');
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
});

// ═══ ELEMENT POPUPS (NATAL) ═══
const elData = {
  ka: {
    fire: { title: 'ცეცხლი', body: 'ინტუიცია, შთაგონება და სპონტანური მოქმედება. ცეცხლის ენერგია ქმნის, იწყებს და ანთებს — ეს არის ნების ძალა, თავდაჯერებულობა და სიცოცხლის წყურვილი. ჭარბად — იმპულსურობა, სიმწვავე. ნაკლებად — ენერგიის, მოტივაციის დეფიციტი.' },
    earth: { title: 'მიწა', body: 'სტაბილურობა, პრაქტიკულობა და ფიზიკური სამყაროსთან კავშირი. მიწის ენერგია აშენებს, ამყარებს და ხელშესახებს ხდის — ეს არის მოთმინება, გამძლეობა და სენსორული სიბრძნე. ჭარბად — სიჯიუტე, ინერცია. ნაკლებად — დაუსაბუთებლობა, არასტაბილურობა.' },
    air: { title: 'ჰაერი', body: 'ინტელექტი, კომუნიკაცია და კავშირები. ჰაერის ენერგია აანალიზებს, აკავშირებს და გადმოსცემს — ეს არის იდეების სამყარო, სოციალური ინტელექტი და ობიექტურობა. ჭარბად — ზედმეტი ინტელექტუალიზაცია. ნაკლებად — იზოლაცია, კომუნიკაციის სირთულე.' },
    water: { title: 'წყალი', body: 'ემოციები, ინტუიცია და ფსიქიკური სიღრმე. წყლის ენერგია გრძნობს, კურნავს და გარდაქმნის — ეს არის ემპათია, წარმოსახვა და არაცნობიერთან კავშირი. ჭარბად — ემოციური დატბორვა. ნაკლებად — ემოციური სიცარიელე, გაუცხოება.' }
  },
  en: {
    fire: { title: 'Fire', body: 'Intuition, inspiration, and spontaneous action. Fire energy creates, initiates, and ignites — willpower, confidence, and the thirst for life.' },
    earth: { title: 'Earth', body: 'Stability, practicality, and connection to the physical world. Earth energy builds, grounds, and materialises — patience, endurance, and sensory wisdom.' },
    air: { title: 'Air', body: 'Intellect, communication, and connections. Air energy analyses, links, and transmits — the world of ideas, social intelligence, and objectivity.' },
    water: { title: 'Water', body: 'Emotions, intuition, and psychic depth. Water energy feels, heals, and transforms — empathy, imagination, and connection to the unconscious.' }
  }
};

// Aspect popups (synastry)
const aspectData = {
  ka: {
    harmony: { t: 'ჰარმონია — ტრინი / სექსტილი', b: 'მხარდამჭერი, მიმდინარე ენერგია ორ პლანეტას შორის. ნიჭი, რომელიც ბუნებრივად მოედინება — ძალისხმევის გარეშე.' },
    tension: { t: 'დაძაბულობა — კვადრატი / ოპოზიცია', b: 'ფრიქცია და გამოწვევა ორ პლანეტას შორის. ეს არის ზრდის ძრავა — არაკომფორტული, მაგრამ ტრანსფორმაციული.' },
    magnetic: { t: 'მაგნიტური — კონიუნქცია / კარმული', b: 'გაერთიანების, შერწყმის ენერგია. კონიუნქცია ორ პლანეტას ერთ ძალად აქცევს — ინტენსიური, განუყოფელი.' }
  },
  en: {
    harmony: { t: 'Harmony — Trine / Sextile', b: 'Supportive, flowing energy between two planets. A natural gift that requires no effort.' },
    tension: { t: 'Tension — Square / Opposition', b: 'Friction and challenge between two planets. This is the engine of growth — uncomfortable but transformational.' },
    magnetic: { t: 'Magnetic — Conjunction / Karmic', b: 'Merging, unifying energy. Conjunction fuses two planets into one force — intense, inseparable.' }
  }
};

// Planet popups (natal)
const plData = {
  ka: {
    sun: { t: '☉ მზე', b: 'იდენტობა, ეგო და ცხოვრების ძირითადი ენერგია. მზე აჩვენებს ვინ ხარ შენს ბირთვში.' },
    moon: { t: '☽ მთვარე', b: 'ემოციები, ინსტინქტები და შინაგანი სამყარო. მთვარე აჩვენებს როგორ გრძნობ, რა გჭირდება უსაფრთხოებისთვის.' },
    mercury: { t: '☿ მერკური', b: 'გონება, კომუნიკაცია და აღქმის სტილი. მერკური აჩვენებს როგორ ფიქრობ, სწავლობ და გადმოსცემ ინფორმაციას.' },
    venus: { t: '♀ ვენერა', b: 'სიყვარული, სილამაზე და ღირებულებები. ვენერა აჩვენებს რას იზიდავ, როგორ უყვარხარ და რა არის შენთვის ლამაზი.' },
    mars: { t: '♂ მარსი', b: 'ნება, მოქმედება და სურვილი. მარსი აჩვენებს როგორ იბრძვი, რა გაღიზიანებს და სად მიმართავ ენერგიას.' },
    jupiter: { t: '♃ იუპიტერი', b: 'გაფართოება, სიბრძნე და კეთილდღეობა. იუპიტერი აჩვენებს სად იზრდები, სად გემართლება.' },
    saturn: { t: '♄ სატურნი', b: 'სტრუქტურა, დისციპლინა და კარმული გაკვეთილები. სატურნი აჩვენებს სად არის შენი უდიდესი გამოწვევა.' },
    uranus: { t: '♅ ურანი', b: 'თავისუფლება, ინოვაცია და გარღვევა. ურანი აჩვენებს სად ხარ ამბოხებელი, სად ეძებ ორიგინალურობას.' },
    neptune: { t: '♆ ნეპტუნი', b: 'ოცნება, სულიერება და ტრანსცენდენცია. ნეპტუნი აჩვენებს სად ეძებ საღვთოს, სად ილუზიონირებ.' },
    pluto: { t: '♇ პლუტონი', b: 'ტრანსფორმაცია, ძალაუფლება და აღდგენა. პლუტონი აჩვენებს სად ხდება ფსიქიკური სიკვდილ-აღდგომა.' }
  },
  en: {
    sun: { t: '☉ Sun', b: 'Identity, ego, and core life energy. The Sun reveals who you are at your essence.' },
    moon: { t: '☽ Moon', b: 'Emotions, instincts, and inner world. The Moon reveals how you feel and what you need to feel safe.' },
    mercury: { t: '☿ Mercury', b: 'Mind, communication, and perception style. Mercury reveals how you think, learn, and express ideas.' },
    venus: { t: '♀ Venus', b: 'Love, beauty, and values. Venus reveals what you attract, how you love, and what you find beautiful.' },
    mars: { t: '♂ Mars', b: 'Will, action, and desire. Mars reveals how you fight, what drives you, and where you direct your energy.' },
    jupiter: { t: '♃ Jupiter', b: 'Expansion, wisdom, and abundance. Jupiter reveals where you grow and where fortune finds you.' },
    saturn: { t: '♄ Saturn', b: 'Structure, discipline, and karmic lessons. Saturn reveals where your greatest challenge — and mastery — lies.' },
    uranus: { t: '♅ Uranus', b: 'Freedom, innovation, and breakthrough. Uranus reveals where you rebel and where you seek originality.' },
    neptune: { t: '♆ Neptune', b: 'Dreams, spirituality, and transcendence. Neptune reveals where you seek the divine and where illusion lives.' },
    pluto: { t: '♇ Pluto', b: 'Transformation, power, and rebirth. Pluto reveals where deep psychological death and renewal take place.' }
  }
};

let activePopup = null, activeTag = null;
function closePopup() {
  if (activePopup) {
    activePopup.classList.remove('show');
    const p = activePopup;
    setTimeout(() => p.remove(), 250);
    activePopup = null; activeTag = null;
  }
}

function getElType(el) {
  if (el.classList.contains('ef')) return 'fire';
  if (el.classList.contains('ee')) return 'earth';
  if (el.classList.contains('ea')) return 'air';
  if (el.classList.contains('ew')) return 'water';
  return null;
}

// ═══ DELEGATED POPUP HANDLERS ═══
// All popup interactions use event delegation so they work on dynamically hydrated content.

function _showPopup(anchor, className, titleHtml, bodyHtml) {
  closePopup();
  const pop = document.createElement('div');
  pop.className = 'el-popup ' + className;
  pop.innerHTML = '<div class="el-popup-title">' + titleHtml + '</div><div class="el-popup-body">' + bodyHtml + '</div>';
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.min(r.left, window.innerWidth - 275) + 'px';
  pop.style.top = (r.top - pop.offsetHeight - 8) + 'px';
  if (r.top - pop.offsetHeight - 8 < 60) pop.style.top = (r.bottom + 8) + 'px';
  requestAnimationFrame(() => pop.classList.add('show'));
  activePopup = pop; activeTag = anchor;
}

document.addEventListener('click', e => {
  // Element tag popups (.et)
  const etTag = _closest(e.target, '.et');
  if (etTag) {
    e.stopPropagation();
    if (activeTag === etTag) { closePopup(); return; }
    const type = getElType(etTag); if (!type) return;
    const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
    const d = elData[lang][type];
    _showPopup(etTag, type + '-pop', d.title, d.body);
    return;
  }

  // Planet button popups (.pl-btn)
  const plBtn = _closest(e.target, '.pl-btn');
  if (plBtn) {
    e.stopPropagation();
    const key = plBtn.getAttribute('data-pl'); if (!key) return;
    if (activeTag === plBtn) { closePopup(); return; }
    const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
    const d = plData[lang][key];
    if (!d) return;
    _showPopup(plBtn, 'planet-pop', d.t, d.b);
    return;
  }

  // Aspect tag popups (.aspect-tag)
  const aspTag = _closest(e.target, '.aspect-tag');
  if (aspTag) {
    e.stopPropagation();
    if (activeTag === aspTag) { closePopup(); return; }
    let type = null;
    if (aspTag.classList.contains('harmony')) type = 'harmony';
    else if (aspTag.classList.contains('tension')) type = 'tension';
    else if (aspTag.classList.contains('magnetic')) type = 'magnetic';
    if (!type) return;
    const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
    const d = aspectData[lang][type];
    _showPopup(aspTag, type + '-pop', d.t, d.b);
    return;
  }

  // Close popup when clicking elsewhere
  if (activePopup && !_closest(e.target, '.el-popup') && !_closest(e.target, '.mc-sign-btn')) closePopup();
});

// Close popup on mouseleave from element tags (delegated)
document.addEventListener('mouseleave', e => {
  var tag = _closest(e.target, '.et');
  if (tag && activePopup) {
    setTimeout(() => { if (activePopup && !activePopup.matches(':hover')) closePopup(); }, 150);
  }
}, true);

// ═══ MINI NATAL CHART ═══

// Helpers for converting reading planet data → chart format
var _ZODIAC_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
var _PLANET_KA = { sun:'მზე', moon:'მთვარე', mercury:'მერკური', venus:'ვენერა', mars:'მარსი', jupiter:'იუპიტერი', saturn:'სატურნი', uranus:'ურანი', neptune:'ნეპტუნი', pluto:'პლუტონი' };
var _PLANET_META = {
  sun:     { g:'☉', r:4.5, c:'#c9a84c' }, moon:    { g:'☽', r:4,   c:'#b8b8cc' },
  mercury: { g:'☿', r:3,   c:'#8ab5d4' }, venus:   { g:'♀', r:3.5, c:'#c47a8a' },
  mars:    { g:'♂', r:3,   c:'#d4644a' }, jupiter: { g:'♃', r:3,   c:'#8a7abf' },
  saturn:  { g:'♄', r:3,   c:'#7a8a6e' }, uranus:  { g:'♅', r:3,   c:'#5a9ab5' },
  neptune: { g:'♆', r:2.5, c:'#6b7baa' }, pluto:   { g:'♇', r:2.5, c:'#9a6b6b' }
};

function _signDegToEcl(sign, degStr) {
  var idx = _ZODIAC_EN.indexOf(sign);
  if (idx < 0) return 0;
  var m = (degStr || '').match(/(\d+)[°º](\d+)/);
  var d = m ? parseInt(m[1]) + parseInt(m[2]) / 60 : 0;
  return idx * 30 + d;
}

function _readingToChartPlanets(planetTable) {
  var out = [];
  planetTable.forEach(function(row) {
    var key = (row.planet || row.name || '').toLowerCase().replace(/[^a-z]/g, '');
    var meta = _PLANET_META[key];
    if (!meta) return;
    var ecl = _signDegToEcl(row.sign, row.degree);
    out.push({
      n: _PLANET_KA[key] || row.planet || key,
      g: row.symbol || meta.g,
      deg: ecl,
      si: _ZODIAC_EN.indexOf(row.sign),
      sd: (row.degree || '') + (row.retrograde ? '℞' : ''),
      h: row.house || '',
      r: meta.r,
      c: meta.c
    });
  });
  return out;
}

var _DEMO_PLANETS = [
  { n: 'მზე', g: '☉', deg: 202.33, si: 6, sd: "22°20'", h: 'III', r: 4.5, c: '#c9a84c' },
  { n: 'მთვარე', g: '☽', deg: 152.67, si: 5, sd: "2°40'", h: 'II', r: 4, c: '#b8b8cc' },
  { n: 'მერკური', g: '☿', deg: 215.92, si: 7, sd: "5°55'", h: 'IV', r: 3, c: '#8ab5d4' },
  { n: 'ვენერა', g: '♀', deg: 198.67, si: 6, sd: "18°40'", h: 'III', r: 3.5, c: '#c47a8a' },
  { n: 'მარსი', g: '♂', deg: 155.12, si: 5, sd: "5°07'", h: 'II', r: 3, c: '#d4644a' },
  { n: 'იუპიტერი', g: '♃', deg: 349.53, si: 11, sd: "19°32'℞", h: 'VIII', r: 3, c: '#8a7abf' },
  { n: 'სატურნი', g: '♄', deg: 30.78, si: 1, sd: "0°47'℞", h: 'X', r: 3, c: '#7a8a6e' },
  { n: 'ურანი', g: '♅', deg: 308.82, si: 10, sd: "8°49'℞", h: 'VII', r: 3, c: '#5a9ab5' },
  { n: 'ნეპტუნი', g: '♆', deg: 299.4, si: 9, sd: "29°24'", h: 'VI', r: 2.5, c: '#6b7baa' },
  { n: 'პლუტონი', g: '♇', deg: 246.3, si: 8, sd: "6°18'", h: 'V', r: 2.5, c: '#9a6b6b' }
];

function renderMiniChart(planetsIn, ascEclIn, mcEclIn) {
  const svg = document.getElementById('miniChart');
  if (!svg) return;
  const wrap = svg.parentElement;
  const tip = document.getElementById('chartTip');
  const CX = 210, CY = 210, R = 190, RI = 150, RP = 118;
  const SIGN_KA = ['ვერძი','კურო','ტყუპი','კირჩხიბი','ლომი','ქალწული','სასწორი','მორიელი','მშვილდოსანი','თხის რქა','მერწყული','თევზები'];
  const SIGN_IDS = ['gl-aries','gl-taurus','gl-gemini','gl-cancer','gl-leo','gl-virgo','gl-libra','gl-scorpio','gl-sagittarius','gl-capricorn','gl-aquarius','gl-pisces'];
  const ASC_ECL = (ascEclIn != null) ? ascEclIn : 137.33;
  const MC_ECL  = (mcEclIn  != null) ? mcEclIn  : 37.65;
  const planets = planetsIn || _DEMO_PLANETS;
  // Convert ecliptic degree to SVG input angle: ASC at LEFT (270°), counterclockwise for increasing ecliptic
  function eclToAngle(ecl) { return (270 + (ecl - ASC_ECL) + 360) % 360; }
  function pos(ecl, r) {
    const a = (eclToAngle(ecl) - 90) * Math.PI / 180;
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
  }
  // Draw rings
  let h = '<defs><filter id="mcGlow"><feGaussianBlur stdDeviation="3" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
  h += '<circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="none" stroke="rgba(201,168,76,.15)" stroke-width="1" class="mc-ring"/>';
  h += '<circle cx="'+CX+'" cy="'+CY+'" r="'+RI+'" fill="none" stroke="rgba(201,168,76,.1)" stroke-width=".7" class="mc-ring-inner"/>';
  // Inner circle (small center)
  h += '<circle cx="'+CX+'" cy="'+CY+'" r="38" fill="none" stroke="rgba(201,168,76,.06)" stroke-width=".5"/>';
  // Zodiac signs with divider lines between them on the outer ring
  for (let i = 0; i < 12; i++) {
    const signStart = i * 30; // ecliptic degree where sign starts
    const signMid = signStart + 15; // midpoint for glyph placement
    const d = .7 + i * .08;
    // Divider line at sign boundary (on outer ring between R and RI)
    const divP1 = pos(signStart, R);
    const divP2 = pos(signStart, RI);
    h += '<line x1="'+divP1.x+'" y1="'+divP1.y+'" x2="'+divP2.x+'" y2="'+divP2.y+'" stroke="rgba(201,168,76,.1)" stroke-width=".6" class="mc-cusp" style="animation-delay:'+d+'s"/>';
    // Sign glyph — wrapped in clickable <g> with hover area
    const gp = pos(signMid, (R + RI) / 2 + 2);
    h += '<g data-sign="'+i+'" style="cursor:pointer" class="mc-sign-btn">';
    h += '<circle cx="'+gp.x+'" cy="'+gp.y+'" r="12" fill="transparent" stroke="none"/>';
    h += '<use href="#'+SIGN_IDS[i]+'" x="'+(gp.x-7)+'" y="'+(gp.y-7)+'" width="14" height="14" fill="none" stroke="rgba(201,168,76,.35)" stroke-width=".9" class="mc-sign" style="animation-delay:'+(d+.05)+'s"/>';
    h += '</g>';
  }
  // ASC label — outside the outer ring, at the LEFT
  const ascP = pos(ASC_ECL, R + 22);
  h += '<text x="'+(ascP.x - 4)+'" y="'+(ascP.y+5)+'" text-anchor="end" font-family="Outfit,sans-serif" font-size="13" font-weight="500" letter-spacing=".14em" fill="#c9a84c" class="mc-label" style="animation-delay:1.8s">ASC</text>';
  // MC label — outside the outer ring, at the BOTTOM
  const mcP = pos(MC_ECL, R + 22);
  h += '<text x="'+mcP.x+'" y="'+(mcP.y+14)+'" text-anchor="middle" font-family="Outfit,sans-serif" font-size="13" font-weight="500" letter-spacing=".14em" fill="#c9a84c" class="mc-label" style="animation-delay:1.9s">MC</text>';
  // ASC–DSC axis line (horizontal, subtle)
  const ascA = pos(ASC_ECL, RI); const dscA = pos(ASC_ECL + 180, RI);
  h += '<line x1="'+ascA.x+'" y1="'+ascA.y+'" x2="'+dscA.x+'" y2="'+dscA.y+'" stroke="rgba(201,168,76,.08)" stroke-width=".5"/>';
  // MC–IC axis line
  const mcA = pos(MC_ECL, RI); const icA = pos(MC_ECL + 180, RI);
  h += '<line x1="'+mcA.x+'" y1="'+mcA.y+'" x2="'+icA.x+'" y2="'+icA.y+'" stroke="rgba(201,168,76,.08)" stroke-width=".5"/>';
  // Planets — colored dots only
  const placed = [];
  planets.forEach((p, i) => {
    let pr = RP;
    for (const pp of placed) {
      const diff = Math.abs(p.deg - pp.deg);
      if ((diff < 8 && diff > 0) || diff > 352) { pr -= 20; break; }
    }
    placed.push({ i, deg: p.deg, pr });
    const pt = pos(p.deg, pr);
    const d = 1.2 + i * .12;
    h += '<g data-i="'+i+'" style="cursor:pointer;animation-delay:'+d+'s" class="mc-planet">';
    h += '<circle class="p-aura" cx="'+pt.x+'" cy="'+pt.y+'" r="14" fill="'+p.c+'" opacity="0"/>';
    h += '<circle class="p-core" cx="'+pt.x+'" cy="'+pt.y+'" r="'+p.r+'" fill="'+p.c+'" opacity=".8"/>';
    h += '</g>';
  });
  svg.innerHTML = h;
  // Tooltips
  svg.querySelectorAll('[data-i]').forEach(g => {
    g.addEventListener('mouseenter', () => {
      const i = +g.getAttribute('data-i');
      const p = planets[i];
      g.querySelector('.p-aura').setAttribute('opacity', '.12');
      g.querySelector('.p-core').setAttribute('opacity', '1');
      g.querySelector('.p-core').setAttribute('filter', 'url(#mcGlow)');
      g.querySelector('.p-core').setAttribute('r', String(p.r * 1.4));
      svg.querySelectorAll('[data-i]').forEach(o => {
        if (o !== g) o.querySelector('.p-core').setAttribute('opacity', '.2');
      });
      tip.querySelector('.tip-planet').textContent = p.g + ' ' + p.n;
      tip.querySelector('.tip-sign').textContent = SIGN_KA[p.si] + ' ' + p.sd;
      tip.querySelector('.tip-house').textContent = p.h + ' სახლი';
      const pp = pos(p.deg, placed.find(x => x.i === i)?.pr || RP);
      const sr = svg.getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      tip.style.left = ((pp.x / 420) * sr.width + sr.left - wr.left) + 'px';
      tip.style.top = ((pp.y / 420) * sr.height + sr.top - wr.top) + 'px';
      tip.classList.add('show');
    });
    g.addEventListener('mouseleave', () => {
      const i = +g.getAttribute('data-i');
      const p = planets[i];
      g.querySelector('.p-aura').setAttribute('opacity', '0');
      g.querySelector('.p-core').setAttribute('opacity', '.8');
      g.querySelector('.p-core').removeAttribute('filter');
      g.querySelector('.p-core').setAttribute('r', String(p.r));
      svg.querySelectorAll('[data-i]').forEach(o => {
        o.querySelector('.p-core').setAttribute('opacity', '.8');
      });
      tip.classList.remove('show');
    });
  });

  // Zodiac sign popup data
  const signData = {
    ka: [
      { t: 'ვერძი', b: 'პიონერი. ცეცხლის პირველი ნიშანი — იმპულსი, თამამობა, ახლის დაწყება. მარსი მართავს. ენერგია: „მე ვარ." ყველაფერი იწყება ვერძით — პირველი ნაბიჯი, პირველი სუნთქვა.' },
      { t: 'კურო', b: 'მშენებელი. მიწის პირველი ნიშანი — სტაბილურობა, სენსორული სიამოვნება, ღირებულებები. ვენერა მართავს. ენერგია: „მე მაქვს." სხეული, ქონება, სილამაზე — ხელშესახები სამყარო.' },
      { t: 'ტყუპი', b: 'კომუნიკატორი. ჰაერის პირველი ნიშანი — ცნობისმოყვარეობა, ადაპტაცია, ინფორმაციის გაცვლა. მერკური მართავს. ენერგია: „მე ვფიქრობ." ორადობა, სიჩქარე, კავშირები.' },
      { t: 'კირჩხიბი', b: 'მზრუნველი. წყლის პირველი ნიშანი — ემოცია, ოჯახი, დაცვა. მთვარე მართავს. ენერგია: „მე ვგრძნობ." შინაგანი სამყარო, მეხსიერება, ინტუიცია.' },
      { t: 'ლომი', b: 'შემოქმედი. ცეცხლის მეორე ნიშანი — თვითგამოხატვა, სიხარული, ლიდერობა. მზე მართავს. ენერგია: „მე ვქმნი." გულუხვობა, დრამა, ავთენტურობა.' },
      { t: 'ქალწული', b: 'ანალიტიკოსი. მიწის მეორე ნიშანი — სიზუსტე, მსახურება, სრულყოფა. მერკური მართავს. ენერგია: „მე ვაანალიზებ." დეტალი, ხელობა, განკურნება.' },
      { t: 'სასწორი', b: 'დიპლომატი. ჰაერის მეორე ნიშანი — ბალანსი, ურთიერთობა, სამართლიანობა. ვენერა მართავს. ენერგია: „მე ვაბალანსებ." ჰარმონია, ესთეტიკა, პარტნიორობა.' },
      { t: 'მორიელი', b: 'ტრანსფორმატორი. წყლის მეორე ნიშანი — სიღრმე, ძალაუფლება, აღდგენა. პლუტონი მართავს. ენერგია: „მე ვარდაქმნი." ინტენსივობა, საიდუმლო, სიკვდილ-აღდგომა.' },
      { t: 'მშვილდოსანი', b: 'მკვლევარი. ცეცხლის მესამე ნიშანი — ფილოსოფია, თავისუფლება, ჰორიზონტი. იუპიტერი მართავს. ენერგია: „მე ვეძებ." მოგზაურობა, სიბრძნე, ოპტიმიზმი.' },
      { t: 'თხის რქა', b: 'არქიტექტორი. მიწის მესამე ნიშანი — ამბიცია, სტრუქტურა, მოწიფულობა. სატურნი მართავს. ენერგია: „მე ვაშენებ." დისციპლინა, დრო, მემკვიდრეობა.' },
      { t: 'მერწყული', b: 'ინოვატორი. ჰაერის მესამე ნიშანი — თავისუფლება, ორიგინალობა, კოლექტივი. ურანი მართავს. ენერგია: „მე ვცვლი." მომავალი, ტექნოლოგია, ჰუმანიზმი.' },
      { t: 'თევზები', b: 'მისტიკოსი. წყლის მესამე ნიშანი — ტრანსცენდენცია, თანაგრძნობა, ოცნება. ნეპტუნი მართავს. ენერგია: „მე ვწუხვარ." ხელოვნება, სულიერება, საზღვრების გაქრობა.' }
    ],
    en: [
      { t: 'Aries', b: 'The Pioneer. First fire sign — impulse, courage, new beginnings. Ruled by Mars. Energy: "I am." Everything starts with Aries.' },
      { t: 'Taurus', b: 'The Builder. First earth sign — stability, sensory pleasure, values. Ruled by Venus. Energy: "I have." The tangible world.' },
      { t: 'Gemini', b: 'The Communicator. First air sign — curiosity, adaptation, information exchange. Ruled by Mercury. Energy: "I think."' },
      { t: 'Cancer', b: 'The Nurturer. First water sign — emotion, family, protection. Ruled by the Moon. Energy: "I feel." Inner world, memory, intuition.' },
      { t: 'Leo', b: 'The Creator. Second fire sign — self-expression, joy, leadership. Ruled by the Sun. Energy: "I create." Generosity, drama, authenticity.' },
      { t: 'Virgo', b: 'The Analyst. Second earth sign — precision, service, refinement. Ruled by Mercury. Energy: "I analyze." Detail, craft, healing.' },
      { t: 'Libra', b: 'The Diplomat. Second air sign — balance, relationship, justice. Ruled by Venus. Energy: "I balance." Harmony, aesthetics, partnership.' },
      { t: 'Scorpio', b: 'The Transformer. Second water sign — depth, power, regeneration. Ruled by Pluto. Energy: "I transform." Intensity, secrets, death-rebirth.' },
      { t: 'Sagittarius', b: 'The Explorer. Third fire sign — philosophy, freedom, horizon. Ruled by Jupiter. Energy: "I seek." Travel, wisdom, optimism.' },
      { t: 'Capricorn', b: 'The Architect. Third earth sign — ambition, structure, maturity. Ruled by Saturn. Energy: "I build." Discipline, time, legacy.' },
      { t: 'Aquarius', b: 'The Innovator. Third air sign — freedom, originality, collective. Ruled by Uranus. Energy: "I change." Future, technology, humanism.' },
      { t: 'Pisces', b: 'The Mystic. Third water sign — transcendence, compassion, dreams. Ruled by Neptune. Energy: "I dream." Art, spirituality, dissolving boundaries.' }
    ]
  };

  // Sign click handlers — show on click, close on mouseleave
  svg.querySelectorAll('.mc-sign-btn').forEach(g => {
    g.addEventListener('click', e => {
      e.stopPropagation();
      const si = +g.getAttribute('data-sign');
      if (activeTag === g) { closePopup(); return; }
      closePopup();
      const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
      const d = signData[lang][si];
      const signSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" style="vertical-align:-2px;margin-right:4px"><use href="#' + SIGN_IDS[si] + '"/></svg>';
      const pop = document.createElement('div');
      pop.className = 'el-popup planet-pop';
      pop.innerHTML = '<div class="el-popup-title">' + signSvg + d.t + '</div><div class="el-popup-body">' + d.b + '</div>';
      document.body.appendChild(pop);
      const r = g.getBoundingClientRect();
      pop.style.left = Math.min(r.left + r.width / 2, window.innerWidth - 275) + 'px';
      pop.style.top = (r.top - pop.offsetHeight - 8) + 'px';
      if (r.top - pop.offsetHeight - 8 < 60) pop.style.top = (r.bottom + 8) + 'px';
      requestAnimationFrame(() => pop.classList.add('show'));
      activePopup = pop; activeTag = g;
    });
    g.addEventListener('mouseleave', () => {
      setTimeout(() => { if (activePopup && !activePopup.matches(':hover')) closePopup(); }, 200);
    });
  });
}
// Initial render with demo data — replaced with real data by hydrateReading()
renderMiniChart();

// ═══ SHOOTING STAR ═══
(function() {
  const canvas = document.getElementById('shootingStar');
  const ctx = canvas.getContext('2d');
  let w, h, particles = [], mouse = { x: -100, y: -100, px: -100, py: -100 };
  let raf;
  function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  document.addEventListener('mousemove', e => {
    mouse.px = mouse.x; mouse.py = mouse.y;
    mouse.x = e.clientX; mouse.y = e.clientY;
    const dx = mouse.x - mouse.px, dy = mouse.y - mouse.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const count = Math.min(Math.floor(dist / 3), 8);
    for (let i = 0; i < count; i++) { const t = i / count; spawn(mouse.px + dx * t, mouse.py + dy * t, dx, dy); }
  });
  document.addEventListener('touchmove', e => {
    const touch = e.touches[0];
    mouse.px = mouse.x; mouse.py = mouse.y;
    mouse.x = touch.clientX; mouse.y = touch.clientY;
    const dx = mouse.x - mouse.px, dy = mouse.y - mouse.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const count = Math.min(Math.floor(dist / 4), 6);
    for (let i = 0; i < count; i++) { const t = i / count; spawn(mouse.px + dx * t, mouse.py + dy * t, dx, dy); }
  }, { passive: true });
  function spawn(x, y, vx, vy) {
    const angle = Math.atan2(vy, vx) + (Math.random() - .5) * 1.2;
    const vel = Math.random() * 1.5 + .3, size = Math.random() * 2.2 + .6, life = Math.random() * 35 + 20;
    const colors = [[201, 168, 76], [230, 210, 140], [255, 248, 220], [180, 150, 60], [220, 200, 160]];
    const c = colors[Math.floor(Math.random() * colors.length)];
    const speed = Math.sqrt(vx * vx + vy * vy);
    particles.push({ x, y, vx: Math.cos(angle) * vel - vx * 0.01, vy: Math.sin(angle) * vel - vy * 0.01 + .15, size, life, maxLife: life, r: c[0], g: c[1], b: c[2], bright: Math.random() > .7 && speed > 4 });
  }
  let lastTipX = -1;
  function emitFromBar() {
    const bar = document.getElementById('prog'); if (!bar) return;
    const tipX = bar.offsetWidth; if (tipX < 3) return;
    const moved = Math.abs(tipX - lastTipX); lastTipX = tipX;
    if (moved < .2) return;
    const count = Math.min(Math.ceil(moved / 2), 3);
    for (let i = 0; i < count; i++) {
      const colors = [[201, 168, 76], [230, 210, 140], [255, 248, 220]];
      const c = colors[Math.floor(Math.random() * colors.length)];
      const angle = Math.random() * Math.PI * 2, vel = Math.random() * .6 + .2;
      const life = Math.random() * 35 + 20;
      particles.push({ x: tipX, y: 58, vx: Math.cos(angle) * vel, vy: Math.sin(angle) * vel - .1, size: Math.random() * 1.5 + .5, life, maxLife: life, r: c[0], g: c[1], b: c[2], bright: Math.random() > .5 });
    }
  }
  function animate() {
    ctx.clearRect(0, 0, w, h);
    emitFromBar();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += .02; p.vx *= .985; p.vy *= .985; p.life--;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      const ratio = p.life / p.maxLife, alpha = ratio * (p.bright ? .9 : .6), s = p.size * (.3 + ratio * .7);
      if (s > 1) { ctx.beginPath(); ctx.arc(p.x, p.y, s * 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + (alpha * .12) + ')'; ctx.fill(); }
      ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + alpha + ')'; ctx.fill();
    }
    raf = requestAnimationFrame(animate);
  }
  animate();
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(animate); });
})();


// ═══ AUTH FUNCTIONS ═══
let authStep = 1;
let selectedGender = '';

function showAuthPage(id) {
  document.querySelectorAll('.auth-page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.msg').forEach(m => { m.classList.remove('show'); m.textContent = ''; });
  if (id === 'page-forgot') { document.getElementById('forgot-form').style.display = 'block'; document.getElementById('forgot-success').style.display = 'none'; }
}

function goAuthStep(n) {
  authStep = n;
  updateAuthStepUI();
  if (n === 1) showAuthPage('page-login');
  else if (n === 2) showAuthPage('page-birth');
  else if (n === 3) startLoading();
}

function updateAuthStepUI() {
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById('sd' + i);
    const line = document.getElementById('sl' + (i - 1));
    if (dot) { dot.className = 'step-dot' + (i < authStep ? ' done' : '') + (i === authStep ? ' active' : ''); }
    if (line) { line.className = 'step-line' + (i <= authStep ? ' done' : ''); }
  }
}

function togglePw(btn) {
  const input = btn.previousElementSibling;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.textContent = show ? 'დამალვა' : 'ჩვენება';
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg; el.classList.add('show');
}

function selectGender(el, v) {
  document.querySelectorAll('.gender-opt').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  selectedGender = v;
}

function toggleTimeUnknown() {
  const unk = document.getElementById('time-unknown').checked;
  ['birth-hour', 'birth-min'].forEach(id => {
    const el = document.getElementById(id);
    el.disabled = unk; el.style.opacity = unk ? .4 : 1;
  });
}

function handleGoogle() { goAuthStep(2); }
function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pw = document.getElementById('login-pw').value;
  if (!email) return showAuthError('login-error', 'შეიყვანე ელ-ფოსტა');
  if (!pw) return showAuthError('login-error', 'შეიყვანე პაროლი');
  const btn = event.target.closest('.auth-btn'); btn.classList.add('loading');
  setTimeout(() => { btn.classList.remove('loading'); goAuthStep(2); }, 1200);
}
function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pw = document.getElementById('signup-pw').value;
  if (!name) return showAuthError('signup-error', 'შეიყვანე სახელი');
  if (!email) return showAuthError('signup-error', 'შეიყვანე ელ-ფოსტა');
  if (pw.length < 8) return showAuthError('signup-error', 'პაროლი მინ. 8 სიმბოლო');
  const btn = event.target.closest('.auth-btn'); btn.classList.add('loading');
  setTimeout(() => { btn.classList.remove('loading'); goAuthStep(2); }, 1200);
}
function handleForgot() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) return showAuthError('forgot-error', 'შეიყვანე ელ-ფოსტა');
  const btn = event.target.closest('.auth-btn'); btn.classList.add('loading');
  setTimeout(() => { btn.classList.remove('loading'); document.getElementById('forgot-form').style.display = 'none'; document.getElementById('forgot-success').style.display = 'block'; }, 1200);
}
function handleBirthData() {
  const day = document.getElementById('birth-day').value;
  const month = document.getElementById('birth-month').value;
  const year = document.getElementById('birth-year').value;
  const place = document.getElementById('birth-place').value.trim();
  if (!day || !month || !year) return showAuthError('birth-error', 'შეავსე დაბადების თარიღი');
  if (!place) return showAuthError('birth-error', 'მიუთითე დაბადების ადგილი');
  if (!selectedGender) return showAuthError('birth-error', 'აირჩიე სქესი');
  goAuthStep(3);
}

// Populate birth selects
(function populateBirthSelects() {
  const months = ['იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი','ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი'];
  const d = document.getElementById('birth-day'); if (!d) return;
  for (let i = 1; i <= 31; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i; d.appendChild(o); }
  const m = document.getElementById('birth-month');
  months.forEach((n, i) => { const o = document.createElement('option'); o.value = i + 1; o.textContent = n; m.appendChild(o); });
  const y = document.getElementById('birth-year');
  for (let i = 2010; i >= 1930; i--) { const o = document.createElement('option'); o.value = i; o.textContent = i; y.appendChild(o); }
  const h = document.getElementById('birth-hour');
  for (let i = 0; i < 24; i++) { const o = document.createElement('option'); o.value = i; o.textContent = String(i).padStart(2, '0'); h.appendChild(o); }
  const mn = document.getElementById('birth-min');
  for (let i = 0; i < 60; i += 5) { const o = document.createElement('option'); o.value = i; o.textContent = String(i).padStart(2, '0'); mn.appendChild(o); }
})();

// Place suggestions
(function() {
  const cities = [
    { name: 'Tbilisi', ka: 'თბილისი', country: 'Georgia', lat: 41.72, lng: 44.79, tz: 'Asia/Tbilisi' },
    { name: 'Batumi', ka: 'ბათუმი', country: 'Georgia', lat: 41.64, lng: 41.64, tz: 'Asia/Tbilisi' },
    { name: 'Kutaisi', ka: 'ქუთაისი', country: 'Georgia', lat: 42.27, lng: 42.70, tz: 'Asia/Tbilisi' },
    { name: 'Rustavi', ka: 'რუსთავი', country: 'Georgia', lat: 41.55, lng: 45.00, tz: 'Asia/Tbilisi' },
    { name: 'Gori', ka: 'გორი', country: 'Georgia', lat: 41.98, lng: 44.11, tz: 'Asia/Tbilisi' },
    { name: 'Zugdidi', ka: 'ზუგდიდი', country: 'Georgia', lat: 42.51, lng: 41.87, tz: 'Asia/Tbilisi' },
    { name: 'Dubai', ka: 'დუბაი', country: 'UAE', lat: 25.20, lng: 55.27, tz: 'Asia/Dubai' },
    { name: 'London', ka: 'ლონდონი', country: 'UK', lat: 51.51, lng: -0.12, tz: 'Europe/London' },
    { name: 'Moscow', ka: 'მოსკოვი', country: 'Russia', lat: 55.75, lng: 37.62, tz: 'Europe/Moscow' },
    { name: 'Istanbul', ka: 'სტამბოლი', country: 'Turkey', lat: 41.01, lng: 28.98, tz: 'Europe/Istanbul' },
    { name: 'Berlin', ka: 'ბერლინი', country: 'Germany', lat: 52.52, lng: 13.40, tz: 'Europe/Berlin' },
    { name: 'Paris', ka: 'პარიზი', country: 'France', lat: 48.86, lng: 2.35, tz: 'Europe/Paris' },
    { name: 'New York', ka: 'ნიუ-იორქი', country: 'USA', lat: 40.71, lng: -74.01, tz: 'America/New_York' },
    { name: 'Los Angeles', ka: 'ლოს-ანჯელესი', country: 'USA', lat: 34.05, lng: -118.24, tz: 'America/Los_Angeles' },
    { name: 'Kyiv', ka: 'კიევი', country: 'Ukraine', lat: 50.45, lng: 30.52, tz: 'Europe/Kyiv' },
    { name: 'Yerevan', ka: 'ერევანი', country: 'Armenia', lat: 40.18, lng: 44.51, tz: 'Asia/Yerevan' },
    { name: 'Baku', ka: 'ბაქო', country: 'Azerbaijan', lat: 40.41, lng: 49.87, tz: 'Asia/Baku' },
    { name: 'Tel Aviv', ka: 'თელ-ავივი', country: 'Israel', lat: 32.08, lng: 34.78, tz: 'Asia/Jerusalem' },
    { name: 'Rome', ka: 'რომი', country: 'Italy', lat: 41.90, lng: 12.50, tz: 'Europe/Rome' },
    { name: 'Madrid', ka: 'მადრიდი', country: 'Spain', lat: 40.42, lng: -3.70, tz: 'Europe/Madrid' },
    { name: 'Warsaw', ka: 'ვარშავა', country: 'Poland', lat: 52.23, lng: 21.01, tz: 'Europe/Warsaw' },
    { name: 'Amsterdam', ka: 'ამსტერდამი', country: 'Netherlands', lat: 52.37, lng: 4.90, tz: 'Europe/Amsterdam' },
    { name: 'Vienna', ka: 'ვენა', country: 'Austria', lat: 48.21, lng: 16.37, tz: 'Europe/Vienna' },
    { name: 'Prague', ka: 'პრაღა', country: 'Czech Republic', lat: 50.08, lng: 14.44, tz: 'Europe/Prague' },
    { name: 'Stockholm', ka: 'სტოკჰოლმი', country: 'Sweden', lat: 59.33, lng: 18.07, tz: 'Europe/Stockholm' },
    { name: 'Lisbon', ka: 'ლისაბონი', country: 'Portugal', lat: 38.72, lng: -9.14, tz: 'Europe/Lisbon' },
    { name: 'Athens', ka: 'ათენი', country: 'Greece', lat: 37.98, lng: 23.73, tz: 'Europe/Athens' },
    { name: 'Toronto', ka: 'ტორონტო', country: 'Canada', lat: 43.65, lng: -79.38, tz: 'America/Toronto' },
    { name: 'Sydney', ka: 'სიდნეი', country: 'Australia', lat: -33.87, lng: 151.21, tz: 'Australia/Sydney' },
    { name: 'Tokyo', ka: 'ტოკიო', country: 'Japan', lat: 35.68, lng: 139.69, tz: 'Asia/Tokyo' },
  ];
  const placeInput = document.getElementById('birth-place');
  const sugBox = document.getElementById('placeSuggestions');
  if (!placeInput || !sugBox) return;
  placeInput.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    if (q.length < 2) { sugBox.classList.remove('open'); return; }
    const matches = cities.filter(c => c.name.toLowerCase().includes(q) || c.ka.includes(q));
    if (!matches.length) { sugBox.classList.remove('open'); return; }
    sugBox.innerHTML = '';
    matches.slice(0, 5).forEach(c => {
      const d = document.createElement('div'); d.className = 'place-item';
      d.innerHTML = c.ka + '<small>' + c.country + ' · ' + c.lat.toFixed(2) + '°N, ' + c.lng.toFixed(2) + '°E</small>';
      d.onclick = () => {
        placeInput.value = c.ka;
        // Store minimal geo context for server-side chart generation.
        // This is a dev fallback when Google Places isn't wired yet.
        placeInput.dataset.lat = String(c.lat);
        placeInput.dataset.lng = String(c.lng);
        placeInput.dataset.tz = c.tz;
        sugBox.classList.remove('open');
      };
      sugBox.appendChild(d);
    });
    sugBox.classList.add('open');
  });
  document.addEventListener('click', e => { if (!e.target.closest('.field')) sugBox.classList.remove('open'); });
})();

// Loading screen
const loadMsgs = ['ვარსკვლავური კოორდინატების გაანგარიშება…','პლანეტარული პოზიციების მოძიება…','ასპექტების ანალიზი…','სახლების სისტემის აგება…','ელემენტური ბალანსის შეფასება…','კარმული კვანძების ინტერპრეტაცია…','ჩრდილის ინტეგრაციის რუკა…','სულიერი გზის სინთეზი…','შენი ციური ნახაზი მზადდება…'];
const funFacts = ['თევზები ზოდიაქოს ბოლო ნიშანია — ყველა წინა ნიშნის სიბრძნეს ატარებს.','სატურნის დაბრუნება ~29 წელიწადში ხდება და სიმწიფის ახალ ციკლს იწყებს.','მთვარის კვანძები 18.6 წელიწადში ასრულებენ სრულ ციკლს.','პლუტონი მერწყულში 2024-დან 2044-მდე დარჩება — თაობრივი ტრანსფორმაცია.','ვენერა ციურ სხეულებს შორის ყველაზე სრულყოფილ წრეს ხაზავს — ვარდის ნიმუშს.'];

function startLoading() {
  // If the app is doing real server-side generation, keep the loading overlay
  // active until `window.finishLoading()` is called by the React layer.
  const liveMode = !!window.__ASTROLO_LIVE_LOADING;
  authStep = 3; updateAuthStepUI();
  document.getElementById('authWrap').style.display = 'none';
  const overlay = document.getElementById('loadingScreen');
  overlay.classList.add('active');
  // Constellation particles
  const con = document.getElementById('constellation'); con.innerHTML = '';
  for (let i = 0; i < 30; i++) {
    const d = document.createElement('div'); d.className = 'c-dot';
    d.style.left = Math.random() * 100 + '%'; d.style.top = (80 + Math.random() * 40) + '%';
    d.style.setProperty('--dur', (6 + Math.random() * 10) + 's');
    d.style.animationDelay = Math.random() * 8 + 's'; con.appendChild(d);
  }
  // Zodiac ring — SVG glyphs
  const signIds = ['gl-aries','gl-taurus','gl-gemini','gl-cancer','gl-leo','gl-virgo','gl-libra','gl-scorpio','gl-sagittarius','gl-capricorn','gl-aquarius','gl-pisces'];
  const ring = document.getElementById('zodiacRing'); ring.innerHTML = '';
  signIds.forEach((id, i) => {
    const el = document.createElement('div'); el.className = 'z-sign';
    el.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><use href="#' + id + '"/></svg>';
    const angle = (i / 12) * 360; const r = 138;
    el.style.left = (r + r * Math.cos((angle - 90) * Math.PI / 180)) + 'px';
    el.style.top = (r + r * Math.sin((angle - 90) * Math.PI / 180)) + 'px';
    el.style.transform = 'translate(-50%,-50%)'; ring.appendChild(el);
  });
  const zSigns = ring.querySelectorAll('.z-sign'); let zIdx = 0;
  const zInt = setInterval(() => { zSigns.forEach(z => z.classList.remove('lit')); if (zIdx < zSigns.length) { zSigns[zIdx].classList.add('lit'); zIdx++; } else zIdx = 0; }, 800);
  // Messages
  const msgEl = document.getElementById('loadingMsg');
  const fillEl = document.getElementById('loadingFill');
  let msgIdx = 0;
  document.getElementById('funFactText').textContent = funFacts[Math.floor(Math.random() * funFacts.length)];
  const factInt = setInterval(() => {
    const ff = document.getElementById('funFact'); ff.style.opacity = '0';
    setTimeout(() => { document.getElementById('funFactText').textContent = funFacts[Math.floor(Math.random() * funFacts.length)]; ff.style.opacity = '1'; }, 400);
  }, 5000);
  function advance() {
    if (msgIdx < loadMsgs.length) {
      msgEl.style.opacity = '0';
      setTimeout(() => { msgEl.textContent = loadMsgs[msgIdx]; msgEl.style.opacity = '1'; fillEl.style.width = ((msgIdx + 1) / loadMsgs.length * 100) + '%'; msgIdx++; }, 300);
    }
    if (!liveMode && msgIdx >= loadMsgs.length) {
      clearInterval(msgInt); clearInterval(zInt); clearInterval(factInt);
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.classList.remove('active'); overlay.style.opacity = '';
          document.getElementById('authWrap').style.display = 'flex';
          // Transition to natal reading view
          switchView('natal', document.getElementById('devNatal'));
          goAuthStep(1); showAuthPage('page-login');
        }, 600);
      }, 1500);
    }
    if (liveMode && msgIdx >= loadMsgs.length) {
      // Loop messages smoothly while real generation runs.
      msgIdx = 0;
    }
  }
  advance();
  const msgInt = setInterval(advance, 2200);

  // Expose a completion hook for the React layer.
  window.finishLoading = function finishLoading() {
    try {
      clearInterval(msgInt); clearInterval(zInt); clearInterval(factInt);
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.classList.remove('active'); overlay.style.opacity = '';
        document.getElementById('authWrap').style.display = 'flex';
        switchView('natal', document.getElementById('devNatal'));
      }, 600);
    } catch (e) {
      console.error('finishLoading failed', e);
    } finally {
      window.__ASTROLO_LIVE_LOADING = false;
    }
  };
}

// Auth panel mouse glow
document.addEventListener('mousemove', e => {
  document.querySelectorAll('.auth-panel').forEach(c => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });
});

// ═══ READING HYDRATION ═══
// Replaces hardcoded prototype content with real Claude-generated data.
// Called by HydrationBridge.tsx after reading loads from Supabase.

const SECTION_KEYS = ['overview','mission','characteristics','relationships','work','shadow','spiritual','potential'];
const SECTION_ICONS_MAP = {
  overview: 'gl-sparkle', mission: 'gl-node', characteristics: 'gl-diamond',
  relationships: 'gl-venus', work: 'gl-mars', shadow: 'gl-moon',
  spiritual: 'gl-sparkle', potential: 'gl-diamond'
};
const SECTION_NAV_LABELS = {
  ka: {
    overview: 'მიმოხილვა', mission: 'მისია', characteristics: 'მახასიათებლები',
    relationships: 'ურთიერთობები', work: 'საქმე', shadow: 'ჩრდილი',
    spiritual: 'სამშვინველი', potential: 'სრულყოფილება'
  },
  en: {
    overview: 'Overview', mission: 'Mission', characteristics: 'Characteristics',
    relationships: 'Relationships', work: 'Work', shadow: 'Shadow',
    spiritual: 'Spiritual', potential: 'Potential'
  }
};
const ELEMENT_CLASS = { fire: 'af', earth: 'ae', air: 'aa', water: 'aw' };
const ELEMENT_LABEL_CLASS = { fire: 'ef', earth: 'ee', air: 'ea', water: 'ew' };
const PLANET_KA = {
  sun: 'მზე', moon: 'მთვარე', mercury: 'მერკური', venus: 'ვენერა', mars: 'მარსი',
  jupiter: 'იუპიტერი', saturn: 'სატურნი', uranus: 'ურანი', neptune: 'ნეპტუნი',
  pluto: 'პლუტონი', lilith: 'ლილითი', 'north node': 'ჩრდ. კვანძი', 'south node': 'სამხ. კვანძი',
  chiron: 'ქირონი', ascendant: 'ასცენდენტი', asc: 'ASC', mc: 'MC', midheaven: 'MC'
};
const SIGN_KA = {
  aries: 'ვერძი', taurus: 'კურო', gemini: 'ტყუპები', cancer: 'კირჩხიბი',
  leo: 'ლომი', virgo: 'ქალწული', libra: 'სასწორი', scorpio: 'მორიელი',
  sagittarius: 'მშვილდოსანი', capricorn: 'თხის რქა', aquarius: 'მერწყული', pisces: 'თევზები'
};
var _hydrateLang = 'ka';
function _tr(map, key) {
  if (!key) return '';
  if (_hydrateLang !== 'ka') return key;
  return map[key.toLowerCase()] || key;
}

// Sign → element mapping for glyph CSS classes
const SIGN_ELEMENT = {
  aries: 'fire', taurus: 'earth', gemini: 'air', cancer: 'water',
  leo: 'fire', virgo: 'earth', libra: 'air', scorpio: 'water',
  sagittarius: 'fire', capricorn: 'earth', aquarius: 'air', pisces: 'water'
};
// Georgian sign name → English key (reverse of SIGN_KA)
const SIGN_KA_REV = {};
Object.keys(SIGN_KA).forEach(function(k) { SIGN_KA_REV[SIGN_KA[k]] = k; });
// Georgian planet name → English key (reverse of PLANET_KA)
const PLANET_KA_REV = {};
Object.keys(PLANET_KA).forEach(function(k) { PLANET_KA_REV[PLANET_KA[k]] = k; });

// Unicode planet/sign symbols → glyph IDs
const SYMBOL_TO_GLYPH = {
  '☉': 'sun', '☽': 'moon', '☿': 'mercury', '♀': 'venus', '♂': 'mars',
  '♃': 'jupiter', '♄': 'saturn', '♅': 'uranus', '♆': 'neptune', '♇': 'pluto',
  '⚸': 'lilith', '☊': 'node', '☋': 'node',
  '♈': 'aries', '♉': 'taurus', '♊': 'gemini', '♋': 'cancer',
  '♌': 'leo', '♍': 'virgo', '♎': 'libra', '♏': 'scorpio',
  '♐': 'sagittarius', '♑': 'capricorn', '♒': 'aquarius', '♓': 'pisces'
};
const SIGN_SYMBOLS = new Set(['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓']);
const PLANET_SYMBOLS = new Set(['☉','☽','☿','♀','♂','♃','♄','♅','♆','♇','⚸','☊','☋']);

// Render rich text: converts Unicode astro symbols to SVG glyphs + basic markdown (bold/italic)
function _renderRichText(text) {
  if (!text) return '';
  // First, escape HTML but preserve our markers
  var escaped = _esc(text);
  // Convert **bold** to <strong>
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Convert _italic_ or *italic* to <em>
  escaped = escaped.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em class="hl">$1</em>');
  // Highlight chart points: ASC, MC, IC → gold styled span with tooltip
  var ptTipsEn = { ASC: 'Ascendant — outer mask & first impression', MC: 'Midheaven — career & public role', IC: 'Imum Coeli — roots & private self' };
  var ptTipsKa = { ASC: 'ასცენდენტი — გარეგანი ნიღაბი და პირველი შთაბეჭდილება', MC: 'მედიუმ ცოელი — კარიერა და საჯარო როლი', IC: 'იმუმ ცოელი — ფესვები და შინაგანი სამყარო' };
  var ptTips = _hydrateLang === 'ka' ? ptTipsKa : ptTipsEn;
  escaped = escaped.replace(/\b(ASC|MC|IC)\b/g, function(m) { return '<span class="pt tip" data-tip="' + ptTips[m] + '">' + m + '</span>'; });
  // Retrograde symbol → tooltip
  var retroTip = _hydrateLang === 'ka' ? 'რეტროგრადული — ინტერნალიზებული ენერგია' : 'Retrograde — internalized energy';
  escaped = escaped.replace(/℞/g, '<span class="tip" data-tip="' + retroTip + '" style="cursor:help">℞</span>');
  // Now replace Unicode astro symbols with SVG glyphs
  var chars = Array.from(escaped);
  var result = '';
  for (var i = 0; i < chars.length; i++) {
    var ch = chars[i];
    if (SYMBOL_TO_GLYPH[ch]) {
      var glyphName = SYMBOL_TO_GLYPH[ch];
      if (PLANET_SYMBOLS.has(ch)) {
        result += '<span class="gi gi-pl"><svg><use href="#gl-' + glyphName + '"/></svg></span>';
      } else if (SIGN_SYMBOLS.has(ch)) {
        var el = SIGN_ELEMENT[glyphName] || '';
        result += '<span class="gi gi-' + el + '"><svg><use href="#gl-' + glyphName + '"/></svg></span>';
      } else {
        result += ch;
      }
    } else {
      result += ch;
    }
  }
  return result;
}

// Like _renderRichText but without tooltips on ASC/MC/IC/℞ (for use inside popups)
function _renderRichTextNoTip(text) {
  if (!text) return '';
  var escaped = _esc(text);
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em class="hl">$1</em>');
  escaped = escaped.replace(/\b(ASC|MC|IC)\b/g, '<span class="pt">$1</span>');
  var chars = Array.from(escaped);
  var result = '';
  for (var i = 0; i < chars.length; i++) {
    var ch = chars[i];
    if (SYMBOL_TO_GLYPH[ch]) {
      var glyphName = SYMBOL_TO_GLYPH[ch];
      if (PLANET_SYMBOLS.has(ch)) {
        result += '<span class="gi gi-pl"><svg><use href="#gl-' + glyphName + '"/></svg></span>';
      } else if (SIGN_SYMBOLS.has(ch)) {
        var el = SIGN_ELEMENT[glyphName] || '';
        result += '<span class="gi gi-' + el + '"><svg><use href="#gl-' + glyphName + '"/></svg></span>';
      } else { result += ch; }
    } else { result += ch; }
  }
  return result;
}

// Build rich badge HTML from a label string
// Converts Unicode symbols to SVG glyphs and adds element-colored sign glyphs
function _buildBadgeHtml(label) {
  if (!label) return '';
  var result = '';
  var chars = Array.from(label);
  var i = 0;
  while (i < chars.length) {
    var ch = chars[i];
    if (SYMBOL_TO_GLYPH[ch]) {
      var glyphName = SYMBOL_TO_GLYPH[ch];
      if (PLANET_SYMBOLS.has(ch)) {
        result += '<span class="gi gi-pl"><svg><use href="#gl-' + glyphName + '"/></svg></span>';
      } else if (SIGN_SYMBOLS.has(ch)) {
        var el = SIGN_ELEMENT[glyphName] || '';
        result += '<span class="gi gi-' + el + '"><svg><use href="#gl-' + glyphName + '"/></svg></span>';
      }
      i++;
    } else if (ch === '℞') {
      result += ' ℞';
      i++;
    } else if (ch === '☌' || ch === '△' || ch === '□' || ch === '☍' || ch === '⚹') {
      result += ' ' + _esc(ch) + ' ';
      i++;
    } else {
      // Regular character — collect a run of plain text
      var run = '';
      while (i < chars.length && !SYMBOL_TO_GLYPH[chars[i]] && chars[i] !== '℞' && chars[i] !== '☌' && chars[i] !== '△' && chars[i] !== '□' && chars[i] !== '☍' && chars[i] !== '⚹') {
        run += chars[i];
        i++;
      }
      result += _esc(run);
    }
  }
  return result;
}

function _canAccess(user, key) {
  if (user.account_type === 'premium') return true;
  if (user.account_type === 'invited' && user.natal_chart_unlocked) return true;
  if (key === 'overview' || key === 'mission') return true;
  if (user.free_section_pick === key) return true;
  return false;
}

function _esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
function _stripPrefix(title) {
  var idx = (title || '').indexOf(': ');
  return idx !== -1 ? title.slice(idx + 2) : (title || '');
}

function _planetGlyph(name) {
  if (!name) return '';
  // Resolve Georgian names to English keys, handle 'north node' → 'node'
  var key = (PLANET_KA_REV[name] || name).toLowerCase().replace('north node','node').replace('south node','node');
  var id = 'gl-' + key;
  return '<span class="gi gi-pl"><svg><use href="#' + id + '"/></svg></span>';
}

function _signGlyph(signName, element) {
  // Map common sign names to glyph IDs
  const map = {
    aries: 'gl-aries', taurus: 'gl-taurus', gemini: 'gl-gemini',
    cancer: 'gl-cancer', leo: 'gl-leo', virgo: 'gl-virgo',
    libra: 'gl-libra', scorpio: 'gl-scorpio', sagittarius: 'gl-sagittarius',
    capricorn: 'gl-capricorn', aquarius: 'gl-aquarius', pisces: 'gl-pisces'
  };
  const lower = signName.toLowerCase();
  // Try exact match, then partial match
  let id = map[lower];
  if (!id) {
    for (const [k, v] of Object.entries(map)) {
      if (lower.includes(k) || k.includes(lower)) { id = v; break; }
    }
  }
  if (!id) return '';
  const elLow = (element || '').toLowerCase();
  return '<span class="gi gi-' + elLow + '"><svg><use href="#' + id + '"/></svg></span>';
}

function _buildPlanetRow(row) {
  const planet = row.planet || row.name || '';
  // Resolve to English key for glyph lookup + data attribute
  const planetKey = (PLANET_KA_REV[planet] || planet).toLowerCase();
  const planetKa = _tr(PLANET_KA, planet);
  const signKa = _tr(SIGN_KA, row.sign);
  const retro = row.retrograde ? ' class="retro"' : '';
  const retroBadge = row.retrograde ? ' &#8478;' : '';
  const elLower = (row.element || '').toLowerCase();
  const elClass = ELEMENT_LABEL_CLASS[elLower] || '';
  const elLabel = { fire: 'ცეცხლი', earth: 'მიწა', air: 'ჰაერი', water: 'წყალი' };
  const elKa = _hydrateLang === 'ka' ? (elLabel[elLower] || row.element) : row.element;
  return '<tr>' +
    '<td class="pl-btn" data-pl="' + planetKey + '">' +
      _planetGlyph(planet) + ' ' + _esc(planetKa) + '</td>' +
    '<td>' + _esc(signKa) + ' ' + _signGlyph(row.sign, row.element) + '</td>' +
    '<td' + retro + '>' + _esc(row.degree) + retroBadge + '</td>' +
    '<td>' + _esc(row.house) + '</td>' +
    '<td><span class="et ' + elClass + '">' + _esc(elKa) + '</span></td>' +
    '</tr>';
}

function _buildAspect(asp) {
  if (!asp || typeof asp !== 'object') return '';
  const typeLabel = {
    conjunction: 'კონიუნქცია', trine: 'ტრინი', square: 'კვადრატი',
    opposition: 'ოპოზიცია', sextile: 'სექსტილი'
  };
  const aspectSymbols = {
    conjunction: '☌', trine: '△', square: '□', opposition: '☍', sextile: '⚹'
  };
  var aspectType = asp.aspectType || asp.aspect || asp.type || '';
  var symbol = asp.aspectSymbol || aspectSymbols[aspectType] || '';
  var p1Name = asp.planet1 || asp.planet_1 || asp.body1 || '';
  var p2Name = asp.planet2 || asp.planet_2 || asp.body2 || '';
  var p1 = _tr(PLANET_KA, p1Name);
  var p2 = _tr(PLANET_KA, p2Name);
  var orbStr = asp.orb != null ? ' (' + asp.orb + '°)' : '';
  var desc = asp.description ? ' — ' + _esc(asp.description) : orbStr;
  var typeLbl = _hydrateLang === 'ka' ? (typeLabel[aspectType] || aspectType) : aspectType;
  return '<div class="al">' +
    '<span class="asy">' + _esc(symbol) + '</span>' +
    _planetGlyph(p1Name) + ' ' + _esc(p1) + ' ' +
    _esc(symbol) + ' ' +
    _planetGlyph(p2Name) + ' ' + _esc(p2) +
    desc +
    '<span class="alb">' + _esc(typeLbl) + '</span>' +
    '</div>';
}

function _buildCard(card) {
  const elClass = card.accentElement ? ELEMENT_CLASS[(card.accentElement || '').toLowerCase()] || '' : '';
  var hasCrossRefs = card.crossReferences && card.crossReferences.length;
  var crossRefPopup = hasCrossRefs ? card.crossReferences.map(function(r){return _renderRichTextNoTip(r);}).join(' · ') : '';
  let html = '<div class="c ' + elClass + '">';
  html += '<div class="b' + (hasCrossRefs ? ' has-popup' : '') + '">' + _buildBadgeHtml(card.label) + (hasCrossRefs ? '<span class="label-popup">' + crossRefPopup + '</span>' : '') + '</div>';
  html += '<h3>' + _esc(card.title) + '</h3>';
  if (card.body && card.body.length) {
    card.body.forEach(function(p) { html += '<p>' + _renderRichText(p) + '</p>'; });
  }
  if (card.expandedContent && card.expandedContent.length) {
    html += '<button class="tb2" onclick="toggleExp(this)">' + (_hydrateLang === 'ka' ? 'დეტალური ანალიზი ↓' : 'Detailed Analysis ↓') + '</button>';
    html += '<div class="ce">';
    card.expandedContent.forEach(function(p) { html += '<p>' + _renderRichText(p) + '</p>'; });
    html += '</div>';
  }
  if (card.hint) {
    html += '<div class="h"><div class="ht"><svg><use href="#gl-sparkle"/></svg> ' + _esc(card.hint.title) + '</div>';
    html += '<p>' + _renderRichText(card.hint.content) + '</p>';
    if (card.hint.bullets && card.hint.bullets.length) {
      html += '<ul>';
      card.hint.bullets.forEach(function(b) { html += '<li>' + _renderRichText(b) + '</li>'; });
      html += '</ul>';
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function _buildLockWrap(sectionKey, section, iconId) {
  const cards = section.coreCards || section.cards || [];
  const firstCard = cards[0];
  let html = '<div class="lock-wrap locked" id="lock-s' + (SECTION_KEYS.indexOf(sectionKey) + 1) + '">';
  html += '<div class="sh"><div class="section-icon"><svg style="color:var(--gold)"><use href="#' + iconId + '"/></svg></div>';
  html += '<h2>' + _esc(_stripPrefix(section.sectionTitle)) + '</h2>';
  html += '<div class="st">' + _esc(section.sectionTagline || '') + '</div></div>';
  html += '<div class="lock-preview">';
  if (firstCard) {
    html += '<div class="b">' + _buildBadgeHtml(firstCard.label) + '</div>';
    html += '<h3>' + _esc(firstCard.title) + '</h3>';
    if (firstCard.hint) {
      html += '<div class="lock-hint">✦ ' + _esc(firstCard.hint.content.slice(0, 120)) + '</div>';
    }
  }
  html += '<div class="blur-lines">';
  [100, 93, 97, 86, 91].forEach(function(w) {
    html += '<div class="blur-line" style="width:' + w + '%"></div>';
  });
  html += '</div>';
  html += '<button class="unlock-cta" onclick="showUpgrade()"><span>✦</span> სრული წაკითხვის განბლოკვა</button>';
  html += '</div></div>';
  return html;
}

function _buildCardsGrid(cards) {
  if (!cards || !cards.length) return '';
  var html = '';
  // First card renders full-width (standalone), then remaining cards pair into g2 grids.
  // This matches the prototype pattern: lead card → paired detail cards → optional trailing card.
  html += _buildCard(cards[0]);
  for (var i = 1; i < cards.length; i += 2) {
    if (i + 1 < cards.length) {
      html += '<div class="g2">';
      html += _buildCard(cards[i]);
      html += _buildCard(cards[i + 1]);
      html += '</div>';
    } else {
      // Odd trailing card — render standalone
      html += _buildCard(cards[i]);
    }
  }
  return html;
}

function _buildSectionContent(sectionKey, section) {
  const idx = SECTION_KEYS.indexOf(sectionKey) + 1;
  const iconId = SECTION_ICONS_MAP[sectionKey] || 'gl-sparkle';
  let html = '<section id="s' + idx + '">';
  html += '<div class="sh"><div class="section-icon"><svg style="color:var(--gold)"><use href="#' + iconId + '"/></svg></div>';
  html += '<h2>' + _esc(_stripPrefix(section.sectionTitle)) + '</h2>';
  html += '<div class="st">' + _esc(section.sectionTagline || '') + '</div></div>';

  if (sectionKey === 'overview') {
    // Planet table
    if (section.planetTable && section.planetTable.length) {
      var thLabels = _hydrateLang === 'ka'
        ? ['პლანეტა','ნიშანი','გრადუსი','სახლი','სტიქია']
        : ['Planet','Sign','Degree','House','Element'];
      html += '<div class="c"><table class="pt"><thead><tr>';
      thLabels.forEach(function(th) { html += '<th>' + th + '</th>'; });
      html += '</tr></thead><tbody>';
      section.planetTable.forEach(function(row) { html += _buildPlanetRow(row); });
      html += '</tbody></table>';
      // Points row (ASC, MC, North Node, Lilith)
      if (section.points && typeof section.points === 'object') {
        var pts = section.points;
        html += '<div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:4px">';
        if (pts.ascendant) html += '<span class="pb2">ASC ' + _signGlyph(pts.ascendant.sign) + ' ' + _esc(pts.ascendant.degree) + '</span>';
        if (pts.midheaven) html += '<span class="pb2">MC ' + _signGlyph(pts.midheaven.sign) + ' ' + _esc(pts.midheaven.degree) + '</span>';
        if (pts.northNode) html += '<span class="pb2">' + _planetGlyph('node') + ' ' + _signGlyph(pts.northNode.sign) + ' ' + _esc(pts.northNode.degree) + '</span>';
        if (pts.lilith) html += '<span class="pb2">' + _planetGlyph('lilith') + ' ' + _signGlyph(pts.lilith.sign) + ' ' + _esc(pts.lilith.degree) + '</span>';
        html += '</div>';
      }
      html += '</div>';
    }
    // Aspects
    if (section.aspects && section.aspects.length) {
      html += '<div class="c"><div class="b">' + (_hydrateLang === 'ka' ? 'მთავარი ასპექტები' : 'Major Aspects') + '</div>';
      html += '<h3>' + (_hydrateLang === 'ka' ? 'პლანეტარული საუბრები' : 'Planetary Conversations') + '</h3>';
      section.aspects.forEach(function(asp) { html += _buildAspect(asp); });
      var interps = section.aspects.filter(function(a) { return a.interpretation; });
      if (interps.length) {
        html += '<button class="tb2" onclick="toggleExp(this)">' + (_hydrateLang === 'ka' ? 'ასპექტების ინტერპრეტაცია ↓' : 'Aspect Interpretations ↓') + '</button>';
        html += '<div class="ce">';
        interps.forEach(function(a) {
          html += '<p><strong>' + _esc(_tr(PLANET_KA, a.planet1)) + ' ' + _esc(a.aspectSymbol || '') + ' ' + _esc(_tr(PLANET_KA, a.planet2)) + ':</strong> ' + _esc(a.interpretation) + '</p>';
        });
        html += '</div>';
      }
      html += '</div>';
    }
    // Core cards in 2-column grid
    var cards = section.coreCards || section.cards || [];
    html += _buildCardsGrid(cards);
  } else {
    // Content sections (2-8) in 2-column grid
    var sCards = section.cards || [];
    html += _buildCardsGrid(sCards);
  }

  // Pull quote
  if (section.pullQuote) {
    html += '<div class="pq"><p>' + _renderRichText(section.pullQuote) + '</p></div>';
  }

  html += '</section>';
  return html;
}

function hydrateReading(reading, user) {
  if (!reading || !user) return;
  _currentUser = user; // store for lang switch re-hydration
  _hydrateLang = (reading.meta && reading.meta.language) || 'ka';
  console.log('[HYDRATE] Starting reading hydration', { user: user.full_name, lang: _hydrateLang });

  // 1. Sidebar user info
  var nameEl = document.querySelector('.sb-name');
  if (nameEl) nameEl.textContent = user.full_name || user.email || '';
  var emailEl = document.querySelector('.sb-email');
  if (emailEl) emailEl.textContent = user.email || '';
  var avatarEl = document.querySelector('.sb-avatar');
  if (avatarEl) avatarEl.textContent = (user.full_name || user.email || '?')[0].toUpperCase();
  var pnEl = document.querySelector('.pn');
  if (pnEl) pnEl.textContent = (user.full_name || user.email || '').split(' ')[0];
  var paEl = document.querySelector('.pa');
  if (paEl) paEl.textContent = (user.full_name || user.email || '?')[0].toUpperCase();

  // 2. Set tier
  var tierMap = { free: 'free', premium: 'premium', invited: 'invited' };
  var mappedTier = tierMap[user.account_type] || 'free';
  if (user.natal_chart_unlocked && user.account_type === 'invited') mappedTier = 'invited-plus';
  setTier(mappedTier, null);

  // 3. Hero chips
  var heroChips = document.querySelector('.hero-chips');
  if (heroChips && reading.meta) {
    var meta = reading.meta;
    var pName = function(r) { return (r.planet || r.name || '').toLowerCase(); };
    var sun = reading.overview?.planetTable?.find(function(r) { return pName(r) === 'sun'; });
    var moon = reading.overview?.planetTable?.find(function(r) { return pName(r) === 'moon'; });
    var asc = reading.overview?.planetTable?.find(function(r) { return pName(r) === 'asc' || pName(r) === 'ascendant'; });
    var mc = reading.overview?.planetTable?.find(function(r) { return pName(r) === 'mc' || pName(r) === 'midheaven'; });

    var chips = '';
    chips += '<span><span class="chip-label"><svg style="color:var(--gd)"><use href="#gl-sun"/></svg></span> ' + _esc(meta.sunSign || (sun ? sun.sign + ' ' + sun.degree : '')) + '</span>';
    chips += '<span><span class="chip-label"><svg style="color:var(--gd)"><use href="#gl-moon"/></svg></span> ' + _esc(meta.moonSign || (moon ? moon.sign + ' ' + moon.degree : '')) + '</span>';
    chips += '<span><span class="chip-label">ASC</span> ' + _esc(meta.risingSign || (asc ? asc.sign + ' ' + asc.degree : '')) + '</span>';
    if (mc) {
      chips += '<span><span class="chip-label">MC</span> ' + _esc(mc.sign + ' ' + mc.degree) + '</span>';
    }
    heroChips.innerHTML = chips;
  }

  // 4. Update mini-chart with real planet positions
  if (reading.overview && reading.overview.planetTable) {
    var _pt = reading.overview.planetTable;
    var _chartPs = _readingToChartPlanets(_pt);
    var _ascRow = _pt.find(function(r) { var n = (r.planet || r.name || '').toLowerCase(); return n === 'asc' || n === 'ascendant'; });
    var _mcRow  = _pt.find(function(r) { var n = (r.planet || r.name || '').toLowerCase(); return n === 'mc' || n === 'midheaven'; });
    var _ascEcl = _ascRow ? _signDegToEcl(_ascRow.sign, _ascRow.degree) : null;
    var _mcEcl  = _mcRow  ? _signDegToEcl(_mcRow.sign,  _mcRow.degree)  : null;
    if (_chartPs.length > 0) renderMiniChart(_chartPs, _ascEcl, _mcEcl);
  }

  // 5. Build all sections + lock wraps
  // Find the content container inside #view-natal (after the hero and nav bar)
  var viewNatal = document.getElementById('view-natal');
  if (!viewNatal) { console.error('[HYDRATE] #view-natal not found'); return; }

  // Keep the hero and nav bar, replace everything after
  var hero = viewNatal.querySelector('.hero');
  var nb = viewNatal.querySelector('.nb');

  // Build nav buttons
  if (nb) {
    var nbCt = nb.querySelector('.ct');
    if (nbCt) {
      var nbHtml = '';
      SECTION_KEYS.forEach(function(key, i) {
        var sec = reading[key];
        var accessible = _canAccess(user, key);
        var lang = (reading.meta && reading.meta.language) || 'ka';
        var navLabels = SECTION_NAV_LABELS[lang] || SECTION_NAV_LABELS.ka;
        var label = navLabels[key] || key;
        nbHtml += '<button class="nbtn' + (i === 0 ? ' active' : '') + (!accessible ? ' locked' : '') + '" onclick="go(\'s' + (i + 1) + '\')">';
        nbHtml += _esc(label);
        if (!accessible) nbHtml += '<span class="lock-dot"></span>';
        nbHtml += '</button>';
      });
      nbCt.innerHTML = nbHtml;
    }
  }

  // Build section content area
  var contentHtml = '<div class="ct">';
  SECTION_KEYS.forEach(function(key, i) {
    var section = reading[key];
    if (!section) return;
    var accessible = _canAccess(user, key);

    // Lock wrap for inaccessible sections (skip overview and mission which are always visible)
    if (!accessible) {
      contentHtml += _buildLockWrap(key, section, SECTION_ICONS_MAP[key] || 'gl-sparkle');
    }
    contentHtml += _buildSectionContent(key, section);

    // Section divider (except after last)
    if (i < SECTION_KEYS.length - 1) {
      contentHtml += '<div class="sec-div"><div class="sec-div-line"></div></div>';
    }
  });
  contentHtml += '</div>';

  // Remove everything after nb, then insert new content
  var children = Array.from(viewNatal.children);
  var pastNb = false;
  children.forEach(function(child) {
    if (child === hero || child === nb) { pastNb = (child === nb); return; }
    if (pastNb || (!hero && !nb)) {
      // Remove old content (sections, dividers, etc.)
      if (child.classList && (child.classList.contains('ct') || child.tagName === 'SECTION' || child.classList.contains('sec-div') || child.classList.contains('lock-wrap'))) {
        child.remove();
      } else if (child !== hero && child !== nb) {
        child.remove();
      }
    }
  });
  // Remove any remaining .ct from view-natal that's not the nb's .ct
  viewNatal.querySelectorAll(':scope > .ct').forEach(function(el) { el.remove(); });
  viewNatal.querySelectorAll(':scope > section').forEach(function(el) { el.remove(); });
  viewNatal.querySelectorAll(':scope > .sec-div').forEach(function(el) { el.remove(); });
  viewNatal.querySelectorAll(':scope > .lock-wrap').forEach(function(el) { el.remove(); });

  // Insert after nb (or at end if no nb)
  var insertAfter = nb || hero || null;
  if (insertAfter && insertAfter.nextSibling) {
    var temp = document.createElement('div');
    temp.innerHTML = contentHtml;
    while (temp.firstChild) {
      viewNatal.insertBefore(temp.firstChild, insertAfter.nextSibling);
      insertAfter = insertAfter.nextSibling;
    }
  } else {
    viewNatal.insertAdjacentHTML('beforeend', contentHtml);
  }

  // 5. Switch to natal view if not already there
  if (document.body.getAttribute('data-view') !== 'natal') {
    switchView('natal', document.getElementById('devNatal'));
  }

  // 6. Make natal view visible (in case it was hidden to prevent flash)
  viewNatal.style.visibility = 'visible';

  // 7. Re-init observers for scroll animations + nav sync
  setTimeout(initObservers, 100);

  console.log('[HYDRATE] Reading hydration complete');
}

window.hydrateReading = hydrateReading;

// ═══ INIT ═══
initObservers();
