const USER_AVATAR_STYLES = ['avataaars-neutral', 'bottts-neutral'];
const DEFAULT_USER_AVATAR_STYLE = 'avataaars-neutral';

function normalizeUserAvatarStyle(style) {
  const value = String(style || '').trim().toLowerCase();
  if (value === 'avataaars') return 'avataaars-neutral';
  if (USER_AVATAR_STYLES.includes(value)) return value;
  return DEFAULT_USER_AVATAR_STYLE;
}

module.exports = {
  USER_AVATAR_STYLES,
  DEFAULT_USER_AVATAR_STYLE,
  normalizeUserAvatarStyle,
};
