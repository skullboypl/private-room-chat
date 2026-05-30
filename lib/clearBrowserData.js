import { clearRoomKey } from '@/lib/crypto/e2e';

const LOCAL_KEYS = ['username', 'chat:roomQuickEmoji', 'pokoje_czatu_local_media'];
const SESSION_PREFIXES = ['room:', 'chat:openRooms', 'chat:activeRoom'];

export function clearAllBrowserChatData() {
  LOCAL_KEYS.forEach((key) => localStorage.removeItem(key));

  const sessionKeys = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (!key) continue;
    if (SESSION_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix))) {
      sessionKeys.push(key);
    }
  }
  sessionKeys.forEach((key) => sessionStorage.removeItem(key));

  clearRoomKey();
}

export const CLEAR_BROWSER_CONFIRM =
  'Wyczyścić pamięć przeglądarki?\n\n'
  + 'Usunie to nick, zapisane hasła pokoi, lokalne obrazy, emoji kanałów i listę otwartych rozmów. '
  + 'Aktywne połączenie zostanie zerwane.';
