import { COMPACT_VIEWPORT_MAX } from '@/lib/viewport';
import { applyPwaSafeAreaInsets } from '@/lib/pwaSafeArea';

const VIEWPORT_LOCKED =
  'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no';

function getViewportMeta() {
  if (typeof document === 'undefined') return null;
  return document.querySelector('meta[name="viewport"]');
}

/** Wymusza skalę 1:1 i przewija na początek (iOS często zostaje przybliżony po liście pokoi). */
export function resetMobileViewportForChat() {
  if (typeof window === 'undefined') return;

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.documentElement.scrollLeft = 0;
  document.body.scrollTop = 0;
  document.body.scrollLeft = 0;

  applyPwaSafeAreaInsets();

  const meta = getViewportMeta();
  if (!meta) return;

  const locked = VIEWPORT_LOCKED;
  meta.setAttribute('content', locked);
  requestAnimationFrame(() => {
    meta.setAttribute('content', `${locked}, maximum-scale=1`);
    requestAnimationFrame(() => meta.setAttribute('content', locked));
  });
}

export function lockMobileChatViewport() {
  const meta = getViewportMeta();
  if (!meta) return { restore: () => {} };

  const previous = meta.getAttribute('content') || '';
  meta.setAttribute('content', VIEWPORT_LOCKED);
  resetMobileViewportForChat();

  return {
    restore: () => {
      if (previous) meta.setAttribute('content', previous);
    },
  };
}

export function setMobileChatViewportActive(active) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('html--mobile-chat', active);
  document.body.classList.toggle('body--mobile-chat', active);
}

export function isMobileChatViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${COMPACT_VIEWPORT_MAX}px)`).matches;
}
