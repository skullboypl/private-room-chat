export const COMPACT_VIEWPORT_MAX = 720;

export function isCompactViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${COMPACT_VIEWPORT_MAX}px)`).matches;
}
