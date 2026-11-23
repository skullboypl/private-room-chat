import { getAppStrings } from '@/lib/i18n/app';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/config';

function normalizeSiteUrl(value) {
  const raw = String(value || 'http://localhost:3000').trim();
  return raw.replace(/\/$/, '');
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const SITE_NAME = process.env.SITE_NAME || 'Pokoje Czatu';
export const SITE_TAGLINE = process.env.SITE_TAGLINE || 'Prywatne pokoje czatu online z szyfrowaniem E2E';

export const SITE_HOST = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return 'localhost';
  }
})();

export function getLocalizedSiteName(lang = DEFAULT_LOCALE) {
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  return getAppStrings(locale).siteName;
}
