'use client';

/**
 * DiceBear w Next.js — client component + useMemo (patrz:
 * https://www.dicebear.com/guides/use-the-library-with-next-js/)
 */
import { Avatar, Style } from '@dicebear/core';
import avataaarsNeutralDefinition from '@dicebear/styles/avataaars-neutral.json';
import botttsNeutralDefinition from '@dicebear/styles/bottts-neutral.json';
import {
  DEFAULT_USER_AVATAR_STYLE,
  normalizeUserAvatarStyle,
} from '@/lib/userAvatarStorage';

const avataaarsNeutralStyle = new Style(avataaarsNeutralDefinition);
const botttsNeutralStyle = new Style(botttsNeutralDefinition);

const STYLE_MAP = {
  'avataaars-neutral': avataaarsNeutralStyle,
  'bottts-neutral': botttsNeutralStyle,
};

const dataUriCache = new Map();

function resolveStyle(style) {
  const key = normalizeUserAvatarStyle(style);
  return STYLE_MAP[key] || avataaarsNeutralStyle;
}

export function getUserAvatarDataUri(seed, style = DEFAULT_USER_AVATAR_STYLE, size = 64) {
  const safeSeed = String(seed || 'guest').slice(0, 128);
  const safeStyle = normalizeUserAvatarStyle(style);
  const cacheKey = `${safeStyle}:${size}:${safeSeed}`;

  if (dataUriCache.has(cacheKey)) {
    return dataUriCache.get(cacheKey);
  }

  const uri = new Avatar(resolveStyle(safeStyle), {
    seed: safeSeed,
    size,
  }).toDataUri();

  dataUriCache.set(cacheKey, uri);
  return uri;
}

export function invalidateUserAvatarCache() {
  dataUriCache.clear();
}
