const SALT_PREFIX = process.env.NEXT_PUBLIC_E2E_SALT_PREFIX || 'pokoje-czatu-e2e-v2';
const ITERATIONS = 210000;

/** roomName → { key, password } — klucz E2E zawsze z nazwy pokoju + hasła (roomChannelId tylko do sesji). */
const roomKeys = new Map();

function isRoomPasswordKnown(password) {
  return password !== null && password !== undefined;
}

export function assertE2eCryptoAvailable() {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('E2E_REQUIRES_HTTPS');
  }
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(roomName, password) {
  assertE2eCryptoAvailable();
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(String(password)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`${SALT_PREFIX}:${roomName}`),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function getKeyEntry(roomName) {
  const entry = roomKeys.get(roomName);
  if (!entry) return null;
  if (entry.key) return entry;
  return { key: entry, password: '' };
}

async function encryptWithKey(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );

  return JSON.stringify({
    v: 2,
    iv: toBase64(iv),
    ct: toBase64(ciphertext),
  });
}

async function decryptWithKey(key, content) {
  if (!content) return content;

  let payload;
  try {
    payload = JSON.parse(content);
  } catch {
    return content;
  }

  if (!payload?.iv || !payload?.ct) return content;
  if (!key) return '[zaszyfrowana wiadomość]';

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(payload.iv) },
      key,
      fromBase64(payload.ct),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return '[nie można odszyfrować]';
  }
}

/** Puste hasło = kanał publiczny; sól PBKDF2 = nazwa pokoju + hasło. */
export async function setRoomKey(roomName, password) {
  if (!isRoomPasswordKnown(password)) {
    throw new Error('Brak hasła do szyfrowania');
  }
  const key = await deriveKey(roomName, password);
  roomKeys.set(roomName, { key, password: String(password) });
}

/** roomChannelId ignorowany przy szyfrowaniu — tylko kompatybilność wywołań. */
export async function ensureRoomKey(roomName, password, _roomChannelId = '') {
  if (!isRoomPasswordKnown(password)) {
    throw new Error('Brak hasła do szyfrowania');
  }
  const pwd = String(password);
  const cached = getKeyEntry(roomName);
  if (cached?.password === pwd && cached.key) return;
  await setRoomKey(roomName, password);
}

export function hasRoomKey(roomName) {
  return Boolean(getKeyEntry(roomName)?.key);
}

export function clearRoomKey(roomName) {
  if (roomName) {
    roomKeys.delete(roomName);
    return;
  }
  roomKeys.clear();
}

export async function encryptMessage(roomName, plaintext) {
  const entry = getKeyEntry(roomName);
  if (!entry?.key) throw new Error('Brak klucza szyfrowania');
  return encryptWithKey(entry.key, plaintext);
}

export async function decryptMessage(roomName, content, _roomChannelId = '', password = null) {
  const entry = getKeyEntry(roomName);
  if (entry?.key) {
    const primary = await decryptWithKey(entry.key, content);
    if (primary !== '[nie można odszyfrować]') return primary;
  }

  if (isRoomPasswordKnown(password)) {
    const legacyKey = await deriveKey(roomName, password);
    return decryptWithKey(legacyKey, content);
  }

  return entry?.key ? '[nie można odszyfrować]' : '[zaszyfrowana wiadomość]';
}

export async function decryptMessages(roomName, messages, roomChannelId = '', password = null) {
  return Promise.all(
    messages.map(async (msg) => {
      if (msg.sender === 'System' || !msg.encrypted) return msg;
      return {
        ...msg,
        content: await decryptMessage(roomName, msg.content, roomChannelId, password),
      };
    }),
  );
}
