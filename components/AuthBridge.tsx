"use client";

/**
 * AuthBridge — connects prototype-runtime.js auth stubs to real Supabase auth.
 * Overrides window.handleGoogle, handleLogin, handleSignup, handleForgot
 * after the runtime script loads.
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthBridge() {
  useEffect(() => {
    const supabase = createClient();

    // Wait for prototype-runtime.js to load, then override auth functions
    function wireAuth() {
      const w = window as unknown as Record<string, unknown>;

      // ─── Google OAuth ───
      w.handleGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/api/auth/callback`,
          },
        });
        if (error) {
          console.error("Google auth error:", error.message);
          const el = document.getElementById("login-error");
          if (el) {
            el.textContent = error.message;
            el.classList.add("show");
          }
        }
      };

      // ─── Email/Password Login ───
      w.handleLogin = async () => {
        const email = (document.getElementById("login-email") as HTMLInputElement)?.value.trim();
        const pw = (document.getElementById("login-pw") as HTMLInputElement)?.value;

        if (!email) return showError("login-error", "შეიყვანე ელ-ფოსტა");
        if (!pw) return showError("login-error", "შეიყვანე პაროლი");

        const btn = document.querySelector("#page-login .auth-btn") as HTMLElement;
        if (btn) btn.classList.add("loading");

        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });

        if (btn) btn.classList.remove("loading");

        if (error) {
          showError("login-error", error.message === "Invalid login credentials"
            ? "არასწორი ელ-ფოსტა ან პაროლი"
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

        if (!name) return showError("signup-error", "შეიყვანე სახელი");
        if (!email) return showError("signup-error", "შეიყვანე ელ-ფოსტა");
        if (pw.length < 8) return showError("signup-error", "პაროლი მინ. 8 სიმბოლო");

        const btn = document.querySelector("#page-signup .auth-btn") as HTMLElement;
        if (btn) btn.classList.add("loading");

        const { data, error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: {
            data: { full_name: name },
          },
        });

        if (btn) btn.classList.remove("loading");

        if (error) {
          showError("signup-error", error.message);
          return;
        }

        // Update users table with full_name
        if (data.user) {
          await supabase
            .from("users")
            .update({ full_name: name })
            .eq("id", data.user.id);
        }

        // Success → birth data step
        onAuthSuccess();
      };

      // ─── Forgot Password ───
      w.handleForgot = async () => {
        const email = (document.getElementById("forgot-email") as HTMLInputElement)?.value.trim();
        if (!email) return showError("forgot-error", "შეიყვანე ელ-ფოსტა");

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
      w.handleBirthData = async () => {
        const day = (document.getElementById("birth-day") as HTMLSelectElement)?.value;
        const month = (document.getElementById("birth-month") as HTMLSelectElement)?.value;
        const year = (document.getElementById("birth-year") as HTMLSelectElement)?.value;
        const place = (document.getElementById("birth-place") as HTMLInputElement)?.value.trim();
        const hour = (document.getElementById("birth-hour") as HTMLSelectElement)?.value;
        const minute = (document.getElementById("birth-min") as HTMLSelectElement)?.value;
        const timeUnknown = (document.getElementById("time-unknown") as HTMLInputElement)?.checked;
        const gender = (w as { selectedGender?: string }).selectedGender;

        if (!day || !month || !year) return showError("birth-error", "შეავსე დაბადების თარიღი");
        if (!place) return showError("birth-error", "მიუთითე დაბადების ადგილი");
        if (!gender) return showError("birth-error", "აირჩიე სქესი");

        // Save birth data to users table
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("users")
            .update({
              birth_day: parseInt(day),
              birth_month: parseInt(month),
              birth_year: parseInt(year),
              birth_hour: timeUnknown ? null : (hour ? parseInt(hour) : null),
              birth_minute: timeUnknown ? null : (minute ? parseInt(minute) : null),
              birth_city: place,
              gender: gender,
            })
            .eq("id", user.id);
        }

        // Proceed to loading screen
        const goAuthStep = w.goAuthStep as ((n: number) => void) | undefined;
        if (goAuthStep) goAuthStep(3);
      };

      // ─── Logout ───
      const logoutBtn = document.querySelector(".sb-logout");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await supabase.auth.signOut();
          window.location.reload();
        });
      }
    }

    function showError(id: string, msg: string) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = msg;
        el.classList.add("show");
      }
    }

    async function onAuthSuccess() {
      // Check if user has birth data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("birth_day, birth_year, full_name")
        .eq("id", user.id)
        .single();

      const w = window as unknown as Record<string, unknown>;
      const goAuthStep = w.goAuthStep as ((n: number) => void) | undefined;

      // Update sidebar with real user data
      const nameEl = document.querySelector(".sb-name");
      const emailEl = document.querySelector(".sb-email");
      const avatarEl = document.querySelector(".sb-avatar");
      const topName = document.querySelector(".pn");
      if (nameEl && profile?.full_name) nameEl.textContent = profile.full_name;
      if (emailEl) emailEl.textContent = user.email ?? "";
      if (avatarEl && profile?.full_name) avatarEl.textContent = profile.full_name.charAt(0).toUpperCase();
      if (topName && profile?.full_name) {
        const parts = profile.full_name.split(" ");
        topName.textContent = parts[0] + (parts[1] ? " " + parts[1].charAt(0) + "." : "");
      }

      if (profile?.birth_day && profile?.birth_year) {
        // Already has birth data → skip to reading view
        const switchView = w.switchView as ((v: string, btn?: HTMLElement) => void) | undefined;
        if (switchView) switchView("natal", document.getElementById("devNatal") as HTMLElement);
      } else {
        // Needs birth data → go to step 2
        if (goAuthStep) goAuthStep(2);
      }
    }

    // Check if already authenticated on page load
    async function checkExistingSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await onAuthSuccess();
      }
    }

    // Wire auth after a short delay to let prototype-runtime.js load first
    const timer = setTimeout(() => {
      wireAuth();
      checkExistingSession();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return null; // No UI — this is a behavior-only component
}
