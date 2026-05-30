import Link from 'next/link';
import { SITE_HOST, getLocalizedSiteName } from '@/lib/seo/site';
import { getWikiNavItems } from '@/lib/seo/wikiPages';
import { wikiPath } from '@/lib/i18n/config';
import { getUiStrings } from '@/lib/i18n/ui';
import LangSwitcher from '@/components/seo/LangSwitcher';

export default function InfoHeader({ lang = 'pl' }) {
  const navItems = getWikiNavItems(lang);
  const ui = getUiStrings(lang);
  const siteName = getLocalizedSiteName(lang);

  return (
    <header className="seo-header">
      <div className="seo-header__inner">
        <Link href="/" className="seo-header__brand">
          <span className="seo-header__logo" aria-hidden="true">💬</span>
          <span>
            <strong>{siteName}</strong>
            <small>{SITE_HOST}</small>
          </span>
        </Link>
        <nav className="seo-header__nav" aria-label={ui.navAria}>
          {navItems.map(({ slug, label }) => (
            <Link
              key={slug}
              href={wikiPath(lang, slug)}
              className="seo-header__link"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="seo-header__actions">
          <LangSwitcher lang={lang} />
          <Link href="/" className="seo-header__cta btn btn--primary btn--sm">
            {ui.openChat}
          </Link>
        </div>
      </div>
    </header>
  );
}
