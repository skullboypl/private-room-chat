import { NextResponse } from 'next/server';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/config';
import { isWikiSlug } from '@/lib/seo/wikiRegistry';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 1 && isWikiSlug(segments[0])) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}/${segments[0]}`;
    return NextResponse.redirect(url, 308);
  }

  if (segments.length >= 2 && isLocale(segments[0]) && isWikiSlug(segments[1])) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon\\.svg|manifest\\.webmanifest|sw\\.js|og-image\\.svg|.*\\..*).*)',
  ],
};
