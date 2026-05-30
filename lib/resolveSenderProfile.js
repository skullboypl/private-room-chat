import {
  DEFAULT_USER_AVATAR_STYLE,
  ensureStoredUserAvatar,
  readStoredUserAvatarSeed,
  readStoredUserAvatarStyle,
} from '@/lib/userAvatarStorage';
import { normalizeUserProfile } from '@/lib/roomUserProfiles';

/**
 * Awatar z userProfiles pokoju — ten sam dla Ciebie i dla innych użytkowników.
 */
export function resolveSenderProfile(roomData, sender, username) {
  if (!sender) {
    return { avatarSeed: 'guest', avatarStyle: DEFAULT_USER_AVATAR_STYLE };
  }

  const stored = roomData?.userProfiles?.[sender];
  if (stored?.avatarSeed) {
    return {
      avatarSeed: stored.avatarSeed,
      avatarStyle: stored.avatarStyle || DEFAULT_USER_AVATAR_STYLE,
    };
  }

  const me = roomData?.assignedUsername || username;
  if (sender === me) {
    return {
      avatarSeed: readStoredUserAvatarSeed() || ensureStoredUserAvatar(),
      avatarStyle: readStoredUserAvatarStyle(),
    };
  }

  return normalizeUserProfile(sender, sender, DEFAULT_USER_AVATAR_STYLE);
}
