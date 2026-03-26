"use client";

import Script from "next/script";
import BodyContent from "@/components/BodyContent";

export default function PrototypeClient() {
  return (
    <>
      <BodyContent />
      <Script src="/prototype-runtime.js" strategy="afterInteractive" />
    </>
  );
}
