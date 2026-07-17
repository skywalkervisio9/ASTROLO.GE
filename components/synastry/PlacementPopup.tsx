'use client';

import React, { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const FINE_POINTER_Q = '(hover: hover) and (pointer: fine)';

function subscribeFinePointer(cb: () => void) {
  const mq = window.matchMedia(FINE_POINTER_Q);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/**
 * True on devices with a real hovering cursor. Mirrors the matchMedia gate the
 * runtime uses (app-runtime.js:1589) to keep touch devices click-only.
 * Server snapshot is `false` — assume touch, so nothing hover-only is rendered
 * server-side and the first client paint can only ever add affordances.
 */
export function useFinePointer(): boolean {
  return useSyncExternalStore(
    subscribeFinePointer,
    () => window.matchMedia(FINE_POINTER_Q).matches,
    () => false,
  );
}

export interface PopSpec {
  popClass: string;
  title: React.ReactNode;
  body: string;
  /** Preferred side of the anchor. Flipped only when the group won't fit. */
  place: 'above' | 'below';
}

const GAP = 8;
const HEADER = 60; // the fixed top nav that _showPopup also avoids
const EDGE = 8;
const POPUP_W = 275; // 260px popup + right-edge breathing room, as _showPopup uses
const HOVER_CLOSE_GRACE = 200; // mirrors app-runtime.js:1591

/**
 * The React twin of app-runtime.js's _showPopup (:1377), for the synastry
 * surfaces the runtime never loads (/s/[slug], /synastry-preview).
 *
 * Renders one OR two popups against a shared anchor: on touch a single tap on a
 * partner-card row surfaces both the placement and its sign, so they're laid out
 * as a group (one above, one below) and can never cover each other.
 *
 * Reuses the runtime's popup CSS verbatim — .el-popup / .planet-pop / .sign-pop
 * in globals.css, including the fade+rise driven by adding .show on the next
 * frame — so the two implementations can't drift visually.
 *
 * The triggers deliberately do NOT reuse the runtime's classes (.pl-btn /
 * .cp-btn / .sign-td): in the in-app shell both systems are live at once, and
 * the runtime's document-level listener would open a second, unmanaged popup on
 * the same click.
 */
export default function PlacementPopups({ anchor, specs, onClose }: {
  anchor: HTMLElement;
  specs: PopSpec[];
  onClose: () => void;
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const finePointer = useFinePointer();

  // Placement and reveal are driven straight on the nodes rather than through
  // state: a popup has to be rendered before it can be measured, so routing its
  // geometry back through React would only cascade an extra render.
  useLayoutEffect(() => {
    const nodes = specs.map((_, i) => refs.current[i]).filter((n): n is HTMLDivElement => !!n);
    if (!nodes.length) return;

    // .el-popup transitions `all`, and these nodes render parked offscreen so
    // they can be measured. Measuring forces a layout at that parked spot, which
    // makes it the transition's start value — so the placement write below would
    // be interpolated and the popup would visibly fly in from the corner,
    // diagonally. Suppress transitions across the placement, then restore them,
    // leaving only the fade+rise to play (the planet table gets this for free:
    // its fresh nodes start at left/top:auto, which isn't interpolatable).
    for (const n of nodes) n.style.transition = 'none';

    const r = anchor.getBoundingClientRect();
    const pick = (side: PopSpec['place']) =>
      specs.map((s, i) => (s.place === side ? refs.current[i] : null))
        .filter((n): n is HTMLDivElement => !!n);
    const stackH = (ns: HTMLDivElement[]) => ns.reduce((h, n) => h + n.offsetHeight + GAP, 0);

    let above = pick('above');
    let below = pick('below');

    // Flip a whole group, never a single popup: moving one across would land it
    // straight on top of whatever already occupies the other side.
    if (above.length && r.top - stackH(above) < HEADER) {
      below = [...below, ...above];
      above = [];
    } else if (
      below.length
      && r.bottom + stackH(below) > window.innerHeight - EDGE
      && r.top - stackH(below) - stackH(above) >= HEADER
    ) {
      above = [...below, ...above];
      below = [];
    }

    const left = Math.max(EDGE, Math.min(r.left, window.innerWidth - POPUP_W));
    // Above: stack upward from the anchor, so the first spec sits nearest it.
    let y = r.top - GAP;
    for (const n of above) {
      y -= n.offsetHeight;
      n.style.left = `${left}px`;
      n.style.top = `${y}px`;
      y -= GAP;
    }
    let yb = r.bottom + GAP;
    for (const n of below) {
      n.style.left = `${left}px`;
      n.style.top = `${yb}px`;
      yb += n.offsetHeight + GAP;
    }

    // Flush the placement so it becomes the transition's start value, then hand
    // the transition back. Only opacity/transform change from here.
    nodes[0].getBoundingClientRect();
    for (const n of nodes) n.style.transition = '';

    const id = requestAnimationFrame(() => nodes.forEach((n) => n.classList.add('show')));
    return () => cancelAnimationFrame(id);
  }, [anchor, specs]);

  useEffect(() => {
    // pointerdown, not click, for dismissal: iOS Safari won't fire click on
    // plain divs — the same reason the runtime listens on pointerdown at :1568.
    const onOutside = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('.el-popup') || anchor.contains(t))) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // The popups are position:fixed against a one-shot anchor rect, so any
    // scroll or resize strands them — close rather than let them drift.
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [anchor, onClose]);

  // Desktop: leaving both the trigger and the popup closes after a grace, so the
  // cursor can travel from the row to the popup to read it. Mirrors the runtime's
  // mouseout handler at :1631.
  useEffect(() => {
    if (!finePointer) return;
    let closeTimer: number | null = null;
    const inGroup = (n: EventTarget | null) => {
      const el = n as Node | null;
      if (!el) return false;
      return anchor.contains(el) || refs.current.some((p) => !!p?.contains(el));
    };
    const cancel = () => {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    };
    const onOver = (e: MouseEvent) => { if (inGroup(e.target)) cancel(); };
    const onOut = (e: MouseEvent) => {
      if (!inGroup(e.target) || inGroup(e.relatedTarget)) return;
      cancel();
      closeTimer = window.setTimeout(onClose, HOVER_CLOSE_GRACE);
    };
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    return () => {
      cancel();
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, [anchor, finePointer, onClose]);

  return createPortal(
    <>
      {specs.map((s, i) => (
        <div
          key={s.popClass + i}
          ref={(el) => { refs.current[i] = el; }}
          className={`el-popup ${s.popClass}`}
          role="tooltip"
          // A portal still bubbles through the React tree, so without this the
          // parent .pc card's onClick would navigate to that partner's chart.
          onClick={(e) => e.stopPropagation()}
          // Parked offscreen for the pre-measurement frame; useLayoutEffect
          // places it before paint.
          style={{ left: -9999, top: -9999 }}
        >
          <div className="el-popup-title">{s.title}</div>
          <div className="el-popup-body">{s.body}</div>
        </div>
      ))}
    </>,
    document.body,
  );
}
