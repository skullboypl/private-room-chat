import { secureLocalGetSync, secureLocalSetSync } from '@/lib/secureBrowserStorage';

const STORAGE_KEY = 'roomQuickEmoji';
const DEFAULT_QUICK_EMOJI = '👍';

function loadMap() {
  try {
    const raw = secureLocalGetSync(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMap(map) {
  secureLocalSetSync(STORAGE_KEY, JSON.stringify(map));
}

export function getRoomQuickEmoji(roomName) {
  if (!roomName) return DEFAULT_QUICK_EMOJI;
  return loadMap()[roomName] || DEFAULT_QUICK_EMOJI;
}

export function applyRoomQuickEmoji(roomName, emoji) {
  if (!roomName || !emoji) return;
  const map = loadMap();
  map[roomName] = emoji;
  saveMap(map);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('roomQuickEmojiChanged', { detail: { roomName, emoji } }));
  }
}

export function setRoomQuickEmoji(roomName, emoji) {
  applyRoomQuickEmoji(roomName, emoji);
}

export { DEFAULT_QUICK_EMOJI };
