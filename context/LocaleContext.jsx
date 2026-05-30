'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, isLocale, LOCALE_HTML } from '@/lib/i18n/config';
import { createTranslator } from '@/lib/i18n/app';
import { readStoredLocale, writeStoredLocale } from '@/lib/i18n/locale';

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLangState(readStoredLocale());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = LOCALE_HTML[lang] || LOCALE_HTML.pl;
  }, [lang, ready]);

  const setLang = useCallback((next) => {
    if (!isLocale(next)) return;
    writeStoredLocale(next);
    setLangState(next);
  }, []);

  const value = useMemo(() => ({
    lang,
    setLang,
    t: createTranslator(lang),
    ready,
  }), [lang, setLang, ready]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}

export function useTranslation() {
  const { lang, setLang, t, ready } = useLocale();
  return { lang, setLang, t, ready };
}

export function useOptionalTranslation(fallbackLang = DEFAULT_LOCALE) {
  const ctx = useContext(LocaleContext);
  if (ctx) {
    return { lang: ctx.lang, setLang: ctx.setLang, t: ctx.t, ready: ctx.ready };
  }

  const lang = isLocale(fallbackLang) ? fallbackLang : DEFAULT_LOCALE;
  return {
    lang,
    setLang: () => {},
    t: createTranslator(lang),
    ready: true,
  };
}
