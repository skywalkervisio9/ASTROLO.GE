"use client";

import Script from "next/script";
import { RUNTIME_CORE_SRC } from "@/lib/runtime-src";
import BodyContent from "@/components/BodyContent";
import AuthBridge from "@/components/AuthBridge";
import HydrationBridge from "@/components/HydrationBridge";
import SettingsBridge from "@/components/SettingsBridge";
import ReadingRenderer from "@/components/reading/ReadingRenderer";
import ReadingSkeleton from "@/components/reading/ReadingSkeleton";

// `app-runtime.js` installs the imperative window handlers that
// `BodyContent`'s `proto().handleX?.()` calls dispatch to (login, language,
// sidebar, payment, dev panel, etc.). The bridges install the React-side
// handlers (handleTestUser, hydrateReading, settings, reading rendering).
// Both must be present for the prototype shell to be interactive.
export default function PrototypeClient() {
  return (
    <>
      <BodyContent />
      <Script src={RUNTIME_CORE_SRC} strategy="afterInteractive" />
      <AuthBridge />
      <HydrationBridge />
      <SettingsBridge />
      <ReadingSkeleton />
      <ReadingRenderer />
    </>
  );
}
