'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { socketService } from '@/lib/socket/client';
import {
  ensureRoomKey,
  assertE2eCryptoAvailable,
  hasRoomKey,
  clearRoomKey,
  encryptMessage,
  decryptMessage,
} from '@/lib/crypto/e2e';
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
  getRoomChannelId,
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
import {
  isMobileChatViewport,
  lockMobileChatViewport,
  resetMobileViewportForChat,
  setMobileChatViewportActive,
} from '@/lib/mobileViewport';
import '@/components/mobile-chat-viewport.css';
import { trimExpandedToViewport } from '@/lib/dockLayout';
import { applyRoomQuickEmoji, DEFAULT_QUICK_EMOJI } from '@/lib/roomEmoji';
import AppSiteFooter from '@/components/AppSiteFooter';
import AppLangSwitcher from '@/components/AppLangSwitcher';
import { useTranslation } from '@/context/LocaleContext';
import { translateRoomError } from '@/lib/i18n/systemMessages';
import { formatAppTime } from '@/lib/i18n/locale';
import { createPresenceSystemMessage } from '@/lib/chatPresence';
import {
  canAutoRestoreRoom,
  findActiveRoomMeta,
  getRoomUserCount,
  isOpenRoomPassword,
  isRoomPasswordKnown,
  normalizeActiveRoomsList,
  resolveRoomCredential,
  resolveRoomPasswordForCrypto,
  resolveRoomUserCount,
  roomCredentialMatchesServer,
} from '@/lib/roomAccess';
import {
  buildUserProfilesFromServerUsers,
  mergeUserProfiles,
} from '@/lib/roomUserProfiles';
import {
  createMessageSendLimiter,
  MESSAGE_SEND_WINDOW_MS,
} from '@/lib/messageSendRateLimit';
import {
  getJoinAvatarPayload,
  readProfileAvatarFromStorage,
  readStoredUserAvatarSeed,
  readStoredUserAvatarStyle,
  writeStoredUserAvatar,
} from '@/lib/userAvatarStorage';
import { resolveSenderProfile } from '@/lib/resolveSenderProfile';
import { invalidateUserAvatarCache } from '@/lib/userAvatar';
import { bindPageResume } from '@/lib/pageResume';
import { getOrCreateClientSessionId } from '@/lib/clientSessionId';
import { initSecureBrowserStorage, secureLocalSetSync } from '@/lib/secureBrowserStorage';
import { normalizeRoomChannelId } from '@/lib/roomChannelId';
import { isWithinSessionGrace } from '@/lib/sessionGrace';
import '@/components/chat-app.css';

const SOCKET_HANDLER_EVENTS = [
  ['roomJoined', 'onRoomJoined'],
  ['receiveMessage', 'onReceiveMessage'],
  ['roomQuickEmojiUpdated', 'onRoomQuickEmojiUpdated'],
  ['roomNickChanged', 'onRoomNickChanged'],
  ['userJoined', 'onUserJoined'],
  ['roomUserAvatarUpdated', 'onRoomUserAvatarUpdated'],
  ['roomUsersList', 'onRoomUsersList'],
  ['userLeft', 'onUserLeft'],
  ['roomError', 'onRoomError'],
  ['activeRoomsList', 'onActiveRoomsList'],
];

function emptyRoomState(password = '', assignedUsername = '', roomChannelId = '') {
  return {
    password,
    roomChannelId: normalizeRoomChannelId(roomChannelId),
    needsPasswordReentry: false,
    suspendedAt: null,
    assignedUsername,
    quickEmoji: DEFAULT_QUICK_EMOJI,
    messages: [],
    unread: 0,
    lastPreview: '',
    lastTimestamp: '',
    userCount: null,
    userProfiles: {},
  };
}

function parseSocketText(payload) {
  if (typeof payload === 'string') return payload;
  return payload?.message || '';
}

async function normalizeMessage(msg, roomName, fallbackPassword, roomChannelId = '') {
  if (msg.sender === 'System') return msg;

  const sessionPassword = getRoomPassword(roomName);
  const password = isRoomPasswordKnown(sessionPassword)
    ? sessionPassword
    : fallbackPassword;
  const channelId = normalizeRoomChannelId(roomChannelId) || getRoomChannelId(roomName);
  if (isRoomPasswordKnown(password)) {
    await ensureRoomKey(roomName, password, channelId);
  }

  let content = msg.content;
  if (msg.encrypted) {
    try {
      content = await decryptMessage(roomName, msg.content, channelId, password);
    } catch {
      return {
        ...msg,
        type: 'text',
        content: '…',
        encrypted: false,
      };
    }
  }

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

async function normalizeMessages(messages, roomName, roomPassword, roomChannelId = '') {
  return Promise.all(
    messages.map((msg) => normalizeMessage(msg, roomName, roomPassword, roomChannelId)),
  );
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

function buildSocketJoinPayload(username, roomChannelId = '') {
  const payload = {
    clientSessionId: getOrCreateClientSessionId(),
    ...getJoinAvatarPayload(username),
  };
  const channelId = normalizeRoomChannelId(roomChannelId);
  if (channelId) payload.roomChannelId = channelId;
  return payload;
}

function hydrateOpenRoomsFromSession(list) {
  if (!Array.isArray(list) || list.length === 0) return {};

  return list.reduce((acc, entry) => {
    if (!entry?.roomName) return acc;

    if (entry.needsPasswordReentry) {
      acc[entry.roomName] = {
        ...emptyRoomState(null, entry.assignedUsername || ''),
        needsPasswordReentry: true,
        suspendedAt: entry.suspendedAt || null,
        lastPreview: entry.lastPreview || '',
        lastTimestamp: entry.lastTimestamp || '',
        unread: entry.unread || 0,
      };
      return acc;
    }

    if (!isRoomPasswordKnown(entry.password)) return acc;

    const channelId = normalizeRoomChannelId(entry.roomChannelId);
    setRoomSession(entry.roomName, entry.password, channelId);
    acc[entry.roomName] = {
      ...emptyRoomState(entry.password, entry.assignedUsername || '', channelId),
      suspendedAt: entry.suspendedAt || null,
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
  const [profileAvatar, setProfileAvatar] = useState(null);
  const joinModalRef = useRef(joinModal);
  const messageSendLimiterRef = useRef(null);
  if (!messageSendLimiterRef.current) {
    messageSendLimiterRef.current = createMessageSendLimiter();
  }
  const [messageSendCooldownMs, setMessageSendCooldownMs] = useState(0);
  const [fullscreenRoom, setFullscreenRoom] = useState(null);
  const [mobileChatsCollapsed, setMobileChatsCollapsed] = useState(false);
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
  const activeRoomsRef = useRef([]);
  const activeRoomRef = useRef(null);
  const pendingInviteRef = useRef(null);
  const usernameRef = useRef('');
  const joiningRoomsRef = useRef(new Set());
  const joinAckTimersRef = useRef(new Map());
  const pendingMaximizeRef = useRef(new Set());
  const processedInviteRef = useRef(null);
  const rejoinAfterRoomsListRef = useRef(false);
  const socketHandlersRef = useRef({});

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

  const clearJoinAckTimer = useCallback((roomName) => {
    const timer = joinAckTimersRef.current.get(roomName);
    if (timer) {
      clearTimeout(timer);
      joinAckTimersRef.current.delete(roomName);
    }
  }, []);

  const scheduleJoinAckTimer = useCallback((roomName) => {
    clearJoinAckTimer(roomName);
    const timer = setTimeout(() => {
      if (!joiningRoomsRef.current.has(roomName)) return;
      joiningRoomsRef.current.delete(roomName);
      pendingMaximizeRef.current.delete(roomName);
      updateJoiningState();
      setRoomError(tRef.current('errors.joinTimeout'));
      clearRoomKey(roomName);
      syncOpenRooms((prev) => {
        if (!prev[roomName]) return prev;
        const next = { ...prev };
        delete next[roomName];
        return next;
      });
    }, 25000);
    joinAckTimersRef.current.set(roomName, timer);
  }, [clearJoinAckTimer, syncOpenRooms, updateJoiningState]);

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
      setMobileChatsCollapsed(false);
      setFullscreenRoom(roomName);
    }
    clearRoomUnread(roomName);
    persistOpenRooms(openRoomsRef.current, roomName);
  }, [clearRoomUnread, isCompact]);

  useEffect(() => { pendingInviteRef.current = pendingInvite; }, [pendingInvite]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { openRoomsRef.current = openRooms; }, [openRooms]);
  useEffect(() => { activeRoomsRef.current = activeRooms; }, [activeRooms]);
  useEffect(() => { joinModalRef.current = joinModal; }, [joinModal]);

  const resolveRoomChannelIdForRoom = useCallback((roomName) => (
    normalizeRoomChannelId(openRoomsRef.current[roomName]?.roomChannelId)
    || normalizeRoomChannelId(findActiveRoomMeta(activeRoomsRef.current, roomName)?.roomChannelId)
    || getRoomChannelId(roomName)
    || ''
  ), []);

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
    if (!isCompact) {
      setMobileChatViewportActive(false);
      return undefined;
    }

    const inFullscreenChat = Boolean(fullscreenRoom);
    setMobileChatViewportActive(inFullscreenChat);

    if (!inFullscreenChat) return undefined;

    const unlock = lockMobileChatViewport();

    const onOrientation = () => {
      if (isMobileChatViewport() && fullscreenRoom) {
        resetMobileViewportForChat();
      }
    };

    window.addEventListener('orientationchange', onOrientation);

    return () => {
      window.removeEventListener('orientationchange', onOrientation);
      unlock.restore();
    };
  }, [isCompact, fullscreenRoom]);

  useEffect(() => {
    if (!isCompact) {
      setMobileChatsCollapsed(false);
    }
  }, [isCompact]);

  useEffect(() => {
    if (!ready || !username || !isCompact) return;
    if (mobileChatsCollapsed) return;

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
  }, [ready, username, isCompact, mobileChatsCollapsed, focusedRoom, expandedRooms, openRooms]);

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
    let cancelled = false;

    void (async () => {
      await initSecureBrowserStorage();
      if (cancelled) return;

      const stored = readStoredUsername();
      if (stored) {
        setUsername(stored);
        setSocketActive(true);
        const avatar = readProfileAvatarFromStorage();
        if (avatar) setProfileAvatar(avatar);
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
    })();

    window.addEventListener('hashchange', applyInviteFromUrl);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', applyInviteFromUrl);
    };
  }, [applyInviteFromUrl]);

  const messageSendCooldownActive = messageSendCooldownMs > 0;

  useEffect(() => {
    if (!messageSendCooldownActive) return undefined;

    const tick = () => {
      const retryAfterMs = messageSendLimiterRef.current.getRetryAfterMs();
      setMessageSendCooldownMs((prev) => {
        if (retryAfterMs <= 0) return prev > 0 ? 0 : prev;
        const prevSec = Math.ceil(prev / 1000);
        const nextSec = Math.ceil(retryAfterMs / 1000);
        if (prevSec === nextSec) return prev;
        return retryAfterMs;
      });
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [messageSendCooldownActive]);

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

  const consumeMessageSendSlot = useCallback((roomName) => {
    const result = messageSendLimiterRef.current.tryConsume();
    if (!result.ok) {
      setMessageSendCooldownMs(result.retryAfterMs);
      const seconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
      appendSystemMessage(roomName, tRef.current('errors.messageRateLimit', { seconds }));
      return false;
    }
    setMessageSendCooldownMs(0);
    return true;
  }, [appendSystemMessage]);

  const messageSendCooldownSeconds = messageSendCooldownMs > 0
    ? Math.max(1, Math.ceil(messageSendCooldownMs / 1000))
    : 0;

  const joinRoom = useCallback(async (roomName, password, { restore = false, noPassword = false } = {}) => {
    const nick = getJoinUsername() || usernameRef.current;
    if (!nick) {
      setRoomError(tRef.current('errors.usernameRequired'));
      return false;
    }
    if (joiningRoomsRef.current.has(roomName)) {
      setRoomError(tRef.current('joinModal.connecting'));
      return false;
    }

    const existing = openRoomsRef.current[roomName];
    const meta = findActiveRoomMeta(activeRoomsRef.current, roomName);
    const joiningOpen = noPassword || isOpenRoomPassword(password) || meta?.isOpen;

    let resolvedPassword = password;
    if (resolvedPassword === undefined || resolvedPassword === null) {
      resolvedPassword = existing?.password;
    }
    if (resolvedPassword === undefined || resolvedPassword === null) {
      if (joiningOpen) resolvedPassword = '';
      else {
        setRoomError(tRef.current('errors.noPassword'));
        return false;
      }
    }

    joiningRoomsRef.current.add(roomName);
    updateJoiningState();
    setRoomError('');

    try {
      const meta = findActiveRoomMeta(activeRoomsRef.current, roomName);
      const channelIdForJoin = meta
        ? (normalizeRoomChannelId(meta.roomChannelId) || resolveRoomChannelIdForRoom(roomName))
        : '';
      await ensureRoomKey(roomName, resolvedPassword, channelIdForJoin);
      setRoomSession(roomName, resolvedPassword, channelIdForJoin);
      syncOpenRooms((prev) => ({
        ...prev,
        [roomName]: {
          ...(prev[roomName] || emptyRoomState(resolvedPassword, '', channelIdForJoin)),
          password: resolvedPassword,
          roomChannelId: channelIdForJoin,
          needsPasswordReentry: false,
        },
      }));
      if (!restore) {
        pendingMaximizeRef.current.add(roomName);
      }
      await socketService.waitForConnect();
      socketService.emit('joinRoom', {
        roomName,
        password: resolvedPassword,
        username: nick,
        restore,
        noPassword: isOpenRoomPassword(resolvedPassword),
        ...buildSocketJoinPayload(nick, channelIdForJoin),
      });
      scheduleJoinAckTimer(roomName);
      return true;
    } catch (err) {
      clearJoinAckTimer(roomName);
      joiningRoomsRef.current.delete(roomName);
      pendingMaximizeRef.current.delete(roomName);
      updateJoiningState();
      setRoomError(
        err?.message === 'timeout'
          ? tRef.current('errors.noConnection')
          : tRef.current('errors.e2eInit'),
      );
      clearRoomKey(roomName);
      return false;
    }
  }, [syncOpenRooms, updateJoiningState, scheduleJoinAckTimer, clearJoinAckTimer, resolveRoomChannelIdForRoom]);

  const joinInviteRoom = useCallback(async (invite) => {
    if (!invite?.roomName) return false;

    const token = `${invite.roomName}\0${invite.password ?? ''}`;
    if (processedInviteRef.current === token) return false;

    processedInviteRef.current = token;
    const ok = await joinRoom(invite.roomName, invite.password, {
      noPassword: isOpenRoomPassword(invite.password ?? ''),
    });
    if (!ok) processedInviteRef.current = null;
    return ok;
  }, [joinRoom]);

  const removeOpenRoomLocally = useCallback((roomName) => {
    if (!roomName) return;

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

    if (Object.keys(openRoomsRef.current).length === 0) {
      setMobileChatsCollapsed(false);
    }

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
  }, [syncOpenRooms, updateJoiningState, pipRooms, closePiP]);

  const pruneStaleOpenRooms = useCallback((activeList) => {
    const activeNames = new Set(
      normalizeActiveRoomsList(activeList).map((item) => item.roomName),
    );
    const toRemove = [];

    for (const roomName of Object.keys(openRoomsRef.current)) {
      if (joiningRoomsRef.current.has(roomName)) continue;
      if (pendingMaximizeRef.current.has(roomName)) continue;
      if (pendingInviteRef.current?.roomName === roomName) continue;
      const room = openRoomsRef.current[roomName];
      if (!activeNames.has(roomName)) {
        if (isWithinSessionGrace(room?.suspendedAt)) continue;
        toRemove.push(roomName);
        continue;
      }
      const meta = findActiveRoomMeta(activeList, roomName);
      if (room?.needsPasswordReentry) continue;
      if (meta && !roomCredentialMatchesServer(room?.password, meta, room?.roomChannelId)) {
        toRemove.push(roomName);
      }
    }

    for (const roomName of toRemove) {
      removeOpenRoomLocally(roomName);
    }

    return toRemove.length;
  }, [removeOpenRoomLocally]);

  const rejoinOpenRooms = useCallback(async () => {
    if (!usernameRef.current) return;

    const nick = getJoinUsername() || usernameRef.current;
    const activeNames = new Set(
      activeRoomsRef.current.map((item) => item.roomName),
    );
    const seen = new Set();
    const entries = [];
    const { list: persistedList } = loadPersistedSession();
    const persistedByRoom = new Map(
      persistedList.filter((item) => item?.roomName).map((item) => [item.roomName, item]),
    );
    const roomNames = new Set([
      ...Object.keys(openRoomsRef.current),
      ...persistedList.map((item) => item?.roomName).filter(Boolean),
    ]);

    const markNeedsPasswordReentry = (entry) => {
      clearRoomSession(entry.roomName);
      clearRoomKey(entry.roomName);
      syncOpenRooms((prev) => ({
        ...prev,
        [entry.roomName]: {
          ...(prev[entry.roomName] || emptyRoomState(null, entry.assignedUsername || '')),
          password: null,
          roomChannelId: '',
          needsPasswordReentry: true,
          assignedUsername: entry.assignedUsername || prev[entry.roomName]?.assignedUsername || '',
          lastPreview: entry.lastPreview || prev[entry.roomName]?.lastPreview || '',
          lastTimestamp: entry.lastTimestamp || prev[entry.roomName]?.lastTimestamp || '',
          unread: entry.unread ?? prev[entry.roomName]?.unread ?? 0,
          messages: prev[entry.roomName]?.messages || [],
        },
      }));
    };

    const considerEntry = (rawEntry) => {
      if (!rawEntry?.roomName || seen.has(rawEntry.roomName)) return;
      seen.add(rawEntry.roomName);

      const localRoom = openRoomsRef.current[rawEntry.roomName];
      const persisted = persistedByRoom.get(rawEntry.roomName);
      const credential = resolveRoomCredential(rawEntry.roomName, localRoom, persisted);
      let entry = {
        ...rawEntry,
        password: credential.needsPasswordReentry ? null : credential.password,
        roomChannelId: credential.roomChannelId,
        needsPasswordReentry: credential.needsPasswordReentry,
        assignedUsername: rawEntry.assignedUsername
          || localRoom?.assignedUsername
          || persisted?.assignedUsername
          || '',
        lastPreview: rawEntry.lastPreview || localRoom?.lastPreview || persisted?.lastPreview || '',
        lastTimestamp: rawEntry.lastTimestamp || localRoom?.lastTimestamp || persisted?.lastTimestamp || '',
        unread: rawEntry.unread ?? localRoom?.unread ?? persisted?.unread ?? 0,
      };

      if (entry.needsPasswordReentry || !isRoomPasswordKnown(entry.password)) {
        markNeedsPasswordReentry(entry);
        return;
      }

      if (!activeNames.has(entry.roomName)) {
        if (joiningRoomsRef.current.has(entry.roomName)) return;
        if (pendingMaximizeRef.current.has(entry.roomName)) return;
        if (isWithinSessionGrace(localRoom?.suspendedAt)) return;
        removeOpenRoomLocally(entry.roomName);
        return;
      }

      const meta = findActiveRoomMeta(activeRoomsRef.current, entry.roomName);
      if (!meta) {
        removeOpenRoomLocally(entry.roomName);
        return;
      }

      if (!roomCredentialMatchesServer(entry.password, meta, entry.roomChannelId)) {
        removeOpenRoomLocally(entry.roomName);
        return;
      }

      if (!canAutoRestoreRoom(entry.password, meta)) {
        if (meta.isOpen) {
          entries.push({ ...entry, password: '' });
        } else if (isRoomPasswordKnown(entry.password)) {
          entries.push(entry);
        } else {
          markNeedsPasswordReentry(entry);
        }
        return;
      }

      entries.push(entry);
    };

    for (const roomName of roomNames) {
      considerEntry({ roomName });
    }

    if (!entries.length) return;

    socketService.connect();

    const avatar = getJoinAvatarPayload(nick);
    const prepared = [];

    for (const entry of entries) {
      if (pendingInviteRef.current?.roomName === entry.roomName) continue;
      if (joiningRoomsRef.current.has(entry.roomName)) continue;

      try {
        await ensureRoomKey(entry.roomName, entry.password, entry.roomChannelId);
        setRoomSession(entry.roomName, entry.password, entry.roomChannelId);
        syncOpenRooms((prev) => ({
          ...prev,
          [entry.roomName]: {
            ...(prev[entry.roomName] || emptyRoomState(entry.password, entry.assignedUsername, entry.roomChannelId)),
            password: entry.password,
            roomChannelId: entry.roomChannelId,
            needsPasswordReentry: false,
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
          roomChannelId: entry.roomChannelId,
          assignedUsername: entry.assignedUsername || nick,
          noPassword: isOpenRoomPassword(entry.password),
        });
      } catch {
        clearRoomKey(entry.roomName);
        joiningRoomsRef.current.delete(entry.roomName);
      }
    }

    if (prepared.length === 0) {
      joiningRoomsRef.current.clear();
      updateJoiningState();
      return;
    }

    updateJoiningState();
    try {
      await socketService.waitForConnect();
      socketService.emit('restoreRooms', {
        rooms: prepared,
        username: nick,
        clientSessionId: getOrCreateClientSessionId(),
        avatarSeed: avatar.avatarSeed,
        avatarStyle: avatar.avatarStyle,
      });
    } catch {
      joiningRoomsRef.current.clear();
      updateJoiningState();
    }
  }, [syncOpenRooms, updateJoiningState, removeOpenRoomLocally]);

  useEffect(() => {
    if (!ready || !username || !pendingInvite) return;
    void joinInviteRoom(pendingInvite);
  }, [ready, username, pendingInvite, joinInviteRoom]);

  useLayoutEffect(() => {
    if (!ready || !socketActive) return;

    const onRoomJoined = async ({
      roomName,
      roomChannelId: joinedChannelId,
      messages: initialMessages,
      username: assignedUsername,
      quickEmoji,
      users,
      showPresence,
    }) => {
      const invite = pendingInviteRef.current;
      if (invite?.roomName === roomName) {
        clearPendingInvite();
      }

      clearJoinAckTimer(roomName);
      joiningRoomsRef.current.delete(roomName);
      updateJoiningState();

      const sessionPwd = getRoomPassword(roomName);
      const password = isRoomPasswordKnown(sessionPwd)
        ? sessionPwd
        : (openRoomsRef.current[roomName]?.password ?? '');
      const channelId = normalizeRoomChannelId(joinedChannelId)
        || resolveRoomChannelIdForRoom(roomName);

      await ensureRoomKey(roomName, password, channelId);
      setRoomSession(roomName, password, channelId);

      const prevRoom = openRoomsRef.current[roomName];
      const serverMessages = initialMessages?.length
        ? await normalizeMessages(initialMessages, roomName, password, channelId)
        : [];
      let merged = dedupeMessages(mergeWithLocalImages(
        dedupeMessages([...(prevRoom?.messages || []), ...serverMessages]),
        roomName,
      ));

      if (showPresence && Array.isArray(users)) {
        const nick = assignedUsername || usernameRef.current;
        const presenceMsg = createPresenceSystemMessage(
          roomName,
          users,
          nick,
          tRef.current,
          (date) => formatAppTime(date, langRef.current),
        );
        merged = dedupeMessages([presenceMsg, ...merged]);
      }

      const meta = buildRoomMeta(merged, prevRoom, tRef.current);

      const liveCount = Array.isArray(users) ? users.length : null;
      const roomNick = assignedUsername || prevRoom?.assignedUsername || usernameRef.current;
      const localAvatar = readProfileAvatarFromStorage() || getJoinAvatarPayload(roomNick);

      syncOpenRooms((prev) => ({
        ...prev,
        [roomName]: {
          ...(prev[roomName] || emptyRoomState(password, assignedUsername, channelId)),
          password,
          roomChannelId: channelId,
          needsPasswordReentry: false,
          suspendedAt: null,
          assignedUsername: roomNick,
          quickEmoji: quickEmoji || prev[roomName]?.quickEmoji || DEFAULT_QUICK_EMOJI,
          messages: merged,
          unread: 0,
          userCount: liveCount ?? getRoomUserCount(activeRoomsRef.current, roomName) ?? prev[roomName]?.userCount ?? null,
          userProfiles: mergeUserProfiles(
            buildUserProfilesFromServerUsers(users),
            roomNick ? [{
              username: roomNick,
              avatarSeed: localAvatar.avatarSeed,
              avatarStyle: localAvatar.avatarStyle,
            }] : [],
          ),
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
      const avatarFromStorage = readProfileAvatarFromStorage();
      if (avatarFromStorage) setProfileAvatar(avatarFromStorage);
      socketService.emit('getRoomUsers', roomName);
    };

    const onRoomUsersList = ({ roomName, users }) => {
      if (!roomName || !Array.isArray(users)) return;
      syncOpenRooms((prev) => {
        const room = prev[roomName];
        if (!room) return prev;
        const roomNick = room.assignedUsername;
        const localAvatar = roomNick ? getJoinAvatarPayload(roomNick) : null;
        return {
          ...prev,
          [roomName]: {
            ...room,
            userProfiles: mergeUserProfiles(
              buildUserProfilesFromServerUsers(users),
              roomNick ? [{
                username: roomNick,
                avatarSeed: localAvatar.avatarSeed,
                avatarStyle: localAvatar.avatarStyle,
              }] : [],
            ),
          },
        };
      });
    };

    const onReceiveMessage = async (message) => {
      const roomName = message.roomName;
      const room = openRoomsRef.current[roomName];
      if (!roomName || !room) return;

      const channelId = resolveRoomChannelIdForRoom(roomName);
      const msgPassword = resolveRoomPasswordForCrypto(roomName, room);
      if (isRoomPasswordKnown(msgPassword)) {
        await ensureRoomKey(roomName, msgPassword, channelId);
      }

      const normalized = await normalizeMessage(message, roomName, msgPassword, channelId);
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
        const userProfiles = { ...(room.userProfiles || {}) };
        if (userProfiles[oldUsername]) {
          userProfiles[newUsername] = userProfiles[oldUsername];
          delete userProfiles[oldUsername];
        }
        return {
          ...prev,
          [roomName]: {
            ...room,
            assignedUsername: room.assignedUsername === oldUsername ? newUsername : room.assignedUsername,
            messages,
            userProfiles,
            ...buildRoomMeta(messages, {}, tRef.current),
          },
        };
      });
      persistOpenRooms(openRoomsRef.current, activeRoomRef.current);
    };

    const onUserJoined = (payload) => {
      appendSystemMessage(payload?.roomName, parseSocketText(payload));
      const roomName = payload?.roomName;
      const uname = payload?.username;
      if (!roomName || !uname) return;

      syncOpenRooms((prev) => {
        const room = prev[roomName];
        if (!room) return prev;
        return {
          ...prev,
          [roomName]: {
            ...room,
            userProfiles: mergeUserProfiles(room.userProfiles, [{
              username: uname,
              avatarSeed: payload.avatarSeed,
              avatarStyle: payload.avatarStyle,
            }]),
          },
        };
      });
    };

    const onUserLeft = (payload) => {
      appendSystemMessage(payload?.roomName, parseSocketText(payload));
    };

    const onRoomUserAvatarUpdated = ({ roomName, username: uname, avatarSeed, avatarStyle }) => {
      if (!roomName || !uname) return;
      syncOpenRooms((prev) => {
        const room = prev[roomName];
        if (!room) return prev;
        if (uname === room.assignedUsername) {
          writeStoredUserAvatar(avatarSeed, avatarStyle);
          invalidateUserAvatarCache();
        }
        return {
          ...prev,
          [roomName]: {
            ...room,
            userProfiles: mergeUserProfiles(room.userProfiles, [{
              username: uname,
              avatarSeed,
              avatarStyle,
            }]),
          },
        };
      });
    };

    const onRoomError = (payload) => {
      const roomName = payload?.roomName;
      const errMsg = payload?.message || String(payload);
      const invite = pendingInviteRef.current;

      if (/zbyt wiele wiadomości/i.test(errMsg)) {
        let retryAfterMs = messageSendLimiterRef.current.getRetryAfterMs();
        if (retryAfterMs <= 0) {
          let attempt = messageSendLimiterRef.current.tryConsume();
          while (attempt.ok) {
            attempt = messageSendLimiterRef.current.tryConsume();
          }
          retryAfterMs = attempt.retryAfterMs || MESSAGE_SEND_WINDOW_MS;
        }
        setMessageSendCooldownMs(retryAfterMs);
        if (roomName && openRoomsRef.current[roomName]) {
          const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
          appendSystemMessage(roomName, tRef.current('errors.messageRateLimit', { seconds }));
        }
        return;
      }

      if (roomName) {
        clearJoinAckTimer(roomName);
        joiningRoomsRef.current.delete(roomName);
      }

      const isRoomGone = /nie jest już aktywny|no longer active/i.test(errMsg);
      if (isRoomGone && roomName) {
        removeOpenRoomLocally(roomName);
        updateJoiningState();
        return;
      }

      const isDuplicateNick = /już|zajęt|istnieje/i.test(errMsg);
      if (isDuplicateNick && invite && roomName === invite.roomName) {
        processedInviteRef.current = null;
        const fallbackNick = `${getJoinUsername().slice(0, 24)}_${Math.random().toString(36).slice(2, 6)}`;
        joiningRoomsRef.current.add(roomName);
        updateJoiningState();
        socketService.emit('joinRoom', {
          roomName: invite.roomName,
          password: invite.password ?? '',
          username: fallbackNick,
          noPassword: isOpenRoomPassword(invite.password ?? ''),
          ...buildSocketJoinPayload(fallbackNick, resolveRoomChannelIdForRoom(roomName)),
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

      if (isWrongPassword && roomName && !fromJoinModal && !isNickChangeError) {
        clearRoomKey(roomName);
        clearRoomSession(roomName);
        syncOpenRooms((prev) => {
          const prevRoom = prev[roomName];
          if (!prevRoom) return prev;
          return {
            ...prev,
            [roomName]: {
              ...prevRoom,
              password: null,
              needsPasswordReentry: true,
              messages: [],
            },
          };
        });
        setJoinModal({ open: true, roomName, password: '' });
        setRoomError(tRef.current('errors.staleChannelPassword'));
        return;
      }

      if (!roomName) {
        setRoomError(errMsg);
        return;
      }

      if (isNickChangeError) {
        setRoomError(errMsg);
        return;
      }

      if (joiningRoomsRef.current.has(roomName) || pendingMaximizeRef.current.has(roomName)) {
        appendSystemMessage(roomName, translateRoomError(errMsg, tRef.current));
        return;
      }

      setRoomError(errMsg);
    };

    const onActiveRoomsList = (rooms) => {
      const normalized = normalizeActiveRoomsList(rooms);
      activeRoomsRef.current = normalized;
      setActiveRooms(normalized);

      const shouldRejoin = rejoinAfterRoomsListRef.current && usernameRef.current;
      const hasPendingJoin = joiningRoomsRef.current.size > 0
        || pendingMaximizeRef.current.size > 0;

      if (shouldRejoin) {
        rejoinAfterRoomsListRef.current = false;
      }

      if (!hasPendingJoin) {
        if (shouldRejoin) {
          void rejoinOpenRooms().finally(() => pruneStaleOpenRooms(normalized));
        } else {
          pruneStaleOpenRooms(normalized);
        }
      }
      syncOpenRooms((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const meta of normalized) {
          if (!next[meta.roomName] || next[meta.roomName].userCount === meta.userCount) continue;
          next[meta.roomName] = { ...next[meta.roomName], userCount: meta.userCount };
          changed = true;
        }
        return changed ? next : prev;
      });
    };

    const onConnect = () => {
      rejoinAfterRoomsListRef.current = Boolean(usernameRef.current);
      socketService.emit('getRooms');
    };

    const onDisconnect = () => {
      if (
        joiningRoomsRef.current.size === 0
        && pendingMaximizeRef.current.size === 0
      ) {
        updateJoiningState();
      }
      if (!usernameRef.current) return;

      rejoinAfterRoomsListRef.current = true;
      const now = Date.now();
      syncOpenRooms((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [name, room] of Object.entries(next)) {
          if (!room || isWithinSessionGrace(room.suspendedAt)) continue;
          next[name] = { ...room, suspendedAt: now };
          changed = true;
        }
        return changed ? next : prev;
      });
      persistOpenRooms(openRoomsRef.current, activeRoomRef.current);
    };

    socketHandlersRef.current = {
      onRoomJoined,
      onReceiveMessage,
      onRoomQuickEmojiUpdated,
      onRoomNickChanged,
      onUserJoined,
      onRoomUserAvatarUpdated,
      onRoomUsersList,
      onUserLeft,
      onRoomError,
      onActiveRoomsList,
      onConnect,
      onDisconnect,
    };
  }, [ready, socketActive, rejoinOpenRooms, pruneStaleOpenRooms, removeOpenRoomLocally, appendSystemMessage, syncOpenRooms, maximizeRoom, updateJoiningState, clearPendingInvite, clearJoinAckTimer, resolveRoomChannelIdForRoom]);

  const resumeChatSession = useCallback(() => {
    if (!ready || !socketActive || !usernameRef.current) return;
    socketService.ensureConnected();
    if (
      joiningRoomsRef.current.size === 0
      && pendingMaximizeRef.current.size === 0
    ) {
      rejoinAfterRoomsListRef.current = true;
    }
    socketService.emit('getRooms');
  }, [ready, socketActive]);

  useEffect(() => {
    if (!ready || !socketActive) return undefined;

    socketService.connect();

    const bindings = SOCKET_HANDLER_EVENTS.map(([event, key]) => {
      const handler = (...args) => {
        const fn = socketHandlersRef.current[key];
        if (fn) return fn(...args);
        return undefined;
      };
      socketService.on(event, handler);
      return [event, handler];
    });

    const onConnectBridge = () => socketHandlersRef.current.onConnect?.();
    const onDisconnectBridge = (reason) => socketHandlersRef.current.onDisconnect?.(reason);
    const onReconnectBridge = () => socketHandlersRef.current.onConnect?.();

    socketService.on('connect', onConnectBridge);
    socketService.on('disconnect', onDisconnectBridge);
    socketService.on('reconnect', onReconnectBridge);

    if (socketService.isConnected()) {
      rejoinAfterRoomsListRef.current = Boolean(usernameRef.current);
      socketService.emit('getRooms');
    }

    return () => {
      bindings.forEach(([event, handler]) => socketService.off(event, handler));
      socketService.off('connect', onConnectBridge);
      socketService.off('disconnect', onDisconnectBridge);
      socketService.off('reconnect', onReconnectBridge);
    };
  }, [ready, socketActive]);

  useEffect(() => {
    if (!ready || !socketActive) return undefined;
    return bindPageResume(resumeChatSession);
  }, [ready, socketActive, resumeChatSession]);

  useEffect(() => {
    if (socketActive) return undefined;
    socketService.disconnect();
    return undefined;
  }, [socketActive]);

  const handleClearUser = useCallback(() => {
    usernameRef.current = '';
    setUsername('');
    setSocketActive(false);
    setExpandedRooms([]);
    setFocusedRoom(null);
    setFullscreenRoom(null);
    syncOpenRooms(() => ({}));
  }, [syncOpenRooms]);

  const handleClearProfileRequest = useCallback(() => {
    const roomNames = Object.keys(openRoomsRef.current);
    if (roomNames.length > 0) {
      const ok = window.confirm(tRef.current('welcome.clearSessionConfirm'));
      if (!ok) return false;
      for (const roomName of roomNames) {
        socketService.emit('leaveRoom', { roomName });
        clearRoomKey(roomName);
        clearRoomSession(roomName);
        clearLocalImagesForRoom(roomName);
        joiningRoomsRef.current.delete(roomName);
      }
      updateJoiningState();
      syncOpenRooms(() => ({}));
      setExpandedRooms([]);
      setFocusedRoom(null);
      setFullscreenRoom(null);
      activeRoomRef.current = null;
      persistOpenRooms({}, null);
      if (pipRooms.length > 0) closePiP();
      socketService.emit('getRooms');
    }
    return true;
  }, [syncOpenRooms, updateJoiningState, pipRooms, closePiP]);

  const pickProfileAvatarFromRooms = useCallback(() => {
    for (const room of Object.values(openRoomsRef.current)) {
      const nick = room.assignedUsername;
      if (!nick) continue;
      const profile = room.userProfiles?.[nick];
      if (profile?.avatarSeed) {
        return { avatarSeed: profile.avatarSeed, avatarStyle: profile.avatarStyle };
      }
    }
    return null;
  }, []);

  const refreshProfileAvatar = useCallback(() => {
    const fromStorage = readProfileAvatarFromStorage();
    if (fromStorage) {
      setProfileAvatar(fromStorage);
      return;
    }
    const fromRooms = pickProfileAvatarFromRooms();
    if (fromRooms) {
      setProfileAvatar(fromRooms);
      return;
    }
    const nick = getJoinUsername() || usernameRef.current;
    if (nick) {
      setProfileAvatar(getJoinAvatarPayload(nick));
    }
  }, [pickProfileAvatarFromRooms]);

  const scheduleProfileAvatarStorageSync = useCallback(() => {
    const sync = () => {
      const fromStorage = readProfileAvatarFromStorage();
      if (fromStorage) setProfileAvatar(fromStorage);
    };
    sync();
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(sync);
    window.setTimeout(sync, 50);
    window.setTimeout(sync, 150);
  }, []);

  useEffect(() => {
    if (!username) return;
    refreshProfileAvatar();
  }, [username, openRooms, refreshProfileAvatar]);

  const handleAvatarChange = useCallback(({ avatarSeed, avatarStyle }) => {
    const seed = avatarSeed || readStoredUserAvatarSeed();
    const style = avatarStyle || readStoredUserAvatarStyle();
    writeStoredUserAvatar(seed, style);
    invalidateUserAvatarCache();
    setProfileAvatar({ avatarSeed: seed, avatarStyle: style });

    syncOpenRooms((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const [roomName, room] of Object.entries(next)) {
        const nick = room.assignedUsername;
        if (!nick) continue;

        next[roomName] = {
          ...room,
          userProfiles: mergeUserProfiles(room.userProfiles, [{
            username: nick,
            avatarSeed: seed,
            avatarStyle: style,
          }]),
        };
        changed = true;

        socketService.emit('updateUserAvatar', {
          roomName,
          avatarSeed: seed,
          avatarStyle: style,
        });
      }

      return changed ? next : prev;
    });
  }, [syncOpenRooms]);

  const handleSetUsername = useCallback((name, { avatarSeed, avatarStyle } = {}) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (avatarSeed) {
      const style = avatarStyle || readStoredUserAvatarStyle();
      writeStoredUserAvatar(avatarSeed, style);
      invalidateUserAvatarCache();
      setProfileAvatar({ avatarSeed, avatarStyle: style });
    }

    const previous = usernameRef.current;
    usernameRef.current = trimmed;
    secureLocalSetSync('username', trimmed);
    setUsername(trimmed);
    setSocketActive(true);
    scheduleProfileAvatarStorageSync();

    if (previous === trimmed) return;

    socketService.connect();

    if (previous) {
      for (const roomName of Object.keys(openRoomsRef.current)) {
        socketService.emit('changeUsername', { roomName, newUsername: trimmed });
      }
    }
  }, [scheduleProfileAvatarStorageSync]);

  const handleInviteJoin = useCallback((name) => {
    handleSetUsername(name);
  }, [handleSetUsername]);

  const handleToggleRoom = useCallback((roomName) => {
    setRoomError('');
    const room = openRoomsRef.current[roomName];
    const nick = getJoinUsername() || usernameRef.current;

    if (
      (room?.needsPasswordReentry || !isRoomPasswordKnown(room?.password))
      && nick
    ) {
      setJoinModal({ open: true, roomName, password: '' });
    } else if (isRoomPasswordKnown(room?.password) && nick && !joiningRoomsRef.current.has(roomName)) {
      joiningRoomsRef.current.add(roomName);
      updateJoiningState();
      socketService.emit('joinRoom', {
        roomName,
        password: room.password,
        username: room.assignedUsername || nick,
        restore: true,
        noPassword: isOpenRoomPassword(room.password),
        ...buildSocketJoinPayload(nick, resolveRoomChannelIdForRoom(roomName)),
      });
    }

    if (fullscreenRoom && !isCompact) {
      if (roomName === fullscreenRoom && focusedRoom === roomName) {
        if (Object.keys(openRoomsRef.current).length <= 1) return;

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
      const openCount = Object.keys(openRoomsRef.current).length;
      if (isCompact && openCount <= 1) return;

      setExpandedRooms((prev) => prev.filter((name) => name !== roomName));
      setFullscreenRoom((prev) => (prev === roomName ? null : prev));
      return;
    }

    if (expandedRooms.includes(roomName)) {
      focusRoom(roomName);
      return;
    }

    maximizeRoom(roomName);
  }, [maximizeRoom, focusRoom, expandedRooms, focusedRoom, fullscreenRoom, isCompact, updateJoiningState]);

  const handleFocusRoom = useCallback((roomName) => {
    focusRoom(roomName);
  }, [focusRoom]);

  const handleMinimizeRoom = useCallback((roomName) => {
    if (isCompact) {
      setMobileChatsCollapsed(true);
      setFullscreenRoom(null);
      setExpandedRooms([]);
      return;
    }

    setExpandedRooms((prev) => prev.filter((name) => name !== roomName));
    setFullscreenRoom((prev) => (prev === roomName ? null : prev));
    if (pipRooms.includes(roomName)) closePiP(roomName);
  }, [isCompact, pipRooms, closePiP]);

  const handleRestoreMobileChats = useCallback(() => {
    if (!isCompact) return;

    const names = Object.keys(openRoomsRef.current);
    if (names.length === 0) return;

    const room = (focusedRoom && openRoomsRef.current[focusedRoom])
      ? focusedRoom
      : names[0];

    setMobileChatsCollapsed(false);
    maximizeRoom(room);
  }, [isCompact, focusedRoom, maximizeRoom]);

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
    const meta = findActiveRoomMeta(activeRoomsRef.current, roomName);
    if (meta?.isOpen) {
      setRoomError('');
      void joinRoom(roomName, '');
      return;
    }
    const savedPassword = getRoomPassword(roomName)
      ?? openRoomsRef.current[roomName]?.password
      ?? '';
    handleOpenJoinModal(roomName, savedPassword);
  }, [handleOpenJoinModal, joinRoom, resolveRoomChannelIdForRoom]);

  const handleJoinModalSubmit = useCallback((roomName, password, { noPassword = false } = {}) => {
    setJoinModal({ open: true, roomName, password });
    setRoomError('');
    void joinRoom(roomName, password, { noPassword });
  }, [joinRoom]);

  const handleSendMessage = useCallback(async (roomName, messageContent) => {
    const room = openRoomsRef.current[roomName];
    if (!socketService.socket || !roomName || !room) return;
    if (!consumeMessageSendSlot(roomName)) return;

    try {
      assertE2eCryptoAvailable();
      const password = resolveRoomPasswordForCrypto(roomName, room);
      if (!isRoomPasswordKnown(password)) {
        appendSystemMessage(roomName, tRef.current('errors.noPassword'));
        return;
      }
      await ensureRoomKey(roomName, password);
      const encrypted = await encryptMessage(roomName, buildTextPayload(messageContent));
      socketService.emit('sendMessage', { roomName, content: encrypted, encrypted: true, type: 'text' });
    } catch (err) {
      if (err?.message === 'E2E_REQUIRES_HTTPS') {
        appendSystemMessage(roomName, tRef.current('errors.e2eRequiresHttps'));
      } else {
        appendSystemMessage(roomName, tRef.current('errors.encryptFailed'));
      }
    }
  }, [appendSystemMessage, consumeMessageSendSlot]);

  const handleSendImage = useCallback(async (roomName, file) => {
    const room = openRoomsRef.current[roomName];
    const nick = room?.assignedUsername || usernameRef.current;
    if (!socketService.socket || !roomName || !room || !nick) {
      throw new Error(tRef.current('errors.noConnection'));
    }
    if (!consumeMessageSendSlot(roomName)) {
      throw new Error(tRef.current('errors.messageRateLimit', {
        seconds: Math.max(1, Math.ceil(messageSendLimiterRef.current.getRetryAfterMs() / 1000)),
      }));
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
      const password = resolveRoomPasswordForCrypto(roomName, room);
      if (!isRoomPasswordKnown(password)) {
        throw new Error(tRef.current('errors.noPassword'));
      }
      const channelId = resolveRoomChannelIdForRoom(roomName);
      await ensureRoomKey(roomName, password, channelId);
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
  }, [consumeMessageSendSlot]);

  const handleLeaveRoom = useCallback((roomName) => {
    socketService.emit('leaveRoom', { roomName });
    removeOpenRoomLocally(roomName);
    setRoomError('');
    socketService.emit('getRooms');
  }, [removeOpenRoomLocally]);

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
          userProfiles: room.userProfiles || {},
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
          sendCooldownSeconds={messageSendCooldownSeconds}
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
    messageSendCooldownSeconds,
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
    const openChannelCount = Object.keys(openRooms).length;
    const allowMinimize = isCompact ? openChannelCount >= 1 : openChannelCount > 1;
    const resolvedPassword = isRoomPasswordKnown(roomData.password) && !roomData.needsPasswordReentry
      ? roomData.password
      : (getRoomPassword(roomName) ?? '');

    const getSenderProfile = (sender) => resolveSenderProfile(roomData, sender, username);
    const channelRoomState = isRoomPasswordKnown(resolvedPassword)
      ? { password: resolvedPassword }
      : null;

    return (
      <ChatWindow
        key={`${roomName}-${mode}`}
        variant={isFullscreenMode ? 'panel' : 'dock'}
        isFullscreen={isFullscreenMode}
        messages={roomData.messages}
        onSendMessage={(text) => handleSendMessage(roomName, text)}
        onSendImage={(file) => handleSendImage(roomName, file)}
        roomName={roomName}
        roomPassword={resolvedPassword}
        channelRoomState={channelRoomState}
        onLeaveRoom={() => handleLeaveRoom(roomName)}
        onMinimize={allowMinimize ? () => handleMinimizeRoom(roomName) : undefined}
        onToggleFullscreen={forcedFullscreen ? undefined : () => handleToggleFullscreen(roomName)}
        onTogglePiP={() => handleTogglePiP(roomName)}
        isPiPActive={pipRooms.includes(roomName)}
        isPiPSupported={isPiPSupported}
        forcedFullscreen={forcedFullscreen}
        hideHeader={!isFullscreenMode && !isCompact}
        currentUsername={username}
        assignedUsername={roomData.assignedUsername}
        quickEmoji={roomData.quickEmoji}
        roomUserCount={resolveRoomUserCount(activeRooms, roomName, roomData)}
        activeRooms={activeRooms}
        getSenderProfile={getSenderProfile}
        sendCooldownSeconds={messageSendCooldownSeconds}
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
              <UserNameInput
                onSetUsername={handleSetUsername}
                onClearUser={handleClearUser}
                onAvatarChange={handleAvatarChange}
                clearInProfileModal={false}
                initialName={username}
              />
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
          mobileChatsCollapsed={mobileChatsCollapsed}
          onRestoreMobileChats={handleRestoreMobileChats}
          onSetUsername={handleSetUsername}
          onClearUser={handleClearUser}
          onClearProfile={handleClearProfileRequest}
          syncedProfileAvatar={profileAvatar}
          onAvatarChange={handleAvatarChange}
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
