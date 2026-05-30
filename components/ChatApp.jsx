'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { socketService } from '@/lib/socket/client';
import { setRoomKey, hasRoomKey, clearRoomKey, encryptMessage, decryptMessage } from '@/lib/crypto/e2e';
import {
  saveLocalImage,
  getLocalImagesForRoom,
  clearLocalImagesForRoom,
  buildImagePayload,
  buildTextPayload,
  parseMessagePayload,
} from '@/lib/localMessageStore';
import {
  setRoomSession,
  getRoomPassword,
  clearRoomSession,
  loadPersistedSession,
  persistOpenRooms,
} from '@/lib/roomSession';
import { getMessagePreview } from '@/lib/messagePreview';
import { parseInviteLink, clearInviteHash } from '@/lib/invite';
import { readImageAsBase64, generateMessageId, sanitizeImageBase64 } from '@/lib/imageUtils';
import UserNameInput, { readStoredUsername } from '@/components/UserNameInput';
import AppLogo from '@/components/AppLogo';
import InviteModal from '@/components/InviteModal';
import JoinRoomModal from '@/components/JoinRoomModal';
import MessengerDock from '@/components/MessengerDock';
import ChatWindow from '@/components/ChatWindow';
import ChatPiPView from '@/components/ChatPiPView';
import PiPRoot from '@/components/PiPRoot';
import { useDocumentPiP } from '@/hooks/useDocumentPiP';
import { isDocumentPiPSupported, requestDocumentPiPWindow } from '@/lib/documentPiP';
import { isCompactViewport, COMPACT_VIEWPORT_MAX } from '@/lib/viewport';
import { trimExpandedToViewport } from '@/lib/dockLayout';
import { applyRoomQuickEmoji, DEFAULT_QUICK_EMOJI } from '@/lib/roomEmoji';
import AppSiteFooter from '@/components/AppSiteFooter';
import AppLangSwitcher from '@/components/AppLangSwitcher';
import { useTranslation } from '@/context/LocaleContext';
import { translateRoomError } from '@/lib/i18n/systemMessages';
import { formatAppTime } from '@/lib/i18n/locale';
import '@/components/chat-app.css';

function emptyRoomState(password = '', assignedUsername = '') {
  return {
    password,
    assignedUsername,
    quickEmoji: DEFAULT_QUICK_EMOJI,
    messages: [],
    unread: 0,
    lastPreview: '',
    lastTimestamp: '',
  };
}

function parseSocketText(payload) {
  if (typeof payload === 'string') return payload;
  return payload?.message || '';
}

async function normalizeMessage(msg, roomName) {
  if (msg.sender === 'System') return msg;

  if (!hasRoomKey(roomName)) {
    const password = getRoomPassword(roomName);
    if (password) await setRoomKey(roomName, password);
  }

  let content = msg.content;
  if (msg.encrypted) content = await decryptMessage(roomName, msg.content);

  const parsed = parseMessagePayload(content);

  if (parsed.type === 'image') {
    try {
      const sanitized = await sanitizeImageBase64(parsed.data, parsed.mime);
      saveLocalImage(roomName, parsed.imageId, {
        data: sanitized.data,
        mime: sanitized.mime,
        sender: msg.sender,
        timestamp: msg.timestamp,
      });
    } catch {
      // Odrzucony lub uszkodzony obraz — bez podglądu
    }
    return {
      ...msg,
      type: 'image',
      imageId: parsed.imageId,
      messageId: msg.messageId || parsed.imageId,
      content: '',
    };
  }

  return { ...msg, type: 'text', content: parsed.text };
}

async function normalizeMessages(messages, roomName) {
  return Promise.all(messages.map((msg) => normalizeMessage(msg, roomName)));
}

function mergeWithLocalImages(textMessages, roomName) {
  const localImages = getLocalImagesForRoom(roomName);
  const serverIds = new Set(textMessages.filter((m) => m.imageId).map((m) => m.imageId));
  const uniqueLocal = localImages.filter((img) => !serverIds.has(img.imageId));
  return [...textMessages, ...uniqueLocal].sort((a, b) =>
    String(a.timestamp).localeCompare(String(b.timestamp)),
  );
}

function buildRoomMeta(messages, fallback = {}, t) {
  const lastMsg = messages[messages.length - 1];
  return {
    lastPreview: lastMsg ? getMessagePreview(lastMsg, t) : fallback.lastPreview || '',
    lastTimestamp: lastMsg?.timestamp || fallback.lastTimestamp || '',
  };
}

function getMessageKey(msg) {
  return msg.messageId || msg.imageId || null;
}

function appendUniqueMessage(messages, incoming) {
  const key = getMessageKey(incoming);
  if (key && messages.some((m) => getMessageKey(m) === key)) {
    return messages;
  }
  return [...messages, incoming];
}

function dedupeMessages(messages) {
  const seen = new Set();
  return messages.filter((msg) => {
    const key = getMessageKey(msg) || `${msg.sender}|${msg.timestamp}|${msg.type}|${msg.content || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getJoinUsername() {
  const stored = readStoredUsername() || '';
  const hashIndex = stored.indexOf('#');
  return hashIndex > 0 ? stored.slice(0, hashIndex) : stored;
}

function hydrateOpenRoomsFromSession(list) {
  if (!Array.isArray(list) || list.length === 0) return {};

  return list.reduce((acc, entry) => {
    if (!entry?.roomName || !entry?.password) return acc;

    setRoomSession(entry.roomName, entry.password);
    acc[entry.roomName] = {
      ...emptyRoomState(entry.password, entry.assignedUsername || ''),
      lastPreview: entry.lastPreview || '',
      lastTimestamp: entry.lastTimestamp || '',
      unread: entry.unread || 0,
    };
    return acc;
  }, {});
}

export default function ChatApp() {
  const { t, lang } = useTranslation();
  const tRef = useRef(t);
  const langRef = useRef(lang);

  useEffect(() => {
    tRef.current = t;
    langRef.current = lang;
  }, [t, lang]);

  const [ready, setReady] = useState(false);
  const [socketActive, setSocketActive] = useState(false);
  const [username, setUsername] = useState('');
  const [openRooms, setOpenRooms] = useState({});
  const [expandedRooms, setExpandedRooms] = useState([]);
  const [focusedRoom, setFocusedRoom] = useState(null);
  const [roomError, setRoomError] = useState('');
  const [activeRooms, setActiveRooms] = useState([]);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [joinModal, setJoinModal] = useState({ open: false, roomName: '', password: '' });
  const joinModalRef = useRef(joinModal);
  const [fullscreenRoom, setFullscreenRoom] = useState(null);
  const [isCompact, setIsCompact] = useState(false);
  const {
    pipRooms,
    activePipRoom,
    setActivePipRoom,
    openPiP,
    closePiP,
    updatePiPContent,
    isPiPSupported,
  } = useDocumentPiP();

  const openRoomsRef = useRef({});
  const activeRoomRef = useRef(null);
  const pendingInviteRef = useRef(null);
  const usernameRef = useRef('');
  const joiningRoomsRef = useRef(new Set());
  const pendingMaximizeRef = useRef(new Set());
  const processedInviteRef = useRef(null);

  const updateJoiningState = useCallback(() => {
    setJoiningRoom(joiningRoomsRef.current.size > 0);
  }, []);

  const syncOpenRooms = useCallback((updater) => {
    setOpenRooms((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      openRoomsRef.current = next;
      persistOpenRooms(next, activeRoomRef.current);
      return next;
    });
  }, []);

  const clearRoomUnread = useCallback((roomName) => {
    syncOpenRooms((prev) => {
      const room = prev[roomName];
      if (!room) return prev;
      return { ...prev, [roomName]: { ...room, unread: 0 } };
    });
  }, [syncOpenRooms]);

  const focusRoom = useCallback((roomName) => {
    if (!roomName) return;
    activeRoomRef.current = roomName;
    setFocusedRoom(roomName);
    persistOpenRooms(openRoomsRef.current, roomName);
    clearRoomUnread(roomName);
  }, [clearRoomUnread]);

  const maximizeRoom = useCallback((roomName) => {
    if (!roomName) return;
    activeRoomRef.current = roomName;
    setFocusedRoom(roomName);
    setExpandedRooms((prev) => {
      if (isCompact) return [roomName];
      if (prev.includes(roomName)) return prev;
      return [...prev, roomName];
    });
    if (isCompact) {
      setFullscreenRoom(roomName);
    }
    clearRoomUnread(roomName);
    persistOpenRooms(openRoomsRef.current, roomName);
  }, [clearRoomUnread, isCompact]);

  useEffect(() => { pendingInviteRef.current = pendingInvite; }, [pendingInvite]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { openRoomsRef.current = openRooms; }, [openRooms]);
  useEffect(() => { joinModalRef.current = joinModal; }, [joinModal]);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COMPACT_VIEWPORT_MAX}px)`);
    const update = () => setIsCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (isCompact) return undefined;

    const syncDockExpanded = () => {
      setExpandedRooms((prev) => {
        const exclude = new Set([
          ...(fullscreenRoom ? [fullscreenRoom] : []),
          ...pipRooms,
        ]);
        const next = trimExpandedToViewport(prev, focusedRoom, window.innerWidth, exclude);
        if (next.length === prev.length && next.every((name, i) => name === prev[i])) {
          return prev;
        }
        return next;
      });
    };

    syncDockExpanded();
    window.addEventListener('resize', syncDockExpanded);
    return () => window.removeEventListener('resize', syncDockExpanded);
  }, [isCompact, focusedRoom, fullscreenRoom, pipRooms]);

  useEffect(() => {
    if (!ready || !username || !isCompact) return;

    const active = (focusedRoom && openRooms[focusedRoom])
      ? focusedRoom
      : [...expandedRooms].reverse().find((name) => openRooms[name]);

    if (!active) return;

    activeRoomRef.current = active;

    if (focusedRoom !== active) {
      setFocusedRoom(active);
    }
    if (expandedRooms.length !== 1 || expandedRooms[0] !== active) {
      setExpandedRooms([active]);
    }
    setFullscreenRoom((prev) => (prev === active ? prev : active));
  }, [ready, username, isCompact, focusedRoom, expandedRooms, openRooms]);

  useEffect(() => {
    document.title = focusedRoom
      ? `${focusedRoom} · ${t('siteName')}`
      : `${t('siteName')} · ${t('tagline')}`;
  }, [focusedRoom, t]);

  const clearPendingInvite = useCallback(() => {
    pendingInviteRef.current = null;
    setPendingInvite(null);
    processedInviteRef.current = null;
  }, []);

  const applyInviteFromUrl = useCallback(() => {
    const invite = parseInviteLink();
    if (!invite) return;

    clearInviteHash();
    processedInviteRef.current = null;
    pendingInviteRef.current = invite;
    setPendingInvite(invite);
  }, []);

  useEffect(() => {
    const stored = readStoredUsername();
    if (stored) {
      setUsername(stored);
      setSocketActive(true);
    }
    applyInviteFromUrl();

    const { list, activeRoom: savedActive } = loadPersistedSession();
    if (list.length > 0) {
      const hydrated = hydrateOpenRoomsFromSession(list);
      openRoomsRef.current = hydrated;
      setOpenRooms(hydrated);
    }

    if (savedActive) {
      activeRoomRef.current = savedActive;
      setFocusedRoom(savedActive);
      setExpandedRooms([savedActive]);
      if (isCompactViewport()) {
        setFullscreenRoom(savedActive);
      }
    }

    setIsCompact(isCompactViewport());
    setReady(true);

    window.addEventListener('hashchange', applyInviteFromUrl);
    return () => window.removeEventListener('hashchange', applyInviteFromUrl);
  }, [applyInviteFromUrl]);

  const appendSystemMessage = useCallback((roomName, text) => {
    if (!roomName || !text) return;
    const systemMessage = {
      sender: 'System',
      content: text,
      timestamp: formatAppTime(new Date(), langRef.current),
      encrypted: false,
      type: 'text',
    };

    syncOpenRooms((prev) => {
      const room = prev[roomName];
      if (!room) return prev;
      const messages = appendUniqueMessage(room.messages, systemMessage);
      return {
        ...prev,
        [roomName]: {
          ...room,
          messages,
          ...buildRoomMeta(messages, {}, tRef.current),
        },
      };
    });
  }, [syncOpenRooms]);

  const joinRoom = useCallback(async (roomName, password, { restore = false } = {}) => {
    const nick = getJoinUsername() || usernameRef.current;
    if (!nick) {
      setRoomError(tRef.current('errors.usernameRequired'));
      return false;
    }
    if (joiningRoomsRef.current.has(roomName)) return false;

    const existing = openRoomsRef.current[roomName];
    const resolvedPassword = password || existing?.password;
    if (!resolvedPassword) {
      setRoomError(tRef.current('errors.noPassword'));
      return false;
    }

    joiningRoomsRef.current.add(roomName);
    updateJoiningState();
    setRoomError('');

    try {
      if (!hasRoomKey(roomName)) {
        await setRoomKey(roomName, resolvedPassword);
      }
      syncOpenRooms((prev) => ({
        ...prev,
        [roomName]: {
          ...(prev[roomName] || emptyRoomState(resolvedPassword)),
          password: resolvedPassword,
        },
      }));
      socketService.connect();
      if (!restore) {
        pendingMaximizeRef.current.add(roomName);
      }
      socketService.emit('joinRoom', {
        roomName,
        password: resolvedPassword,
        username: nick,
        restore,
      });
      return true;
    } catch {
      joiningRoomsRef.current.delete(roomName);
      updateJoiningState();
      setRoomError(tRef.current('errors.e2eInit'));
      clearRoomKey(roomName);
      return false;
    }
  }, [syncOpenRooms, updateJoiningState]);

  const joinInviteRoom = useCallback(async (invite) => {
    if (!invite?.roomName || !invite?.password) return false;

    const token = `${invite.roomName}\0${invite.password}`;
    if (processedInviteRef.current === token) return false;

    processedInviteRef.current = token;
    const ok = await joinRoom(invite.roomName, invite.password);
    if (!ok) processedInviteRef.current = null;
    return ok;
  }, [joinRoom]);

  const rejoinOpenRooms = useCallback(async () => {
    if (!usernameRef.current) return;

    const nick = getJoinUsername() || usernameRef.current;
    const seen = new Set();
    const entries = [];

    for (const [roomName, room] of Object.entries(openRoomsRef.current)) {
      if (!room?.password || seen.has(roomName)) continue;
      seen.add(roomName);
      entries.push({
        roomName,
        password: room.password,
        assignedUsername: room.assignedUsername || '',
        lastPreview: room.lastPreview || '',
        lastTimestamp: room.lastTimestamp || '',
        unread: room.unread || 0,
      });
    }

    const { list } = loadPersistedSession();
    for (const entry of list) {
      if (!entry?.roomName || !entry?.password || seen.has(entry.roomName)) continue;
      seen.add(entry.roomName);
      entries.push(entry);
    }

    if (!entries.length) return;

    socketService.connect();

    const prepared = [];

    for (const entry of entries) {
      if (pendingInviteRef.current?.roomName === entry.roomName) continue;
      if (joiningRoomsRef.current.has(entry.roomName)) continue;

      try {
        if (!hasRoomKey(entry.roomName)) {
          await setRoomKey(entry.roomName, entry.password);
        }
        setRoomSession(entry.roomName, entry.password);
        syncOpenRooms((prev) => ({
          ...prev,
          [entry.roomName]: {
            ...(prev[entry.roomName] || emptyRoomState(entry.password, entry.assignedUsername)),
            password: entry.password,
            assignedUsername: entry.assignedUsername || prev[entry.roomName]?.assignedUsername || '',
            lastPreview: entry.lastPreview || prev[entry.roomName]?.lastPreview || '',
            lastTimestamp: entry.lastTimestamp || prev[entry.roomName]?.lastTimestamp || '',
            unread: entry.unread ?? prev[entry.roomName]?.unread ?? 0,
            messages: prev[entry.roomName]?.messages || [],
          },
        }));

        joiningRoomsRef.current.add(entry.roomName);
        prepared.push({
          roomName: entry.roomName,
          password: entry.password,
          assignedUsername: entry.assignedUsername || nick,
        });
      } catch {
        clearRoomKey(entry.roomName);
        joiningRoomsRef.current.delete(entry.roomName);
      }
    }

    if (prepared.length === 0) {
      updateJoiningState();
      return;
    }

    updateJoiningState();
    socketService.emit('restoreRooms', {
      rooms: prepared,
      username: nick,
    });
  }, [syncOpenRooms, updateJoiningState]);

  useEffect(() => {
    if (!ready || !username || !pendingInvite) return;
    void joinInviteRoom(pendingInvite);
  }, [ready, username, pendingInvite, joinInviteRoom]);

  useEffect(() => {
    if (!ready || !socketActive) return;

    socketService.connect();

    const onRoomJoined = async ({ roomName, messages: initialMessages, username: assignedUsername, quickEmoji }) => {
      const invite = pendingInviteRef.current;
      if (invite?.roomName === roomName) {
        clearPendingInvite();
      }

      joiningRoomsRef.current.delete(roomName);
      updateJoiningState();

      const password = getRoomPassword(roomName) || openRoomsRef.current[roomName]?.password || '';
      if (password && !hasRoomKey(roomName)) {
        await setRoomKey(roomName, password);
      }
      if (password) {
        setRoomSession(roomName, password);
      }

      const prevRoom = openRoomsRef.current[roomName];
      const serverMessages = initialMessages?.length
        ? await normalizeMessages(initialMessages, roomName)
        : [];
      const baseMessages = serverMessages.length > 0
        ? serverMessages
        : (prevRoom?.messages || []);
      const merged = dedupeMessages(mergeWithLocalImages(baseMessages, roomName));
      const meta = buildRoomMeta(merged, prevRoom, tRef.current);

      syncOpenRooms((prev) => ({
        ...prev,
        [roomName]: {
          ...(prev[roomName] || emptyRoomState(password, assignedUsername)),
          password,
          assignedUsername: assignedUsername || prev[roomName]?.assignedUsername || usernameRef.current,
          quickEmoji: quickEmoji || prev[roomName]?.quickEmoji || DEFAULT_QUICK_EMOJI,
          messages: merged,
          unread: 0,
          ...meta,
        },
      }));

      if (quickEmoji) {
        applyRoomQuickEmoji(roomName, quickEmoji);
      }

      if (pendingMaximizeRef.current.has(roomName)) {
        pendingMaximizeRef.current.delete(roomName);
        maximizeRoom(roomName);
      }

      setRoomError('');
      setJoinModal({ open: false, roomName: '', password: '' });
    };

    const onReceiveMessage = async (message) => {
      const roomName = message.roomName;
      const room = openRoomsRef.current[roomName];
      if (!roomName || !room) return;

      if (!hasRoomKey(roomName) && room.password) {
        await setRoomKey(roomName, room.password);
      }

      const normalized = await normalizeMessage(message, roomName);
      const isFocused = activeRoomRef.current === roomName;

      syncOpenRooms((prev) => {
        const current = prev[roomName];
        if (!current) return prev;
        const messages = appendUniqueMessage(current.messages, normalized);
        return {
          ...prev,
          [roomName]: {
            ...current,
            messages,
            unread: isFocused ? 0 : (current.unread || 0) + 1,
            ...buildRoomMeta(messages, {}, tRef.current),
          },
        };
      });
    };

    const onRoomQuickEmojiUpdated = ({ roomName, emoji, message }) => {
      if (!roomName || !emoji) return;
      applyRoomQuickEmoji(roomName, emoji);
      syncOpenRooms((prev) => {
        const room = prev[roomName];
        if (!room) return prev;
        return { ...prev, [roomName]: { ...room, quickEmoji: emoji } };
      });
      if (message) appendSystemMessage(roomName, message);
    };

    const onRoomNickChanged = ({ roomName, oldUsername, newUsername, message }) => {
      if (!roomName || !message) return;
      syncOpenRooms((prev) => {
        const room = prev[roomName];
        if (!room) return prev;
        const systemMessage = {
          sender: 'System',
          content: message,
          timestamp: formatAppTime(new Date(), langRef.current),
          encrypted: false,
          type: 'text',
        };
        const messages = appendUniqueMessage(room.messages, systemMessage);
        return {
          ...prev,
          [roomName]: {
            ...room,
            assignedUsername: room.assignedUsername === oldUsername ? newUsername : room.assignedUsername,
            messages,
            ...buildRoomMeta(messages, {}, tRef.current),
          },
        };
      });
      persistOpenRooms(openRoomsRef.current, activeRoomRef.current);
    };

    const onUserJoined = (payload) => {
      appendSystemMessage(payload?.roomName, parseSocketText(payload));
    };

    const onUserLeft = (payload) => {
      appendSystemMessage(payload?.roomName, parseSocketText(payload));
    };

    const onRoomError = (payload) => {
      const roomName = payload?.roomName;
      const errMsg = payload?.message || String(payload);
      const invite = pendingInviteRef.current;

      if (roomName) joiningRoomsRef.current.delete(roomName);

      const isDuplicateNick = /już|zajęt|istnieje/i.test(errMsg);
      if (isDuplicateNick && invite && roomName === invite.roomName) {
        processedInviteRef.current = null;
        const fallbackNick = `${getJoinUsername().slice(0, 24)}_${Math.random().toString(36).slice(2, 6)}`;
        joiningRoomsRef.current.add(roomName);
        updateJoiningState();
        socketService.emit('joinRoom', {
          roomName: invite.roomName,
          password: invite.password,
          username: fallbackNick,
        });
        return;
      }

      updateJoiningState();

      const isNickChangeError = /zmienić nicku|nick.*zajęt/i.test(errMsg);
      const isWrongPassword = /nieprawidłowe hasło|hasło do pokoju/i.test(errMsg);
      const fromJoinModal = joinModalRef.current?.open;

      if (fromJoinModal && roomName && !isNickChangeError) {
        setRoomError(errMsg);
        setJoinModal({
          open: true,
          roomName,
          password: joinModalRef.current.password || '',
        });
        clearRoomKey(roomName);
        clearRoomSession(roomName);
        syncOpenRooms((prev) => {
          const next = { ...prev };
          delete next[roomName];
          return next;
        });
        setExpandedRooms((prev) => prev.filter((name) => name !== roomName));
        return;
      }

      if (invite && roomName === invite.roomName) {
        processedInviteRef.current = null;
        clearPendingInvite();
        setRoomError(errMsg);
        setJoinModal({ open: true, roomName: invite.roomName, password: invite.password });
        clearRoomKey(roomName);
        syncOpenRooms((prev) => {
          const next = { ...prev };
          delete next[roomName];
          return next;
        });
        setExpandedRooms((prev) => prev.filter((name) => name !== roomName));
        return;
      }

      setRoomError(errMsg);

      if (roomName && !isNickChangeError) {
        clearRoomKey(roomName);
        if (isWrongPassword) clearRoomSession(roomName);
        syncOpenRooms((prev) => {
          const next = { ...prev };
          delete next[roomName];
          return next;
        });
        setExpandedRooms((prev) => prev.filter((name) => name !== roomName));
      }
    };

    const onActiveRoomsList = (rooms) => setActiveRooms(rooms);

    const onConnect = async () => {
      socketService.emit('getRooms');
      await rejoinOpenRooms();
    };

    const onDisconnect = () => {
      joiningRoomsRef.current.clear();
      updateJoiningState();
    };

    socketService.on('roomJoined', onRoomJoined);
    socketService.on('receiveMessage', onReceiveMessage);
    socketService.on('roomQuickEmojiUpdated', onRoomQuickEmojiUpdated);
    socketService.on('roomNickChanged', onRoomNickChanged);
    socketService.on('userJoined', onUserJoined);
    socketService.on('userLeft', onUserLeft);
    socketService.on('roomError', onRoomError);
    socketService.on('activeRoomsList', onActiveRoomsList);
    socketService.on('connect', onConnect);
    socketService.on('disconnect', onDisconnect);

    if (socketService.socket?.connected) {
      socketService.emit('getRooms');
      void rejoinOpenRooms();
    }

    return () => {
      socketService.off('roomJoined', onRoomJoined);
      socketService.off('receiveMessage', onReceiveMessage);
      socketService.off('roomQuickEmojiUpdated', onRoomQuickEmojiUpdated);
      socketService.off('roomNickChanged', onRoomNickChanged);
      socketService.off('userJoined', onUserJoined);
      socketService.off('userLeft', onUserLeft);
      socketService.off('roomError', onRoomError);
      socketService.off('activeRoomsList', onActiveRoomsList);
      socketService.off('connect', onConnect);
      socketService.off('disconnect', onDisconnect);
      socketService.disconnect();
      clearRoomKey();
    };
  }, [ready, socketActive, rejoinOpenRooms, appendSystemMessage, syncOpenRooms, maximizeRoom, updateJoiningState, clearPendingInvite]);

  const handleSetUsername = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const previous = usernameRef.current;
    usernameRef.current = trimmed;
    localStorage.setItem('username', trimmed);
    setUsername(trimmed);
    setSocketActive(true);

    if (previous === trimmed) return;

    socketService.connect();

    if (previous) {
      for (const roomName of Object.keys(openRoomsRef.current)) {
        socketService.emit('changeUsername', { roomName, newUsername: trimmed });
      }
    }
  }, []);

  const handleInviteJoin = useCallback((name) => {
    handleSetUsername(name);
  }, [handleSetUsername]);

  const handleToggleRoom = useCallback((roomName) => {
    setRoomError('');
    const room = openRoomsRef.current[roomName];
    const nick = getJoinUsername() || usernameRef.current;

    if (room?.password && nick && !joiningRoomsRef.current.has(roomName)) {
      socketService.emit('joinRoom', {
        roomName,
        password: room.password,
        username: room.assignedUsername || nick,
        restore: true,
      });
    }

    if (fullscreenRoom && !isCompact) {
      if (roomName === fullscreenRoom && focusedRoom === roomName) {
        setExpandedRooms((prev) => prev.filter((name) => name !== roomName));
        setFullscreenRoom(null);
        return;
      }

      focusRoom(roomName);
      setExpandedRooms((prev) => (prev.includes(roomName) ? prev : [...prev, roomName]));
      setFullscreenRoom(roomName);
      return;
    }

    if (expandedRooms.includes(roomName) && focusedRoom === roomName) {
      setExpandedRooms((prev) => prev.filter((name) => name !== roomName));
      setFullscreenRoom((prev) => (prev === roomName ? null : prev));
      return;
    }

    if (expandedRooms.includes(roomName)) {
      focusRoom(roomName);
      return;
    }

    maximizeRoom(roomName);
  }, [maximizeRoom, focusRoom, expandedRooms, focusedRoom, fullscreenRoom, isCompact]);

  const handleFocusRoom = useCallback((roomName) => {
    focusRoom(roomName);
  }, [focusRoom]);

  const handleMinimizeRoom = useCallback((roomName) => {
    setExpandedRooms((prev) => prev.filter((name) => name !== roomName));
    setFullscreenRoom((prev) => (prev === roomName ? null : prev));
    if (pipRooms.includes(roomName)) closePiP(roomName);
  }, [pipRooms, closePiP]);

  const handleToggleFullscreen = useCallback((roomName) => {
    if (!roomName) return;
    if (pipRooms.includes(roomName)) closePiP(roomName);
    focusRoom(roomName);

    if (isCompact) {
      setFullscreenRoom(roomName);
      return;
    }

    setFullscreenRoom((prev) => (prev === roomName ? null : roomName));
  }, [focusRoom, pipRooms, closePiP, isCompact]);

  const handleTogglePiP = useCallback((roomName) => {
    if (!roomName) return;
    if (pipRooms.includes(roomName)) {
      closePiP(roomName);
      return;
    }

    const prestartedRequest = isDocumentPiPSupported()
      && !window.documentPictureInPicture?.window
      ? requestDocumentPiPWindow()
      : null;

    void (async () => {
      try {
        if (fullscreenRoom === roomName) setFullscreenRoom(null);
        focusRoom(roomName);
        await openPiP(roomName, prestartedRequest);
      } catch (err) {
        setRoomError(err?.message || tRef.current('errors.pipUnsupported'));
      }
    })();
  }, [pipRooms, closePiP, openPiP, focusRoom, fullscreenRoom]);

  const handleOpenJoinModal = useCallback((roomName = '', password = '') => {
    setRoomError('');
    setJoinModal({ open: true, roomName, password });
    socketService.connect();
    socketService.emit('getRooms');
  }, []);

  const handleJoinDiscoverRoom = useCallback((roomName) => {
    const savedPassword = getRoomPassword(roomName)
      || openRoomsRef.current[roomName]?.password
      || '';
    handleOpenJoinModal(roomName, savedPassword);
  }, [handleOpenJoinModal]);

  const handleJoinModalSubmit = useCallback((roomName, password) => {
    setJoinModal({ open: true, roomName, password });
    setRoomError('');
    void joinRoom(roomName, password);
  }, [joinRoom]);

  const handleSendMessage = useCallback(async (roomName, messageContent) => {
    const room = openRoomsRef.current[roomName];
    if (!socketService.socket || !roomName || !room) return;

    try {
      if (!hasRoomKey(roomName)) await setRoomKey(roomName, room.password);
      const encrypted = await encryptMessage(roomName, buildTextPayload(messageContent));
      socketService.emit('sendMessage', { roomName, content: encrypted, encrypted: true, type: 'text' });
    } catch {
      appendSystemMessage(roomName, tRef.current('errors.encryptFailed'));
    }
  }, [appendSystemMessage]);

  const handleSendImage = useCallback(async (roomName, file) => {
    const room = openRoomsRef.current[roomName];
    const nick = room?.assignedUsername || usernameRef.current;
    if (!socketService.socket || !roomName || !room || !nick) {
      throw new Error(tRef.current('errors.noConnection'));
    }

    const imageId = generateMessageId();
    const timestamp = formatAppTime(new Date(), langRef.current);

    let mime;
    let data;
    try {
      ({ mime, data } = await readImageAsBase64(file));
    } catch (err) {
      throw new Error(err?.message || tRef.current('errors.imageProcess'));
    }

    try {
      saveLocalImage(roomName, imageId, { data, mime, sender: nick, timestamp });
    } catch (err) {
      if (err?.name === 'QuotaExceededError') {
        throw new Error(tRef.current('errors.storageFull'));
      }
      throw new Error(tRef.current('errors.imageSave'));
    }

    try {
      if (!hasRoomKey(roomName)) await setRoomKey(roomName, room.password);
      const encrypted = await encryptMessage(roomName, buildImagePayload(imageId, mime, data));
      socketService.emit('sendMessage', {
        roomName,
        content: encrypted,
        encrypted: true,
        type: 'image',
        messageId: imageId,
        ephemeral: true,
      });
    } catch {
      throw new Error(tRef.current('errors.imageSend'));
    }
  }, []);

  const handleLeaveRoom = useCallback((roomName) => {
    socketService.emit('leaveRoom', { roomName });
    clearRoomKey(roomName);
    clearRoomSession(roomName);
    clearLocalImagesForRoom(roomName);
    joiningRoomsRef.current.delete(roomName);
    updateJoiningState();

    syncOpenRooms((prev) => {
      const next = { ...prev };
      delete next[roomName];
      return next;
    });

    setExpandedRooms((prev) => prev.filter((name) => name !== roomName));
    setFullscreenRoom((prev) => (prev === roomName ? null : prev));
    if (pipRooms.includes(roomName)) closePiP(roomName);

    if (activeRoomRef.current === roomName) {
      const remaining = Object.keys(openRoomsRef.current).filter((name) => name !== roomName);
      const nextFocused = remaining[0] || null;
      activeRoomRef.current = nextFocused;
      setFocusedRoom(nextFocused);
      if (nextFocused) {
        setExpandedRooms((prev) => (prev.includes(nextFocused) ? prev : [...prev, nextFocused]));
      }
      persistOpenRooms(openRoomsRef.current, nextFocused);
    }

    setRoomError('');
    socketService.emit('getRooms');
  }, [syncOpenRooms, updateJoiningState, pipRooms, closePiP]);

  useEffect(() => {
    if (pipRooms.length === 0) return;

    const roomsPayload = pipRooms
      .map((name) => {
        const room = openRooms[name];
        if (!room) return null;
        return {
          roomName: name,
          messages: room.messages,
          displayName: room.assignedUsername || username,
          quickEmoji: room.quickEmoji || DEFAULT_QUICK_EMOJI,
        };
      })
      .filter(Boolean);

    if (roomsPayload.length === 0) {
      closePiP();
      return;
    }

    const active = activePipRoom && roomsPayload.some((r) => r.roomName === activePipRoom)
      ? activePipRoom
      : roomsPayload[roomsPayload.length - 1].roomName;

    updatePiPContent(
      <PiPRoot key={lang} lang={lang}>
        <ChatPiPView
          rooms={roomsPayload}
          activeRoom={active}
          onSelectRoom={setActivePipRoom}
          onCloseRoom={closePiP}
          onSendMessage={handleSendMessage}
          onSendImage={handleSendImage}
        />
      </PiPRoot>,
    );
  }, [
    pipRooms,
    activePipRoom,
    openRooms,
    username,
    updatePiPContent,
    closePiP,
    setActivePipRoom,
    handleSendMessage,
    handleSendImage,
    lang,
  ]);

  if (!ready) {
    return (
      <div className="app app--messenger">
        <main className="welcome">
          <section className="welcome-card">
            <AppLangSwitcher />
            <AppLogo size={64} className="welcome-card__logo" />
            <h1 className="welcome-card__title">{t('siteName')}</h1>
            <p className="welcome-card__tagline">{t('tagline')}</p>
            <div className="username-form username-form--entry welcome-card__placeholder" aria-hidden="true">
              <input type="text" tabIndex={-1} disabled placeholder={t('welcome.nickPlaceholder')} />
              <button type="button" className="btn btn--primary" disabled>{t('welcome.enter')}</button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const showInviteModal = pendingInvite && !username;
  const showWelcome = !username && !pendingInvite;
  const showJoiningOverlay = joiningRoom && !joinModal.open;

  const renderChatRoom = (roomName, mode) => {
    const roomData = openRooms[roomName];
    if (!roomData) return null;

    const isFullscreenMode = mode === 'fullscreen';
    const forcedFullscreen = isCompact;

    return (
      <ChatWindow
        key={`${roomName}-${mode}`}
        variant={isFullscreenMode ? 'panel' : 'dock'}
        isFullscreen={isFullscreenMode}
        messages={roomData.messages}
        onSendMessage={(text) => handleSendMessage(roomName, text)}
        onSendImage={(file) => handleSendImage(roomName, file)}
        roomName={roomName}
        roomPassword={roomData.password}
        onLeaveRoom={() => handleLeaveRoom(roomName)}
        onMinimize={() => handleMinimizeRoom(roomName)}
        onToggleFullscreen={forcedFullscreen ? undefined : () => handleToggleFullscreen(roomName)}
        onTogglePiP={() => handleTogglePiP(roomName)}
        isPiPActive={pipRooms.includes(roomName)}
        isPiPSupported={isPiPSupported}
        forcedFullscreen={forcedFullscreen}
        hideHeader={!isFullscreenMode && !isCompact}
        currentUsername={username}
        assignedUsername={roomData.assignedUsername}
        quickEmoji={roomData.quickEmoji}
      />
    );
  };

  return (
    <div className="app app--messenger-full">
      {showInviteModal && (
        <InviteModal
          roomName={pendingInvite.roomName}
          onJoin={handleInviteJoin}
          error={roomError}
          joining={joiningRoom}
        />
      )}

      {showJoiningOverlay ? (
        <div className="modal-overlay" aria-live="polite">
          <div className="modal-card modal-card--invite">
            <p className="modal-card__title">{t('invite.connecting')}</p>
            <p className="modal-card__subtitle">
              {pendingInvite
                ? t('invite.connectingTo', { room: pendingInvite.roomName })
                : t('invite.connectingE2e')}
            </p>
          </div>
        </div>
      ) : null}

      <JoinRoomModal
        open={joinModal.open}
        onClose={() => { setJoinModal({ open: false, roomName: '', password: '' }); setRoomError(''); }}
        onJoin={handleJoinModalSubmit}
        onClearError={() => setRoomError('')}
        activeRooms={activeRooms}
        error={joinModal.open ? roomError : ''}
        initialRoomName={joinModal.roomName}
        initialPassword={joinModal.password}
        joining={joiningRoom}
      />

      {showWelcome ? (
        <main className="welcome">
          <div className="welcome__body">
            <section className="welcome-card">
              <AppLangSwitcher />
              <AppLogo size={64} className="welcome-card__logo" />
              <h1 className="welcome-card__title">{t('siteName')}</h1>
              <p className="welcome-card__tagline">{t('tagline')}</p>
              <p className="welcome-card__text">
                {t('welcome.text')}
              </p>
              <UserNameInput onSetUsername={handleSetUsername} initialName={username} />
            </section>
          </div>
          <AppSiteFooter variant="welcome" />
        </main>
      ) : (
        <MessengerDock
          username={username}
          openRooms={openRooms}
          discoverRooms={activeRooms}
          expandedRooms={expandedRooms}
          focusedRoom={focusedRoom}
          fullscreenRoom={fullscreenRoom}
          pipRooms={pipRooms}
          isCompact={isCompact}
          onSetUsername={handleSetUsername}
          onToggleRoom={handleToggleRoom}
          onFocusRoom={handleFocusRoom}
          onCloseRoom={handleLeaveRoom}
          onJoinDiscoverRoom={handleJoinDiscoverRoom}
          onNewRoom={() => handleOpenJoinModal()}
          renderChatRoom={renderChatRoom}
        />
      )}

      {roomError && !joinModal.open && !showInviteModal && !showWelcome && (
        <p className="error-message messenger-global-error" role="alert">{translateRoomError(roomError, t)}</p>
      )}
    </div>
  );
}
