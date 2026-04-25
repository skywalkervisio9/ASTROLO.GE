"use client";

/**
 * HydrationBridge — fetches NatalReading from Supabase and calls
 * window.hydrateReading() to inject real data into the prototype DOM.
 *
 * Behavior-only component (renders null), similar to AuthBridge.
 */

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useReading } from "@/hooks/useReading";
import { whenRuntimeReady } from "@/lib/runtime-ready";

export default function HydrationBridge() {
  const { user, authUser } = useAuth();
  // Hold the reading fetch until user.language is known — otherwise we'd
  // request `ka` first and re-fetch when the profile arrives.
  const { reading } = useReading(user?.language ?? "ka", user ? authUser?.id : undefined);
  const initialHydrated = useRef(false);

  // Initial hydration with the user's preferred-language reading
  useEffect(() => {
    if (!user || !reading || initialHydrated.current) return;

    let cancelled = false;
    whenRuntimeReady().then(() => {
      if (cancelled) return;
      const w = window as unknown as Record<string, unknown>;

      // Sync body class + active toggle + applyTranslations to the user's
      // preference before hydrateReading runs (it derives lang from body class).
      // setLang's re-fetch branches are no-ops here: __hydrationBridgeActive
      // isn't set yet, and _currentUser is only assigned inside hydrateReading.
      if (user.language === "en") {
        const enBtn = document.querySelectorAll<HTMLElement>(".lg .lo")[1] ?? null;
        const setLangFn = w.setLang as ((l: string, b: HTMLElement | null) => void) | undefined;
        if (setLangFn) setLangFn("en", enBtn);
      }

      if (typeof w.hydrateReading === "function") {
        (w.hydrateReading as (r: unknown, u: unknown) => void)(reading, user);
        initialHydrated.current = true;
      }
    });

    return () => { cancelled = true; };
  }, [user, reading]);

  // Language switching: fetch the correct reading directly and re-hydrate
  useEffect(() => {
    if (!user) return;

    (window as unknown as Record<string, unknown>).__hydrationBridgeActive = true;

    const handler = async (e: Event) => {
      const detail = (e as CustomEvent<{ lang: string }>).detail;
      const lang = detail?.lang;
      if (lang !== "ka" && lang !== "en") return;

      try {
        const res = await fetch(`/api/reading/natal?lang=${lang}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json() as { reading: unknown };
        if (!data.reading) return;
        const w = window as unknown as Record<string, unknown>;
        if (typeof w.hydrateReading === "function") {
          (w.hydrateReading as (r: unknown, u: unknown) => void)(data.reading, user);
        }
      } catch {
        // silent — lang-switch fetch failure is non-fatal
      }
    };

    window.addEventListener("astrolo:lang-change", handler);
    return () => {
      (window as unknown as Record<string, unknown>).__hydrationBridgeActive = false;
      window.removeEventListener("astrolo:lang-change", handler);
    };
  }, [user]);

  return null;
}
