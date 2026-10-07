import { describe, expect, it } from "vitest";
import { MANUAL_SCROLL_RESTORATION } from "@/lib/scroll";

describe("MANUAL_SCROLL_RESTORATION", () => {
  it('is exactly "manual"', () => {
    expect(MANUAL_SCROLL_RESTORATION).toBe("manual");
  });
});
