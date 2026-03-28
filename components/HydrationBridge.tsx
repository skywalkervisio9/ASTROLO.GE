"use client";

/**
 * HydrationBridge — fetches NatalReading from Supabase and calls
 * window.hydrateReading() to inject real data into the prototype DOM.
 *
 * Behavior-only component (renders null), similar to AuthBridge.
 */

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useReading } from "@/hooks/useReading";

export default function HydrationBridge() {
  const { user, authUser } = useAuth();
  const [lang, setLang] = useState<"ka" | "en">("ka");
  const { reading } = useReading(lang, authUser?.id);
  const hydrated = useRef(false);

  // Listen for language changes dispatched by prototype-runtime.js setLang()
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ lang: string }>).detail;
      if (detail?.lang === "ka" || detail?.lang === "en") {
        setLang(detail.lang);
        hydrated.current = false; // re-hydrate with new language
      }
    };
    window.addEventListener("astrolo:lang-change", handler);
    return () => window.removeEventListener("astrolo:lang-change", handler);
  }, []);

  // Hydrate the prototype DOM when data is ready
  useEffect(() => {
    if (!user || !reading) return;
    if (hydrated.current) return;

    const attempt = () => {
      const w = window as unknown as Record<string, unknown>;
      if (typeof w.hydrateReading === "function") {
        (w.hydrateReading as (r: unknown, u: unknown) => void)(reading, user);
        hydrated.current = true;
        return true;
      }
      return false;
    };

    // Try immediately, then poll in case prototype-runtime.js hasn't loaded yet
    if (attempt()) return;

    const timer = setInterval(() => {
      if (attempt()) clearInterval(timer);
    }, 200);

    return () => clearInterval(timer);
  }, [user, reading]);

  return null;
}
