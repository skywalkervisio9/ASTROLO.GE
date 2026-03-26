// ============================================================
// Invite code generation — 7-char alphanumeric
// ============================================================

/**
 * Generate a random alphanumeric code
 * Pattern: 7 lowercase letters + digits (78B+ combinations)
 */
export function generateInviteCode(length = 7): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
