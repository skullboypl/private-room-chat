/** Zgodne z DISCONNECT_GRACE_MS w lib/socket/server.js — offline / minimalizacja. */
export const SESSION_SUSPEND_GRACE_MS = 90 * 1000;

export function isWithinSessionGrace(suspendedAt) {
  if (!suspendedAt) return false;
  const ts = Number(suspendedAt);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return Date.now() - ts < SESSION_SUSPEND_GRACE_MS;
}
