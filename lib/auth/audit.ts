import { shouldLogAuthEvents } from '@/lib/auth/flags';

type AuthAuditEvent = {
  event: string;
  userId?: string;
  route?: string;
  outcome?: 'success' | 'failure' | 'denied';
  details?: Record<string, unknown>;
};

export function authAudit(event: AuthAuditEvent) {
  if (!shouldLogAuthEvents()) return;
  console.log('[auth-audit]', JSON.stringify({
    ts: new Date().toISOString(),
    ...event,
  }));
}
