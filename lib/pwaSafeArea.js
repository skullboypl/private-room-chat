/** Odczyt bezpiecznych wcięć (notch / Dynamic Island) — env() bywa 0 w PWA na iOS. */

function parsePx(value) {
  const n = parseFloat(String(value || '').trim());
  return Number.isFinite(n) ? n : 0;
}

let envProbeEl = null;

/** env(safe-area-inset-*) — nie czytaj --safe-* (są nadpisywane przez apply). */
function readEnvInsets() {
  if (typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  if (!envProbeEl) {
    envProbeEl = document.createElement('div');
    envProbeEl.setAttribute('aria-hidden', 'true');
    envProbeEl.style.cssText = [
      'position:fixed',
      'visibility:hidden',
      'pointer-events:none',
      'top:env(safe-area-inset-top,0px)',
      'right:env(safe-area-inset-right,0px)',
      'bottom:env(safe-area-inset-bottom,0px)',
      'left:env(safe-area-inset-left,0px)',
    ].join(';');
    document.documentElement.appendChild(envProbeEl);
  }

  const styles = getComputedStyle(envProbeEl);
  return {
    top: parsePx(styles.top),
    right: parsePx(styles.right),
    bottom: parsePx(styles.bottom),
    left: parsePx(styles.left),
  };
}

/**
 * iOS przesuwa visualViewport przy overscroll — offsetTop nie jest „safe area”.
 * Dolny inset z vv tylko gdy prawdopodobnie otwarta klawiatura (vv znacząco niższe).
 */
function readVisualViewportInsets() {
  const vv = window.visualViewport;
  if (!vv) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const layoutH = window.innerHeight;
  const layoutW = window.innerWidth;
  const vvH = vv.height;
  const vvW = vv.width;
  const keyboardLikely = vvH < layoutH * 0.82;

  const left = Math.max(0, Math.round(vv.offsetLeft || 0));
  const right = Math.max(0, Math.round(layoutW - vvW - left));

  let bottom = 0;
  if (keyboardLikely) {
    bottom = Math.max(0, Math.round(layoutH - vvH - (vv.offsetTop || 0)));
  }

  return { top: 0, right, bottom, left };
}

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function applyPwaSafeAreaInsets() {
  if (typeof document === 'undefined') return;

  const env = readEnvInsets();
  const vv = readVisualViewportInsets();

  const top = Math.max(env.top, vv.top);
  const right = Math.max(env.right, vv.right);
  const bottom = Math.max(env.bottom, vv.bottom);
  const left = Math.max(env.left, vv.left);

  const root = document.documentElement;
  root.style.setProperty('--safe-top', `${top}px`);
  root.style.setProperty('--safe-right', `${right}px`);
  root.style.setProperty('--safe-bottom', `${bottom}px`);
  root.style.setProperty('--safe-left', `${left}px`);

  if (isStandalonePwa()) {
    root.classList.add('pwa-standalone');
  }
}

export function initPwaSafeArea() {
  if (typeof window === 'undefined') return () => {};

  const update = () => applyPwaSafeAreaInsets();

  update();

  const vv = window.visualViewport;
  vv?.addEventListener('resize', update);
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);

  return () => {
    vv?.removeEventListener('resize', update);
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
  };
}
