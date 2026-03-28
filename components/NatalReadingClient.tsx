'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useReading } from '@/hooks/useReading';
import ReadingRenderer from '@/components/ReadingRenderer';

export default function NatalReadingClient({ userId }: { userId: string }) {
  const { user, authUser, loading: authLoading } = useAuth();
  const [lang, setLang] = useState<'ka' | 'en'>('ka');
  const { reading, loading: readingLoading, error } = useReading(lang, authUser?.id);

  if (authLoading) return null;
  if (!user || user.id !== userId) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff' }}>
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
          color: 'rgba(255,255,255,0.75)',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          NATAL READING — {user.full_name ?? user.email}
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
          marginLeft: 'auto',
        }}>
          {lang === 'ka' ? 'EN' : 'KA'}
        </button>
      </div>

      <div style={{ padding: '0 20px 100px' }}>
        {readingLoading && (
          <div style={{ color: 'rgba(255,255,255,0.6)', padding: '20px 0' }}>
            Loading…
          </div>
        )}
        {error && (
          <div style={{ color: '#fca5a5', padding: '20px 0' }}>
            {error}
          </div>
        )}
        {reading && (
          <ReadingRenderer
            reading={reading}
            user={user}
            language={lang}
            onUpgrade={() => alert('Payment not implemented yet')}
            onSectionPick={() => {}}
          />
        )}
      </div>
    </div>
  );
}

