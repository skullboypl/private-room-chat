/** Ciemne tła awatarów kanałów — deterministycznie z nazwy pokoju. */
const ROOM_AVATAR_COLORS = [
  '#1e3a5f',
  '#2d3748',
  '#1a365d',
  '#234e52',
  '#22543d',
  '#2c5282',
  '#553c9a',
  '#44337a',
  '#702459',
  '#742a2a',
  '#7b341e',
  '#744210',
  '#285e61',
  '#2d1b4e',
  '#1a202c',
  '#3d2c4a',
];

function hashRoomName(roomName) {
  const key = String(roomName ?? '').trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getRoomAvatarColor(roomName) {
  const idx = hashRoomName(roomName) % ROOM_AVATAR_COLORS.length;
  return ROOM_AVATAR_COLORS[idx];
}

export function getRoomAvatarStyle(roomName) {
  return { backgroundColor: getRoomAvatarColor(roomName) };
}

function firstSignificantChar(segment) {
  for (const ch of segment) {
    if (/\p{L}/u.test(ch)) return ch.toLocaleUpperCase('pl-PL');
    if (/\p{N}/u.test(ch)) return ch;
  }
  return segment.charAt(0).toUpperCase();
}

/** Dwie litery/cyfry inicjałów z nazwy kanału. */
export function getRoomAvatarInitials(roomName) {
  const raw = String(roomName ?? '').trim();
  if (!raw) return '??';

  const segments = raw.split(/[\s_\-./#+]+/).filter((s) => s.length > 0);

  if (segments.length >= 2) {
    return (firstSignificantChar(segments[0]) + firstSignificantChar(segments[1])).slice(0, 2);
  }

  const word = segments[0] || raw;
  const chars = [];
  for (const ch of word) {
    if (/\p{L}/u.test(ch)) chars.push(ch.toLocaleUpperCase('pl-PL'));
    else if (/\p{N}/u.test(ch)) chars.push(ch);
    if (chars.length >= 2) break;
  }

  if (chars.length >= 2) return chars.join('').slice(0, 2);
  if (chars.length === 1) return `${chars[0]}${chars[0]}`;
  return raw.slice(0, 2).toUpperCase();
}
