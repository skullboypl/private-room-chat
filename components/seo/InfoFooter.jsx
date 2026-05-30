import Link from 'next/link';
import { getLocalizedSiteName, SITE_URL } from '@/lib/seo/site';
import { getWikiNavItems } from '@/lib/seo/wikiPages';
import { wikiPath } from '@/lib/i18n/config';
import { getUiStrings } from '@/lib/i18n/ui';
import {
  SITE_AUTHOR,
  STACK_ITEMS,
} from '@/lib/siteFooterShared';
import ClearBrowserDataButton from '@/components/ClearBrowserDataButton';

export default function InfoFooter({ lang = 'pl' }) {
  const navItems = getWikiNavItems(lang);
  const ui = getUiStrings(lang);
  const siteName = getLocalizedSiteName(lang);
  const year = new Date().getFullYear();

  return (
    <footer className="seo-footer">
      <div className="seo-footer__inner">
        <div className="seo-footer__brand">
          <p className="seo-footer__title">{siteName}</p>
          <p className="seo-footer__tagline">{ui.footerTagline}</p>
        </div>
        <nav className="seo-footer__nav" aria-label={ui.footerNavAria}>
          <ul className="seo-footer__list">
            {navItems.map(({ slug, label }) => (
              <li key={slug}>
                <Link href={wikiPath(lang, slug)}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="seo-footer__extra">
        <ClearBrowserDataButton className="seo-footer__clear-btn" lang={lang} />
        <p className="seo-footer__credit">
          {ui.footerCredit}{' '}
          <a href={SITE_AUTHOR.url} target="_blank" rel="noopener noreferrer">
            {SITE_AUTHOR.name}
          </a>
        </p>
        <p className="seo-footer__stack" aria-label="Stack">
          {STACK_ITEMS.map((item, index) => (
            <span key={item} className="seo-footer__stack-item">
              {index > 0 ? <span className="seo-footer__heart" aria-hidden="true">♥</span> : null}
              {item}
            </span>
          ))}
        </p>
        <div className="seo-footer__legal">
          {ui.footerDisclaimer.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div className="seo-footer__bottom">
        <p>© {year} {SITE_URL.replace('https://', '')}</p>
        <Link href="/">{ui.backToChat}</Link>
      </div>
    </footer>
  );
}
