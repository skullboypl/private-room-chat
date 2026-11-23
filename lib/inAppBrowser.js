const ALLOW_IN_APP_KEY = 'vxh-allow-inapp';
const EXTERNAL_OPEN_ATTEMPTED_KEY = 'vxh-external-open-attempted';

/** @returns {'facebook'|'instagram'|'messenger'|'tiktok'|'twitter'|'linkedin'|'snapchat'|'line'|'wechat'|'android-webview'|null} */
export function detectInAppBrowser() {
  if (typeof navigator === 'undefined') return null;

  const ua = navigator.userAgent || '';

  if (/FBAN|FBAV|FB_IAB|FBIOS|FBMD/i.test(ua)) {
    return /Messenger/i.test(ua) ? 'messenger' : 'facebook';
  }
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/TikTok/i.test(ua)) return 'tiktok';
  if (/LinkedInApp/i.test(ua)) return 'linkedin';
  if (/Snapchat/i.test(ua)) return 'snapchat';
  if (/Line\//i.test(ua)) return 'line';
  if (/MicroMessenger/i.test(ua)) return 'wechat';
  if (/(Twitter|X)\/.*Twitter/i.test(ua)) return 'twitter';

  if (/Android/i.test(ua) && /;\s*wv\)|\bwv\b/i.test(ua)) {
    return 'android-webview';
  }

  return null;
}

export function isInAppBrowser() {
  return Boolean(detectInAppBrowser());
}

export function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

export function buildAndroidChromeIntentUrl(targetUrl) {
  const url = targetUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const stripped = url.replace(/^https?:\/\//i, '');
  return [
    `intent://${stripped}`,
    '#Intent',
    'scheme=https',
    'action=android.intent.action.VIEW',
    'category=android.intent.category.BROWSABLE',
    'package=com.android.chrome',
    `S.browser_fallback_url=${encodeURIComponent(url)}`,
    'end',
  ].join(';');
}

/** Próba otwarcia w Chrome (Android) lub nowej karcie (iOS). */
export function tryOpenInExternalBrowser(targetUrl) {
  if (typeof window === 'undefined') return false;

  const url = targetUrl || window.location.href;

  if (isAndroidDevice()) {
    window.location.href = buildAndroidChromeIntentUrl(url);
    return true;
  }

  if (isIOSDevice()) {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) {
      opened.opener = null;
      return true;
    }
  }

  return false;
}

export function hasAllowedInAppBrowser() {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(ALLOW_IN_APP_KEY) === '1';
  } catch {
    return false;
  }
}

export function allowInAppBrowser() {
  try {
    sessionStorage.setItem(ALLOW_IN_APP_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function wasExternalOpenAttempted() {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(EXTERNAL_OPEN_ATTEMPTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markExternalOpenAttempted() {
  try {
    sessionStorage.setItem(EXTERNAL_OPEN_ATTEMPTED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function shouldPromptExternalBrowser() {
  return isInAppBrowser() && !hasAllowedInAppBrowser();
}
