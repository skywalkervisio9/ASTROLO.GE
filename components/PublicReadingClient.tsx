"use client";

import Script from "next/script";
import BodyContent from "@/components/BodyContent";
import SettingsBridge from "@/components/SettingsBridge";
import ReadingRenderer from "@/components/reading/ReadingRenderer";
import ReadingSkeleton from "@/components/reading/ReadingSkeleton";
import { useEffect, useRef } from "react";
import { whenRuntimeReady } from "@/lib/runtime-ready";

interface Props {
  slug: string;
}

export default function PublicReadingClient({ slug }: Props) {
  const hydrated = useRef(false);

  // Guest view only — the server-side route at /r/[slug] already
  // determined the viewer is NOT the owner (owners get PrototypeClient).
  // Setting the flag synchronously on mount eliminates the earlier race
  // with Supabase's onAuthStateChange listener on Vercel.
  // Also tag <body> so CSS can style the pb button differently for guests.
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__ASTROLO_PUBLIC_VIEW = true;
    document.body.setAttribute('data-public-view', 'true');
    return () => {
      delete w.__ASTROLO_PUBLIC_VIEW;
      document.body.removeAttribute('data-public-view');
    };
  }, []);

  useEffect(() => {
    if (hydrated.current) return;

    // Cache both languages so switching is instant — no re-fetch needed
    const cache: Record<string, { reading: unknown; user: unknown }> = {};

    const fetchLang = async (lang: string) => {
      if (cache[lang]) return cache[lang];
      const res = await fetch(`/api/reading/public?slug=${encodeURIComponent(slug)}&lang=${lang}`);
      if (!res.ok) throw new Error(`[PublicReading] fetch failed: ${res.status}`);
      const data = await res.json() as { reading: unknown; user: unknown };
      cache[lang] = data;
      return data;
    };

    const hydrate = (data: { reading: unknown; user: unknown }) => {
      const w = window as unknown as Record<string, unknown>;
      if (typeof w.hydrateReading !== "function") return;
      const switchFn = w.switchView as ((v: string, btn?: unknown) => void) | undefined;
      if (switchFn) switchFn("natal", document.getElementById("devNatal"));
      (w.hydrateReading as (r: unknown, u: unknown) => void)(data.reading, data.user);
      const authWrap = document.getElementById("authWrap");
      if (authWrap) authWrap.style.display = "flex";

      // Public view: the prototype runtime sets .pn to the first name of
      // the viewer. For a guest reading someone else's chart we want the
      // OWNER's full name instead — a clear "you're viewing N's reading"
      // cue. CSS recolors the pill via body[data-public-view].
      const ownerName =
        (data.user as { full_name?: string } | null)?.full_name ||
        (data.user as { email?: string } | null)?.email ||
        '';
      const pn = document.querySelector<HTMLElement>('.pn');
      if (pn && ownerName) pn.textContent = ownerName;
    };

    const init = async () => {
      try {
        const [data] = await Promise.all([
          fetchLang('ka'),
          fetchLang('en'), // pre-fetch EN so switching is instant
        ]);
        await whenRuntimeReady();
        hydrate(data);
        hydrated.current = true;
      } catch (err) {
        console.error("[PublicReading] Error:", err);
      }
    };

    init();

    // Language switch — instant from cache, no network request
    const langHandler = (e: Event) => {
      const lang = (e as CustomEvent<{ lang: string }>).detail?.lang;
      if ((lang === 'ka' || lang === 'en') && cache[lang]) hydrate(cache[lang]);
    };
    window.addEventListener('astrolo:lang-change', langHandler);
    (window as unknown as Record<string, unknown>).__hydrationBridgeActive = true;

    return () => {
      window.removeEventListener('astrolo:lang-change', langHandler);
      (window as unknown as Record<string, unknown>).__hydrationBridgeActive = false;
    };
  }, [slug]);

  return (
    <>
      <BodyContent />
      <Script src="/prototype-runtime.js" strategy="afterInteractive" />
      <SettingsBridge />
      <ReadingSkeleton />
      <ReadingRenderer />
    </>
  );
}
