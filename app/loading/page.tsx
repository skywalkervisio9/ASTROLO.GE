import LoadingRouteClient from '@/components/LoadingRouteClient';
import BodyContent from '@/components/BodyContent';
import Script from 'next/script';

export default function LoadingPage() {
  return (
    <>
      <LoadingRouteClient />
      <BodyContent />
      <Script src="/prototype-runtime.js" strategy="afterInteractive" />
    </>
  );
}

