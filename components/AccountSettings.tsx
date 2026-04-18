'use client';

import { useState, useEffect, useRef } from 'react';
import type { User, AccountType } from '@/types/user';

/* ── Tier display config ── */
const TIER_META: Record<AccountType, { label: string; labelEn: string; cls: string }> = {
  free:       { label: 'უფასო',     labelEn: 'FREE',       cls: 'free' },
  invited:    { label: 'მოწვეული',  labelEn: 'INVITED',    cls: 'invited' },
  'invited+': { label: 'მოწვეული+', labelEn: 'INVITED+',   cls: 'invited' },
  premium:    { label: 'პრემიუმი',  labelEn: 'PREMIUM',    cls: 'premium' },
};

function getTierDisplay(user: User) {
  if (user.account_type === 'invited' && user.natal_chart_unlocked) {
    return { label: 'მოწვეული+', labelEn: 'INVITED+', cls: 'premplus' };
  }
  return TIER_META[user.account_type];
}

/* ── Connection type from API ── */
interface Connection {
  id: string;
  inviter_id: string;
  invitee_id: string | null;
  relationship_type: 'couple' | 'friend';
  status: 'pending' | 'accepted' | 'reading_generated';
  partner_name: string | null;
}

/* ── Slot status helpers ── */
function slotStatusLabel(conn: Connection, isEn: boolean) {
  if (conn.status === 'reading_generated') return isEn ? 'Ready' : 'მზადაა';
  if (conn.status === 'accepted') return isEn ? 'Generating...' : 'იქმნება...';
  return isEn ? 'Waiting...' : 'ელოდება...';
}

function slotStatusClass(conn: Connection) {
  if (conn.status === 'reading_generated') return 'stg-slot-ready';
  if (conn.status === 'accepted') return 'stg-slot-gen';
  return 'stg-slot-wait';
}

interface Props {
  user: User;
  open: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export default function AccountSettings({ user, open, onClose, onUpgrade }: Props) {
  const [isPublic, setIsPublic] = useState(true);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user.full_name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<'ka' | 'en'>(user.language);
  const [connections, setConnections] = useState<Connection[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isLangEn = activeLang === 'en';

  // Fetch connections when panel opens
  useEffect(() => {
    if (!open) return;
    setDeleteConfirm(false);
    setEditingName(false);
    setNameValue(user.full_name || '');

    fetch('/api/synastry/connections', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { connections: [] })
      .then((d: { connections: Connection[] }) => setConnections(d.connections))
      .catch(() => setConnections([]));

    // Load current reading visibility so the toggle reflects reality.
    fetch('/api/reading/visibility', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { isPublic: true })
      .then((d: { isPublic?: boolean }) => {
        if (typeof d.isPublic === 'boolean') setIsPublic(d.isPublic);
      })
      .catch(() => {});
  }, [open, user.full_name]);

  async function toggleVisibility() {
    if (visibilitySaving) return;
    const next = !isPublic;
    setIsPublic(next);          // optimistic
    setVisibilitySaving(true);
    try {
      const res = await fetch('/api/reading/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublic: next }),
      });
      if (!res.ok) setIsPublic(!next); // roll back on failure
    } catch {
      setIsPublic(!next);
    } finally {
      setVisibilitySaving(false);
    }
  }

  // Focus name input when editing
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  if (!open) return null;

  const tier = getTierDisplay(user);

  const dob = user.birth_day && user.birth_month && user.birth_year
    ? `${String(user.birth_day).padStart(2, '0')}.${String(user.birth_month).padStart(2, '0')}.${user.birth_year}`
    : null;

  // Slots: premium gets 1 free + purchased, others just purchased
  const totalSlots = user.account_type === 'premium'
    ? 1 + user.invite_slots_purchased
    : user.invite_slots_purchased;
  const emptySlotCount = Math.max(0, totalSlots - connections.length);

  /* ── Save name ── */
  const saveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === user.full_name) {
      setEditingName(false);
      return;
    }
    setNameSaving(true);
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ full_name: trimmed }),
      });
      // Update sidebar name
      const sbName = document.querySelector('.sb-name');
      if (sbName) sbName.textContent = trimmed;
      const sbAvatar = document.querySelector('.sb-avatar');
      if (sbAvatar) sbAvatar.textContent = trimmed.charAt(0).toUpperCase();
    } catch { /* silent */ }
    setNameSaving(false);
    setEditingName(false);
  };

  /* ── Switch language ── */
  const switchLang = (lang: 'ka' | 'en') => {
    if (lang === activeLang) return;
    setActiveLang(lang);
    // Fire the runtime lang-switch event
    const w = window as unknown as Record<string, unknown>;
    const setLangFn = w.setLang as ((l: string, b: HTMLElement) => void) | undefined;
    const btn = lang === 'en'
      ? document.querySelectorAll('.lo')[1] as HTMLElement
      : document.querySelectorAll('.lo')[0] as HTMLElement;
    if (setLangFn && btn) setLangFn(lang, btn);
    // Persist to DB
    fetch('/api/user/language', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ language: lang }),
    }).catch(() => {});
  };

  return (
    <div className="stg-overlay" onClick={onClose}>
      <div className="stg-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="stg-head">
          <button className="stg-back" onClick={onClose} aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <span className="stg-title">{isLangEn ? 'Settings' : 'პარამეტრები'}</span>
        </div>

        {/* Profile card with editable name */}
        <div className="stg-profile">
          <div className="stg-avatar">{user.avatar_letter}</div>
          <div className="stg-profile-info">
            {editingName ? (
              <div className="stg-name-edit">
                <input
                  ref={nameInputRef}
                  className="stg-name-input"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  onBlur={saveName}
                  disabled={nameSaving}
                  maxLength={60}
                />
              </div>
            ) : (
              <button className="stg-name-btn" onClick={() => setEditingName(true)}>
                <span className="stg-name">{user.full_name || user.email.split('@')[0]}</span>
                <svg className="stg-name-pencil" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l4 4L7 21H3v-4L17 3z"/></svg>
              </button>
            )}
            <span className={`sb-tier ${tier.cls}`} style={{ marginTop: 0 }}>
              <span className="dot"></span> {isLangEn ? tier.labelEn : tier.label}
            </span>
          </div>
        </div>

        {/* Sections */}
        <div className="stg-body">

          {/* Language preference */}
          <div className="stg-section">
            <div className="stg-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              {isLangEn ? 'Language' : 'ენა'}
            </div>
            <div className="stg-lang-row">
              <button
                className={`stg-lang-btn ${activeLang === 'ka' ? 'active' : ''}`}
                onClick={() => switchLang('ka')}
              >
                ქართული
              </button>
              <button
                className={`stg-lang-btn ${activeLang === 'en' ? 'active' : ''}`}
                onClick={() => switchLang('en')}
              >
                English
              </button>
            </div>
          </div>

          {/* Privacy */}
          <div className="stg-section">
            <div className="stg-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              {isLangEn ? 'Privacy' : 'კონფიდენციალობა'}
            </div>
            <div className="stg-row">
              <div className="stg-row-text">
                <div className="stg-row-title">{isLangEn ? 'Reading visibility' : 'წაკითხვის ხილვადობა'}</div>
                <div className="stg-row-desc">
                  {isPublic
                    ? (isLangEn ? 'Anyone with the link can view your reading' : 'ბმულის მქონე ნებისმიერს შეუძლია ნახვა')
                    : (isLangEn ? 'Only you can see your reading' : 'მხოლოდ თქვენ ხედავთ წაკითხვას')
                  }
                </div>
              </div>
              <button
                className={`stg-toggle ${isPublic ? 'on' : ''}`}
                onClick={toggleVisibility}
                disabled={visibilitySaving}
                aria-label="Toggle privacy"
              >
                <span className="stg-toggle-knob" />
                <span className="stg-toggle-label">{isPublic ? (isLangEn ? 'Public' : 'საჯარო') : (isLangEn ? 'Private' : 'პირადი')}</span>
              </button>
            </div>
          </div>

          {/* Account info */}
          <div className="stg-section">
            <div className="stg-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>
              {isLangEn ? 'Account' : 'ანგარიში'}
            </div>

            <div className="stg-info-grid">
              <div className="stg-info-item">
                <div className="stg-info-label">{isLangEn ? 'Account type' : 'ანგარიშის ტიპი'}</div>
                <div className="stg-info-value">
                  <span className={`stg-tier-pill ${tier.cls}`}>{isLangEn ? tier.labelEn : tier.label}</span>
                </div>
              </div>
              <div className="stg-info-item">
                <div className="stg-info-label">{isLangEn ? 'Email' : 'ელ-ფოსტა'}</div>
                <div className="stg-info-value stg-email">{user.email}</div>
              </div>
              {dob && (
                <div className="stg-info-item">
                  <div className="stg-info-label">{isLangEn ? 'Date of birth' : 'დაბადების თარიღი'}</div>
                  <div className="stg-info-value stg-dob">{dob}</div>
                </div>
              )}
            </div>

            {/* Upgrade CTA — different for free vs invited */}
            {user.account_type === 'free' && (
              <div className="stg-upgrade">
                <div className="stg-upgrade-glow" />
                <svg className="stg-upgrade-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity=".8"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>
                <div className="stg-upgrade-text">
                  <div className="stg-upgrade-title">{isLangEn ? 'Full experience' : 'სრული გამოცდილება'}</div>
                  <div className="stg-upgrade-desc">
                    {isLangEn
                      ? 'Get full natal reading, synastry, and more'
                      : 'მიიღე სრული ნატალური წაკითხვა, სინასტრია და სხვა'
                    }
                  </div>
                </div>
                <button className="stg-upgrade-btn" onClick={() => { onUpgrade?.(); onClose(); }}>
                  {isLangEn ? 'Upgrade' : 'გაუმჯობესება'} <span className="stg-upgrade-price">₾15</span>
                </button>
              </div>
            )}
            {user.account_type === 'invited' && !user.natal_chart_unlocked && (
              <div className="stg-upgrade">
                <div className="stg-upgrade-glow" />
                <svg className="stg-upgrade-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity=".8"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>
                <div className="stg-upgrade-text">
                  <div className="stg-upgrade-title">{isLangEn ? 'Unlock full reading' : 'სრული წაკითხვა'}</div>
                  <div className="stg-upgrade-desc">
                    {isLangEn
                      ? 'Unlock all 8 natal sections'
                      : 'განბლოკე ნატალის სრული 8 სექცია'
                    }
                  </div>
                </div>
                <button className="stg-upgrade-btn" onClick={() => {
                  (window as unknown as { showPaymentPage?: (type: string) => void }).showPaymentPage?.('natal-unlock');
                  onClose();
                }}>
                  {isLangEn ? 'Unlock' : 'განბლოკვა'} <span className="stg-upgrade-price">₾5</span>
                </button>
              </div>
            )}
          </div>

          {/* Synastry slots — visual list */}
          {(totalSlots > 0 || connections.length > 0) && (
            <div className="stg-section">
              <div className="stg-section-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="4"/><circle cx="15" cy="12" r="4"/></svg>
                {isLangEn ? 'Synastry' : 'სინასტრია'}
              </div>
              <div className="stg-slots">
                {connections.map((conn) => (
                  <div key={conn.id} className={`stg-slot ${slotStatusClass(conn)}`}>
                    <div className="stg-slot-avatar">
                      {conn.partner_name ? conn.partner_name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="stg-slot-info">
                      <div className="stg-slot-name">
                        {conn.partner_name || (isLangEn ? 'Waiting for partner' : 'პარტნიორს ელოდება')}
                      </div>
                      <div className="stg-slot-meta">
                        <span className={`stg-slot-type ${conn.relationship_type}`}>
                          {conn.relationship_type === 'couple'
                            ? (isLangEn ? 'Couple' : 'წყვილი')
                            : (isLangEn ? 'Friend' : 'მეგობარი')
                          }
                        </span>
                        <span className="stg-slot-dot">·</span>
                        <span className="stg-slot-status">{slotStatusLabel(conn, isLangEn)}</span>
                      </div>
                    </div>
                    {conn.status === 'accepted' && (
                      <div className="stg-slot-spinner" />
                    )}
                  </div>
                ))}
                {/* Empty slots */}
                {Array.from({ length: emptySlotCount }).map((_, i) => (
                  <div key={`empty-${i}`} className="stg-slot stg-slot-empty">
                    <div className="stg-slot-avatar stg-slot-avatar-empty">+</div>
                    <div className="stg-slot-info">
                      <div className="stg-slot-name stg-slot-name-empty">
                        {isLangEn ? 'Available slot' : 'თავისუფალი სლოტი'}
                      </div>
                      <div className="stg-slot-meta">
                        {user.account_type === 'premium' && i === 0 && connections.length === 0 && (
                          <span className="stg-slot-free-tag">{isLangEn ? 'Included with Premium' : 'პრემიუმის ნაწილი'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Buy extra slot CTA — only for premium/invited+ */}
              {(user.account_type === 'premium' || (user.account_type === 'invited' && user.natal_chart_unlocked)) && (
                <button className="stg-slot-buy" onClick={() => {
                  const w = window as unknown as Record<string, unknown>;
                  const showPay = w.showPaymentPage as ((type: string) => void) | undefined;
                  showPay?.('invite-slot');
                  onClose();
                }}>
                  <span className="stg-slot-buy-plus">+</span>
                  {isLangEn ? 'Add synastry slot' : 'სლოტის დამატება'}
                  <span className="stg-slot-buy-price">₾5</span>
                </button>
              )}
            </div>
          )}

          {/* Delete account — quiet, no scary label */}
          <div className="stg-section stg-section-delete">
            {!deleteConfirm ? (
              <button className="stg-delete-btn" onClick={() => setDeleteConfirm(true)}>
                {isLangEn ? 'Delete account' : 'ანგარიშის წაშლა'}
              </button>
            ) : (
              <div className="stg-delete-confirm">
                <div className="stg-delete-warn">
                  {isLangEn
                    ? 'This will permanently delete your account and all data. This action cannot be undone.'
                    : 'ეს სამუდამოდ წაშლის თქვენს ანგარიშს და ყველა მონაცემს. ეს მოქმედება შეუქცევადია.'
                  }
                </div>
                <div className="stg-delete-actions">
                  <button className="stg-delete-cancel" onClick={() => setDeleteConfirm(false)}>
                    {isLangEn ? 'Cancel' : 'გაუქმება'}
                  </button>
                  <button className="stg-delete-final" onClick={() => alert('Account deletion — coming soon')}>
                    {isLangEn ? 'Yes, delete' : 'დიახ, წაშლა'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
