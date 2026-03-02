import { logger } from '@/lib/logger';

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

// --- In-memory fallback (single-server only) ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function inMemoryRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// Cleanup old entries periodically (every 5 min)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60_000);
}

// --- Upstash Redis rate limiter ---
let upstashRateLimit: ((identifier: string, maxRequests: number, windowMs: number) => Promise<RateLimitResult>) | null = null;
let upstashInitialized = false;

async function initUpstash() {
  if (upstashInitialized) return;
  upstashInitialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.warn('Upstash Redis not configured, using in-memory rate limiter (not suitable for multi-instance)', {
      route: 'rate-limit',
    });
    return;
  }

  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');

    const redis = new Redis({ url, token });

    // Cache of Ratelimit instances by config key
    const limiters = new Map<string, InstanceType<typeof Ratelimit>>();

    upstashRateLimit = async (identifier: string, maxRequests: number, windowMs: number) => {
      const configKey = `${maxRequests}:${windowMs}`;
      let limiter = limiters.get(configKey);
      if (!limiter) {
        limiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
          prefix: 'rl',
        });
        limiters.set(configKey, limiter);
      }

      const result = await limiter.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    };
  } catch {
    logger.warn('Failed to initialize Upstash rate limiter, falling back to in-memory', {
      route: 'rate-limit',
    });
  }
}

export async function rateLimit(
  identifier: string,
  { maxRequests = 60, windowMs = 60_000 }: { maxRequests?: number; windowMs?: number } = {}
): Promise<RateLimitResult> {
  await initUpstash();

  if (upstashRateLimit) {
    try {
      return await upstashRateLimit(identifier, maxRequests, windowMs);
    } catch {
      // Fall back to in-memory on Redis errors
      return inMemoryRateLimit(identifier, maxRequests, windowMs);
    }
  }

  return inMemoryRateLimit(identifier, maxRequests, windowMs);
}
