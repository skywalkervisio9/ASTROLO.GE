// runtime-extras.js — payment / invite / share cluster, lazily injected by the
// self-replacing stubs in prototype-runtime.js (warmed at idle, loaded at the
// latest on first use).
//
// CONTRACT — read before editing:
//  * Top-level declarations MUST be `function` declarations only. They need to
//    overwrite the core's window-property stubs, and a top-level let/const that
//    collides with a core binding is a SyntaxError that kills this whole file
//    (scripts/build-runtime.mjs enforces this).
//  * This file is only ever evaluated AFTER prototype-runtime.js, so it can
//    read the core's globals directly via the shared global scope:
//    discountOn, currentAccountType, selectedInviteType, getSlot1Occupied(),
//    closeSidebar(), switchView(), _currentUser.
//  * `selectedInviteType`'s declaration stays in the core on purpose — bare
//    assignments here write the core's global lexical binding, which core's
//    generateInviteLink also reads. Do not redeclare it here.
//  * generateInviteLink is intentionally NOT here: components/AuthBridge.tsx
//    overrides it on window with the real backend implementation, and its
//    re-wire polling stops ~8 s after mount — a late-loading copy here would
//    permanently clobber that override.

// ═══ DISCOUNT TOGGLE ═══
function toggleDiscount(btn) {
  discountOn = !discountOn;
  btn.classList.toggle('active', discountOn);
  // Update payment page prices
  const oldPrice = document.getElementById('payOldPrice');
  const amount = document.getElementById('payAmount');
  const discBadge = document.getElementById('payDiscountBadge');
  const ctaText = document.getElementById('payCtaText');
  var pfx = document.body.classList.contains('lang-en') ? '✦ Unlock PREMIUM — ' : '✦ PREMIUM-ის განბლოკვა — ';
  if (discountOn) {
    if (oldPrice) oldPrice.style.display = '';
    if (amount) amount.textContent = '₾10';
    if (discBadge) discBadge.style.display = '';
    if (ctaText) ctaText.textContent = pfx + '₾10';
  } else {
    if (oldPrice) oldPrice.style.display = 'none';
    if (amount) amount.textContent = '₾15';
    if (discBadge) discBadge.style.display = 'none';
    if (ctaText) ctaText.textContent = pfx + '₾15';
  }
}

// ═══ PAYMENT PAGES ═══
function showPaymentPage(type) {
  // Guests (public reading view) aren't logged in, so payment/promo calls
  // would 401. Send them to /auth to sign in first — mirrors openSidebar.
  if (window.__ASTROLO_PUBLIC_VIEW) {
    window.location.href = '/auth';
    return;
  }
  // Hide all payment sub-pages
  document.getElementById('payPremium').style.display = 'none';
  document.getElementById('payNatalUnlock').style.display = 'none';
  document.getElementById('paySynastrySlot').style.display = 'none';
  const ctaText = document.getElementById('payCtaText');

  var isEn = document.body.classList.contains('lang-en');
  if (type === 'premium') {
    document.getElementById('payPremium').style.display = '';
    // CTA text is driven by the React promo effect in BodyContent.tsx —
    // don't overwrite it here, or it'll fall out of sync with the selected
    // promo code (e.g. skywalker would still show ₾10).
  } else if (type === 'natal-unlock') {
    document.getElementById('payNatalUnlock').style.display = '';
    ctaText.textContent = isEn ? '✦ Unlock natal chart — ₾5' : '✦ ნატალური რუკის განბლოკვა — ₾5';
  } else if (type === 'synastry-slot') {
    document.getElementById('paySynastrySlot').style.display = '';
    ctaText.textContent = isEn ? '✦ Unlock slot — ₾5' : '✦ სლოტის განბლოკვა — ₾5';
  }

  // Expose the active sub-page so React's promo effect can apply the right
  // base price + discount (premium ₾15 vs natal-unlock ₾5).
  var payView = document.getElementById('paymentView');
  if (payView) payView.setAttribute('data-pay-page', type);

  switchView('payment');
}

function selectPayMethod(method, el) {
  document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('selected'));
  el.classList.add('selected');
}

// ═══ INVITE MODAL ═══
// `prepaid` = true when the caller is the slot 2+ "სინასტრია" CTA, where the
// slot was already paid for. We show a "დამატებითი სინასტრია" label without
// the ₾5 price (the user already paid for the extra slot).
function openInviteModal(prepaid) {
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
    // `needsPurchase` = an extra synastry slot the user hasn't paid for yet.
    // In that state the CTA must lead to the ₾5 slot purchase, not link
    // generation — React reads data-invite-mode to switch the button.
    var needsPurchase = !prepaid && getSlot1Occupied();
    if (prepaid) {
      // Slot already purchased — label only, no price tag.
      priceTag.textContent = 'დამატებითი სინასტრია';
      priceTag.classList.add('show');
    } else if (getSlot1Occupied()) {
      // Slot 1 used and no prepaid slot → ₾5 price tag for the next one.
      priceTag.textContent = '₾5 — დამატებითი სინასტრია';
      priceTag.classList.add('show');
    }
    modal.setAttribute('data-invite-mode', needsPurchase ? 'purchase' : 'normal');
  }
  modal.classList.add('open');
}
function closeInviteModal() { document.getElementById('inviteModal').classList.remove('open'); }
function selectInviteType(type, el) {
  selectedInviteType = type;
  document.querySelectorAll('.invite-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  var genBtn = document.getElementById('inviteGenBtn');
  genBtn.disabled = false;
  // In purchase mode the React label/handler turn this into the ₾5 slot buy —
  // don't clobber it with the link-generation copy.
  var modal = document.getElementById('inviteModal');
  if (!modal || modal.getAttribute('data-invite-mode') !== 'purchase') {
    genBtn.textContent = type === 'couple' ? 'ბმულის შექმნა (მეწყვილე)' : 'ბმულის შექმნა (მეგობარი)';
  }
  document.getElementById('inviteLinkBox').classList.remove('show');
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

// "Unlock Full Analysis" CTA on locked natal sections. Only ever shown to
// free + invited tiers (paid tiers already have the full natal chart). Invited
// users were brought in by someone else's payment — their synastry slot is
// already filled — so this CTA must open the standalone ₾5 natal unlock page,
// NOT the synastry invite modal that showUpgrade() routes paid tiers to.
function unlockFullReading() {
  if (currentAccountType === 'invited') {
    showPaymentPage('natal-unlock');
  } else {
    showPaymentPage('premium');
  }
}

// ═══ SHARE ═══
function _shareTitle() {
  // Owner's name personalises the share, matching the /r/[slug] link-preview
  // card ("ASTROLO.GE — {name}"). Falls back to a generic title when the
  // name isn't known (e.g. guest view or profile not yet hydrated).
  const u = _currentUser || {};
  const name = ((u.full_name || '').trim()) || (u.email ? u.email.split('@')[0] : '');
  if (name) return 'ASTROLO.GE — ' + name;
  const view = document.body.getAttribute('data-view');
  return view === 'synastry' ? 'ASTROLO.GE — სინასტრია' : 'ASTROLO.GE — ჩემი ნატალური რუკა';
}
function _doShareReading() {
  const url = window.location.href;
  const title = _shareTitle();
  if (navigator.share) { navigator.share({ title, url }).catch(() => {}); }
  else { navigator.clipboard?.writeText(url); }
}
function shareReading() {
  // A private reading isn't viewable by anyone with the link, so sharing one
  // is a dead end. Instead, send the owner to Settings and pulse the
  // public/private toggle so they can flip it before sharing.
  fetch('/api/reading/visibility', { credentials: 'include' })
    .then(function(r) { return r.ok ? r.json() : { isPublic: true }; })
    .then(function(d) {
      if (d && d.isPublic === false && typeof window.openSettings === 'function') {
        window.openSettings({ highlightPrivacy: true });
        return;
      }
      _doShareReading();
    })
    .catch(function() { _doShareReading(); });
}
function _flashShareIcon(btn) {
  // Brief ✓ confirmation, mirroring copyInviteLink's feedback.
  if (!btn || btn._copied) return;
  btn._copied = true;
  const orig = btn.innerHTML;
  btn.innerHTML = '<span style="font-size:13px;line-height:1;color:var(--gold)">✓</span>';
  setTimeout(function() { btn.innerHTML = orig; btn._copied = false; }, 1500);
}
function shareToSocial(platform, btn) {
  const rawUrl = window.location.href;
  const url = encodeURIComponent(rawUrl);
  const title = _shareTitle();
  const text = encodeURIComponent(title);
  if (platform === 'ig' || platform === 'tt') {
    // Neither Instagram nor TikTok has a web link-share endpoint (unlike
    // Facebook/Telegram). On devices with a native share sheet, let the user
    // pick the app; otherwise copy the link so they can paste it into a
    // story/bio/DM/profile.
    if (navigator.share) {
      navigator.share({ title: title, url: rawUrl }).catch(function() {});
    } else {
      navigator.clipboard?.writeText(rawUrl);
      _flashShareIcon(btn);
    }
    return;
  }
  const urls = {
    fb: 'https://www.facebook.com/sharer/sharer.php?u=' + url,
    tg: 'https://t.me/share/url?url=' + url + '&text=' + text
  };
  window.open(urls[platform], '_blank', 'width=600,height=400');
}
