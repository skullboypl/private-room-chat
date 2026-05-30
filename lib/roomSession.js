const OPEN_ROOMS_KEY = 'chat:openRooms';
const ACTIVE_ROOM_KEY = 'chat:activeRoom';

export function setRoomSession(roomName, password) {
  sessionStorage.setItem(`room:${roomName}`, JSON.stringify({ password }));
}

export function getRoomPassword(roomName) {
  try {
    return JSON.parse(sessionStorage.getItem(`room:${roomName}`))?.password ?? null;
  } catch {
    return null;
  }
}

export function clearRoomSession(roomName) {
  if (roomName) sessionStorage.removeItem(`room:${roomName}`);
}

export function loadPersistedSession() {
  try {
    const list = JSON.parse(sessionStorage.getItem(OPEN_ROOMS_KEY) || '[]');
    const activeRoom = sessionStorage.getItem(ACTIVE_ROOM_KEY) || null;
    return {
      list: Array.isArray(list) ? list : [],
      activeRoom,
    };
  } catch {
    return { list: [], activeRoom: null };
  }
}

export function persistOpenRooms(openRoomsMap, activeRoomName) {
  // Metadane kanału — bez treści wiadomości (E2E, efemerycznie).
  const list = Object.entries(openRoomsMap).map(([roomName, data]) => ({
    roomName,
    password: data.needsPasswordReentry ? null : data.password,
    needsPasswordReentry: Boolean(data.needsPasswordReentry),
    assignedUsername: data.assignedUsername || '',
    lastPreview: data.lastPreview || '',
    lastTimestamp: data.lastTimestamp || '',
    unread: data.unread || 0,
  }));

  sessionStorage.setItem(OPEN_ROOMS_KEY, JSON.stringify(list));

  if (activeRoomName) {
    sessionStorage.setItem(ACTIVE_ROOM_KEY, activeRoomName);
  } else {
    sessionStorage.removeItem(ACTIVE_ROOM_KEY);
  }
}

export function clearPersistedSession() {
  sessionStorage.removeItem(OPEN_ROOMS_KEY);
  sessionStorage.removeItem(ACTIVE_ROOM_KEY);
}
