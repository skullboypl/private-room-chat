/** Pokój bez hasła — puste hasło w storage i na serwerze. */
export function isOpenRoomPassword(password) {
  return password === '';
}

/** Hasło znane (w tym pusty string dla kanału publicznego — nadal używany w E2E). */
export function isRoomPasswordKnown(password) {
  return password !== null && password !== undefined;
}

export function normalizeActiveRoomsList(list) {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      if (typeof item === 'string') {
        return { roomName: item, isOpen: false };
      }
      const roomName = item?.roomName || item?.name;
      if (!roomName) return null;
      const userCount = Number(item?.userCount);
      return {
        roomName,
        isOpen: Boolean(item.isOpen),
        userCount: Number.isFinite(userCount) && userCount >= 0 ? userCount : 0,
      };
    })
    .filter(Boolean);
}

export function findActiveRoomMeta(list, roomName) {
  const normalized = normalizeActiveRoomsList(list);
  return normalized.find((r) => r.roomName === roomName) || null;
}

export function getRoomUserCount(activeRooms, roomName) {
  const meta = findActiveRoomMeta(activeRooms, roomName);
  if (!meta || meta.userCount == null) return null;
  const count = Number(meta.userCount);
  return Number.isFinite(count) && count >= 0 ? count : null;
}

/** Liczba osób: lista aktywnych pokoi lub zapis w otwartym pokoju. */
export function resolveRoomUserCount(activeRooms, roomName, roomState) {
  return getRoomUserCount(activeRooms, roomName)
    ?? (roomState?.userCount != null ? Number(roomState.userCount) : null);
}

/** Czy kanał jest otwarty (bez hasła) — ze stanu pokoju lub listy aktywnych. */
export function isRoomOpenChannel(roomState, activeRooms, roomName) {
  if (roomState && isRoomPasswordKnown(roomState.password)) {
    return isOpenRoomPassword(roomState.password);
  }
  const meta = findActiveRoomMeta(activeRooms, roomName);
  return Boolean(meta?.isOpen);
}

/** Czy zapisany typ kanału (otwarty / z hasłem) zgadza się z listą serwera. */
export function roomCredentialMatchesServer(storedPassword, meta) {
  if (!meta) return false;
  if (!isRoomPasswordKnown(storedPassword)) return true;
  const storedOpen = isOpenRoomPassword(storedPassword);
  return storedOpen === Boolean(meta.isOpen);
}

/** Auto-przywracanie tylko dla kanałów publicznych zgodnych z serwerem. */
export function canAutoRestoreRoom(storedPassword, meta) {
  if (!meta || !isRoomPasswordKnown(storedPassword)) return false;
  return isOpenRoomPassword(storedPassword) && Boolean(meta.isOpen);
}
