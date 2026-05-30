'use client';

import { LocaleProvider } from '@/context/LocaleContext';

/** PiP renderuje się w osobnym oknie poza drzewem React aplikacji — wymaga własnego providera. */
export default function PiPRoot({ lang, children }) {
  return (
    <LocaleProvider initialLang={lang}>
      {children}
    </LocaleProvider>
  );
}
