import { describe, expect, it } from "vitest";
import * as geometry from "@/lib/window-geometry";
import {
  CASCADE_OFFSET,
  DEFAULT_WINDOW_SIZE,
  FLOATING_MIN_SIZE,
  LAYOUT_MODE,
  MIN_WINDOW_HEIGHT,
  TITLE_BAR_HEIGHT,
  WINDOW_GAP,
  fitRect,
  initialRect,
  layoutMode,
  occupiedBottom,
  windowFrame,
  type Rect,
  type Size,
} from "@/lib/window-geometry";

const LARGE_DESKTOP: Size = { width: 1280, height: 760 };
// Title plus one row of icons at 1280×800 (plan, section 6, "Posición inicial (T16)").
const ONE_ROW_BOTTOM = 186;
// Title plus two rows of icons at 800×600.
const TWO_ROWS_DESKTOP: Size = { width: 800, height: 560 };
const TWO_ROWS_BOTTOM = 284;

describe("constants", () => {
  it("keeps the layout modes as their own names", () => {
    expect(LAYOUT_MODE).toEqual({
      floating: "floating",
      fullscreen: "fullscreen",
    });
  });

  it("uses 640×500 as the smallest floating desktop", () => {
    expect(FLOATING_MIN_SIZE).toEqual({ width: 640, height: 500 });
  });

  it("opens windows at 720×480, 16 px under the occupied zone, never under 160 px tall", () => {
    expect(DEFAULT_WINDOW_SIZE).toEqual({ width: 720, height: 480 });
    expect(WINDOW_GAP).toBe(16);
    expect(MIN_WINDOW_HEIGHT).toBe(160);
  });

  it("no longer has a fixed first position", () => {
    expect("FIRST_POSITION" in geometry).toBe(false);
  });

  it("cascades by at least the title bar height, so both bars show", () => {
    expect(TITLE_BAR_HEIGHT).toBe(32);
    expect(CASCADE_OFFSET).toBe(32);
    expect(CASCADE_OFFSET).toBeGreaterThanOrEqual(TITLE_BAR_HEIGHT);
  });

  it("keeps the minimum height above the title bar and below the floating desktop", () => {
    expect(MIN_WINDOW_HEIGHT).toBeGreaterThan(TITLE_BAR_HEIGHT);
    expect(MIN_WINDOW_HEIGHT).toBeLessThan(FLOATING_MIN_SIZE.height);
  });
});

describe("layoutMode", () => {
  it("is floating at exactly 640×500", () => {
    expect(layoutMode({ width: 640, height: 500 })).toBe(LAYOUT_MODE.floating);
  });

  it("is floating on a large desktop", () => {
    expect(layoutMode(LARGE_DESKTOP)).toBe(LAYOUT_MODE.floating);
  });

  it("is fullscreen one pixel narrower than 640", () => {
    expect(layoutMode({ width: 639, height: 500 })).toBe(
      LAYOUT_MODE.fullscreen,
    );
  });

  it("is fullscreen one pixel shorter than 500", () => {
    expect(layoutMode({ width: 640, height: 499 })).toBe(
      LAYOUT_MODE.fullscreen,
    );
  });

  it("is fullscreen on a portrait phone", () => {
    expect(layoutMode({ width: 360, height: 740 })).toBe(
      LAYOUT_MODE.fullscreen,
    );
  });

  it("is fullscreen on a landscape phone, even though it is wide", () => {
    expect(layoutMode({ width: 740, height: 360 })).toBe(
      LAYOUT_MODE.fullscreen,
    );
  });
});

describe("occupiedBottom", () => {
  it("is 0 without elements", () => {
    expect(occupiedBottom([], 40)).toBe(0);
  });

  it("is the lowest bottom edge minus the top of the desktop", () => {
    expect(occupiedBottom([150, 226, 180], 40)).toBe(186);
  });

  it("rounds up, so a fraction of a pixel is never covered", () => {
    expect(occupiedBottom([226.4], 40)).toBe(187);
    expect(occupiedBottom([100, 250.01], 40.5)).toBe(210);
  });

  it("is 0 when every element is above the desktop", () => {
    expect(occupiedBottom([10, 20], 40)).toBe(0);
    expect(occupiedBottom([-30], 0)).toBe(0);
  });
});

describe("initialRect", () => {
  it("centers the first window horizontally, 16 px under the occupied zone", () => {
    expect(initialRect(null, LARGE_DESKTOP, ONE_ROW_BOTTOM)).toEqual({
      x: 280,
      y: 202,
      width: 720,
      height: 480,
    });
  });

  it("starts 16 px from the top when nothing is occupied", () => {
    expect(initialRect(null, LARGE_DESKTOP, 0)).toEqual({
      x: 280,
      y: 16,
      width: 720,
      height: 480,
    });
  });

  it("cascades 32 px down and right from the previous origin", () => {
    expect(
      initialRect({ x: 280, y: 202 }, LARGE_DESKTOP, ONE_ROW_BOTTOM),
    ).toEqual({ x: 312, y: 234, width: 720, height: 480 });
  });

  it("keeps cascading with the default size while it fits completely", () => {
    expect(
      initialRect({ x: 312, y: 234 }, LARGE_DESKTOP, ONE_ROW_BOTTOM),
    ).toEqual({ x: 344, y: 266, width: 720, height: 480 });
  });

  it("keeps the default size when the window ends exactly on the bottom edge", () => {
    // 280 + 480 = 760.
    expect(
      initialRect({ x: 344, y: 248 }, LARGE_DESKTOP, ONE_ROW_BOTTOM),
    ).toEqual({ x: 376, y: 280, width: 720, height: 480 });
  });

  it("shrinks the later cascades in height before going back (D1, option A)", () => {
    const heights: number[] = [];
    let previous: Rect | null = null;
    for (let step = 0; step < 6; step += 1) {
      const rect = initialRect(previous, LARGE_DESKTOP, ONE_ROW_BOTTOM);
      heights.push(rect.height);
      previous = rect;
    }
    expect(heights).toEqual([480, 480, 480, 462, 430, 398]);
  });

  it("cascades with exactly the minimum height left", () => {
    // 600 + 160 = 760.
    expect(
      initialRect({ x: 300, y: 568 }, LARGE_DESKTOP, ONE_ROW_BOTTOM),
    ).toEqual({ x: 332, y: 600, width: 720, height: MIN_WINDOW_HEIGHT });
  });

  it("goes back to the first position when the cascade leaves less than the minimum height", () => {
    expect(
      initialRect({ x: 300, y: 569 }, LARGE_DESKTOP, ONE_ROW_BOTTOM),
    ).toEqual({ x: 280, y: 202, width: 720, height: 480 });
  });

  it("goes back to the first position when the cascade overflows the right", () => {
    const wideOnlyDesktop: Size = { width: 800, height: 2000 };
    expect(initialRect({ x: 64, y: 64 }, wideOnlyDesktop, 0)).toEqual({
      x: 40,
      y: 16,
      width: 720,
      height: 480,
    });
  });

  it("cascades when the window ends exactly on the right edge", () => {
    expect(
      initialRect({ x: 48, y: 48 }, { width: 800, height: 560 }, 0),
    ).toEqual({ x: 80, y: 80, width: 720, height: 480 });
  });

  it("restarts when the cascade is one pixel too wide, and shrinks when one pixel too tall", () => {
    // The first position is centered: (799 − 720) / 2 = 39.5 rounds to 40.
    expect(
      initialRect({ x: 48, y: 48 }, { width: 799, height: 560 }, 0),
    ).toEqual({ x: 40, y: 16, width: 720, height: 480 });
    expect(
      initialRect({ x: 48, y: 48 }, { width: 800, height: 559 }, 0),
    ).toEqual({ x: 80, y: 80, width: 720, height: 479 });
  });

  it("goes back to the first position when the cascade would be above it", () => {
    // The zone grew after the previous window opened (more icon rows).
    expect(
      initialRect({ x: 280, y: 100 }, LARGE_DESKTOP, ONE_ROW_BOTTOM),
    ).toEqual({ x: 280, y: 202, width: 720, height: 480 });
  });

  it("shrinks the first window in height under two rows of icons", () => {
    expect(initialRect(null, TWO_ROWS_DESKTOP, TWO_ROWS_BOTTOM)).toEqual({
      x: 40,
      y: 300,
      width: 720,
      height: 260,
    });
  });

  it("shrinks the cascaded window further and restarts when it no longer fits the width", () => {
    const second = initialRect(
      { x: 40, y: 300 },
      TWO_ROWS_DESKTOP,
      TWO_ROWS_BOTTOM,
    );
    expect(second).toEqual({ x: 72, y: 332, width: 720, height: 228 });
    expect(initialRect(second, TWO_ROWS_DESKTOP, TWO_ROWS_BOTTOM)).toEqual({
      x: 40,
      y: 300,
      width: 720,
      height: 260,
    });
  });

  it("opens with exactly the minimum height when that is all that is left", () => {
    // 584 + 16 = 600 and 760 − 600 = 160.
    expect(initialRect(null, LARGE_DESKTOP, 584)).toEqual({
      x: 280,
      y: 600,
      width: 720,
      height: MIN_WINDOW_HEIGHT,
    });
  });

  it("overlaps the zone as little as possible when not even the minimum height fits", () => {
    const lowest: Rect = {
      x: 280,
      y: LARGE_DESKTOP.height - MIN_WINDOW_HEIGHT,
      width: 720,
      height: MIN_WINDOW_HEIGHT,
    };
    expect(initialRect(null, LARGE_DESKTOP, 585)).toEqual(lowest);
    expect(initialRect(null, LARGE_DESKTOP, 700)).toEqual(lowest);
    // A cascade below that position cannot keep the minimum height either.
    expect(initialRect(lowest, LARGE_DESKTOP, 700)).toEqual(lowest);
  });

  it("accepts an occupied zone taller than the desktop", () => {
    expect(initialRect(null, LARGE_DESKTOP, 2000)).toEqual({
      x: 280,
      y: 600,
      width: 720,
      height: MIN_WINDOW_HEIGHT,
    });
  });

  it("accepts a negative occupied zone without leaving the desktop", () => {
    expect(initialRect(null, LARGE_DESKTOP, -10)).toEqual({
      x: 280,
      y: 6,
      width: 720,
      height: 480,
    });
    expect(initialRect(null, LARGE_DESKTOP, -100)).toEqual({
      x: 280,
      y: 0,
      width: 720,
      height: 480,
    });
  });

  it("narrows the window to keep a 16 px side margin on a small desktop", () => {
    expect(initialRect(null, { width: 640, height: 500 }, 0)).toEqual({
      x: 16,
      y: 16,
      width: 608,
      height: 480,
    });
  });

  it("restarts at the first position when a narrowed window cannot cascade", () => {
    expect(
      initialRect({ x: 16, y: 16 }, { width: 640, height: 500 }, 0),
    ).toEqual({ x: 16, y: 16, width: 608, height: 480 });
  });

  it("always returns a rect inside the desktop, at least 160 px tall, with the title bar visible", () => {
    const desktops: readonly Size[] = [
      { width: 640, height: 500 },
      { width: 700, height: 520 },
      TWO_ROWS_DESKTOP,
      LARGE_DESKTOP,
      { width: 2560, height: 1400 },
    ];
    const zones = [-50, 0, 186, 284, 340, 341, 500, 5000];
    for (const desktop of desktops) {
      for (const occupied of zones) {
        let previous: Rect | null = null;
        for (let step = 0; step < 40; step += 1) {
          const rect = initialRect(previous, desktop, occupied);
          expect(rect.x).toBeGreaterThanOrEqual(0);
          expect(rect.y).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.width).toBeLessThanOrEqual(desktop.width);
          expect(rect.y + rect.height).toBeLessThanOrEqual(desktop.height);
          expect(rect.height).toBeGreaterThanOrEqual(MIN_WINDOW_HEIGHT);
          expect(rect.y + TITLE_BAR_HEIGHT).toBeLessThanOrEqual(desktop.height);
          previous = rect;
        }
      }
    }
  });

  it("never covers the occupied zone while the minimum height fits under it", () => {
    for (const occupied of [0, 186, 284, 384]) {
      let previous: Rect | null = null;
      for (let step = 0; step < 12; step += 1) {
        const rect = initialRect(previous, TWO_ROWS_DESKTOP, occupied);
        expect(rect.y).toBeGreaterThanOrEqual(occupied + WINDOW_GAP);
        previous = rect;
      }
    }
  });
});

describe("fitRect", () => {
  const inside: Rect = { x: 100, y: 120, width: 720, height: 480 };

  it("leaves a rect that is already inside unchanged", () => {
    expect(fitRect(inside, LARGE_DESKTOP)).toEqual(inside);
  });

  it("moves a rect past the left edge back to x = 0", () => {
    expect(fitRect({ ...inside, x: -50 }, LARGE_DESKTOP)).toEqual({
      ...inside,
      x: 0,
    });
  });

  it("moves a rect past the top edge back to y = 0", () => {
    expect(fitRect({ ...inside, y: -50 }, LARGE_DESKTOP)).toEqual({
      ...inside,
      y: 0,
    });
  });

  it("stops at the right edge with the whole width visible", () => {
    expect(fitRect({ ...inside, x: 900 }, LARGE_DESKTOP)).toEqual({
      ...inside,
      x: 1280 - 720,
    });
  });

  it("lets the body go below the desktop but keeps the title bar visible", () => {
    expect(fitRect({ ...inside, y: 500 }, LARGE_DESKTOP)).toEqual({
      ...inside,
      y: 500,
    });
    expect(fitRect({ ...inside, y: 2000 }, LARGE_DESKTOP)).toEqual({
      ...inside,
      y: 760 - TITLE_BAR_HEIGHT,
    });
  });

  it("allows the title bar to end exactly on the bottom edge", () => {
    expect(fitRect({ ...inside, y: 728 }, LARGE_DESKTOP)).toEqual({
      ...inside,
      y: 728,
    });
    expect(fitRect({ ...inside, y: 729 }, LARGE_DESKTOP)).toEqual({
      ...inside,
      y: 728,
    });
  });

  it("shrinks a rect larger than the desktop and keeps it inside", () => {
    const desktop: Size = { width: 640, height: 500 };
    expect(
      fitRect({ x: 300, y: 200, width: 720, height: 600 }, desktop),
    ).toEqual({ x: 0, y: 200, width: 640, height: 500 });
  });

  it("never shrinks a rect that already fits in size", () => {
    const desktop: Size = { width: 640, height: 500 };
    expect(
      fitRect({ x: 600, y: 10, width: 400, height: 300 }, desktop),
    ).toEqual({ x: 240, y: 10, width: 400, height: 300 });
  });

  it("keeps the whole title bar inside after any drag", () => {
    const desktop: Size = { width: 700, height: 520 };
    const targets = [-5000, -1, 0, 37, 400, 5000];
    for (const x of targets) {
      for (const y of targets) {
        const rect = fitRect({ x, y, width: 720, height: 480 }, desktop);
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(desktop.width);
        expect(rect.y + TITLE_BAR_HEIGHT).toBeLessThanOrEqual(desktop.height);
      }
    }
  });

  it("does not mutate the rect it receives", () => {
    const rect: Rect = { x: -50, y: -50, width: 2000, height: 2000 };
    const copy = { ...rect };
    fitRect(rect, LARGE_DESKTOP);
    expect(rect).toEqual(copy);
  });
});

describe("windowFrame", () => {
  const rect: Rect = { x: 48, y: 48, width: 720, height: 480 };
  const fullDesktop: Rect = { x: 0, y: 0, width: 1280, height: 760 };

  it("is the floating rect for a normal floating window", () => {
    expect(
      windowFrame(rect, false, LAYOUT_MODE.floating, LARGE_DESKTOP),
    ).toEqual(rect);
  });

  it("covers the whole desktop when maximized", () => {
    expect(
      windowFrame(rect, true, LAYOUT_MODE.floating, LARGE_DESKTOP),
    ).toEqual(fullDesktop);
  });

  it("covers the whole desktop in fullscreen mode", () => {
    const phone: Size = { width: 360, height: 700 };
    expect(windowFrame(rect, false, LAYOUT_MODE.fullscreen, phone)).toEqual({
      x: 0,
      y: 0,
      width: 360,
      height: 700,
    });
  });

  it("covers the whole desktop when maximized in fullscreen mode", () => {
    const phone: Size = { width: 360, height: 300 };
    expect(windowFrame(rect, true, LAYOUT_MODE.fullscreen, phone)).toEqual({
      x: 0,
      y: 0,
      width: 360,
      height: 300,
    });
  });

  it("covers the whole desktop when the window never had a floating rect", () => {
    expect(
      windowFrame(null, false, LAYOUT_MODE.floating, LARGE_DESKTOP),
    ).toEqual(fullDesktop);
    expect(
      windowFrame(null, false, LAYOUT_MODE.fullscreen, LARGE_DESKTOP),
    ).toEqual(fullDesktop);
  });

  it("does not change the floating rect it receives", () => {
    const copy = { ...rect };
    windowFrame(rect, true, LAYOUT_MODE.fullscreen, LARGE_DESKTOP);
    expect(rect).toEqual(copy);
  });
});
