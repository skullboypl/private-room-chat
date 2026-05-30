const { Server } = require('socket.io');
const {
  createMessageSendLimiter,
  MESSAGE_SEND_MAX_PER_IP,
  MESSAGE_SEND_RATE_MSG,
} = require('../messageSendRateLimit.cjs');
const {
  canAttemptRoomPassword,
  recordFailedRoomPassword,
  prunePasswordLimiters,
} = require('../passwordJoinRateLimit.cjs');
const { DISCONNECT_GRACE_MS } = require('../roomLifecycle.cjs');
const {
  normalizeRoomChannelId,
  generateRoomChannelId,
} = require('../roomChannelId.cjs');
const {
  DEFAULT_USER_AVATAR_STYLE,
  normalizeUserAvatarStyle,
} = require('../userAvatarStyles.cjs');

const rooms = {};
const ipCreatedRooms = new Map();
const ipCreateTimestamps = new Map();
const ipMessageSendLimiters = new Map();

const MAX_USERNAME_LENGTH = 32;
const MAX_ROOM_NAME_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 128;
const DEFAULT_ROOM_QUICK_EMOJI = '👍';
const MAX_AVATAR_SEED_LENGTH = 64;
const MAX_CLIENT_SESSION_ID_LENGTH = 64;
const SOCKET_MAX_BUFFER = 5 * 1024 * 1024;
const MAX_ROOMS_PER_IP = 5;
const ROOM_CREATE_RATE_LIMIT = 3;
const ROOM_CREATE_RATE_WINDOW_MS = 60 * 1000;
const ROOMS_LIST_BROADCAST_MS = 400;
const RATE_LIMIT_CLEANUP_MS = 5 * 60 * 1000;
/** Zaszyfrowane wiadomości (ciphertext) — dogonienie po powrocie z tła / PWA. */
const ROOM_MESSAGE_BUFFER_MAX = 80;
const ROOM_MESSAGE_BUFFER_TTL_MS = 15 * 60 * 1000;

let roomsListBroadcastTimer = null;
let roomsListDirty = false;

function roomUserNames(room) {
  if (!room?.users) return [];
  return [...room.users.keys()];
}

function normalizeAvatarSeed(seed, fallback) {
  const raw = String(seed || fallback || '').trim().slice(0, MAX_AVATAR_SEED_LENGTH);
  return raw || String(fallback || 'user').slice(0, MAX_AVATAR_SEED_LENGTH);
}

function normalizeAvatarStyle(style) {
  return normalizeUserAvatarStyle(style || DEFAULT_USER_AVATAR_STYLE);
}

function normalizeClientSessionId(id) {
  const value = String(id || '').trim().slice(0, MAX_CLIENT_SESSION_ID_LENGTH);
  if (!value || !/^[\w-]{8,64}$/i.test(value)) return '';
  return value;
}

function getUserRecord(data, username) {
  if (typeof data === 'number') {
    return {
      joinedAt: data,
      avatarSeed: username,
      avatarStyle: DEFAULT_USER_AVATAR_STYLE,
      clientSessionId: '',
    };
  }
  return {
    joinedAt: data?.joinedAt ?? Date.now(),
    avatarSeed: normalizeAvatarSeed(data?.avatarSeed, username),
    avatarStyle: normalizeAvatarStyle(data?.avatarStyle),
    clientSessionId: normalizeClientSessionId(data?.clientSessionId),
  };
}

function addRoomUser(room, username, avatarSeed, avatarStyle, clientSessionId = '') {
  room.users.set(username, {
    joinedAt: Date.now(),
    avatarSeed: normalizeAvatarSeed(avatarSeed, username),
    avatarStyle: normalizeAvatarStyle(avatarStyle),
    clientSessionId: normalizeClientSessionId(clientSessionId),
  });
}

function removeRoomUser(room, username) {
  room.users.delete(username);
}

function getRoomUsersPayload(room) {
  if (!room?.users) return [];
  return [...room.users.entries()]
    .map(([username, data]) => {
      const rec = getUserRecord(data, username);
      return { username, ...rec };
    })
    .sort((a, b) => a.joinedAt - b.joinedAt);
}

function getUserProfile(room, username) {
  if (!room?.users?.has(username)) return null;
  const rec = getUserRecord(room.users.get(username), username);
  return {
    username,
    avatarSeed: rec.avatarSeed,
    avatarStyle: rec.avatarStyle,
  };
}

function getClientIp(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return socket.handshake.address || 'unknown';
}

function pruneIpRoomSet(ip) {
  const set = ipCreatedRooms.get(ip);
  if (!set) return 0;

  for (const roomName of set) {
    if (!rooms[roomName]) set.delete(roomName);
  }

  if (set.size === 0) {
    ipCreatedRooms.delete(ip);
    return 0;
  }

  return set.size;
}

function countActiveCreatedRooms(ip) {
  return pruneIpRoomSet(ip);
}

function trackRoomCreation(ip, roomName) {
  if (!ipCreatedRooms.has(ip)) {
    ipCreatedRooms.set(ip, new Set());
  }
  ipCreatedRooms.get(ip).add(roomName);
}

function untrackRoom(roomName) {
  for (const [ip, set] of ipCreatedRooms) {
    if (set.delete(roomName) && set.size === 0) {
      ipCreatedRooms.delete(ip);
    }
  }
}

function canCreateRoom(ip) {
  if (countActiveCreatedRooms(ip) >= MAX_ROOMS_PER_IP) {
    return { ok: false, message: `Możesz utworzyć maksymalnie ${MAX_ROOMS_PER_IP} aktywnych kanałów na adres IP.` };
  }

  const now = Date.now();
  const recent = (ipCreateTimestamps.get(ip) || []).filter(
    (ts) => now - ts < ROOM_CREATE_RATE_WINDOW_MS,
  );

  if (recent.length >= ROOM_CREATE_RATE_LIMIT) {
    return { ok: false, message: 'Zbyt wiele prób utworzenia kanału. Spróbuj ponownie za chwilę.' };
  }

  return { ok: true };
}

function canRestoreRoom(ip, batch = null) {
  if (Array.isArray(batch) && batch.length > 0) {
    return canRestoreBatch(ip, batch);
  }

  if (countActiveCreatedRooms(ip) >= MAX_ROOMS_PER_IP) {
    return { ok: false, message: `Możesz utworzyć maksymalnie ${MAX_ROOMS_PER_IP} aktywnych kanałów na adres IP.` };
  }
  return { ok: true };
}

function canRestoreBatch(ip, batch) {
  let newTracked = 0;

  for (const item of batch) {
    if (rooms[item.roomName]) continue;
    const set = ipCreatedRooms.get(ip);
    if (set?.has(item.roomName)) continue;
    newTracked += 1;
  }

  if (countActiveCreatedRooms(ip) + newTracked > MAX_ROOMS_PER_IP) {
    return {
      ok: false,
      message: `Możesz utworzyć maksymalnie ${MAX_ROOMS_PER_IP} aktywnych kanałów na adres IP.`,
    };
  }

  return { ok: true };
}

function getIpMessageSendLimiter(ip) {
  const key = ip || 'unknown';
  if (!ipMessageSendLimiters.has(key)) {
    ipMessageSendLimiters.set(key, createMessageSendLimiter(MESSAGE_SEND_MAX_PER_IP));
  }
  return ipMessageSendLimiters.get(key);
}

function canSendMessage(socket) {
  if (!socket.messageSendLimiter) {
    socket.messageSendLimiter = createMessageSendLimiter();
  }

  const now = Date.now();
  const socketWait = socket.messageSendLimiter.getRetryAfterMs(now);
  const ipWait = getIpMessageSendLimiter(socket.clientIp).getRetryAfterMs(now);
  if (socketWait > 0 || ipWait > 0) {
    return { ok: false, retryAfterMs: Math.max(socketWait, ipWait) };
  }

  socket.messageSendLimiter.tryConsume(now);
  getIpMessageSendLimiter(socket.clientIp).tryConsume(now);
  return { ok: true, retryAfterMs: 0 };
}

function recordRoomCreationAttempt(ip) {
  const now = Date.now();
  const recent = (ipCreateTimestamps.get(ip) || []).filter(
    (ts) => now - ts < ROOM_CREATE_RATE_WINDOW_MS,
  );
  recent.push(now);
  ipCreateTimestamps.set(ip, recent);
}

function cleanupRateLimitMaps() {
  const now = Date.now();

  for (const [ip, timestamps] of ipCreateTimestamps) {
    const recent = timestamps.filter((ts) => now - ts < ROOM_CREATE_RATE_WINDOW_MS);
    if (recent.length === 0) ipCreateTimestamps.delete(ip);
    else ipCreateTimestamps.set(ip, recent);
  }

  prunePasswordLimiters();
}

function isOpenRoom(room) {
  return room && room.password === '';
}

function getActiveRoomsList() {
  return Object.keys(rooms).map((roomName) => {
    const room = rooms[roomName];
    return {
      roomName,
      roomChannelId: ensureRoomHasChannelId(room),
      isOpen: isOpenRoom(room),
      userCount: room.users.size,
    };
  });
}

function broadcastActiveRooms(io) {
  roomsListDirty = true;

  if (roomsListBroadcastTimer) return;

  io.emit('activeRoomsList', getActiveRoomsList());
  roomsListDirty = false;

  roomsListBroadcastTimer = setTimeout(() => {
    roomsListBroadcastTimer = null;
    if (roomsListDirty) {
      broadcastActiveRooms(io);
    }
  }, ROOMS_LIST_BROADCAST_MS);
}

function normalizeRoomName(roomName) {
  const name = String(roomName).trim();
  if (!name || name.length > MAX_ROOM_NAME_LENGTH) return null;
  return name;
}

function normalizePassword(password, { allowEmpty = false } = {}) {
  const value = String(password ?? '');
  if (!allowEmpty && !value) return null;
  if (value.length > MAX_PASSWORD_LENGTH) return null;
  return value;
}

function normalizeRequestedUsername(requestedUsername) {
  let base = String(requestedUsername).trim();
  const hashIndex = base.indexOf('#');
  if (hashIndex > 0) {
    base = base.slice(0, hashIndex).trim();
  }
  if (!base) return null;
  if (base.length > MAX_USERNAME_LENGTH) {
    base = base.slice(0, MAX_USERNAME_LENGTH);
  }
  return base;
}

function normalizeQuickEmoji(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const graphemes = [...trimmed];
  if (graphemes.length > 2) return null;
  return graphemes.join('');
}

function formatNickChangeMessage(oldUsername, assignedUsername, requestedUsername, timestamp) {
  if (assignedUsername === requestedUsername) {
    return `${oldUsername} zmienił nick na ${assignedUsername} · ${timestamp}`;
  }
  return `${oldUsername} zmienił nick na ${assignedUsername} (nick ${requestedUsername} był zajęty) · ${timestamp}`;
}

function formatQuickEmojiChangeMessage(changedBy, emoji, timestamp) {
  return `${changedBy} ustawił szybkie emoji na ${emoji} · ${timestamp}`;
}

function allocateUsername(usersCollection, requestedUsername) {
  const usersSet = usersCollection instanceof Map
    ? new Set(usersCollection.keys())
    : usersCollection;
  const base = normalizeRequestedUsername(requestedUsername);
  if (!base) return null;

  if (!usersSet.has(base)) return base;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const suffix = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const trimmedBase = base.slice(0, MAX_USERNAME_LENGTH - suffix.length);
    const candidate = `${trimmedBase}${suffix}`;
    if (!usersSet.has(candidate)) return candidate;
  }

  const fallback = `${base.slice(0, MAX_USERNAME_LENGTH - 5)}#${Date.now().toString(36).slice(-4)}`;
  return usersSet.has(fallback) ? `${base.slice(0, 24)}#${Math.random().toString(36).slice(2, 6)}` : fallback;
}

function initSocketRooms(socket) {
  if (!socket.roomsJoined) socket.roomsJoined = new Map();
}

function ensureRoomHasChannelId(room) {
  if (!room) return '';
  if (!normalizeRoomChannelId(room.roomChannelId)) {
    room.roomChannelId = generateRoomChannelId();
  }
  return room.roomChannelId;
}

function createRoomState(password) {
  return {
    roomChannelId: generateRoomChannelId(),
    password,
    users: new Map(),
    quickEmoji: DEFAULT_ROOM_QUICK_EMOJI,
    messageBuffer: [],
    graceBySession: new Map(),
  };
}

/** Brak osób online i nikt w grace (minimalizacja / PWA). */
function isRoomVacant(room) {
  if (!room) return true;
  if (room.users.size > 0) return false;
  if (room.graceBySession?.size > 0) return false;
  return true;
}

/** Zamknięcie kanału — od razu, bez dodatkowego odliczania. */
function deleteRoomIfVacant(io, roomName) {
  const room = rooms[roomName];
  if (!room || !isRoomVacant(room)) {
    broadcastActiveRooms(io);
    return;
  }
  deleteRoom(roomName);
  broadcastActiveRooms(io);
}

function cancelGraceSession(room, sessionId) {
  const sid = normalizeClientSessionId(sessionId);
  if (!sid || !room?.graceBySession) return;
  const slot = room.graceBySession.get(sid);
  if (slot?.timer) clearTimeout(slot.timer);
  room.graceBySession.delete(sid);
}

function cancelGraceLeave(room, username) {
  if (!room?.graceBySession) return;
  for (const [sid, slot] of room.graceBySession.entries()) {
    if (slot.username === username) cancelGraceSession(room, sid);
  }
}

function pruneMessageBuffer(buffer) {
  if (!buffer?.length) return;
  const now = Date.now();
  while (buffer.length > 0 && now - buffer[0].storedAt > ROOM_MESSAGE_BUFFER_TTL_MS) {
    buffer.shift();
  }
  while (buffer.length > ROOM_MESSAGE_BUFFER_MAX) {
    buffer.shift();
  }
}

function appendRoomMessage(roomName, message) {
  const room = rooms[roomName];
  if (!room) return;
  if (!room.messageBuffer) room.messageBuffer = [];
  room.messageBuffer.push({ ...message, storedAt: Date.now() });
  pruneMessageBuffer(room.messageBuffer);
}

function getRoomMessageCatchUp(room) {
  if (!room?.messageBuffer?.length) return [];
  pruneMessageBuffer(room.messageBuffer);
  return room.messageBuffer.map(({ storedAt, ...msg }) => msg);
}

function finalizeGraceSession(io, roomName, sessionId) {
  const room = rooms[roomName];
  const sid = normalizeClientSessionId(sessionId);
  const slot = sid ? room?.graceBySession?.get(sid) : null;
  if (!room || !slot) return;

  const { username } = slot;
  cancelGraceSession(room, sid);
  if (!room.users.has(username)) {
    if (isRoomVacant(room)) deleteRoomIfVacant(io, roomName);
    return;
  }

  removeRoomUser(room, username);
  io.to(roomName).emit('userLeft', { roomName, message: `${username} opuścił czat.` });

  deleteRoomIfVacant(io, roomName);
}

function scheduleGraceLeave(io, socket, roomName, username) {
  const room = rooms[roomName];
  if (!room?.users.has(username)) return;

  const record = getUserRecord(room.users.get(username), username);
  const sessionId = record.clientSessionId;

  socket.leave(roomName);

  if (!sessionId) {
    removeRoomUser(room, username);
    io.to(roomName).emit('userLeft', { roomName, message: `${username} opuścił czat.` });
    deleteRoomIfVacant(io, roomName);
    return;
  }

  if (!room.graceBySession) room.graceBySession = new Map();
  cancelGraceSession(room, sessionId);

  const timer = setTimeout(() => {
    finalizeGraceSession(io, roomName, sessionId);
  }, DISCONNECT_GRACE_MS);
  if (typeof timer.unref === 'function') timer.unref();
  room.graceBySession.set(sessionId, { username, timer });
}

function findGraceUsername(room, clientSessionId) {
  const sid = normalizeClientSessionId(clientSessionId);
  if (!sid || !room?.graceBySession) return null;
  const slot = room.graceBySession.get(sid);
  if (!slot?.username || !room.users.has(slot.username)) return null;
  return slot.username;
}

function resolveJoinUsername(room, requestedUsername, clientSessionId) {
  const reclaimed = findGraceUsername(room, clientSessionId);
  if (reclaimed) return reclaimed;
  return allocateUsername(room.users, requestedUsername);
}

function deleteRoom(roomName) {
  const room = rooms[roomName];
  if (room?.graceBySession) {
    for (const slot of room.graceBySession.values()) {
      if (slot?.timer) clearTimeout(slot.timer);
    }
  }
  delete rooms[roomName];
  untrackRoom(roomName);
}

function removeUserFromRoom(io, socket, roomName, username) {
  if (!rooms[roomName]) return;

  cancelGraceLeave(rooms[roomName], username);
  socket.leave(roomName);
  removeRoomUser(rooms[roomName], username);

  io.to(roomName).emit('userLeft', `${username} opuścił czat.`);

  deleteRoomIfVacant(io, roomName);
}

function emitRoomJoined(socket, roomName, assignedUsername, {
  showPresence = true,
  includeCatchUp = false,
} = {}) {
  const room = rooms[roomName];
  socket.emit('roomJoined', {
    roomName,
    roomChannelId: ensureRoomHasChannelId(room),
    messages: includeCatchUp ? getRoomMessageCatchUp(room) : [],
    username: assignedUsername,
    quickEmoji: room?.quickEmoji || DEFAULT_ROOM_QUICK_EMOJI,
    users: room ? getRoomUsersPayload(room) : [],
    showPresence,
  });
}

function handleJoinRoom(socket, io, {
  roomName,
  password,
  username,
  isRestore = false,
  skipBroadcast = false,
  noPassword = false,
  avatarSeed = '',
  avatarStyle = DEFAULT_USER_AVATAR_STYLE,
  clientSessionId = '',
  clientRoomChannelId = '',
}) {
  const sessionId = normalizeClientSessionId(clientSessionId);
  const clientChannelId = normalizeRoomChannelId(clientRoomChannelId);
  const normalizedRoom = normalizeRoomName(roomName);
  if (!normalizedRoom || !username) {
    socket.emit('roomError', {
      roomName: normalizedRoom || roomName,
      message: 'Nazwa pokoju i nazwa użytkownika są wymagane.',
    });
    return false;
  }

  roomName = normalizedRoom;
  const existingRoom = rooms[roomName];

  let normalizedPassword;
  if (existingRoom) {
    if (isOpenRoom(existingRoom)) {
      normalizedPassword = '';
    } else {
      normalizedPassword = normalizePassword(password);
      if (normalizedPassword === null) {
        socket.emit('roomError', {
          roomName,
          message: 'Hasło do pokoju jest wymagane.',
        });
        return false;
      }
    }
  } else if (noPassword) {
    normalizedPassword = '';
  } else {
    normalizedPassword = normalizePassword(password);
    if (normalizedPassword === null) {
      socket.emit('roomError', {
        roomName,
        message: 'Nazwa pokoju, hasło i nazwa użytkownika są wymagane.',
      });
      return false;
    }
  }

  password = normalizedPassword;

  if (socket.roomsJoined.has(roomName)) {
    const assignedUsername = socket.roomsJoined.get(roomName);
    const room = rooms[roomName];
    if (room?.users?.has(assignedUsername)) {
      const prev = getUserRecord(room.users.get(assignedUsername), assignedUsername);
      const nextRecord = {
        joinedAt: prev.joinedAt,
        avatarSeed: normalizeAvatarSeed(avatarSeed, assignedUsername),
        avatarStyle: normalizeAvatarStyle(avatarStyle),
        clientSessionId: sessionId || prev.clientSessionId,
      };
      room.users.set(assignedUsername, nextRecord);
      if (sessionId) cancelGraceSession(room, sessionId);

      if (
        prev.avatarSeed !== nextRecord.avatarSeed
        || prev.avatarStyle !== nextRecord.avatarStyle
      ) {
        io.to(roomName).emit('roomUserAvatarUpdated', {
          roomName,
          username: assignedUsername,
          avatarSeed: nextRecord.avatarSeed,
          avatarStyle: nextRecord.avatarStyle,
        });
      }
    }

    emitRoomJoined(socket, roomName, assignedUsername, {
      showPresence: false,
      includeCatchUp: true,
    });
    return true;
  }

  if (rooms[roomName]) {
    const serverChannelId = ensureRoomHasChannelId(rooms[roomName]);
    if (clientChannelId && clientChannelId !== serverChannelId) {
      socket.emit('roomError', {
        roomName,
        message: 'Kanał o tej nazwie został utworzony ponownie. Odśwież listę i dołącz ponownie.',
      });
      return false;
    }

    if (!isOpenRoom(rooms[roomName]) && rooms[roomName].password !== password) {
      const attemptCheck = canAttemptRoomPassword(socket.clientIp, roomName);
      if (!attemptCheck.ok) {
        socket.emit('roomError', { roomName, message: attemptCheck.message });
        return false;
      }
      recordFailedRoomPassword(socket.clientIp, roomName);
      socket.emit('roomError', { roomName, message: 'Nieprawidłowe hasło do pokoju.' });
      return false;
    }

    const room = rooms[roomName];
    const assignedUsername = resolveJoinUsername(room, username, sessionId);
    if (!assignedUsername) {
      socket.emit('roomError', { roomName, message: 'Nieprawidłowa nazwa użytkownika.' });
      return false;
    }

    const reclaiming = Boolean(
      sessionId && findGraceUsername(room, sessionId) === assignedUsername,
    );
    if (sessionId) cancelGraceSession(room, sessionId);

    socket.join(roomName);
    socket.roomsJoined.set(roomName, assignedUsername);

    if (reclaiming) {
      const prev = getUserRecord(room.users.get(assignedUsername), assignedUsername);
      room.users.set(assignedUsername, {
        joinedAt: prev.joinedAt,
        avatarSeed: normalizeAvatarSeed(avatarSeed, assignedUsername),
        avatarStyle: normalizeAvatarStyle(avatarStyle),
        clientSessionId: sessionId || prev.clientSessionId,
      });
    } else {
      addRoomUser(room, assignedUsername, avatarSeed, avatarStyle, sessionId);
    }

    emitRoomJoined(socket, roomName, assignedUsername, {
      showPresence: !isRestore && !reclaiming,
      includeCatchUp: isRestore || reclaiming,
    });

    if (!reclaiming) {
      const requested = normalizeRequestedUsername(username);
      const joinTime = new Date().toLocaleTimeString('pl-PL');
      const joinMessage = assignedUsername !== requested
        ? `${assignedUsername} dołączył (nick ${requested} był zajęty) · ${joinTime}`
        : `${assignedUsername} dołączył do czatu · ${joinTime}`;
      const profile = getUserProfile(room, assignedUsername);
      socket.to(roomName).emit('userJoined', {
        roomName,
        message: joinMessage,
        username: assignedUsername,
        avatarSeed: profile?.avatarSeed,
        avatarStyle: profile?.avatarStyle,
      });
    }
  } else if (isRestore) {
    socket.emit('roomError', {
      roomName,
      message: 'Ten kanał nie jest już aktywny.',
    });
    return false;
  } else {
    const createCheck = canCreateRoom(socket.clientIp);
    if (!createCheck.ok) {
      socket.emit('roomError', { roomName, message: createCheck.message });
      return false;
    }

    const assignedUsername = allocateUsername(new Set(), username);
    if (!assignedUsername) {
      socket.emit('roomError', { roomName, message: 'Nieprawidłowa nazwa użytkownika.' });
      return false;
    }

    rooms[roomName] = createRoomState(password);
    addRoomUser(rooms[roomName], assignedUsername, avatarSeed, avatarStyle, sessionId);
    trackRoomCreation(socket.clientIp, roomName);
    if (!isRestore) {
      recordRoomCreationAttempt(socket.clientIp);
    }

    socket.join(roomName);
    socket.roomsJoined.set(roomName, assignedUsername);

    emitRoomJoined(socket, roomName, assignedUsername, { showPresence: !isRestore });
    const profile = getUserProfile(rooms[roomName], assignedUsername);
    socket.to(roomName).emit('userJoined', {
      roomName,
      message: `${assignedUsername} utworzył i dołączył do czatu · ${new Date().toLocaleTimeString('pl-PL')}`,
      username: assignedUsername,
      avatarSeed: profile?.avatarSeed,
      avatarStyle: profile?.avatarStyle,
    });
  }

  if (!skipBroadcast) {
    broadcastActiveRooms(io);
  }

  return true;
}

function getCorsOrigins() {
  const fromEnv = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (fromEnv.length) return [...new Set(fromEnv)];

  const origins = new Set([
    'http://localhost:3000',
    'http://localhost:27215',
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (!siteUrl) return [...origins];

  try {
    const parsed = new URL(siteUrl);
    origins.add(parsed.origin);
    const altProtocol = parsed.protocol === 'https:' ? 'http:' : 'https:';
    origins.add(`${altProtocol}//${parsed.host}`);
  } catch {
    // ignore invalid URL
  }

  return [...origins];
}

function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    maxHttpBufferSize: SOCKET_MAX_BUFFER,
    pingInterval: 20000,
    pingTimeout: 45000,
    perMessageDeflate: {
      threshold: 1024,
    },
    cors: {
      origin: getCorsOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    initSocketRooms(socket);
    socket.clientIp = getClientIp(socket);

    const emitActiveRooms = () => {
      socket.emit('activeRoomsList', getActiveRoomsList());
    };

    socket.on('getRooms', emitActiveRooms);

    socket.on('joinRoom', ({
      roomName,
      password,
      username,
      restore,
      noPassword,
      avatarSeed,
      avatarStyle,
      clientSessionId,
      roomChannelId,
    }) => {
      handleJoinRoom(socket, io, {
        roomName,
        password,
        username,
        isRestore: restore === true,
        noPassword: noPassword === true,
        avatarSeed,
        avatarStyle,
        clientSessionId,
        clientRoomChannelId: roomChannelId,
      });
    });

    socket.on('updateUserAvatar', ({ roomName, avatarSeed, avatarStyle }) => {
      const normalized = normalizeRoomName(roomName);
      const username = normalized ? socket.roomsJoined.get(normalized) : null;
      if (!normalized || !username || !rooms[normalized]) return;

      const prev = getUserRecord(rooms[normalized].users.get(username), username);
      const nextRecord = {
        joinedAt: prev.joinedAt,
        avatarSeed: normalizeAvatarSeed(avatarSeed, username),
        avatarStyle: normalizeAvatarStyle(avatarStyle),
      };
      rooms[normalized].users.set(username, nextRecord);

      io.to(normalized).emit('roomUserAvatarUpdated', {
        roomName: normalized,
        username,
        avatarSeed: nextRecord.avatarSeed,
        avatarStyle: nextRecord.avatarStyle,
      });
    });

    socket.on('getRoomUsers', (roomName) => {
      const normalized = normalizeRoomName(roomName);
      if (!normalized || !socket.roomsJoined?.has(normalized)) return;
      const room = rooms[normalized];
      socket.emit('roomUsersList', {
        roomName: normalized,
        users: room ? getRoomUsersPayload(room) : [],
      });
    });

    socket.on('setRoomQuickEmoji', ({ roomName, emoji }) => {
      const normalized = normalizeRoomName(roomName);
      if (!normalized || !socket.roomsJoined?.has(normalized) || !rooms[normalized]) return;

      const normalizedEmoji = normalizeQuickEmoji(emoji);
      if (!normalizedEmoji) return;

      const room = rooms[normalized];
      if (room.quickEmoji === normalizedEmoji) return;

      const changedBy = socket.roomsJoined.get(normalized);
      const timestamp = new Date().toLocaleTimeString('pl-PL');
      rooms[normalized].quickEmoji = normalizedEmoji;

      io.to(normalized).emit('roomQuickEmojiUpdated', {
        roomName: normalized,
        emoji: normalizedEmoji,
        changedBy,
        timestamp,
        message: formatQuickEmojiChangeMessage(changedBy, normalizedEmoji, timestamp),
      });
    });

    socket.on('changeUsername', ({ roomName, newUsername }) => {
      const normalized = normalizeRoomName(roomName);
      const requested = normalizeRequestedUsername(newUsername);
      if (!normalized || !requested || !socket.roomsJoined?.has(normalized) || !rooms[normalized]) {
        return;
      }

      const oldUsername = socket.roomsJoined.get(normalized);
      if (!oldUsername || oldUsername === requested) return;

      const oldRecord = getUserRecord(
        rooms[normalized].users.get(oldUsername),
        oldUsername,
      );
      rooms[normalized].users.delete(oldUsername);

      let assignedUsername = requested;
      if (rooms[normalized].users.has(requested)) {
        assignedUsername = allocateUsername(rooms[normalized].users, requested);
      }

      if (!assignedUsername) {
        rooms[normalized].users.set(oldUsername, oldRecord);
        socket.emit('roomError', {
          roomName: normalized,
          message: 'Nie udało się zmienić nicku. Wybrany nick jest zajęty.',
        });
        return;
      }

      rooms[normalized].users.set(assignedUsername, oldRecord);
      socket.roomsJoined.set(normalized, assignedUsername);

      const timestamp = new Date().toLocaleTimeString('pl-PL');
      io.to(normalized).emit('roomNickChanged', {
        roomName: normalized,
        oldUsername,
        newUsername: assignedUsername,
        requestedUsername: requested,
        timestamp,
        message: formatNickChangeMessage(oldUsername, assignedUsername, requested, timestamp),
      });
    });

    socket.on('restoreRooms', ({
      rooms: rawRooms,
      username,
      avatarSeed,
      avatarStyle,
      clientSessionId,
    }) => {
      const fallbackNick = normalizeRequestedUsername(username);
      if (!fallbackNick || !Array.isArray(rawRooms) || rawRooms.length === 0) return;

      const batch = [];
      const seen = new Set();
      const fallbackSessionId = normalizeClientSessionId(clientSessionId);

      for (const item of rawRooms) {
        const roomName = normalizeRoomName(item?.roomName);
        const noPassword = item?.noPassword === true || item?.password === '';
        const password = noPassword
          ? ''
          : normalizePassword(item?.password);
        if (!roomName || (!noPassword && password === null) || seen.has(roomName)) continue;

        seen.add(roomName);
        batch.push({
          roomName,
          password,
          username: normalizeRequestedUsername(item?.assignedUsername) || fallbackNick,
          noPassword,
          avatarSeed: item?.avatarSeed ?? avatarSeed,
          avatarStyle: item?.avatarStyle ?? avatarStyle,
          clientSessionId: normalizeClientSessionId(item?.clientSessionId) || fallbackSessionId,
          clientRoomChannelId: item?.roomChannelId,
        });

        if (batch.length >= MAX_ROOMS_PER_IP) break;
      }

      if (batch.length === 0) return;

      const batchCheck = canRestoreBatch(socket.clientIp, batch);
      if (!batchCheck.ok) {
        socket.emit('roomError', { message: batchCheck.message });
        return;
      }

      let changed = false;
      for (const item of batch) {
        const joined = handleJoinRoom(socket, io, {
          roomName: item.roomName,
          password: item.password,
          username: item.username,
          isRestore: true,
          skipBroadcast: true,
          noPassword: item.noPassword === true,
          avatarSeed: item.avatarSeed,
          avatarStyle: item.avatarStyle,
          clientSessionId: item.clientSessionId,
          clientRoomChannelId: item.clientRoomChannelId,
        });
        if (joined) changed = true;
      }

      if (changed) {
        broadcastActiveRooms(io);
      }
    });

    socket.on('sendMessage', (data) => {
      const roomName = data?.roomName;
      if (!roomName || !data || !socket.roomsJoined.has(roomName)) return;

      const sendCheck = canSendMessage(socket);
      if (!sendCheck.ok) {
        socket.emit('roomError', { roomName, message: MESSAGE_SEND_RATE_MSG });
        return;
      }

      const username = socket.roomsJoined.get(roomName);
      const encrypted = typeof data === 'object' && data.encrypted === true;
      const messageContent = typeof data === 'string' ? data : data.content;
      const messageType = typeof data === 'object' ? (data.type || 'text') : 'text';
      if (!messageContent) return;

      const message = {
        roomName,
        sender: username,
        content: messageContent,
        encrypted,
        type: messageType,
        messageId: data.messageId || undefined,
        timestamp: new Date().toLocaleTimeString('pl-PL'),
      };

      appendRoomMessage(roomName, message);
      io.to(roomName).emit('receiveMessage', message);
    });

    socket.on('leaveRoom', (payload) => {
      const roomName = typeof payload === 'object' ? payload?.roomName : payload;
      if (!roomName || !socket.roomsJoined.has(roomName)) return;

      const username = socket.roomsJoined.get(roomName);
      socket.roomsJoined.delete(roomName);
      removeUserFromRoom(io, socket, roomName, username);
    });

    socket.on('disconnect', () => {
      for (const [roomName, username] of socket.roomsJoined) {
        scheduleGraceLeave(io, socket, roomName, username);
      }
      socket.roomsJoined.clear();
    });
  });

  setInterval(cleanupRateLimitMaps, RATE_LIMIT_CLEANUP_MS).unref();

  return io;
}

module.exports = { initSocketIO };
