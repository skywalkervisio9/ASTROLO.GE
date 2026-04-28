"use client";

/**
 * AuthBridge — connects prototype-runtime.js auth stubs to real Supabase auth.
 * Overrides window.handleGoogle, handleLogin, handleSignup, handleForgot
 * after the runtime script loads.
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { withCsrfHeaders } from "@/lib/auth/client";

export default function AuthBridge() {
  useEffect(() => {
    const supabase = createClient();
    const urlParams = new URLSearchParams(window.location.search);
    const forceBirthStep = urlParams.get("step") === "birth";
    const LEGACY_LS_KEY = "astrolo:lastGenerateRequest";
    const LOGOUT_BOUND_ATTR = "data-authbridge-logout-bound";
    const BIRTH_BTN_DEBUG_BOUND_ATTR = "data-authbridge-birth-debug-bound";
    const AUTH_DEBUG =
      new URLSearchParams(window.location.search).get("debugAuth") === "1";
    const debugLog = (...args: unknown[]) => {
      if (AUTH_DEBUG) console.log("[AUTH_DEBUG]", ...args);
    };
    // Warm the post-signup route chain so the browser has /post-auth and the
    // birth form already compiled/cached by the time the user clicks Register.
    // Cuts the perceptible delay between signup and DOB form.
    (() => {
      const prefetch = (href: string) => {
        if (document.head.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = href;
        link.as = "document";
        document.head.appendChild(link);
      };
      prefetch("/auth?step=birth");
    })();

    const isEn = () => document.body.classList.contains("lang-en");
    const t = (key: string) => {
      const ka: Record<string, string> = {
        loginEmailRequired: "შეიყვანე ელ-ფოსტა",
        loginPasswordRequired: "შეიყვანე პაროლი",
        loginInvalidCredentials: "არასწორი ელ-ფოსტა ან პაროლი",
        signupNameRequired: "შეიყვანე სახელი",
        signupPasswordShort: "პაროლი მინ. 8 სიმბოლო",
        birthDateRequired: "შეავსე დაბადების თარიღი",
        birthPlaceRequired: "მიუთითე დაბადების ადგილი",
        birthGenderRequired: "აირჩიე სქესი",
        birthPlacePickRequired: "აირჩიე ადგილი სიიდან (კოორდინატებისთვის)",
        unauthorized: "ავტორიზაცია საჭიროა",
        generationFailed: "გენერაცია ვერ შესრულდა",
        testUserFailed: "ტესტ მომხმარებლის შექმნა ვერ მოხერხდა",
      };
      const en: Record<string, string> = {
        loginEmailRequired: "Enter your email",
        loginPasswordRequired: "Enter your password",
        loginInvalidCredentials: "Invalid email or password",
        signupNameRequired: "Enter your name",
        signupPasswordShort: "Password must be at least 8 characters",
        birthDateRequired: "Please fill in your birth date",
        birthPlaceRequired: "Please enter your birth place",
        birthGenderRequired: "Please select your gender",
        birthPlacePickRequired: "Select a place from the list (for coordinates)",
        unauthorized: "Unauthorized",
        generationFailed: "Generation failed",
        testUserFailed: "Test user failed",
      };
      return (isEn() ? en : ka)[key] ?? key;
    };

    // Install/refresh runtime auth overrides.
    // We re-run this during boot because prototype-runtime.js can assign
    // its own handlers slightly after hydration and overwrite ours.
    function wireAuth() {
      const w = window as unknown as Record<string, unknown>;
      console.log("[AB] wireAuth()", {
        hasHandleBirthData: typeof w.handleBirthData === "function",
        has__authBirthSubmit: typeof w.__authBirthSubmit === "function",
        hasGoAuthStep: typeof w.goAuthStep === "function",
        hasShowAuthPage: typeof w.showAuthPage === "function",
        hasSelectGender: typeof w.selectGender === "function",
      });

      const birthBtn = document.querySelector("#page-birth .auth-btn");
      if (
        birthBtn instanceof HTMLElement &&
        birthBtn.getAttribute(BIRTH_BTN_DEBUG_BOUND_ATTR) !== "1"
      ) {
        birthBtn.setAttribute(BIRTH_BTN_DEBUG_BOUND_ATTR, "1");
        birthBtn.addEventListener("click", () => {
          const handler = (window as unknown as { handleBirthData?: unknown }).handleBirthData;
          debugLog("birth auth-btn clicked", {
            handlerType: typeof handler,
          });
        });
      }

      // ─── Sync runtime gender selection ───
      // Prototype runtime keeps `selectedGender` as a closure variable, so we mirror it to `window.selectedGender`
      // to make our server-side generation bridge deterministic.
      const originalSelectGender = w.selectGender as ((el: HTMLElement, v: string) => void) | undefined;
      w.selectGender = (el: HTMLElement, v: string) => {
        try {
          originalSelectGender?.(el, v);
        } finally {
          (w as { selectedGender?: string }).selectedGender = v;
        }
      };

      // ─── Google OAuth ───
      w.handleGoogle = async () => {
        try {
          const qs = window.location.search || "";
          const init = await withCsrfHeaders({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              provider: "google",
              next: `/post-auth${qs}`,
            }),
          });
          const startRes = await fetch("/api/auth/oauth/start", init);
          if (!startRes.ok) throw new Error(await startRes.text());
          const { redirectTo } = await startRes.json() as { redirectTo: string };

          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo },
          });
          if (error) throw error;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Google login failed";
          console.error("Google auth error:", message);
          const el = document.getElementById("login-error");
          if (el) {
            el.textContent = message;
            el.classList.add("show");
          }
        }
      };

      // ─── Email/Password Login ───
      w.handleLogin = async () => {
        const email = (document.getElementById("login-email") as HTMLInputElement)?.value.trim();
        const pw = (document.getElementById("login-pw") as HTMLInputElement)?.value;

        if (!email) return showError("login-error", t("loginEmailRequired"));
        if (!pw) return showError("login-error", t("loginPasswordRequired"));

        const btn = document.querySelector("#page-login .auth-btn") as HTMLElement;
        if (btn) btn.classList.add("loading");

        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });

        if (btn) btn.classList.remove("loading");

        if (error) {
          showError("login-error", error.message === "Invalid login credentials"
            ? t("loginInvalidCredentials")
            : error.message);
          return;
        }

        // Success → go to birth data step or reading
        onAuthSuccess();
      };

      // ─── Signup ───
      w.handleSignup = async () => {
        const name = (document.getElementById("signup-name") as HTMLInputElement)?.value.trim();
        const email = (document.getElementById("signup-email") as HTMLInputElement)?.value.trim();
        const pw = (document.getElementById("signup-pw") as HTMLInputElement)?.value;

        if (!name) return showError("signup-error", t("signupNameRequired"));
        if (!email) return showError("signup-error", t("loginEmailRequired"));
        if (pw.length < 8) return showError("signup-error", t("signupPasswordShort"));

        const btn = document.querySelector("#page-signup .auth-btn") as HTMLElement;
        if (btn) btn.classList.add("loading");

        const { data, error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: {
            data: { full_name: name },
          },
        });

        if (error) {
          if (btn) btn.classList.remove("loading");
          showError("signup-error", error.message);
          return;
        }

        // Fire-and-forget bootstrap — /post-auth calls ensureUserProfileRow
        // server-side anyway, so blocking the user on this HTTP round-trip
        // just adds latency before the DOB form appears.
        if (data.user) {
          withCsrfHeaders({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ full_name: name }),
          }).then((init) => fetch("/api/user/profile/bootstrap", init))
            .catch((err) => console.warn("Profile bootstrap failed after signup:", err));
        }

        // Skip the /post-auth server round-trip for new signups — we already
        // know the user has no birth data, and the bootstrap call above
        // (fire-and-forget) handles profile row creation. Navigate straight
        // to the birth form. Loading spinner stays on until the page swaps.
        const inviteParam = new URLSearchParams(window.location.search).get("invite");
        const dest = `/auth?step=birth${inviteParam ? `&invite=${encodeURIComponent(inviteParam)}` : ""}`;
        window.location.href = dest;
      };

      // ─── Forgot Password ───
      w.handleForgot = async () => {
        const email = (document.getElementById("forgot-email") as HTMLInputElement)?.value.trim();
        if (!email) return showError("forgot-error", t("loginEmailRequired"));

        const btn = document.querySelector("#page-forgot .auth-btn") as HTMLElement;
        if (btn) btn.classList.add("loading");

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/`,
        });

        if (btn) btn.classList.remove("loading");

        if (error) {
          showError("forgot-error", error.message);
          return;
        }

        const form = document.getElementById("forgot-form");
        const success = document.getElementById("forgot-success");
        if (form) form.style.display = "none";
        if (success) success.style.display = "block";
      };

      // ─── Birth Data Submit ───
      // Also assigned to __authBirthSubmit — a namespace the prototype runtime never
      // touches — so the button can call it directly without racing against
      // prototype-runtime.js overwriting window.handleBirthData.
      const handleBirthDataFn = async () => {
        console.log("🟢 [AB] Birth submit fired");

        const day = (document.getElementById("birth-day") as HTMLSelectElement)?.value;
        const month = (document.getElementById("birth-month") as HTMLSelectElement)?.value;
        const year = (document.getElementById("birth-year") as HTMLSelectElement)?.value;
        const placeInput = document.getElementById("birth-place") as HTMLInputElement | null;
        const place = placeInput?.value.trim();
        const hour = (document.getElementById("birth-hour") as HTMLSelectElement)?.value;
        const minute = (document.getElementById("birth-min") as HTMLSelectElement)?.value;
        const timeUnknown = (document.getElementById("time-unknown") as HTMLInputElement)?.checked;
        const genderFromWindow = (w as { selectedGender?: string }).selectedGender;
        const genderFromDom = (document.querySelector('.gender-opt.active') as HTMLElement | null)
          ?.getAttribute('data-gender')
          || undefined;
        const gender = genderFromWindow || genderFromDom;

        console.log("📋 [AB] Form values:", { day, month, year, place, hour, minute, timeUnknown, genderFromWindow, genderFromDom, gender });

        if (!day || !month || !year) {
          console.warn("❌ [AB] Validation failed: missing date", { day, month, year });
          return showError("birth-error", t("birthDateRequired"));
        }
        if (!place) {
          console.warn("❌ [AB] Validation failed: missing place");
          return showError("birth-error", t("birthPlaceRequired"));
        }
        if (!gender) {
          console.warn("❌ [AB] Validation failed: missing gender");
          return showError("birth-error", t("birthGenderRequired"));
        }

        const latStr = placeInput?.dataset?.lat;
        const lngStr = placeInput?.dataset?.lng;
        const tz = placeInput?.dataset?.tz || "Asia/Tbilisi";
        const lat = latStr ? Number(latStr) : NaN;
        const lng = lngStr ? Number(lngStr) : NaN;
        console.log("📍 [AB] Coordinates:", { latStr, lngStr, lat, lng, tz });

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          console.warn("❌ [AB] Validation failed: no coordinates on place input — user must select from dropdown");
          return showError("birth-error", t("birthPlacePickRequired"));
        }

        // Lock the button in loading state the moment we know submit is proceeding.
        // It stays loading through navigation so the user sees continuous feedback.
        const birthSubmitBtn = document.querySelector("#page-birth .auth-btn") as HTMLElement | null;
        if (birthSubmitBtn) birthSubmitBtn.classList.add("loading");

        console.log("✅ [AB] All validation passed — reading local session (no network)");
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        console.log("👤 [AB] Session user:", user ? `${user.email} (${user.id})` : "null — will show Unauthorized");
        if (!user) return showError("birth-error", t("unauthorized"));

        // Build payload and hand off to /loading page.
        // LoadingRouteClient reads from localStorage, calls /api/chart/generate,
        // polls until the reading is ready, then redirects to /natalreading.
        try {
          const { data: profile } = await supabase
            .from("users")
            .select("full_name, free_section_pick")
            .eq("id", user?.id ?? "")
            .maybeSingle();
          console.log("👤 [AB] Profile from DB:", profile);

          const authName = user?.user_metadata?.full_name
            || user?.user_metadata?.name
            || user?.email?.split("@")[0]
            || "User";

          const inviteCode = new URLSearchParams(window.location.search).get("invite") ?? undefined;

          const payload = {
            name: profile?.full_name ?? authName,
            birth_day: parseInt(day),
            birth_month: parseInt(month),
            birth_year: parseInt(year),
            birth_hour: timeUnknown ? null : (hour ? parseInt(hour) : null),
            birth_minute: timeUnknown ? null : (minute ? parseInt(minute) : null),
            birth_city: place,
            birth_lat: lat,
            birth_lng: lng,
            birth_timezone: tz,
            gender,
            invite_code: inviteCode,
            free_section_pick: profile?.free_section_pick ?? null,
          };
          console.log("📦 [AB] Birth payload validated, queueing onboarding:", payload);

          // Save the current UI language to user profile
          const uiLang = document.body.classList.contains("lang-en") ? "en" : "ka";
          withCsrfHeaders({
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ language: uiLang }),
          }).then((init: RequestInit) => fetch("/api/user/language", init)).catch(() => {});

          // Store payload in localStorage so /loading has it immediately — this
          // is the proven legacy handoff path and it doesn't depend on the
          // onboarding/start round-trip completing first. Prevents the birth
          // page from lingering long enough for HydrationBridge to flash the
          // natal view while we wait for the server.
          try { localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(payload)); } catch { /* quota */ }

          // Fire-and-forget onboarding/start. /loading's polling picks up
          // whichever path finishes first (pending queue or localStorage).
          withCsrfHeaders({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          }).then((init: RequestInit) => fetch("/api/onboarding/start", init))
            .catch((err) => console.warn("[AB] onboarding/start failed (localStorage fallback will be used):", err));

          console.log("🚀 [AB] Navigating to /loading immediately (no server wait)");
          window.location.href = inviteCode ? `/loading?invite=${inviteCode}` : "/loading";
          return;
        } catch (err) {
          console.error("💥 [AB] Pre-navigation error:", err);
          showError("birth-error", err instanceof Error ? err.message : t("generationFailed"));
        }
      };
      // Assign to both: window.handleBirthData (for backward compat) and
      // window.__authBirthSubmit (stable namespace, never overwritten by runtime).
      w.handleBirthData = handleBirthDataFn;
      w.__authBirthSubmit = handleBirthDataFn;

      // ─── Dev Test User ───
      // Always creates a fresh account with random birth data and goes to /loading.
      w.handleTestUser = async () => {
        try {
          const res = await fetch('/api/dev/test-user?new=1', { method: 'POST', headers: { 'x-dev-password': 'astrolo' } });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json() as {
            email: string;
            password: string;
            hasReading: boolean;
            shareSlug?: string;
            birthData?: Record<string, unknown>;
          };

          // Sign out first so there's no stale session racing with the new login
          await supabase.auth.signOut();

          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          });
          if (signInErr) throw signInErr;

          // New account — save birth data and go to /loading for AI generation
          if (data.birthData) localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(data.birthData));
          window.location.href = '/loading';
        } catch (err) {
          console.error('[AB] Test user creation failed:', err);
          showError('login-error', err instanceof Error ? err.message : t("testUserFailed"));
        }
      };

      // ─── Logout ───
      const logoutBtn = document.querySelector(".sb-logout");
      if (
        logoutBtn instanceof HTMLElement &&
        logoutBtn.getAttribute(LOGOUT_BOUND_ATTR) !== "1"
      ) {
        logoutBtn.setAttribute(LOGOUT_BOUND_ATTR, "1");
        logoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await supabase.auth.signOut();
          window.location.reload();
        });
      }
    }

    function showError(id: string, msg: string) {
      debugLog("showError", { id, msg });
      const el = document.getElementById(id);
      if (el) {
        el.textContent = msg;
        el.classList.add("show");
      }
    }

    async function onAuthSuccess() {
      console.log("[AB] onAuthSuccess()");
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      console.log("[AB] onAuthSuccess user:", user ? `${user.email} (${user.id})` : "null — returning early");
      if (!user) return;

      // If user already has a reading or one is being generated, redirect accordingly
      if (!forceBirthStep && (window.location.pathname === '/' || window.location.pathname === '/auth')) {
        try {
          const statusRes = await fetch('/api/onboarding/status', { credentials: 'include' });
          if (statusRes.ok) {
            const s = await statusRes.json() as { status: string; shareSlug?: string | null };
            if (s.status === 'complete' && s.shareSlug) {
              console.log("[AB] onAuthSuccess: reading exists, redirecting to", `/r/${s.shareSlug}`);
              window.location.href = `/r/${s.shareSlug}`;
              return;
            }
            // Chart is still being generated (crash recovery) — send back to loading
            if (s.status === 'generating') {
              console.log("[AB] onAuthSuccess: generation in progress, redirecting to /loading");
              window.location.href = '/loading';
              return;
            }
          }
        } catch (e) {
          console.warn('[AB] onboarding/status check failed:', e);
        }
      }

      // Profile lookup can fail if the public.users row isn't created yet
      // (trigger delay) or RLS blocks the select. In those cases, treat as no birth data.
      type ProfileRow = { birth_day: number | null; birth_month: number | null; birth_year: number | null; full_name: string | null };
      let profile: ProfileRow | null = null;
      try {
        const { data, error } = await supabase
          .from("users")
          .select("birth_day, birth_month, birth_year, full_name")
          .eq("id", user.id)
          .maybeSingle();
        console.log("[AB] onAuthSuccess profile fetch:", { data, error });
        profile = (data as ProfileRow | null) ?? null;
      } catch (e) {
        console.error("[AB] onAuthSuccess profile fetch threw:", e);
        profile = null;
      }

      // Update sidebar with real user data
      const nameEl = document.querySelector(".sb-name") as HTMLElement | null;
      const emailEl = document.querySelector(".sb-email") as HTMLElement | null;
      const avatarEl = document.querySelector(".sb-avatar") as HTMLElement | null;
      const topName = document.querySelector(".pn") as HTMLElement | null;
      if (nameEl && profile?.full_name) nameEl.textContent = profile.full_name;
      if (emailEl) emailEl.textContent = user.email ?? "";
      if (avatarEl && profile?.full_name) avatarEl.textContent = profile.full_name.charAt(0).toUpperCase();
      const dobEl = document.querySelector("#sbDob") as HTMLElement | null;
      if (dobEl && profile?.birth_day && profile?.birth_month && profile?.birth_year) {
        const kaMonths = ["","იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"];
        dobEl.textContent = `${profile.birth_day} ${kaMonths[profile.birth_month]}, ${profile.birth_year}`;
      }
      if (topName && profile?.full_name) {
        const parts = profile.full_name.split(" ");
        topName.textContent = parts[0] + (parts[1] ? " " + parts[1].charAt(0) + "." : "");
      }

      // Wait for prototype-runtime.js to finish loading before trying to switch views.
      // The script uses strategy="afterInteractive" so it may not be ready immediately
      // after React hydrates — especially on fresh Google OAuth redirects.
      const applyView = () => {
        const w = window as unknown as Record<string, unknown>;
        const goAuthStep = w.goAuthStep as ((n: number) => void) | undefined;
        const switchView = w.switchView as ((view: string, btn?: HTMLElement) => void) | undefined;
        const showAuthPage = w.showAuthPage as ((id: string) => void) | undefined;

        // On /loading, the page is responsible for its own view (LoadingRouteClient
        // calls startLoading()). If we switch to "natal" here the user sees a
        // brief flash of the unloaded natal view before LoadingRouteClient takes over.
        if (window.location.pathname === "/loading") {
          console.log("[AB] applyView: on /loading — skipping view switch (owned by LoadingRouteClient)");
          return true;
        }

        if (!switchView || !goAuthStep || !showAuthPage) {
          console.log("[AB] applyView: runtime not ready yet", { hasSwitchView: !!switchView, hasGoAuthStep: !!goAuthStep, hasShowAuthPage: !!showAuthPage });
          return false;
        }

        if (forceBirthStep) {
          console.log("[AB] applyView: URL forces birth step");
          switchView("auth", document.getElementById("devAuth") as HTMLElement);
          goAuthStep(2);
          showAuthPage("page-birth");
        } else if (profile?.birth_day && profile?.birth_year) {
          console.log("[AB] applyView: user has birth data → natal view");
          switchView("natal", document.getElementById("devNatal") as HTMLElement);
        } else {
          console.log("[AB] applyView: no birth data (birth_day=%s, birth_year=%s) → birth form", profile?.birth_day, profile?.birth_year);
          switchView("auth", document.getElementById("devAuth") as HTMLElement);
          goAuthStep(2);
          showAuthPage("page-birth");
        }
        return true;
      };

      // Try immediately; if runtime not ready yet, poll until it is (up to ~4s).
      if (applyView()) return;

      console.log("[AB] onAuthSuccess: runtime not ready — starting poll");
      let viewAttempts = 0;
      const viewTimer = window.setInterval(() => {
        viewAttempts += 1;
        const done = applyView();
        if (done) {
          console.log(`[AB] applyView succeeded on attempt ${viewAttempts}`);
          window.clearInterval(viewTimer);
        } else if (viewAttempts >= 60) {
          console.error("[AB] applyView gave up after 60 attempts — runtime never loaded");
          window.clearInterval(viewTimer);
        }
      }, 200);
    }

    // Check if already authenticated on page load
    async function checkExistingSession() {
      console.log("[AB] checkExistingSession()");
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      console.log("[AB] Session user:", user ? `${user.email} (${user.id})` : "none");
      if (user) {
        // /auth is the login page — sign out and stay on the form.
        // Exception: when ?step=birth or ?invite=... is present, the user was sent here
        // by /post-auth to complete onboarding and MUST keep their session.
        // Dev buttons do their own signOut before signIn, so no race.
        const hasOnboardingIntent = forceBirthStep || urlParams.get('invite');
        if (window.location.pathname === '/auth' && !hasOnboardingIntent) {
          console.log("[AB] On /auth with active session — signing out");
          await supabase.auth.signOut();
          return;
        }
        await onAuthSuccess();
      }
    }

    // Re-apply handlers during startup to avoid runtime race conditions.
    // This ensures `handleBirthData` points to the bridge implementation
    // instead of stale prototype handlers that can submit null payloads.
    let attempts = 0;
    const maxAttempts = 40; // ~8s at 200ms
    const pollMs = 200;
    const timer = window.setInterval(() => {
      attempts += 1;
      wireAuth();
      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, pollMs);

    // First pass immediately, then do the session check.
    wireAuth();
    checkExistingSession();

    return () => window.clearInterval(timer);
  }, []);

  return null; // No UI — this is a behavior-only component
}
