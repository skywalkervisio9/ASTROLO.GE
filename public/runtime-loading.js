// runtime-loading.js — the loading screen (startLoading / finishLoading,
// message + fun-fact rotation, zodiac ring, star-field parallax, section
// picker). Two ways this file runs:
//  * STANDALONE on /loading — it is the ONLY runtime script there (the page
//    references it instead of app-runtime.js), so core functions may
//    not exist: every cross-call below is typeof-guarded, and the readiness
//    signal at EOF is what lib/runtime-ready.ts waits for.
//  * LAZY-LOADED into the full app — core's startLoading stub injects it
//    (goAuthStep(3) demo path). It evaluates after the core, so bare
//    assignments like `authStep = 3` write the core's global bindings.
// CONTRACT: top-level declarations must be `var`/`function` only (a
// top-level let/const colliding with a core binding is a SyntaxError that
// kills the whole file — scripts/build-runtime.mjs enforces this).

// Loading screen
var _loadingLang = 'ka';
var _loadingMsgs = {
  ka: ['ვარსკვლავური კოორდინატების გაანგარიშება…','პლანეტარული პოზიციების მოძიება…','ასპექტების ანალიზი…','სახლების სისტემის აგება…','ელემენტური ბალანსის შეფასება…','კარმული კვანძების ინტერპრეტაცია…','ჩრდილის ინტეგრაციის რუკა…','სულიერი გზის სინთეზი…','შენი ციური ნახაზი მზადდება…'],
  en: ['Calculating stellar coordinates…','Locating planetary positions…','Analysing aspects…','Building house system…','Evaluating elemental balance…','Interpreting karmic nodes…','Mapping shadow integration…','Synthesising spiritual path…','Your celestial blueprint is being prepared…']
};
var _loadingFunFacts = {
  ka: ['თევზები ზოდიაქოს ბოლო ნიშანია — ყველა წინა ნიშნის სიბრძნეს ატარებს.','სატურნის დაბრუნება ~29 წელიწადში ხდება და სიმწიფის ახალ ციკლს იწყებს.','მთვარის კვანძები 18.6 წელიწადში ასრულებენ სრულ ციკლს.','პლუტონი მერწყულში 2024-დან 2044-მდე დარჩება — თაობრივი ტრანსფორმაცია.','ვენერა ციურ სხეულებს შორის ყველაზე სრულყოფილ წრეს ხაზავს — ვარდის ნიმუშს.','ასცენდენტი ყოველ ~2 საათში იცვლება — შენი დაბადების ზუსტი დრო განსაზღვრავს მას.','მერკური წელიწადში 3-4-ჯერ გადადის რეტროგრადულ მოძრაობაში.','ზოდიაქოს 12 ნიშანი 4 ელემენტში იყოფა: ცეცხლი, მიწა, ჰაერი და წყალი.','მზის ნიშანი მხოლოდ ერთი ნაწილია რუკის — მთვარე და ასცენდენტი ერთნაირად მნიშვნელოვანია.','იუპიტერი თითოეულ ნიშანში დაახლოებით ერთ წელიწადს ატარებს.','მთვარის ფაზები 29.5 დღიან ციკლს ქმნიან — ახალი მთვარიდან სავსემდე.','ჩრდილის და თეთრი მთვარის კვანძები ყოველთვის ერთმანეთის ზუსტ საპირისპიროდ დგანან.','მარსი დაახლოებით 2 წელიწადში ერთხელ უბრუნდება რეტროგრადს.','სახლების სისტემა ცის 12 სექტორად ყოფს — თითოეული ცხოვრების სფეროს წარმოადგენს.','ურანი თითოეულ ნიშანში დაახლოებით 7 წელს რჩება.','ნეპტუნი ერთ ნიშანში დაახლოებით 14 წელიწადს ატარებს — თაობრივი გავლენა.'],
  en: ['Pisces is the last sign of the zodiac — it carries the wisdom of all preceding signs.','Saturn return happens every ~29 years and begins a new cycle of maturity.','The lunar nodes complete a full cycle in 18.6 years.','Pluto stays in Aquarius from 2024 to 2044 — a generational transformation.','Venus traces the most perfect circle among celestial bodies — the rose pattern.','The ascendant changes roughly every 2 hours — your exact birth time determines it.','Mercury goes retrograde 3-4 times a year.','The 12 zodiac signs are divided into 4 elements: fire, earth, air, and water.','Your Sun sign is only one part of the chart — Moon and Ascendant matter just as much.','Jupiter spends about one year in each sign.',"The Moon's phases form a 29.5-day cycle — from new moon to full moon.",'The North and South Nodes always sit in exact opposition to each other.','Mars goes retrograde roughly once every two years.','The house system divides the sky into 12 sectors — each representing a different area of life.','Uranus stays in each sign for about 7 years.','Neptune spends about 14 years in each sign — a generational influence.']
};
var _loadingTitles = { ka: 'ვარსკვლავები ლაპარაკობენ…', en: 'The stars are speaking…' };
var _loadingFactLabels = { ka: '✦ იცოდი?', en: '✦ Did you know?' };

// Section picker labels for free tier
var _sectionPickerLabels = {
  ka: { title: 'აირჩიე შენი ბონუს თავი', subtitle: 'უფასო ანგარიშზე მიმოხილვისა და მისიის გარდა, ერთ დამატებით თავს იღებ საჩუქრად' },
  en: { title: 'Choose your bonus chapter', subtitle: 'On a free account, besides Overview and Mission, you get one extra chapter as a gift' }
};
var _sectionPickerSections = {
  ka: { characteristics: 'მახასიათებლები', relationships: 'ურთიერთობები', work: 'საქმე', shadow: 'ჩრდილი', spiritual: 'სამშვინველი', potential: 'სრულყოფილება' },
  en: { characteristics: 'Characteristics', relationships: 'Relationships', work: 'Work', shadow: 'Shadow', spiritual: 'Spiritual', potential: 'Potential' }
};
var _sectionPickerIcons = { characteristics: 'gl-facet', relationships: 'gl-venus', work: 'gl-laurel', shadow: 'gl-moon', spiritual: 'gl-lotus', potential: 'gl-radiant' };
var _selectedFreePick = 'shadow'; // default

function startLoading(lang, durationMs) {
  // Guard against duplicate calls (e.g. React Strict Mode double-invoking the
  // /loading page's effect in dev). Without this, a second call's tickInt/
  // zInt/factInt overwrite window.finishLoading's closure but the first
  // call's intervals keep running uncleared — two out-of-phase fact-rotation
  // timers, which shows up as the fun-fact box jumping again a second later.
  if (window._stopLoadingIntervals) window._stopLoadingIntervals();
  // Same re-entry hazard for the parallax: a second call (Strict Mode dev,
  // regeneration flows) must not leave the previous run's mousemove/gyro
  // listeners and rAF loop alive — that permanently doubles the per-frame
  // style/paint work and reads as "the loading screen lags".
  if (window._stopLoadingParallax) window._stopLoadingParallax();

  _loadingLang = lang || 'ka';
  var loadMsgs = _loadingMsgs[_loadingLang] || _loadingMsgs.ka;
  var funFacts = _loadingFunFacts[_loadingLang] || _loadingFunFacts.ka;

  // If the app is doing real server-side generation, keep the loading overlay
  // active until `window.finishLoading()` is called by the React layer.
  const liveMode = !!window.__ASTROLO_LIVE_LOADING;
  // Standalone on /loading the auth-step UI (core) doesn't exist — the bare
  // `authStep` assignment then just creates a harmless implicit global.
  authStep = 3;
  if (typeof updateAuthStepUI === 'function') updateAuthStepUI();
  document.getElementById('authWrap').style.display = 'none';
  const overlay = document.getElementById('loadingScreen');
  overlay.classList.add('active');

  // Set language-aware static text
  var titleEl = document.querySelector('.loading-title');
  if (titleEl) titleEl.textContent = _loadingTitles[_loadingLang] || _loadingTitles.ka;
  var factLabel = document.querySelector('.fun-fact-label');
  if (factLabel) factLabel.textContent = _loadingFactLabels[_loadingLang] || _loadingFactLabels.ka;

  // Section picker removed

  // Constellation particles
  const con = document.getElementById('constellation'); con.innerHTML = '';
  for (let i = 0; i < 30; i++) {
    const d = document.createElement('div'); d.className = 'c-dot';
    d.style.left = Math.random() * 100 + '%'; d.style.top = (80 + Math.random() * 40) + '%';
    d.style.setProperty('--dur', (6 + Math.random() * 10) + 's');
    d.style.animationDelay = Math.random() * 8 + 's'; con.appendChild(d);
  }

  // Background star field — rendered on ONE <canvas> instead of ~90
  // box-shadow-trailed DOM nodes. The old approach repainted every trail
  // star's 10-20-layer box-shadow on each mousemove frame (measured
  // 137→48 fps on desktop, while mobile — no mouse, gyro rarely granted —
  // never paid it and stayed smooth). Canvas does one composited paint per
  // frame regardless of star count, so desktop matches mobile.
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var csEl = document.getElementById('cosmicStars');
  var csCanvas = null, csCtx = null, csW = 0, csH = 0, csStars = [];
  var haloSprite = null, ghostSprite = null;
  // Desktop's wider canvas makes the same trail strength read as busy — scale
  // it down there, but keep the trails clearly feelable.
  var mmagScale = (window.innerWidth >= 768) ? 0.72 : 1.0;
  var resizeCsCanvas = null;
  // Per-layer alpha falloff for the three trail groups (fast / med / slow),
  // derived from the old box-shadow ghost stacks (globals.css .cs-trail.tg-*)
  // then lengthened and gentled for longer, smoother tails. Length = ghost
  // count; a matching radius grows down the tail so later ghosts overlap into
  // one continuous streak instead of a chain of dots.
  var TRAIL_FAST = [0.72, 0.66, 0.60, 0.54, 0.48, 0.42, 0.36, 0.30, 0.25, 0.20, 0.15, 0.11, 0.07, 0.03];
  var TRAIL_MED = [0.68, 0.63, 0.58, 0.53, 0.49, 0.45, 0.41, 0.37, 0.33, 0.29, 0.25, 0.22, 0.19, 0.16, 0.13, 0.10, 0.08, 0.06, 0.04, 0.02];
  var TRAIL_SLOW = [0.60, 0.57, 0.54, 0.51, 0.48, 0.45, 0.42, 0.39, 0.36, 0.33, 0.30, 0.28, 0.26, 0.24, 0.22, 0.20, 0.18, 0.16, 0.14, 0.12, 0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03];

  // Build a soft radial sprite (white core → transparent) at a given tint.
  // Blitting a cached sprite with a per-use alpha is far cheaper than a live
  // gradient or shadow per star/ghost. A feathered gradient plus a light blur
  // pass gives genuinely soft, diffuse edges (used for both the star glow and
  // the trail ghosts, so it smooths the trails too).
  function makeGlowSprite(r, g, b) {
    var S = 64, c = document.createElement('canvas');
    c.width = S; c.height = S;
    var gx = c.getContext('2d');
    var rgba = function (a) { return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; };
    var grd = gx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grd.addColorStop(0, rgba(1));
    grd.addColorStop(0.18, rgba(0.72));
    grd.addColorStop(0.42, rgba(0.30));
    grd.addColorStop(0.7, rgba(0.08));
    grd.addColorStop(1, rgba(0));
    // Light blur feathers the edge further (ignored where unsupported).
    gx.filter = 'blur(2px)';
    gx.fillStyle = grd; gx.fillRect(0, 0, S, S);
    gx.filter = 'none';
    return c;
  }

  if (csEl) {
    csEl.innerHTML = '';
    csCanvas = document.createElement('canvas');
    csCanvas.style.cssText = 'width:100%;height:100%;display:block';
    csEl.appendChild(csCanvas);
    csCtx = csCanvas.getContext('2d');

    haloSprite = makeGlowSprite(228, 212, 170);  // star glow (0 0 gl rgba(228,212,170,.28))
    ghostSprite = makeGlowSprite(245, 235, 210); // trail ghosts (rgb(245 235 210))

    for (var i = 0; i < 90; i++) {
      // ~30% tagged as trail stars. `depth` ties parallax magnitude to trail
      // feedback: strong-trail stars move more (foreground), untagged ones
      // barely move (deep background). group picks the ghost falloff table.
      var isTrail = Math.random() < 0.3;
      var trailMult = 1, depth, group = null;
      if (isTrail) {
        var r = Math.random();
        group = r < 0.4 ? TRAIL_FAST : r < 0.75 ? TRAIL_MED : TRAIL_SLOW;
        trailMult = 0.55 + Math.random() * 0.85;
        depth = trailMult;
      } else {
        depth = Math.random() * 0.25;
      }
      csStars.push({
        bx: Math.random(), by: Math.random(),
        core: Math.random() * 1.6 + 0.8,   // --sz : crisp dot diameter (px)
        glow: 2.5 + Math.random() * 10,    // --gl : glow radius (px) — wider spread
        // Per-star glow strength so some stars bloom brightly and others barely
        // glow, instead of every halo sharing one alpha.
        glowMult: 0.4 + Math.random() * 1.4,
        depth: depth,
        trail: isTrail, trailMult: trailMult, group: group,
        // csTw twinkle: 0→.65→.65→0 over --tdur, ease-in-out, alternate.
        twDur: (4 + Math.random() * 6) * 1000,
        twDelay: Math.random() * 5000,
      });
    }

    resizeCsCanvas = function() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      csW = csEl.clientWidth; csH = csEl.clientHeight;
      csCanvas.width = Math.max(1, Math.round(csW * dpr));
      csCanvas.height = Math.max(1, Math.round(csH * dpr));
      csCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCsCanvas();
    window.addEventListener('resize', resizeCsCanvas);
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

  // Messages + progress bar — caller can pass explicit duration; defaults to 20s live / 252s demo
  const TOTAL_DURATION = durationMs || (liveMode ? 20000 : 252000);
  const MSG_INTERVAL = TOTAL_DURATION / loadMsgs.length;
  const msgEl = document.getElementById('loadingMsg');
  const fillEl = document.getElementById('loadingFill');
  // `let` (not const): window.rebaseLoading below reassigns this so a
  // mid-generation refresh can resume the bar from the real launch time.
  let startTime = Date.now();
  let lastMsgIdx = -1;

  // Fun-fact rotation. The swap is a soft crossfade: the outgoing line eases
  // down + blurs out, the text is replaced while invisible, then the new line
  // rises into place (see `.fun-fact p` / `.swapping` in globals.css). The
  // <p> carries a reserved min-height so a longer/shorter fact no longer
  // reflows the box — that vertical pop was the "jump" that felt rough.
  let factIdx = Math.floor(Math.random() * funFacts.length);
  document.getElementById('funFactText').textContent = funFacts[factIdx];
  const factInt = setInterval(() => {
    const ft = document.getElementById('funFactText');
    if (!ft) return;
    ft.classList.add('swapping');
    setTimeout(() => {
      // Advance to a *different* fact so the fade always reveals a change.
      let next = factIdx;
      if (funFacts.length > 1) { while (next === factIdx) next = Math.floor(Math.random() * funFacts.length); }
      factIdx = next;
      ft.textContent = funFacts[factIdx];
      ft.classList.remove('swapping');
    }, 460);
  }, 8000);

  function tick() {
    var elapsed = Date.now() - startTime;
    var pct = Math.min(100, elapsed / TOTAL_DURATION * 100);
    fillEl.style.width = pct + '%';

    // Advance message based on elapsed time
    var targetIdx = Math.min(loadMsgs.length - 1, Math.floor(elapsed / MSG_INTERVAL));
    if (liveMode && elapsed > TOTAL_DURATION) {
      // In live mode, loop messages after full duration
      targetIdx = Math.floor((elapsed % TOTAL_DURATION) / MSG_INTERVAL);
      targetIdx = Math.min(loadMsgs.length - 1, targetIdx);
    }
    if (targetIdx !== lastMsgIdx) {
      lastMsgIdx = targetIdx;
      msgEl.style.opacity = '0';
      setTimeout(function() { msgEl.textContent = loadMsgs[targetIdx]; msgEl.style.opacity = '1'; }, 300);
    }

    if (!liveMode && elapsed >= TOTAL_DURATION) {
      clearInterval(tickInt); clearInterval(zInt); clearInterval(factInt);
      window._stopLoadingIntervals = null;
      stopParallax();
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.classList.remove('active'); overlay.style.opacity = '';
          document.getElementById('authWrap').style.display = 'flex';
          // Demo-mode completion returns to the app shell — core functions
          // that don't exist standalone on /loading are typeof-guarded.
          if (typeof switchView === 'function') switchView('natal', document.getElementById('devNatal'));
          if (typeof goAuthStep === 'function') goAuthStep(1);
          if (typeof showAuthPage === 'function') showAuthPage('page-login');
        }, 600);
      }, 1500);
    }
  }
  tick();
  const tickInt = setInterval(tick, 1000);
  window._stopLoadingIntervals = function() {
    clearInterval(tickInt); clearInterval(zInt); clearInterval(factInt);
  };

  // Resume support: on a mid-generation refresh the bar would otherwise restart
  // at 0. The React layer reads the server's generation_started_at and calls
  // this with the real elapsed time so the bar (and message index) pick up
  // where the in-flight run actually is. `elapsedMs` = now − launchTime; we
  // only ever move startTime backwards (never let a stale/forward value snap
  // the bar down), and clamp so a very old launch just sits near-full while
  // polling continues.
  window.rebaseLoading = function(elapsedMs) {
    if (typeof elapsedMs !== 'number' || !isFinite(elapsedMs) || elapsedMs <= 0) return;
    var candidate = Date.now() - elapsedMs;
    if (candidate < startTime) { startTime = candidate; tick(); }
  };

  // Parallax + twinkle. Cursor / gyro sets a target offset; each star eases
  // toward it (scaled by its --depth) and twinkles continuously. Motion
  // magnitude (mmag) fades the trail streaks in only while moving. Everything
  // is drawn to the canvas — one composited paint per frame — so this loop
  // costs the same on desktop as it does on mobile.
  let pxT = 0, pyT = 0, pxC = 0, pyC = 0, prRaf = 0;
  var trailHist = []; var BUF_MAX = 60;
  var mmag = 0, sVx = 0, sVy = 0, prevX = 0, prevY = 0;
  var PARALLAX_RANGE = 34;
  var csAnimating = false;

  // csTw twinkle reproduced exactly: keyframes 0→.65 (0-20%), hold .65
  // (20-80%), .65→0 (80-100%), ease-in-out, `alternate` (so the timeline
  // reflects every --tdur, full period 2·tdur). Peak opacity 0.65.
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function twinkle(now, dur, delay) {
    var u = (now + delay) / dur;          // cycles of length `dur`
    var f = u - Math.floor(u / 2) * 2;    // 0..2
    if (f > 1) f = 2 - f;                 // `alternate` fold → 0..1 triangle
    if (f < 0.2) return 0.65 * easeInOut(f / 0.2);
    if (f > 0.8) return 0.65 * easeInOut((1 - f) / 0.2);
    return 0.65;
  }

  function renderStars(offX, offY, motion) {
    if (!csCtx) return;
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    csCtx.clearRect(0, 0, csW, csH);

    // Motion-feedback trails — dense ghost copies of each tagged star at the
    // container's recent past offsets (base + pastOffset·depth), one per frame
    // back (stride 1). Per-ghost alpha = mmag · mmag-scale · trail-mult · the
    // group's falloff table; ghost radius grows so the tail softens. This is
    // the box-shadow ghost stack from globals.css, drawn on canvas.
    if (motion > 0.008) {
      for (var i = 0; i < csStars.length; i++) {
        var st = csStars[i];
        if (!st.trail) continue;
        var g = st.group, len = g.length;
        var dep = st.depth, bx = st.bx * csW, by = st.by * csH;
        var base = motion * mmagScale * st.trailMult;
        for (var k = 1; k <= len; k++) {
          var a = base * g[k - 1];
          if (a <= 0.004) continue;
          var p = trailHist[k] || trailHist[trailHist.length - 1];
          if (!p) break;
          // radius grows along the tail so later ghosts overlap into a smooth
          // continuous streak rather than a chain of dots.
          var rad = 1.0 + (k - 1) / len * 3.6;
          csCtx.globalAlpha = a;
          csCtx.drawImage(ghostSprite, bx + p.x * dep - rad, by + p.y * dep - rad, rad * 2, rad * 2);
        }
      }
    }

    // Stars: faint warm halo (0 0 gl rgba(228,212,170,.28)) + crisp core dot
    // (rgba(245,235,210,.85), diameter --sz). Both scaled by the twinkle.
    for (var j = 0; j < csStars.length; j++) {
      var s = csStars[j];
      var tw = twinkle(now, s.twDur, s.twDelay);
      if (tw <= 0.002) continue;
      var dx = s.bx * csW + offX * s.depth;
      var dy = s.by * csH + offY * s.depth;
      // Halo: soft glow sprite, sized by --gl and scaled per-star (glowMult)
      // so glow strength varies star to star. Low base alpha keeps it faint.
      var hr = s.core / 2 + s.glow * 0.9;
      csCtx.globalAlpha = 0.15 * s.glowMult * tw;
      csCtx.drawImage(haloSprite, dx - hr, dy - hr, hr * 2, hr * 2);
      // Crisp core.
      csCtx.globalAlpha = 0.85 * tw;
      csCtx.fillStyle = 'rgb(245,235,210)';
      csCtx.beginPath();
      csCtx.arc(dx, dy, s.core / 2, 0, 6.2832);
      csCtx.fill();
    }
    csCtx.globalAlpha = 1;
  }

  function applyParallax() {
    // Lower ease = floatier, smoother glide (stars trail the cursor gently
    // rather than snapping to it).
    pxC += (pxT - pxC) * 0.065;
    pyC += (pyT - pyC) * 0.065;
    var curX = -pxC * PARALLAX_RANGE, curY = -pyC * PARALLAX_RANGE;
    trailHist.unshift({ x: curX, y: curY });
    if (trailHist.length > BUF_MAX) trailHist.pop();
    var rawVx = curX - prevX, rawVy = curY - prevY;
    sVx += (rawVx - sVx) * 0.5; sVy += (rawVy - sVy) * 0.5;
    var d = Math.sqrt(sVx * sVx + sVy * sVy);
    var target = 1 - Math.exp(-d * 0.55);
    // Fast attack (trails appear at once), gentler decay so they linger and
    // fade out smoothly rather than snapping off.
    mmag += (target - mmag) * (target > mmag ? 0.32 : 0.04);
    prevX = curX; prevY = curY;
    renderStars(curX, curY, mmag);
    // Twinkle needs a continuous loop (unlike the old CSS-animated twinkle),
    // so keep rendering while the loader is active. rAF self-throttles when the
    // tab is hidden.
    prRaf = csAnimating ? requestAnimationFrame(applyParallax) : 0;
  }
  function startStarLoop() {
    if (csAnimating || !csCtx) return;
    csAnimating = true;
    prRaf = requestAnimationFrame(applyParallax);
  }
  function onPrMouse(e) {
    if (prefersReducedMotion) return;
    // Negated so stars follow the cursor on desktop (cursor right → stars shift
    // right); the gyro path keeps the natural "head-fixed, world tilts" feel.
    pxT = -((e.clientX / window.innerWidth) * 2 - 1);
    pyT = -((e.clientY / window.innerHeight) * 2 - 1);
  }
  function onPrTilt(e) {
    if (prefersReducedMotion) return;
    var g = e.gamma == null ? 0 : Math.max(-25, Math.min(25, e.gamma)) / 25;
    var b = e.beta == null ? 0 : Math.max(-25, Math.min(25, e.beta - 20)) / 25;
    pxT = g; pyT = b;
  }
  function stopParallax() {
    csAnimating = false;
    if (prRaf) cancelAnimationFrame(prRaf);
    prRaf = 0;
    overlay.removeEventListener('mousemove', onPrMouse);
    // Match both phases — we attach with `true` (capture) after iOS permission
    // grant, and without it on Android/desktop fallback path.
    window.removeEventListener('deviceorientation', onPrTilt, true);
    window.removeEventListener('deviceorientation', onPrTilt);
    if (resizeCsCanvas) window.removeEventListener('resize', resizeCsCanvas);
    if (window._stopLoadingParallax === stopParallax) window._stopLoadingParallax = null;
  }
  window._stopLoadingParallax = stopParallax;
  if (prefersReducedMotion) {
    // Static field: paint once, no loop, no input listeners.
    renderStars(0, 0, 0);
  } else {
    overlay.addEventListener('mousemove', onPrMouse);
    // iOS 13+ gates deviceorientation behind a permission prompt triggered by
    // a user gesture — and only attaches AFTER the prompt resolves. Attaching
    // before grant (the previous bug) means the listener silently never fires.
    // Android/desktop don't gate, so the orientation listener attaches now.
    var DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      var askGyro = function() {
        overlay.removeEventListener('touchstart', askGyro);
        overlay.removeEventListener('click', askGyro);
        DOE.requestPermission()
          .then(function(state) {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', onPrTilt, true);
            }
          })
          .catch(function() { /* user denied — no parallax on mobile, still works on desktop */ });
      };
      overlay.addEventListener('touchstart', askGyro, { once: true, passive: true });
      overlay.addEventListener('click', askGyro, { once: true });
    } else {
      window.addEventListener('deviceorientation', onPrTilt, true);
    }
    startStarLoop();
  }

  // Expose a completion hook for the React layer.
  window.finishLoading = function finishLoading() {
    try {
      clearInterval(tickInt); clearInterval(zInt); clearInterval(factInt);
      window._stopLoadingIntervals = null;
      stopParallax();
      // Snap progress bar to 100%
      fillEl.style.width = '100%';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.classList.remove('active'); overlay.style.opacity = '';
        document.getElementById('authWrap').style.display = 'flex';
        // Guarded: on /loading (standalone) React navigates away instead.
        if (typeof switchView === 'function') switchView('natal', document.getElementById('devNatal'));
      }, 600);
    } catch (e) {
      console.error('finishLoading failed', e);
    } finally {
      window.__ASTROLO_LIVE_LOADING = false;
    }
  };
}

// Build section picker inside loading overlay
function _buildSectionPicker(liveMode) {
  var container = document.getElementById('sectionPicker');
  if (!container) return;
  if (!liveMode) { container.style.display = 'none'; return; }

  var lang = _loadingLang;
  var labels = _sectionPickerLabels[lang] || _sectionPickerLabels.ka;
  var sections = _sectionPickerSections[lang] || _sectionPickerSections.ka;
  var keys = ['characteristics','relationships','work','shadow','spiritual','potential'];

  var html = '<div class="sp-title">' + labels.title + '</div>';
  html += '<div class="sp-subtitle">' + labels.subtitle + '</div>';
  html += '<div class="sp-options">';
  keys.forEach(function(key) {
    var iconId = _sectionPickerIcons[key] || 'gl-sparkle';
    var isSelected = key === _selectedFreePick;
    html += '<button class="sp-btn' + (isSelected ? ' selected' : '') + '" data-pick="' + key + '">';
    html += '<svg class="sp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><use href="#' + iconId + '"/></svg>';
    html += '<span>' + sections[key] + '</span>';
    html += '</button>';
  });
  html += '</div>';
  container.innerHTML = html;
  container.style.display = '';

  // Bind click handlers
  container.querySelectorAll('.sp-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      _selectedFreePick = btn.getAttribute('data-pick');
      container.querySelectorAll('.sp-btn').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
    });
  });
}

// Standalone on /loading this chunk IS the runtime: whenRuntimeReady() gates
// on this signal. Guarded so lazy-loading alongside the full core (which
// already signalled) doesn't re-dispatch.
if (!window.__runtimeReady) {
  window.__runtimeReady = true;
  window.dispatchEvent(new Event('astrolo:runtime-ready'));
}
