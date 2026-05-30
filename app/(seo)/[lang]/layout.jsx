import { notFound } from 'next/navigation';
import { isLocale, LOCALE_HTML } from '@/lib/i18n/config';
import InfoHeader from '@/components/seo/InfoHeader';
import InfoFooter from '@/components/seo/InfoFooter';
import '@/components/seo/seo.css';

export function generateStaticParams() {
  return [{ lang: 'pl' }, { lang: 'en' }];
}

export default async function SeoLangLayout({ children, params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <div className="seo-shell" lang={LOCALE_HTML[lang]}>
      <InfoHeader lang={lang} />
      <main className="seo-main">{children}</main>
      <InfoFooter lang={lang} />
    </div>
  );
}
