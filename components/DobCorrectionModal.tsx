'use client';

import { useState, useRef, useEffect } from 'react';
import { withCsrfHeaders } from '@/lib/auth/client';
import { searchCities, localSeed, resolveTimezone, type PlaceResult } from '@/lib/geo/geocode';
import { hasFullReading } from '@/types/user';
import type { User, Gender } from '@/types/user';

const MONTHS_KA = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1929 }, (_, i) => CURRENT_YEAR - i);

interface Props {
  user: User;
  isEn: boolean;
  onClose: () => void;
}

export default function DobCorrectionModal({ user, isEn, onClose }: Props) {
  const isFull = hasFullReading(user);
  const months = isEn ? MONTHS_EN : MONTHS_KA;

  const [day, setDay] = useState<string>(user.birth_day ? String(user.birth_day) : '');
  const [month, setMonth] = useState<string>(user.birth_month ? String(user.birth_month) : '');
  const [year, setYear] = useState<string>(user.birth_year ? String(user.birth_year) : '');
  const [hour, setHour] = useState<string>(user.birth_hour != null ? String(user.birth_hour) : '');
  const [minute, setMinute] = useState<string>(user.birth_minute != null ? String(user.birth_minute) : '');
  const [timeUnknown, setTimeUnknown] = useState<boolean>(user.birth_hour == null);
  const [gender, setGender] = useState<Gender | null>(user.gender);

  const [placeText, setPlaceText] = useState<string>(user.birth_city ?? '');
  // Prefilled with the stored coords so an unchanged city keeps working.
  const coords = useRef<{ lat: number; lng: number; tz: string } | null>(
    user.birth_lat != null && user.birth_lng != null
      ? { lat: user.birth_lat, lng: user.birth_lng, tz: user.birth_timezone ?? 'Asia/Tbilisi' }
      : null,
  );
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [showSug, setShowSug] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const t = (ka: string, en: string) => (isEn ? en : ka);

  useEffect(() => {
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, []);

  const onPlaceInput = (value: string) => {
    setPlaceText(value);
    coords.current = null; // text edited — require a fresh selection
    if (debounce.current) clearTimeout(debounce.current);
    if (value.trim().length < 2) { setSuggestions([]); setShowSug(false); return; }
    const lang = isEn ? 'en' : 'ka';
    // Instant: show local seed matches without waiting on the network.
    const seeds = localSeed(value, lang);
    if (seeds.length) { setSuggestions(seeds); setShowSug(true); }
    // Debounced: merge in Nominatim global results.
    debounce.current = setTimeout(async () => {
      const results = await searchCities(value, lang);
      setSuggestions(results);
      setShowSug(results.length > 0);
    }, 300);
  };

  const pickPlace = async (p: PlaceResult) => {
    setPlaceText(p.label);
    setShowSug(false);
    setSuggestions([]);
    coords.current = { lat: p.lat, lng: p.lng, tz: 'Asia/Tbilisi' };
    const tz = await resolveTimezone(p.lat, p.lng, p.cc);
    if (coords.current) coords.current.tz = tz;
  };

  const submit = async () => {
    setError(null);
    if (!day || !month || !year) return setError(t('შეავსე დაბადების თარიღი', 'Fill in your birth date'));
    if (!placeText.trim()) return setError(t('მიუთითე დაბადების ადგილი', 'Enter your birth place'));
    if (!coords.current) return setError(t('აირჩიე ქალაქი სიიდან', 'Pick a city from the list'));
    if (!gender) return setError(t('აირჩიე სქესი', 'Choose gender'));

    setSubmitting(true);
    const payload = {
      name: user.full_name ?? user.email.split('@')[0],
      birth_day: parseInt(day, 10),
      birth_month: parseInt(month, 10),
      birth_year: parseInt(year, 10),
      birth_hour: timeUnknown ? null : (hour ? parseInt(hour, 10) : null),
      birth_minute: timeUnknown ? null : (minute ? parseInt(minute, 10) : null),
      birth_city: placeText.trim(),
      birth_lat: coords.current.lat,
      birth_lng: coords.current.lng,
      birth_timezone: coords.current.tz,
      gender,
    };

    try {
      const init = await withCsrfHeaders({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const res = await fetch('/api/user/birth-data', init);
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { reason?: string };
        if (res.status === 403 && data.reason === 'synastry_started') {
          setError(t('სინასტრიის გენერაციის შემდეგ შეცვლა შეუძლებელია.', 'Cannot change after synastry generation.'));
        } else if (res.status === 403 && data.reason === 'used') {
          setError(t('კორექციის უფლება უკვე გამოყენებულია.', 'Your one correction has already been used.'));
        } else {
          setError(t('ვერ მოხერხდა. სცადე თავიდან.', 'Something went wrong. Please try again.'));
        }
        setSubmitting(false);
        return;
      }
      const { mode } = await res.json() as { mode: 'regenerate-full' | 'regenerate-call1' | 'free' };
      window.location.assign(mode === 'free' ? '/loading' : `/loading?mode=${mode}`);
    } catch {
      setError(t('ქსელის შეცდომა.', 'Network error.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="dob-overlay" onClick={onClose}>
      <div className="dob-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dob-head">
          <span className="dob-title">{t('დაბადების მონაცემების შესწორება', 'Correct birth data')}</span>
          <button className="dob-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Rules explainer */}
        <div className="dob-info">
          <div className="dob-info-icon">✦</div>
          <p>
            {isFull
              ? t(
                  'ზუსტი დაბადების მონაცემების შესწორება ხელმისაწვდომია მხოლოდ ერთხელ. ცვლილების შემდეგ ნატალური რუკა და სრული ანალიზი თავიდან გენერირდება. სინასტრიის გენერაციის დაწყების შემდეგ შეცვლა აღარ შეიძლება.',
                  'Correcting your exact birth data is available only once. After the change your natal chart and full analysis are re-generated. Once synastry generation has begun, no further change is possible.',
                )
              : t(
                  'შეგიძლია ნებისმიერ დროს შეასწორო დაბადების მონაცემები — რუკა ხელახლა აიგება.',
                  'You can correct your birth data anytime — the chart is rebuilt each time.',
                )}
          </p>
        </div>

        {error && <div className="dob-error">{error}</div>}

        {/* Date */}
        <label className="dob-label">{t('დაბადების თარიღი', 'Date of birth')}</label>
        <div className="dob-row-3">
          <select className="dob-select" value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">{t('დღე', 'Day')}</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="dob-select" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">{t('თვე', 'Month')}</option>
            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="dob-select" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">{t('წელი', 'Year')}</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Time */}
        <label className="dob-label">{t('დაბადების დრო', 'Time of birth')}</label>
        <div className="dob-row-2">
          <select className="dob-select" value={hour} onChange={(e) => setHour(e.target.value)} disabled={timeUnknown}>
            <option value="">{t('საათი', 'Hour')}</option>
            {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
          </select>
          <select className="dob-select" value={minute} onChange={(e) => setMinute(e.target.value)} disabled={timeUnknown}>
            <option value="">{t('წუთი', 'Min')}</option>
            {Array.from({ length: 60 }, (_, i) => i).map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
          </select>
        </div>
        <label className="dob-check">
          <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
          <span>{t('დაბადების დრო უცნობია', 'Birth time unknown')}</span>
        </label>

        {/* Place */}
        <label className="dob-label">{t('დაბადების ადგილი', 'Place of birth')}</label>
        <div className="dob-place">
          <input
            className="dob-input"
            value={placeText}
            onChange={(e) => onPlaceInput(e.target.value)}
            onFocus={() => suggestions.length && setShowSug(true)}
            placeholder={t('ქალაქი, ქვეყანა', 'City, country')}
            autoComplete="off"
          />
          {showSug && (
            <div className="dob-suggestions">
              {suggestions.map((s, i) => (
                <div key={`${s.lat},${s.lng},${i}`} className="dob-sug-item" onClick={() => pickPlace(s)}>
                  {s.label}<small>{s.lat.toFixed(4)}°, {s.lng.toFixed(4)}°</small>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gender */}
        <label className="dob-label">{t('სქესი', 'Gender')}</label>
        <div className="dob-gender">
          <button
            type="button"
            className={`dob-gender-opt ${gender === 'female' ? 'active' : ''}`}
            onClick={() => setGender('female')}
          >♀ {t('ქალი', 'Female')}</button>
          <button
            type="button"
            className={`dob-gender-opt ${gender === 'male' ? 'active' : ''}`}
            onClick={() => setGender('male')}
          >♂ {t('კაცი', 'Male')}</button>
        </div>

        <button className="dob-submit" onClick={submit} disabled={submitting}>
          {submitting ? '…' : t('რუკის თავიდან შედგენა ✦', 'Rebuild chart ✦')}
        </button>
      </div>
    </div>
  );
}
