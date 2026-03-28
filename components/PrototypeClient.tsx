"use client";

import Script from "next/script";
import { useState, useEffect } from "react";
import BodyContent from "@/components/BodyContent";
import AuthBridge from "@/components/AuthBridge";
import ReadingRenderer from "@/components/ReadingRenderer";
import { useAuth } from "@/hooks/useAuth";
import { useReading } from "@/hooks/useReading";

export default function PrototypeClient() {
  const { user, authUser, loading: authLoading } = useAuth();
  const [lang, setLang] = useState<'ka' | 'en'>('ka');
  const { reading, loading: readingLoading } = useReading(lang);
  const [showLive, setShowLive] = useState(false);

  // Auto-enable live mode when real data exists
  useEffect(() => {
    if (user && reading) {
      // This is intentional: we want to flip the prototype into live overlay once.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowLive(true);
    }
  }, [user, reading]);

  return (
    <>
      {/* Live data overlay with ReadingRenderer */}
      {showLive && reading && user && (
        <div id="live-data-overlay" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: '#0a0a0f',
          overflow: 'auto',
        }}>
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'linear-gradient(180deg, rgba(10,10,15,1) 80%, rgba(10,10,15,0))',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{
              color: '#4ade80',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              ● LIVE — {user.full_name}
            </span>
            <button onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')} style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
            }}>
              {lang === 'ka' ? 'EN' : 'KA'}
            </button>
            <button onClick={() => setShowLive(false)} style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              marginLeft: 'auto',
            }}>
              ← PROTOTYPE VIEW
            </button>
          </div>
          <div style={{ padding: '0 20px 100px' }}>
            <ReadingRenderer
              reading={reading}
              user={user}
              language={lang}
              onUpgrade={() => alert('Payment not implemented yet')}
              onSectionPick={(key) => console.log('Section pick:', key)}
            />
          </div>
        </div>
      )}

      {/* Badge when live data available but viewing prototype */}
      {!showLive && user && reading && (
        <button
          onClick={() => setShowLive(true)}
          style={{
            position: 'fixed',
            top: '12px',
            right: '12px',
            zIndex: 9999,
            background: 'rgba(74, 222, 128, 0.15)',
            border: '1px solid rgba(74, 222, 128, 0.4)',
            color: '#4ade80',
            padding: '6px 14px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          ● LIVE DATA READY — CLICK TO VIEW
        </button>
      )}

      {/* Loading indicator when auth'd but reading loading */}
      {!authLoading && authUser && readingLoading && (
        <div style={{
          position: 'fixed',
          top: '12px',
          right: '12px',
          zIndex: 9999,
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.65rem',
          fontFamily: 'monospace',
        }}>
          Loading reading data...
        </div>
      )}

      {/* Prototype layer */}
      <div style={{ display: showLive ? 'none' : undefined }}>
        <BodyContent />
        <Script src="/prototype-runtime.js" strategy="afterInteractive" />
        <AuthBridge />
      </div>
    </>
  );
}
