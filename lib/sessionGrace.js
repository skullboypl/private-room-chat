import { SESSION_SUSPEND_GRACE_MS } from '@/lib/roomLifecycle';

export { SESSION_SUSPEND_GRACE_MS };

export function isWithinSessionGrace(suspendedAt) {
  if (!suspendedAt) return false;
  const ts = Number(suspendedAt);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return Date.now() - ts < SESSION_SUSPEND_GRACE_MS;
}
