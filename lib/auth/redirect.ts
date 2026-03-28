const DEFAULT_PATH = '/';

export function sanitizeNextPath(nextRaw: string | null | undefined) {
  if (!nextRaw) return DEFAULT_PATH;
  if (!nextRaw.startsWith('/')) return DEFAULT_PATH;
  if (nextRaw.startsWith('//')) return DEFAULT_PATH;
  if (nextRaw.includes('\n') || nextRaw.includes('\r')) return DEFAULT_PATH;
  if (nextRaw.startsWith('/api/auth/callback')) return DEFAULT_PATH;
  return nextRaw;
}
