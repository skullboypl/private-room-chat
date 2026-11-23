const COMMON_TLDS = [
  'com', 'pl', 'net', 'org', 'io', 'dev', 'app', 'eu', 'co', 'uk', 'de', 'fr', 'cz', 'sk',
  'info', 'xyz', 'online', 'site', 'tech', 'store', 'blog', 'shop', 'live', 'cloud', 'pro',
  'me', 'tv', 'cc', 'us', 'ca', 'au', 'biz', 'edu', 'gov', 'nl', 'be', 'at', 'ch', 'se',
  'no', 'fi', 'it', 'es', 'pt', 'ro', 'hu', 'lt', 'lv', 'ee', 'ru', 'ua', 'jp', 'cn', 'in',
  'br', 'mx', 'link', 'click', 'space', 'club', 'vip', 'fun', 'game', 'news', 'media',
  'email', 'one', 'top', 'wtf', 'cat', 'ai', 'run', 'page', 'wiki', 'social', 'network',
].join('|');

const URL_PATTERN = new RegExp(
  `(https?:\\/\\/[^\\s<>"']+|(?:www\\.)?[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\\.(?:${COMMON_TLDS})(?:[^\\s<>"']*)?)`,
  'gi',
);

function splitTrailingPunctuation(raw) {
  let url = raw;
  let trailing = '';

  while (url.length > 0 && /[.,;:!?)}\]'"\u201d\u2019]$/.test(url)) {
    trailing = url.slice(-1) + trailing;
    url = url.slice(0, -1);
  }

  return { url, trailing };
}

export function normalizeLinkHref(raw) {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return `https://${trimmed}`;
}

export function isSafeHref(href) {
  try {
    const parsed = new URL(href);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function splitTextWithLinks(text) {
  if (!text) return [{ type: 'text', value: '' }];

  const parts = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, matchIndex) });
    }

    const { url, trailing } = splitTrailingPunctuation(match[0]);
    if (url) {
      const href = normalizeLinkHref(url);
      if (isSafeHref(href)) {
        parts.push({ type: 'link', value: url, href });
      } else {
        parts.push({ type: 'text', value: url });
      }
    }

    if (trailing) {
      parts.push({ type: 'text', value: trailing });
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', value: text });
  }

  return parts;
}
