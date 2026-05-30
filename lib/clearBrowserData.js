import { clearRoomKey } from '@/lib/crypto/e2e';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/locale';
import {
  clearAllLocalImages,
  LOCAL_MEDIA_STORAGE_KEY,
} from '@/lib/localMessageStore';

const LOCAL_KEYS = [
  'username',
  'chat:roomQuickEmoji',
  LOCAL_MEDIA_STORAGE_KEY,
  'chat:local_media',
  'pokoje_czatu_media',
];

const SESSION_PREFIXES = ['room:', 'chat:openRooms', 'chat:activeRoom'];

const LOCAL_SWEEP_RE = /^(pokoje|chat:|vxh-)/i;

function removeLocalStorageKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function sweepLocalStorage() {
  const preserve = new Set([LOCALE_STORAGE_KEY]);
  const keys = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || preserve.has(key)) continue;
    if (
      LOCAL_KEYS.includes(key)
      || LOCAL_SWEEP_RE.test(key)
      || key.includes('media')
      || key.includes('czatu')
    ) {
      keys.push(key);
    }
  }

  keys.forEach(removeLocalStorageKey);
  LOCAL_KEYS.forEach(removeLocalStorageKey);
}

function sweepSessionStorage() {
  const sessionKeys = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (!key) continue;
    if (SESSION_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix))) {
      sessionKeys.push(key);
    }
  }
  sessionKeys.forEach((key) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });
}

async function clearServiceWorkerCaches() {
  if (typeof caches === 'undefined') return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

export async function clearAllBrowserChatData() {
  if (typeof window === 'undefined') return;

  clearAllLocalImages();
  sweepLocalStorage();
  sweepSessionStorage();
  clearRoomKey();

  await clearServiceWorkerCaches();

  window.dispatchEvent(new CustomEvent('chatvxh:storage-cleared'));
}

export const CLEAR_BROWSER_CONFIRM =
  'Wyczyścić pamięć przeglądarki?\n\n'
  + 'Usunie to nick, zapisane hasła pokoi, lokalne obrazy, emoji kanałów i listę otwartych rozmów. '
  + 'Aktywne połączenie zostanie zerwane.';
