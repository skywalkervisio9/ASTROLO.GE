"use client";

import Script from "next/script";
import BodyContent from "@/components/BodyContent";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

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

    const fetchAndHydrate = async () => {
      try {
        const res = await fetch(`/api/reading/public?slug=${encodeURIComponent(slug)}&lang=ka`);
        if (!res.ok) {
          console.error("[PublicReading] Failed to fetch:", res.status);
          return;
        }
        const data = await res.json() as {
          reading: unknown;
          user: { full_name: string; email: string; account_type: string } | null;
          isPublic: boolean;
        };

        if (!data.reading || !data.user) return;

        // Wait for prototype-runtime.js to load
        const attempt = () => {
          const w = window as unknown as Record<string, unknown>;

          if (typeof w.hydrateReading === "function") {
            // Switch to natal view
            const switchFn = w.switchView as ((v: string, btn?: unknown) => void) | undefined;
            if (switchFn) switchFn("natal", document.getElementById("devNatal"));

            (w.hydrateReading as (r: unknown, u: unknown) => void)(data.reading, data.user);
            hydrated.current = true;

            // Hide auth wrapper, show reading
            const authWrap = document.getElementById("authWrap");
            if (authWrap) authWrap.style.display = "flex";

            return true;
          }
          return false;
        };

        if (attempt()) return;
        const timer = setInterval(() => {
          if (attempt()) clearInterval(timer);
        }, 200);
      } catch (err) {
        console.error("[PublicReading] Error:", err);
      }
    };

    fetchAndHydrate();
  }, [slug]);

  return (
    <>
      <BodyContent />
      <Script src="/prototype-runtime.js" strategy="afterInteractive" />
    </>
  );
}
