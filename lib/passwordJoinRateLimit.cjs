const { createSlidingWindowRateLimiter } = require('./slidingWindowRateLimit.cjs');

const PER_ROOM_MAX = 6;
const PER_ROOM_WINDOW_MS = 5 * 60 * 1000;
const PER_IP_MAX = 20;
const PER_IP_WINDOW_MS = 15 * 60 * 1000;

const PASSWORD_RATE_MSG = 'Zbyt wiele błędnych haseł. Spróbuj ponownie za {seconds} s.';

const ipGlobalLimiters = new Map();
const ipRoomLimiters = new Map();

function getIpLimiter(ip) {
  const key = ip || 'unknown';
  if (!ipGlobalLimiters.has(key)) {
    ipGlobalLimiters.set(key, createSlidingWindowRateLimiter({
      max: PER_IP_MAX,
      windowMs: PER_IP_WINDOW_MS,
    }));
  }
  return ipGlobalLimiters.get(key);
}

function getIpRoomLimiter(ip, roomName) {
  const key = `${ip || 'unknown'}:${roomName}`;
  if (!ipRoomLimiters.has(key)) {
    ipRoomLimiters.set(key, createSlidingWindowRateLimiter({
      max: PER_ROOM_MAX,
      windowMs: PER_ROOM_WINDOW_MS,
    }));
  }
  return ipRoomLimiters.get(key);
}

function formatRateMessage(retryAfterMs) {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return PASSWORD_RATE_MSG.replace('{seconds}', String(seconds));
}

function canAttemptRoomPassword(ip, roomName, now = Date.now()) {
  const ipWait = getIpLimiter(ip).getRetryAfterMs(now);
  const roomWait = getIpRoomLimiter(ip, roomName).getRetryAfterMs(now);
  const retryAfterMs = Math.max(ipWait, roomWait);
  if (retryAfterMs > 0) {
    return { ok: false, retryAfterMs, message: formatRateMessage(retryAfterMs) };
  }
  return { ok: true, retryAfterMs: 0, message: '' };
}

function recordFailedRoomPassword(ip, roomName, now = Date.now()) {
  getIpLimiter(ip).tryConsume(now);
  getIpRoomLimiter(ip, roomName).tryConsume(now);
}

function prunePasswordLimiters() {
  if (ipGlobalLimiters.size > 5000) {
    ipGlobalLimiters.clear();
  }
  if (ipRoomLimiters.size > 10000) {
    ipRoomLimiters.clear();
  }
}

module.exports = {
  PER_ROOM_MAX,
  PER_ROOM_WINDOW_MS,
  PER_IP_MAX,
  PER_IP_WINDOW_MS,
  PASSWORD_RATE_MSG,
  canAttemptRoomPassword,
  recordFailedRoomPassword,
  prunePasswordLimiters,
};
