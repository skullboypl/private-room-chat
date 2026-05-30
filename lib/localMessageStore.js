export const LOCAL_MEDIA_STORAGE_KEY = 'pokoje_czatu_local_media';

/** @deprecated legacy keys from older builds */
const LEGACY_MEDIA_KEYS = ['chat:local_media', 'pokoje_czatu_media'];

const STORAGE_KEY = LOCAL_MEDIA_STORAGE_KEY;
const MAX_ITEMS = 80;
const STORE_MIME = 'image/jpeg';
const BASE64_RE = /^[A-Za-z0-9+/]+=*$/;
const MAX_DATA_LEN = 175_000;

function isValidImageId(imageId) {
  return typeof imageId === 'string' && /^[\w-]{8,64}$/.test(imageId);
}

function validateImageEntry({ data, mime }) {
  if (mime !== STORE_MIME) return false;
  if (!data || typeof data !== 'string') return false;
  if (data.length > MAX_DATA_LEN) return false;
  return BASE64_RE.test(data);
}

function normalizeRoomName(roomName) {
  return String(roomName || '').trim();
}

function storeKey(roomName, imageId) {
  return `${normalizeRoomName(roomName)}:${imageId}`;
}

export function dispatchMediaStoreChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('chatvxh:media-store-changed'));
}

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  dispatchMediaStoreChanged();
}

function pruneStore(store) {
  const entries = Object.entries(store);
  if (entries.length <= MAX_ITEMS) return store;
  entries.sort((a, b) => (a[1].savedAt || 0) - (b[1].savedAt || 0));
  return Object.fromEntries(entries.slice(-MAX_ITEMS));
}

export function saveLocalImage(roomName, imageId, { data, mime, sender, timestamp }) {
  const room = normalizeRoomName(roomName);
  if (!room || !isValidImageId(imageId)) return;
  if (!validateImageEntry({ data, mime })) return;

  const store = loadStore();
  store[storeKey(room, imageId)] = { data, mime, sender, timestamp, savedAt: Date.now() };
  saveStore(pruneStore(store));
}

export function getLocalImage(roomName, imageId) {
  const room = normalizeRoomName(roomName);
  const item = loadStore()[storeKey(room, imageId)];
  if (!item || !validateImageEntry(item)) return null;
  return `data:${STORE_MIME};base64,${item.data}`;
}

export function getLocalImagesForRoom(roomName) {
  const store = loadStore();
  const prefix = `${normalizeRoomName(roomName)}:`;
  return Object.entries(store)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, item]) => ({
      imageId: key.slice(prefix.length),
      sender: item.sender,
      timestamp: item.timestamp,
      type: 'image',
      encrypted: false,
      localOnly: true,
    }))
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
}

export function clearLocalImagesForRoom(roomName) {
  const room = normalizeRoomName(roomName);
  if (!room) return;
  const store = loadStore();
  const prefix = `${room}:`;
  let changed = false;
  for (const key of Object.keys(store)) {
    const keyRoom = key.includes(':') ? key.slice(0, key.indexOf(':')) : '';
    if (key.startsWith(prefix) || keyRoom === room) {
      delete store[key];
      changed = true;
    }
  }
  if (changed) saveStore(store);
  else dispatchMediaStoreChanged();
}

/** Usuwa wszystkie lokalne obrazy + ewentualne legacy klucze w localStorage. */
export function clearAllLocalImages() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }

  LEGACY_MEDIA_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });

  try {
    localStorage.setItem(STORAGE_KEY, '{}');
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }

  dispatchMediaStoreChanged();
}

export function hasLocalMediaStore() {
  if (typeof window === 'undefined') return false;
  const current = localStorage.getItem(STORAGE_KEY);
  if (current && current !== '{}' && current !== 'null') {
    try {
      return Object.keys(JSON.parse(current)).length > 0;
    } catch {
      return true;
    }
  }
  return LEGACY_MEDIA_KEYS.some((key) => localStorage.getItem(key));
}

export function buildImagePayload(imageId, mime, data) {
  return JSON.stringify({ t: 'image', id: imageId, mime, data });
}

export function parseMessagePayload(content) {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.t === 'image') {
      return { type: 'image', imageId: parsed.id, mime: parsed.mime, data: parsed.data };
    }
    if (parsed?.t === 'text') {
      return { type: 'text', text: parsed.body };
    }
  } catch {
    // plain text
  }
  return { type: 'text', text: content };
}

export function buildTextPayload(text) {
  return JSON.stringify({ t: 'text', body: text });
}
