export const USER_AVATAR_SEED_KEY = 'userAvatarSeed';
export const USER_AVATAR_STYLE_KEY = 'userAvatarStyle';

/** DiceBear neutral styles — lepsze w małych rozmiarach. */
export const USER_AVATAR_STYLES = ['avataaars-neutral', 'bottts-neutral'];
export const DEFAULT_USER_AVATAR_STYLE = 'avataaars-neutral';

export function normalizeUserAvatarStyle(style) {
  const value = String(style || '').trim().toLowerCase();
  if (value === 'avataaars') return 'avataaars-neutral';
  if (USER_AVATAR_STYLES.includes(value)) return value;
  return DEFAULT_USER_AVATAR_STYLE;
}

export function readStoredUserAvatarSeed() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(USER_AVATAR_SEED_KEY)?.trim() || '';
}

export function readStoredUserAvatarStyle() {
  if (typeof window === 'undefined') return DEFAULT_USER_AVATAR_STYLE;
  return normalizeUserAvatarStyle(localStorage.getItem(USER_AVATAR_STYLE_KEY));
}

export function writeStoredUserAvatar(seed, style = DEFAULT_USER_AVATAR_STYLE) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_AVATAR_SEED_KEY, seed);
  localStorage.setItem(USER_AVATAR_STYLE_KEY, normalizeUserAvatarStyle(style));
}

export function clearStoredUserAvatar() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_AVATAR_SEED_KEY);
  localStorage.removeItem(USER_AVATAR_STYLE_KEY);
}

export function createRandomAvatarSeed() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createRandomAvatarStyle() {
  return USER_AVATAR_STYLES[Math.floor(Math.random() * USER_AVATAR_STYLES.length)];
}

export function createRandomAvatar() {
  return {
    seed: createRandomAvatarSeed(),
    style: createRandomAvatarStyle(),
  };
}

export function randomizeStoredUserAvatar() {
  const { seed, style } = createRandomAvatar();
  writeStoredUserAvatar(seed, style);
  return { seed, style };
}

/** Zapewnia zapisany seed (np. przed dołączeniem do pokoju). */
export function ensureStoredUserAvatar() {
  const existing = readStoredUserAvatarSeed();
  if (existing) return existing;
  return randomizeStoredUserAvatar().seed;
}

export function getJoinAvatarPayload() {
  return {
    avatarSeed: ensureStoredUserAvatar(),
    avatarStyle: readStoredUserAvatarStyle(),
  };
}

export function clearUserSessionStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('username');
  clearStoredUserAvatar();
}
