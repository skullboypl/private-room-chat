import { normalizeRoomChannelId } from '@/lib/roomChannelId';
import {
  secureSessionGetSync,
  secureSessionRemove,
  secureSessionSetSync,
} from '@/lib/secureBrowserStorage';

const OPEN_ROOMS_KEY = 'openRooms';
const ACTIVE_ROOM_KEY = 'activeRoom';

function readRoomSessionEntry(roomName) {
  const raw = secureSessionGetSync(`room:${roomName}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setRoomSession(roomName, password, roomChannelId = '') {
  const channelId = normalizeRoomChannelId(roomChannelId);
  secureSessionSetSync(
    `room:${roomName}`,
    JSON.stringify({
      password,
      roomChannelId: channelId,
    }),
  );
}

export function getRoomPassword(roomName) {
  const entry = readRoomSessionEntry(roomName);
  return entry?.password ?? null;
}

/** Wewnętrzny identyfikator instancji kanału — nigdy nie pokazywać w UI. */
export function getRoomChannelId(roomName) {
  const entry = readRoomSessionEntry(roomName);
  return normalizeRoomChannelId(entry?.roomChannelId);
}

export function clearRoomSession(roomName) {
  if (roomName) secureSessionRemove(`room:${roomName}`);
}

export function loadPersistedSession() {
  try {
    const listRaw = secureSessionGetSync(OPEN_ROOMS_KEY);
    const list = listRaw ? JSON.parse(listRaw) : [];
    const activeRoom = secureSessionGetSync(ACTIVE_ROOM_KEY) || null;
    return {
      list: Array.isArray(list) ? list : [],
      activeRoom,
    };
  } catch {
    return { list: [], activeRoom: null };
  }
}

export function persistOpenRooms(openRoomsMap, activeRoomName) {
  const list = Object.entries(openRoomsMap).map(([roomName, data]) => ({
    roomName,
    password: data.needsPasswordReentry ? null : data.password,
    roomChannelId: data.needsPasswordReentry ? '' : (data.roomChannelId || ''),
    needsPasswordReentry: Boolean(data.needsPasswordReentry),
    suspendedAt: data.suspendedAt || null,
    assignedUsername: data.assignedUsername || '',
    lastPreview: data.lastPreview || '',
    lastTimestamp: data.lastTimestamp || '',
    unread: data.unread || 0,
  }));

  secureSessionSetSync(OPEN_ROOMS_KEY, JSON.stringify(list));

  if (activeRoomName) {
    secureSessionSetSync(ACTIVE_ROOM_KEY, activeRoomName);
  } else {
    secureSessionRemove(ACTIVE_ROOM_KEY);
  }
}

export function clearPersistedSession() {
  secureSessionRemove(OPEN_ROOMS_KEY);
  secureSessionRemove(ACTIVE_ROOM_KEY);
}
