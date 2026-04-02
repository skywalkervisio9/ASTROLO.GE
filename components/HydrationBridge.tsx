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
  const { reading } = useReading("ka", authUser?.id);
  const initialHydrated = useRef(false);

  // Initial hydration with the default (ka) reading
  useEffect(() => {
    if (!user || !reading || initialHydrated.current) return;

    let cancelled = false;
    whenRuntimeReady().then(() => {
      if (cancelled) return;
      const w = window as unknown as Record<string, unknown>;
      if (typeof w.hydrateReading === "function") {
        (w.hydrateReading as (r: unknown, u: unknown) => void)(reading, user);
        initialHydrated.current = true;
      }
    });

    return () => { cancelled = true; };
  }, [user, reading]);

  // Language switching: fetch the correct reading directly and re-hydrate
  useEffect(() => {
    console.log("[HB] lang-switch effect, user=", user?.email ?? null);
    if (!user) return;
    // Signal to prototype-runtime that HydrationBridge owns lang-switch fetches
    (window as unknown as Record<string, unknown>).__hydrationBridgeActive = true;
    return () => {
      (window as unknown as Record<string, unknown>).__hydrationBridgeActive = false;
    };

    const handler = async (e: Event) => {
      const detail = (e as CustomEvent<{ lang: string }>).detail;
      const lang = detail?.lang;
      console.log("[HB] lang-change event received, lang=", lang, "user=", user?.email);
      if (lang !== "ka" && lang !== "en") return;

      try {
        const res = await fetch(`/api/reading/natal?lang=${lang}`, {
          credentials: "include",
        });
        console.log("[HB] fetch done, status=", res.status);
        if (!res.ok) return;
        const data = await res.json() as { reading: unknown };
        if (!data.reading) return;
        const w = window as unknown as Record<string, unknown>;
        if (typeof w.hydrateReading === "function") {
          (w.hydrateReading as (r: unknown, u: unknown) => void)(data.reading, user);
        }
      } catch (err) {
        console.log("[HB] fetch error:", err);
      }
    };

    window.addEventListener("astrolo:lang-change", handler);
    return () => window.removeEventListener("astrolo:lang-change", handler);
  }, [user]);

  return null;
}
