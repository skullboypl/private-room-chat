/** Czas offline / minimalizacji PWA zanim użytkownik zostanie usunięty z pokoju. */
const DISCONNECT_GRACE_MS = 15 * 60 * 1000;

module.exports = {
  DISCONNECT_GRACE_MS,
  SESSION_SUSPEND_GRACE_MS: DISCONNECT_GRACE_MS,
};
