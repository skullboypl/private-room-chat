'use client';

import { useMemo } from 'react';
import { getUserAvatarDataUri } from '@/lib/userAvatar';
import { DEFAULT_USER_AVATAR_STYLE } from '@/lib/userAvatarStorage';
import './UserAvatar.css';

/**
 * Client avatar — generacja w useMemo, zgodnie z przewodnikiem DiceBear + Next.js:
 * https://www.dicebear.com/guides/use-the-library-with-next-js/
 */
export default function UserAvatar({
  seed,
  style = DEFAULT_USER_AVATAR_STYLE,
  className = '',
  size = 40,
  alt = '',
}) {
  const src = useMemo(
    () => getUserAvatarDataUri(seed, style, size),
    [seed, style, size],
  );

  return (
    <img
      src={src}
      alt={alt || ''}
      className={['user-avatar', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
