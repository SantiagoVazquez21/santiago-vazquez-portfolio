import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { contrastRatio, NON_TEXT_CONTRAST_MIN } from "@/lib/color-contrast";
import { CURSOR_ARROW_SRC, CURSOR_HAND_SRC } from "@/lib/cursors";
import { TASKBAR_ICON_BUTTON_WIDTH } from "@/lib/window-controls";
import {
  CLOUD_TILE_HEIGHT,
  CLOUD_TILE_WIDTH,
  CLOUDS_HEIGHT_PERCENT,
  CLOUDS_LAYER_STYLE,
  CLOUDS_TOP_PERCENT,
  DESKTOP_TEXT,
  FOCUS_RING_COLORS,
  focusRingContrast,
  HILLS_HEIGHT_PERCENT,
  HILLS_LAYER_STYLE,
  LABEL_BACKING,
  LABEL_BACKING_ALPHA,
  labelContrast,
  TEXT_CONTRAST_MIN,
  WALLPAPER_CLOUDS_SRC,
  WALLPAPER_FALLBACK_STYLE,
  WALLPAPER_HILL_SRC,
  WALLPAPER_PALETTE,
  WALLPAPER_SKY_SRC,
  WALLPAPER_TOGGLE_GLYPH,
} from "@/lib/wallpaper";
import {
  expectSafeSvg,
  parseElements,
  readPublic,
  rootAttributes,
  type SvgElement,
  withoutDeclaration,
  XML_DECLARATION,
} from "./svg-checks";

const HEX_COLOR = /^#[0-9A-F]{6}$/;
const PALETTE_COLORS: readonly string[] = Object.values(WALLPAPER_PALETTE);

const COLOR_ATTRIBUTES = [
  "fill",
  "stroke",
  "stop-color",
  "color",
  "flood-color",
  "lighting-color",
];

// Every color is one of the owner's palette or a gradient defined in the same file.
function expectPaletteColors(svg: string): void {
  const elements = parseElements(svg);
  const gradientIds = elements
    .filter(({ name }) => name === "linearGradient")
    .map(({ attributes }) => attributes.id);
  expect(svg).not.toMatch(/\sstyle=|<style/i);
  for (const { attributes } of elements) {
    for (const attribute of COLOR_ATTRIBUTES) {
      const value = attributes[attribute];
      if (value === undefined) continue;
      const gradient = /^url\(#([\w-]+)\)$/.exec(value)?.[1];
      if (gradient !== undefined) {
        expect(gradientIds).toContain(gradient);
      } else {
        expect(PALETTE_COLORS).toContain(value);
      }
    }
  }
}

type Point = { x: number; y: number };

const PATH_ARITY: Record<string, number> = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };

// Absolute M, L, Q, C and Z only, each with exactly its numbers: a repeated
// implicit command cannot sneak extra nodes past the limit.
function parsePath(d: string): { command: string; numbers: number[] }[] {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const commands: { command: string; numbers: number[] }[] = [];
  for (const token of tokens) {
    if (/[A-Za-z]/.test(token)) {
      if (!(token in PATH_ARITY)) throw new Error(`Command ${token} in ${d}`);
      commands.push({ command: token, numbers: [] });
    } else {
      const current = commands.at(-1);
      if (current === undefined) throw new Error(`Number before command: ${d}`);
      current.numbers.push(Number(token));
    }
  }
  for (const { command, numbers } of commands) {
    if (numbers.length !== PATH_ARITY[command]) {
      throw new Error(`${command} with ${numbers.length} numbers in ${d}`);
    }
  }
  return commands;
}

function samplePath(d: string): Point[] {
  const points: Point[] = [];
  let current: Point = { x: 0, y: 0 };
  let start: Point = current;
  const steps = 2000;
  const line = (from: Point, to: Point) => {
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      points.push({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      });
    }
  };
  for (const { command, numbers: n } of parsePath(d)) {
    if (command === "M") {
      current = { x: n[0], y: n[1] };
      start = current;
      points.push(current);
    } else if (command === "L") {
      const to = { x: n[0], y: n[1] };
      line(current, to);
      current = to;
    } else if (command === "Z") {
      line(current, start);
      current = start;
    } else {
      const controls: Point[] = [current];
      for (let index = 0; index < n.length; index += 2) {
        controls.push({ x: n[index], y: n[index + 1] });
      }
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        let level = controls;
        while (level.length > 1) {
          level = level.slice(1).map((point, index) => ({
            x: level[index].x + (point.x - level[index].x) * t,
            y: level[index].y + (point.y - level[index].y) * t,
          }));
        }
        points.push(level[0]);
      }
      current = controls.at(-1) ?? current;
    }
  }
  return points;
}

// Highest point of the outline in each column (smaller y is higher on screen).
function topEdge(points: Point[], width: number): number[] {
  const tops: number[] = Array.from({ length: width + 1 }, () => Infinity);
  for (const { x, y } of points) {
    const column = Math.round(x);
    if (column >= 0 && column <= width)
      tops[column] = Math.min(tops[column], y);
  }
  return tops;
}

function peak(points: Point[]): Point {
  return points.reduce((best, point) => (point.y < best.y ? point : best));
}

describe("constants", () => {
  it("use the owner's palette (spec 007, doubt 2a)", () => {
    expect(WALLPAPER_PALETTE).toEqual({
      skyTop: "#2F6FD0",
      skyBottom: "#A9D3F5",
      hill: "#5DB043",
      hillBack: "#3E8E2F",
      cloud: "#FFFFFF",
      cloudShade: "#E3EEF8",
    });
  });

  it("keep every color as uppercase #RRGGBB", () => {
    for (const color of [
      ...PALETTE_COLORS,
      DESKTOP_TEXT,
      LABEL_BACKING,
      ...FOCUS_RING_COLORS,
    ]) {
      expect(color).toMatch(HEX_COLOR);
    }
  });

  it("use white text on #0A246A at 75 % and the WCAG 1.4.3 threshold (doubt 2b)", () => {
    expect(DESKTOP_TEXT).toBe("#FFFFFF");
    expect(LABEL_BACKING).toBe("#0A246A");
    expect(LABEL_BACKING_ALPHA).toBe(0.75);
    expect(TEXT_CONTRAST_MIN).toBe(4.5);
  });

  it("draw the focus ring in white and black", () => {
    expect(FOCUS_RING_COLORS).toEqual(["#FFFFFF", "#000000"]);
  });
});

describe("labelContrast (RF-11)", () => {
  it.each([...PALETTE_COLORS, "#FFFFFF"])("reaches 4.5:1 over %s", (behind) => {
    expect(labelContrast(behind)).toBeGreaterThanOrEqual(TEXT_CONTRAST_MIN);
  });

  it("gives about 6.6:1 in the worst case, over pure white", () => {
    expect(Math.abs(labelContrast("#FFFFFF") - 6.6)).toBeLessThanOrEqual(0.1);
  });

  it("is lowest over pure white among the palette", () => {
    for (const color of PALETTE_COLORS) {
      expect(labelContrast(color)).toBeGreaterThanOrEqual(
        labelContrast("#FFFFFF"),
      );
    }
  });

  it("throws on a color that is not #RRGGBB", () => {
    expect(() => labelContrast("#FFF")).toThrow();
  });
});

describe("focusRingContrast (RF-12)", () => {
  it.each(PALETTE_COLORS)("reaches 3:1 over %s", (behind) => {
    expect(focusRingContrast(behind)).toBeGreaterThanOrEqual(
      NON_TEXT_CONTRAST_MIN,
    );
  });

  it("takes the better of the two ring colors", () => {
    expect(focusRingContrast("#FFFFFF")).toBeCloseTo(21, 5);
    expect(focusRingContrast("#000000")).toBeCloseTo(21, 5);
  });

  it("throws on a color that is not #RRGGBB", () => {
    expect(() => focusRingContrast("#FFF")).toThrow();
  });
});

const SKY_VIEW_BOX = "0 0 16 9";
const HILL_WIDTH = 1600;
const HILL_HEIGHT = 400;
const HILL_VIEW_BOX = `0 0 ${HILL_WIDTH} ${HILL_HEIGHT}`;
const HILL_COMMANDS_MAX = 10;

const WALLPAPER_DRAWINGS = [
  WALLPAPER_SKY_SRC,
  WALLPAPER_CLOUDS_SRC,
  WALLPAPER_HILL_SRC,
];

describe("wallpaper drawings (RF-1 to RF-3)", () => {
  it.each(WALLPAPER_DRAWINGS)("%s exists where its constant points", (src) => {
    expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
  });

  it.each(WALLPAPER_DRAWINGS)(
    "%s is a hand-made svg without scripts, links, embedded images, metadata or tool prefixes",
    (src) => {
      expectSafeSvg(readPublic(src));
    },
  );

  it.each(WALLPAPER_DRAWINGS)("%s only uses the palette colors", (src) => {
    expectPaletteColors(readPublic(src));
  });

  it.each(WALLPAPER_DRAWINGS)(
    "%s stretches edge to edge with preserveAspectRatio none",
    (src) => {
      expect(rootAttributes(readPublic(src)).preserveAspectRatio).toBe("none");
    },
  );

  it("rejects a comment, a doctype or a second processing instruction", () => {
    const sky = readPublic(WALLPAPER_SKY_SRC);
    const body = withoutDeclaration(sky);
    expect(() => expectSafeSvg(`<!-- note -->${body}`)).toThrow();
    expect(() => expectSafeSvg(`<!DOCTYPE svg>${body}`)).toThrow();
    expect(() =>
      expectSafeSvg(`${XML_DECLARATION}<?xml-stylesheet href="a"?>${body}`),
    ).toThrow();
    expect(() => expectSafeSvg(`${XML_DECLARATION}${body}`)).not.toThrow();
  });
});

describe("sky.svg", () => {
  let sky = "";
  let elements: SvgElement[] = [];

  beforeAll(() => {
    sky = readPublic(WALLPAPER_SKY_SRC);
    elements = parseElements(sky);
  });

  it("only holds a gradient and the rectangle it paints", () => {
    expect(elements.map(({ name }) => name)).toEqual([
      "svg",
      "defs",
      "linearGradient",
      "stop",
      "stop",
      "rect",
    ]);
    expect(rootAttributes(sky).viewBox).toBe(SKY_VIEW_BOX);
  });

  it("goes from skyTop at the top to skyBottom at the horizon", () => {
    const gradient = elements.find(({ name }) => name === "linearGradient");
    expect(gradient?.attributes).toMatchObject({
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1",
    });
    const stops = elements
      .filter(({ name }) => name === "stop")
      .map(({ attributes }) => [attributes.offset, attributes["stop-color"]]);
    expect(stops).toEqual([
      ["0", WALLPAPER_PALETTE.skyTop],
      ["1", WALLPAPER_PALETTE.skyBottom],
    ]);
  });

  it("paints the whole viewBox with that gradient", () => {
    const rect = elements.find(({ name }) => name === "rect");
    const [, , width, height] = SKY_VIEW_BOX.split(" ");
    expect(rect?.attributes).toEqual({
      width,
      height,
      fill: `url(#${elements.find(({ name }) => name === "linearGradient")?.attributes.id})`,
    });
  });
});

describe("hill.svg (RF-3 b)", () => {
  let hill = "";
  let elements: SvgElement[] = [];
  let paths: SvgElement[] = [];
  let backPoints: Point[] = [];
  let frontPoints: Point[] = [];

  beforeAll(() => {
    hill = readPublic(WALLPAPER_HILL_SRC);
    elements = parseElements(hill);
    paths = elements.filter(({ name }) => name === "path");
    const pathFilled = (fill: string) =>
      paths.find(({ attributes }) => attributes.fill === fill)?.attributes.d ??
      "";
    backPoints = samplePath(pathFilled(WALLPAPER_PALETTE.hillBack));
    frontPoints = samplePath(pathFilled(WALLPAPER_PALETTE.hill));
  });

  it("has exactly two paths, the back one in hillBack drawn before the front one in hill", () => {
    expect(elements.map(({ name }) => name)).toEqual(["svg", "path", "path"]);
    expect(paths.map(({ attributes }) => attributes.fill)).toEqual([
      WALLPAPER_PALETTE.hillBack,
      WALLPAPER_PALETTE.hill,
    ]);
    for (const { attributes } of paths) {
      expect(Object.keys(attributes).sort()).toEqual(["d", "fill"]);
    }
    expect(rootAttributes(hill).viewBox).toBe(HILL_VIEW_BOX);
  });

  it(`writes each path by hand with at most ${HILL_COMMANDS_MAX} commands`, () => {
    for (const { attributes } of paths) {
      expect(parsePath(attributes.d).length).toBeLessThanOrEqual(
        HILL_COMMANDS_MAX,
      );
    }
  });

  it("rejects relative, arc or implicitly repeated commands", () => {
    expect(() => parsePath("M0 0 l10 10 Z")).toThrow();
    expect(() => parsePath("M0 0 A1 1 0 0 1 10 10 Z")).toThrow();
    expect(() => parsePath("M0 0 L10 10 20 20 Z")).toThrow();
  });

  it("keeps both hills inside the viewBox, from edge to edge and down to the bottom", () => {
    for (const points of [backPoints, frontPoints]) {
      const xs = points.map(({ x }) => x);
      const ys = points.map(({ y }) => y);
      expect(Math.min(...xs)).toBe(0);
      expect(Math.max(...xs)).toBe(HILL_WIDTH);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys)).toBe(HILL_HEIGHT);
    }
  });

  it("puts the top of the front hill in the right third", () => {
    expect(peak(frontPoints).x).toBeGreaterThanOrEqual((HILL_WIDTH * 2) / 3);
    expect(peak(frontPoints).x).toBeLessThanOrEqual(HILL_WIDTH);
  });

  it("puts the top of the back hill on the left, between x = 150 and x = 500", () => {
    expect(peak(backPoints).x).toBeGreaterThanOrEqual(150);
    expect(peak(backPoints).x).toBeLessThanOrEqual(500);
  });

  it("lets the back hill peek out on the left and hides it behind the front one before the middle", () => {
    const backTop = topEdge(backPoints, HILL_WIDTH);
    const frontTop = topEdge(frontPoints, HILL_WIDTH);
    const backPeak = Math.round(peak(backPoints).x);
    expect(backTop[0]).toBeLessThan(frontTop[0]);
    expect(backTop[backPeak]).toBeLessThan(frontTop[backPeak]);
    for (let column = HILL_WIDTH / 2; column <= HILL_WIDTH; column++) {
      expect(backTop[column], `column ${column}`).toBeGreaterThanOrEqual(
        frontTop[column],
      );
    }
  });

  it("paints the back hill darker than the front one", () => {
    expect(contrastRatio(WALLPAPER_PALETTE.hillBack, "#000000")).toBeLessThan(
      contrastRatio(WALLPAPER_PALETTE.hill, "#000000"),
    );
  });
});

const CLOUD_TILE_VIEW_BOX = `0 0 ${CLOUD_TILE_WIDTH} ${CLOUD_TILE_HEIGHT}`;
const CLOUD_ROOT_ATTRIBUTES = [
  "xmlns",
  "width",
  "height",
  "viewBox",
  "preserveAspectRatio",
];
const CLOUD_COLORS: readonly string[] = [
  WALLPAPER_PALETTE.cloud,
  WALLPAPER_PALETTE.cloudShade,
];
const CLOUD_SHAPE_ATTRIBUTES: Record<string, readonly string[]> = {
  circle: ["cx", "cy", "r", "fill", "stroke", "stroke-width"],
  ellipse: ["cx", "cy", "rx", "ry", "fill", "stroke", "stroke-width"],
};
const LITERAL_NUMBER = /^\d+(\.\d+)?$/;
// SVG paints a 1-unit stroke when stroke-width is left out.
const DEFAULT_STROKE_WIDTH = 1;

function numberAttribute(
  attributes: Record<string, string>,
  attribute: string,
): number {
  const value = attributes[attribute];
  if (value === undefined || !LITERAL_NUMBER.test(value)) {
    throw new Error(`${attribute}="${value}" is not a literal number`);
  }
  return Number(value);
}

// Tile rule of plan 007, section 5: only circles and ellipses, each with its
// ink (stroke included) inside the tile, so repeating it never cuts a cloud.
function expectCloudTile(svg: string): void {
  expectSafeSvg(svg);
  const [root, ...shapes] = parseElements(svg);
  expect(root.name).toBe("svg");
  expect(Object.keys(root.attributes).sort()).toEqual(
    [...CLOUD_ROOT_ATTRIBUTES].sort(),
  );
  expect(root.attributes).toMatchObject({
    width: String(CLOUD_TILE_WIDTH),
    height: String(CLOUD_TILE_HEIGHT),
    viewBox: CLOUD_TILE_VIEW_BOX,
    preserveAspectRatio: "none",
  });
  expect(shapes.length).toBeGreaterThan(0);
  for (const { name, attributes } of shapes) {
    const allowed = CLOUD_SHAPE_ATTRIBUTES[name];
    if (allowed === undefined) throw new Error(`<${name}> in the cloud tile`);
    for (const attribute of Object.keys(attributes)) {
      expect(allowed, `${attribute} in <${name}>`).toContain(attribute);
    }
    expect(CLOUD_COLORS).toContain(attributes.fill);
    if (attributes.stroke !== undefined) {
      expect(CLOUD_COLORS).toContain(attributes.stroke);
    }
    const cx = numberAttribute(attributes, "cx");
    const cy = numberAttribute(attributes, "cy");
    const a = numberAttribute(attributes, name === "circle" ? "r" : "rx");
    const b = numberAttribute(attributes, name === "circle" ? "r" : "ry");
    const strokeWidth =
      attributes["stroke-width"] === undefined
        ? DEFAULT_STROKE_WIDTH
        : numberAttribute(attributes, "stroke-width");
    const s = attributes.stroke === undefined ? 0 : strokeWidth / 2;
    const shape = `<${name} cx="${cx}" cy="${cy}">`;
    expect(a, shape).toBeGreaterThan(0);
    expect(b, shape).toBeGreaterThan(0);
    expect(cx - a - s, shape).toBeGreaterThanOrEqual(0);
    expect(cx + a + s, shape).toBeLessThanOrEqual(CLOUD_TILE_WIDTH);
    expect(cy - b - s, shape).toBeGreaterThanOrEqual(0);
    expect(cy + b + s, shape).toBeLessThanOrEqual(CLOUD_TILE_HEIGHT);
  }
}

describe("clouds.svg (RF-3, RF-4)", () => {
  const tile = (shapes: string, rootExtra = "") =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CLOUD_TILE_WIDTH}" height="${CLOUD_TILE_HEIGHT}" viewBox="${CLOUD_TILE_VIEW_BOX}" preserveAspectRatio="none"${rootExtra}>${shapes}</svg>`;
  const inside = `<ellipse cx="100" cy="100" rx="50" ry="20" fill="${WALLPAPER_PALETTE.cloud}"/>`;

  it("is a 1600 by 240 tile", () => {
    expect(CLOUD_TILE_WIDTH).toBe(1600);
    expect(CLOUD_TILE_HEIGHT).toBe(240);
  });

  it("follows the tile rule: circles and ellipses in cloud and cloudShade, all inside the tile", () => {
    expectCloudTile(readPublic(WALLPAPER_CLOUDS_SRC));
  });

  it("paints white clouds over a cloudShade base", () => {
    const fills = parseElements(readPublic(WALLPAPER_CLOUDS_SRC))
      .slice(1)
      .map(({ attributes }) => attributes.fill);
    expect(fills).toContain(WALLPAPER_PALETTE.cloud);
    expect(fills).toContain(WALLPAPER_PALETTE.cloudShade);
  });

  it("accepts a well-formed tile, with or without the XML declaration and with a stroke inside", () => {
    expect(() => expectCloudTile(tile(inside))).not.toThrow();
    expect(() =>
      expectCloudTile(`${XML_DECLARATION}${tile(inside)}`),
    ).not.toThrow();
    expect(() =>
      expectCloudTile(
        tile(
          `<circle cx="11" cy="11" r="10" fill="${WALLPAPER_PALETTE.cloud}" stroke="${WALLPAPER_PALETTE.cloudShade}" stroke-width="2"/>`,
        ),
      ),
    ).not.toThrow();
  });

  it.each([
    ["a group", `<g>${inside}</g>`],
    ["a path", `<path d="M0 0 L10 10 Z" fill="#FFFFFF"/>`],
    ["a transform", inside.replace("/>", ' transform="scale(2)"/>')],
    ["a style", inside.replace("/>", ' style="opacity:0.5"/>')],
    ["a class", inside.replace("/>", ' class="cloud"/>')],
    [
      "a color outside cloud and cloudShade",
      inside.replace("#FFFFFF", "#5DB043"),
    ],
    ["a shape without fill", `<circle cx="50" cy="50" r="10"/>`],
    [
      "a radius that is not a literal number",
      inside.replace('rx="50"', 'rx="5e1"'),
    ],
    ["a percentage", inside.replace('cx="100"', 'cx="10%"')],
    ["a missing center", inside.replace(' cy="100"', "")],
    ["a cloud cut on the left", inside.replace('cx="100"', 'cx="49"')],
    [
      "a cloud cut on the right",
      inside.replace('cx="100"', `cx="${CLOUD_TILE_WIDTH - 49}"`),
    ],
    ["a cloud cut at the top", inside.replace('cy="100"', 'cy="19"')],
    [
      "a cloud cut at the bottom",
      inside.replace('cy="100"', `cy="${CLOUD_TILE_HEIGHT - 19}"`),
    ],
    [
      "a stroke that crosses the edge",
      `<circle cx="10" cy="50" r="10" fill="#FFFFFF" stroke="#E3EEF8" stroke-width="2"/>`,
    ],
    [
      "a default stroke that crosses the edge",
      `<circle cx="10" cy="50" r="10" fill="#FFFFFF" stroke="#E3EEF8"/>`,
    ],
    ["a comment", `<!-- cloud -->${inside}`],
    ["a CDATA section", `<![CDATA[x]]>${inside}`],
  ])("rejects %s", (_case, shapes) => {
    expect(() => expectCloudTile(tile(shapes))).toThrow();
  });

  it("rejects extra root attributes, another viewBox, a doctype or another processing instruction", () => {
    expect(() => expectCloudTile(tile(inside, ' class="x"'))).toThrow();
    expect(() =>
      expectCloudTile(tile(inside).replace(CLOUD_TILE_VIEW_BOX, "0 0 800 240")),
    ).toThrow();
    expect(() => expectCloudTile(`<!DOCTYPE svg>${tile(inside)}`)).toThrow();
    expect(() =>
      expectCloudTile(
        `${XML_DECLARATION}<?xml-stylesheet href="a"?>${tile(inside)}`,
      ),
    ).toThrow();
  });
});

// The tray button sits on the taskbar's Windows 95 gray (spec 003).
const TASKBAR_GRAY = "#C0C0C0";
const GLYPH_SIZE = 16;
const GLYPH_VIEW_BOX = `0 0 ${GLYPH_SIZE} ${GLYPH_SIZE}`;
const GLYPH_BORDER = "#000000";
const GLYPH_COLORS: readonly string[] = [WALLPAPER_PALETTE.cloud, GLYPH_BORDER];
const GLYPH_RECT_ATTRIBUTES = ["fill", "height", "width", "x", "y"];

type GlyphCell = string | undefined;

// Same pixel-by-pixel style as the other 16 px icons: whole-pixel rects only,
// and the last rect over a pixel decides its color.
function paintGlyph(svg: string): GlyphCell[][] {
  const grid: GlyphCell[][] = Array.from({ length: GLYPH_SIZE }, () =>
    Array.from({ length: GLYPH_SIZE }, (): GlyphCell => undefined),
  );
  for (const { name, attributes } of parseElements(svg).slice(1)) {
    if (name !== "rect") throw new Error(`<${name}> in the glyph`);
    const keys = Object.keys(attributes).sort().join(",");
    if (keys !== GLYPH_RECT_ATTRIBUTES.join(",")) {
      throw new Error(`Rect attributes ${keys}`);
    }
    const [x, y, width, height] = ["x", "y", "width", "height"].map((key) => {
      if (!/^\d+$/.test(attributes[key])) {
        throw new Error(`${key}="${attributes[key]}" is not a whole pixel`);
      }
      return Number(attributes[key]);
    });
    if (width === 0 || height === 0) throw new Error("Empty rect");
    if (x + width > GLYPH_SIZE || y + height > GLYPH_SIZE) {
      throw new Error(`Rect at ${x},${y} leaves the ${GLYPH_SIZE} px grid`);
    }
    if (!GLYPH_COLORS.includes(attributes.fill)) {
      throw new Error(`Color ${attributes.fill} outside the glyph colors`);
    }
    for (let row = y; row < y + height; row++) {
      for (let column = x; column < x + width; column++) {
        grid[row][column] = attributes.fill;
      }
    }
  }
  return grid;
}

// A white pixel touching a transparent one, or the edge, would melt into the
// gray bar: the black outline has to close the whole cloud.
function expectClosedOutline(grid: GlyphCell[][]): void {
  const steps = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  let white = 0;
  for (let row = 0; row < GLYPH_SIZE; row++) {
    for (let column = 0; column < GLYPH_SIZE; column++) {
      if (grid[row][column] !== WALLPAPER_PALETTE.cloud) continue;
      white++;
      for (const [down, right] of steps) {
        const neighbor = grid[row + down]?.[column + right];
        if (neighbor === undefined) {
          throw new Error(`White pixel ${column},${row} without outline`);
        }
      }
    }
  }
  if (white === 0) throw new Error("No white cloud");
  if (!grid.flat().includes(GLYPH_BORDER)) throw new Error("No outline");
}

describe("cloud.svg, the glyph of the wallpaper button (RF-3, RF-6)", () => {
  const glyph = (rects: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="${GLYPH_VIEW_BOX}" shape-rendering="crispEdges">${rects}</svg>`;
  const black = (x: number, y: number, width: number, height: number) =>
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${GLYPH_BORDER}"/>`;
  const white = (x: number, y: number, width: number, height: number) =>
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${WALLPAPER_PALETTE.cloud}"/>`;

  let svg = "";

  beforeAll(() => {
    svg = readPublic(WALLPAPER_TOGGLE_GLYPH);
  });

  it("exists where its constant points", () => {
    expect(WALLPAPER_TOGGLE_GLYPH).toBe("/icons/cloud.svg");
    expect(
      existsSync(join(process.cwd(), "public", WALLPAPER_TOGGLE_GLYPH)),
    ).toBe(true);
  });

  it("is a hand-made svg without scripts, links, embedded images, metadata or tool prefixes", () => {
    expectSafeSvg(svg);
  });

  it("measures 16 by 16 with crisp pixels, like the other small icons", () => {
    expect(rootAttributes(svg)).toEqual({
      xmlns: "http://www.w3.org/2000/svg",
      width: String(GLYPH_SIZE),
      height: String(GLYPH_SIZE),
      viewBox: GLYPH_VIEW_BOX,
      "shape-rendering": "crispEdges",
    });
  });

  it("is a white cloud closed by a black outline, in whole-pixel rects", () => {
    expectClosedOutline(paintGlyph(svg));
  });

  it("stands out on the gray taskbar thanks to the black outline", () => {
    expect(readComponent("Taskbar.tsx")).toContain(`bg-[${TASKBAR_GRAY}]`);
    expect(contrastRatio(GLYPH_BORDER, TASKBAR_GRAY)).toBeGreaterThanOrEqual(
      NON_TEXT_CONTRAST_MIN,
    );
  });

  it("accepts an outlined cloud and rejects open outlines, other shapes and other colors", () => {
    const outlined = black(2, 4, 12, 8) + white(3, 5, 10, 6);
    expect(() =>
      expectClosedOutline(paintGlyph(glyph(outlined))),
    ).not.toThrow();
    expect(() =>
      expectClosedOutline(paintGlyph(glyph(white(3, 5, 10, 6)))),
    ).toThrow();
    expect(() =>
      expectClosedOutline(
        paintGlyph(glyph(black(0, 4, 12, 8) + white(0, 5, 10, 6))),
      ),
    ).toThrow();
    expect(() =>
      paintGlyph(
        glyph(
          `${outlined}<circle cx="8" cy="8" r="2" fill="${GLYPH_BORDER}"/>`,
        ),
      ),
    ).toThrow();
    expect(() =>
      paintGlyph(glyph(outlined.replace(WALLPAPER_PALETTE.cloud, "#C0C0C0"))),
    ).toThrow();
    expect(() =>
      paintGlyph(glyph(black(2, 4, 12, 8) + white(3, 5, 10.5, 6))),
    ).toThrow();
    expect(() => paintGlyph(glyph(black(8, 4, 12, 8)))).toThrow();
  });
});

// RNF-1 caps the new drawings of spec 007 at 30 KB; counted as 30 000 bytes so
// it holds whichever way a kilobyte is read.
const NEW_SVG_BYTES_MAX = 30_000;
const NEW_SVGS = [
  WALLPAPER_SKY_SRC,
  WALLPAPER_CLOUDS_SRC,
  WALLPAPER_HILL_SRC,
  WALLPAPER_TOGGLE_GLYPH,
  CURSOR_ARROW_SRC,
  CURSOR_HAND_SRC,
];

describe("weight of the new drawings (RNF-1)", () => {
  it("counts the six new svg files, each one once", () => {
    expect(new Set(NEW_SVGS).size).toBe(6);
    for (const src of NEW_SVGS) expect(src).toMatch(/\.svg$/);
  });

  it(`keeps the six of them within ${NEW_SVG_BYTES_MAX} bytes`, () => {
    const total = NEW_SVGS.reduce(
      (sum, src) => sum + statSync(join(process.cwd(), "public", src)).size,
      0,
    );
    expect(total).toBeLessThanOrEqual(NEW_SVG_BYTES_MAX);
  });
});

describe("layer styles (RF-1, RF-4)", () => {
  it("move a fixed-width cloud tile inside a strip near the top", () => {
    expect(CLOUDS_LAYER_STYLE).toEqual({
      backgroundImage: `url("${WALLPAPER_CLOUDS_SRC}")`,
      backgroundSize: `${CLOUD_TILE_WIDTH}px 100%`,
      top: `${CLOUDS_TOP_PERCENT}%`,
      height: `min(${CLOUD_TILE_HEIGHT}px, ${CLOUDS_HEIGHT_PERCENT}%)`,
      width: `calc(100% + ${CLOUD_TILE_WIDTH}px)`,
    });
  });

  it("give the hills their share of the desktop height", () => {
    expect(HILLS_LAYER_STYLE).toEqual({ height: `${HILLS_HEIGHT_PERCENT}%` });
  });

  it("fall back to the horizon color when a drawing does not load", () => {
    expect(WALLPAPER_FALLBACK_STYLE).toEqual({
      backgroundColor: WALLPAPER_PALETTE.skyBottom,
    });
  });
});

describe("layer geometry (RF-1, RF-3 b)", () => {
  it("keeps the cloud strip in the top third", () => {
    expect(CLOUDS_TOP_PERCENT).toBeGreaterThanOrEqual(0);
    expect(CLOUDS_TOP_PERCENT + CLOUDS_HEIGHT_PERCENT).toBeLessThanOrEqual(
      100 / 3,
    );
  });

  it("keeps the hills within the bottom 40 %", () => {
    expect(HILLS_HEIGHT_PERCENT).toBeGreaterThan(0);
    expect(HILLS_HEIGHT_PERCENT).toBeLessThanOrEqual(40);
  });

  it("ends the cloud strip above the hills, so no cloud passes behind them", () => {
    expect(CLOUDS_TOP_PERCENT + CLOUDS_HEIGHT_PERCENT).toBeLessThan(
      100 - HILLS_HEIGHT_PERCENT,
    );
  });
});

const COMPONENTS_DIR = join(process.cwd(), "src", "components");

function readComponent(name: string): string {
  return readFileSync(join(COMPONENTS_DIR, name), "utf8");
}

describe("components in sync with the constants (plan 007, section 4)", () => {
  it("Wallpaper takes its colors, drawings, position and height from src/lib", () => {
    const wallpaper = readComponent("Wallpaper.tsx");
    expect(wallpaper).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    expect(wallpaper).not.toContain("/wallpaper/");
    expect(wallpaper).not.toContain("top-[");
    expect(wallpaper).not.toContain("h-[");
    expect(wallpaper).toContain("style={WALLPAPER_FALLBACK_STYLE}");
    expect(wallpaper).toContain("style={CLOUDS_LAYER_STYLE}");
    expect(wallpaper).toContain("style={HILLS_LAYER_STYLE}");
  });

  // Tailwind needs the literal in the class, so the test ties it to the constants (plan, D14).
  it("puts the translucent backing behind the title and the unselected labels (RF-11)", () => {
    const backing = `bg-[${LABEL_BACKING}]/${Math.round(LABEL_BACKING_ALPHA * 100)}`;
    expect(DESKTOP_TEXT).toBe("#FFFFFF");
    expect(readComponent("Desktop.tsx")).toContain(backing);
    expect(readComponent("Desktop.tsx")).toContain("text-white");
    expect(readComponent("DesktopIcon.tsx")).toContain(
      `max-w-full border border-transparent ${backing} px-1 break-words`,
    );
  });

  it("gives both kinds of icon the double focus ring (RF-12)", () => {
    const icon = readComponent("DesktopIcon.tsx");
    const outline = "focus-visible:outline-white";
    const shadow = `focus-visible:shadow-[0_0_0_6px_${FOCUS_RING_COLORS[1]}]`;
    expect(FOCUS_RING_COLORS[0]).toBe("#FFFFFF");
    expect(icon.split(outline)).toHaveLength(3);
    expect(icon.split(shadow)).toHaveLength(3);
  });

  it("leaves no component painting the old teal", () => {
    const components = readdirSync(COMPONENTS_DIR).filter((file) =>
      /\.tsx?$/.test(file),
    );
    expect(components).toContain("Desktop.tsx");
    for (const file of components) {
      expect(readComponent(file), file).not.toMatch(/#008080/i);
    }
  });
});

// The button has no logic of its own: these checks tie it to the window buttons, the glyph
// constant and the shell's state, which only the browser can watch at work (plan 007, section 6).
describe("the wallpaper button and its pause (RF-6 to RF-9)", () => {
  const PRESSED_BEVEL =
    "border-2 border-t-black border-r-white border-b-white border-l-black";
  const RAISED_BEVEL =
    "border-2 border-t-white border-r-black border-b-black border-l-white";
  const DOTTED_FOCUS =
    "focus-visible:outline-1 focus-visible:-outline-offset-3 focus-visible:outline-black focus-visible:outline-dotted";

  it("uses the glyph constant and its own two reliefs, sunken while paused", () => {
    const toggle = readComponent("WallpaperToggle.tsx");
    expect(toggle).toContain("src={WALLPAPER_TOGGLE_GLYPH}");
    expect(toggle).not.toContain("/icons/");
    expect(toggle.split(PRESSED_BEVEL)).toHaveLength(2);
    expect(toggle.split(RAISED_BEVEL)).toHaveLength(2);
    expect(toggle.indexOf(PRESSED_BEVEL)).toBeLessThan(
      toggle.indexOf(RAISED_BEVEL),
    );
    expect(toggle).toMatch(/className=\{\s*paused\s*\?/);
  });

  it("copies the bevels and the dotted focus of the icon-only window buttons", () => {
    const windowButtons = readComponent("TaskbarWindowButtons.tsx");
    const toggle = readComponent("WallpaperToggle.tsx");
    for (const shared of [PRESSED_BEVEL, RAISED_BEVEL, DOTTED_FOCUS]) {
      expect(windowButtons).toContain(shared);
    }
    expect(toggle.split(DOTTED_FOCUS)).toHaveLength(3);
    expect(toggle.split("bg-[#C0C0C0]")).toHaveLength(3);
    expect(toggle.split(" h-6 ")).toHaveLength(3);
    expect(toggle.split(" shrink-0 ")).toHaveLength(3);
  });

  it("is as wide as an icon-only window button", () => {
    const tailwindStep = 4;
    expect(TASKBAR_ICON_BUTTON_WIDTH).toBe(5 * tailwindStep);
    expect(readComponent("WallpaperToggle.tsx").split(" w-5 ")).toHaveLength(3);
  });

  it("names itself after the visitor's pause alone, with a held key toggling once", () => {
    const toggle = readComponent("WallpaperToggle.tsx");
    expect(toggle).toMatch(/paused \? resumeName : pauseName/);
    expect(toggle).toContain("title={name}");
    expect(toggle).toContain('<span className="sr-only">{name}</span>');
    expect(toggle).toMatch(/if \(event\.repeat\) event\.preventDefault\(\)/);
    expect(toggle).not.toContain("aria-pressed=");
    expect(toggle).not.toMatch(/prefers-reduced-motion|matchMedia/);
  });

  it("sits in the tray between the language switcher and the clock (RF-8)", () => {
    const taskbar = readComponent("Taskbar.tsx");
    const nav = taskbar.indexOf("</nav>");
    const button = taskbar.indexOf("{trayButton}");
    const clock = taskbar.indexOf("<Clock");
    expect(nav).toBeGreaterThan(-1);
    expect(button).toBeGreaterThan(nav);
    expect(clock).toBeGreaterThan(button);
  });

  it("keeps the pause in the shell, unpaused at first and wired to the wallpaper (RF-9)", () => {
    const shell = readComponent("DesktopShell.tsx");
    expect(shell).toMatch(
      /const \[wallpaperPaused, setWallpaperPaused\] = useState\(false\)/,
    );
    expect(shell).toContain("<Wallpaper paused={wallpaperPaused} />");
    expect(shell).toContain("paused={wallpaperPaused}");
    expect(shell).toContain("pauseName={desktopTexts.wallpaperPause}");
    expect(shell).toContain("resumeName={desktopTexts.wallpaperResume}");
    expect(shell).toContain("trayButton={");
  });

  // The browser applies the media query live, so the clouds freeze and resume where they
  // were without any script; the visitor's pause stays a separate class (plan 007, D5).
  it("freezes the clouds on reduced motion with or without the pause (RF-10)", () => {
    const wallpaper = readComponent("Wallpaper.tsx");
    const reduced = "motion-reduce:[animation-play-state:paused]";
    const branches = wallpaper.match(
      /className=\{\s*paused\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"\s*\}/,
    );
    expect(branches).not.toBeNull();
    const [, pausedClasses, movingClasses] = branches ?? [];
    for (const classes of [pausedClasses, movingClasses]) {
      expect(classes.split(" ")).toContain("animate-clouds");
      expect(classes.split(" ")).toContain(reduced);
    }
    expect(pausedClasses.split(" ")).toContain("[animation-play-state:paused]");
    expect(movingClasses.split(" ")).not.toContain(
      "[animation-play-state:paused]",
    );
    expect(wallpaper).not.toMatch(
      /matchMedia|prefers-reduced-motion|useReducedMotion|animate-none/,
    );
  });

  it("stores nothing in the browser (RF-9)", () => {
    for (const file of [
      "DesktopShell.tsx",
      "Taskbar.tsx",
      "Wallpaper.tsx",
      "WallpaperToggle.tsx",
    ]) {
      expect(readComponent(file), file).not.toMatch(
        /localStorage|sessionStorage|document\.cookie|indexedDB/,
      );
    }
  });
});
