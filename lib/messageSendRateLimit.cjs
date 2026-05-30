const { createSlidingWindowRateLimiter } = require('./slidingWindowRateLimit.cjs');

/** Max messages per socket in the sliding window. */
const MESSAGE_SEND_MAX_PER_SOCKET = 20;
/** Max messages per IP across all sockets (anti-flood). */
const MESSAGE_SEND_MAX_PER_IP = 40;
const MESSAGE_SEND_WINDOW_MS = 10_000;

const MESSAGE_SEND_RATE_MSG = 'Zbyt wiele wiadomości. Spróbuj ponownie za chwilę.';

function createMessageSendLimiter(max = MESSAGE_SEND_MAX_PER_SOCKET) {
  return createSlidingWindowRateLimiter({ max, windowMs: MESSAGE_SEND_WINDOW_MS });
}

module.exports = {
  MESSAGE_SEND_MAX_PER_SOCKET,
  MESSAGE_SEND_MAX_PER_IP,
  MESSAGE_SEND_WINDOW_MS,
  MESSAGE_SEND_RATE_MSG,
  createMessageSendLimiter,
};
