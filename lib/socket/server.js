const { Server } = require('socket.io');

const rooms = {};
const ipCreatedRooms = new Map();
const ipCreateTimestamps = new Map();

const MAX_USERNAME_LENGTH = 32;
const MAX_ROOM_NAME_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 128;
const DEFAULT_ROOM_QUICK_EMOJI = '👍';
const SOCKET_MAX_BUFFER = 5 * 1024 * 1024;
const MAX_ROOMS_PER_IP = 5;
const ROOM_CREATE_RATE_LIMIT = 3;
const ROOM_CREATE_RATE_WINDOW_MS = 60 * 1000;
const ROOMS_LIST_BROADCAST_MS = 400;
const RATE_LIMIT_CLEANUP_MS = 5 * 60 * 1000;

let roomsListBroadcastTimer = null;
let roomsListDirty = false;

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
}

function getActiveRoomNames() {
  return Object.keys(rooms);
}

function broadcastActiveRooms(io) {
  roomsListDirty = true;

  if (roomsListBroadcastTimer) return;

  io.emit('activeRoomsList', getActiveRoomNames());
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

function normalizePassword(password) {
  const value = String(password);
  if (!value || value.length > MAX_PASSWORD_LENGTH) return null;
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

function allocateUsername(usersSet, requestedUsername) {
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

function deleteRoom(roomName) {
  delete rooms[roomName];
  untrackRoom(roomName);
}

function removeUserFromRoom(io, socket, roomName, username) {
  if (!rooms[roomName]) return;

  socket.leave(roomName);
  rooms[roomName].users.delete(username);

  io.to(roomName).emit('userLeft', `${username} opuścił czat.`);

  if (rooms[roomName].users.size === 0) {
    deleteRoom(roomName);
  }

  broadcastActiveRooms(io);
}

function handleJoinRoom(socket, io, {
  roomName,
  password,
  username,
  isRestore = false,
  skipBroadcast = false,
}) {
  const normalizedRoom = normalizeRoomName(roomName);
  const normalizedPassword = normalizePassword(password);

  if (!normalizedRoom || !normalizedPassword || !username) {
    socket.emit('roomError', {
      roomName: normalizedRoom || roomName,
      message: 'Nazwa pokoju, hasło i nazwa użytkownika są wymagane.',
    });
    return false;
  }

  roomName = normalizedRoom;
  password = normalizedPassword;

  if (socket.roomsJoined.has(roomName)) {
    socket.emit('roomJoined', {
      roomName,
      messages: [],
      username: socket.roomsJoined.get(roomName),
      quickEmoji: rooms[roomName]?.quickEmoji || DEFAULT_ROOM_QUICK_EMOJI,
    });
    return true;
  }

  if (rooms[roomName]) {
    if (rooms[roomName].password !== password) {
      socket.emit('roomError', { roomName, message: 'Nieprawidłowe hasło do pokoju.' });
      return false;
    }

    const assignedUsername = allocateUsername(rooms[roomName].users, username);
    if (!assignedUsername) {
      socket.emit('roomError', { roomName, message: 'Nieprawidłowa nazwa użytkownika.' });
      return false;
    }

    socket.join(roomName);
    socket.roomsJoined.set(roomName, assignedUsername);
    rooms[roomName].users.add(assignedUsername);

    socket.emit('roomJoined', {
      roomName,
      messages: [],
      username: assignedUsername,
      quickEmoji: rooms[roomName].quickEmoji || DEFAULT_ROOM_QUICK_EMOJI,
    });
    const requested = normalizeRequestedUsername(username);
    const joinTime = new Date().toLocaleTimeString('pl-PL');
    const joinMessage = assignedUsername !== requested
      ? `${assignedUsername} dołączył (nick ${requested} był zajęty) · ${joinTime}`
      : `${assignedUsername} dołączył do czatu · ${joinTime}`;
    socket.to(roomName).emit('userJoined', { roomName, message: joinMessage });
  } else {
    const createCheck = isRestore
      ? canRestoreRoom(socket.clientIp)
      : canCreateRoom(socket.clientIp);
    if (!createCheck.ok) {
      socket.emit('roomError', { roomName, message: createCheck.message });
      return false;
    }

    const assignedUsername = allocateUsername(new Set(), username);
    if (!assignedUsername) {
      socket.emit('roomError', { roomName, message: 'Nieprawidłowa nazwa użytkownika.' });
      return false;
    }

    rooms[roomName] = {
      password,
      users: new Set([assignedUsername]),
      quickEmoji: DEFAULT_ROOM_QUICK_EMOJI,
    };
    trackRoomCreation(socket.clientIp, roomName);
    if (!isRestore) {
      recordRoomCreationAttempt(socket.clientIp);
    }

    socket.join(roomName);
    socket.roomsJoined.set(roomName, assignedUsername);

    socket.emit('roomJoined', {
      roomName,
      messages: [],
      username: assignedUsername,
      quickEmoji: DEFAULT_ROOM_QUICK_EMOJI,
    });
    io.to(roomName).emit('userJoined', {
      roomName,
      message: `${assignedUsername} utworzył i dołączył do czatu · ${new Date().toLocaleTimeString('pl-PL')}`,
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
    pingInterval: 25000,
    pingTimeout: 20000,
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
      socket.emit('activeRoomsList', getActiveRoomNames());
    };

    socket.on('getRooms', emitActiveRooms);

    socket.on('joinRoom', ({ roomName, password, username, restore }) => {
      handleJoinRoom(socket, io, {
        roomName,
        password,
        username,
        isRestore: restore === true,
      });
    });

    socket.on('getRoomUsers', (roomName) => {
      const normalized = normalizeRoomName(roomName);
      if (!normalized || !socket.roomsJoined?.has(normalized)) return;
      const room = rooms[normalized];
      socket.emit('roomUsersList', {
        roomName: normalized,
        users: room ? [...room.users] : [],
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

      rooms[normalized].users.delete(oldUsername);

      let assignedUsername = requested;
      if (rooms[normalized].users.has(requested)) {
        assignedUsername = allocateUsername(rooms[normalized].users, requested);
      }

      if (!assignedUsername) {
        rooms[normalized].users.add(oldUsername);
        socket.emit('roomError', {
          roomName: normalized,
          message: 'Nie udało się zmienić nicku. Wybrany nick jest zajęty.',
        });
        return;
      }

      rooms[normalized].users.add(assignedUsername);
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

    socket.on('restoreRooms', ({ rooms: rawRooms, username }) => {
      const fallbackNick = normalizeRequestedUsername(username);
      if (!fallbackNick || !Array.isArray(rawRooms) || rawRooms.length === 0) return;

      const batch = [];
      const seen = new Set();

      for (const item of rawRooms) {
        const roomName = normalizeRoomName(item?.roomName);
        const password = normalizePassword(item?.password);
        if (!roomName || !password || seen.has(roomName)) continue;

        seen.add(roomName);
        batch.push({
          roomName,
          password,
          username: normalizeRequestedUsername(item?.assignedUsername) || fallbackNick,
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
        if (rooms[roomName]) {
          rooms[roomName].users.delete(username);
          io.to(roomName).emit('userLeft', { roomName, message: `${username} opuścił czat.` });

          if (rooms[roomName].users.size === 0) {
            deleteRoom(roomName);
          }
        }
      }

      socket.roomsJoined.clear();
      broadcastActiveRooms(io);
    });
  });

  setInterval(cleanupRateLimitMaps, RATE_LIMIT_CLEANUP_MS).unref();

  return io;
}

module.exports = { initSocketIO };
