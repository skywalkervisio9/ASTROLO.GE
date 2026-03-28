import test from 'node:test';
import assert from 'node:assert/strict';
import { isConnectionMember } from '@/lib/auth/policy';
import { canAccessSection, type User } from '@/types/user';

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
  free_section_pick: null,
  language: 'ka',
  prompt_version: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

test('isConnectionMember validates inviter/invitee ownership', () => {
  assert.equal(isConnectionMember('u1', 'u2', 'u1'), true);
  assert.equal(isConnectionMember('u1', 'u2', 'u2'), true);
  assert.equal(isConnectionMember('u1', 'u2', 'u3'), false);
});

test('canAccessSection respects free pick', () => {
  const free = { ...baseUser, free_section_pick: 'career' };
  assert.equal(canAccessSection(free, 'overview'), true);
  assert.equal(canAccessSection(free, 'career'), true);
  assert.equal(canAccessSection(free, 'relationship'), false);
});
