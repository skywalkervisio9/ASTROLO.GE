// ============================================================
// User types — aligned with supabase/migrations/001_users.sql
// ============================================================

export type AccountType = 'free' | 'premium' | 'invited';
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
  free_section_pick: string | null;
  language: Language;
  prompt_version: string | null;
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
}

// ── Pricing (GEL ₾) ──
export const PRICING = {
  premium_upgrade: 15,   // Free → Premium
  natal_unlock: 5,       // Invited → full natal chart
  invite_slot: 5,        // Additional synastry slot
} as const;

// ── Tier access helpers ──
export function getAvailableInviteSlots(user: User, usedSlots: number): number {
  const totalSlots = user.account_type === 'premium'
    ? 1 + user.invite_slots_purchased
    : user.invite_slots_purchased;
  return totalSlots - usedSlots;
}

export function canInvite(user: User, usedSlots: number): boolean {
  if (user.account_type === 'free') return false;
  return getAvailableInviteSlots(user, usedSlots) > 0;
}

export function canAccessSection(
  user: User,
  sectionKey: string
): boolean {
  // Premium users see everything
  if (user.account_type === 'premium') return true;

  // Invited users with natal unlock see everything
  if (user.account_type === 'invited' && user.natal_chart_unlocked) return true;

  // Free/invited: overview + mission always visible
  if (sectionKey === 'overview' || sectionKey === 'mission') return true;

  // Free section pick
  if (user.free_section_pick === sectionKey) return true;

  return false;
}
