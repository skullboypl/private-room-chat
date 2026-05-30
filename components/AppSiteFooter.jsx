'use client';

import Link from 'next/link';
import { useTranslation } from '@/context/LocaleContext';
import { getWikiNavItems } from '@/lib/seo/wikiPages';
import { DEFAULT_LOCALE, wikiPath } from '@/lib/i18n/config';
import { getAppStrings } from '@/lib/i18n/app';
import {
  SITE_AUTHOR,
  STACK_ITEMS,
} from '@/lib/siteFooterShared';
import { SITE_HOST } from '@/lib/seo/site';
import ClearBrowserDataButton from '@/components/ClearBrowserDataButton';
import './AppSiteFooter.css';

export default function AppSiteFooter({ variant = 'inline' }) {
  const { t, lang } = useTranslation();
  const appStrings = getAppStrings(lang || DEFAULT_LOCALE);
  const navItems = getWikiNavItems(lang || DEFAULT_LOCALE);
  const year = new Date().getFullYear();

  return (
    <footer
      className={[
        'app-site-footer',
        variant === 'welcome' ? 'app-site-footer--welcome' : '',
        variant === 'dock' ? 'app-site-footer--dock' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="app-site-footer__inner">
        <nav className="app-site-footer__nav" aria-label={t('footer.navAria')}>
          <ul className="app-site-footer__links">
            {navItems.map(({ slug, label }) => (
              <li key={slug}>
                <Link href={wikiPath(lang || DEFAULT_LOCALE, slug)}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="app-site-footer__actions">
          <ClearBrowserDataButton />
        </div>

        <p className="app-site-footer__credit">
          {t('footer.credit')}{' '}
          <a
            href={SITE_AUTHOR.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {SITE_AUTHOR.name}
          </a>
        </p>

        <p className="app-site-footer__stack" aria-label={t('footer.stackAria')}>
          {STACK_ITEMS.map((item, index) => (
            <span key={item} className="app-site-footer__stack-item">
              {index > 0 ? <span className="app-site-footer__heart" aria-hidden="true">♥</span> : null}
              {item}
            </span>
          ))}
        </p>

        <div className="app-site-footer__legal">
          {appStrings.footer.disclaimer.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <p className="app-site-footer__copy">© {year} {SITE_HOST}</p>
      </div>
    </footer>
  );
}
