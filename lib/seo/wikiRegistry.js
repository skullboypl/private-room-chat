import { isLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';
import { WIKI_NAV as WIKI_NAV_PL, WIKI_PAGES as WIKI_PAGES_PL } from '@/lib/seo/content/pl';
import { WIKI_NAV as WIKI_NAV_EN, WIKI_PAGES as WIKI_PAGES_EN } from '@/lib/seo/content/en';

const REGISTRY = {
  pl: { nav: WIKI_NAV_PL, pages: WIKI_PAGES_PL },
  en: { nav: WIKI_NAV_EN, pages: WIKI_PAGES_EN },
};

function getRegistry(lang) {
  return REGISTRY[isLocale(lang) ? lang : DEFAULT_LOCALE];
}

export function getWikiNavItems(lang = DEFAULT_LOCALE) {
  return getRegistry(lang).nav;
}

export function getWikiPage(lang, slug) {
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  return REGISTRY[locale].pages.find((page) => page.slug === slug) ?? null;
}

export function getAllWikiSlugs(lang = DEFAULT_LOCALE) {
  return getRegistry(lang).pages.map((page) => page.slug);
}

export function isWikiSlug(slug) {
  return getAllWikiSlugs(DEFAULT_LOCALE).includes(slug);
}

export function getAllStaticWikiParams() {
  return Object.keys(REGISTRY).flatMap((lang) =>
    getAllWikiSlugs(lang).map((slug) => ({ lang, slug })),
  );
}
