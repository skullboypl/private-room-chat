import Link from 'next/link';
import { getWikiPage } from '@/lib/seo/wikiPages';
import { getLocalizedSiteName } from '@/lib/seo/site';
import { wikiPath } from '@/lib/i18n/config';
import { getUiStrings } from '@/lib/i18n/ui';

const TITLE_SEP = ' · ';

function splitWikiTitle(title) {
  if (!title.includes(TITLE_SEP)) {
    return { main: title, subtitle: null };
  }
  const [main, ...rest] = title.split(TITLE_SEP);
  return { main, subtitle: rest.join(TITLE_SEP) };
}

export default function WikiArticle({ page, lang = 'pl' }) {
  const ui = getUiStrings(lang);
  const siteName = getLocalizedSiteName(lang);
  const related = (page.relatedSlugs || [])
    .map((slug) => getWikiPage(lang, slug))
    .filter(Boolean);

  const { main, subtitle } = splitWikiTitle(page.title);

  return (
    <article className="wiki-article">
      <header className="wiki-article__header">
        <p className="wiki-article__eyebrow">{siteName}</p>
        <h1>{main}</h1>
        {subtitle && (
          <p className="wiki-article__subtitle">{subtitle}</p>
        )}
      </header>

      {page.faqItems ? (
        <div className="wiki-faq">
          {page.faqItems.map((item) => (
            <details key={item.q} className="wiki-faq__item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      ) : (
        page.sections?.map((section) => (
          <section key={section.heading} className="wiki-section">
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((text) => (
              <p key={text.slice(0, 40)}>{text}</p>
            ))}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}

      {related.length > 0 && (
        <aside className="wiki-related">
          <h2>{ui.relatedArticles}</h2>
          <ul>
            {related.map((rel) => (
              <li key={rel.slug}>
                <Link href={wikiPath(lang, rel.slug)}>{splitWikiTitle(rel.title).main}</Link>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <div className="wiki-cta">
        <p>{ui.ctaReady}</p>
        <Link href="/" className="btn btn--primary">{ui.ctaButton}</Link>
      </div>
    </article>
  );
}
