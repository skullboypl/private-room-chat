/** Sliding-window rate limiter (shared server + client). */
function createSlidingWindowRateLimiter({ max, windowMs }) {
  const timestamps = [];

  function prune(now) {
    while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
      timestamps.shift();
    }
  }

  return {
    tryConsume(now = Date.now()) {
      prune(now);
      if (timestamps.length >= max) {
        const retryAfterMs = Math.max(0, windowMs - (now - timestamps[0]));
        return { ok: false, retryAfterMs };
      }
      timestamps.push(now);
      return { ok: true, retryAfterMs: 0 };
    },
    getRetryAfterMs(now = Date.now()) {
      prune(now);
      if (timestamps.length < max) return 0;
      return Math.max(0, windowMs - (now - timestamps[0]));
    },
  };
}

module.exports = { createSlidingWindowRateLimiter };
