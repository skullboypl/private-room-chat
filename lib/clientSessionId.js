import {
  secureLocalGetSync,
  secureLocalRemove,
  secureLocalSetSync,
} from '@/lib/secureBrowserStorage';

const CLIENT_SESSION_KEY = 'clientSessionId';

/** Stały identyfikator przeglądarki — reclaim pokoju po grace, niezależny od nicku. */
export function getOrCreateClientSessionId() {
  if (typeof window === 'undefined') return '';

  const existing = secureLocalGetSync(CLIENT_SESSION_KEY)?.trim();
  if (existing && existing.length >= 8) return existing;

  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `vxh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

  secureLocalSetSync(CLIENT_SESSION_KEY, id);
  return id;
}

export function clearClientSessionId() {
  if (typeof window === 'undefined') return;
  secureLocalRemove(CLIENT_SESSION_KEY);
}
