import LoadingRouteClient from '@/components/LoadingRouteClient';
import BodyContent from '@/components/BodyContent';
import AuthBridge from '@/components/AuthBridge';
import HydrationBridge from '@/components/HydrationBridge';
import SettingsBridge from '@/components/SettingsBridge';
import Script from 'next/script';

export default function LoadingPage() {
  return (
    <>
      <LoadingRouteClient />
      <BodyContent />
      <Script src="/prototype-runtime.js" strategy="afterInteractive" />
      <AuthBridge />
      <HydrationBridge />
      <SettingsBridge />
    </>
  );
}
