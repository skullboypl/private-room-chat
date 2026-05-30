import { Inter } from 'next/font/google';
import { SITE_NAME, SITE_TAGLINE, SITE_URL, SITE_HOST } from '@/lib/seo/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport = {
  themeColor: '#6366f1',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata = {
  title: `${SITE_NAME} · ${SITE_TAGLINE}`,
  description: 'Twórz prywatne pokoje czatu z hasłem i rozmawiaj w czasie rzeczywistym. Szyfrowanie E2E, linki zaproszenia, czat na żywo.',
  keywords: ['czat online', 'pokoje czatu', 'messenger', 'E2E', SITE_HOST],
  authors: [{ name: SITE_NAME }],
  robots: { index: true, follow: true },
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: SITE_NAME,
  },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName: SITE_NAME,
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: 'Twórz prywatne pokoje czatu z hasłem i rozmawiaj w czasie rzeczywistym.',
    url: `${SITE_URL}/`,
    images: [{ url: '/og-image.svg' }],
  },
  twitter: {
    card: 'summary',
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: 'Szyfrowany messenger z pokojami na hasło.',
    images: ['/og-image.svg'],
  },
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl" className={inter.variable}>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
