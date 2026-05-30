export const LOCALES = ['pl', 'en'];
export const DEFAULT_LOCALE = 'pl';

export const LOCALE_LABELS = {
  pl: 'Polski',
  en: 'English',
};

export const LOCALE_HTML = {
  pl: 'pl',
  en: 'en',
};

export const LOCALE_OG = {
  pl: 'pl_PL',
  en: 'en_US',
};

export function isLocale(value) {
  return LOCALES.includes(value);
}

export function wikiPath(lang, slug) {
  return `/${lang}/${slug}`;
}

export function buildLanguageAlternates(slug) {
  return Object.fromEntries(LOCALES.map((lang) => [lang, wikiPath(lang, slug)]));
}
