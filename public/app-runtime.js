// ═══════════════════════════════════════════════════════════
// UNIFIED JAVASCRIPT — ASTROLO.GE
// ═══════════════════════════════════════════════════════════

let currentAccountType = 'premium';
// Paid extra-slot count from users.invite_slots_purchased. Slot 2+ unlock
// follows this number — tier alone isn't enough, since invited+ users may
// have reached that tier via natal_unlock without buying any extra slots.
let currentInviteSlotsPurchased = 0;
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

  // Partner name is data-driven (set by real synastry connections, not by mode).
  // setMode only flips the mode badge + hero copy; it must NOT clobber the
  // partner name with a hardcoded placeholder.
  var realPartner = _synastryPartnerName ? '(' + _synastryPartnerName + ')' : '';
  if (mode === 'couple') {
    modeBadge.className = 'mode-badge couple';
    modeBadge.textContent = 'მეწყვილე';
    if (partnerName) partnerName.textContent = realPartner;
    if (heroTitle) heroTitle.textContent = 'ვარსკვლავები ორისთვის';
    if (heroSub) heroSub.textContent = 'სინასტრიის სიღრმისეული ანალიზი';
    if (breadcrumbLabel) breadcrumbLabel.textContent = 'სინასტრია';
  } else {
    modeBadge.className = 'mode-badge friend';
    modeBadge.textContent = 'მეგობარი';
    if (partnerName) partnerName.textContent = realPartner;
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

  // Sync tier to DB (fire-and-forget) — only when triggered by dev button click
  if (btn) {
    fetch('/api/dev/set-tier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dev-password': 'astrolo' },
      credentials: 'include',
      body: JSON.stringify({ tier: tier }),
    }).then(function() {
      window.dispatchEvent(new CustomEvent('profile-changed'));
      // Premium upgrade: redirect to loading if no full reading exists yet.
      // Runs unconditionally (doesn't require _currentUser to be set).
      if (tier === 'premium' || tier === 'premium-plus') {
        return fetch('/api/onboarding/status', { credentials: 'include' })
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(status) {
            if (status && !(status.status === 'complete' && status.shareSlug)) {
              window.location.href = '/loading?mode=generate-full';
            }
          });
      }
    }).catch(function() {});
  }

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

  // Dev mode: persist tier change to the database, then re-hydrate from DB state
  if (btn && _currentUser && _currentUser.id) {
    var dbType = tier === 'premium-plus' ? 'premium'
               : tier === 'invited-plus' ? 'invited'
               : tier;
    fetch('/api/dev/test-user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-dev-password': 'astrolo' },
      body: JSON.stringify({ userId: _currentUser.id, accountType: dbType })
    }).then(function(r) {
      if (!r.ok) return r.json().then(function(d) { console.warn('[DEV] Tier update failed:', d.error); });
      console.log('[DEV] Tier updated in DB:', dbType);
      // Re-fetch session to get real DB user state
      return fetch('/api/auth/session', { credentials: 'include' });
    }).then(function(r) {
      if (!r || !r.ok) return;
      return r.json();
    }).then(function(session) {
      if (!session || !session.profile) return;
      _currentUser = session.profile;
      console.log('[DEV] Re-hydrated with DB state:', _currentUser.account_type);

      // Premium upgrade: check if full reading exists; if not, trigger generate-full
      if (dbType === 'premium') {
        return fetch('/api/onboarding/status', { credentials: 'include' })
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(status) {
            if (!status) return;
            if (status.status === 'complete' && status.shareSlug) {
              // Already has a full reading — just re-hydrate display
              if (_currentReading) hydrateReading(_currentReading, _currentUser);
            } else {
              // No full reading yet — launch generate-full loading
              window.location.href = '/loading?mode=generate-full';
            }
          });
      }

      // Non-premium tiers: re-hydrate display only
      if (_currentReading) {
        hydrateReading(_currentReading, _currentUser);
      }
    }).catch(function(e) { console.warn('[DEV] Tier update error:', e); });
  }
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

// Track real synastry state from generation
var _synastryGenerated = false;
var _synastryPartnerName = null;
var _synastryConnectionId = null;
var _synastryRelType = null;
var _synastryGenerating = false;
// Latch: set when a synastry generation STARTS in this session, so the matching
// `synastry-ready` knows the user actually waited for it and can escalate the
// sidebar item to its ready highlight. Guards against highlighting on plain page
// loads where the reading already existed (that path fires `synastry-ready`
// without a preceding start).
// It deliberately does NOT auto-switch the view: the user is reading their own
// natal chart, and yanking the page out from under them mid-sentence is worse
// than letting the pulsing sidebar item invite the click.
var _synGenRedirectPending = false;
// Set when a synastry finished generating in this session and the user hasn't
// opened it yet — drives .syn-ready-pulse. Read by rebuildSidebar so the
// highlight survives the rebuilds that follow (rebuild resets all nav classes).
var _synReadyHighlight = false;

function occupySlot(slotNum, btn) {
  // Get effective unlock state
  var unlocked = slotNum === 1 ? getSlot1Unlocked() : getSlot2Unlocked();
  if (!unlocked) return;

  // DEV-PANEL ONLY: Slot 1 "occupy" on dev/preview hosts triggers a real
  // synastry-view test by calling /api/dev/test-synastry. This is the dev
  // tool for previewing the synastry reading UI — it is NOT reachable from
  // the production sidebar (the synastry nav item always routes empty
  // slots to the invite modal).
  var host = window.location.hostname;
  var isDevTriggerHost =
    host === 'localhost' ||
    host.includes('vercel.app') ||
    host === 'astrolo.ge' ||
    host === 'www.astrolo.ge';
  if (slotNum === 1 && isDevTriggerHost) {
    // If already generated, don't re-trigger — just toggle view
    if (_synastryGenerated) {
      closeSidebar();
      switchView('synastry');
      return;
    }
    // If already generating, ignore
    if (btn.classList.contains('generating')) return;

    // Start generation
    btn.classList.add('active', 'generating');
    btn.textContent = '✓ generating...';
    slot1OccupiedOverride = true;

    // Update sidebar to show generating state
    var synItem = document.getElementById('synNavItem');
    if (synItem) {
      synItem.classList.remove('syn-cta-pulsate');
      synItem.classList.add('has-partner');
      var pn = document.getElementById('synPartnerName');
      if (pn) pn.textContent = '⟳ იტვირთება...';
      var mb = document.getElementById('modeBadge');
      if (mb) { mb.className = 'mode-badge'; mb.textContent = ''; }
    }

    // Trigger React wrapper
    window.dispatchEvent(new CustomEvent('dev-trigger-synastry'));
    return;
  }

  // Slot 2 (or non-dev hosts): plain toggle of the dev override.
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
  // Slot 2+ unlock follows the paid count, not the tier string. An invited+
  // user who reached the tier via natal_unlock alone (no extra slot paid)
  // would otherwise incorrectly see slot 2 unlocked.
  return currentInviteSlotsPurchased >= 1;
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
// The "still being written" placeholder on #synPartnerName. Shared by
// rebuildSidebar and applyTranslations — the invitee now waits on this label for
// the whole generation, so both paths must agree on it.
function _synGeneratingLabel(isEn) {
  return isEn ? '(Generating…)' : '(იქმნება…)';
}

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
  synItem.classList.remove('has-partner', 'syn-cta-pulsate', 'locked-syn', 'syn-generating', 'syn-ready-pulse');

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

  // ─── SLOT 1: in-flight AI generation (invitee /loading or inviter poll) ───
  if (_synastryGenerating && s1Unlocked) {
    synItem.classList.add('has-partner', 'syn-generating');
    if (partnerName) {
      partnerName.textContent = _synGeneratingLabel(document.body.classList.contains('lang-en'));
    }
    if (modeBadge) { modeBadge.className = 'mode-badge'; modeBadge.textContent = ''; }
    buildSlot2NavItem(synItem, s2Unlocked, s2Occupied);
    return;
  }

  // ─── SLOT 1 ───
  // If synastry was generated in this session, keep it permanently occupied
  if (_synastryGenerated && s1Unlocked) {
    synItem.classList.add('has-partner');
    // Finished while the user was on their natal reading and still unopened →
    // keep it pulsing through rebuilds until they click it.
    if (_synReadyHighlight) synItem.classList.add('syn-ready-pulse');
    if (partnerName) partnerName.textContent = '(' + (_synastryPartnerName || 'Partner') + ')';
    var relType = _synastryRelType || 'couple';
    if (modeBadge) {
      modeBadge.className = 'mode-badge ' + relType;
      modeBadge.textContent = relType === 'couple' ? 'მეწყვილე' : 'მეგობარი';
    }
    // Remove any leftover tick badge
    var existingBadge = synItem.querySelector('.syn-badge');
    if (existingBadge) existingBadge.remove();
    // Keep dev button in occupied state
    var occBtn = document.getElementById('devSlot1Occupy');
    if (occBtn) {
      occBtn.classList.add('active');
      occBtn.classList.remove('generating');
      occBtn.textContent = '👤 occupied';
      occBtn.disabled = true;
      occBtn.style.opacity = '0.6';
      occBtn.style.cursor = 'default';
    }
  } else if (s1Unlocked && s1Occupied) {
    // Partner connected → show partner name & mode badge.
    // Use real partner data when available; otherwise leave name empty
    // (dev override of "occupied" without a real connection is just a UI
    // state — don't fabricate a name).
    synItem.classList.add('has-partner');
    if (partnerName) partnerName.textContent = _synastryPartnerName ? '(' + _synastryPartnerName + ')' : '';
    var relType = _synastryRelType || 'couple';
    if (modeBadge) {
      modeBadge.className = 'mode-badge ' + relType;
      modeBadge.textContent = relType === 'couple' ? 'მეწყვილე' : 'მეგობარი';
    }
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
    // Paid but no partner → pulsating 2nd synastry CTA. Slot already paid,
    // so the modal must NOT show the ₾5 price tag — pass prepaid=true.
    const el = document.createElement('div');
    el.className = 'sb-nav-item syn-cta-pulsate syn-extra';
    el.onclick = function() { openInviteModal(true); };
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

// ═══ LAZY CHUNK LOADER ═══
// Injects a secondary classic script exactly once; on failure the promise
// resets so the next call retries (e.g. the connection came back).
var _chunkPromises = {};
function _loadChunk(name) {
  if (!_chunkPromises[name]) {
    _chunkPromises[name] = new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = _lazyAssetSrc(name, 'js');
      s.onload = function() { resolve(); };
      s.onerror = function() {
        _chunkPromises[name] = null;
        s.remove();
        reject(new Error('[runtime] ' + name + ' failed to load'));
      };
      document.head.appendChild(s);
    });
  }
  return _chunkPromises[name];
}

// ═══ PAYMENT / INVITE / SHARE (lazy: runtime-extras.js) ═══
// The cluster lives in /runtime-extras.js, warmed at idle below. These are
// self-replacing stubs: the chunk's top-level `function foo(){}` declarations
// overwrite these window properties when it evaluates, and the stub forwards
// the original call. Callers pass only strings/DOM elements (never Event
// objects), so replaying the arguments after an async load is safe.
// generateInviteLink is NOT stubbed — see its definition below (AuthBridge
// overrides it on window, and the chunk must never clobber that).
(function() {
  ['toggleDiscount', 'showPaymentPage', 'selectPayMethod',
   'openInviteModal', 'closeInviteModal', 'selectInviteType', 'copyInviteLink',
   'showUpgrade', 'unlockFullReading', 'shareReading', 'shareToSocial'
  ].forEach(function(name) {
    function stub() {
      var self = this, args = arguments;
      _loadChunk('runtime-extras').then(function() {
        if (window[name] !== stub) window[name].apply(self, args);
        else console.error('[runtime] extras loaded but did not define ' + name);
      }).catch(function(e) { console.error(e); });
    }
    window[name] = stub;
  });
})();
// Warm the chunk at idle so the first CTA tap is usually synchronous.
(window.requestIdleCallback || function(f) { setTimeout(f, 2500); })(function() { _loadChunk('runtime-extras').catch(function() {}); });

// ═══ SIDEBAR ═══
let ddOpen = false;
// No arg = toggle (the header button). `true` = open regardless of current
// state — used by callers that must guarantee it's open (the ?invited=1 landing
// and the synastry-ready highlight), where a toggle would close it instead.
function openSidebar(forceOpen) {
  // If public view (not logged in), redirect to auth — but only for the
  // user-initiated toggle. A forced open is programmatic (the ?invited=1
  // landing, the synastry-ready highlight) and must never navigate the page.
  if (window.__ASTROLO_PUBLIC_VIEW) {
    if (forceOpen !== true) window.location.href = '/auth';
    return;
  }
  ddOpen = forceOpen === true ? true : !ddOpen;
  document.getElementById('accountDD').classList.toggle('open', ddOpen);
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
  // Opening it is the acknowledgement the ready-pulse was asking for.
  _synReadyHighlight = false;
  this.classList.remove('syn-ready-pulse');
  if (_synastryGenerating) { closeSidebar(); switchView('synastry'); return; }
  // If synastry already generated, just show it
  if (_synastryGenerated) { closeSidebar(); switchView('synastry'); return; }
  // FREE (or no unlocked slot): locked → premium payment page
  if (currentAccountType === 'free' || this.classList.contains('locked-syn')) { closeSidebar(); showPaymentPage('premium'); return; }
  // Pulsating CTA → premium with an unlocked-but-empty slot → invite-link
  // generation flow. No dev/fake-synastry shortcut: the only way to fill a
  // slot is for a real partner to accept the invite.
  if (this.classList.contains('syn-cta-pulsate')) {
    openInviteModal();
    return;
  }
  // Partner connected → view synastry reading
  closeSidebar();
  switchView('synastry');
};

window.addEventListener('synastry-generation-started', function() {
  _synastryGenerating = true;
  // Arm the auto-redirect: the reading is being generated now, so when it's
  // ready we take the user straight to it.
  _synGenRedirectPending = true;
  rebuildSidebar();
});
window.addEventListener('synastry-generation-ended', function() {
  _synastryGenerating = false;
  rebuildSidebar();
});

// Listen for synastry ready event from React wrapper
window.addEventListener('synastry-ready', function(e) {
  var detail = e.detail || {};
  var name = (detail.user2 && detail.user2.name) ? detail.user2.name : 'Partner';

  _synastryGenerating = false;
  // Permanently mark synastry as generated
  _synastryGenerated = true;
  _synastryPartnerName = name;
  _synastryConnectionId = detail.connectionId || null;
  _synastryRelType = detail.relationshipType || 'couple';
  slot1OccupiedOverride = true;

  // Update sidebar nav
  var synItem = document.getElementById('synNavItem');
  if (synItem) {
    synItem.classList.remove('syn-cta-pulsate', 'syn-generating');
    synItem.classList.add('has-partner');
    var label = synItem.querySelector('.sb-nav-label');
    if (label) label.textContent = 'სინასტრია';
    var pn = document.getElementById('synPartnerName');
    if (pn) pn.textContent = '(' + name + ')';
    var mb = document.getElementById('modeBadge');
    if (mb) {
      mb.className = 'mode-badge ' + _synastryRelType;
      mb.textContent = _synastryRelType === 'couple' ? 'მეწყვილე' : 'მეგობარი';
    }
    // Remove any leftover tick badge
    var badge = synItem.querySelector('.syn-badge');
    if (badge) badge.remove();
  }

  // Update dev occupy button to permanent state
  var occBtn = document.getElementById('devSlot1Occupy');
  if (occBtn) {
    occBtn.classList.remove('generating');
    occBtn.classList.add('active');
    occBtn.textContent = '👤 occupied';
    occBtn.disabled = true;
    occBtn.style.opacity = '0.6';
    occBtn.style.cursor = 'default';
  }

  console.log('[DEV] Synastry ready:', name, _synastryRelType, _synastryConnectionId);

  // Generation just finished in this session → advertise it, don't jump to it.
  // Only when armed by a preceding `synastry-generation-started`, so a plain
  // reload of an already-generated synastry stays quiet.
  if (_synGenRedirectPending) {
    _synGenRedirectPending = false;
    // If they're already watching the synastry view, its own cosmic loader
    // resolves straight into the reading — a sidebar nudge would just be noise
    // on top of the thing it's pointing at.
    if (document.body.getAttribute('data-view') !== 'synastry') {
      _synReadyHighlight = true;
      if (synItem) synItem.classList.add('syn-ready-pulse');
      // Reopen the sidebar if the user closed it while they were reading — the
      // pulse is only an invitation if it's on screen to be seen.
      openSidebar(true);
    }
  }
});

// ═══ INVITE MODAL (lazy: runtime-extras.js) ═══
// openInviteModal / closeInviteModal / selectInviteType / copyInviteLink live
// in the extras chunk (stubs above). Two things stay here on purpose:
//  * selectedInviteType — the chunk assigns this via the shared global
//    lexical binding, and generateInviteLink below reads it. Moving the
//    declaration would silently split them into two different variables.
//  * generateInviteLink — AuthBridge.tsx replaces it on window with the real
//    backend implementation, and its re-wire polling stops ~8 s after mount.
//    If the extras chunk carried a copy, a lazy load after that window would
//    permanently clobber the override with this demo stub.
let selectedInviteType = null;
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
// copyInviteLink / showUpgrade / unlockFullReading → runtime-extras.js (stubs above).

// ═══ LANGUAGE ═══
var _currentUser = null; // stored by hydrateReading, used for lang switch re-hydration
var _currentReading = null; // stored by hydrateReading, used for tier switch re-hydration

function setLang(l, b) {
  document.querySelectorAll('.lo').forEach(x => x.classList.remove('active'));
  if (b) b.classList.add('active');
  document.body.classList.toggle('lang-en', l === 'en');
  applyTranslations(l);
  // Persist the choice so full-page auth-step transitions (e.g. signup →
  // /auth?step=birth) and plain reloads keep the same language instead of
  // snapping back to the KA default. AuthPageClient restores this on load.
  try { localStorage.setItem('astrolo:lang', l); } catch (e) { /* private mode / quota */ }
  if (l === 'ka' || l === 'en') {
    // Let HydrationBridge handle it on authenticated pages (it sets this flag)
    if (window.__hydrationBridgeActive) {
      window.dispatchEvent(new CustomEvent('astrolo:lang-change', { detail: { lang: l } }));
    } else if (_currentUser) {
      // Fallback for public pages — fetch directly using _currentUser
      fetch('/api/reading/natal?lang=' + l, { credentials: 'include' })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
          if (data && data.reading) hydrateReading(data.reading, _currentUser);
        })
        .catch(function() {});
    }
  }
}
window.setLang = setLang;

// Names, not glyphs, are the default: the symbols toggle starts OFF. The
// server-rendered <body> carries `zodiac-names` to match (app/layout.tsx), so
// the default costs no first-paint correction.
var _zodiacDisplayMode = 'name';

function setZodiacMode(mode, b) {
  _zodiacDisplayMode = mode === 'name' ? 'name' : 'icon';
  window.__zodiacDisplayMode = _zodiacDisplayMode;

  document.body.classList.toggle('zodiac-names', _zodiacDisplayMode === 'name');
  document.querySelectorAll('.zo').forEach(function(x) {
    x.classList.toggle('active', x.getAttribute('data-zodiac-mode') === _zodiacDisplayMode);
  });
  if (b) b.classList.add('active');

  try { localStorage.setItem('astrolo:zodiac-display', _zodiacDisplayMode); } catch (e) {}
  window.dispatchEvent(new CustomEvent('astrolo:zodiac-display-change', { detail: { mode: _zodiacDisplayMode } }));
  // Renderers emit both icon and name forms (.zm-icon / .zm-name); CSS swaps
  // visibility off body.zodiac-names. No re-hydrate, no scroll jump.
}

window.setZodiacMode = setZodiacMode;

function _initZodiacMode() {
  // Only an explicit, stored 'icon' turns symbols on — an unset key (first
  // visit) or unreadable storage falls back to the 'name' default.
  var saved = 'name';
  try { saved = localStorage.getItem('astrolo:zodiac-display') === 'icon' ? 'icon' : 'name'; } catch (e) {}
  setZodiacMode(saved, document.querySelector('.zo[data-zodiac-mode="' + saved + '"]'));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _initZodiacMode);
else _initZodiacMode();

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
    ka: { login: 'შესვლა', loginSub: 'შენი ციური ნახაზი გელოდება', signup: 'რეგისტრაცია', signupSub: 'დაიწყე შენი ციური მოგზაურობა', forgot: 'პაროლის აღდგენა', forgotSub: 'შეიყვანე ელ-ფოსტა', google: 'Google-ით შესვლა', googleSignup: 'Google-ით რეგისტრაცია', orEmail: 'ან ელ-ფოსტით', email: 'ელ-ფოსტა', password: 'პაროლი', passwordMinPlaceholder: 'მინ. 8 სიმბოლო', name: 'სახელი', forgotLink: 'დაგავიწყდა?', createAccount: 'რეგისტრაცია', haveAccount: 'უკვე გაქვს ანგარიში?', sendReset: 'ბმულის გაგზავნა', resetSent: 'ბმული გაგზავნილია', resetInfo: 'თუ ანგარიში არსებობს, მალე მიიღებ აღდგენის ბმულს.', backToLogin: 'შესვლაზე დაბრუნება', backBtn: 'დაბრუნება', newPassword: 'ახალი პაროლი', newPasswordSub: 'შეიყვანე ახალი პაროლი', newPasswordLabel: 'ახალი პაროლი', confirmPasswordLabel: 'გაიმეორე პაროლი', updatePassword: 'პაროლის შენახვა', passwordUpdated: 'პაროლი განახლდა', passwordUpdatedInfo: 'შეგიძლია გააგრძელო ახალი პაროლით.', continueBtn: 'გაგრძელება', inviteBadge: 'მოწვევა: სინასტრია', termsPrefix: 'რეგისტრაციით ეთანხმები', termsLabel: 'პირობებს', privacyLabel: 'კონფიდენციალობას', birthData: 'დაბადების მონაცემები', birthSub: 'ნატალური რუკის აგებისთვის', birthHint: 'რატომ გვჭირდება?', birthHintText: 'ნატალური რუკა ზუსტ პლანეტარულ პოზიციებს ეფუძნება შენი დაბადების მომენტში. რაც უფრო ზუსტი — მით უფრო ღრმა ანალიზი.', day: 'დღე', month: 'თვე', year: 'წელი', hour: 'საათი', minute: 'წუთი', timeUnknown: 'დაბადების დრო უცნობია', place: 'დაბადების ადგილი', placePlaceholder: 'ქალაქი, ქვეყანა', gender: 'სქესი', female: 'ქალი', male: 'კაცი', generateChart: 'რუკის აგება ✦', back: '← უკან', showPw: 'ჩვენება', hidePw: 'დამალვა' },
    en: { login: 'Sign In', loginSub: 'Your celestial blueprint awaits', signup: 'Create Account', signupSub: 'Begin your celestial journey', forgot: 'Reset Password', forgotSub: 'Enter your email', google: 'Continue with Google', googleSignup: 'Continue with Google', orEmail: 'or with email', email: 'EMAIL', password: 'PASSWORD', passwordMinPlaceholder: 'Min. 8 characters', name: 'NAME', forgotLink: 'Forgot password?', createAccount: 'Create Account', haveAccount: 'Already have an account?', sendReset: 'Send Reset Link', resetSent: 'Check your email', resetInfo: 'If an account exists, you will receive a reset link shortly.', backToLogin: 'Back to Sign In', backBtn: 'Back', newPassword: 'New Password', newPasswordSub: 'Choose a new password', newPasswordLabel: 'NEW PASSWORD', confirmPasswordLabel: 'CONFIRM PASSWORD', updatePassword: 'Update Password', passwordUpdated: 'Password updated', passwordUpdatedInfo: 'You can now continue with your new password.', continueBtn: 'Continue', inviteBadge: 'Invite: Synastry', termsPrefix: 'By signing up, you agree to the', termsLabel: 'Terms', privacyLabel: 'Privacy Policy', birthData: 'Birth Data', birthSub: 'Required for your natal chart', birthHint: 'Why do we need this?', birthHintText: 'Your natal chart maps exact planetary positions at birth. More precision means a deeper reading.', day: 'DAY', month: 'MONTH', year: 'YEAR', hour: 'HOUR', minute: 'MINUTE', timeUnknown: 'Birth time unknown', place: 'Place of Birth', placePlaceholder: 'City, Country', gender: 'GENDER', female: 'Female', male: 'Male', generateChart: 'Generate Chart ✦', back: '← Back', showPw: 'Show', hidePw: 'Hide' }
  }
};

function authMonthsForLang(l) {
  const ka = ['იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი','ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი'];
  const en = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return l === 'en' ? en : ka;
}

function relabelBirthMonthOptions(l) {
  const m = document.getElementById('birth-month');
  if (!m) return;
  const months = authMonthsForLang(l);
  // option[0] is placeholder "—"
  for (let i = 1; i < m.options.length && i <= 12; i++) {
    m.options[i].textContent = months[i - 1] || m.options[i].textContent;
  }
}

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
  // #synPartnerName is rebuildSidebar's, not TR.sidebar's — but a language
  // switch mid-generation must still retranslate the placeholder, or the
  // invitee watches the old language for the rest of the wait. Uses `l` rather
  // than the body class so it doesn't depend on setLang's ordering.
  const synPartner = document.getElementById('synPartnerName');
  if (synPartner && _synastryGenerating) synPartner.textContent = _synGeneratingLabel(l === 'en');

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
    var spw = ps.querySelector('#signup-pw'); if (spw) spw.setAttribute('placeholder', a.passwordMinPlaceholder || '');
    var sbt = ps.querySelector('.auth-btn .btn-text'); if (sbt) sbt.textContent = a.createAccount;
    var af = ps.querySelector('.auth-footer'); if (af) { var afl = af.querySelector('a'); if (afl) { af.childNodes[0].textContent = a.haveAccount + ' '; afl.textContent = a.login; } }
    var ib = ps.querySelector('#invite-badge'); if (ib) { var dot = ib.querySelector('.inv-dot'); ib.textContent = ' ' + a.inviteBadge; if (dot) ib.insertBefore(dot, ib.firstChild); }
    var terms = ps.querySelector('.terms');
    if (terms) {
      var links = terms.querySelectorAll('a');
      var t1 = links[0] || null;
      var t2 = links[1] || null;
      terms.textContent = a.termsPrefix + ' ';
      if (t1) { t1.textContent = a.termsLabel; terms.appendChild(t1); }
      terms.appendChild(document.createTextNode(' ' + (l === 'en' ? 'and' : 'და') + ' '));
      if (t2) { t2.textContent = a.privacyLabel; terms.appendChild(t2); }
      if (l === 'en') terms.appendChild(document.createTextNode('.'));
    }
    ps.querySelectorAll('.pw-toggle').forEach(function(b) { b.textContent = a.showPw; });
  }
  // Forgot
  var pf = document.getElementById('page-forgot');
  if (pf) {
    var h3 = pf.querySelector('.auth-header h1'); if (h3) h3.textContent = a.forgot;
    var fs = pf.querySelector('.auth-header .sub'); if (fs) fs.textContent = a.forgotSub;
    var bl = pf.querySelector('.back-link'); if (bl) { var sp = bl.querySelector('span'); bl.textContent = ' ' + a.backToLogin; if (sp) bl.insertBefore(sp, bl.firstChild); }
    var fLabel = pf.querySelector('#forgot-form .field label'); if (fLabel) fLabel.textContent = a.email;
    var fbt = pf.querySelector('#forgot-form .auth-btn .btn-text'); if (fbt) fbt.textContent = a.sendReset;
    var rsh = pf.querySelector('.reset-success h3'); if (rsh) rsh.textContent = a.resetSent;
    var rsp = pf.querySelector('.reset-success p'); if (rsp) rsp.textContent = a.resetInfo;
    var rb = pf.querySelector('#forgot-success .auth-btn .btn-text'); if (rb) rb.textContent = a.backBtn;
  }
  // Reset (set new password)
  var pr = document.getElementById('page-reset');
  if (pr) {
    var rh = pr.querySelector('.auth-header h1'); if (rh) rh.textContent = a.newPassword;
    var rsub = pr.querySelector('.auth-header .sub'); if (rsub) rsub.textContent = a.newPasswordSub;
    var rLabels = pr.querySelectorAll('#reset-form .field label'); if (rLabels[0]) rLabels[0].textContent = a.newPasswordLabel; if (rLabels[1]) rLabels[1].textContent = a.confirmPasswordLabel;
    var rpw = pr.querySelector('#reset-pw'); if (rpw) rpw.setAttribute('placeholder', a.passwordMinPlaceholder || '');
    var rbt = pr.querySelector('#reset-form .auth-btn .btn-text'); if (rbt) rbt.textContent = a.updatePassword;
    var rsh = pr.querySelector('#reset-success .reset-success h3'); if (rsh) rsh.textContent = a.passwordUpdated;
    var rsp = pr.querySelector('#reset-success .reset-success p'); if (rsp) rsp.textContent = a.passwordUpdatedInfo;
    var rcb = pr.querySelector('#reset-success .auth-btn .btn-text'); if (rcb) rcb.textContent = a.continueBtn;
    pr.querySelectorAll('.pw-toggle').forEach(function(b) { b.textContent = a.showPw; });
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
    var plEl = pb.querySelector('#birth-place'); if (plEl) { var plL = plEl.closest ? plEl.closest('.field').querySelector('label') : null; if (plL) plL.textContent = a.place; plEl.setAttribute('placeholder', a.placePlaceholder || ''); }
    var gl = pb.querySelector('label[style]'); if (gl) gl.textContent = a.gender;
    var gopts = pb.querySelectorAll('.gender-opt'); gopts.forEach(function(opt, i) { var ic = opt.querySelector('.g-icon'); opt.textContent = ''; if (ic) opt.appendChild(ic); opt.appendChild(document.createTextNode(i === 0 ? a.female : a.male)); });
    var gbt = pb.querySelector('.auth-btn .btn-text'); if (gbt) gbt.textContent = a.generateChart;
    var bkg = pb.querySelector('.auth-btn-ghost'); if (bkg) bkg.textContent = a.back;
    relabelBirthMonthOptions(l);
  }
}

// ═══ SHARE ═══ → runtime-extras.js (shareReading / shareToSocial stubs above).

// ═══ NAVIGATION ═══
function go(id) {
  var el = document.getElementById(id);
  // If section is hidden (locked), scroll to its lock-wrap instead
  if (el && el.offsetParent === null) {
    var lockEl = document.getElementById('lock-' + id);
    if (lockEl) el = lockEl;
  }
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function toggleExp(btn) {
  if (!btn._origText) btn._origText = btn.textContent;
  const el = btn.nextElementSibling;
  const open = el.classList.toggle('open');
  const collapseLabel = _hydrateLang === 'en' ? 'Less ↑' : 'ნაკლები ↑';
  btn.textContent = open ? collapseLabel : btn._origText;
}

function openAspInterp(row, ev) {
  // Clicking the aspect symbol (type popup) or a planet (planet popup) is handled
  // by the delegated popup handler — bail so the interpretation toggle doesn't
  // also fire.
  if (ev && _closest(ev.target, '.asy-btn,.pl-btn,.cp-btn')) return;
  var key = row.getAttribute('data-asp-key');
  var parent = row.parentElement;
  var btn = parent.querySelector('.tb2');
  var ce = btn && btn.nextElementSibling;
  if (!ce) return;
  if (!ce.classList.contains('open')) {
    if (!btn._origText) btn._origText = btn.textContent;
    ce.classList.add('open');
    btn.textContent = _hydrateLang === 'en' ? 'Less ↑' : 'ნაკლები ↑';
  }
  var entry = ce.querySelector('[data-asp-key="' + key + '"]');
  if (!entry) return;
  setTimeout(function() {
    entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
    entry.classList.remove('ai-pulse');
    void entry.offsetWidth; // reflow to restart animation
    entry.classList.add('ai-pulse');
    setTimeout(function() { entry.classList.remove('ai-pulse'); }, 1800);
  }, 320);
}


// ═══ STARS ═══
(function() {
  const c = document.getElementById('stars');
  if (!c) return;
  // Three parallax depth layers. The scroll transform is set on each LAYER (see
  // .star-layer in globals.css), so the parallax restyles 3 nodes per frame, not
  // every star. Stars inherit their layer's --depth (the .star.tr::after trail
  // calc reads it) and only run their own twinkle.
  //
  // SEAMLESS WRAP: each layer holds one viewport-tall tile of stars (tops in
  // [0%,100%)) plus an identical CLONE one tile (100%) below. The parallax loop
  // drifts the layer and wraps the offset modulo the tile height, so the field
  // scrolls forever without ever emptying — when the offset wraps -tile→0 the
  // clone sits exactly where the original was, so the seam is invisible. The
  // clone shares the original's left/twinkle/size so its phase matches too.
  const DEPTHS = [0.07, 0.12, 0.17];
  const PER_TILE = 16; // stars per tile per layer (≈ what's visible at once)
  DEPTHS.forEach(function(depth) {
    const layer = document.createElement('div');
    layer.className = 'star-layer';
    layer.style.setProperty('--depth', depth.toFixed(3));
    for (let i = 0; i < PER_TILE; i++) {
      const left = Math.random() * 100;
      const top = Math.random() * 100;           // within one tile
      const d = (2 + Math.random() * 4);
      const delay = Math.random() * 5;
      const tr = Math.random() < 0.25;           // ~25% sprout a motion-trail
      // Size variety: ~15% a little bigger (3px), ~25% tiny (1px), rest 2px.
      const roll = Math.random();
      const size = roll < 0.15 ? 3 : roll > 0.75 ? 1 : 2;
      for (let k = 0; k < 2; k++) {              // original + clone one tile down
        const s = document.createElement('div');
        s.className = tr ? 'star tr' : 'star';
        s.style.left = left + '%';
        s.style.top = (top + k * 100) + '%';
        s.style.setProperty('--d', d + 's');
        s.style.animationDelay = delay + 's';
        if (size !== 2) { s.style.width = size + 'px'; s.style.height = size + 'px'; }
        layer.appendChild(s);
      }
    }
    c.appendChild(layer);
  });
})();

// ═══ STARFIELD SCROLL PARALLAX (seamless wrap) + TRAIL ═══
// Drift each depth layer on scroll and add a brief motion-trail "feedback"
// streak on faster scrolls. Per frame we write one --wy per layer (the wrapped
// parallax offset) plus two container vars for the trail:
//   --wy    per-layer offset = -((curY × depth) mod tile)  → endless drift
//   --mmag  smoothed scroll speed 0..1 (drives trail length + opacity)
//   --mdir  scroll direction ±1 (flips the streak to trail behind motion)
// The compositor does the rest (see .star-layer / .star.tr::after in
// globals.css). The rAF loop only runs while scrolling + a short decay, then
// stops, so it costs nothing at rest. Fully disabled under reduced-motion.
(function() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.getElementById('stars');
  if (!c) return;
  const layers = Array.prototype.map.call(c.querySelectorAll('.star-layer'), function(el) {
    return { el: el, depth: parseFloat(el.style.getPropertyValue('--depth')) || 0 };
  });
  if (!layers.length) return;

  // Touch keeps the parallax + trail but tuned to survive mobile scrolling:
  // browsers coalesce scroll events + throttle rAF during momentum, so the
  // easing has to do more smoothing (lower EASE), and a long streak would
  // exaggerate any residual coarse step — so the trail is shorter (higher SPD =
  // less streak per unit speed) with a gentler attack. Desktop keeps the
  // snappier feel. The real jump culprit — the URL-bar show/hide resizing the
  // viewport — is handled by the resize re-baseline below, not by disabling.
  var isTouch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  var EASE = isTouch ? 0.11 : 0.16;   // lower = smoother drift, hides coarse steps
  var SPD  = isTouch ? 70 : 40;       // higher = shorter trail per unit scroll speed
  var ATK  = isTouch ? 0.28 : 0.4;    // trail attack (rise) rate

  // tile = one viewport-tall star tile (100% of the layer). The offset wraps
  // modulo this, so the field tiles seamlessly. Kept in sync with innerHeight.
  let tile = window.innerHeight || 800;
  // The mobile URL bar showing/hiding resizes the viewport, which shifts scrollY
  // abruptly. Reading that shift as motion is what made the field "snap" and
  // fire a bogus trail. On any viewport resize we flag the next frame to
  // re-baseline curY to the live scrollY with zero velocity, so the field
  // settles into its new position instead of streaking to it.
  let snap = false;
  function onResize() { tile = window.innerHeight || 800; snap = true; ensure(); }
  window.addEventListener('resize', onResize, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize, { passive: true });

  function applyWrap() {
    for (let i = 0; i < layers.length; i++) {
      // ((x % tile) + tile) % tile keeps it in [0,tile) regardless of sign.
      const off = ((curY * layers[i].depth) % tile + tile) % tile;
      layers[i].el.style.setProperty('--wy', (-off).toFixed(2) + 'px');
    }
  }

  // curY is a *smoothed* scroll position that eases toward the real scrollY each
  // frame. Easing turns discrete scroll steps into continuous drift. The loop
  // keeps running after scroll stops until curY has caught up, then stops.
  let curY = window.scrollY, mmag = 0, dir = 1, running = false, idle = 0;
  applyWrap();

  function frame() {
    const targetY = window.scrollY;
    // Re-baseline after a viewport resize (URL bar): jump curY to the live
    // position with no velocity so the field settles instead of streaking.
    if (snap) { snap = false; curY = targetY; applyWrap(); requestAnimationFrame(frame); return; }
    const prevY = curY;
    // Ease toward the live scroll position: smooth enough to hide scroll notches,
    // snappy enough to still feel attached.
    curY += (targetY - curY) * EASE;
    const rawV = curY - prevY;
    if (Math.abs(rawV) > 0.5) dir = rawV > 0 ? 1 : -1;
    // Trail magnitude tracks real scroll speed (rawV), not the wrapped offset,
    // so a wrap never spikes the streak. Fast attack / slow decay so it appears
    // at once and lingers briefly.
    const speed = Math.min(1, Math.abs(rawV) / SPD);
    mmag += (speed - mmag) * (speed > mmag ? ATK : 0.08);
    applyWrap();
    c.style.setProperty('--mmag', mmag.toFixed(3));
    c.style.setProperty('--mdir', String(dir));
    // Settle only once we've caught up to the target *and* the trail decayed.
    if (Math.abs(targetY - curY) < 0.5 && mmag < 0.004) idle++; else idle = 0;
    if (idle > 6) {
      running = false;
      curY = targetY;
      applyWrap();
      c.style.setProperty('--mmag', '0');
      return;
    }
    requestAnimationFrame(frame);
  }
  function ensure() { if (!running) { running = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', ensure, { passive: true });
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

  // Dismiss any open tap/hover popup (planet table cell, element tag, zodiac
  // sign, aspect) once the user starts scrolling — the popup is anchored to a
  // fixed viewport position and would otherwise float detached from its cell.
  // closePopup() fades it out over 250ms, so it's gone within ~half a second.
  if (activePopup) closePopup();

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
    // Collect visible scroll targets: sections + lock-wraps (for free-tier locked sections)
    const _allNavTargets = Array.from(document.querySelectorAll('#view-natal section, #view-natal > .ct > .lock-wrap'));
    // Sort by DOM order and deduplicate to one target per nav button index
    _allNavTargets.sort(function(a, b) { return a.compareDocumentPosition(b) & 2 ? 1 : -1; });
    // Map each target to its nav index (sections use s1..s8 IDs, lock-wraps use lock-s1..lock-s8)
    var _navTargets = []; // array of { el, navIdx }
    _allNavTargets.forEach(function(el) {
      var id = el.id || '';
      var idx = -1;
      if (id.match(/^s\d+$/)) idx = parseInt(id.replace('s', '')) - 1;
      else if (id.match(/^lock-s\d+$/)) idx = parseInt(id.replace('lock-s', '')) - 1;
      if (idx >= 0) {
        // Skip hidden sections (display:none behind a lock-wrap) — use the lock-wrap instead
        if (el.tagName === 'SECTION' && el.offsetParent === null) return;
        // Don't duplicate: if a lock-wrap already added this idx, skip
        if (_navTargets.length > 0 && _navTargets[_navTargets.length - 1].navIdx === idx) return;
        _navTargets.push({ el: el, navIdx: idx });
      }
    });
    const nbs  = Array.from(document.querySelectorAll('.nbtn'));
    var _firstSecTop = null;
    var _lastSecBottom = null;
    function _calcSecBounds() {
      if (!_navTargets.length) return;
      _firstSecTop    = _navTargets[0].el.getBoundingClientRect().top + window.scrollY;
      _lastSecBottom  = _navTargets[_navTargets.length - 1].el.getBoundingClientRect().bottom + window.scrollY;
    }
    _calcSecBounds();
    window.addEventListener('resize', _calcSecBounds);

    // Auto-center the active .nbtn within its horizontal scroll container.
    // Manual horizontal scroll on the nav suspends centering for ~2.5s.
    var _navCt = document.querySelector('.nb .ct');
    var _prevActiveIdx = -1;
    var _navUserOverrideUntil = 0;
    var _navIsProgrammatic = false;
    var _navProgTimer;
    var _navAnimId;
    function _navSmoothScrollTo(target, dur) {
      if (!_navCt) return;
      if (_navAnimId) cancelAnimationFrame(_navAnimId);
      var startSL = _navCt.scrollLeft;
      var delta = target - startSL;
      if (Math.abs(delta) < 1) return;
      var startT;
      // easeInOutQuad
      function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
      function step(t) {
        if (!startT) startT = t;
        var p = Math.min(1, (t - startT) / dur);
        _navCt.scrollLeft = startSL + delta * ease(p);
        if (p < 1) _navAnimId = requestAnimationFrame(step);
        else _navAnimId = null;
      }
      _navAnimId = requestAnimationFrame(step);
    }
    if (_navCt) {
      _navCt.addEventListener('scroll', function() {
        if (_navIsProgrammatic) return;
        _navUserOverrideUntil = Date.now() + 2500;
      }, { passive: true });
    }

    window._syncNavProgress = function() {
      var offset = 130; // px from top to consider a section "in view"
      var activeNavIdx = 0;
      for (var _si = 0; _si < _navTargets.length; _si++) {
        if (_navTargets[_si].el.getBoundingClientRect().top <= offset) activeNavIdx = _navTargets[_si].navIdx;
      }
      nbs.forEach(function(b) { b.classList.remove('active'); });
      if (nbs[activeNavIdx]) nbs[activeNavIdx].classList.add('active');

      // Center the active pill — only when active idx changes and user isn't dragging the nav
      if (activeNavIdx !== _prevActiveIdx && _navCt && nbs[activeNavIdx] && Date.now() >= _navUserOverrideUntil) {
        var btn = nbs[activeNavIdx];
        var ctRect = _navCt.getBoundingClientRect();
        var bRect = btn.getBoundingClientRect();
        var desired = _navCt.scrollLeft + (bRect.left - ctRect.left) + bRect.width / 2 - ctRect.width / 2;
        if (Math.abs(desired - _navCt.scrollLeft) > 2) {
          _navIsProgrammatic = true;
          _navSmoothScrollTo(desired, 380);
          if (_navProgTimer) clearTimeout(_navProgTimer);
          _navProgTimer = setTimeout(function() { _navIsProgrammatic = false; }, 500);
        }
      }
      _prevActiveIdx = activeNavIdx;

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

// ═══ RUNTIME ASSET VERSION ═══
// scripts/build-runtime.mjs stamps the content hash into the emitted .min.js;
// an unreplaced placeholder means dev / raw sources (must-revalidate paths).
var RUNTIME_V = '__RUNTIME_V__';
var _builtRuntime = RUNTIME_V.charAt(0) !== '_';
function _lazyAssetSrc(name, ext) {
  return _builtRuntime ? '/' + name + '.min.' + ext + '?v=' + RUNTIME_V
                       : '/' + name + '.' + ext;
}

// ═══ INTERP POPUP DATA (lazy) ═══
// The element/planet/chart-point/sign/house/aspect popup texts live in
// /runtime-interp.json (elData, aspectData, _aspTypeBody, plData, cpData,
// _SIGN_DATA, _HOUSE_DATA — that JSON is the source of truth now) so ~21 KB
// stays off the critical path. Prefetched at idle; popup handlers go through
// _withInterp, which is synchronous once the data is cached.
var _interpData = null, _interpPromise = null;
function _loadInterp() {
  if (_interpData) return Promise.resolve(_interpData);
  if (!_interpPromise) {
    _interpPromise = fetch(_lazyAssetSrc('runtime-interp', 'json'))
      .then(function(r) { if (!r.ok) throw new Error('interp HTTP ' + r.status); return r.json(); })
      .then(function(d) { _interpData = d; return d; })
      .catch(function(e) { _interpPromise = null; throw e; }); // next call retries
  }
  return _interpPromise;
}
function _withInterp(cb) {
  if (_interpData) { cb(_interpData); return; }
  _loadInterp().then(cb).catch(function(e) { console.error('[runtime] interp data unavailable', e); });
}
(window.requestIdleCallback || function(f) { setTimeout(f, 2000); })(function() { _loadInterp().catch(function() {}); });

// Aspect type → popup nature theme (matches .aspect-tag colors)
const _aspNature = { conjunction: 'magnetic', trine: 'harmony', sextile: 'harmony', square: 'tension', opposition: 'tension' };


// Short planet tips for hover tooltips in card-body prose (one-liners).
const PLANET_TIPS_KA = {
  sun: 'მზე — იდენტობა, ეგო, სასიცოცხლო ძალა', moon: 'მთვარე — ემოცია, ინსტინქტი, შინაგანი სამყარო',
  mercury: 'მერკური — გონება, კომუნიკაცია, აზროვნება', venus: 'ვენერა — სიყვარული, ესთეტიკა, ღირებულებები',
  mars: 'მარსი — მოქმედება, ვნება, ნება', jupiter: 'იუპიტერი — ზრდა, სიუხვე, ბედი',
  saturn: 'სატურნი — სტრუქტურა, დისციპლინა, გაკვეთილები', uranus: 'ურანი — თავისუფლება, ინოვაცია, გამოღვიძება',
  neptune: 'ნეპტუნი — ოცნება, ინტუიცია, სულიერება', pluto: 'პლუტონი — ტრანსფორმაცია, ძალა, განახლება',
  lilith: 'ლილითი — ჩრდილი, პირველადი ინსტინქტი, ტაბუ', node: 'ჩრდილოეთის კვანძი — კარმული მიმართულება, ზრდის გზა',
  'south node': 'სამხრეთის კვანძი — კარმული წარსული, თანდაყოლილი გამოცდილება',
  chiron: 'ქირონი — ჭრილობა და განკურნება'
};
const PLANET_TIPS_EN = {
  sun: 'Sun — identity, ego, vitality', moon: 'Moon — emotion, instinct, inner world',
  mercury: 'Mercury — mind, communication, thought', venus: 'Venus — love, beauty, values',
  mars: 'Mars — action, drive, will', jupiter: 'Jupiter — growth, abundance, fortune',
  saturn: 'Saturn — structure, discipline, lessons', uranus: 'Uranus — freedom, innovation, awakening',
  neptune: 'Neptune — dreams, intuition, spirituality', pluto: 'Pluto — transformation, power, rebirth',
  lilith: 'Lilith — shadow, raw instinct, taboo', node: 'North Node — karmic direction, growth path',
  'south node': 'South Node — karmic past, innate gifts',
  chiron: 'Chiron — the wound and the healing'
};
// Bodies that have a click popup (plData) — used to gate .pl-btn triggers in aspect rows.
const _PL_POPUP_KEYS = { sun:1, moon:1, mercury:1, venus:1, mars:1, jupiter:1, saturn:1, uranus:1, neptune:1, pluto:1, chiron:1, node:1, 'north node':1, 'south node':1, lilith:1 };

const _CHART_POINTS = { asc: 'asc', ascendant: 'asc', dsc: 'dsc', descendant: 'dsc', mc: 'mc', midheaven: 'mc', ic: 'ic', 'imum coeli': 'ic', imumcoeli: 'ic' };
function _chartPointKey(name) {
  if (!name) return '';
  return _CHART_POINTS[String(name).toLowerCase().trim()] || '';
}

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
  // Replace synchronously — closePopup() defers removal 250ms (fade-out),
  // which would briefly stack the old popup over the new one ("glitches for a second").
  if (activePopup) { activePopup.remove(); activePopup = null; activeTag = null; }
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
    _withInterp(function(D) {
      const d = D.elData[lang][type];
      _showPopup(etTag, type + '-pop', d.title, d.body);
    });
    return;
  }

  // Planet button popups (.pl-btn)
  const plBtn = _closest(e.target, '.pl-btn');
  if (plBtn) {
    e.stopPropagation();
    const key = plBtn.getAttribute('data-pl'); if (!key) return;
    if (activeTag === plBtn) { closePopup(); return; }
    const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
    _withInterp(function(D) {
      // Node keys: 'north node' reads the shared 'node' entry; 'south node'
      // has its OWN entry and renders the node glyph rotated 180° (gi-flip).
      var isSouth = key === 'south node';
      var dataKey = key === 'north node' ? 'node' : key;
      var glyphId = (isSouth || dataKey === 'node') ? 'node' : dataKey;
      const d = D.plData[lang][dataKey];
      if (!d) return;
      // Use the SAME SVG glyph as the planet table (data has a legacy Unicode
      // symbol prefix in `t` — strip it so the table and popup never mismatch).
      var plName = d.t.replace(/^\S+\s+/, '');
      var plGlyph = '<svg class="pl-pop-gi' + (isSouth ? ' gi-flip' : '') + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#gl-' + glyphId + '"/></svg>';
      _showPopup(plBtn, 'planet-pop', plGlyph + plName, d.b);
    });
    return;
  }

  // Chart-point (angle) popups — ASC / DSC / MC / IC (.cp-btn)
  const cpBtn = _closest(e.target, '.cp-btn');
  if (cpBtn) {
    e.stopPropagation();
    const key = cpBtn.getAttribute('data-cp'); if (!key) return;
    if (activeTag === cpBtn) { closePopup(); return; }
    const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
    _withInterp(function(D) {
      const d = D.cpData[lang][key];
      if (!d) return;
      _showPopup(cpBtn, 'planet-pop', '<span class="cp-pop-acr">' + d.acr + '</span>' + d.t, d.b);
    });
    return;
  }

  // Zodiac sign cell popups in planet table (.sign-td)
  const signTd = _closest(e.target, '.sign-td');
  if (signTd) {
    e.stopPropagation();
    if (activeTag === signTd) { closePopup(); return; }
    const si = parseInt(signTd.getAttribute('data-si'), 10);
    if (isNaN(si)) return;
    const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
    _withInterp(function(D) {
      const d = D._SIGN_DATA[lang][si];
      if (!d) return;
      // Edge colour follows the sign's element (fire/earth/air/water cycle from Aries)
      var _signEl = ['sf', 'se', 'sa', 'sw'][si % 4];
      _showPopup(signTd, 'sign-pop ' + _signEl, _signPopupSvg(si) + d.t, d.b);
    });
    return;
  }

  // House cell popups (.house-td)
  const houseTd = _closest(e.target, '.house-td');
  if (houseTd) {
    e.stopPropagation();
    if (activeTag === houseTd) { closePopup(); return; }
    const houseStr = houseTd.getAttribute('data-house');
    const houseIdx = _ROMAN_TO_INT[houseStr];
    if (!houseIdx) return;
    const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
    _withInterp(function(D) {
      const d = D._HOUSE_DATA[lang][houseIdx - 1];
      if (!d) return;
      _showPopup(houseTd, 'house-pop', _housePopupBadge(houseStr) + d.t, d.b);
    });
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
    _withInterp(function(D) {
      const d = D.aspectData[lang][type];
      _showPopup(aspTag, type + '-pop', d.t, d.b);
    });
    return;
  }

  // Aspect symbol popups in the natal aspect list (.asy-btn) — explains the
  // aspect TYPE. Lives inside .al rows that may have their own interp onclick;
  // openAspInterp bails when the click lands here (see its guard).
  const asyBtn = _closest(e.target, '.asy-btn');
  if (asyBtn) {
    e.stopPropagation();
    if (activeTag === asyBtn) { closePopup(); return; }
    const type = asyBtn.getAttribute('data-asp-type'); if (!type) return;
    const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
    _withInterp(function(D) {
      const body = (D._aspTypeBody[lang] || D._aspTypeBody.ka)[type]; if (!body) return;
      const label = (_aspTypeLabel[lang] || _aspTypeLabel.ka)[type] || type;
      _showPopup(asyBtn, (_aspNature[type] || 'magnetic') + '-pop', _aspectGlyph(type) + ' ' + label, body);
    });
    return;
  }

  // Close popup when clicking elsewhere
  if (activePopup && !_closest(e.target, '.el-popup') && !_closest(e.target, '.mc-sign-btn')) closePopup();
});

// iOS Safari only fires `click` on elements that look interactive (links, buttons,
// role=button, onclick handlers). Taps on plain divs / page background never reach
// the close-elsewhere handler above. `pointerdown` fires on any element, so use it
// purely for outside-close. Triggers handle their own toggle via the click handler.
const _POPUP_TRIGGER_SEL = '.et,.pl-btn,.cp-btn,.sign-td,.house-td,.aspect-tag,.asy-btn,.mc-sign-btn,.el-popup';
document.addEventListener('pointerdown', e => {
  if (!activePopup) return;
  if (_closest(e.target, _POPUP_TRIGGER_SEL)) return;
  closePopup();
}, true);

// Click-driven popups (.et / .pl-btn / .sign-td / .house-td / .aspect-tag)
// dismiss only on click — clicking the trigger again toggles, clicking
// elsewhere triggers the close-elsewhere paths above. We previously closed
// on mouseleave with a 200 ms grace, but for popups positioned BELOW the
// anchor (when the anchor is near the top of the viewport) users moving
// the cursor to read the popup would race the timer and the popup would
// close mid-animation. The hover-driven .mc-sign-btn case has its own
// pointerleave handler in renderMiniChart.

// Desktop: 1 s hover on planet-table cells opens the popup, and leaving
// both the trigger and popup closes it after a short grace (so the user
// can travel from cell to popup to read it). Touch devices skip this
// entirely via matchMedia and keep click-only behavior. We synthesize a
// click so all the existing open logic runs unchanged.
if (typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const HOVER_OPEN_DELAY = 1000;
  const HOVER_CLOSE_GRACE = 200;
  const HOVER_TRIGGER_SEL = '.pl-btn,.cp-btn,.sign-td,.house-td,.et,.asy-btn';
  let openTimer = null, openTarget = null;
  let closeTimer = null, hoverOpenedFor = null;
  const cancelOpen = () => {
    if (openTimer) { clearTimeout(openTimer); openTimer = null; }
    openTarget = null;
  };
  const cancelClose = () => {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  };
  // Owns the currently open popup if its trigger is one of the hover-supported
  // planet-table cells (works for both hover- and click-opened popups).
  const currentHoverTrigger = () =>
    activeTag && activeTag.matches && activeTag.matches(HOVER_TRIGGER_SEL)
      ? activeTag : null;
  const isOverHoverGroup = (node) => {
    if (!node || !activePopup) return false;
    const trig = currentHoverTrigger();
    if (!trig) return false;
    return trig.contains(node) || activePopup.contains(node);
  };

  document.addEventListener('mouseover', e => {
    // Re-entering the trigger or popup cancels a pending close.
    if (isOverHoverGroup(e.target)) cancelClose();

    const trigger = _closest(e.target, HOVER_TRIGGER_SEL);
    if (!trigger || trigger === openTarget) return;
    cancelOpen();
    openTarget = trigger;
    openTimer = setTimeout(() => {
      openTimer = null;
      if (activeTag === trigger) return;
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      hoverOpenedFor = trigger;
    }, HOVER_OPEN_DELAY);
  });

  document.addEventListener('mouseout', e => {
    const trigger = _closest(e.target, HOVER_TRIGGER_SEL);
    if (trigger && trigger === openTarget && !trigger.contains(e.relatedTarget)) {
      cancelOpen();
    }
    // Auto-close planet-table popups (hover- or click-opened) when leaving
    // both the trigger and the popup.
    const trig = currentHoverTrigger();
    if (!trig) return;
    if (!isOverHoverGroup(e.target)) return;
    if (isOverHoverGroup(e.relatedTarget)) return;
    cancelClose();
    closeTimer = setTimeout(() => {
      closeTimer = null;
      if (activeTag === trig) closePopup();
      hoverOpenedFor = null;
    }, HOVER_CLOSE_GRACE);
  });
}


// Nudge .tip/.tip2 tooltips left/right to stay within viewport edges
document.addEventListener('mouseover', function(e) {
  var tip = _closest(e.target, '.tip,.tip2');
  if (!tip) return;
  if (!tip.hasAttribute('data-tip') && !tip.querySelector('.tt')) return;
  var r = tip.getBoundingClientRect();
  var mid = r.left + r.width / 2;
  var vw = window.innerWidth;
  tip.classList.remove('tip--el', 'tip--er');
  if (mid < vw * 0.3) tip.classList.add('tip--el');
  else if (mid > vw * 0.7) tip.classList.add('tip--er');
}, true);

// ═══ MINI NATAL CHART ═══

// Helpers for converting reading planet data → chart format
var _ZODIAC_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
var _PLANET_KA = { sun:'მზე', moon:'მთვარე', mercury:'მერკური', venus:'ვენერა', mars:'მარსი', jupiter:'იუპიტერი', saturn:'სატურნი', uranus:'ურანი', neptune:'ნეპტუნი', pluto:'პლუტონი' };
// pd = glow pulse period (s) — scaled to how fast each body moves through the
// zodiac: Moon breathes quickest, outer planets slowest.
var _PLANET_META = {
  sun:     { g:'☉', r:4.5, c:'#c9a84c', pd:3.4 }, moon:    { g:'☽', r:4,   c:'#b8b8cc', pd:2.2 },
  mercury: { g:'☿', r:3,   c:'#8ab5d4', pd:2.6 }, venus:   { g:'♀', r:3.5, c:'#c47a8a', pd:3 },
  mars:    { g:'♂', r:3,   c:'#d4644a', pd:3.8 }, jupiter: { g:'♃', r:3,   c:'#8a7abf', pd:4.4 },
  saturn:  { g:'♄', r:3,   c:'#7a8a6e', pd:5 },   uranus:  { g:'♅', r:3,   c:'#5a9ab5', pd:5.6 },
  neptune: { g:'♆', r:2.5, c:'#6b7baa', pd:6.2 }, pluto:   { g:'♇', r:2.5, c:'#9a6b6b', pd:7 }
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
      c: meta.c,
      pd: meta.pd
    });
  });
  return out;
}

var _DEMO_PLANETS = [
  { n: 'მზე', g: '☉', deg: 202.33, si: 6, sd: "22°20'", h: 'III', r: 4.5, c: '#c9a84c', pd: 3.4 },
  { n: 'მთვარე', g: '☽', deg: 152.67, si: 5, sd: "2°40'", h: 'II', r: 4, c: '#b8b8cc', pd: 2.2 },
  { n: 'მერკური', g: '☿', deg: 215.92, si: 7, sd: "5°55'", h: 'IV', r: 3, c: '#8ab5d4', pd: 2.6 },
  { n: 'ვენერა', g: '♀', deg: 198.67, si: 6, sd: "18°40'", h: 'III', r: 3.5, c: '#c47a8a', pd: 3 },
  { n: 'მარსი', g: '♂', deg: 155.12, si: 5, sd: "5°07'", h: 'II', r: 3, c: '#d4644a', pd: 3.8 },
  { n: 'იუპიტერი', g: '♃', deg: 349.53, si: 11, sd: "19°32'℞", h: 'VIII', r: 3, c: '#8a7abf', pd: 4.4 },
  { n: 'სატურნი', g: '♄', deg: 30.78, si: 1, sd: "0°47'℞", h: 'X', r: 3, c: '#7a8a6e', pd: 5 },
  { n: 'ურანი', g: '♅', deg: 308.82, si: 10, sd: "8°49'℞", h: 'VII', r: 3, c: '#5a9ab5', pd: 5.6 },
  { n: 'ნეპტუნი', g: '♆', deg: 299.4, si: 9, sd: "29°24'", h: 'VI', r: 2.5, c: '#6b7baa', pd: 6.2 },
  { n: 'პლუტონი', g: '♇', deg: 246.3, si: 8, sd: "6°18'", h: 'V', r: 2.5, c: '#9a6b6b', pd: 7 }
];

// ── Module-level sign constants (shared by mini-chart and planet table) ──
const _SIGN_IDS = ['gl-aries','gl-taurus','gl-gemini','gl-cancer','gl-leo','gl-virgo','gl-libra','gl-scorpio','gl-sagittarius','gl-capricorn','gl-aquarius','gl-pisces'];
const _SIGN_IDX = {aries:0,taurus:1,gemini:2,cancer:3,leo:4,virgo:5,libra:6,scorpio:7,sagittarius:8,capricorn:9,aquarius:10,pisces:11};
// Element cycle: fire, earth, air, water repeated × 3
const _SIGN_EL_COLOR = ['#d4644a','#6b9a6b','#6b8fb5','#7b6baa','#d4644a','#6b9a6b','#6b8fb5','#7b6baa','#d4644a','#6b9a6b','#6b8fb5','#7b6baa'];
function _signPopupSvg(si) {
  var color = _SIGN_EL_COLOR[si] || 'currentColor';
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="vertical-align:-3px;margin-right:6px;color:' + color + '"><use href="#' + _SIGN_IDS[si] + '"/></svg>';
}

// ── House constants (12 houses) ──
var _ROMAN_TO_INT = {I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10,XI:11,XII:12};
function _housePopupBadge(houseStr) {
  return '<span style="display:inline-block;min-width:26px;height:18px;line-height:18px;text-align:center;padding:0 5px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.25);border-radius:3px;font-size:.72rem;color:var(--gold);margin-right:8px;font-family:Outfit,sans-serif;letter-spacing:.06em;vertical-align:-2px">' + houseStr + '</span>';
}

function renderMiniChart(planetsIn, ascEclIn, mcEclIn) {
  const svg = document.getElementById('miniChart');
  if (!svg) return;
  // Mobile crops the 40px label margin (labels are hidden via CSS), so the
  // chart circle fills more of the container.
  const isMobile = window.matchMedia && window.matchMedia('(max-width: 720px)').matches;
  svg.setAttribute('viewBox', isMobile ? '10 10 400 400' : '-40 -40 500 500');
  const wrap = svg.parentElement;
  const tip = document.getElementById('chartTip');
  const CX = 210, CY = 210, R = 190, RI = 150, RP = 118;
  const SIGN_KA = ['ვერძი','კურო','ტყუპი','კირჩხიბი','ლომი','ქალწული','სასწორი','მორიელი','მშვილდოსანი','თხის რქა','მერწყული','თევზები'];
  const SIGN_IDS = _SIGN_IDS;
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
  // Chart angles — ASC/DSC (horizontal axis) and MC/IC (vertical axis) labels
  // just outside the outer ring. Each is a clickable + hover target
  // (.mc-angle-btn) wired to the same cpData popups used in aspect rows /
  // interpretations. dx/dy offset the text from the ring point; hx/hy center
  // the transparent hit circle over the rendered label.
  const mcAngles = [
    { cp: 'asc', txt: 'ASC', ecl: ASC_ECL,       dx: -4, dy: 5,  hx: -15, hy: 0,   anchor: 'end',    delay: 1.8 },
    { cp: 'dsc', txt: 'DSC', ecl: ASC_ECL + 180, dx: 4,  dy: 5,  hx: 16,  hy: 0,   anchor: 'start',  delay: 1.85 },
    { cp: 'mc',  txt: 'MC',  ecl: MC_ECL,        dx: 0,  dy: 14, hx: 0,   hy: 9,   anchor: 'middle', delay: 1.9 },
    { cp: 'ic',  txt: 'IC',  ecl: MC_ECL + 180,  dx: 0,  dy: -8, hx: 0,   hy: -11, anchor: 'middle', delay: 1.95 }
  ];
  mcAngles.forEach(a => {
    const lp = pos(a.ecl, R + 22);
    h += '<g data-cp="'+a.cp+'" class="mc-angle-btn" style="cursor:pointer">';
    h += '<circle cx="'+(lp.x + a.hx)+'" cy="'+(lp.y + a.hy)+'" r="16" fill="transparent" stroke="none"/>';
    h += '<text x="'+(lp.x + a.dx)+'" y="'+(lp.y + a.dy)+'" text-anchor="'+a.anchor+'" font-family="Outfit,sans-serif" font-size="13" font-weight="500" letter-spacing=".14em" fill="#c9a84c" class="mc-label" style="animation-delay:'+a.delay+'s">'+a.txt+'</text>';
    h += '</g>';
  });
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
    const d = 1.2 + i * .15;
    // --mdx/--mdy: offset from the planet's spot back to the chart center —
    // the planetArrive keyframes pop the dot at the center, then fly it out.
    const mdx = (CX - pt.x).toFixed(2), mdy = (CY - pt.y).toFixed(2);
    h += '<g data-i="'+i+'" style="cursor:pointer;animation-delay:'+d+'s;--mdx:'+mdx+'px;--mdy:'+mdy+'px" class="mc-planet">';
    // Multi-stop falloff: bright core, quick drop, long faint tail — reads as a
    // blurred halo with no visible rim. Radius has a flat base so small planets
    // still get a present glow (r2.5 → 9.5) while the Sun barely grows.
    h += '<radialGradient id="mcpg'+i+'"><stop offset="0" stop-color="'+p.c+'" stop-opacity=".75"/><stop offset=".4" stop-color="'+p.c+'" stop-opacity=".3"/><stop offset=".75" stop-color="'+p.c+'" stop-opacity=".08"/><stop offset="1" stop-color="'+p.c+'" stop-opacity="0"/></radialGradient>';
    h += '<circle class="p-glow" cx="'+pt.x+'" cy="'+pt.y+'" r="'+(p.r * 2 + 4.5).toFixed(1)+'" fill="url(#mcpg'+i+')" style="animation-delay:'+(d + 1)+'s;animation-duration:'+(p.pd || 3)+'s"/>';
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
      // Use the actual rendered position of the planet dot — viewBox padding
      // (-40 -40 500 500) means viewBox math doesn't match svg pixel space.
      const core = g.querySelector('.p-core');
      const cr = core.getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      tip.style.left = (cr.left + cr.width / 2 - wr.left) + 'px';
      tip.style.top = (cr.top + cr.height / 2 - wr.top) + 'px';
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

  // Sign + chart-angle popups — same popup style as body text (.et / .pl-btn).
  // Both share the click + desktop-hover wiring via _wireMcPopup; only the
  // `openPopup` callback (which popup to build) differs.
  const _wireMcPopup = (g, openPopup) => {
    g.addEventListener('click', e => {
      e.stopPropagation();
      if (activeTag === g) { closePopup(); return; }
      openPopup();
    });
    // Desktop hover — show popup without click. Skip touch (relies on click).
    g.addEventListener('pointerenter', e => {
      if (e.pointerType === 'touch') return;
      if (activeTag === g) return;
      openPopup();
    });
    // The document-level mouseleave handler can't reach SVG nodes (its _closest
    // helper only walks HTMLElement ancestors), so close directly here.
    g.addEventListener('pointerleave', e => {
      if (e.pointerType === 'touch') return;
      if (activeTag !== g) return;
      const popup = activePopup;
      if (!popup) return;
      // Coordinate-based hit-tracking: treat the anchor + popup (plus a small
      // margin that bridges the 8px gap) as a single "engaged" region. The
      // popup only closes once the cursor has been clearly outside that
      // region for HOVER_OUT ms. This survives the case where the popup is
      // flipped BELOW the anchor (near header after scroll) — the previous
      // `:hover`-based check would race style recalc and close on traversal.
      const HOVER_OUT = 220;
      const FALLBACK = 2500;
      let resolved = false;
      let closeTimer = null;
      const inEngagedZone = (x, y) => {
        if (activeTag !== g || activePopup !== popup) return false;
        const pr = popup.getBoundingClientRect();
        const sr = g.getBoundingClientRect();
        const inPopup  = x >= pr.left - 6 && x <= pr.right + 6 &&
                         y >= pr.top - 14 && y <= pr.bottom + 6;
        const inAnchor = x >= sr.left - 6 && x <= sr.right + 6 &&
                         y >= sr.top - 6  && y <= sr.bottom + 14;
        return inPopup || inAnchor;
      };
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        if (closeTimer) clearTimeout(closeTimer);
        clearTimeout(fallbackTimer);
        document.removeEventListener('pointermove', onMove, true);
      };
      const onMove = (evt) => {
        if (resolved) return;
        if (activeTag !== g || activePopup !== popup) { cleanup(); return; }
        if (inEngagedZone(evt.clientX, evt.clientY)) {
          if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        } else if (!closeTimer) {
          closeTimer = setTimeout(() => {
            closeTimer = null;
            if (activeTag === g && activePopup === popup) closePopup();
            cleanup();
          }, HOVER_OUT);
        }
      };
      document.addEventListener('pointermove', onMove, true);
      const fallbackTimer = setTimeout(() => {
        if (resolved) return;
        cleanup();
        if (activeTag === g && activePopup === popup) closePopup();
      }, FALLBACK);
    });
  };

  // Zodiac sign glyphs
  svg.querySelectorAll('.mc-sign-btn').forEach(g => {
    _wireMcPopup(g, () => {
      const si = +g.getAttribute('data-sign');
      const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
      _withInterp(function(D) {
        const d = D._SIGN_DATA[lang][si];
        _showPopup(g, 'sign-pop', _signPopupSvg(si) + d.t, d.b);
      });
    });
  });

  // Chart angles — ASC / DSC / MC / IC (same data as the .cp-btn handler)
  svg.querySelectorAll('.mc-angle-btn').forEach(g => {
    _wireMcPopup(g, () => {
      const key = g.getAttribute('data-cp');
      const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
      _withInterp(function(D) {
        const d = D.cpData[lang][key];
        if (!d) return;
        _showPopup(g, 'planet-pop', '<span class="cp-pop-acr">' + d.acr + '</span>' + d.t, d.b);
      });
    });
  });
}
// Mini chart rendered by hydrateReading() with real data

// ═══ SHOOTING STAR ═══
(function() {
  const canvas = document.getElementById('shootingStar');
  const ctx = canvas.getContext('2d');
  let w, h, particles = [], mouse = { x: -100, y: -100, px: -100, py: -100 };
  let raf = 0, lastActivity = 0;
  function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  document.addEventListener('mousemove', e => {
    mouse.px = mouse.x; mouse.py = mouse.y;
    mouse.x = e.clientX; mouse.y = e.clientY;
    const dx = mouse.x - mouse.px, dy = mouse.y - mouse.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const count = Math.min(Math.floor(dist / 3), 8);
    for (let i = 0; i < count; i++) { const t = i / count; spawn(mouse.px + dx * t, mouse.py + dy * t, dx, dy); }
    kick();
  });
  document.addEventListener('touchmove', e => {
    const touch = e.touches[0];
    mouse.px = mouse.x; mouse.py = mouse.y;
    mouse.x = touch.clientX; mouse.y = touch.clientY;
    const dx = mouse.x - mouse.px, dy = mouse.y - mouse.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const count = Math.min(Math.floor(dist / 4), 6);
    for (let i = 0; i < count; i++) { const t = i / count; spawn(mouse.px + dx * t, mouse.py + dy * t, dx, dy); }
    kick();
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
    // Self-stop when there's nothing to draw and no recent input. The progress
    // bar emits on scroll and the cursor emits on move — both call kick() to
    // restart — so a stopped loop costs nothing (no full-screen clearRect at
    // rest), which is the win on the long full reading.
    if (particles.length > 0 || performance.now() - lastActivity < 400) {
      raf = requestAnimationFrame(animate);
    } else {
      raf = 0;
    }
  }
  function kick() { lastActivity = performance.now(); if (!raf) raf = requestAnimationFrame(animate); }
  // Scroll drives emitFromBar() (sparks off the progress-bar tip), so wake the
  // loop on scroll too — not just pointer movement.
  window.addEventListener('scroll', kick, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else kick();
  });
})();


// ═══ AUTH FUNCTIONS ═══
let authStep = 1;
let selectedGender = '';

// Visual step mapping: each auth page lights up its dot in the progress bar.
// page-forgot is a detour off the login step so we keep dot 1 active there.
const AUTH_PAGE_STEP = { 'page-login': 1, 'page-forgot': 1, 'page-signup': 2, 'page-birth': 3 };

// Forward step-dot clicks must run the current page's form validation when
// the destination is a step that actually depends on it. Signup is an
// alternate entry path (parallel to login), so navigating *to* signup never
// requires login credentials. Only "→ birth" (which assumes the user is
// authenticated) gates on the current page's fields.
function canAdvanceFromAuthPage(fromId, toId) {
  if (toId === 'page-signup') return true;
  if (fromId === 'page-login' && toId === 'page-birth') {
    const email = document.getElementById('login-email').value.trim();
    const pw = document.getElementById('login-pw').value;
    if (!email) { showAuthError('login-error', 'შეიყვანე ელ-ფოსტა'); return false; }
    if (!pw) { showAuthError('login-error', 'შეიყვანე პაროლი'); return false; }
    return true;
  }
  if (fromId === 'page-signup' && toId === 'page-birth') {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const pw = document.getElementById('signup-pw').value;
    if (!name) { showAuthError('signup-error', 'შეიყვანე სახელი'); return false; }
    if (!email) { showAuthError('signup-error', 'შეიყვანე ელ-ფოსტა'); return false; }
    if (pw.length < 8) { showAuthError('signup-error', 'პაროლი მინ. 8 სიმბოლო'); return false; }
    return true;
  }
  return true;
}

// Called from step-dot clicks. Goes through validation when moving forward.
function navigateAuthStep(targetId) {
  const currentPage = document.querySelector('.auth-page.active');
  if (!currentPage) { showAuthPage(targetId); return; }
  const currentId = currentPage.id;
  const currentStep = AUTH_PAGE_STEP[currentId] || 1;
  const targetStep = AUTH_PAGE_STEP[targetId] || 1;
  if (targetStep > currentStep && !canAdvanceFromAuthPage(currentId, targetId)) return;
  showAuthPage(targetId);
}

function showAuthPage(id) {
  document.querySelectorAll('.auth-page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.msg').forEach(m => { m.classList.remove('show'); m.textContent = ''; });
  if (id === 'page-forgot') { document.getElementById('forgot-form').style.display = 'block'; document.getElementById('forgot-success').style.display = 'none'; }
  if (id === 'page-reset') { var rf = document.getElementById('reset-form'); var rs = document.getElementById('reset-success'); if (rf) rf.style.display = 'block'; if (rs) rs.style.display = 'none'; }
  // The recovery page is reached directly from an email link, not via the
  // signup wizard, so the 1-2-3 step indicator is meaningless there.
  var stepsBar = document.getElementById('stepsBar');
  if (stepsBar) stepsBar.style.display = (id === 'page-reset') ? 'none' : '';
  const visualStep = AUTH_PAGE_STEP[id];
  if (visualStep) renderAuthSteps(visualStep);
}

function goAuthStep(n) {
  authStep = n;
  if (n === 1) showAuthPage('page-login');
  else if (n === 2) showAuthPage('page-birth');
  else if (n === 3) startLoading();
}

function renderAuthSteps(step) {
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById('sd' + i);
    const line = document.getElementById('sl' + i);
    if (dot) { dot.className = 'step-dot' + (i < step ? ' done' : '') + (i === step ? ' active' : ''); }
    if (line) { line.className = 'step-line' + (step > i ? ' done' : ''); }
  }
}

function updateAuthStepUI() { renderAuthSteps(authStep); }

function togglePw(btn) {
  const input = btn.previousElementSibling;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
  const a = TR.auth[lang];
  btn.textContent = show ? (a.hidePw || 'Hide') : (a.showPw || 'Show');
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
  const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
  const months = authMonthsForLang(lang);
  const d = document.getElementById('birth-day'); if (!d) return;
  for (let i = 1; i <= 31; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i; d.appendChild(o); }
  const m = document.getElementById('birth-month');
  months.forEach((n, i) => { const o = document.createElement('option'); o.value = i + 1; o.textContent = n; m.appendChild(o); });
  const y = document.getElementById('birth-year');
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= 1930; i--) { const o = document.createElement('option'); o.value = i; o.textContent = i; y.appendChild(o); }
  const h = document.getElementById('birth-hour');
  for (let i = 0; i < 24; i++) { const o = document.createElement('option'); o.value = i; o.textContent = String(i).padStart(2, '0'); h.appendChild(o); }
  const mn = document.getElementById('birth-min');
  for (let i = 0; i < 60; i++) { const o = document.createElement('option'); o.value = i; o.textContent = String(i).padStart(2, '0'); mn.appendChild(o); }
})();

// Enter key → click the step's primary submit button
(function() {
  function onEnter(ids, btnSelector) {
    ids.forEach(function(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const btn = document.querySelector(btnSelector);
        if (btn) btn.click();
      });
    });
  }
  onEnter(['login-email','login-pw'], '#page-login .auth-btn');
  onEnter(['signup-name','signup-email','signup-pw'], '#page-signup .auth-btn');
  onEnter(['birth-place'], '#page-birth .auth-btn:not(.auth-btn-ghost)');
})();

// Place suggestions — Nominatim (OpenStreetMap) global city search
(function() {
  const placeInput = document.getElementById('birth-place');
  const sugBox = document.getElementById('placeSuggestions');
  if (!placeInput || !sugBox) return;

  let _debounceTimer = null;
  let _currentQuery = '';

  // Georgian prefix seed — Nominatim doesn't prefix-match Georgian script
  const GEO_CITIES = [
    { ka:'თბილისი', en:'Tbilisi', cc:'ge', lat:41.6941, lng:44.8337 },
    { ka:'ბათუმი', en:'Batumi', cc:'ge', lat:41.6417, lng:41.6356 },
    { ka:'ქუთაისი', en:'Kutaisi', cc:'ge', lat:42.2679, lng:42.6878 },
    { ka:'რუსთავი', en:'Rustavi', cc:'ge', lat:41.5500, lng:44.9997 },
    { ka:'გორი', en:'Gori', cc:'ge', lat:41.9818, lng:44.1118 },
    { ka:'ზუგდიდი', en:'Zugdidi', cc:'ge', lat:42.5087, lng:41.8708 },
    { ka:'ფოთი', en:'Poti', cc:'ge', lat:42.1500, lng:41.6667 },
    { ka:'ხაშური', en:'Khashuri', cc:'ge', lat:41.9951, lng:43.5977 },
    { ka:'სამტრედია', en:'Samtredia', cc:'ge', lat:42.1500, lng:42.3500 },
    { ka:'სენაკი', en:'Senaki', cc:'ge', lat:42.2667, lng:42.0667 },
    { ka:'ზესტაფონი', en:'Zestaponi', cc:'ge', lat:42.1081, lng:43.0481 },
    { ka:'მარნეული', en:'Marneuli', cc:'ge', lat:41.4667, lng:44.8000 },
    { ka:'თელავი', en:'Telavi', cc:'ge', lat:41.9183, lng:45.4731 },
    { ka:'ახალციხე', en:'Akhaltsikhe', cc:'ge', lat:41.6411, lng:42.9839 },
    { ka:'ქობულეთი', en:'Kobuleti', cc:'ge', lat:41.8228, lng:41.7881 },
    { ka:'ხონი', en:'Khoni', cc:'ge', lat:42.3167, lng:42.9500 },
    { ka:'ბორჯომი', en:'Borjomi', cc:'ge', lat:41.8364, lng:43.3906 },
    { ka:'ახალქალაქი', en:'Akhalkalaki', cc:'ge', lat:41.4000, lng:43.4833 },
    { ka:'ამბროლაური', en:'Ambrolauri', cc:'ge', lat:42.5167, lng:43.1500 },
    { ka:'ოზურგეთი', en:'Ozurgeti', cc:'ge', lat:41.9378, lng:42.0064 },
    { ka:'სიღნაღი', en:'Sighnaghi', cc:'ge', lat:41.6167, lng:45.9167 },
    { ka:'მცხეთა', en:'Mtskheta', cc:'ge', lat:41.8461, lng:44.7200 },
    { ka:'ლანჩხუთი', en:'Lanchkhuti', cc:'ge', lat:41.9833, lng:42.0667 },
    { ka:'ვანი', en:'Vani', cc:'ge', lat:42.1000, lng:42.5000 },
    { ka:'ბოლნისი', en:'Bolnisi', cc:'ge', lat:41.4500, lng:44.5167 },
    { ka:'დმანისი', en:'Dmanisi', cc:'ge', lat:41.3333, lng:44.2000 },
    { ka:'კასპი', en:'Kaspi', cc:'ge', lat:41.9167, lng:44.4167 },
    { ka:'მესტია', en:'Mestia', cc:'ge', lat:43.0456, lng:42.7256 },
    { ka:'ანაკლია', en:'Anaklia', cc:'ge', lat:42.3833, lng:41.5667 },
    // Major world cities
    { ka:'მოსკოვი', en:'Moscow', cc:'ru', lat:55.7558, lng:37.6176 },
    { ka:'სანქტ-პეტერბურგი', en:'Saint Petersburg', cc:'ru', lat:59.9343, lng:30.3351 },
    { ka:'კიევი', en:'Kyiv', cc:'ua', lat:50.4501, lng:30.5234 },
    { ka:'მინსკი', en:'Minsk', cc:'by', lat:53.9045, lng:27.5615 },
    { ka:'ერევანი', en:'Yerevan', cc:'am', lat:40.1872, lng:44.5152 },
    { ka:'ბაქო', en:'Baku', cc:'az', lat:40.4093, lng:49.8671 },
    { ka:'სტამბოლი', en:'Istanbul', cc:'tr', lat:41.0082, lng:28.9784 },
    { ka:'ანკარა', en:'Ankara', cc:'tr', lat:39.9334, lng:32.8597 },
    { ka:'ბერლინი', en:'Berlin', cc:'de', lat:52.5200, lng:13.4050 },
    { ka:'მიუნხენი', en:'Munich', cc:'de', lat:48.1351, lng:11.5820 },
    { ka:'ჰამბურგი', en:'Hamburg', cc:'de', lat:53.5753, lng:10.0153 },
    { ka:'პარიზი', en:'Paris', cc:'fr', lat:48.8566, lng:2.3522 },
    { ka:'ლიონი', en:'Lyon', cc:'fr', lat:45.7640, lng:4.8357 },
    { ka:'ლონდონი', en:'London', cc:'gb', lat:51.5074, lng:-0.1278 },
    { ka:'მანჩესტერი', en:'Manchester', cc:'gb', lat:53.4808, lng:-2.2426 },
    { ka:'რომი', en:'Rome', cc:'it', lat:41.9028, lng:12.4964 },
    { ka:'მილანი', en:'Milan', cc:'it', lat:45.4642, lng:9.1900 },
    { ka:'მადრიდი', en:'Madrid', cc:'es', lat:40.4168, lng:-3.7038 },
    { ka:'ბარსელონა', en:'Barcelona', cc:'es', lat:41.3851, lng:2.1734 },
    { ka:'ამსტერდამი', en:'Amsterdam', cc:'nl', lat:52.3676, lng:4.9041 },
    { ka:'ბრიუსელი', en:'Brussels', cc:'be', lat:50.8503, lng:4.3517 },
    { ka:'ვენა', en:'Vienna', cc:'at', lat:48.2082, lng:16.3738 },
    { ka:'ვარშავა', en:'Warsaw', cc:'pl', lat:52.2297, lng:21.0122 },
    { ka:'პრაღა', en:'Prague', cc:'cz', lat:50.0755, lng:14.4378 },
    { ka:'ბუდაპეშტი', en:'Budapest', cc:'hu', lat:47.4979, lng:19.0402 },
    { ka:'ბუქარესტი', en:'Bucharest', cc:'ro', lat:44.4268, lng:26.1025 },
    { ka:'სოფია', en:'Sofia', cc:'bg', lat:42.6977, lng:23.3219 },
    { ka:'ათენი', en:'Athens', cc:'gr', lat:37.9838, lng:23.7275 },
    { ka:'ლისაბონი', en:'Lisbon', cc:'pt', lat:38.7169, lng:-9.1395 },
    { ka:'სტოკჰოლმი', en:'Stockholm', cc:'se', lat:59.3293, lng:18.0686 },
    { ka:'კოპენჰაგენი', en:'Copenhagen', cc:'dk', lat:55.6761, lng:12.5683 },
    { ka:'ოსლო', en:'Oslo', cc:'no', lat:59.9139, lng:10.7522 },
    { ka:'ჰელსინკი', en:'Helsinki', cc:'fi', lat:60.1699, lng:24.9384 },
    { ka:'ციურიხი', en:'Zurich', cc:'ch', lat:47.3769, lng:8.5417 },
    { ka:'ნიუ-იორკი', en:'New York', cc:'us', lat:40.7128, lng:-74.0060 },
    { ka:'ლოს-ანჯელესი', en:'Los Angeles', cc:'us', lat:34.0522, lng:-118.2437 },
    { ka:'შიკაგო', en:'Chicago', cc:'us', lat:41.8781, lng:-87.6298 },
    { ka:'მაიამი', en:'Miami', cc:'us', lat:25.7617, lng:-80.1918 },
    { ka:'ვაშინგტონი', en:'Washington', cc:'us', lat:38.9072, lng:-77.0369 },
    { ka:'ტორონტო', en:'Toronto', cc:'ca', lat:43.6532, lng:-79.3832 },
    { ka:'მონრეალი', en:'Montreal', cc:'ca', lat:45.5017, lng:-73.5673 },
    { ka:'დუბაი', en:'Dubai', cc:'ae', lat:25.2048, lng:55.2708 },
    { ka:'აბუ-დაბი', en:'Abu Dhabi', cc:'ae', lat:24.4539, lng:54.3773 },
    { ka:'თელ-ავივი', en:'Tel Aviv', cc:'il', lat:32.0853, lng:34.7818 },
    { ka:'იერუსალიმი', en:'Jerusalem', cc:'il', lat:31.7683, lng:35.2137 },
    { ka:'ბეირუთი', en:'Beirut', cc:'lb', lat:33.8938, lng:35.5018 },
    { ka:'ამანი', en:'Amman', cc:'jo', lat:31.9539, lng:35.9106 },
    { ka:'კაირო', en:'Cairo', cc:'eg', lat:30.0444, lng:31.2357 },
    { ka:'ნაირობი', en:'Nairobi', cc:'ke', lat:-1.2921, lng:36.8219 },
    { ka:'ლაგოსი', en:'Lagos', cc:'ng', lat:6.5244, lng:3.3792 },
    { ka:'იოჰანესბურგი', en:'Johannesburg', cc:'za', lat:-26.2041, lng:28.0473 },
    { ka:'მუმბაი', en:'Mumbai', cc:'in', lat:19.0760, lng:72.8777 },
    { ka:'დელი', en:'Delhi', cc:'in', lat:28.7041, lng:77.1025 },
    { ka:'ბანგალორი', en:'Bangalore', cc:'in', lat:12.9716, lng:77.5946 },
    { ka:'პეკინი', en:'Beijing', cc:'cn', lat:39.9042, lng:116.4074 },
    { ka:'შანხაი', en:'Shanghai', cc:'cn', lat:31.2304, lng:121.4737 },
    { ka:'ტოკიო', en:'Tokyo', cc:'jp', lat:35.6762, lng:139.6503 },
    { ka:'სეული', en:'Seoul', cc:'kr', lat:37.5665, lng:126.9780 },
    { ka:'სინგაპური', en:'Singapore', cc:'sg', lat:1.3521, lng:103.8198 },
    { ka:'სიდნეი', en:'Sydney', cc:'au', lat:-33.8688, lng:151.2093 },
    { ka:'მელბურნი', en:'Melbourne', cc:'au', lat:-37.8136, lng:144.9631 },
    { ka:'სან-პაულო', en:'São Paulo', cc:'br', lat:-23.5505, lng:-46.6333 },
    { ka:'ბუენოს-აირესი', en:'Buenos Aires', cc:'ar', lat:-34.6037, lng:-58.3816 },
    { ka:'მეხიკო', en:'Mexico City', cc:'mx', lat:19.4326, lng:-99.1332 },
    { ka:'ალმათი', en:'Almaty', cc:'kz', lat:43.2220, lng:76.8512 },
    { ka:'ტაშკენტი', en:'Tashkent', cc:'uz', lat:41.2995, lng:69.2401 },
    // Americas
    { ka:'ოტავა', en:'Ottawa', cc:'ca', lat:45.4215, lng:-75.6972 },
    { ka:'ვანკუვერი', en:'Vancouver', cc:'ca', lat:49.2827, lng:-123.1207 },
    { ka:'კალგარი', en:'Calgary', cc:'ca', lat:51.0447, lng:-114.0719 },
    { ka:'მანაგუა', en:'Managua', cc:'ni', lat:12.1364, lng:-86.2514 },
    { ka:'გუატემალა', en:'Guatemala City', cc:'gt', lat:14.6349, lng:-90.5069 },
    { ka:'სან-სალვადორი', en:'San Salvador', cc:'sv', lat:13.6929, lng:-89.2182 },
    { ka:'ტეგუსიგალპა', en:'Tegucigalpa', cc:'hn', lat:14.0723, lng:-87.2068 },
    { ka:'სან-ხოსე', en:'San José', cc:'cr', lat:9.9281, lng:-84.0907 },
    { ka:'პანამა', en:'Panama City', cc:'pa', lat:8.9936, lng:-79.5197 },
    { ka:'ჰავანა', en:'Havana', cc:'cu', lat:23.1136, lng:-82.3666 },
    { ka:'სანტო-დომინგო', en:'Santo Domingo', cc:'do', lat:18.4861, lng:-69.9312 },
    { ka:'პორტ-ო-პრენსი', en:'Port-au-Prince', cc:'ht', lat:18.5432, lng:-72.3395 },
    { ka:'კინგსტონი', en:'Kingston', cc:'jm', lat:17.9970, lng:-76.7936 },
    { ka:'ბოგოტა', en:'Bogotá', cc:'co', lat:4.7110, lng:-74.0721 },
    { ka:'კარაკასი', en:'Caracas', cc:'ve', lat:10.4806, lng:-66.9036 },
    { ka:'კიტო', en:'Quito', cc:'ec', lat:-0.1807, lng:-78.4678 },
    { ka:'ლიმა', en:'Lima', cc:'pe', lat:-12.0464, lng:-77.0428 },
    { ka:'ლა-პასი', en:'La Paz', cc:'bo', lat:-16.5000, lng:-68.1500 },
    { ka:'სანტიაგო', en:'Santiago', cc:'cl', lat:-33.4489, lng:-70.6693 },
    { ka:'მონტევიდეო', en:'Montevideo', cc:'uy', lat:-34.9011, lng:-56.1645 },
    { ka:'ასუნსიონი', en:'Asunción', cc:'py', lat:-25.2867, lng:-57.6470 },
    { ka:'ბრაზილია', en:'Brasília', cc:'br', lat:-15.7975, lng:-47.8919 },
    { ka:'რიო-დე-ჟანეირო', en:'Rio de Janeiro', cc:'br', lat:-22.9068, lng:-43.1729 },
    // Europe extras
    { ka:'დუბლინი', en:'Dublin', cc:'ie', lat:53.3498, lng:-6.2603 },
    { ka:'რეიკიავიკი', en:'Reykjavik', cc:'is', lat:64.1466, lng:-21.9426 },
    { ka:'ვილნიუსი', en:'Vilnius', cc:'lt', lat:54.6872, lng:25.2797 },
    { ka:'რიგა', en:'Riga', cc:'lv', lat:56.9496, lng:24.1052 },
    { ka:'ტალინი', en:'Tallinn', cc:'ee', lat:59.4370, lng:24.7536 },
    { ka:'ლიუბლიანა', en:'Ljubljana', cc:'si', lat:46.0569, lng:14.5058 },
    { ka:'ბრატისლავა', en:'Bratislava', cc:'sk', lat:48.1486, lng:17.1077 },
    { ka:'ზაგრები', en:'Zagreb', cc:'hr', lat:45.8150, lng:15.9819 },
    { ka:'სარაევო', en:'Sarajevo', cc:'ba', lat:43.8476, lng:18.3564 },
    { ka:'ბელგრადი', en:'Belgrade', cc:'rs', lat:44.7866, lng:20.4489 },
    { ka:'პოდგორიცა', en:'Podgorica', cc:'me', lat:42.4304, lng:19.2594 },
    { ka:'ტირანა', en:'Tirana', cc:'al', lat:41.3275, lng:19.8187 },
    { ka:'სკოპიე', en:'Skopje', cc:'mk', lat:41.9981, lng:21.4254 },
    { ka:'ნიქოზია', en:'Nicosia', cc:'cy', lat:35.1856, lng:33.3823 },
    { ka:'ბერნი', en:'Bern', cc:'ch', lat:46.9480, lng:7.4474 },
    { ka:'ლუქსემბურგი', en:'Luxembourg City', cc:'lu', lat:49.6116, lng:6.1319 },
    { ka:'ვადუცი', en:'Vaduz', cc:'li', lat:47.1410, lng:9.5215 },
    // Middle East & Asia extras
    { ka:'თეირანი', en:'Tehran', cc:'ir', lat:35.6892, lng:51.3890 },
    { ka:'ბაღდადი', en:'Baghdad', cc:'iq', lat:33.3152, lng:44.3661 },
    { ka:'დამასკი', en:'Damascus', cc:'sy', lat:33.5138, lng:36.2765 },
    { ka:'რიადი', en:'Riyadh', cc:'sa', lat:24.7136, lng:46.6753 },
    { ka:'დოჰა', en:'Doha', cc:'qa', lat:25.2854, lng:51.5310 },
    { ka:'მასკატი', en:'Muscat', cc:'om', lat:23.5880, lng:58.3829 },
    { ka:'ქუვეითი', en:'Kuwait City', cc:'kw', lat:29.3759, lng:47.9774 },
    { ka:'ისლამაბადი', en:'Islamabad', cc:'pk', lat:33.7294, lng:73.0931 },
    { ka:'კარაჩი', en:'Karachi', cc:'pk', lat:24.8608, lng:67.0104 },
    { ka:'ლაჰორი', en:'Lahore', cc:'pk', lat:31.5497, lng:74.3436 },
    { ka:'ქაბული', en:'Kabul', cc:'af', lat:34.5553, lng:69.2075 },
    { ka:'კატმანდუ', en:'Kathmandu', cc:'np', lat:27.7172, lng:85.3240 },
    { ka:'კოლომბო', en:'Colombo', cc:'lk', lat:6.9271, lng:79.8612 },
    { ka:'დაქა', en:'Dhaka', cc:'bd', lat:23.8103, lng:90.4125 },
    { ka:'ბანგკოკი', en:'Bangkok', cc:'th', lat:13.7563, lng:100.5018 },
    { ka:'ჯაკარტა', en:'Jakarta', cc:'id', lat:-6.2088, lng:106.8456 },
    { ka:'კუალა-ლუმპური', en:'Kuala Lumpur', cc:'my', lat:3.1390, lng:101.6869 },
    { ka:'მანილა', en:'Manila', cc:'ph', lat:14.5995, lng:120.9842 },
    { ka:'ჰანოი', en:'Hanoi', cc:'vn', lat:21.0285, lng:105.8542 },
    { ka:'ჰო-ში-მინი', en:'Ho Chi Minh City', cc:'vn', lat:10.8231, lng:106.6297 },
    { ka:'პნომ-პენი', en:'Phnom Penh', cc:'kh', lat:11.5564, lng:104.9282 },
    { ka:'ულან-ბატორი', en:'Ulaanbaatar', cc:'mn', lat:47.8864, lng:106.9057 },
    { ka:'ტაიბეი', en:'Taipei', cc:'tw', lat:25.0330, lng:121.5654 },
    { ka:'ჰონგ-კონგი', en:'Hong Kong', cc:'hk', lat:22.3193, lng:114.1694 },
    { ka:'ოსაკა', en:'Osaka', cc:'jp', lat:34.6937, lng:135.5023 },
    // Africa extras
    { ka:'ადის-აბება', en:'Addis Ababa', cc:'et', lat:9.0320, lng:38.7469 },
    { ka:'აკრა', en:'Accra', cc:'gh', lat:5.6037, lng:-0.1870 },
    { ka:'დაკარი', en:'Dakar', cc:'sn', lat:14.7167, lng:-17.4677 },
    { ka:'აბუჯა', en:'Abuja', cc:'ng', lat:9.0579, lng:7.4951 },
    { ka:'კინშასა', en:'Kinshasa', cc:'cd', lat:-4.3217, lng:15.3222 },
    { ka:'ხარტუმი', en:'Khartoum', cc:'sd', lat:15.5007, lng:32.5599 },
    { ka:'ლუანდა', en:'Luanda', cc:'ao', lat:-8.8368, lng:13.2343 },
    { ka:'რაბათი', en:'Rabat', cc:'ma', lat:34.0209, lng:-6.8416 },
    { ka:'კასაბლანკა', en:'Casablanca', cc:'ma', lat:33.5731, lng:-7.5898 },
    { ka:'თუნისი', en:'Tunis', cc:'tn', lat:36.8190, lng:10.1658 },
    { ka:'ტრიპოლი', en:'Tripoli', cc:'ly', lat:32.9020, lng:13.1800 },
    { ka:'კამპალა', en:'Kampala', cc:'ug', lat:0.3476, lng:32.5825 },
    { ka:'კიგალი', en:'Kigali', cc:'rw', lat:-1.9441, lng:30.0619 },
    { ka:'ჰარარე', en:'Harare', cc:'zw', lat:-17.8292, lng:31.0522 },
    { ka:'ლუსაკა', en:'Lusaka', cc:'zm', lat:-15.3875, lng:28.3228 },
    { ka:'მაპუტო', en:'Maputo', cc:'mz', lat:-25.9692, lng:32.5732 },
    { ka:'კეიპტაუნი', en:'Cape Town', cc:'za', lat:-33.9249, lng:18.4241 },
    { ka:'დარ-ეს-სალამი', en:'Dar es Salaam', cc:'tz', lat:-6.7924, lng:39.2083 },
    // Oceania
    { ka:'კანბერა', en:'Canberra', cc:'au', lat:-35.2809, lng:149.1300 },
    { ka:'ბრიზბენი', en:'Brisbane', cc:'au', lat:-27.4698, lng:153.0251 },
    { ka:'ველინგტონი', en:'Wellington', cc:'nz', lat:-41.2865, lng:174.7762 },
    { ka:'ოკლენდი', en:'Auckland', cc:'nz', lat:-36.8485, lng:174.7633 },
  ];

  const KA_COUNTRIES = {
    ge:'საქართველო', ru:'რუსეთი', us:'აშშ', gb:'გაერთიანებული სამეფო', de:'გერმანია',
    fr:'საფრანგეთი', tr:'თურქეთი', ua:'უკრაინა', am:'სომხეთი', az:'აზერბაიჯანი',
    il:'ისრაელი', it:'იტალია', es:'ესპანეთი', pl:'პოლონეთი', nl:'ნიდერლანდები',
    at:'ავსტრია', cz:'ჩეხეთი', se:'შვედეთი', pt:'პორტუგალია', gr:'საბერძნეთი',
    ca:'კანადა', au:'ავსტრალია', jp:'იაპონია', cn:'ჩინეთი', in:'ინდოეთი',
    ae:'არაბეთის გაერთიანებული საამიროები', br:'ბრაზილია', mx:'მექსიკა',
    ar:'არგენტინა', za:'სამხრეთ აფრიკა', eg:'ეგვიპტე', ng:'ნიგერია',
    ke:'კენია', et:'ეთიოპია', gh:'განა', bf:'ბურკინა-ფასო', bj:'ბენინი',
    ro:'რუმინეთი', hu:'უნგრეთი', bg:'ბულგარეთი', rs:'სერბია', hr:'ხორვატია',
    sk:'სლოვაკეთი', si:'სლოვენია', fi:'ფინეთი', no:'ნორვეგია', dk:'დანია',
    be:'ბელგია', ch:'შვეიცარია', by:'ბელარუსი', kz:'ყაზახეთი', uz:'უზბეკეთი',
    kg:'ყირგიზეთი', tj:'ტაჯიკეთი', tm:'თურქმენეთი',
    lb:'ლიბანი', jo:'იორდანია', kr:'სამხრეთ კორეა', sg:'სინგაპური',
    ni:'ნიკარაგუა', gt:'გუატემალა', sv:'სალვადორი', hn:'ჰონდურასი',
    cr:'კოსტა-რიკა', pa:'პანამა', cu:'კუბა', do:'დომინიკის რესპუბლიკა',
    ht:'ჰაიტი', jm:'იამაიკა', co:'კოლუმბია', ve:'ვენესუელა',
    ec:'ეკვადორი', pe:'პერუ', bo:'ბოლივია', cl:'ჩილე', uy:'ურუგვაი',
    py:'პარაგვაი', ie:'ირლანდია', is:'ისლანდია', lt:'ლიტვა', lv:'ლატვია',
    ee:'ესტონეთი', ba:'ბოსნია და ჰერცეგოვინა', me:'მონტენეგრო', al:'ალბანეთი',
    mk:'ჩრდილოეთ მაკედონია', cy:'კვიპროსი', lu:'ლუქსემბურგი', li:'ლიხტენშტაინი',
    ir:'ირანი', iq:'ირაქი', sy:'სირია', sa:'საუდის არაბეთი', qa:'კატარი',
    om:'ომანი', kw:'ქუვეითი', pk:'პაკისტანი', af:'ავღანეთი', np:'ნეპალი',
    lk:'შრი-ლანკა', bd:'ბანგლადეში', th:'თაილანდი', id:'ინდონეზია',
    my:'მალაიზია', ph:'ფილიპინები', vn:'ვიეტნამი', kh:'კამბოჯა',
    mn:'მონღოლეთი', tw:'ტაივანი', hk:'ჰონგ კონგი',
    sn:'სენეგალი', cd:'კონგოს დემ. რესპ.', sd:'სუდანი',
    ao:'ანგოლა', ma:'მაროკო', tn:'ტუნისი', ly:'ლიბია', ug:'უგანდა',
    rw:'რუანდა', zw:'ზიმბაბვე', zm:'ზამბია', mz:'მოზამბიკი', tz:'ტანზანია',
    nz:'ახალი ზელანდია',
  };
  const EN_COUNTRIES = {
    ge:'Georgia', ru:'Russia', us:'USA', gb:'United Kingdom', de:'Germany',
    fr:'France', tr:'Turkey', ua:'Ukraine', am:'Armenia', az:'Azerbaijan',
    il:'Israel', it:'Italy', es:'Spain', pl:'Poland', nl:'Netherlands',
    at:'Austria', cz:'Czech Republic', se:'Sweden', pt:'Portugal', gr:'Greece',
    ca:'Canada', au:'Australia', jp:'Japan', cn:'China', in:'India',
    ae:'UAE', br:'Brazil', mx:'Mexico', ar:'Argentina', za:'South Africa',
    eg:'Egypt', ng:'Nigeria', ke:'Kenya', ro:'Romania', hu:'Hungary',
    bg:'Bulgaria', rs:'Serbia', hr:'Croatia', fi:'Finland', no:'Norway',
    dk:'Denmark', be:'Belgium', ch:'Switzerland', by:'Belarus', kz:'Kazakhstan',
    uz:'Uzbekistan', lb:'Lebanon', jo:'Jordan', kr:'South Korea', sg:'Singapore',
    ni:'Nicaragua', gt:'Guatemala', sv:'El Salvador', hn:'Honduras',
    cr:'Costa Rica', pa:'Panama', cu:'Cuba', do:'Dominican Republic',
    ht:'Haiti', jm:'Jamaica', co:'Colombia', ve:'Venezuela',
    ec:'Ecuador', pe:'Peru', bo:'Bolivia', cl:'Chile', uy:'Uruguay',
    py:'Paraguay', ie:'Ireland', is:'Iceland', lt:'Lithuania', lv:'Latvia',
    ee:'Estonia', ba:'Bosnia & Herzegovina', me:'Montenegro', al:'Albania',
    mk:'North Macedonia', cy:'Cyprus', lu:'Luxembourg', li:'Liechtenstein',
    ir:'Iran', iq:'Iraq', sy:'Syria', sa:'Saudi Arabia', qa:'Qatar',
    om:'Oman', kw:'Kuwait', pk:'Pakistan', af:'Afghanistan', np:'Nepal',
    lk:'Sri Lanka', bd:'Bangladesh', th:'Thailand', id:'Indonesia',
    my:'Malaysia', ph:'Philippines', vn:'Vietnam', kh:'Cambodia',
    mn:'Mongolia', tw:'Taiwan', hk:'Hong Kong',
    et:'Ethiopia', sn:'Senegal', cd:'DR Congo', sd:'Sudan',
    ao:'Angola', ma:'Morocco', tn:'Tunisia', ly:'Libya', ug:'Uganda',
    rw:'Rwanda', zw:'Zimbabwe', zm:'Zambia', mz:'Mozambique', tz:'Tanzania',
    nz:'New Zealand',
  };

  function getGeoSeed(q) {
    const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
    const ql = q.toLowerCase();
    return GEO_CITIES
      .filter(function(c) { return c.ka.startsWith(q) || c.en.toLowerCase().startsWith(ql); })
      .map(function(c) {
        const label = lang === 'ka' ? c.ka : c.en;
        const country = lang === 'ka' ? (KA_COUNTRIES[c.cc] || c.cc) : (EN_COUNTRIES[c.cc] || c.cc);
        return { label: label, country: country, en: c.en, lat: c.lat, lng: c.lng, cc: c.cc };
      });
  }

  function renderSuggestions(results, seeds) {
    sugBox.innerHTML = '';
    // Only keep place/boundary class results (filter out airports, landmarks, buildings, etc.)
    results = results.filter(function(r) { return r.class === 'place' || r.class === 'boundary'; });
    // Filter out subdivisions (arrondissements, suburbs, quarters, neighbourhoods)
    const SUBDIVISION_TYPES = new Set(['suburb','quarter','neighbourhood','city_district','borough','district']);
    results = results.filter(function(r) { return !SUBDIVISION_TYPES.has(r.type) && !SUBDIVISION_TYPES.has(r.addresstype); });
    // Filter out obscure hamlets/villages by importance score
    results = results.filter(function(r) { return parseFloat(r.importance || 0) > 0.25; });
    // Sort by importance descending so the main city appears first
    results.sort(function(a, b) { return parseFloat(b.importance || 0) - parseFloat(a.importance || 0); });
    // Remove Nominatim results already covered by seed entries
    var seedLabels = new Set((seeds || []).map(function(s) { return s.en.toLowerCase(); }));
    results = results.filter(function(r) {
      var en = (r.namedetails && r.namedetails['name:en']) || r.name || '';
      return !seedLabels.has(en.toLowerCase());
    });
    // Deduplicate by rounded coords OR same city+country label
    const seenCoords = new Set();
    const seenLabels = new Set();
    results = results.filter(function(r) {
      const coordKey = parseFloat(r.lat).toFixed(1) + ',' + parseFloat(r.lon).toFixed(1);
      const addr = r.address || {};
      const names = r.namedetails || {};
      const city = names['name:en'] || r.name || '';
      const country = addr.country_code || '';
      const labelKey = city.toLowerCase() + '|' + country;
      if (seenCoords.has(coordKey) || seenLabels.has(labelKey)) return false;
      seenCoords.add(coordKey);
      seenLabels.add(labelKey);
      return true;
    });
    // Drop results where city name === country name (country-level entities slipping through)
    results = results.filter(function(r) {
      const addr = r.address || {};
      const names = r.namedetails || {};
      const cityEn = names['name:en'] || r.name || '';
      const countryEn = addr.country || '';
      return cityEn.toLowerCase() !== countryEn.toLowerCase();
    });
    if (!results.length && !(seeds && seeds.length)) { sugBox.classList.remove('open'); return; }
    const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
    // Render seed entries first
    if (seeds && seeds.length) {
      seeds.forEach(function(s) {
        const d = document.createElement('div');
        d.className = 'place-item';
        const label = s.label + ', ' + s.country;
        d.innerHTML = label + '<small>' + s.lat.toFixed(4) + '°, ' + s.lng.toFixed(4) + '°</small>';
        d.onclick = function() {
          placeInput.value = label;
          placeInput.dataset.lat = String(s.lat);
          placeInput.dataset.lng = String(s.lng);
          placeInput.dataset.tz = s.cc === 'ge' ? 'Asia/Tbilisi' : '';
          sugBox.classList.remove('open');
        };
        sugBox.appendChild(d);
      });
    }
    results.forEach(function(r) {
      const d = document.createElement('div');
      d.className = 'place-item';
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      const addr = r.address || {};
      const names = r.namedetails || {};
      const cityEn = names['name:en'] || addr.city || addr.town || addr.village || addr.municipality || addr.county || r.name || (r.display_name || '').split(',')[0];
      const cityKa = names['name:ka'] || r.name || addr.city || addr.town || addr.village || addr.municipality || addr.county || cityEn;
      const cc = (addr.country_code || '').toLowerCase();
      const countryEn = addr.country || '';
      const countryKa = KA_COUNTRIES[cc] || countryEn;
      const cityLabel = lang === 'ka' ? cityKa : cityEn;
      const countryLabel = lang === 'ka' ? countryKa : countryEn;
      const label = cityLabel + (countryLabel ? ', ' + countryLabel : '');
      d.innerHTML = label + '<small>' + lat.toFixed(4) + '°, ' + lng.toFixed(4) + '°</small>';
      d.onclick = function() {
        placeInput.value = label;
        placeInput.dataset.lat = String(lat);
        placeInput.dataset.lng = String(lng);
        placeInput.dataset.tz = '';
        sugBox.classList.remove('open');
        fetch('https://timeapi.io/api/timezone/coordinate?latitude=' + lat + '&longitude=' + lng)
          .then(function(res) { return res.json(); })
          .then(function(tz) { if (tz && tz.timeZone) placeInput.dataset.tz = tz.timeZone; })
          .catch(function() {});
      };
      sugBox.appendChild(d);
    });
    sugBox.classList.add('open');
  }

  function renderSeedResults(seeds) {
    sugBox.innerHTML = '';
    if (!seeds.length) { sugBox.classList.remove('open'); return; }
    seeds.forEach(function(s) {
      const d = document.createElement('div');
      d.className = 'place-item';
      const label = s.label + ', ' + s.country;
      d.innerHTML = label + '<small>' + s.lat.toFixed(4) + '°, ' + s.lng.toFixed(4) + '°</small>';
      d.onclick = function() {
        placeInput.value = label;
        placeInput.dataset.lat = String(s.lat);
        placeInput.dataset.lng = String(s.lng);
        placeInput.dataset.tz = s.cc === 'ge' ? 'Asia/Tbilisi' : '';
        sugBox.classList.remove('open');
        if (!placeInput.dataset.tz) {
          fetch('https://timeapi.io/api/timezone/coordinate?latitude=' + s.lat + '&longitude=' + s.lng)
            .then(function(res) { return res.json(); })
            .then(function(tz) { if (tz && tz.timeZone) placeInput.dataset.tz = tz.timeZone; })
            .catch(function() {});
        }
      };
      sugBox.appendChild(d);
    });
    sugBox.classList.add('open');
  }

  function fetchCities(q) {
    if (q !== _currentQuery) return;
    // Show Georgian seed results immediately while API loads
    const seeds = getGeoSeed(q);
    if (seeds.length) renderSeedResults(seeds);
    const lang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
    const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q)
      + '&format=json&limit=10&addressdetails=1&namedetails=1&featuretype=settlement';
    fetch(url, { headers: { 'Accept-Language': lang + ',en;q=0.8' } })
      .then(function(res) { return res.json(); })
      .then(function(data) { if (q === _currentQuery) renderSuggestions(data, seeds); })
      .catch(function() { if (!seeds.length) sugBox.classList.remove('open'); });
  }

  placeInput.addEventListener('input', function() {
    const q = this.value.trim();
    _currentQuery = q;
    if (q.length < 2) { sugBox.classList.remove('open'); clearTimeout(_debounceTimer); return; }
    // Show seed results immediately (no debounce)
    const seedsNow = getGeoSeed(q);
    if (seedsNow.length) renderSeedResults(seedsNow);
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function() { fetchCities(q); }, 350);
  });

  document.addEventListener('click', function(e) { if (!e.target.closest('.field')) sugBox.classList.remove('open'); });

  // Mobile keyboard handling — on touch devices, scroll the input near the
  // top of the auth-panel on focus so the suggestions list below it stays
  // above the soft keyboard.
  (function mobileKeyboardSafe() {
    var isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (!isCoarse) return;
    var scrollHost = placeInput.closest('.auth-panel');
    if (!scrollHost) return;
    function ensureVisible() {
      var rect = placeInput.getBoundingClientRect();
      var hostRect = scrollHost.getBoundingClientRect();
      var delta = (rect.top - hostRect.top) - 24;
      if (delta > 0) scrollHost.scrollTop += delta;
    }
    placeInput.addEventListener('focus', function() {
      // Two passes: immediate (keyboard already up) + after Android's
      // slow keyboard reveal triggers visualViewport.resize.
      setTimeout(ensureVisible, 50);
      setTimeout(ensureVisible, 350);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function() {
        if (document.activeElement === placeInput) ensureVisible();
      });
    }
  })();
})();

// ═══ LOADING SCREEN (lazy: runtime-loading.js) ═══
// The whole loading screen lives in /runtime-loading.js. The /loading route
// references that file directly (instead of this one); in the full app the
// only caller is goAuthStep(3)'s demo path, which goes through this stub.
(function() {
  function stub() {
    var args = arguments;
    _loadChunk('runtime-loading').then(function() {
      if (window.startLoading !== stub) window.startLoading.apply(null, args);
      else console.error('[runtime] runtime-loading loaded but did not define startLoading');
    }).catch(function(e) { console.error(e); });
  }
  window.startLoading = stub;
})();

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
  overview: 'gl-sparkle', mission: 'gl-northstar', characteristics: 'gl-facet',
  relationships: 'gl-venus', work: 'gl-laurel', shadow: 'gl-moon',
  spiritual: 'gl-lotus', potential: 'gl-radiant'
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
  '⚸': 'lilith', '☊': 'node', '☋': 'node', '⚷': 'chiron',
  '♈': 'aries', '♉': 'taurus', '♊': 'gemini', '♋': 'cancer',
  '♌': 'leo', '♍': 'virgo', '♎': 'libra', '♏': 'scorpio',
  '♐': 'sagittarius', '♑': 'capricorn', '♒': 'aquarius', '♓': 'pisces'
};
const SIGN_SYMBOLS = new Set(['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓']);
const PLANET_SYMBOLS = new Set(['☉','☽','☿','♀','♂','♃','♄','♅','♆','♇','⚸','☊','☋','⚷']);
// Aspect Unicode char → SVG glyph id (mirrors the aspect-table glyph set so
// labels/badges render the polished glyphs, not the raw Unicode char).
const _ASPECT_SYMBOL_TO_GLYPH = { '☌':'conjunction','△':'trine','□':'square','☍':'opposition','⚹':'sextile' };

// Zodiac sign in-text display data (icon/name toggle + tooltips). Mirrors
// lib/utils/renderText.tsx so the hydrated reading matches the React renderer.
const SIGN_NAMES_EN = {
  aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer', leo: 'Leo', virgo: 'Virgo',
  libra: 'Libra', scorpio: 'Scorpio', sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces'
};
const SIGN_NAMES_KA_INF = {
  aries: { nom: 'ვერძი', gen: 'ვერძის', loc: 'ვერძში', dat: 'ვერძს', inst: 'ვერძით', adv: 'ვერძად', for: 'ვერძისთვის', with: 'ვერძთან', voc: 'ვერძო' },
  taurus: { nom: 'კურო', gen: 'კუროს', loc: 'კუროში', dat: 'კუროს', inst: 'კუროთი', adv: 'კუროდ', for: 'კუროსთვის', with: 'კუროსთან', voc: 'კურო' },
  gemini: { nom: 'ტყუპები', gen: 'ტყუპების', loc: 'ტყუპებში', dat: 'ტყუპებს', inst: 'ტყუპებით', adv: 'ტყუპებად', for: 'ტყუპებისთვის', with: 'ტყუპებთან', voc: 'ტყუპებო' },
  cancer: { nom: 'კირჩხიბი', gen: 'კირჩხიბის', loc: 'კირჩხიბში', dat: 'კირჩხიბს', inst: 'კირჩხიბით', adv: 'კირჩხიბად', for: 'კირჩხიბისთვის', with: 'კირჩხიბთან', voc: 'კირჩხიბო' },
  leo: { nom: 'ლომი', gen: 'ლომის', loc: 'ლომში', dat: 'ლომს', inst: 'ლომით', adv: 'ლომად', for: 'ლომისთვის', with: 'ლომთან', voc: 'ლომო' },
  virgo: { nom: 'ქალწული', gen: 'ქალწულის', loc: 'ქალწულში', dat: 'ქალწულს', inst: 'ქალწულით', adv: 'ქალწულად', for: 'ქალწულისთვის', with: 'ქალწულთან', voc: 'ქალწულო' },
  libra: { nom: 'სასწორი', gen: 'სასწორის', loc: 'სასწორში', dat: 'სასწორს', inst: 'სასწორით', adv: 'სასწორად', for: 'სასწორისთვის', with: 'სასწორთან', voc: 'სასწორო' },
  scorpio: { nom: 'მორიელი', gen: 'მორიელის', loc: 'მორიელში', dat: 'მორიელს', inst: 'მორიელით', adv: 'მორიელად', for: 'მორიელისთვის', with: 'მორიელთან', voc: 'მორიელო' },
  sagittarius: { nom: 'მშვილდოსანი', gen: 'მშვილდოსნის', loc: 'მშვილდოსანში', dat: 'მშვილდოსანს', inst: 'მშვილდოსნით', adv: 'მშვილდოსნად', for: 'მშვილდოსნისთვის', with: 'მშვილდოსანთან', voc: 'მშვილდოსანო' },
  capricorn: { nom: 'თხის რქა', gen: 'თხის რქის', loc: 'თხის რქაში', dat: 'თხის რქას', inst: 'თხის რქით', adv: 'თხის რქად', for: 'თხის რქისთვის', with: 'თხის რქასთან', voc: 'თხის რქავ' },
  aquarius: { nom: 'მერწყული', gen: 'მერწყულის', loc: 'მერწყულში', dat: 'მერწყულს', inst: 'მერწყულით', adv: 'მერწყულად', for: 'მერწყულისთვის', with: 'მერწყულთან', voc: 'მერწყულო' },
  pisces: { nom: 'თევზები', gen: 'თევზების', loc: 'თევზებში', dat: 'თევზებს', inst: 'თევზებით', adv: 'თევზებად', for: 'თევზებისთვის', with: 'თევზებთან', voc: 'თევზებო' }
};
const SIGN_TIPS_KA = {
  aries: 'ვერძი — ინიციატივა, სიმამაცე, ძალა', taurus: 'კურო — სტაბილურობა, სიამოვნება, გამძლეობა',
  gemini: 'ტყუპები — ინტელექტი, ორმაგობა, ცნობისმოყვარეობა', cancer: 'კირჩხიბი — გრძნობა, მეხსიერება, ზრუნვა',
  leo: 'ლომი — სხივოსნება, სიამაყე, შემოქმედება', virgo: 'ქალწული — სიზუსტე, სამსახური, გამჭრიახობა',
  libra: 'სასწორი — ბალანსი, სილამაზე, პარტნიორობა', scorpio: 'მორიელი — სიღრმე, ტრანსფორმაცია, ინტენსიობა',
  sagittarius: 'მშვილდოსანი — გაფართოება, ჭეშმარიტება, თავისუფლება', capricorn: 'თხის რქა — ამბიცია, სტრუქტურა, დაოსტატება',
  aquarius: 'მერწყული — სიახლე, იდეალები, თემი', pisces: 'თევზები — თანაგრძნობა, გახსნა, ოცნება'
};
const SIGN_TIPS_EN = {
  aries: 'Aries — initiative, courage, raw drive', taurus: 'Taurus — stability, sensuality, persistence',
  gemini: 'Gemini — intellect, duality, curiosity', cancer: 'Cancer — feeling, memory, nurturing',
  leo: 'Leo — radiance, pride, creative fire', virgo: 'Virgo — precision, service, discernment',
  libra: 'Libra — balance, beauty, partnership', scorpio: 'Scorpio — depth, transformation, intensity',
  sagittarius: 'Sagittarius — expansion, truth, freedom', capricorn: 'Capricorn — ambition, structure, mastery',
  aquarius: 'Aquarius — innovation, ideals, community', pisces: 'Pisces — compassion, dissolution, the dream'
};
function _kaSignName(key, suffix) {
  var f = SIGN_NAMES_KA_INF[key]; if (!f) return key;
  var s = (suffix || '').replace(/^-/, '');
  if (s === 'ის') return f.gen;
  if (s === 'ში') return f.loc;
  if (s === 'ს') return f.dat;
  if (s === 'ით') return f.inst;
  if (s === 'ად') return f.adv;
  if (s === 'სთვის' || s === 'თვის') return f.for;
  if (s === 'სთან' || s === 'თან') return f.with;
  if (s === 'ო') return f.voc;
  if (s === 'ია' || s === 'ა') return f.nom + 'ა'; // copula "is"
  return f.nom;
}

// Planet in-text display data (icon/name toggle + tooltips). Mirrors
// lib/utils/renderText.tsx (PLANET_NAMES_*/renderPlanetSymbolToken).
const PLANET_SYMBOL_TO_NAMEKEY = {
  '☉':'sun','☽':'moon','☿':'mercury','♀':'venus','♂':'mars','♃':'jupiter',
  '♄':'saturn','♅':'uranus','♆':'neptune','♇':'pluto','⚸':'lilith','⚷':'chiron',
  '☊':'north node','☋':'south node'
};
const PLANET_NAMES_EN_INF = {
  sun:'Sun', moon:'Moon', mercury:'Mercury', venus:'Venus', mars:'Mars', jupiter:'Jupiter',
  saturn:'Saturn', uranus:'Uranus', neptune:'Neptune', pluto:'Pluto', lilith:'Lilith',
  'north node':'North Node', 'south node':'South Node', chiron:'Chiron'
};
const PLANET_NAMES_KA_INF = {
  sun:{nom:'მზე',gen:'მზის',loc:'მზეში',dat:'მზეს',inst:'მზით',adv:'მზედ',for:'მზისთვის',with:'მზესთან',voc:'მზეო'},
  moon:{nom:'მთვარე',gen:'მთვარის',loc:'მთვარეში',dat:'მთვარეს',inst:'მთვარით',adv:'მთვარედ',for:'მთვარისთვის',with:'მთვარესთან',voc:'მთვარეო'},
  mercury:{nom:'მერკური',gen:'მერკურის',loc:'მერკურში',dat:'მერკურს',inst:'მერკურით',adv:'მერკურად',for:'მერკურისთვის',with:'მერკურთან',voc:'მერკურო'},
  venus:{nom:'ვენერა',gen:'ვენერას',loc:'ვენერაში',dat:'ვენერას',inst:'ვენერათი',adv:'ვენერად',for:'ვენერასთვის',with:'ვენერასთან',voc:'ვენერავ'},
  mars:{nom:'მარსი',gen:'მარსის',loc:'მარსში',dat:'მარსს',inst:'მარსით',adv:'მარსად',for:'მარსისთვის',with:'მარსთან',voc:'მარსო'},
  jupiter:{nom:'იუპიტერი',gen:'იუპიტერის',loc:'იუპიტერში',dat:'იუპიტერს',inst:'იუპიტერით',adv:'იუპიტერად',for:'იუპიტერისთვის',with:'იუპიტერთან',voc:'იუპიტერო'},
  saturn:{nom:'სატურნი',gen:'სატურნის',loc:'სატურნში',dat:'სატურნს',inst:'სატურნით',adv:'სატურნად',for:'სატურნისთვის',with:'სატურნთან',voc:'სატურნო'},
  uranus:{nom:'ურანი',gen:'ურანის',loc:'ურანში',dat:'ურანს',inst:'ურანით',adv:'ურანად',for:'ურანისთვის',with:'ურანთან',voc:'ურანო'},
  neptune:{nom:'ნეპტუნი',gen:'ნეპტუნის',loc:'ნეპტუნში',dat:'ნეპტუნს',inst:'ნეპტუნით',adv:'ნეპტუნად',for:'ნეპტუნისთვის',with:'ნეპტუნთან',voc:'ნეპტუნო'},
  pluto:{nom:'პლუტონი',gen:'პლუტონის',loc:'პლუტონში',dat:'პლუტონს',inst:'პლუტონით',adv:'პლუტონად',for:'პლუტონისთვის',with:'პლუტონთან',voc:'პლუტონო'},
  lilith:{nom:'ლილითი',gen:'ლილითის',loc:'ლილითში',dat:'ლილითს',inst:'ლილითით',adv:'ლილითად',for:'ლილითისთვის',with:'ლილითთან',voc:'ლილითო'},
  'north node':{nom:'ჩრდილოეთის კვანძი',gen:'ჩრდილოეთის კვანძის',loc:'ჩრდილოეთის კვანძში',dat:'ჩრდილოეთის კვანძს',inst:'ჩრდილოეთის კვანძით',adv:'ჩრდილოეთის კვანძად',for:'ჩრდილოეთის კვანძისთვის',with:'ჩრდილოეთის კვანძთან',voc:'ჩრდილოეთის კვანძო'},
  'south node':{nom:'სამხრეთის კვანძი',gen:'სამხრეთის კვანძის',loc:'სამხრეთის კვანძში',dat:'სამხრეთის კვანძს',inst:'სამხრეთის კვანძით',adv:'სამხრეთის კვანძად',for:'სამხრეთის კვანძისთვის',with:'სამხრეთის კვანძთან',voc:'სამხრეთის კვანძო'},
  chiron:{nom:'ქირონი',gen:'ქირონის',loc:'ქირონში',dat:'ქირონს',inst:'ქირონით',adv:'ქირონად',for:'ქირონისთვის',with:'ქირონთან',voc:'ქირონო'}
};
function _kaPlanetName(sym, suffix) {
  var f = PLANET_NAMES_KA_INF[PLANET_SYMBOL_TO_NAMEKEY[sym]]; if (!f) return sym;
  var s = (suffix || '').replace(/^-/, '');
  if (s === 'ის') return f.gen;
  if (s === 'ში') return f.loc;
  if (s === 'ს') return f.dat;
  if (s === 'ით') return f.inst;
  if (s === 'ად') return f.adv;
  if (s === 'ისთვის' || s === 'სთვის' || s === 'თვის') return f.for;
  if (s === 'ისთან' || s === 'სთან' || s === 'თან') return f.with;
  if (s === 'ო') return f.voc;
  if (s === 'ია' || s === 'ა') return f.nom + 'ა'; // copula "is"
  return f.nom;
}
// Emit the toggleable icon/name planet token (mirrors renderPlanetSymbolToken).
function _planetTokenHtml(sym, suffix) {
  var glyph = SYMBOL_TO_GLYPH[sym];
  var isSouth = sym === '☋';
  var tip = (_hydrateLang === 'ka' ? PLANET_TIPS_KA : PLANET_TIPS_EN)[isSouth ? 'south node' : glyph] || '';
  var tipHtml = tip ? _tip2Html(tip) : '';
  var tipCls = tip ? ' tip2' : '';
  var flipCls = isSouth ? ' gi-flip' : '';
  var nameLabel = _hydrateLang === 'ka' ? _kaPlanetName(sym, suffix) : (PLANET_NAMES_EN_INF[PLANET_SYMBOL_TO_NAMEKEY[sym]] || sym);
  return '<span class="zm-icon"><span class="gi gi-pl' + flipCls + tipCls + '" style="cursor:help"><svg><use href="#gl-' + glyph + '"/></svg>' + tipHtml + '</span>' + (suffix ? '-' + suffix : '') + '</span>' +
    '<span class="zm-name zs' + tipCls + '" style="cursor:help">' + nameLabel + tipHtml + '</span>';
}

// Defensive: rewrite stray "H1".."H12" house notation → Roman numerals
// (mirrors normalizeHouseNotation in renderText.tsx). Spec mandates Roman
// houses, but older/occasional AI output slips into "H7"; fixed at render time
// so stored readings render correctly. "\b" anchors keep "H2O" untouched.
var _HOUSE_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function _normalizeHouseNotation(s) {
  return String(s).replace(/\bH(1[0-2]|[1-9])\b/g, function(_m, n) { return _HOUSE_ROMAN[+n]; });
}

// Collapse LLM <b>/<strong> in prose to ** before escape + markdown pass
function _normalizeLlmHtmlEmphasisToMarkdown(s) {
  if (s == null || typeof s !== 'string') return s;
  var t = s;
  var prev;
  var reStrong = /<\s*strong\b[^>]*>([\s\S]*?)<\s*\/\s*strong\s*>/gi;
  var reB = /<\s*b\b[^>]*>([\s\S]*?)<\s*\/\s*b\s*>/gi;
  do {
    prev = t;
    t = t.replace(reStrong, '**$1**');
    t = t.replace(reB, '**$1**');
  } while (t !== prev);
  return t;
}

// Two-part hover tooltip: tip strings follow "<headline> — <rest>", and the
// headline renders colored (gold by default, tt-fire/… for zodiac signs)
// while the rest stays soft white. The trigger element gets class "tip2"
// (NOT "tip" — that CSS path is attr()-based and single-colored).
function _tip2Html(text, headClass) {
  var i = text.indexOf(' — ');
  var head = i === -1 ? text : text.slice(0, i);
  var rest = i === -1 ? '' : text.slice(i);
  return '<span class="tt"><span class="tt-t' + (headClass ? ' ' + headClass : '') + '">' + head + '</span>' + rest + '</span>';
}

// Render rich text: converts Unicode astro symbols to SVG glyphs + basic markdown (bold/italic)
// Numeric orb in a parenthetical, e.g. „(2°06' ორბით)" / „(orb 2°06')" — banned
// in prose by the i14 prompt and stripped at generation (validator.ts); strip
// here too so older cached readings drop it at display. Both lookaheads must
// hold (a degree AND the orb keyword) so a plain „(11°25')" survives.
var _ORB_PAREN_RE = /\s*\((?=[^)]*[°º])(?=[^)]*(?:ორბ|orb))[^)]*\)/giu;

function _renderRichText(text) {
  if (!text) return '';
  text = _normalizeHouseNotation(_normalizeLlmHtmlEmphasisToMarkdown(String(text))).replace(_ORB_PAREN_RE, '');
  // First, escape HTML but preserve our markers
  var escaped = _esc(text);
  // Convert **bold** to <strong>
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Convert _italic_ or *italic* to <em>
  escaped = escaped.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em class="hl">$1</em>');
  // Highlight chart points: ASC, MC, IC → gold styled span with tooltip.
  // In name mode (KA), inflect the Georgian word grammatically using the
  // optional case suffix attached after a hyphen (validator emits this
  // canonical form for inflected source like "ასცენდენტთან" or
  // "ასცენდენტი-მა").
  var ptTipsEn = { ASC: 'Ascendant — outer mask & first impression', MC: 'Midheaven — career & public role', IC: 'Imum Coeli — roots & private self', DSC: 'Descendant — the mirror & partnerships' };
  var ptTipsKa = { ASC: 'ასცენდენტი — გარეგანი ნიღაბი და პირველი შთაბეჭდილება', MC: 'ცის შუაწერტილი — კარიერა და საჯარო როლი', IC: 'ცის ფსკერი — ფესვები და შინაგანი სამყარო', DSC: 'დესცენდენტი — სარკე და პარტნიორობა' };
  var ptNamesEn = { ASC: 'Ascendant', MC: 'Midheaven', IC: 'Imum Coeli', DSC: 'Descendant' };
  var ptStemsKa = {
    ASC: { prefix: '', stem: 'ასცენდენტ' },
    DSC: { prefix: '', stem: 'დესცენდენტ' },
    MC:  { prefix: 'ცის ', stem: 'შუაწერტილ' },
    IC:  { prefix: 'ცის ', stem: 'ფსკერ' }
  };
  var ptTips = _hydrateLang === 'ka' ? ptTipsKa : ptTipsEn;
  var _kaPtInflect = function(key, s) {
    var e = ptStemsKa[key]; if (!e) return key;
    var p = e.prefix, st = e.stem;
    if (!s) return p + st + 'ი';
    if (s === 'ის') return p + st + 'ის';
    if (s === 'ს') return p + st + 'ს';
    if (s === 'ით') return p + st + 'ით';
    if (s === 'ად') return p + st + 'ად';
    if (s === 'მა' || s === 'მან') return p + st + 'მა';
    if (s === 'ში') return p + st + 'ში';
    if (s === 'სთვის' || s === 'თვის' || s === 'ისთვის') return p + st + 'ისთვის';
    if (s === 'სთან' || s === 'თან' || s === 'ისთან') return p + st + 'თან';
    if (s === 'ო') return p + st + 'ო';
    if (s === 'ია' || s === 'ა') return p + st + 'ია'; // copula "is"
    return p + st + 'ი';
  };
  // Emit both forms; CSS toggles via body.zodiac-names. No re-render on switch.
  escaped = escaped.replace(
    /\b(ASC|MC|IC|DSC)(?:-(ისთვის|ისთან|სთვის|სთან|თვის|თან|ში|ით|ად|მან|მა|ის|ს|ო|ია|ა))?/g,
    function(_m, key, suffix) {
      var iconLabel = suffix ? (key + '-' + suffix) : key;
      var nameLabel = _hydrateLang === 'ka'
        ? _kaPtInflect(key, suffix || '')
        : (ptNamesEn[key] || key);
      return '<span class="pt tip2">' +
        '<span class="zm-icon">' + iconLabel + '</span>' +
        '<span class="zm-name">' + nameLabel + '</span>' +
        _tip2Html(ptTips[key]) +
      '</span>';
    }
  );
  // Retrograde marker → silver ℞ with a two-tone tooltip (silver headline,
  // soft-white body). Mirrors renderText.tsx's retroNode.
  var retroTip = _hydrateLang === 'ka' ? 'რეტროგრადული — ინტერნალიზებული ენერგია' : 'Retrograde — internalized energy';
  var _retroSpan = '<span class="retro tip2" style="cursor:help">℞' + _tip2Html(retroTip, 'tt-silver') + '</span>';
  // A bare "R" right after a planet/sign glyph is the model's retrograde
  // shorthand (e.g. "♋ R in XII House", "♂R"). Convert to ℞ so the marker pass
  // below wraps it. Degree-attached "R" ("8°32'R") is handled by the degree
  // pass. Mirrors renderText.tsx + validator.ts.
  escaped = escaped.replace(/([☉☽☿♀♂♃♄♅♆♇⚸☊☋⚷♈♉♊♋♌♍♎♏♐♑♒♓])(\s*)R(?![\wა-ჰ])/gu, '$1$2℞');
  escaped = escaped.replace(/℞/g, _retroSpan);
  escaped = escaped.replace(/\bretrograde\b|(?<![ა-ჰ])რეტროგრად/giu, function(m, offset, str) {
    return /[ა-ჰ]/u.test(str[offset + m.length] || '') ? _retroSpan + '-' : _retroSpan;
  });
  // Retrograde shorthand the model uses in prose: "(R)", "(Rx)", or a standalone
  // "Rx" (e.g. "♃ Rx ♄") → the silver ℞ marker. Mirrors renderText.tsx group 14.
  escaped = escaped.replace(/\(Rx?\)|(?<![\wა-ჰ])Rx(?![\wა-ჰ])/g, _retroSpan);
  // Inline degree tokens → tinted .deg span so numerals/°/′ read as data; a
  // trailing "R" (e.g. 8°32'R) becomes the silver ℞ marker. Runs after the ℞
  // pass so the emitted marker isn't re-wrapped.
  escaped = escaped.replace(/(?<!\d)(\d{1,3}(?:\.\d+)?[°º](?:\d{1,2}['′]?)?)(?:\s*(R))?(?![\w°])/gi, function(_m, core, r) {
    return '<span class="deg">' + core + '</span>' + (r ? _retroSpan : '');
  });
  // Element words → colored inline pills (Characteristics core card).
  // Matches: ცეცხლ- / მიწ- / ჰაერ- / წყალ- / წყლ- (genitive: წყლის, წყლისა) with any
  // Georgian ending, plus English fire/earth/air/water. Optional trailing "(NN%)" or "(NN)".
  var _elStem = function(word) {
    var w = word.toLowerCase();
    if (/^fire$/.test(w)) return 'fire';
    if (/^earth$/.test(w)) return 'earth';
    if (/^air$/.test(w)) return 'air';
    if (/^water$/.test(w)) return 'water';
    if (/^ცეცხლ/.test(word)) return 'fire';
    if (/^მიწ/.test(word)) return 'earth';
    if (/^ჰაერ/.test(word)) return 'air';
    if (/^წყალ/.test(word) || /^წყლ/.test(word)) return 'water';
    return null;
  };
  var _elTipsKa = {
    fire: 'ცეცხლი — მოქმედება, ვნება, სითამამე',
    earth: 'მიწა — სტაბილურობა, პრაქტიკა, საფუძველი',
    air: 'ჰაერი — აზრი, კომუნიკაცია, იდეები',
    water: 'წყალი — ემოცია, ინტუიცია, სიღრმე'
  };
  var _elTipsEn = {
    fire: 'Fire — action, passion, courage',
    earth: 'Earth — stability, practicality, grounding',
    air: 'Air — thought, communication, ideas',
    water: 'Water — emotion, intuition, depth'
  };
  // წყალ before წყლ so the longer form wins on "წყალისა"
  var _elRe = /((?:(?<![ა-ჰ])(?:ცეცხლ|მიწ|ჰაერ|წყალ|წყლ)[ა-ჰ]*|\b(?:fire|earth|air|water)\b))(?:\s*\(\s*(\d{1,3})\s*%?\s*\))?/giu;
  var _elTips = _hydrateLang === 'ka' ? _elTipsKa : _elTipsEn;
  escaped = escaped.replace(_elRe, function(_full, word, pct) {
    var el = _elStem(word);
    if (!el) return _full;
    var pctHtml = (pct != null && pct !== '') ? '<span class="gel-p">(' + pct + '%)</span>' : '';
    var tipAttr = _elTips[el] ? ' data-tip="' + _elTips[el] + '"' : '';
    return '<span class="gel gel-' + el + ' tip"' + tipAttr + '><span class="gel-w">' + word + '</span>' + pctHtml + '</span>';
  });
  // Zodiac sign symbols → toggleable icon/name token with tooltip + Georgian
  // case inflection (mirrors renderText.tsx renderZodiacSignToken). Runs before
  // the char-by-char pass below so signs become dual icon/name spans (which the
  // zodiac switch can flip) instead of a bare, untoggleable glyph.
  escaped = escaped.replace(
    /([♈♉♊♋♌♍♎♏♐♑♒♓])(?:-(ისთვის|ისთან|სთვის|სთან|თვის|თან|ში|ით|ად|ის|ს|ო|ია|ა))?/g,
    function(_m, sym, suffix) {
      var key = SYMBOL_TO_GLYPH[sym];
      var el = SIGN_ELEMENT[key] || '';
      var tip = (_hydrateLang === 'ka' ? SIGN_TIPS_KA : SIGN_TIPS_EN)[key] || '';
      var nameLabel = _hydrateLang === 'ka' ? _kaSignName(key, suffix) : (SIGN_NAMES_EN[key] || key);
      // Sign tooltips: headline in the sign's element color, rest soft white.
      var tipHtml = tip ? _tip2Html(tip, 'tt-' + el) : '';
      var tipCls = tip ? ' tip2' : '';
      return '<span class="zm-icon"><span class="gi gi-' + el + tipCls + '" style="cursor:help"><svg><use href="#gl-' + key + '"/></svg>' + tipHtml + '</span>' + (suffix ? '-' + suffix : '') + '</span>' +
        '<span class="zm-name zs zs-' + el + tipCls + '" style="cursor:help">' + nameLabel + tipHtml + '</span>';
    }
  );
  // Planet symbols → toggleable icon/name token with tooltip + Georgian case
  // inflection (mirrors renderText.tsx renderPlanetSymbolToken). Runs before the
  // char-by-char pass so planets become dual icon/name spans (which the zodiac
  // switch flips) instead of a bare, untoggleable glyph.
  escaped = escaped.replace(
    /([☉☽☿♀♂♃♄♅♆♇⚸☊☋⚷])(?:-(ისთვის|ისთან|სთვის|სთან|თვის|თან|ში|ით|ად|ის|ს|ო|ია|ა))?/g,
    function(_m, sym, suffix) { return _planetTokenHtml(sym, suffix); }
  );
  // Now replace Unicode astro symbols with SVG glyphs
  var chars = Array.from(escaped);
  var result = '';
  for (var i = 0; i < chars.length; i++) {
    var ch = chars[i];
    if (SYMBOL_TO_GLYPH[ch]) {
      var glyphName = SYMBOL_TO_GLYPH[ch];
      if (PLANET_SYMBOLS.has(ch)) {
        // ☋ South Node reuses the node glyph rotated 180° (astro convention)
        // and gets its own tooltip text.
        var _isSouth = ch === '☋';
        var _tipKey = _isSouth ? 'south node' : glyphName;
        var _ptip = (_hydrateLang === 'ka' ? PLANET_TIPS_KA : PLANET_TIPS_EN)[_tipKey] || '';
        var _flipCls = _isSouth ? ' gi-flip' : '';
        result += _ptip
          ? '<span class="gi gi-pl' + _flipCls + ' tip2" style="cursor:help"><svg><use href="#gl-' + glyphName + '"/></svg>' + _tip2Html(_ptip) + '</span>'
          : '<span class="gi gi-pl' + _flipCls + '"><svg><use href="#gl-' + glyphName + '"/></svg></span>';
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

// Build rich badge HTML from a label string
// Converts Unicode symbols to SVG glyphs and adds element-colored sign glyphs
function _buildBadgeHtml(label) {
  if (!label) return '';
  var result = '';
  var chars = Array.from(_normalizeHouseNotation(label));
  var i = 0;
  while (i < chars.length) {
    var ch = chars[i];
    if (SYMBOL_TO_GLYPH[ch]) {
      var glyphName = SYMBOL_TO_GLYPH[ch];
      if (PLANET_SYMBOL_TO_NAMEKEY[ch]) {
        // Toggleable icon/name token — badges ride the zodiac switch too (same
        // token as _renderRichText's prose pass). Labels carry no case suffix.
        result += _planetTokenHtml(ch, '');
      } else if (PLANET_SYMBOLS.has(ch)) {
        // Non-toggle planet-class glyph (⚷ chiron): plain gold glyph.
        result += '<span class="gi gi-pl"><svg><use href="#gl-' + glyphName + '"/></svg></span>';
      } else if (SIGN_SYMBOLS.has(ch)) {
        var el = SIGN_ELEMENT[glyphName] || '';
        result += '<span class="gi gi-' + el + '"><svg><use href="#gl-' + glyphName + '"/></svg></span>';
      }
      i++;
    } else if (ch === '℞') {
      result += ' <span class="retro">&#8478;</span>';
      i++;
    } else if (_ASPECT_SYMBOL_TO_GLYPH[ch]) {
      // Aspect symbols render as the polished SVG glyphs (same set as the
      // aspect table) instead of the raw Unicode char.
      result += '<span class="gi gi-pl asy-lbl"><svg><use href="#gl-' + _ASPECT_SYMBOL_TO_GLYPH[ch] + '"/></svg></span>';
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
  if (user.natal_chart_unlocked) return true;
  if (key === 'overview') return true;
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

var _GLYPH_IDS = { sun:1, moon:1, venus:1, mars:1, mercury:1, jupiter:1, saturn:1, uranus:1, neptune:1, pluto:1, chiron:1, lilith:1, node:1, asc:1 };
var _GLYPH_ALIAS = { 'north node':'node', 'south node':'node' };
// Text acronyms rendered as styled text badges; symbol fallbacks rendered as glyphs
var _GLYPH_ACRONYM = { ascendant:'ASC', midheaven:'MC', mc:'MC', ic:'IC', descendant:'DSC' };
var _GLYPH_SYMBOL = { chiron:'⚷' };
function _planetGlyph(name) {
  if (!name) return '';
  var raw = (PLANET_KA_REV[name] || name).toLowerCase();
  // South Node = node glyph rotated 180° (astro convention: ☊ vs ☋)
  var isSouth = raw.indexOf('south node') !== -1;
  var key = raw.replace('north node','node').replace('south node','node');
  var resolved = _GLYPH_ALIAS[key] || key;
  if (_GLYPH_IDS[resolved]) {
    return '<span class="gi gi-pl' + (isSouth ? ' gi-flip' : '') + '"><svg><use href="#gl-' + resolved + '"/></svg></span>';
  }
  var acr = _GLYPH_ACRONYM[key] || _GLYPH_ACRONYM[resolved];
  if (acr) return '<span class="gi-acr">' + acr + '</span>';
  var sym = _GLYPH_SYMBOL[key] || _GLYPH_SYMBOL[resolved];
  if (sym) return '<span class="gi gi-pl">' + sym + '</span>';
  return '';
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

// Sign glyph carrying its own two-tone hover tooltip + element color. Used in
// the points row, where the zodiac is a separate hover target from the point.
function _signGlyphTipped(signName) {
  var lower = (signName || '').toLowerCase();
  var key = Object.prototype.hasOwnProperty.call(_SIGN_IDX, lower) ? lower : '';
  if (!key) { for (var k in _SIGN_IDX) { if (lower.indexOf(k) !== -1 || k.indexOf(lower) !== -1) { key = k; break; } } }
  if (!key) return _esc(signName);
  var el = SIGN_ELEMENT[key] || '';
  var tip = (_hydrateLang === 'ka' ? SIGN_TIPS_KA : SIGN_TIPS_EN)[key] || '';
  var tipHtml = tip ? _tip2Html(tip, 'tt-' + el) : '';
  var tipCls = tip ? ' tip2' : '';
  return '<span class="gi gi-' + el + tipCls + '" style="cursor:help"><svg><use href="#gl-' + key + '"/></svg>' + tipHtml + '</span>';
}

function _buildPlanetRow(row) {
  const planet = row.planet || row.name || '';
  // Resolve to English key for glyph lookup + data attribute
  const planetKey = (PLANET_KA_REV[planet] || planet).toLowerCase();
  const planetKa = _tr(PLANET_KA, planet);
  const signKa = _tr(SIGN_KA, row.sign);
  const retro = row.retrograde ? ' class="retro"' : '';
  const retroTip = _hydrateLang === 'ka' ? 'რეტროგრადული — ინტერნალიზებული ენერგია' : 'Retrograde — internalized energy';
  const retroBadge = row.retrograde ? ' <span class="retro tip2" style="cursor:help">&#8478;' + _tip2Html(retroTip, 'tt-silver') + '</span>' : '';
  const elLower = (row.element || '').toLowerCase();
  const elClass = ELEMENT_LABEL_CLASS[elLower] || '';
  const elLabel = { fire: 'ცეცხლი', earth: 'მიწა', air: 'ჰაერი', water: 'წყალი' };
  const elKa = _hydrateLang === 'ka' ? (elLabel[elLower] || row.element) : row.element;
  // Resolve sign index for hover tooltip
  const signLower = (row.sign || '').toLowerCase();
  let signIdx = _SIGN_IDX[signLower];
  if (signIdx === undefined) {
    for (const [k, v] of Object.entries(_SIGN_IDX)) {
      if (signLower.includes(k) || k.includes(signLower)) { signIdx = v; break; }
    }
  }
  const siAttr = signIdx !== undefined ? ' data-si="' + signIdx + '"' : '';
  return '<tr>' +
    '<td class="pl-btn pl-' + planetKey + '" data-pl="' + planetKey + '">' +
      _planetGlyph(planet) + '<span class="pt-name">' + _esc(planetKa) + '</span></td>' +
    '<td class="sign-td"' + siAttr + '>' + _signGlyph(row.sign, row.element) + '<span class="pt-name">' + _esc(signKa) + '</span></td>' +
    '<td' + retro + '>' + _esc(row.degree) + retroBadge + '</td>' +
    '<td class="house-td" data-house="' + _esc(row.house) + '">' + _esc(row.house) + '</td>' +
    '<td><span class="et ' + elClass + '">' + _esc(elKa) + '</span></td>' +
    '</tr>';
}

var _aspTypeLabel = {
  ka: { conjunction: 'კონიუნქცია', trine: 'ტრინი', square: 'კვადრატი', opposition: 'ოპოზიცია', sextile: 'სექსტილი' },
  en: { conjunction: 'conjunction', trine: 'trine', square: 'square', opposition: 'opposition', sextile: 'sextile' }
};
// Short two-tone hover tooltips for the aspect-type label on aspect rows.
var _aspTypeTip = {
  ka: { conjunction: 'კონიუნქცია — შერწყმა, ენერგიების გაძლიერება', trine: 'ტრინი — ჰარმონია, ბუნებრივი ნიჭი', square: 'კვადრატი — დაძაბულობა, ზრდის ბიძგი', opposition: 'ოპოზიცია — პოლარობა, ბალანსის ძიება', sextile: 'სექსტილი — შესაძლებლობა, თანამშრომლობა' },
  en: { conjunction: 'Conjunction — fusion, intensified energy', trine: 'Trine — harmony, natural talent', square: 'Square — tension, growth push', opposition: 'Opposition — polarity, seeking balance', sextile: 'Sextile — opportunity, cooperation' }
};

function _aspectGlyph(type) {
  var ids = { conjunction: 'gl-conjunction', trine: 'gl-trine', square: 'gl-square', sextile: 'gl-sextile', opposition: 'gl-opposition' };
  var id = ids[type];
  if (!id) return '';
  return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="vertical-align:-2px"><use href="#' + id + '"/></svg>';
}

// Resolve a planet/point name (KA or EN) to its plData/glyph key (sun…pluto,
// chiron, node, lilith). Mirrors _planetGlyph's resolution — except the South
// Node stays a DISTINCT key ('south node'): it has its own plData popup entry
// and renders as the node glyph rotated 180°. Collapsing it to 'node' (the old
// behavior) made South Node chips open the North Node popup.
function _planetKey(name) {
  if (!name) return '';
  var key = (PLANET_KA_REV[name] || name).toLowerCase().replace('north node', 'node');
  if (key === 'south node') return key; // before _GLYPH_ALIAS, which collapses it to 'node'
  return _GLYPH_ALIAS[key] || key;
}
// Wrap an aspect-row body (glyph + name) as a popup trigger: .pl-btn for planets
// with an extended plData entry, .cp-btn for chart points (ASC/DSC/MC/IC);
// otherwise render it plain.
// noTip=true suppresses the hover bubble (keeps the click popup) — used in the
// interpretation table where the headline sits directly above the body and the
// bubble would overlap the row above it.
function _aspPlanet(glyph, name, rawName, noTip) {
  var pk = _planetKey(rawName);
  if (_PL_POPUP_KEYS[pk]) {
    // Short hover tooltip (tip2) alongside the click popup — restores the
    // planet one-liner on aspect rows. Skipped in the interpretation table.
    var tip = noTip ? '' : (_hydrateLang === 'ka' ? PLANET_TIPS_KA : PLANET_TIPS_EN)[pk] || '';
    var tipHtml = tip ? _tip2Html(tip) : '';
    var tipCls = tip ? ' tip2' : '';
    return '<span class="al-p pl-btn' + tipCls + '" data-pl="' + pk + '">' + glyph + name + tipHtml + '</span>';
  }
  var cp = _chartPointKey(rawName);
  if (cp) {
    return '<span class="al-p cp-btn" data-cp="' + cp + '">' + glyph + name + '</span>';
  }
  return '<span class="al-p">' + glyph + name + '</span>';
}

function _buildAspect(asp) {
  if (!asp || typeof asp !== 'object') return '';
  // Aspect nature for color-coded left border
  var natureClass = { conjunction: 'al-conj', trine: 'al-harm', sextile: 'al-harm', square: 'al-tens', opposition: 'al-tens' };
  var aspectType = asp.aspectType || asp.aspect || asp.type || '';
  var p1Name = asp.planet1 || asp.planet_1 || asp.body1 || '';
  var p2Name = asp.planet2 || asp.planet_2 || asp.body2 || '';
  var p1 = _tr(PLANET_KA, p1Name);
  var p2 = _tr(PLANET_KA, p2Name);
  var orbStr = asp.orb != null ? asp.orb + '°' : '';
  var typeLbl = (_aspTypeLabel[_hydrateLang] || _aspTypeLabel.ka)[aspectType] || aspectType;
  var hasInterp = Boolean(asp.interpretation);
  var aspKey = (p1Name + '__' + p2Name).replace(/\s+/g, '').toLowerCase();
  // al-hi = has interpretation in expanded section (brighter bg + ★)
  var cls = 'al ' + (natureClass[aspectType] || '') + (hasInterp ? ' al-hi' : '');
  var clickAttr = hasInterp ? ' data-asp-key="' + aspKey + '" onclick="openAspInterp(this, event)"' : '';
  // Acronym glyphs (MC, IC, DSC, ASC) ARE the label — don't repeat. Symbol glyphs (⚷) keep the name.
  var g1 = _planetGlyph(p1Name);
  var g2 = _planetGlyph(p2Name);
  var isAcr1 = g1.indexOf('gi-acr') !== -1;
  var isAcr2 = g2.indexOf('gi-acr') !== -1;
  var typeTip = (_aspTypeTip[_hydrateLang] || _aspTypeTip.ka)[aspectType] || '';
  var typeTipHtml = typeTip ? _tip2Html(typeTip) : '';
  var typeTipCls = typeTip ? ' tip2' : '';
  return '<div class="' + cls + '"' + clickAttr + '>' +
    '<span class="asy asy-btn" data-asp-type="' + _esc(aspectType) + '">' + (_aspectGlyph(aspectType) || _esc(asp.aspectSymbol || '')) + '</span>' +
    _aspPlanet(g1, isAcr1 ? '' : ' ' + _esc(p1), p1Name) +
    _aspPlanet(g2, isAcr2 ? '' : ' ' + _esc(p2), p2Name) +
    '<span class="alb">' +
    '<span class="al-type' + typeTipCls + '"' + (typeTip ? ' style="cursor:help"' : '') + '>' + _esc(typeLbl) + typeTipHtml + '</span>' +
    '<span class="al-orb">' + _esc(orbStr) + '</span>' +
    (hasInterp ? '<span class="al-star">★</span>' : '') +
    '</span>' +
    '</div>';
}

function _buildLockWrap(sectionKey, section, iconId) {
  var cards = section.coreCards || section.cards || [];
  var lang = _hydrateLang;
  var unlockLabel = lang === 'ka' ? 'სრული ანალიზის განბლოკვა' : 'Unlock Full Analysis';
  var lockSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

  var html = '<div class="lock-wrap locked" id="lock-s' + (SECTION_KEYS.indexOf(sectionKey) + 1) + '">';
  html += '<div class="sh"><div class="section-icon"><svg style="color:var(--gold)"><use href="#' + iconId + '"/></svg></div>';
  html += '<h2>' + _esc(_stripPrefix(section.sectionTitle)) + '</h2>';
  html += '<div class="st">' + _esc(section.sectionTagline || '') + '</div></div>';

  html += '<div class="lp-v2">';

  // Stacked card peeks — up to 3
  var peekCards = cards.slice(0, 3);
  if (peekCards.length > 0) {
    html += '<div class="lp-stack">';
    peekCards.forEach(function(card, i) {
      var cls = 'lp-peek' + (i > 0 ? ' lp-peek-' + (i + 1) : '');
      html += '<div class="' + cls + '">';
      html += '<span class="lp-peek-title">' + _esc(card.title) + '</span>';
      var lineWidths = i === 0 ? [100, 88, 94, 76] : [100, 82];
      lineWidths.forEach(function(w) { html += '<div class="lp-peek-line" style="width:' + w + '%"></div>'; });
      html += '</div>';
    });
    html += '</div>';
  }

  // Gate — lock icon + CTA
  html += '<div class="lp-gate">';
  html += '<div class="lp-lock-icon">' + lockSvg + '</div>';
  html += '<button class="btn-unlock" onclick="unlockFullReading()">' + _esc(unlockLabel) + '</button>';
  html += '</div>';

  html += '</div></div>';
  return html;
}

// Empty slot emitted by prototype; React ReadingRenderer portals a <CardComponent>
// into it on the `reading:hydrated` event. `display:contents` keeps the slot
// invisible to flex/grid layout so `.g2 > .c` pairing still works.
function _buildCardSlot(sectionKey, cardIdx) {
  return '<div data-reading-slot data-section="' + sectionKey + '" data-card-idx="' + cardIdx + '" style="display:contents"></div>';
}

function _buildCardsGrid(cards, sectionKey) {
  if (!cards || !cards.length) return '';
  var html = '';
  // First card renders full-width (standalone), then remaining cards pair into g2 grids.
  html += _buildCardSlot(sectionKey, 0);
  for (var i = 1; i < cards.length; i += 2) {
    if (i + 1 < cards.length) {
      html += '<div class="g2">';
      html += _buildCardSlot(sectionKey, i);
      html += _buildCardSlot(sectionKey, i + 1);
      html += '</div>';
    } else {
      // Odd trailing card — render standalone
      html += _buildCardSlot(sectionKey, i);
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
      html += '<div class="c">';
      // Mobile-only nudge: the table cells are tappable for popups, but that
      // affordance isn't obvious on touch. Styled as a neutral "UI tip" chip
      // (info glyph + grey) so it reads as interface guidance, not chart data.
      // Shown via CSS only ≤720px.
      var _ptHintText = _hydrateLang === 'ka'
        ? 'დააჭირე სიმბოლოებს მნიშვნელობის გასაგებად'
        : 'Tap the symbols to see what they mean';
      html += '<div class="pt-hint"><span class="pt-hint-chip">' +
        '<svg class="pt-hint-ico" viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
        '<line x1="12" y1="11" x2="12" y2="16.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
        '<circle cx="12" cy="7.4" r="1.15" fill="currentColor"/></svg>' +
        '<span>' + _ptHintText + '</span></span></div>';
      html += '<table class="pt"><thead><tr>';
      thLabels.forEach(function(th) { html += '<th>' + th + '</th>'; });
      html += '</tr></thead><tbody>';
      section.planetTable.forEach(function(row) { html += _buildPlanetRow(row); });
      html += '</tbody></table>';
      // Points row (ASC, MC, North Node, Lilith)
      if (section.points && typeof section.points === 'object') {
        var pts = section.points;
        html += '<div class="pts-row" style="margin-top:14px;display:flex;flex-wrap:wrap;gap:4px">';
        var _ptsTips = _hydrateLang === 'ka' ? PLANET_TIPS_KA : PLANET_TIPS_EN;
        // Each badge: [point] [degree] [zodiac]. The point and the zodiac each
        // carry their own hover tooltip, separated by the degree so the two
        // hover targets don't overlap. ASC/MC live in the hero chips, not here.
        var _pointBadge = function(glyphKey, tipKey, p) {
          if (!p) return '';
          return '<span class="pb2"><span class="pb2-pt tip2" style="cursor:help">' + _planetGlyph(glyphKey) + _tip2Html(_ptsTips[tipKey]) + '</span> ' + _esc(p.degree) + ' ' + _signGlyphTipped(p.sign) + '</span>';
        };
        html += _pointBadge('node', 'node', pts.northNode);
        html += _pointBadge('south node', 'south node', pts.southNode);
        html += _pointBadge('lilith', 'lilith', pts.lilith);
        html += _pointBadge('chiron', 'chiron', pts.chiron);
        html += '</div>';
      }
      html += '</div>';
    }
    // Aspects
    if (section.aspects && section.aspects.length) {
      var _aspDesc = _hydrateLang === 'ka'
        ? 'ასპექტები — კუთხეები პლანეტებს შორის, რომლებიც აჩვენებენ, როგორ ურთიერთქმედებენ მათი ენერგიები: ჰარმონიულად (ტრინი, სექსტილი), დაძაბულად (კვადრატი, ოპოზიცია) თუ შერწყმულად (კონიუნქცია). დააჭირე სიმბოლოს მნიშვნელობისთვის.'
        : 'Aspects are the angles between planets, showing how their energies interact — in harmony (trine, sextile), in tension (square, opposition), or fused (conjunction). Tap a symbol for its meaning.';
      var _aspInfoIco = '<svg class="b-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="12" y1="11" x2="12" y2="16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.2" fill="currentColor"/></svg>';
      html += '<div class="c"><span class="b-tip tip tipw" data-tip="' + _esc(_aspDesc) + '"><span class="b">' + (_hydrateLang === 'ka' ? 'მთავარი ასპექტები' : 'Major Aspects') + _aspInfoIco + '</span></span>';
      html += '<h3>' + (_hydrateLang === 'ka' ? 'პლანეტარული საუბრები' : 'Planetary Conversations') + '</h3>';
      section.aspects.forEach(function(asp) { html += _buildAspect(asp); });
      var interps = section.aspects.filter(function(a) { return a.interpretation; });
      if (interps.length) {
        html += '<button class="tb2" onclick="toggleExp(this)">' + (_hydrateLang === 'ka' ? 'ასპექტების ინტერპრეტაცია ↓' : 'Aspect Interpretations ↓') + '</button>';
        html += '<div class="ce">';
        var _aiNature = { trine: 'al-harm', sextile: 'al-harm', square: 'al-tens', opposition: 'al-tens', conjunction: 'al-conj' };
        interps.forEach(function(a) {
          var _aType = a.aspectType || a.aspect || a.type || '';
          var _nc = _aiNature[_aType] || '';
          var _p1Name = a.planet1 || a.planet_1 || a.body1 || '';
          var _p2Name = a.planet2 || a.planet_2 || a.body2 || '';
          var _aspKey = (_p1Name + '__' + _p2Name).replace(/\s+/g, '').toLowerCase();
          var _g1 = _planetGlyph(_p1Name);
          var _g2 = _planetGlyph(_p2Name);
          var _isAcr1 = _g1.indexOf('gi-acr') !== -1;
          var _isAcr2 = _g2.indexOf('gi-acr') !== -1;
          var _p1 = _tr(PLANET_KA, _p1Name);
          var _p2 = _tr(PLANET_KA, _p2Name);
          var _orbStr = a.orb != null ? a.orb + '°' : '';
          var _typeLbl = (_aspTypeLabel[_hydrateLang] || _aspTypeLabel.ka)[_aType] || _aType;
          html += '<div class="ai-entry ' + _nc + '" data-asp-key="' + _aspKey + '">' +
            '<div class="al ' + _nc + '">' +
              '<span class="asy asy-btn" data-asp-type="' + _esc(_aType) + '">' + (_aspectGlyph(_aType) || _esc(a.aspectSymbol || '')) + '</span>' +
              _aspPlanet(_g1, _isAcr1 ? '' : ' ' + _esc(_p1), _p1Name, true) +
              _aspPlanet(_g2, _isAcr2 ? '' : ' ' + _esc(_p2), _p2Name, true) +
              '<span class="alb">' +
                '<span class="al-type">' + _esc(_typeLbl) + '</span>' +
                '<span class="al-orb">' + _esc(_orbStr) + '</span>' +
              '</span>' +
            '</div>' +
            '<div class="ai-body"><p>' + _renderRichText(a.interpretation) + '</p></div>' +
          '</div>';
        });
        html += '</div>';
      }
      html += '</div>';
    }
    // Core cards — only for users with the full reading. Free/invited users
    // get no overview teaser card (removed); the per-section lock-wraps with
    // the unlock CTA still cover the upgrade path.
    var cards = section.coreCards || section.cards || [];
    var _hasFullReading = _currentUser && (_currentUser.account_type === 'premium' || _currentUser.natal_chart_unlocked);
    if (_hasFullReading && cards.length) {
      html += _buildCardsGrid(cards, sectionKey);
    }
  } else {
    // Content sections (2-8) in 2-column grid
    var sCards = section.cards || [];
    html += _buildCardsGrid(sCards, sectionKey);
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
  _currentReading = reading; // store for tier switch re-hydration
  // Derive language from body class (set by setLang before hydrateReading is called).
  // Do NOT rely on reading.meta.language — meta is stripped from new readings (i10+).
  _hydrateLang = document.body.classList.contains('lang-en') ? 'en' : 'ka';
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

  // 2. Set tier + paid-slot count
  // invited-plus (the JS-internal tier string) gates UI affordances that
  // assume the user has full reading access — so we map there only when
  // natal_chart_unlocked is true. invited+ users without natal unlock keep
  // the 'invited' UI gate; the paid-slot count below independently controls
  // slot 2 visibility for them.
  currentInviteSlotsPurchased = Number(user.invite_slots_purchased) || 0;
  var tierMap = { free: 'free', premium: 'premium', invited: 'invited', 'invited+': 'invited' };
  var mappedTier = tierMap[user.account_type] || 'free';
  if (user.natal_chart_unlocked && (user.account_type === 'invited' || user.account_type === 'invited+')) mappedTier = 'invited-plus';
  setTier(mappedTier, null);

  // 3. Hero chips — sourced from overview.planetTable + overview.points (no meta dependency)
  var heroChips = document.querySelector('.hero-chips');
  if (heroChips) {
    var pName = function(r) { return (r.planet || r.name || '').toLowerCase(); };
    var sun = (reading.overview?.planetTable || []).find(function(r) { return pName(r) === 'sun'; });
    var moon = (reading.overview?.planetTable || []).find(function(r) { return pName(r) === 'moon'; });
    var pts = reading.overview?.points || {};

    var _signDeg = function(sign, degree) {
      return _tr(SIGN_KA, sign) + (degree ? ' ' + degree : '');
    };
    var chipTipsEn = {
      sun: 'Sun — core identity & vitality',
      moon: 'Moon — emotions & inner needs',
      ASC: 'Ascendant — outer mask & first impression',
      MC: 'Midheaven — career & public role',
      IC: 'Imum Coeli — roots & private self',
      DSC: 'Descendant — the mirror & partnerships'
    };
    var chipTipsKa = {
      sun: 'მზე — ცენტრალური ვინაობა და სიცოცხლის ენერგია',
      moon: 'მთვარე — ემოციები და შინაგანი მოთხოვნილებები',
      ASC: 'ასცენდენტი — გარეგანი ნიღაბი და პირველი შთაბეჭდილება',
      MC: 'ცის შუაწერტილი — კარიერა და საჯარო როლი',
      IC: 'ცის ფსკერი — ფესვები და შინაგანი სამყარო',
      DSC: 'დესცენდენტი — სარკე და პარტნიორობა'
    };
    var chipTips = _hydrateLang === 'ka' ? chipTipsKa : chipTipsEn;
    var _chip = function(key, glyphHtml, valHtml) {
      return '<span><span class="chip-label tip" data-tip="' + _esc(chipTips[key]) + '">' + glyphHtml + '</span> ' + valHtml + '</span>';
    };
    // Hero chip ASC/MC/IC/DSC labels are intentionally fixed abbreviations
    // (not affected by the zodiac toggle) — they read as compact chart-axis
    // tags rather than body prose.
    var chips = '';
    if (sun)  chips += _chip('sun',  '<svg style="color:var(--gd)"><use href="#gl-sun"/></svg>',  _esc(_signDeg(sun.sign, sun.degree)));
    if (moon) chips += _chip('moon', '<svg style="color:var(--gd)"><use href="#gl-moon"/></svg>', _esc(_signDeg(moon.sign, moon.degree)));
    if (pts.ascendant)  chips += _chip('ASC', 'ASC', _esc(_signDeg(pts.ascendant.sign, pts.ascendant.degree)));
    if (pts.midheaven)  chips += _chip('MC',  'MC',  _esc(_signDeg(pts.midheaven.sign, pts.midheaven.degree)));
    if (pts.ic)         chips += _chip('IC',  'IC',  _esc(_signDeg(pts.ic.sign, pts.ic.degree)));
    if (pts.descendant) chips += _chip('DSC', 'DSC', _esc(_signDeg(pts.descendant.sign, pts.descendant.degree)));
    if (chips) heroChips.innerHTML = chips;
  }

  // 4. Update mini-chart with real planet positions
  if (reading.overview && reading.overview.planetTable) {
    var _pt = reading.overview.planetTable;
    var _chartPs = _readingToChartPlanets(_pt);
    // Always read ASC/MC from reading.overview.points (canonical source)
    var _pts = reading.overview.points || {};
    var _ascEcl = _pts.ascendant ? _signDegToEcl(_pts.ascendant.sign, _pts.ascendant.degree) : null;
    var _mcEcl  = _pts.midheaven ? _signDegToEcl(_pts.midheaven.sign, _pts.midheaven.degree) : null;
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
        var lang = _hydrateLang;
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

  // Batch DOM updates: one removal pass + one insert (avoids per-node reflow from insertBefore/remove loops)
  var footerEl = viewNatal.querySelector(':scope > footer');
  Array.from(viewNatal.children).forEach(function(el) {
    if (el !== hero && el !== nb && el !== footerEl) el.remove();
  });

  var fragment = document.createDocumentFragment();
  var temp = document.createElement('div');
  temp.innerHTML = contentHtml;
  while (temp.firstChild) fragment.appendChild(temp.firstChild);

  if (footerEl) {
    viewNatal.insertBefore(fragment, footerEl);
  } else {
    viewNatal.appendChild(fragment);
  }

  // 5. Switch to natal view if not already on a real reading view.
  // Treat 'synastry' and 'payment' as peer views — a language switch while
  // viewing synastry or a payment page must not kick the user back to natal.
  // Exception: during password recovery (/auth?recovery=1) the user holds a
  // live (recovery) session, so background hydration would otherwise flip the
  // view to natal a few seconds after landing — auto-"logging in" over the
  // set-new-password page. Keep them on the auth/reset view until they finish.
  var _hydCurrentView = document.body.getAttribute('data-view');
  var _hydOnRecovery = /[?&]recovery=1(?:&|$)/.test(window.location.search);
  if (!_hydOnRecovery && _hydCurrentView !== 'natal' && _hydCurrentView !== 'synastry' && _hydCurrentView !== 'payment') {
    switchView('natal', document.getElementById('devNatal'));
  }

  // 6. Make natal view visible (in case it was hidden to prevent flash)
  viewNatal.style.visibility = 'visible';

  // 7. Re-init observers for scroll animations + nav sync
  setTimeout(initObservers, 100);

  // 8. Expose reading state + notify ReadingRenderer to portal cards into slots
  window.__readingState = { reading: reading, user: user, lang: _hydrateLang, type: 'natal' };
  window.dispatchEvent(new CustomEvent('reading:hydrated'));

  console.log('[HYDRATE] Reading hydration complete');
}

window.hydrateReading = hydrateReading;

// ═══ MOBILE: SCROLL-ACTIVATE CARDS + ROTATE HINT STARS ═══
// On mobile, hover doesn't work — so as the page scrolls we mark whichever
// card (.c/.card) and hint box (.h) is crossing the viewport center band as
// "active", mirroring the desktop :hover styles via .c-active / .h-active in
// globals.css (the latter reuses the same 90° sparkle-rotation as .h:hover).
//
// Cards/hints in BOTH readings are rendered by React (natal cards portal in
// after `reading:hydrated`; the whole synastry view mounts after
// `synastry-ready`), so a one-shot attach on those events races the render and
// misses most nodes. Instead we observe DOM mutations and attach the
// IntersectionObserver to any not-yet-tracked .c/.card/.h as they appear.
// Desktop is skipped: there .h-active would pin the star at 90° and fight :hover.
(function() {
  if (typeof IntersectionObserver === 'undefined') return;
  if (typeof matchMedia === 'undefined' || !matchMedia('(max-width: 720px)').matches) return;
  var BAND = { rootMargin: '-45% 0px -45% 0px' }; // ~10% band around viewport vertical center
  var _hObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(en) { en.target.classList.toggle('h-active', en.isIntersecting); });
  }, BAND);
  var _cObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(en) { en.target.classList.toggle('c-active', en.isIntersecting); });
  }, BAND);
  // Section headers: bloom the section icon while the header crosses center,
  // mirroring the desktop .sh:hover glow (see .sh-active in globals.css).
  var _shObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(en) { en.target.classList.toggle('sh-active', en.isIntersecting); });
  }, BAND);
  function attachObservers() {
    document.querySelectorAll('.c:not([data-c-obs]),.card:not([data-c-obs])').forEach(function(el) {
      el.setAttribute('data-c-obs', '1');
      _cObs.observe(el);
    });
    document.querySelectorAll('.h:not([data-h-obs])').forEach(function(el) {
      el.setAttribute('data-h-obs', '1');
      _hObs.observe(el);
    });
    document.querySelectorAll('.sh:not([data-sh-obs])').forEach(function(el) {
      el.setAttribute('data-sh-obs', '1');
      _shObs.observe(el);
    });
  }
  // Coalesce bursts of mutations (React commits, language re-hydrate) into one
  // attach pass on the next frame.
  var _pending = false;
  function scheduleAttach() {
    if (_pending) return;
    _pending = true;
    requestAnimationFrame(function() { _pending = false; attachObservers(); });
  }
  var _mo = new MutationObserver(scheduleAttach);
  function start() {
    attachObservers();
    _mo.observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();

// ═══ INIT ═══
initObservers();

// ═══ RUNTIME READY SIGNAL ═══
// Signals to React components (HydrationBridge, LoadingRouteClient) that
// all window functions (hydrateReading, startLoading, etc.) are available.
window.__runtimeReady = true;
window.dispatchEvent(new Event('astrolo:runtime-ready'));
