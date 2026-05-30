import { createSlidingWindowRateLimiter } from './slidingWindowRateLimit.cjs';

export const NICKNAME_RANDOMIZE_MAX = 5;
export const NICKNAME_RANDOMIZE_WINDOW_MS = 10_000;

export function createNicknameRandomizeLimiter() {
  return createSlidingWindowRateLimiter({
    max: NICKNAME_RANDOMIZE_MAX,
    windowMs: NICKNAME_RANDOMIZE_WINDOW_MS,
  });
}
