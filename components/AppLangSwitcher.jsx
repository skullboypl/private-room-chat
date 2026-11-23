'use client';

import { LOCALE_LABELS, LOCALES } from '@/lib/i18n/config';
import { useTranslation } from '@/context/LocaleContext';
import '@/components/AppLangSwitcher.css';

export default function AppLangSwitcher({ className = '' }) {
  const { lang, setLang, t } = useTranslation();

  return (
    <div
      className={['app-lang-switcher', className].filter(Boolean).join(' ')}
      role="navigation"
      aria-label={t('langSwitchAria')}
    >
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          className={`app-lang-switcher__btn${locale === lang ? ' app-lang-switcher__btn--active' : ''}`}
          onClick={() => setLang(locale)}
          aria-pressed={locale === lang}
        >
          {LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
