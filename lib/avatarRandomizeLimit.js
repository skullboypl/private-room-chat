import { createSlidingWindowRateLimiter } from './slidingWindowRateLimit.cjs';

export const AVATAR_RANDOMIZE_MAX = 5;
export const AVATAR_RANDOMIZE_WINDOW_MS = 10_000;

/** Sliding window: max 5 rolls per 10 seconds. */
export function createAvatarRandomizeLimiter() {
  return createSlidingWindowRateLimiter({
    max: AVATAR_RANDOMIZE_MAX,
    windowMs: AVATAR_RANDOMIZE_WINDOW_MS,
  });
}
