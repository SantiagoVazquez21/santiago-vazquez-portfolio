import { describe, expect, it } from "vitest";
import * as geometry from "@/lib/window-geometry";
import {
  CASCADE_OFFSET,
  DEFAULT_WINDOW_SIZE,
  FLOATING_MIN_SIZE,
  LAYOUT_MODE,
  MIN_FREE_WIDTH,
  MIN_WINDOW_HEIGHT,
  TITLE_BAR_HEIGHT,
  WINDOW_GAP,
  fitRect,
  initialRect,
  farthestEdge,
  layoutMode,
  windowFrame,
  type OccupiedZone,
  type Rect,
  type Size,
} from "@/lib/window-geometry";

const LARGE_DESKTOP: Size = { width: 1280, height: 760 };
// Spec 003's height rules, checked without an icon column: the window centers on the
// whole desktop, exactly as it did when only the bottom of the zone was known.
const ONE_ROW_BOTTOM = 186;
const TWO_ROWS_DESKTOP: Size = { width: 800, height: 560 };
const TWO_ROWS_BOTTOM = 284;
function underTitle(titleBottom: number): OccupiedZone {
  return { iconsRight: 0, titleBottom };
}
// Two icons per row end at x 224 (plan 012, section 4, reference examples).
const COLUMN_RIGHT = 224;
const TITLE_BOTTOM = 84;
const COLUMN: OccupiedZone = {
  iconsRight: COLUMN_RIGHT,
  titleBottom: TITLE_BOTTOM,
};

function cascade(desktop: Size, zone: OccupiedZone, count: number): Rect[] {
  const rects: Rect[] = [];
  let previous: Rect | null = null;
  for (let step = 0; step < count; step += 1) {
    const rect = initialRect(previous, desktop, zone);
    rects.push(rect);
    previous = rect;
  }
  return rects;
}

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

  it("opens beside the column only when at least 480 px are free (spec 012, D3)", () => {
    expect(MIN_FREE_WIDTH).toBe(480);
    expect(MIN_FREE_WIDTH).toBeLessThanOrEqual(DEFAULT_WINDOW_SIZE.width);
  });

  it("replaces occupiedBottom with farthestEdge (spec 012, D6)", () => {
    expect("occupiedBottom" in geometry).toBe(false);
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

describe("farthestEdge", () => {
  it("is 0 without elements", () => {
    expect(farthestEdge([], 40)).toBe(0);
  });

  it("is the farthest edge minus the desktop's origin", () => {
    expect(farthestEdge([150, 226, 180], 40)).toBe(186);
  });

  it("rounds up, so a fraction of a pixel is never covered", () => {
    expect(farthestEdge([226.4], 40)).toBe(187);
    expect(farthestEdge([100, 250.01], 40.5)).toBe(210);
  });

  it("is 0 when every element is before the desktop's origin", () => {
    expect(farthestEdge([10, 20], 40)).toBe(0);
    expect(farthestEdge([-30], 0)).toBe(0);
  });

  it("measures the icons' right edge from the desktop's left edge as well", () => {
    // Two icons in a row: 16 + 96 + 16 + 96 = 224, on a desktop that starts at x 0.
    expect(farthestEdge([112, 224], 0)).toBe(COLUMN_RIGHT);
    expect(farthestEdge([112.2, 224.3], 0.5)).toBe(224);
  });
});

describe("initialRect", () => {
  it("centers the first window horizontally, 16 px under the occupied zone", () => {
    expect(
      initialRect(null, LARGE_DESKTOP, underTitle(ONE_ROW_BOTTOM)),
    ).toEqual({
      x: 280,
      y: 202,
      width: 720,
      height: 480,
    });
  });

  it("starts 16 px from the top when nothing is occupied", () => {
    expect(initialRect(null, LARGE_DESKTOP, underTitle(0))).toEqual({
      x: 280,
      y: 16,
      width: 720,
      height: 480,
    });
  });

  it("cascades 32 px down and right from the previous origin", () => {
    expect(
      initialRect(
        { x: 280, y: 202 },
        LARGE_DESKTOP,
        underTitle(ONE_ROW_BOTTOM),
      ),
    ).toEqual({ x: 312, y: 234, width: 720, height: 480 });
  });

  it("keeps cascading with the default size while it fits completely", () => {
    expect(
      initialRect(
        { x: 312, y: 234 },
        LARGE_DESKTOP,
        underTitle(ONE_ROW_BOTTOM),
      ),
    ).toEqual({ x: 344, y: 266, width: 720, height: 480 });
  });

  it("keeps the default size when the window ends exactly on the bottom edge", () => {
    // 280 + 480 = 760.
    expect(
      initialRect(
        { x: 344, y: 248 },
        LARGE_DESKTOP,
        underTitle(ONE_ROW_BOTTOM),
      ),
    ).toEqual({ x: 376, y: 280, width: 720, height: 480 });
  });

  it("shrinks the later cascades in height before going back (D1, option A)", () => {
    const heights: number[] = [];
    let previous: Rect | null = null;
    for (let step = 0; step < 6; step += 1) {
      const rect = initialRect(
        previous,
        LARGE_DESKTOP,
        underTitle(ONE_ROW_BOTTOM),
      );
      heights.push(rect.height);
      previous = rect;
    }
    expect(heights).toEqual([480, 480, 480, 462, 430, 398]);
  });

  it("cascades with exactly the minimum height left", () => {
    // 600 + 160 = 760.
    expect(
      initialRect(
        { x: 300, y: 568 },
        LARGE_DESKTOP,
        underTitle(ONE_ROW_BOTTOM),
      ),
    ).toEqual({ x: 332, y: 600, width: 720, height: MIN_WINDOW_HEIGHT });
  });

  it("goes back to the first position when the cascade leaves less than the minimum height", () => {
    expect(
      initialRect(
        { x: 300, y: 569 },
        LARGE_DESKTOP,
        underTitle(ONE_ROW_BOTTOM),
      ),
    ).toEqual({ x: 280, y: 202, width: 720, height: 480 });
  });

  it("goes back to the first position when the cascade overflows the right", () => {
    const wideOnlyDesktop: Size = { width: 800, height: 2000 };
    expect(
      initialRect({ x: 64, y: 64 }, wideOnlyDesktop, underTitle(0)),
    ).toEqual({
      x: 40,
      y: 16,
      width: 720,
      height: 480,
    });
  });

  it("cascades when the window ends exactly on the right edge", () => {
    expect(
      initialRect({ x: 48, y: 48 }, { width: 800, height: 560 }, underTitle(0)),
    ).toEqual({ x: 80, y: 80, width: 720, height: 480 });
  });

  it("restarts when the cascade is one pixel too wide, and shrinks when one pixel too tall", () => {
    // The first position is centered: (799 − 720) / 2 = 39.5 rounds to 40.
    expect(
      initialRect({ x: 48, y: 48 }, { width: 799, height: 560 }, underTitle(0)),
    ).toEqual({ x: 40, y: 16, width: 720, height: 480 });
    expect(
      initialRect({ x: 48, y: 48 }, { width: 800, height: 559 }, underTitle(0)),
    ).toEqual({ x: 80, y: 80, width: 720, height: 479 });
  });

  it("goes back to the first position when the cascade would be above it", () => {
    // The zone grew after the previous window opened (more icon rows).
    expect(
      initialRect(
        { x: 280, y: 100 },
        LARGE_DESKTOP,
        underTitle(ONE_ROW_BOTTOM),
      ),
    ).toEqual({ x: 280, y: 202, width: 720, height: 480 });
  });

  it("shrinks the first window in height under two rows of icons", () => {
    expect(
      initialRect(null, TWO_ROWS_DESKTOP, underTitle(TWO_ROWS_BOTTOM)),
    ).toEqual({
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
      underTitle(TWO_ROWS_BOTTOM),
    );
    expect(second).toEqual({ x: 72, y: 332, width: 720, height: 228 });
    expect(
      initialRect(second, TWO_ROWS_DESKTOP, underTitle(TWO_ROWS_BOTTOM)),
    ).toEqual({
      x: 40,
      y: 300,
      width: 720,
      height: 260,
    });
  });

  it("opens with exactly the minimum height when that is all that is left", () => {
    // 584 + 16 = 600 and 760 − 600 = 160.
    expect(initialRect(null, LARGE_DESKTOP, underTitle(584))).toEqual({
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
    expect(initialRect(null, LARGE_DESKTOP, underTitle(585))).toEqual(lowest);
    expect(initialRect(null, LARGE_DESKTOP, underTitle(700))).toEqual(lowest);
    // A cascade below that position cannot keep the minimum height either.
    expect(initialRect(lowest, LARGE_DESKTOP, underTitle(700))).toEqual(lowest);
  });

  it("accepts an occupied zone taller than the desktop", () => {
    expect(initialRect(null, LARGE_DESKTOP, underTitle(2000))).toEqual({
      x: 280,
      y: 600,
      width: 720,
      height: MIN_WINDOW_HEIGHT,
    });
  });

  it("accepts a negative occupied zone without leaving the desktop", () => {
    expect(initialRect(null, LARGE_DESKTOP, underTitle(-10))).toEqual({
      x: 280,
      y: 6,
      width: 720,
      height: 480,
    });
    expect(initialRect(null, LARGE_DESKTOP, underTitle(-100))).toEqual({
      x: 280,
      y: 0,
      width: 720,
      height: 480,
    });
  });

  it("narrows the window to keep a 16 px side margin on a small desktop", () => {
    expect(
      initialRect(null, { width: 640, height: 500 }, underTitle(0)),
    ).toEqual({
      x: 16,
      y: 16,
      width: 608,
      height: 480,
    });
  });

  it("restarts at the first position when a narrowed window cannot cascade", () => {
    expect(
      initialRect({ x: 16, y: 16 }, { width: 640, height: 500 }, underTitle(0)),
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
          const rect = initialRect(previous, desktop, underTitle(occupied));
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
        const rect = initialRect(
          previous,
          TWO_ROWS_DESKTOP,
          underTitle(occupied),
        );
        expect(rect.y).toBeGreaterThanOrEqual(occupied + WINDOW_GAP);
        previous = rect;
      }
    }
  });
});

describe("initialRect beside the icon column (spec 012)", () => {
  it("opens the first window right of the column, centered in the free space, under the title (RF-5)", () => {
    // freeLeft 240, freeWidth 1024: 240 + (1024 − 720) / 2 = 392.
    expect(initialRect(null, LARGE_DESKTOP, COLUMN)).toEqual({
      x: 392,
      y: 100,
      width: 720,
      height: 480,
    });
  });

  it("cascades six windows at 1280×760 up to x 552, and the seventh goes back (RF-7)", () => {
    const rects = cascade(LARGE_DESKTOP, COLUMN, 7);
    expect(rects.slice(0, 6).map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 392, y: 100 },
      { x: 424, y: 132 },
      { x: 456, y: 164 },
      { x: 488, y: 196 },
      { x: 520, y: 228 },
      { x: 552, y: 260 },
    ]);
    // 584 + 720 = 1304 > 1280.
    expect(rects[6]).toEqual(rects[0]);
    expect(rects.every((rect) => rect.width === 720)).toBe(true);
  });

  it("goes back to the first position for the third window at 1024×728 (1024×768 screen)", () => {
    const desktop: Size = { width: 1024, height: 728 };
    const [first, second, third] = cascade(desktop, COLUMN, 3);
    // freeWidth 768: 240 + (768 − 720) / 2 = 264.
    expect(first).toEqual({ x: 264, y: 100, width: 720, height: 480 });
    expect(second).toEqual({ x: 296, y: 132, width: 720, height: 480 });
    // 328 + 720 = 1048 > 1024.
    expect(third).toEqual(first);
  });

  it("narrows the window to the free space at 800×520 without covering the column (RF-5)", () => {
    // freeWidth 800 − 240 − 16 = 544; height 520 − 100 = 420.
    expect(initialRect(null, { width: 800, height: 520 }, COLUMN)).toEqual({
      x: 240,
      y: 100,
      width: 544,
      height: 420,
    });
  });

  it("centers the window on the whole desktop at 640×600, over the column (RF-6)", () => {
    // freeWidth 640 − 256 = 384 < 480.
    expect(initialRect(null, { width: 640, height: 600 }, COLUMN)).toEqual({
      x: 16,
      y: 100,
      width: 608,
      height: 480,
    });
  });

  it("opens beside the column with exactly 480 px free, and over it with 479", () => {
    // 240 + 480 + 16 = 736.
    expect(initialRect(null, { width: 736, height: 600 }, COLUMN)).toEqual({
      x: 240,
      y: 100,
      width: 480,
      height: 480,
    });
    // 735 − 32 = 703; (735 − 703) / 2 = 16.
    expect(initialRect(null, { width: 735, height: 600 }, COLUMN)).toEqual({
      x: 16,
      y: 100,
      width: 703,
      height: 480,
    });
  });

  it("keeps the default width when the free space is wider and centers in it", () => {
    // freeLeft 316, freeWidth 1920 − 332 = 1588: 316 + 434 = 750.
    expect(
      initialRect(
        null,
        { width: 1920, height: 1040 },
        { iconsRight: 300, titleBottom: 60 },
      ),
    ).toEqual({ x: 750, y: 76, width: 720, height: 480 });
  });

  it("goes back to the first position when a window over the column cannot cascade", () => {
    // freeWidth 700 − 256 = 444 < 480: width 668, x 16; 48 + 668 = 716 > 700.
    const [first, second] = cascade({ width: 700, height: 600 }, COLUMN, 2);
    expect(first).toEqual({ x: 16, y: 100, width: 668, height: 480 });
    expect(second).toEqual(first);
  });

  it("goes back to the first position when the cascade leaves less than the minimum height", () => {
    // 760 − 600 = 160 still fits; 760 − 601 = 159 does not.
    expect(initialRect({ x: 400, y: 568 }, LARGE_DESKTOP, COLUMN)).toEqual({
      x: 432,
      y: 600,
      width: 720,
      height: MIN_WINDOW_HEIGHT,
    });
    expect(initialRect({ x: 400, y: 569 }, LARGE_DESKTOP, COLUMN)).toEqual({
      x: 392,
      y: 100,
      width: 720,
      height: 480,
    });
  });

  it("shrinks a cascaded window in height before going back", () => {
    expect(initialRect({ x: 400, y: 300 }, LARGE_DESKTOP, COLUMN)).toEqual({
      x: 432,
      y: 332,
      width: 720,
      height: 428,
    });
  });

  it("cascades when the window ends exactly on the right edge, and goes back one pixel past it", () => {
    // 560 + 720 = 1280 and 561 + 720 = 1281.
    expect(initialRect({ x: 528, y: 100 }, LARGE_DESKTOP, COLUMN)).toEqual({
      x: 560,
      y: 132,
      width: 720,
      height: 480,
    });
    expect(initialRect({ x: 529, y: 100 }, LARGE_DESKTOP, COLUMN)).toEqual({
      x: 392,
      y: 100,
      width: 720,
      height: 480,
    });
  });

  it("goes back to the first position when the cascade would be left of it", () => {
    // The column grew wider after the previous window opened.
    expect(initialRect({ x: 200, y: 200 }, LARGE_DESKTOP, COLUMN)).toEqual({
      x: 392,
      y: 100,
      width: 720,
      height: 480,
    });
    // Landing exactly on the first position's x still cascades.
    expect(initialRect({ x: 360, y: 200 }, LARGE_DESKTOP, COLUMN)).toEqual({
      x: 392,
      y: 232,
      width: 720,
      height: 480,
    });
  });

  it("goes back to the first position when the cascade would be above it", () => {
    // The title grew taller after the previous window opened.
    expect(initialRect({ x: 400, y: 20 }, LARGE_DESKTOP, COLUMN)).toEqual({
      x: 392,
      y: 100,
      width: 720,
      height: 480,
    });
    // Landing exactly on the first position's y still cascades.
    expect(initialRect({ x: 400, y: 68 }, LARGE_DESKTOP, COLUMN)).toEqual({
      x: 432,
      y: 100,
      width: 720,
      height: 480,
    });
  });

  it("goes back to the first position once the column leaves too little free space", () => {
    // The previous window opened beside the column; now less than 480 px are free.
    expect(
      initialRect(
        { x: 240, y: 100 },
        { width: 700, height: 600 },
        { iconsRight: 300, titleBottom: TITLE_BOTTOM },
      ),
    ).toEqual({ x: 16, y: 100, width: 668, height: 480 });
  });

  it("opens with exactly the minimum height under a tall title", () => {
    // 584 + 16 = 600 and 760 − 600 = 160.
    expect(
      initialRect(null, LARGE_DESKTOP, {
        iconsRight: COLUMN_RIGHT,
        titleBottom: 584,
      }),
    ).toEqual({ x: 392, y: 600, width: 720, height: MIN_WINDOW_HEIGHT });
  });

  it("covers as little of the title as possible when not even the minimum height fits", () => {
    const lowest: Rect = {
      x: 392,
      y: LARGE_DESKTOP.height - MIN_WINDOW_HEIGHT,
      width: 720,
      height: MIN_WINDOW_HEIGHT,
    };
    for (const titleBottom of [585, 700, 2000]) {
      const zone: OccupiedZone = { iconsRight: COLUMN_RIGHT, titleBottom };
      expect(initialRect(null, LARGE_DESKTOP, zone)).toEqual(lowest);
      expect(initialRect(lowest, LARGE_DESKTOP, zone)).toEqual(lowest);
    }
  });

  const desktops: readonly Size[] = [
    FLOATING_MIN_SIZE,
    { width: 640, height: 600 },
    { width: 735, height: 520 },
    { width: 736, height: 520 },
    { width: 800, height: 520 },
    TWO_ROWS_DESKTOP,
    { width: 1024, height: 728 },
    LARGE_DESKTOP,
    { width: 1920, height: 1040 },
    { width: 2560, height: 1400 },
  ];
  const zones: readonly OccupiedZone[] = [
    { iconsRight: 0, titleBottom: 0 },
    COLUMN,
    { iconsRight: COLUMN_RIGHT, titleBottom: 340 },
    { iconsRight: COLUMN_RIGHT, titleBottom: 5000 },
    { iconsRight: 120, titleBottom: 40 },
    { iconsRight: 400, titleBottom: TITLE_BOTTOM },
    { iconsRight: 5000, titleBottom: TITLE_BOTTOM },
  ];

  it("always returns a rect inside the desktop, at least 160 px tall, with the title bar visible", () => {
    for (const desktop of desktops) {
      for (const zone of zones) {
        for (const rect of cascade(desktop, zone, 40)) {
          expect(rect.x).toBeGreaterThanOrEqual(0);
          expect(rect.y).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.width).toBeLessThanOrEqual(desktop.width);
          expect(rect.y + rect.height).toBeLessThanOrEqual(desktop.height);
          expect(rect.height).toBeGreaterThanOrEqual(MIN_WINDOW_HEIGHT);
          expect(rect.y + TITLE_BAR_HEIGHT).toBeLessThanOrEqual(desktop.height);
        }
      }
    }
  });

  it("never covers the column when at least MIN_FREE_WIDTH is free", () => {
    let checked = 0;
    for (const desktop of desktops) {
      for (const zone of zones) {
        const freeLeft = zone.iconsRight + WINDOW_GAP;
        if (desktop.width - freeLeft - WINDOW_GAP < MIN_FREE_WIDTH) continue;
        for (const rect of cascade(desktop, zone, 40)) {
          expect(rect.x).toBeGreaterThanOrEqual(freeLeft);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("never covers the title while the minimum height fits under it", () => {
    for (const desktop of desktops) {
      for (const zone of zones) {
        const firstY = zone.titleBottom + WINDOW_GAP;
        if (desktop.height - firstY < MIN_WINDOW_HEIGHT) continue;
        for (const rect of cascade(desktop, zone, 40)) {
          expect(rect.y).toBeGreaterThanOrEqual(firstY);
        }
      }
    }
  });

  it("does not mutate the previous origin or the zone it receives", () => {
    const previous = { x: 392, y: 100 };
    const zone: OccupiedZone = { ...COLUMN };
    initialRect(previous, LARGE_DESKTOP, zone);
    expect(previous).toEqual({ x: 392, y: 100 });
    expect(zone).toEqual(COLUMN);
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

// About's two columns rely on these widths; reuse, they pass from the start (spec 010, T2).
describe("minimum floating width (spec 010)", () => {
  it("floats at exactly 640 × 500 and goes fullscreen when either side is short", () => {
    expect(layoutMode({ width: 640, height: 500 })).toBe(LAYOUT_MODE.floating);
    expect(layoutMode({ width: 1280, height: 480 })).toBe(
      LAYOUT_MODE.fullscreen,
    );
    expect(layoutMode({ width: 740, height: 360 })).toBe(
      LAYOUT_MODE.fullscreen,
    );
  });

  it("opens a 608 px wide window on the smallest floating desktop", () => {
    expect(initialRect(null, FLOATING_MIN_SIZE, underTitle(0)).width).toBe(608);
  });

  it("narrows a 720 px window to 640 px on a 640 × 500 desktop", () => {
    const rect: Rect = { x: 100, y: 50, width: 720, height: 480 };
    expect(fitRect(rect, { width: 640, height: 500 }).width).toBe(640);
  });
});
