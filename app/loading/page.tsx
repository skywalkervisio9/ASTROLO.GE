import LoadingRouteClient from '@/components/LoadingRouteClient';
import BodyContent from '@/components/BodyContent';
import AuthBridge from '@/components/AuthBridge';
import SettingsBridge from '@/components/SettingsBridge';
import Script from 'next/script';
import { RUNTIME_LOADING_SRC } from '@/lib/runtime-src';

export default function LoadingPage() {
  return (
    <>
      <LoadingRouteClient />
      <BodyContent />
      <Script src={RUNTIME_LOADING_SRC} strategy="afterInteractive" />
      <AuthBridge />
      <SettingsBridge />
    </>
  );
}
