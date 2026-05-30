/** Odczyt bezpiecznych wcięć (notch / Dynamic Island) — env() bywa 0 w PWA na iOS. */

function parsePx(value) {
  const n = parseFloat(String(value || '').trim());
  return Number.isFinite(n) ? n : 0;
}

function readEnvInsets() {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const styles = getComputedStyle(document.documentElement);
  return {
    top: parsePx(styles.getPropertyValue('--safe-top')),
    right: parsePx(styles.getPropertyValue('--safe-right')),
    bottom: parsePx(styles.getPropertyValue('--safe-bottom')),
    left: parsePx(styles.getPropertyValue('--safe-left')),
  };
}

function readVisualViewportInsets() {
  const vv = window.visualViewport;
  if (!vv) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const top = Math.max(0, Math.round(vv.offsetTop || 0));
  const left = Math.max(0, Math.round(vv.offsetLeft || 0));
  const bottom = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
  const right = Math.max(0, Math.round(window.innerWidth - vv.width - vv.offsetLeft));

  return { top, right, bottom, left };
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
  vv?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);

  return () => {
    vv?.removeEventListener('resize', update);
    vv?.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
  };
}
