function toBase64Url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(b64) {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const normalized = pad ? padded + '='.repeat(4 - pad) : padded;
  return decodeURIComponent(escape(atob(normalized)));
}

export function buildInviteLink(roomName, password) {
  const params = new URLSearchParams();
  params.set('room', roomName);
  params.set('pwd', toBase64Url(password));
  return `${window.location.origin}${window.location.pathname}#${params.toString()}`;
}

export function parseInviteLink() {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const roomName = params.get('room');
  const pwd = params.get('pwd');
  if (!roomName || !pwd) return null;

  try {
    return { roomName, password: fromBase64Url(pwd) };
  } catch {
    return null;
  }
}

export function clearInviteHash() {
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
