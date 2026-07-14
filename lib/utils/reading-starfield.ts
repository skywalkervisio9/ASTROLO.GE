// ============================================================
// Reading starfield — the individual (natal) reading's ambient parallax +
// trail stars, ported from public/app-runtime.js so the React synastry
// surfaces (dev preview, public /s/[slug] share) render the SAME field.
//
// Three depth layers, each holding one viewport-tall tile of stars plus a
// clone one tile below for seamless wrap. ~25% of stars sprout a motion-trail
// (.tr). A scroll-driven rAF loop writes --wy per layer (wrapped parallax
// offset) + --mmag/--mdir on the container (trail length + direction); the
// compositor does the rest via .star-layer / .star.tr::after in globals.css.
// The loop only runs while scrolling (+ a short decay), so it costs nothing at
// rest, and is fully disabled under prefers-reduced-motion.
// ============================================================

const DEPTHS = [0.07, 0.12, 0.17];
const PER_TILE = 16; // stars per tile per layer (≈ what's visible at once)

function buildLayers(container: HTMLElement): void {
  DEPTHS.forEach((depth) => {
    const layer = document.createElement('div');
    layer.className = 'star-layer';
    layer.style.setProperty('--depth', depth.toFixed(3));
    for (let i = 0; i < PER_TILE; i++) {
      const left = Math.random() * 100;
      const top = Math.random() * 100;          // within one tile
      const d = 2 + Math.random() * 4;
      const delay = Math.random() * 5;
      const tr = Math.random() < 0.25;          // ~25% sprout a motion-trail
      const roll = Math.random();               // size variety
      const size = roll < 0.15 ? 3 : roll > 0.75 ? 1 : 2;
      for (let k = 0; k < 2; k++) {             // original + clone one tile down
        const s = document.createElement('div');
        s.className = tr ? 'star tr' : 'star';
        s.style.left = `${left}%`;
        s.style.top = `${top + k * 100}%`;
        s.style.setProperty('--d', `${d}s`);
        s.style.animationDelay = `${delay}s`;
        if (size !== 2) { s.style.width = `${size}px`; s.style.height = `${size}px`; }
        layer.appendChild(s);
      }
    }
    container.appendChild(layer);
  });
}

/**
 * Populate `container` with the reading starfield and start the scroll
 * parallax + trail loop. Returns a cleanup that stops the loop and removes
 * listeners (call it on unmount). Safe to call with a null container.
 */
export function initReadingStarfield(container: HTMLElement | null): () => void {
  const noop = () => {};
  if (!container || typeof window === 'undefined') return noop;
  if (!container.childElementCount) buildLayers(container);

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return noop;

  const layers = Array.from(container.querySelectorAll<HTMLElement>('.star-layer')).map((el) => ({
    el,
    depth: parseFloat(el.style.getPropertyValue('--depth')) || 0,
  }));
  if (!layers.length) return noop;

  const isTouch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const EASE = isTouch ? 0.11 : 0.16;   // lower = smoother drift, hides coarse steps
  const SPD = isTouch ? 70 : 40;        // higher = shorter trail per unit scroll speed
  const ATK = isTouch ? 0.28 : 0.4;     // trail attack (rise) rate

  let tile = window.innerHeight || 800;
  let snap = false;
  let curY = window.scrollY;
  let mmag = 0;
  let dir = 1;
  let running = false;
  let idle = 0;
  let rafId = 0;

  const applyWrap = () => {
    for (let i = 0; i < layers.length; i++) {
      const off = ((curY * layers[i].depth) % tile + tile) % tile;
      layers[i].el.style.setProperty('--wy', `${(-off).toFixed(2)}px`);
    }
  };

  const frame = () => {
    const targetY = window.scrollY;
    if (snap) { snap = false; curY = targetY; applyWrap(); rafId = requestAnimationFrame(frame); return; }
    const prevY = curY;
    curY += (targetY - curY) * EASE;
    const rawV = curY - prevY;
    if (Math.abs(rawV) > 0.5) dir = rawV > 0 ? 1 : -1;
    const speed = Math.min(1, Math.abs(rawV) / SPD);
    mmag += (speed - mmag) * (speed > mmag ? ATK : 0.08);
    applyWrap();
    container.style.setProperty('--mmag', mmag.toFixed(3));
    container.style.setProperty('--mdir', String(dir));
    if (Math.abs(targetY - curY) < 0.5 && mmag < 0.004) idle++; else idle = 0;
    if (idle > 6) {
      running = false;
      curY = targetY;
      applyWrap();
      container.style.setProperty('--mmag', '0');
      return;
    }
    rafId = requestAnimationFrame(frame);
  };

  const ensure = () => { if (!running) { running = true; rafId = requestAnimationFrame(frame); } };
  const onResize = () => { tile = window.innerHeight || 800; snap = true; ensure(); };

  applyWrap();
  window.addEventListener('scroll', ensure, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize, { passive: true });

  return () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('scroll', ensure);
    window.removeEventListener('resize', onResize);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize);
  };
}
