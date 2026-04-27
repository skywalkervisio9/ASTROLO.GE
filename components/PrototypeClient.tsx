"use client";

import Script from "next/script";
import BodyContent from "@/components/BodyContent";
import AuthBridge from "@/components/AuthBridge";
import HydrationBridge from "@/components/HydrationBridge";
import SettingsBridge from "@/components/SettingsBridge";
import ReadingRenderer from "@/components/reading/ReadingRenderer";
import ReadingSkeleton from "@/components/reading/ReadingSkeleton";

export default function PrototypeClient() {
  return (
    <>
      <BodyContent />
      <Script src="/prototype-runtime.js" strategy="afterInteractive" />
      <AuthBridge />
      <HydrationBridge />
      <SettingsBridge />
      <ReadingSkeleton />
      <ReadingRenderer />
    </>
  );
}
