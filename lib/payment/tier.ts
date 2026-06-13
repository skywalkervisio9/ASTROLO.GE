// ============================================================
// Tier reconciliation after a paid extra (natal_unlock | invite_slot).
//
// Rules (docs/USER-FLOW.md §natal-unlock / §invite-slot):
//   invited  + first paid extra                              → invited+
//   invited+ + the OTHER paid extra (so both flags are set)  → premium
//   free / premium: unchanged here (premium_upgrade handles those)
//
// Called AFTER the boolean/integer flag has been written, so the helper
// reads post-write state. That makes it race-safe — if two concurrent
// purchases both flip a flag, the second call sees both flags set and
// correctly writes 'premium'.
// ============================================================

import { createAdminSupabase } from '@/lib/supabase/admin';
import { invalidateUserProfile } from '@/lib/data/public-reading';
import type { AccountType } from '@/types/user';

export async function reconcileAccountTypeAfterPurchase(userId: string): Promise<void> {
  const admin = createAdminSupabase();
  const { data: user } = await admin
    .from('users')
    .select('account_type, natal_chart_unlocked, invite_slots_purchased')
    .eq('id', userId)
    .maybeSingle();
  if (!user) return;

  const current = user.account_type as AccountType;
  if (current === 'free' || current === 'premium') return;

  const hasNatal = user.natal_chart_unlocked === true;
  const hasSlot = (user.invite_slots_purchased ?? 0) >= 1;

  let next: AccountType = current;
  if (hasNatal && hasSlot) next = 'premium';
  else if (hasNatal || hasSlot) next = 'invited+';

  if (next === current) return;

  await admin.from('users').update({ account_type: next }).eq('id', userId);
  invalidateUserProfile(userId);
}
