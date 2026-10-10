import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CURSOR_ARROW_CELL,
  CURSOR_ARROW_HOTSPOT,
  CURSOR_ARROW_SRC,
  CURSOR_HAND_CELL,
  CURSOR_HAND_HOTSPOT,
  CURSOR_HAND_SRC,
  CURSOR_SIZE,
} from "@/lib/cursors";
import {
  expectSafeSvg,
  parseElements,
  readPublic,
  rootAttributes,
  XML_DECLARATION,
} from "./svg-checks";

const BLACK = "#000000";
const WHITE = "#FFFFFF";
const CURSOR_COLORS: readonly string[] = [BLACK, WHITE];
const CURSOR_VIEW_BOX = `0 0 ${CURSOR_SIZE} ${CURSOR_SIZE}`;
const RECT_ATTRIBUTES = ["fill", "height", "width", "x", "y"];

type Cell = string | undefined;
type Hotspot = { readonly x: number; readonly y: number };

// The owner's classic arrow (spec 012, change 2) redrawn in the hand's coarse
// 2 by 2 cells for the same thick outline (change 3): B white, N black,
// "." transparent. Everything right of or below the map is transparent too.
const ARROW_MAP = [
  "N",
  "NN",
  "NBN",
  "NBBN",
  "NBBBN",
  "NBBBBN",
  "NBBBBBN",
  "NBBBBBBN",
  "NBBBBBBBN",
  "NBBBBNNNN",
  "NBBNBBN",
  "NBN.NBBN",
  "NN..NBBN",
  "N....NBBN",
  ".....NBBN",
  "......NN",
];
// 9 by 16 cells, 18 by 32 px: as big as the hand.
const ARROW_SIZE = [18, 32];
const MAP_COLORS: Record<string, Cell> = { B: WHITE, N: BLACK, ".": undefined };

// 10 by 14 cells, 20 by 28 px (plan 007, section 7).
const HAND_COLUMNS = 10;
const HAND_ROWS = 14;
const HAND_CUFF_ROWS = 2;

const CURSORS: [string, string, Hotspot, number][] = [
  ["arrow", CURSOR_ARROW_SRC, CURSOR_ARROW_HOTSPOT, CURSOR_ARROW_CELL],
  ["hand", CURSOR_HAND_SRC, CURSOR_HAND_HOTSPOT, CURSOR_HAND_CELL],
];

// Paints the rects on the cursor's own grid (RF-3 c): every coordinate and
// size is a whole number of cells, and the last rect over a cell decides its color.
function paintCursor(svg: string, cell: number): Cell[][] {
  const cells = CURSOR_SIZE / cell;
  const grid: Cell[][] = Array.from({ length: cells }, () =>
    Array.from({ length: cells }, (): Cell => undefined),
  );
  for (const { name, attributes } of parseElements(svg).slice(1)) {
    if (name !== "rect") throw new Error(`<${name}> in a cursor`);
    const keys = Object.keys(attributes).sort().join(",");
    if (keys !== RECT_ATTRIBUTES.join(",")) {
      throw new Error(`Rect attributes ${keys}`);
    }
    const [x, y, width, height] = ["x", "y", "width", "height"].map((key) => {
      const value = attributes[key];
      if (!/^\d+$/.test(value) || Number(value) % cell !== 0) {
        throw new Error(`${key}="${value}" is not a whole cell`);
      }
      return Number(value);
    });
    if (width === 0 || height === 0) throw new Error("Empty rect");
    if (x + width > CURSOR_SIZE || y + height > CURSOR_SIZE) {
      throw new Error(`Rect at ${x},${y} leaves the ${CURSOR_SIZE} px canvas`);
    }
    if (!CURSOR_COLORS.includes(attributes.fill)) {
      throw new Error(`Color ${attributes.fill} outside black and white`);
    }
    for (let row = y / cell; row < (y + height) / cell; row++) {
      for (let column = x / cell; column < (x + width) / cell; column++) {
        grid[row][column] = attributes.fill;
      }
    }
  }
  return grid;
}

function mapGrid(map: readonly string[], cells: number): Cell[][] {
  return Array.from({ length: cells }, (_row, row) =>
    Array.from({ length: cells }, (_cell, column) => {
      const symbol = map[row]?.[column] ?? ".";
      if (!(symbol in MAP_COLORS)) throw new Error(`Symbol ${symbol}`);
      return MAP_COLORS[symbol];
    }),
  );
}

function hotspotCell(grid: Cell[][], { x, y }: Hotspot, cell: number): Cell {
  return grid[Math.floor(y / cell)]?.[Math.floor(x / cell)];
}

function paintedBox(grid: Cell[][]): {
  columns: number[];
  rows: number[];
} {
  const columns: number[] = [];
  const rows: number[] = [];
  grid.forEach((cells, row) =>
    cells.forEach((cell, column) => {
      if (cell === undefined) return;
      columns.push(column);
      rows.push(row);
    }),
  );
  return { columns, rows };
}

// A white cell touching a transparent one, or the canvas edge, would melt into
// a light background: the black outline has to close the whole hand.
function expectClosedOutline(grid: Cell[][]): void {
  const steps = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  let white = 0;
  grid.forEach((cells, row) =>
    cells.forEach((cell, column) => {
      if (cell !== WHITE) return;
      white++;
      for (const [down, right] of steps) {
        if (grid[row + down]?.[column + right] === undefined) {
          throw new Error(`White cell ${column},${row} without outline`);
        }
      }
    }),
  );
  if (white === 0) throw new Error("No white fill");
}

function paintedColumns(cells: readonly Cell[]): number[] {
  return cells
    .map((cell, column) => (cell === undefined ? -1 : column))
    .filter((column) => column >= 0);
}

describe("cursor constants (RF-13, RF-14)", () => {
  it("point at the two drawings with their hotspots", () => {
    expect(CURSOR_ARROW_SRC).toBe("/cursors/arrow.svg");
    expect(CURSOR_HAND_SRC).toBe("/cursors/hand.svg");
    expect(CURSOR_ARROW_HOTSPOT).toEqual({ x: 0, y: 0 });
    expect(CURSOR_HAND_HOTSPOT).toEqual({ x: 7, y: 0 });
  });

  it("draw on a 32 px canvas, both in 2 by 2 cells (RF-3 c; spec 012, change 3)", () => {
    expect(CURSOR_SIZE).toBe(32);
    expect(CURSOR_ARROW_CELL).toBe(2);
    expect(CURSOR_HAND_CELL).toBe(2);
    expect(CURSOR_SIZE % CURSOR_ARROW_CELL).toBe(0);
    expect(CURSOR_SIZE % CURSOR_HAND_CELL).toBe(0);
  });
});

describe.each(CURSORS)(
  "%s cursor (RF-3, RF-13, RF-14)",
  (_name, src, hotspot, cell) => {
    let svg = "";

    beforeAll(() => {
      svg = readPublic(src);
    });

    it("exists where its constant points", () => {
      expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
    });

    it("is a hand-made svg without scripts, links, embedded images, metadata or tool prefixes", () => {
      expectSafeSvg(svg);
    });

    it("measures 32 by 32 with crisp pixels", () => {
      expect(rootAttributes(svg)).toEqual({
        xmlns: "http://www.w3.org/2000/svg",
        width: String(CURSOR_SIZE),
        height: String(CURSOR_SIZE),
        viewBox: CURSOR_VIEW_BOX,
        "shape-rendering": "crispEdges",
      });
    });

    it("only paints black and white rects on whole cells of its grid", () => {
      const grid = paintCursor(svg, cell);
      const colors = new Set(
        grid.flat().filter((color) => color !== undefined),
      );
      expect([...colors].sort()).toEqual([...CURSOR_COLORS].sort());
    });

    it("has its hotspot pixel drawn", () => {
      expect(hotspot.x).toBeGreaterThanOrEqual(0);
      expect(hotspot.y).toBeGreaterThanOrEqual(0);
      expect(hotspot.x).toBeLessThan(CURSOR_SIZE);
      expect(hotspot.y).toBeLessThan(CURSOR_SIZE);
      expect(hotspotCell(paintCursor(svg, cell), hotspot, cell)).toBeDefined();
    });
  },
);

describe("arrow.svg (spec 012, changes 2 and 3)", () => {
  let grid: Cell[][] = [];

  beforeAll(() => {
    grid = paintCursor(readPublic(CURSOR_ARROW_SRC), CURSOR_ARROW_CELL);
  });

  it("matches the owner's arrow map pixel by pixel, transparent outside it", () => {
    const expected = mapGrid(ARROW_MAP, CURSOR_SIZE / CURSOR_ARROW_CELL);
    expect(grid).toHaveLength(CURSOR_SIZE / CURSOR_ARROW_CELL);
    grid.forEach((cells, row) =>
      cells.forEach((color, column) =>
        expect(color, `pixel ${column},${row}`).toBe(expected[row][column]),
      ),
    );
  });

  it("paints an 18 by 32 px box from the top left corner", () => {
    const { columns, rows } = paintedBox(grid);
    expect(Math.min(...columns)).toBe(0);
    expect(Math.min(...rows)).toBe(0);
    expect([
      (Math.max(...columns) + 1) * CURSOR_ARROW_CELL,
      (Math.max(...rows) + 1) * CURSOR_ARROW_CELL,
    ]).toEqual(ARROW_SIZE);
  });

  it("keeps the tip black at the hotspot", () => {
    expect(hotspotCell(grid, CURSOR_ARROW_HOTSPOT, CURSOR_ARROW_CELL)).toBe(
      BLACK,
    );
  });

  it("closes the white fill with a black outline", () => {
    expectClosedOutline(grid);
  });
});

describe("hand.svg (RF-3 c, RF-14)", () => {
  let grid: Cell[][] = [];

  beforeAll(() => {
    grid = paintCursor(readPublic(CURSOR_HAND_SRC), CURSOR_HAND_CELL);
  });

  it("fills 10 by 14 cells (20 by 28 px) from the top left corner", () => {
    const { columns, rows } = paintedBox(grid);
    expect(Math.min(...columns)).toBe(0);
    expect(Math.max(...columns)).toBe(HAND_COLUMNS - 1);
    expect(Math.min(...rows)).toBe(0);
    expect(Math.max(...rows)).toBe(HAND_ROWS - 1);
  });

  it("has the fingertip on px 6 to 9 of the top row, with the hotspot in its middle", () => {
    const tip = paintedColumns(grid[0]);
    expect(tip.map((column) => column * CURSOR_HAND_CELL)).toEqual([6, 8]);
    expect(hotspotCell(grid, CURSOR_HAND_HOTSPOT, CURSOR_HAND_CELL)).toBe(
      BLACK,
    );
  });

  it("is white closed by a black outline", () => {
    expectClosedOutline(grid);
  });

  it("ends in a black cuff two cells high", () => {
    for (const row of grid.slice(HAND_ROWS - HAND_CUFF_ROWS, HAND_ROWS)) {
      const painted = row.filter((cell) => cell !== undefined);
      expect(painted.length).toBeGreaterThan(0);
      expect(new Set(painted)).toEqual(new Set([BLACK]));
    }
    expect(
      grid[HAND_ROWS - HAND_CUFF_ROWS - 1].some((cell) => cell === WHITE),
    ).toBe(true);
  });
});

describe("the cursor reader", () => {
  const canvas = (rects: string, header = "") =>
    `${header}<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="${CURSOR_VIEW_BOX}" shape-rendering="crispEdges">${rects}</svg>`;
  const rect = (
    x: number | string,
    y: number | string,
    width: number | string,
    height: number,
    fill = BLACK,
  ) =>
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;

  it("accepts whole cells, with or without the XML declaration", () => {
    expect(() =>
      paintCursor(canvas(rect(0, 0, 2, 2)), CURSOR_HAND_CELL),
    ).not.toThrow();
    expect(() =>
      paintCursor(canvas(rect(0, 0, 2, 2), XML_DECLARATION), CURSOR_HAND_CELL),
    ).not.toThrow();
    expect(paintCursor(canvas(rect(2, 4, 2, 2)), CURSOR_HAND_CELL)[2][1]).toBe(
      BLACK,
    );
  });

  it.each([
    ["an odd x", rect(1, 0, 2, 2)],
    ["an odd height", rect(0, 0, 2, 3)],
    ["a fractional width", rect(0, 0, 2.5, 2)],
    ["a percentage", rect("10%", 0, 2, 2)],
    ["an empty rect", rect(0, 0, 0, 2)],
    ["a rect off the canvas", rect(30, 0, 4, 2)],
    ["a gray", rect(0, 0, 2, 2, "#C0C0C0")],
    ["a path", `<path d="M0 0 L2 2 Z" fill="${BLACK}"/>`],
    ["a group", `<g>${rect(0, 0, 2, 2)}</g>`],
    ["a transform", rect(0, 0, 2, 2).replace("/>", ' transform="scale(2)"/>')],
  ])("rejects %s on the 2 px grid of both cursors", (_case, rects) => {
    expect(() => paintCursor(canvas(rects), CURSOR_HAND_CELL)).toThrow();
  });

  it("rejects an open outline", () => {
    expect(() =>
      expectClosedOutline(
        paintCursor(canvas(rect(0, 0, 4, 4, WHITE)), CURSOR_HAND_CELL),
      ),
    ).toThrow();
    expect(() =>
      expectClosedOutline(
        paintCursor(
          canvas(rect(0, 0, 6, 6) + rect(2, 2, 2, 2, WHITE)),
          CURSOR_HAND_CELL,
        ),
      ),
    ).not.toThrow();
  });
});
