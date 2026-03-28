import type { User } from '@/types/user';
import { canInvite, canAccessSection } from '@/types/user';

export function canUserInvite(profile: User, usedSlots: number) {
  return canInvite(profile, usedSlots);
}

export function canUserAccessSection(profile: User, sectionKey: string) {
  return canAccessSection(profile, sectionKey);
}

export function isConnectionMember(inviterId: string, inviteeId: string | null, userId: string) {
  return inviterId === userId || inviteeId === userId;
}
