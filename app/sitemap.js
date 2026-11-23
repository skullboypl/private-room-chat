import { SITE_URL } from '@/lib/seo/site';
import { LOCALES } from '@/lib/i18n/config';
import { getAllWikiSlugs } from '@/lib/seo/wikiPages';

export default function sitemap() {
  const now = new Date();
  const entries = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  for (const lang of LOCALES) {
    for (const slug of getAllWikiSlugs(lang)) {
      const languages = Object.fromEntries(
        LOCALES.map((locale) => [locale, `${SITE_URL}/${locale}/${slug}`]),
      );

      entries.push({
        url: `${SITE_URL}/${lang}/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: lang === 'pl' ? 0.8 : 0.75,
        alternates: { languages },
      });
    }
  }

  return entries;
}
