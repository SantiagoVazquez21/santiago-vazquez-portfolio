import { describe, expect, it } from "vitest";
import {
  CONTACT_LIMIT,
  clientKey,
  createRateLimiter,
  tryConsume,
} from "@/lib/rate-limit";

const MINUTE = 60_000;
const START = 1_000_000;
// Mirrors the internal cap of the plan (D10): more keys than this trims the oldest.
const MAX_KEYS = 1000;

function consumeTimes(
  limiter: ReturnType<typeof createRateLimiter>,
  key: string,
  times: number,
  now: number,
): boolean[] {
  return Array.from({ length: times }, () => tryConsume(limiter, key, now));
}

describe("CONTACT_LIMIT", () => {
  it("allows 5 attempts every 10 minutes (RF-11)", () => {
    expect(CONTACT_LIMIT).toEqual({ max: 5, windowMs: 10 * MINUTE });
  });
});

describe("createRateLimiter", () => {
  it("starts with no attempts", () => {
    expect(createRateLimiter().attempts.size).toBe(0);
  });

  it("gives each limiter its own memory", () => {
    const first = createRateLimiter();
    const second = createRateLimiter();
    tryConsume(first, "1.1.1.1", START);
    expect(second.attempts.size).toBe(0);
  });
});

describe("tryConsume", () => {
  it("allows 5 attempts and rejects the 6th", () => {
    const limiter = createRateLimiter();
    expect(consumeTimes(limiter, "1.1.1.1", 5, START)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(tryConsume(limiter, "1.1.1.1", START + MINUTE)).toBe(false);
  });

  it("allows again 10 minutes after the first attempt", () => {
    const limiter = createRateLimiter();
    tryConsume(limiter, "1.1.1.1", START);
    consumeTimes(limiter, "1.1.1.1", 4, START + MINUTE);
    expect(tryConsume(limiter, "1.1.1.1", START + 10 * MINUTE - 1)).toBe(false);
    expect(tryConsume(limiter, "1.1.1.1", START + 10 * MINUTE)).toBe(true);
    // Only the first attempt expired: the other four still fill the window.
    expect(tryConsume(limiter, "1.1.1.1", START + 10 * MINUTE)).toBe(false);
  });

  it("keeps different keys apart", () => {
    const limiter = createRateLimiter();
    consumeTimes(limiter, "1.1.1.1", 5, START);
    expect(tryConsume(limiter, "1.1.1.1", START)).toBe(false);
    expect(tryConsume(limiter, "2.2.2.2", START)).toBe(true);
    expect(limiter.attempts.get("2.2.2.2")).toEqual([START]);
  });

  it("does not record a rejected attempt", () => {
    const limiter = createRateLimiter();
    consumeTimes(limiter, "1.1.1.1", 5, START);
    tryConsume(limiter, "1.1.1.1", START + MINUTE);
    tryConsume(limiter, "1.1.1.1", START + 2 * MINUTE);
    expect(limiter.attempts.get("1.1.1.1")).toEqual(Array(5).fill(START));
    // Had the rejections counted, the window would still be full here.
    expect(tryConsume(limiter, "1.1.1.1", START + 10 * MINUTE)).toBe(true);
  });

  it("counts attempts from a clock that went backwards as recent", () => {
    const limiter = createRateLimiter();
    consumeTimes(limiter, "1.1.1.1", 5, START + 5 * MINUTE);
    expect(tryConsume(limiter, "1.1.1.1", START)).toBe(false);
    expect(limiter.attempts.get("1.1.1.1")).toHaveLength(5);
  });

  it("drops a key whose attempts expired when another key arrives (RF-12)", () => {
    const limiter = createRateLimiter();
    tryConsume(limiter, "1.1.1.1", START);
    tryConsume(limiter, "2.2.2.2", START + 9 * MINUTE);
    tryConsume(limiter, "3.3.3.3", START + 10 * MINUTE);
    expect(limiter.attempts.has("1.1.1.1")).toBe(false);
    expect(limiter.attempts.get("2.2.2.2")).toEqual([START + 9 * MINUTE]);
    expect(limiter.attempts.get("3.3.3.3")).toEqual([START + 10 * MINUTE]);
  });

  it("drops only the expired moments of a key that keeps recent ones", () => {
    const limiter = createRateLimiter();
    tryConsume(limiter, "1.1.1.1", START);
    tryConsume(limiter, "1.1.1.1", START + 5 * MINUTE);
    tryConsume(limiter, "2.2.2.2", START + 10 * MINUTE);
    expect(limiter.attempts.get("1.1.1.1")).toEqual([START + 5 * MINUTE]);
  });

  it("sweeps expired keys even when the attempt is rejected", () => {
    const limiter = createRateLimiter();
    tryConsume(limiter, "1.1.1.1", START);
    consumeTimes(limiter, "2.2.2.2", 5, START + 9 * MINUTE);
    expect(tryConsume(limiter, "2.2.2.2", START + 10 * MINUTE)).toBe(false);
    expect(limiter.attempts.has("1.1.1.1")).toBe(false);
  });

  it(`keeps at most ${MAX_KEYS} keys, dropping the oldest`, () => {
    const limiter = createRateLimiter();
    for (let index = 0; index <= MAX_KEYS; index += 1) {
      expect(tryConsume(limiter, `key-${index}`, START + index)).toBe(true);
    }
    expect(limiter.attempts.size).toBe(MAX_KEYS);
    expect(limiter.attempts.has("key-0")).toBe(false);
    expect(limiter.attempts.has("key-1")).toBe(true);
    expect(limiter.attempts.has(`key-${MAX_KEYS}`)).toBe(true);
  });

  it("accepts a custom limit", () => {
    const limiter = createRateLimiter();
    const limit = { max: 1, windowMs: MINUTE };
    expect(tryConsume(limiter, "1.1.1.1", START, limit)).toBe(true);
    expect(tryConsume(limiter, "1.1.1.1", START, limit)).toBe(false);
    expect(tryConsume(limiter, "1.1.1.1", START + MINUTE, limit)).toBe(true);
  });
});

describe("clientKey", () => {
  it("takes the first address of x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.7 , 10.0.0.1, 10.0.0.2",
      "x-real-ip": "198.51.100.9",
    });
    expect(clientKey(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": " 198.51.100.9 " });
    expect(clientKey(headers)).toBe("198.51.100.9");
  });

  it("falls back to x-real-ip when x-forwarded-for is blank", () => {
    const headers = new Headers({
      "x-forwarded-for": " , 10.0.0.1",
      "x-real-ip": "198.51.100.9",
    });
    expect(clientKey(headers)).toBe("198.51.100.9");
  });

  it("uses a shared key without address headers", () => {
    expect(clientKey(new Headers())).toBe("unknown");
  });
});
