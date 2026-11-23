import {
  DEFAULT_USER_AVATAR_STYLE,
  normalizeUserAvatarStyle,
} from '@/lib/userAvatarStorage';

const MAX_AVATAR_SEED_LENGTH = 128;

function normalizeSeedValue(avatarSeed, fallbackUsername) {
  const raw = String(avatarSeed ?? '').trim().slice(0, MAX_AVATAR_SEED_LENGTH);
  if (raw) return raw;
  return String(fallbackUsername || 'user').trim().slice(0, MAX_AVATAR_SEED_LENGTH) || 'user';
}

export function normalizeUserProfile(username, avatarSeed, avatarStyle) {
  const name = String(username || '').trim();
  if (!name) return null;

  const seed = normalizeSeedValue(avatarSeed, name);
  const style = normalizeUserAvatarStyle(avatarStyle || DEFAULT_USER_AVATAR_STYLE);

  return { username: name, avatarSeed: seed, avatarStyle: style };
}

export function profileFromListItem(item) {
  if (typeof item === 'string') {
    return normalizeUserProfile(item, item, DEFAULT_USER_AVATAR_STYLE);
  }

  const username = item?.username || item?.name || '';
  return normalizeUserProfile(username, item?.avatarSeed, item?.avatarStyle);
}

function hasExplicitAvatarSeed(item) {
  if (typeof item === 'string') return false;
  return item?.avatarSeed != null && String(item.avatarSeed).trim() !== '';
}

function hasExplicitAvatarStyle(item) {
  if (typeof item === 'string') return false;
  return item?.avatarStyle != null && String(item.avatarStyle).trim() !== '';
}

/**
 * Scala profile użytkowników. Nie nadpisuje znanego awatara fallbackiem (nick jako seed),
 * gdy wpis nie zawiera jawnego avatarSeed (np. częściowy event socket).
 */
export function mergeUserProfiles(existing = {}, usersList) {
  const next = { ...existing };
  if (!Array.isArray(usersList)) return next;

  for (const item of usersList) {
    if (typeof item === 'string') {
      const name = item.trim();
      if (!name) continue;
      if (!next[name]) {
        next[name] = {
          avatarSeed: name,
          avatarStyle: DEFAULT_USER_AVATAR_STYLE,
        };
      }
      continue;
    }

    const username = String(item?.username || item?.name || '').trim();
    if (!username) continue;

    const prev = next[username];
    const explicitSeed = hasExplicitAvatarSeed(item);
    const explicitStyle = hasExplicitAvatarStyle(item);

    next[username] = {
      avatarSeed: explicitSeed
        ? normalizeSeedValue(item.avatarSeed, username)
        : (prev?.avatarSeed || username),
      avatarStyle: explicitStyle
        ? normalizeUserAvatarStyle(item.avatarStyle)
        : (prev?.avatarStyle || DEFAULT_USER_AVATAR_STYLE),
    };
  }

  return next;
}

/** Profil z listy użytkowników serwera (roomJoined / roomUsersList) — pełna zamiana stanu pokoju. */
export function buildUserProfilesFromServerUsers(usersList = []) {
  return mergeUserProfiles({}, usersList);
}

export function usernamesFromUsersList(usersList) {
  if (!Array.isArray(usersList)) return [];
  return usersList
    .map((item) => (typeof item === 'string' ? item : item?.username || item?.name || ''))
    .filter(Boolean);
}
