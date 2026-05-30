const STORAGE_KEY = 'pokoje_czatu_local_media';
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

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function pruneStore(store) {
  const entries = Object.entries(store);
  if (entries.length <= MAX_ITEMS) return store;
  entries.sort((a, b) => (a[1].savedAt || 0) - (b[1].savedAt || 0));
  return Object.fromEntries(entries.slice(-MAX_ITEMS));
}

export function saveLocalImage(roomName, imageId, { data, mime, sender, timestamp }) {
  if (!roomName || !isValidImageId(imageId)) return;
  if (!validateImageEntry({ data, mime })) return;

  const store = loadStore();
  store[`${roomName}:${imageId}`] = { data, mime, sender, timestamp, savedAt: Date.now() };
  saveStore(pruneStore(store));
}

export function getLocalImage(roomName, imageId) {
  const item = loadStore()[`${roomName}:${imageId}`];
  if (!item || !validateImageEntry(item)) return null;
  return `data:${STORE_MIME};base64,${item.data}`;
}

export function getLocalImagesForRoom(roomName) {
  const store = loadStore();
  const prefix = `${roomName}:`;
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
  if (!roomName) return;
  const store = loadStore();
  const prefix = `${roomName}:`;
  let changed = false;
  for (const key of Object.keys(store)) {
    if (key.startsWith(prefix)) {
      delete store[key];
      changed = true;
    }
  }
  if (changed) saveStore(store);
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
