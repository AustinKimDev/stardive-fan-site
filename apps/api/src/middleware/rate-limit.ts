import { createMiddleware } from 'hono/factory';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory LRU-like rate limiter.
 * windowMs: window in milliseconds
 * max: max requests per window
 */
function createRateLimiter(max: number, windowMs: number) {
  const store = new Map<string, RateLimitEntry>();
  const MAX_STORE = 10_000;

  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown';

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        c.header('Retry-After', String(retryAfter));
        return c.json({ error: '요청 한도 초과' }, 429);
      }
    }

    // Evict oldest entries if store grows too large (LRU-lite)
    if (store.size > MAX_STORE) {
      const firstKey = store.keys().next().value;
      if (firstKey !== undefined) {
        store.delete(firstKey);
      }
    }

    await next();
  });
}

/** 60 req/min for public endpoints */
export const publicRateLimit = createRateLimiter(60, 60_000);

/** 10 req/min for admin endpoints */
export const adminRateLimit = createRateLimiter(10, 60_000);
