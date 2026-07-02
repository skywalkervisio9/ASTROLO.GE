// runtime-loading.js — the loading screen (startLoading / finishLoading,
// message + fun-fact rotation, zodiac ring, star-field parallax, section
// picker). Two ways this file runs:
//  * STANDALONE on /loading — it is the ONLY runtime script there (the page
//    references it instead of prototype-runtime.js), so core functions may
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

  // Background star field (parallax target)
  const csEl = document.getElementById('cosmicStars');
  if (csEl) {
    csEl.innerHTML = '';
    for (let i = 0; i < 90; i++) {
      const s = document.createElement('div'); s.className = 'cs-star';
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.setProperty('--sz', (Math.random() * 1.6 + 0.8).toFixed(2) + 'px');
      s.style.setProperty('--gl', (3 + Math.random() * 6).toFixed(1) + 'px');
      s.style.setProperty('--tdur', (4 + Math.random() * 6).toFixed(1) + 's');
      s.style.setProperty('--td', (Math.random() * 5).toFixed(1) + 's');
      s.style.setProperty('--td2', (Math.random() * 1.2).toFixed(2) + 's');
      // Tag ~45% of stars with motion-trail. Trail shape reflects actual
      // motion path (stride 1 = every frame back, no gaps to read as dots).
      // Each star picks one of three groups (fast/med/slow) for tail length,
      // and --trail-mult varies brightness so the field isn't uniform.
      //
      // --depth ties parallax magnitude to trail feedback: a star that leaves
      // a strong trail also moves more (foreground), a star that leaves a
      // faint trail moves less (mid-ground), and untagged stars stay nearly
      // static (deep background). The container itself no longer translates;
      // CSS multiplies --csx/--csy by --depth per-star.
      if (Math.random() < 0.45) {
        s.classList.add('cs-trail');
        var r = Math.random();
        s.classList.add(r < 0.4 ? 'tg-fast' : r < 0.75 ? 'tg-med' : 'tg-slow');
        var mult = 0.55 + Math.random() * 0.85;
        s.style.setProperty('--trail-mult', mult.toFixed(2));
        s.style.setProperty('--depth', mult.toFixed(2));
      } else {
        // Background stars: tiny parallax so the depth pillow feels real
        // but they don't compete with the trail stars for attention.
        s.style.setProperty('--depth', (Math.random() * 0.25).toFixed(2));
      }
      csEl.appendChild(s);
    }
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
  const startTime = Date.now();
  let lastMsgIdx = -1;

  document.getElementById('funFactText').textContent = funFacts[Math.floor(Math.random() * funFacts.length)];
  const factInt = setInterval(() => {
    const ff = document.getElementById('funFact'); ff.style.opacity = '0';
    setTimeout(() => { document.getElementById('funFactText').textContent = funFacts[Math.floor(Math.random() * funFacts.length)]; ff.style.opacity = '1'; }, 400);
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

  // Parallax: stars shift opposite to cursor / device tilt, eased via rAF.
  // Mouse drives desktop; deviceorientation drives mobile gyro.
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pxT = 0, pyT = 0, pxC = 0, pyC = 0, prRaf = 0;
  // Particle trail state — push container offset every frame into a 60-deep
  // ring buffer of past positions, then expose t1..t56 vars (delta from
  // current to that-many-frames-ago) every frame. Each star's CSS chooses
  // a *subset* of those vars to render as box-shadow ghosts; that subset
  // determines whether the star reads as a snappy short streak, a medium
  // tail, or a long lingering plume — giving the field per-star fluidity
  // variety without anyone star losing the dynamic curving behaviour.
  var trailHist = []; var BUF_MAX = 60;
  // We sample every frame and write through t20 — that's the deepest index
  // the slowest trail group reads (~333ms back, stride 1 throughout). Dense
  // sampling with no gaps is what makes the trail read as a continuous
  // streak instead of a dot pattern.
  var WRITE_MAX = 20;
  var mmag = 0;
  // Smoothed velocity source — faster low-pass (0.5) so quick wiggles still
  // register as motion. Final mmag has its own ease layer for extra smoothness.
  var sVx = 0, sVy = 0, prevX = 0, prevY = 0;
  var PARALLAX_RANGE = 24;
  function applyParallax() {
    pxC += (pxT - pxC) * 0.08;
    pyC += (pyT - pyC) * 0.08;
    if (csEl) {
      var curX = -pxC * PARALLAX_RANGE, curY = -pyC * PARALLAX_RANGE;
      csEl.style.setProperty('--csx', curX.toFixed(2) + 'px');
      csEl.style.setProperty('--csy', curY.toFixed(2) + 'px');
      trailHist.unshift({ x: curX, y: curY });
      if (trailHist.length > BUF_MAX) trailHist.pop();
      for (var i = 1; i <= WRITE_MAX; i++) {
        var p = trailHist[i] || trailHist[trailHist.length - 1];
        if (p) {
          csEl.style.setProperty('--t' + i + 'x', (p.x - curX).toFixed(1) + 'px');
          csEl.style.setProperty('--t' + i + 'y', (p.y - curY).toFixed(1) + 'px');
        }
      }
      var rawVx = curX - prevX, rawVy = curY - prevY;
      sVx += (rawVx - sVx) * 0.5; sVy += (rawVy - sVy) * 0.5;
      var d = Math.sqrt(sVx * sVx + sVy * sVy);
      var target = 1 - Math.exp(-d * 0.55);
      mmag += (target - mmag) * (target > mmag ? 0.32 : 0.05);
      csEl.style.setProperty('--mmag', mmag.toFixed(3));
      prevX = curX; prevY = curY;
    }
    if (Math.abs(pxT - pxC) > 0.001 || Math.abs(pyT - pyC) > 0.001 || mmag > 0.005) {
      prRaf = requestAnimationFrame(applyParallax);
    } else { prRaf = 0; }
  }
  function schedulePr() { if (!prRaf) prRaf = requestAnimationFrame(applyParallax); }
  function onPrMouse(e) {
    if (prefersReducedMotion) return;
    // Negated vs the gyro path: stars should follow the cursor on desktop
    // (cursor right → stars shift right), not parallax-shift opposite.
    // The gyro handler keeps the natural "head-fixed, world tilts" feel.
    pxT = -((e.clientX / window.innerWidth) * 2 - 1);
    pyT = -((e.clientY / window.innerHeight) * 2 - 1);
    schedulePr();
  }
  function onPrTilt(e) {
    if (prefersReducedMotion) return;
    const g = e.gamma == null ? 0 : Math.max(-25, Math.min(25, e.gamma)) / 25;
    const b = e.beta == null ? 0 : Math.max(-25, Math.min(25, e.beta - 20)) / 25;
    pxT = g; pyT = b;
    schedulePr();
  }
  function stopParallax() {
    if (prRaf) cancelAnimationFrame(prRaf);
    prRaf = 0;
    overlay.removeEventListener('mousemove', onPrMouse);
    // Match both phases — we attach with `true` (capture) after iOS permission
    // grant, and without it on Android/desktop fallback path.
    window.removeEventListener('deviceorientation', onPrTilt, true);
    window.removeEventListener('deviceorientation', onPrTilt);
  }
  if (!prefersReducedMotion) {
    overlay.addEventListener('mousemove', onPrMouse);
    // iOS 13+ gates deviceorientation behind a permission prompt triggered by
    // a user gesture — and only attaches AFTER the prompt resolves. Attaching
    // before grant (the previous bug) means the listener silently never fires.
    // Android/desktop don't gate, so the orientation listener attaches now.
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      const askGyro = function() {
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
