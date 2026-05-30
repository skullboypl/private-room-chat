'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOCALES, LOCALE_LABELS, wikiPath, isLocale } from '@/lib/i18n/config';
import { getUiStrings } from '@/lib/i18n/ui';

export default function LangSwitcher({ lang }) {
  const pathname = usePathname();
  const ui = getUiStrings(lang);

  const segments = pathname.split('/').filter(Boolean);
  const slug = isLocale(segments[0]) ? segments[1] : segments[0];

  return (
    <div className="lang-switcher" role="navigation" aria-label={ui.langSwitchAria}>
      {LOCALES.map((locale) => {
        const href = slug ? wikiPath(locale, slug) : `/${locale}/o-nas`;
        const active = locale === lang;
        return (
          <Link
            key={locale}
            href={href}
            className={`lang-switcher__btn${active ? ' lang-switcher__btn--active' : ''}`}
            hrefLang={locale}
            aria-current={active ? 'true' : undefined}
          >
            {LOCALE_LABELS[locale]}
          </Link>
        );
      })}
    </div>
  );
}
