// ============================================================
// API request/response types for all routes
// ============================================================

import type { Language } from './user';

// ── Chart generation ──
export interface GenerateChartRequest {
  name: string;
  birth_day: number;
  birth_month: number;
  birth_year: number;
  birth_hour: number | null;
  birth_minute: number | null;
  birth_city: string;
  birth_lat: number;
  birth_lng: number;
  birth_timezone: string;
  gender: 'female' | 'male' | 'non-binary';
  invite_code?: string;
  free_section_pick?: string;
}

export interface GenerateChartResponse {
  readingId: string;
  status: 'generating' | 'complete' | 'error';
  message?: string;
}

// ── Chart status polling ──
export interface ChartStatusResponse {
  step: string;
  progress: number;      // 0-100
  message: string;
  error?: string;
  complete: boolean;
}

// ── Reading ──
export interface GetReadingResponse {
  reading: Record<string, unknown>;
  unlockedSections: string[];
  freeSectionPick: string | null;
}

// ── Section pick ──
export interface SectionPickRequest {
  sectionKey: string;
}

// ── Invite ──
export interface CreateInviteRequest {
  relationship_type: 'couple' | 'friend';
}

export interface CreateInviteResponse {
  code: string;
  url: string;
  slot_number: number;
  requires_payment: boolean;
}

export interface ValidateInviteResponse {
  valid: boolean;
  relationship_type?: 'couple' | 'friend';
  inviter_name?: string;
  error?: string;
}

// ── Payment ──
export interface CreatePaymentRequest {
  payment_type: 'premium_upgrade' | 'natal_unlock' | 'invite_slot';
  provider: 'tbc' | 'bog';
  relationship_type?: 'couple' | 'friend';   // for invite_slot
}

export interface CreatePaymentResponse {
  payment_id: string;
  redirect_url: string;
}

// ── User ──
export interface UpdateLanguageRequest {
  language: Language;
}
