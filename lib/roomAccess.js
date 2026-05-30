import { getRoomPassword, getRoomChannelId } from '@/lib/roomSession';
import { normalizeRoomChannelId } from '@/lib/roomChannelId';

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
      const deletesAtRaw = Number(item?.deletesAt);
      const deletesAt = Number.isFinite(deletesAtRaw) && deletesAtRaw > Date.now()
        ? deletesAtRaw
        : null;
      return {
        roomName,
        isOpen: Boolean(item.isOpen),
        userCount: Number.isFinite(userCount) && userCount >= 0 ? userCount : 0,
        deletesAt,
        roomChannelId: normalizeRoomChannelId(item?.roomChannelId),
      };
    })
    .filter(Boolean);
}

export function findActiveRoomMeta(list, roomName) {
  const normalized = normalizeActiveRoomsList(list);
  return normalized.find((r) => r.roomName === roomName) || null;
}

export function getRoomDeletesAt(activeRooms, roomName) {
  const meta = findActiveRoomMeta(activeRooms, roomName);
  return meta?.deletesAt ?? null;
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
export function roomCredentialMatchesServer(storedPassword, meta, storedChannelId = '') {
  if (!meta) return false;
  const clientId = normalizeRoomChannelId(storedChannelId);
  const serverId = normalizeRoomChannelId(meta?.roomChannelId);
  if (clientId && serverId && clientId !== serverId) return false;
  if (!isRoomPasswordKnown(storedPassword)) return true;
  const storedOpen = isOpenRoomPassword(storedPassword);
  return storedOpen === Boolean(meta.isOpen);
}

/** Auto-przywracanie tylko dla kanałów publicznych zgodnych z serwerem. */
export function canAutoRestoreRoom(storedPassword, meta) {
  if (!meta || !isRoomPasswordKnown(storedPassword)) return false;
  return isOpenRoomPassword(storedPassword) && Boolean(meta.isOpen);
}

/** Hasło / flaga reauth z pamięci sesji (openRooms, persist, sessionStorage). */
export function resolveRoomCredential(roomName, roomState, persistedEntry) {
  const pickChannelId = (...sources) => {
    for (const src of sources) {
      const id = normalizeRoomChannelId(src);
      if (id) return id;
    }
    return '';
  };

  if (roomState && isRoomPasswordKnown(roomState.password) && !roomState.needsPasswordReentry) {
    return {
      password: roomState.password,
      roomChannelId: pickChannelId(roomState.roomChannelId, persistedEntry?.roomChannelId, getRoomChannelId(roomName)),
      needsPasswordReentry: false,
    };
  }
  if (
    persistedEntry
    && isRoomPasswordKnown(persistedEntry.password)
    && !persistedEntry.needsPasswordReentry
  ) {
    return {
      password: persistedEntry.password,
      roomChannelId: pickChannelId(persistedEntry.roomChannelId, roomState?.roomChannelId, getRoomChannelId(roomName)),
      needsPasswordReentry: false,
    };
  }
  const sessionPwd = getRoomPassword(roomName);
  if (isRoomPasswordKnown(sessionPwd)) {
    return {
      password: sessionPwd,
      roomChannelId: pickChannelId(getRoomChannelId(roomName), roomState?.roomChannelId, persistedEntry?.roomChannelId),
      needsPasswordReentry: false,
    };
  }
  if (roomState?.needsPasswordReentry || persistedEntry?.needsPasswordReentry) {
    return { password: null, roomChannelId: '', needsPasswordReentry: true };
  }
  return { password: null, roomChannelId: '', needsPasswordReentry: false };
}

/** Hasło do E2E — ze stanu pokoju lub odszyfrowanej sesji. */
export function resolveRoomPasswordForCrypto(roomName, roomState) {
  if (roomState && isRoomPasswordKnown(roomState.password) && !roomState.needsPasswordReentry) {
    return roomState.password;
  }
  const sessionPwd = getRoomPassword(roomName);
  if (isRoomPasswordKnown(sessionPwd)) return sessionPwd;
  return null;
}
