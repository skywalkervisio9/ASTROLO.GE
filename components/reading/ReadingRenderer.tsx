// ============================================================
// ReadingRenderer — listens for `reading:hydrated` events from
// prototype-runtime.js, queries all [data-reading-slot] elements,
// and portals a <CardComponent> into each slot.
//
// Prototype owns the shell (nav, hero, section headers, planet
// table, aspects, lock wraps, grid wrappers). React owns card
// content rendered into prototype-drawn slot divs.
//
// Slot lifecycle:
//   The prototype calls `hydrateReading()` on first load AND on
//   every language switch / tier toggle. Each call sets innerHTML
//   on the section container, which DESTROYS the previous slot
//   nodes — any ref React still holds becomes detached and
//   portals into it render invisibly. To stay correct we:
//     1. Defer the initial `collectSlots()` to the next frame so
//        the prototype's setTimeout-scheduled observer init has
//        time to settle before we snapshot the DOM.
//     2. Re-run `collectSlots()` whenever the section container's
//        children change (MutationObserver), so re-hydrations
//        from the prototype always update our slot refs.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { NatalReading, Card, SectionKey, OverviewSection, ContentSection } from '@/types/reading';
import type { User } from '@/types/user';
import { setRenderLang } from '@/lib/utils/renderText';
import CardComponent from './CardComponent';
import { setZodiacDisplayMode, type ZodiacDisplayMode } from '@/lib/utils/renderText';

interface ReadingState {
  reading: NatalReading;
  user: User;
  lang: 'ka' | 'en';
  type: 'natal';
}

interface Slot {
  el: HTMLElement;
  sectionKey: SectionKey;
  cardIdx: number;
}

function collectSlots(): Slot[] {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reading-slot]'));
  return nodes
    .map(el => {
      const sectionKey = el.dataset.section as SectionKey | undefined;
      const cardIdx = Number(el.dataset.cardIdx ?? -1);
      if (!sectionKey || cardIdx < 0) return null;
      return { el, sectionKey, cardIdx };
    })
    .filter((s): s is Slot => s !== null);
}

function slotsEqual(a: Slot[], b: Slot[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].el !== b[i].el || a[i].sectionKey !== b[i].sectionKey || a[i].cardIdx !== b[i].cardIdx) {
      return false;
    }
  }
  return true;
}

function getCardAt(reading: NatalReading, key: SectionKey, idx: number): Card | null {
  const section = reading[key] as OverviewSection | ContentSection | undefined;
  if (!section) return null;
  const cards = (section as OverviewSection).coreCards ?? (section as ContentSection).cards ?? [];
  return cards[idx] ?? null;
}

export default function ReadingRenderer() {
  const [state, setState] = useState<ReadingState | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [zodiacMode, setZodiacModeState] = useState<ZodiacDisplayMode>('icon');

  useEffect(() => {
    let rafId = 0;
    let observer: MutationObserver | null = null;

    const refreshSlots = () => {
      const next = collectSlots();
      setSlots(prev => (slotsEqual(prev, next) ? prev : next));
    };

    // Defer slot collection one frame so prototype's setTimeout-scheduled
    // observer init and any same-tick DOM mutations land before we snapshot.
    const scheduleRefresh = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(refreshSlots);
    };

    // Watch the reading section host so when the prototype rebuilds sections
    // (lang switch, tier toggle, dev re-hydrate) we pick up the fresh slot
    // nodes instead of portaling into detached refs. Scoped to
    // #readingSkeletonHost (the stable container BodyContent renders into)
    // so unrelated UI mutations (sidebar, modals, hover states) don't fire it.
    const ensureObserver = () => {
      if (observer) return;
      const host = document.getElementById('readingSkeletonHost');
      if (!host) return;
      observer = new MutationObserver(scheduleRefresh);
      observer.observe(host, { childList: true, subtree: true });
    };

    const sync = () => {
      const w = window as unknown as Record<string, unknown>;
      const s = w.__readingState as ReadingState | undefined;
      if (s && s.type === 'natal') {
        setState(s);
        ensureObserver();
        scheduleRefresh();
      }
    };

    window.addEventListener('reading:hydrated', sync);
    // If prototype already hydrated before this listener mounted, pick up state now.
    sync();

    const syncZodiacMode = () => {
      const w = window as unknown as { __zodiacDisplayMode?: ZodiacDisplayMode };
      setZodiacModeState(w.__zodiacDisplayMode === 'name' || document.body.classList.contains('zodiac-names') ? 'name' : 'icon');
    };

    window.addEventListener('astrolo:zodiac-display-change', syncZodiacMode);
    syncZodiacMode();

    return () => {
      window.removeEventListener('reading:hydrated', sync);
      window.removeEventListener('astrolo:zodiac-display-change', syncZodiacMode);
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, []);

  if (!state) return null;
  setRenderLang(state.lang);

  return (
    <>
      {slots.map(({ el, sectionKey, cardIdx }) => {
        // Skip slots whose host element has been detached from the live DOM
        // (can happen briefly between a prototype re-hydrate and the
        // MutationObserver-scheduled refresh).
        if (!el.isConnected) return null;
        const card = getCardAt(state.reading, sectionKey, cardIdx);
        if (!card) return null;
        return createPortal(
          <CardComponent card={card} lang={state.lang} />,
          el,
          `${sectionKey}:${cardIdx}`
        );
      })}
    </>
  );
}
