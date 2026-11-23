/**
 * Szyfrowane localStorage / sessionStorage — klucz PBKDF2 z sekretu aplikacji + origin + salt urządzenia.
 * Wartości w UI nigdy nie są pokazywane; w DevTools widać tylko ciphertext (vxh:e:…).
 */

const DEVICE_SALT_KEY = 'vxh:ds';
const ENC_LOCAL_PREFIX = 'vxh:e:ls:';
const ENC_SESSION_PREFIX = 'vxh:e:ss:';

const STORAGE_APP_SECRET = process.env.NEXT_PUBLIC_VXH_STORAGE_SECRET
  || 'chatvxh-storage-v1-private-room';
const STORAGE_SALT_LABEL = 'VXH-CHATVXH-BROWSER-V1';
const PBKDF2_ITERATIONS = 310_000;

const memoryLocal = new Map();
const memorySession = new Map();

let storageCryptoKey = null;
let initPromise = null;

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

function randomBase64(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toBase64(arr);
}

function physicalKey(logicalKey, area) {
  return `${area === 'session' ? ENC_SESSION_PREFIX : ENC_LOCAL_PREFIX}${logicalKey}`;
}

function getOrigin() {
  if (typeof window === 'undefined') return '';
  return window.location.origin || '';
}

async function deriveStorageKey(deviceSaltB64) {
  const enc = new TextEncoder();
  const material = `${STORAGE_SALT_LABEL}:${STORAGE_APP_SECRET}:${getOrigin()}`;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(material),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromBase64(deviceSaltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptString(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return JSON.stringify({
    v: 3,
    iv: toBase64(iv),
    ct: toBase64(ciphertext),
  });
}

async function decryptString(key, payload) {
  if (!payload) return null;
  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!parsed?.iv || !parsed?.ct) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(parsed.iv) },
      key,
      fromBase64(parsed.ct),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

function readRaw(area, logicalKey) {
  const store = area === 'session' ? sessionStorage : localStorage;
  try {
    return store.getItem(physicalKey(logicalKey, area));
  } catch {
    return null;
  }
}

async function writeRaw(area, logicalKey, ciphertext) {
  const store = area === 'session' ? sessionStorage : localStorage;
  const key = physicalKey(logicalKey, area);
  try {
    if (ciphertext == null) store.removeItem(key);
    else store.setItem(key, ciphertext);
  } catch {
    /* quota */
  }
}

async function loadIntoCache(area, logicalKey) {
  const enc = readRaw(area, logicalKey);
  if (!enc) return null;
  const plain = await decryptString(storageCryptoKey, enc);
  if (plain == null) return null;
  if (area === 'session') memorySession.set(logicalKey, plain);
  else memoryLocal.set(logicalKey, plain);
  return plain;
}

const LEGACY_LOCAL = [
  ['username', 'username'],
  ['clientSessionId', 'chat:clientSessionId'],
  ['userAvatarSeed', 'userAvatarSeed'],
  ['userAvatarStyle', 'userAvatarStyle'],
  ['roomQuickEmoji', 'chat:roomQuickEmoji'],
  ['localMedia', 'pokoje_czatu_local_media'],
  ['localMedia', 'chat:local_media'],
  ['localMedia', 'pokoje_czatu_media'],
];

const LEGACY_SESSION_EXACT = [
  ['openRooms', 'chat:openRooms'],
  ['activeRoom', 'chat:activeRoom'],
];

async function migrateLegacyEntry(area, logicalKey, legacyKey) {
  const cache = area === 'session' ? memorySession : memoryLocal;
  if (cache.has(logicalKey)) return;

  const enc = readRaw(area, logicalKey);
  if (enc) {
    await loadIntoCache(area, logicalKey);
    return;
  }

  const store = area === 'session' ? sessionStorage : localStorage;
  let legacy = null;
  try {
    legacy = store.getItem(legacyKey);
  } catch {
    return;
  }
  if (legacy == null) return;

  cache.set(logicalKey, legacy);
  await writeRaw(area, logicalKey, await encryptString(storageCryptoKey, legacy));
  try {
    store.removeItem(legacyKey);
  } catch {
    /* ignore */
  }
}

async function migrateSessionRooms() {
  const keys = [];
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('room:')) keys.push(key);
    }
  } catch {
    return;
  }

  for (const legacyKey of keys) {
    const logicalKey = legacyKey;
    await migrateLegacyEntry('session', logicalKey, legacyKey);
  }
}

async function migrateAllLegacy() {
  for (const [logical, legacy] of LEGACY_LOCAL) {
    await migrateLegacyEntry('local', logical, legacy);
  }
  for (const [logical, legacy] of LEGACY_SESSION_EXACT) {
    await migrateLegacyEntry('session', logical, legacy);
  }
  await migrateSessionRooms();
}

function ensureDeviceSalt() {
  try {
    let salt = localStorage.getItem(DEVICE_SALT_KEY);
    if (!salt) {
      salt = randomBase64(24);
      localStorage.setItem(DEVICE_SALT_KEY, salt);
    }
    return salt;
  } catch {
    return randomBase64(24);
  }
}

export function isSecureStorageReady() {
  return Boolean(storageCryptoKey);
}

export async function initSecureBrowserStorage() {
  if (typeof window === 'undefined') return;
  if (storageCryptoKey) return;
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    const deviceSalt = ensureDeviceSalt();
    storageCryptoKey = await deriveStorageKey(deviceSalt);
    await migrateAllLegacy();
  })();

  await initPromise;
}

export function secureLocalGetSync(logicalKey) {
  return memoryLocal.get(logicalKey) ?? null;
}

export function secureSessionGetSync(logicalKey) {
  return memorySession.get(logicalKey) ?? null;
}

export async function secureLocalSet(logicalKey, plaintext) {
  if (!storageCryptoKey) await initSecureBrowserStorage();
  memoryLocal.set(logicalKey, plaintext);
  await writeRaw('local', logicalKey, await encryptString(storageCryptoKey, plaintext));
}

export async function secureSessionSet(logicalKey, plaintext) {
  if (!storageCryptoKey) await initSecureBrowserStorage();
  memorySession.set(logicalKey, plaintext);
  await writeRaw('session', logicalKey, await encryptString(storageCryptoKey, plaintext));
}

export function secureLocalSetSync(logicalKey, plaintext) {
  memoryLocal.set(logicalKey, plaintext);
  void secureLocalSet(logicalKey, plaintext);
}

export function secureSessionSetSync(logicalKey, plaintext) {
  memorySession.set(logicalKey, plaintext);
  void secureSessionSet(logicalKey, plaintext);
}

export function secureLocalRemove(logicalKey) {
  memoryLocal.delete(logicalKey);
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(physicalKey(logicalKey, 'local'));
  } catch {
    /* ignore */
  }
}

export function secureSessionRemove(logicalKey) {
  memorySession.delete(logicalKey);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(physicalKey(logicalKey, 'session'));
  } catch {
    /* ignore */
  }
}

export function clearSecureMemory() {
  memoryLocal.clear();
  memorySession.clear();
}

export function resetSecureBrowserStorage() {
  storageCryptoKey = null;
  initPromise = null;
  clearSecureMemory();
}

export function sweepEncryptedStorage() {
  if (typeof window === 'undefined') return;

  const removeMatching = (store, prefix) => {
    const keys = [];
    try {
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key?.startsWith(prefix)) keys.push(key);
      }
      keys.forEach((key) => store.removeItem(key));
    } catch {
      /* ignore */
    }
  };

  removeMatching(localStorage, ENC_LOCAL_PREFIX);
  removeMatching(sessionStorage, ENC_SESSION_PREFIX);
  try {
    localStorage.removeItem(DEVICE_SALT_KEY);
  } catch {
    /* ignore */
  }
  resetSecureBrowserStorage();
}
