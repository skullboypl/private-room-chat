import { notFound } from 'next/navigation';
import { isLocale, LOCALE_OG, buildLanguageAlternates } from '@/lib/i18n/config';
import { getAllStaticWikiParams, getWikiPage, buildWikiJsonLd } from '@/lib/seo/wikiPages';
import { SITE_URL } from '@/lib/seo/site';
import WikiArticle from '@/components/seo/WikiArticle';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return getAllStaticWikiParams();
}

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};

  const page = getWikiPage(lang, slug);
  if (!page) return {};

  const title = page.title;
  const url = `${SITE_URL}/${lang}/${slug}`;
  const languages = Object.fromEntries(
    Object.entries(buildLanguageAlternates(slug)).map(([locale, path]) => [
      locale,
      `${SITE_URL}${path}`,
    ]),
  );

  return {
    title,
    description: page.description,
    alternates: {
      canonical: `/${lang}/${slug}`,
      languages,
    },
    openGraph: {
      title,
      description: page.description,
      url,
      locale: LOCALE_OG[lang],
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description: page.description,
    },
  };
}

export default async function WikiPageRoute({ params }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const page = getWikiPage(lang, slug);
  if (!page) notFound();

  const jsonLd = buildWikiJsonLd(page, lang);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WikiArticle page={page} lang={lang} />
    </>
  );
}
