"use client";

import Script from "next/script";
import BodyContent from "@/components/BodyContent";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { whenRuntimeReady } from "@/lib/runtime-ready";

interface Props {
  slug: string;
}

export default function PublicReadingClient({ slug }: Props) {
  const hydrated = useRef(false);

  // On public reading pages, the profile button (.pb) should always
  // sign out (if logged in) and navigate to /auth.
  // Also set __ASTROLO_PUBLIC_VIEW as fallback for the runtime's own openSidebar check.
  useEffect(() => {
    const supabase = createClient();
    const w = window as unknown as Record<string, unknown>;

    // Keep __ASTROLO_PUBLIC_VIEW in sync so prototype-runtime.js openSidebar
    // redirects to /auth when not logged in, and opens sidebar when logged in.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        delete w.__ASTROLO_PUBLIC_VIEW;
      } else {
        w.__ASTROLO_PUBLIC_VIEW = true;
      }
    });

    return () => {
      subscription.unsubscribe();
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
    </>
  );
}
