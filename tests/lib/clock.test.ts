import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatClock,
  msUntilNextMinute,
  subscribeToMinute,
  VISIBILITY_CHANGE_EVENT,
} from "@/lib/clock";

// Local-time constructor, so the expected text does not depend on the machine's time zone.
function at(hours: number, minutes: number, seconds = 0, ms = 0): Date {
  return new Date(2026, 9, 8, hours, minutes, seconds, ms);
}

describe("VISIBILITY_CHANGE_EVENT", () => {
  it('is exactly "visibilitychange"', () => {
    expect(VISIBILITY_CHANGE_EVENT).toBe("visibilitychange");
  });
});

describe("formatClock", () => {
  it.each([
    [at(14, 5), "14:05"],
    [at(9, 5), "9:05"],
    [at(0, 0), "0:00"],
    [at(12, 0), "12:00"],
  ])("es uses 24 h without a leading zero: %s -> %s (RF-13)", (date, text) => {
    expect(formatClock(date, "es")).toBe(text);
  });

  it("es never shows 24:00 at midnight", () => {
    expect(formatClock(at(0, 0), "es")).not.toContain("24");
  });

  it.each([
    [at(14, 5), "2:05 PM"],
    [at(9, 5), "9:05 AM"],
    [at(0, 0), "12:00 AM"],
    [at(12, 0), "12:00 PM"],
  ])("en uses US 12 h with AM/PM: %s -> %s (RF-13)", (date, text) => {
    expect(formatClock(date, "en")).toBe(text);
  });

  it("en separates AM/PM with a plain space, not U+202F", () => {
    const text = formatClock(at(14, 5), "en");
    expect(text).not.toMatch(/[  ]/);
    expect(text.split(" ")).toEqual(["2:05", "PM"]);
  });

  it("ignores seconds", () => {
    expect(formatClock(at(14, 5, 59, 999), "es")).toBe("14:05");
  });
});

describe("msUntilNextMinute", () => {
  it("is 60000 at the start of a minute", () => {
    expect(msUntilNextMinute(at(14, 5))).toBe(60000);
  });

  it("is 30000 at the middle of a minute", () => {
    expect(msUntilNextMinute(at(14, 5, 30))).toBe(30000);
  });

  it("is 1 at the last millisecond of a minute", () => {
    expect(msUntilNextMinute(at(14, 5, 59, 999))).toBe(1);
  });
});

describe("subscribeToMinute", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const halfMinute = (): Date => at(14, 5, 30);

  it("does not call before the minute changes", () => {
    const onChange = vi.fn();
    subscribeToMinute(onChange, new EventTarget(), halfMinute);
    vi.advanceTimersByTime(29999);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls when the minute changes and schedules the next one (RF-13)", () => {
    const onChange = vi.fn();
    subscribeToMinute(onChange, new EventTarget(), halfMinute);
    vi.advanceTimersByTime(30000);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(30000);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("follows the system clock to every minute boundary", () => {
    vi.setSystemTime(at(14, 5, 45));
    const onChange = vi.fn();
    subscribeToMinute(onChange, new EventTarget(), () => new Date());
    vi.advanceTimersByTime(15000);
    expect(onChange).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(59999);
    expect(onChange).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("calls on visibilitychange and leaves a single timer (RF-13)", () => {
    const onChange = vi.fn();
    const visibility = new EventTarget();
    subscribeToMinute(onChange, visibility, halfMinute);
    visibility.dispatchEvent(new Event(VISIBILITY_CHANGE_EVENT));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(30000);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("stops calling after unsubscribing, by time or by the event", () => {
    const onChange = vi.fn();
    const visibility = new EventTarget();
    const unsubscribe = subscribeToMinute(onChange, visibility, halfMinute);
    unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(120000);
    visibility.dispatchEvent(new Event(VISIBILITY_CHANGE_EVENT));
    expect(onChange).not.toHaveBeenCalled();
  });
});
