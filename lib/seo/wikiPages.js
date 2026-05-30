import { getLocalizedSiteName, SITE_URL } from '@/lib/seo/site';

export {
  getWikiNavItems,
  getWikiPage,
  getAllWikiSlugs,
  isWikiSlug,
  getAllStaticWikiParams,
} from '@/lib/seo/wikiRegistry';

export function buildWikiJsonLd(page, lang) {
  const url = `${SITE_URL}/${lang}/${page.slug}`;

  if (page.faqItems) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: lang,
      mainEntity: page.faqItems.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.description,
    url,
    inLanguage: lang,
    publisher: {
      '@type': 'Organization',
      name: getLocalizedSiteName(lang),
      url: SITE_URL,
    },
  };
}
