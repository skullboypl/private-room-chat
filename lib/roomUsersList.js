import {
  DEFAULT_USER_AVATAR_STYLE,
  normalizeUserAvatarStyle,
} from '@/lib/userAvatarStorage';

/** Normalizuje listę użytkowników z `roomUsersList`. */
export function normalizeRoomUsersList(list) {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      if (typeof item === 'string') {
        return {
          username: item,
          joinedAt: null,
          avatarSeed: item,
          avatarStyle: DEFAULT_USER_AVATAR_STYLE,
        };
      }
      const username = item?.username || item?.name || '';
      if (!username) return null;
      const joinedAt = Number(item?.joinedAt);
      return {
        username,
        joinedAt: Number.isFinite(joinedAt) ? joinedAt : null,
        avatarSeed: String(item?.avatarSeed || username).trim() || username,
        avatarStyle: normalizeUserAvatarStyle(item?.avatarStyle || DEFAULT_USER_AVATAR_STYLE),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0));
}
