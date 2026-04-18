// ============================================================
// ReadingRenderer — listens for `reading:hydrated` events from
// prototype-runtime.js, queries all [data-reading-slot] elements,
// and portals a <CardComponent> into each slot.
//
// Prototype owns the shell (nav, hero, section headers, planet
// table, aspects, lock wraps, grid wrappers). React owns card
// content rendered into prototype-drawn slot divs.
//
// Phase 1: behavior-only, renders nothing until prototype emits
// slots + event (wired up in Phase 2).
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { NatalReading, Card, SectionKey, OverviewSection, ContentSection } from '@/types/reading';
import type { User } from '@/types/user';
import { setRenderLang } from '@/lib/utils/renderText';
import CardComponent from './CardComponent';

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

function getCardAt(reading: NatalReading, key: SectionKey, idx: number): Card | null {
  const section = reading[key] as OverviewSection | ContentSection | undefined;
  if (!section) return null;
  const cards = (section as OverviewSection).coreCards ?? (section as ContentSection).cards ?? [];
  return cards[idx] ?? null;
}

export default function ReadingRenderer() {
  const [state, setState] = useState<ReadingState | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    const sync = () => {
      const w = window as unknown as Record<string, unknown>;
      const s = w.__readingState as ReadingState | undefined;
      if (s && s.type === 'natal') {
        setState(s);
        setSlots(collectSlots());
      }
    };

    window.addEventListener('reading:hydrated', sync);
    // If prototype already hydrated before this listener mounted, pick up state now.
    sync();

    return () => window.removeEventListener('reading:hydrated', sync);
  }, []);

  if (!state) return null;
  setRenderLang(state.lang);

  return (
    <>
      {slots.map(({ el, sectionKey, cardIdx }) => {
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
