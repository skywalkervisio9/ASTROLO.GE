import test from 'node:test';
import assert from 'node:assert/strict';
import { isConnectionMember } from '@/lib/auth/policy';
import { canAccessSection, dobCorrectionState, type User } from '@/types/user';

const baseUser: User = {
  id: 'u1',
  email: 'u1@example.com',
  full_name: 'User One',
  avatar_letter: 'U',
  birth_day: 1,
  birth_month: 1,
  birth_year: 2000,
  birth_hour: 12,
  birth_minute: 0,
  birth_city: 'Tbilisi',
  birth_lat: 41.7,
  birth_lng: 44.8,
  birth_timezone: 'Asia/Tbilisi',
  gender: 'male',
  account_type: 'free',
  natal_chart_unlocked: false,
  invite_slots_purchased: 0,
  dob_corrections_used: 0,
  language: 'ka',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

test('isConnectionMember validates inviter/invitee ownership', () => {
  assert.equal(isConnectionMember('u1', 'u2', 'u1'), true);
  assert.equal(isConnectionMember('u1', 'u2', 'u2'), true);
  assert.equal(isConnectionMember('u1', 'u2', 'u3'), false);
});

test('canAccessSection: natal_chart_unlocked grants full access', () => {
  const unlocked = { ...baseUser, natal_chart_unlocked: true };
  assert.equal(canAccessSection(unlocked, 'overview'), true);
  assert.equal(canAccessSection(unlocked, 'mission'), true);
  assert.equal(canAccessSection(unlocked, 'shadow'), true);
});

test('canAccessSection: premium account grants full access', () => {
  const premium = { ...baseUser, account_type: 'premium' as const };
  assert.equal(canAccessSection(premium, 'overview'), true);
  assert.equal(canAccessSection(premium, 'potential'), true);
});

test('dobCorrectionState: a generated synastry locks DOB for every tier', () => {
  // Invited user (no natal unlock) — locked because they already have a synastry.
  const invited = { ...baseUser, account_type: 'invited' as const };
  assert.deepEqual(dobCorrectionState(invited, true), { allowed: false, reason: 'synastry_started' });

  // Same lock applies to premium and invited+.
  const premium = { ...baseUser, account_type: 'premium' as const };
  assert.deepEqual(dobCorrectionState(premium, true), { allowed: false, reason: 'synastry_started' });
  const invitedPlus = { ...baseUser, account_type: 'invited+' as const, natal_chart_unlocked: true };
  assert.deepEqual(dobCorrectionState(invitedPlus, true), { allowed: false, reason: 'synastry_started' });
});

test('dobCorrectionState: without a synastry, tier rules still apply', () => {
  // Free / invited without synastry: unlimited corrections.
  assert.deepEqual(dobCorrectionState(baseUser, false), { allowed: true, limited: false });
  const invited = { ...baseUser, account_type: 'invited' as const };
  assert.deepEqual(dobCorrectionState(invited, false), { allowed: true, limited: false });

  // Premium: one correction, then locked as 'used'.
  const premium = { ...baseUser, account_type: 'premium' as const };
  assert.deepEqual(dobCorrectionState(premium, false), { allowed: true, limited: true });
  const premiumUsed = { ...premium, dob_corrections_used: 1 };
  assert.deepEqual(dobCorrectionState(premiumUsed, false), { allowed: false, reason: 'used' });
});
