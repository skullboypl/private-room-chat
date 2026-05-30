import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/config';

export const LOCALE_STORAGE_KEY = 'app:locale';

export function detectBrowserLocale() {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const lang = navigator.language?.toLowerCase() || '';
  return lang.startsWith('en') ? 'en' : DEFAULT_LOCALE;
}

export function readStoredLocale() {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : detectBrowserLocale();
}

export function writeStoredLocale(locale) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function formatAppTime(date = new Date(), lang = DEFAULT_LOCALE) {
  return date.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'pl-PL');
}
