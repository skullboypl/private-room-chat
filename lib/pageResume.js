/**
 * Wywołanie handlera po powrocie do karty / PWA (visibility, focus, bfcache, online).
 * Debounce — mobile odpala wiele zdarzeń naraz przy przełączeniu aplikacji.
 */
export function bindPageResume(handler, { debounceMs = 280 } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let timer = null;

  const run = () => {
    if (document.visibilityState && document.visibilityState !== 'visible') return;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      handler();
    }, debounceMs);
  };

  const runImmediate = () => {
    if (document.visibilityState && document.visibilityState !== 'visible') return;
    handler();
  };

  document.addEventListener('visibilitychange', run);
  window.addEventListener('pageshow', runImmediate);
  window.addEventListener('focus', run);
  window.addEventListener('online', run);

  return () => {
    if (timer) window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', run);
    window.removeEventListener('pageshow', runImmediate);
    window.removeEventListener('focus', run);
    window.removeEventListener('online', run);
  };
}
