const SALT_PREFIX = process.env.NEXT_PUBLIC_E2E_SALT_PREFIX || 'pokoje-czatu-e2e-v2';
const ITERATIONS = 210000;

const roomKeys = new Map();

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
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
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

/** Puste hasło = kanał publiczny; klucz PBKDF2 z nazwy pokoju + ''. */
export async function setRoomKey(roomName, password) {
  if (password === null || password === undefined) {
    throw new Error('Brak hasła do szyfrowania');
  }
  roomKeys.set(roomName, await deriveKey(roomName, password));
}

export async function ensureRoomKey(roomName, password) {
  if (hasRoomKey(roomName)) return;
  await setRoomKey(roomName, password);
}

export function hasRoomKey(roomName) {
  return roomKeys.has(roomName);
}

export function clearRoomKey(roomName) {
  if (roomName) {
    roomKeys.delete(roomName);
    return;
  }
  roomKeys.clear();
}

export async function encryptMessage(roomName, plaintext) {
  const key = roomKeys.get(roomName);
  if (!key) throw new Error('Brak klucza szyfrowania');
  return encryptWithKey(key, plaintext);
}

export async function decryptMessage(roomName, content) {
  return decryptWithKey(roomKeys.get(roomName), content);
}

export async function decryptMessages(roomName, messages) {
  return Promise.all(
    messages.map(async (msg) => {
      if (msg.sender === 'System' || !msg.encrypted) return msg;
      return { ...msg, content: await decryptMessage(roomName, msg.content) };
    }),
  );
}
