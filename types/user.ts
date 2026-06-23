// ============================================================
// User types — aligned with supabase/migrations/001_users.sql
// ============================================================

export type AccountType = 'free' | 'premium' | 'invited' | 'invited+';
export type Language = 'ka' | 'en';
export type Gender = 'female' | 'male' | 'non-binary';
export type RelationshipType = 'couple' | 'friend';
export type InviteStatus = 'active' | 'used' | 'expired';
export type ConnectionStatus = 'pending' | 'accepted' | 'reading_generated';
export type PaymentType = 'premium_upgrade' | 'natal_unlock' | 'invite_slot';
export type PaymentProvider = 'tbc' | 'bog';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_letter: string;
  birth_day: number | null;
  birth_month: number | null;
  birth_year: number | null;
  birth_hour: number | null;
  birth_minute: number | null;
  birth_city: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  birth_timezone: string | null;
  gender: Gender | null;
  account_type: AccountType;
  natal_chart_unlocked: boolean;
  invite_slots_purchased: number;
  /** Number of DOB corrections a full-reading user has used. Free users ignore this. */
  dob_corrections_used: number;
  language: Language;
  created_at: string;
  updated_at: string;
}

export interface InviteCode {
  id: string;
  code: string;
  inviter_id: string;
  relationship_type: RelationshipType;
  slot_number: number;
  status: InviteStatus;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

export interface SynastryConnection {
  id: string;
  inviter_id: string;
  invitee_id: string | null;
  relationship_type: RelationshipType;
  invite_code: string;
  slot_number: number;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  payment_type: PaymentType;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  provider_tx_id: string | null;
  idempotency_key: string | null;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  provider_order_id: string | null;
}

// ── Pricing (GEL ₾) ──
export const PRICING = {
  premium_upgrade: 15,   // Free → Premium
  natal_unlock: 5,       // Invited → full natal chart
  invite_slot: 5,        // Additional synastry slot
} as const;

// ── Tier access helpers ──

/**
 * Whether the user has a full AI-generated reading (Call 2 complete).
 * Free and invited users without natal unlock only have astrologer API data.
 */
export function hasFullReading(user: User): boolean {
  return user.account_type === 'premium' || user.natal_chart_unlocked;
}

/** Alias kept for call-sites that check per section — all sections share same gate now. */
export function canAccessSection(user: User, _sectionKey: string): boolean {
  return hasFullReading(user);
}

export type DobCorrectionState =
  | { allowed: true; limited: boolean }
  | { allowed: false; reason: 'used' | 'synastry_started' };

/**
 * Whether the user may correct their birth data and re-generate.
 * - Free / invited-not-unlocked: always allowed, unlimited (astrologer API only).
 * - Full-reading (premium / invited+): exactly one correction, and only before
 *   any synastry generation has started.
 */
export function dobCorrectionState(user: User, synastryStarted: boolean): DobCorrectionState {
  if (!hasFullReading(user)) return { allowed: true, limited: false };
  if (synastryStarted) return { allowed: false, reason: 'synastry_started' };
  if (user.dob_corrections_used >= 1) return { allowed: false, reason: 'used' };
  return { allowed: true, limited: true };
}

/** Slots remaining for UI / limits. Premium & invited+ may generate many invite links (each pending synastry). */
export function getAvailableInviteSlots(user: User, usedSlots: number): number {
  if (user.account_type === 'premium' || user.account_type === 'invited+') {
    return Math.max(0, 10_000 - usedSlots);
  }
  return user.invite_slots_purchased - usedSlots;
}

export function canInvite(user: User, usedSlots: number): boolean {
  if (user.account_type === 'free' || user.account_type === 'invited') return false;
  return getAvailableInviteSlots(user, usedSlots) > 0;
}
