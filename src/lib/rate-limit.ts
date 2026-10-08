// Best-effort and per server instance: in serverless each instance has its own
// memory, so the real limit can be higher (plan 005, section 8, D4).
export const CONTACT_LIMIT = { max: 5, windowMs: 10 * 60_000 } as const;

export type RateLimit = { max: number; windowMs: number };
export type RateLimiter = { attempts: Map<string, number[]> };

// Bounds memory if many addresses arrive inside one window.
const MAX_KEYS = 1000;
const UNKNOWN_CLIENT = "unknown";

export function createRateLimiter(): RateLimiter {
  return { attempts: new Map() };
}

// Every key, not just the one asked about: no moment may outlive the window
// past the next request the server receives (RF-12, D10).
function sweep(limiter: RateLimiter, now: number, windowMs: number): void {
  for (const [key, moments] of limiter.attempts) {
    // A moment ahead of now (clock moved back) gives a negative age and stays.
    const recent = moments.filter((moment) => now - moment < windowMs);
    if (recent.length === 0) {
      limiter.attempts.delete(key);
    } else {
      limiter.attempts.set(key, recent);
    }
  }
}

function trimOldestKeys(limiter: RateLimiter): void {
  for (const key of limiter.attempts.keys()) {
    if (limiter.attempts.size <= MAX_KEYS) {
      return;
    }
    limiter.attempts.delete(key);
  }
}

export function tryConsume(
  limiter: RateLimiter,
  key: string,
  now: number,
  limit: RateLimit = CONTACT_LIMIT,
): boolean {
  sweep(limiter, now, limit.windowMs);
  const moments = limiter.attempts.get(key) ?? [];
  if (moments.length >= limit.max) {
    return false;
  }
  limiter.attempts.set(key, [...moments, now]);
  trimOldestKeys(limiter);
  return true;
}

function firstValue(value: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}

// The address is only a map key in memory; it is never stored or logged (RF-12).
export function clientKey(headers: Headers): string {
  return (
    firstValue(headers.get("x-forwarded-for")) ||
    firstValue(headers.get("x-real-ip")) ||
    UNKNOWN_CLIENT
  );
}
