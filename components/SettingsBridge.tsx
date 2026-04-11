'use client';

/**
 * SettingsBridge — connects the sidebar gear icon (#stgBtn) to the
 * AccountSettings React overlay via window.openSettings().
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AccountSettings from '@/components/AccountSettings';

type ProtoGlobals = {
  showPaymentPage?: (type: string) => void;
  closeSidebar?: () => void;
};

export default function SettingsBridge() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Always expose openSettings on window — even before user loads.
  // The gear button calls this via onClick in BodyContent.
  useEffect(() => {
    const fn = () => {
      (window as unknown as ProtoGlobals).closeSidebar?.();
      setOpen(true);
    };
    (window as unknown as Record<string, unknown>).openSettings = fn;
    return () => {
      delete (window as unknown as Record<string, unknown>).openSettings;
    };
  }, []);

  // Listen for Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Don't render the panel until user data is available
  if (!user || !open) return null;

  return (
    <AccountSettings
      user={user}
      open={open}
      onClose={() => setOpen(false)}
      onUpgrade={() => {
        (window as unknown as ProtoGlobals).showPaymentPage?.('premium');
      }}
    />
  );
}
