export function isAuthRebuildEnabled() {
  return process.env.AUTH_REBUILD_V2 !== '0';
}

export function useServerOnboardingFlow() {
  if (!isAuthRebuildEnabled()) return false;
  return process.env.AUTH_SERVER_ONBOARDING !== '0';
}

export function isCsrfEnforced() {
  if (process.env.AUTH_CSRF_ENFORCE === '1') return true;
  if (process.env.AUTH_CSRF_ENFORCE === '0') return false;
  return process.env.NODE_ENV === 'production';
}

export function shouldLogAuthEvents() {
  return process.env.AUTH_AUDIT_LOGS !== '0';
}
