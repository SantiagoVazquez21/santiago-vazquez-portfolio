import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { contrastRatio, NON_TEXT_CONTRAST_MIN } from "@/lib/color-contrast";
import { CURSOR_ARROW_SRC, CURSOR_HAND_SRC } from "@/lib/cursors";
import { TASKBAR_ICON_BUTTON_WIDTH } from "@/lib/window-controls";
import {
  CLOUD_TILE_HEIGHT,
  CLOUD_TILE_WIDTH,
  CLOUDS_LAYER_STYLE,
  CLOUDS_TOP_PERCENT,
  DESKTOP_TEXT,
  FOCUS_RING_COLORS,
  focusRingContrast,
  HILL_FRONT_ANCHOR_PERCENT,
  HILL_RELIEF,
  HILL_TILE,
  HILLS_HEIGHT_PERCENT,
  HILLS_LAYER_STYLE,
  LABEL_BACKING,
  LABEL_BACKING_ALPHA,
  labelContrast,
  SKY_LAYER_STYLE,
  SKY_TILE,
  TEXT_CONTRAST_MIN,
  WALLPAPER_CLOUDS_SRC,
  WALLPAPER_FALLBACK_STYLE,
  WALLPAPER_HILL_BACK_SRC,
  WALLPAPER_HILL_SRC,
  WALLPAPER_PALETTE,
  WALLPAPER_PIXEL,
  WALLPAPER_SKY_SRC,
  WALLPAPER_TOGGLE_GLYPH,
} from "@/lib/wallpaper";
import * as wallpaperModule from "@/lib/wallpaper";
import {
  expectSafeSvg,
  parseElements,
  readPublic,
  rootAttributes,
  withoutDeclaration,
  XML_DECLARATION,
} from "./svg-checks";

const HEX_COLOR = /^#[0-9A-F]{6}$/;
const PALETTE_COLORS: readonly string[] = Object.values(WALLPAPER_PALETTE);
// Closed palette of the pixel art wallpaper (spec 012, RF-8).
const WALLPAPER_PALETTE_MAX = 10;

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

describe("constants", () => {
  it("use the closed pixel art palette (spec 012, plan section 5)", () => {
    expect(WALLPAPER_PALETTE).toEqual({
      skyTop: "#2F6FD0",
      skyHigh: "#4A86DA",
      skyMid: "#6A9FE3",
      skyLow: "#8BBAEC",
      skyBottom: "#A9D3F5",
      hillBack: "#3E8E2F",
      hill: "#5DB043",
      hillLight: "#7CC95A",
      cloudShade: "#E3EEF8",
      cloud: "#FFFFFF",
    });
  });

  it(`hold at most ${WALLPAPER_PALETTE_MAX} distinct colors (spec 012, RF-8)`, () => {
    expect(PALETTE_COLORS.length).toBeLessThanOrEqual(WALLPAPER_PALETTE_MAX);
    expect(new Set(PALETTE_COLORS).size).toBe(PALETTE_COLORS.length);
  });

  it("draw with 4 px pixels on tiles of whole pixels (spec 012, plan D4 and D5)", () => {
    expect(WALLPAPER_PIXEL).toBe(4);
    expect(SKY_TILE).toEqual({ width: 8, height: 480 });
    expect(HILL_TILE).toEqual({ width: 3840, height: 320 });
    expect(HILL_RELIEF).toBe(112);
    expect(HILL_FRONT_ANCHOR_PERCENT).toBe(75);
    expect(CLOUD_TILE_WIDTH).toBe(1600);
    expect(CLOUD_TILE_HEIGHT).toBe(128);
    for (const size of [
      SKY_TILE.width,
      SKY_TILE.height,
      HILL_TILE.width,
      HILL_TILE.height,
      HILL_RELIEF,
      CLOUD_TILE_WIDTH,
      CLOUD_TILE_HEIGHT,
    ]) {
      expect(Number.isInteger(size / WALLPAPER_PIXEL), String(size)).toBe(true);
    }
    expect(HILL_RELIEF).toBeLessThan(HILL_TILE.height);
  });

  it("no longer stretch the cloud strip to a share of the desktop (spec 012, D5)", () => {
    expect(wallpaperModule).not.toHaveProperty("CLOUDS_HEIGHT_PERCENT");
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

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const PIXEL_ART_ROOT_ATTRIBUTES = [
  "xmlns",
  "width",
  "height",
  "viewBox",
  "shape-rendering",
];
const PIXEL_ART_SHAPE_ATTRIBUTES: Record<string, readonly string[]> = {
  rect: ["x", "y", "width", "height", "fill"],
  path: ["d", "fill"],
};
const PIXEL_ART_REQUIRED_ATTRIBUTES: Record<string, readonly string[]> = {
  rect: ["width", "height", "fill"],
  path: ["d", "fill"],
};
const RECTILINEAR_ARITY: Record<string, number> = { M: 2, H: 1, V: 1, Z: 0 };
const WHOLE_NUMBER = /^\d+$/;

// Whole, non-negative and on the drawing grid, so every block is a square pixel.
function gridNumber(value: string | undefined, label: string): number {
  if (value === undefined || !WHOLE_NUMBER.test(value)) {
    throw new Error(`${label}="${value}" is not a whole number`);
  }
  const number = Number(value);
  if (number % WALLPAPER_PIXEL !== 0) {
    throw new Error(
      `${label}="${value}" is off the ${WALLPAPER_PIXEL} px grid`,
    );
  }
  return number;
}

// Absolute M, H, V and Z only, each with exactly its numbers: no curves, no
// diagonals and no relative moves that could leave the grid unnoticed.
function parseRectilinearPath(
  d: string,
): { command: string; numbers: number[] }[] {
  if (!/^[MHVZ\d\s,]+$/.test(d)) throw new Error(`Not rectilinear: ${d}`);
  const commands: { command: string; numbers: number[] }[] = [];
  for (const token of d.match(/[MHVZ]|\d+/g) ?? []) {
    if (token in RECTILINEAR_ARITY) {
      commands.push({ command: token, numbers: [] });
    } else {
      const current = commands.at(-1);
      if (current === undefined) throw new Error(`Number before command: ${d}`);
      current.numbers.push(gridNumber(token, "d"));
    }
  }
  if (commands[0]?.command !== "M")
    throw new Error(`Does not start with M: ${d}`);
  for (const { command, numbers } of commands) {
    if (numbers.length !== RECTILINEAR_ARITY[command]) {
      throw new Error(`${command} with ${numbers.length} numbers in ${d}`);
    }
  }
  return commands;
}

// Common rule of the pixel art layers (plan 012, section 5): fixed size, only
// filled blocks on the 4 px grid, the closed palette and the safety checks.
function expectPixelArt(svg: string): void {
  expectSafeSvg(svg);
  expectPaletteColors(svg);
  const [root, ...shapes] = parseElements(svg);
  expect(root.name).toBe("svg");
  expect(Object.keys(root.attributes).sort()).toEqual(
    [...PIXEL_ART_ROOT_ATTRIBUTES].sort(),
  );
  expect(root.attributes.xmlns).toBe(SVG_NAMESPACE);
  expect(root.attributes["shape-rendering"]).toBe("crispEdges");
  const width = gridNumber(root.attributes.width, "width");
  const height = gridNumber(root.attributes.height, "height");
  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
  expect(root.attributes.viewBox).toBe(`0 0 ${width} ${height}`);
  expect(shapes.length).toBeGreaterThan(0);
  for (const { name, attributes } of shapes) {
    const allowed = PIXEL_ART_SHAPE_ATTRIBUTES[name];
    if (allowed === undefined) throw new Error(`<${name}> in pixel art`);
    for (const attribute of Object.keys(attributes)) {
      expect(allowed, `${attribute} in <${name}>`).toContain(attribute);
    }
    for (const attribute of PIXEL_ART_REQUIRED_ATTRIBUTES[name]) {
      expect(attributes, `<${name}> without ${attribute}`).toHaveProperty(
        attribute,
      );
    }
    expect(PALETTE_COLORS).toContain(attributes.fill);
    if (name === "path") {
      parseRectilinearPath(attributes.d);
      continue;
    }
    for (const attribute of ["x", "y"]) {
      if (attributes[attribute] !== undefined) {
        gridNumber(attributes[attribute], attribute);
      }
    }
    expect(gridNumber(attributes.width, "width")).toBeGreaterThan(0);
    expect(gridNumber(attributes.height, "height")).toBeGreaterThan(0);
  }
}

describe("expectPixelArt, the common rule of the pixel art layers (spec 012)", () => {
  const { skyTop, skyBottom, hill } = WALLPAPER_PALETTE;
  const art = (
    shapes: string,
    root = `width="8" height="8" viewBox="0 0 8 8"`,
  ) =>
    `<svg xmlns="${SVG_NAMESPACE}" ${root} shape-rendering="crispEdges">${shapes}</svg>`;
  const valid = art(
    `<rect width="8" height="4" fill="${skyTop}"/>` +
      `<rect x="4" y="4" width="4" height="4" fill="${skyBottom}"/>` +
      `<path d="M0 8H8V4H4V8Z" fill="${hill}"/>`,
  );

  it("accepts filled blocks on the grid at the size of the viewBox", () => {
    expect(() => expectPixelArt(valid)).not.toThrow();
    expect(() => expectPixelArt(`${XML_DECLARATION}${valid}`)).not.toThrow();
  });

  it.each([
    ["a circle", art(`<circle cx="4" cy="4" r="4" fill="${skyTop}"/>`)],
    ["a curve", art(`<path d="M0 8C0 0 8 0 8 8Z" fill="${hill}"/>`)],
    [
      "a gradient",
      art(
        `<defs><linearGradient id="g"><stop offset="0" stop-color="${skyTop}"/></linearGradient></defs>` +
          `<rect width="8" height="8" fill="url(#g)"/>`,
      ),
    ],
    [
      "a stroke",
      art(
        `<rect width="8" height="8" fill="${skyTop}" stroke="${skyBottom}"/>`,
      ),
    ],
    [
      "preserveAspectRatio",
      valid.replace("<svg ", `<svg preserveAspectRatio="none" `),
    ],
    [
      "a width other than the viewBox",
      art(
        `<rect width="8" height="8" fill="${skyTop}"/>`,
        `width="16" height="8" viewBox="0 0 8 8"`,
      ),
    ],
    [
      "a size off the grid",
      art(
        `<rect width="6" height="6" fill="${skyTop}"/>`,
        `width="6" height="6" viewBox="0 0 6 6"`,
      ),
    ],
    [
      "a coordinate off the grid",
      art(`<rect x="2" width="4" height="4" fill="${skyTop}"/>`),
    ],
    ["a path point off the grid", art(`<path d="M0 8H6V4Z" fill="${hill}"/>`)],
    ["a diagonal", art(`<path d="M0 8L8 0V8Z" fill="${hill}"/>`)],
    ["a relative move", art(`<path d="M0 8h8v-4Z" fill="${hill}"/>`)],
    ["a fraction", art(`<rect width="4.0" height="4" fill="${skyTop}"/>`)],
    [
      "a color outside the palette",
      art(`<rect width="8" height="8" fill="#123456"/>`),
    ],
    ["a block without fill", art(`<rect width="8" height="8"/>`)],
    ["a group", art(`<g><rect width="8" height="8" fill="${skyTop}"/></g>`)],
    ["no crisp edges", valid.replace(` shape-rendering="crispEdges"`, "")],
    ["an empty drawing", art("")],
    [
      "a script",
      art(
        `<rect width="8" height="8" fill="${skyTop}"/><script>alert(1)</script>`,
      ),
    ],
  ])("rejects %s", (_case, svg) => {
    expect(() => expectPixelArt(svg)).toThrow();
  });
});

const WALLPAPER_DRAWINGS = [
  WALLPAPER_SKY_SRC,
  WALLPAPER_CLOUDS_SRC,
  WALLPAPER_HILL_SRC,
  WALLPAPER_HILL_BACK_SRC,
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

const SKY_TONES: readonly string[] = [
  WALLPAPER_PALETTE.skyTop,
  WALLPAPER_PALETTE.skyHigh,
  WALLPAPER_PALETTE.skyMid,
  WALLPAPER_PALETTE.skyLow,
  WALLPAPER_PALETTE.skyBottom,
];
const SKY_BANDS_MIN = 3;
const SKY_BANDS_MAX = 5;
const SKY_COLUMNS = SKY_TILE.width / WALLPAPER_PIXEL;
const SKY_ROWS = SKY_TILE.height / WALLPAPER_PIXEL;

type SkyBand = { top: number; bottom: number; fill: string };
type SkyCell = string | undefined;

// Full-width rects are the bands and 4 by 4 rects the dithering. Every rect is
// painted on the pixel grid in document order, so a dithering block hidden
// under a later band does not count.
function readSky(svg: string): { bands: SkyBand[]; grid: SkyCell[][] } {
  const bands: SkyBand[] = [];
  const grid: SkyCell[][] = Array.from({ length: SKY_ROWS }, () =>
    Array.from({ length: SKY_COLUMNS }, (): SkyCell => undefined),
  );
  for (const { name, attributes } of parseElements(svg).slice(1)) {
    if (name !== "rect") throw new Error(`<${name}> in the sky`);
    const [x, y, width, height] = ["x", "y", "width", "height"].map((key) =>
      Number(attributes[key] ?? "0"),
    );
    const isBand = x === 0 && width === SKY_TILE.width;
    const isDither = width === WALLPAPER_PIXEL && height === WALLPAPER_PIXEL;
    if (!isBand && !isDither) {
      throw new Error(`Rect ${width}x${height} at ${x},${y} in the sky`);
    }
    if (y + height > SKY_TILE.height || x + width > SKY_TILE.width) {
      throw new Error(`Rect at ${x},${y} leaves the sky tile`);
    }
    if (isBand)
      bands.push({ top: y, bottom: y + height, fill: attributes.fill });
    for (let row = y; row < y + height; row += WALLPAPER_PIXEL) {
      for (let column = x; column < x + width; column += WALLPAPER_PIXEL) {
        grid[row / WALLPAPER_PIXEL][column / WALLPAPER_PIXEL] = attributes.fill;
      }
    }
  }
  return { bands, grid };
}

// Two rows of a checkerboard in the two tones: repeated sideways, the tile
// turns them into a dithered seam instead of a hard line or stripes (plan 012, D4).
function isChecker(grid: SkyCell[][], row: number, tones: string[]): boolean {
  const [left, right] = grid[row];
  const [nextLeft, nextRight] = grid[row + 1] ?? [];
  return (
    left !== right &&
    [left, right].every((cell) => cell !== undefined && tones.includes(cell)) &&
    nextLeft === right &&
    nextRight === left
  );
}

// 3 to 5 bands from skyTop down to skyBottom covering the whole tile, with a
// dithered seam between each pair (plan 012, section 5).
function expectDitheredSky(svg: string): void {
  const { bands, grid } = readSky(svg);
  expect(bands.length).toBeGreaterThanOrEqual(SKY_BANDS_MIN);
  expect(bands.length).toBeLessThanOrEqual(SKY_BANDS_MAX);
  expect(bands[0].top).toBe(0);
  expect(bands.at(-1)?.bottom).toBe(SKY_TILE.height);
  expect(bands[0].fill).toBe(WALLPAPER_PALETTE.skyTop);
  expect(bands.at(-1)?.fill).toBe(WALLPAPER_PALETTE.skyBottom);
  for (let index = 1; index < bands.length; index++) {
    const [above, below] = [bands[index - 1], bands[index]];
    expect(below.top, `band ${index}`).toBe(above.bottom);
    expect(SKY_TONES.indexOf(below.fill), `band ${index}`).toBeGreaterThan(
      SKY_TONES.indexOf(above.fill),
    );
    const tones = [above.fill, below.fill];
    const rows: number[] = [];
    for (
      let row = above.top / WALLPAPER_PIXEL;
      row < below.bottom / WALLPAPER_PIXEL - 1;
      row++
    ) {
      rows.push(row);
    }
    expect(
      rows.some((row) => isChecker(grid, row, tones)),
      `dithering between bands ${index - 1} and ${index}`,
    ).toBe(true);
  }
  for (const [row, cells] of grid.entries()) {
    expect(
      cells.every((cell) => cell !== undefined),
      `row ${row}`,
    ).toBe(true);
  }
}

describe("expectDitheredSky, the rule of the sky tile (spec 012, D4)", () => {
  const { skyTop, skyMid, skyBottom } = WALLPAPER_PALETTE;
  const band = (y: number, height: number, fill: string) =>
    `<rect y="${y}" width="${SKY_TILE.width}" height="${height}" fill="${fill}"/>`;
  const dot = (x: number, y: number, fill: string) =>
    `<rect x="${x}" y="${y}" width="4" height="4" fill="${fill}"/>`;
  const sky = (shapes: string) =>
    `<svg xmlns="${SVG_NAMESPACE}" width="${SKY_TILE.width}" height="${SKY_TILE.height}" viewBox="0 0 ${SKY_TILE.width} ${SKY_TILE.height}" shape-rendering="crispEdges">${shapes}</svg>`;
  const bands =
    band(0, 160, skyTop) + band(160, 160, skyMid) + band(320, 160, skyBottom);
  const seams =
    dot(0, 152, skyMid) +
    dot(4, 156, skyMid) +
    dot(0, 312, skyBottom) +
    dot(4, 316, skyBottom);

  it("accepts bands with a checkerboard between each pair", () => {
    expect(() => expectDitheredSky(sky(bands + seams))).not.toThrow();
    expect(() => expectPixelArt(sky(bands + seams))).not.toThrow();
  });

  it.each([
    ["bands without dithering", sky(bands)],
    [
      "vertical stripes instead of a checkerboard",
      sky(
        bands +
          dot(0, 152, skyMid) +
          dot(0, 156, skyMid) +
          dot(0, 312, skyBottom) +
          dot(0, 316, skyBottom),
      ),
    ],
    ["dithering hidden under a later band", sky(seams + bands)],
    ["only two bands", sky(band(0, 240, skyTop) + band(240, 240, skyBottom))],
    [
      "bands out of order",
      sky(
        band(0, 160, skyMid) +
          band(160, 160, skyTop) +
          band(320, 160, skyBottom) +
          seams,
      ),
    ],
    [
      "a gap between bands",
      sky(
        band(0, 152, skyTop) +
          band(160, 160, skyMid) +
          band(320, 160, skyBottom) +
          seams,
      ),
    ],
    [
      "a block of another size",
      sky(
        bands + seams + `<rect y="40" width="4" height="8" fill="${skyMid}"/>`,
      ),
    ],
  ])("rejects %s", (_case, svg) => {
    expect(() => expectDitheredSky(svg)).toThrow();
  });
});

describe("sky.svg, pixel art (spec 012, RF-8)", () => {
  let sky = "";

  beforeAll(() => {
    sky = readPublic(WALLPAPER_SKY_SRC);
  });

  it("is pixel art at the size of its tile", () => {
    expectPixelArt(sky);
    expect(rootAttributes(sky)).toMatchObject({
      width: String(SKY_TILE.width),
      height: String(SKY_TILE.height),
    });
  });

  it(`has ${SKY_BANDS_MIN} to ${SKY_BANDS_MAX} bands from skyTop to skyBottom, dithered between each pair`, () => {
    expectDitheredSky(sky);
  });

  it("ends in the fallback color, so the plain sky below the tile continues it", () => {
    expect(readSky(sky).bands.at(-1)?.fill).toBe(
      WALLPAPER_FALLBACK_STYLE.backgroundColor,
    );
  });
});

// A hill path holds at most this many commands, so it stays a hand-sized drawing.
const HILL_COMMANDS_MAX = 400;
// The front peak may miss the anchor by this much and still land in the right
// third of a 320 px screen (plan 012, section 5).
const FRONT_PEAK_TOLERANCE = 24;
// Middle of the back hill's top plateau, which keeps it in the left third of a
// 320 px screen.
const BACK_PEAK_RANGE = { min: 32, max: 96 } as const;
const SCREEN_WIDTHS = [320, 360, 800, 1280, 1920, 2560, 3840];

type Tread = { from: number; to: number; y: number };

// A hill is the area under a staircase: up from the bottom left corner, then
// alternating V and H rightwards to the right edge and straight down. Its treads,
// the horizontal runs of its top edge, are all the composition needs.
function hillProfile(d: string): Tread[] {
  const commands = parseRectilinearPath(d);
  if (commands.length > HILL_COMMANDS_MAX) {
    throw new Error(`${commands.length} commands in a hill`);
  }
  const [start, ...steps] = commands;
  if (start.numbers.join(" ") !== `0 ${HILL_TILE.height}`) {
    throw new Error(`Hill starting at ${start.numbers.join(",")}`);
  }
  const close = steps
    .splice(-2)
    .map(({ command, numbers }) => `${command}${numbers.join(" ")}`)
    .join("");
  if (close !== `V${HILL_TILE.height}Z`) {
    throw new Error(`Hill closing with ${close}`);
  }
  const treads: Tread[] = [];
  let x = 0;
  let y: number = HILL_TILE.height;
  for (let index = 0; index < steps.length; index += 2) {
    const [rise, run] = [steps[index], steps[index + 1]];
    if (rise?.command !== "V" || run?.command !== "H") {
      throw new Error(`Expected V then H at step ${index} of ${d}`);
    }
    const [nextY] = rise.numbers;
    const [nextX] = run.numbers;
    if (nextY === y || nextY >= HILL_TILE.height) {
      throw new Error(`Step to y=${nextY} at x=${x}`);
    }
    if (nextX <= x) throw new Error(`Run back to x=${nextX}`);
    treads.push({ from: x, to: nextX, y: nextY });
    [x, y] = [nextX, nextY];
  }
  if (x !== HILL_TILE.width) throw new Error(`Hill ending at x=${x}`);
  return treads;
}

function topAt(treads: readonly Tread[], x: number): number {
  const tread = treads.find(({ from, to }) => from <= x && x < to);
  if (tread === undefined) throw new Error(`No hill at x=${x}`);
  return tread.y;
}

// The peak is the middle of the highest tread; two treads at that height would
// leave the hill without a single peak.
function summit(treads: readonly Tread[]): Tread {
  const top = Math.min(...treads.map(({ y }) => y));
  const highest = treads.filter(({ y }) => y === top);
  if (highest.length !== 1) {
    throw new Error(`${highest.length} plateaus at y=${top}`);
  }
  return highest[0];
}

function middle({ from, to }: Tread): number {
  return (from + to) / 2;
}

// Where a CSS background placed at a percentage starts: the leftover width
// times that percentage, negative when the drawing is wider than the screen.
function frontOffset(screenWidth: number): number {
  return ((screenWidth - HILL_TILE.width) * HILL_FRONT_ANCHOR_PERCENT) / 100;
}

// Pixel centers of the screen columns from `from` to `to`, so a background
// shifted by half a pixel never lands on a tread boundary.
function columns(from: number, to: number): number[] {
  return Array.from(
    { length: to - from },
    (_column, index) => from + index + 0.5,
  );
}

describe("hillProfile, the rule of the hill outlines (spec 012)", () => {
  const H = HILL_TILE.height;
  const W = HILL_TILE.width;

  it("reads the treads of a staircase from the left edge to the right one", () => {
    expect(hillProfile(`M0 ${H}V100H2000V40H2100V100H${W}V${H}Z`)).toEqual([
      { from: 0, to: 2000, y: 100 },
      { from: 2000, to: 2100, y: 40 },
      { from: 2100, to: W, y: 100 },
    ]);
  });

  it.each([
    ["a start away from the bottom left corner", `M0 100H${W}V${H}Z`],
    ["a run going back", `M0 ${H}V100H2000V40H1000V100H${W}V${H}Z`],
    ["two runs in a row", `M0 ${H}V100H2000H${W}V${H}Z`],
    ["a step to the same height", `M0 ${H}V100H2000V100H${W}V${H}Z`],
    ["a gap down to the bottom", `M0 ${H}V100H2000V${H}H2100V100H${W}V${H}Z`],
    ["an outline short of the right edge", `M0 ${H}V100H3000V${H}Z`],
    ["a second contour", `M0 ${H}V100H${W}V${H}ZM0 ${H}V200H40V${H}Z`],
    ["an open outline", `M0 ${H}V100H${W}V${H}`],
    ["a curve", `M0 ${H}C0 0 ${W} 0 ${W} ${H}Z`],
    [
      `more than ${HILL_COMMANDS_MAX} commands`,
      `M0 ${H}` +
        Array.from(
          { length: HILL_COMMANDS_MAX / 2 },
          (_step, index) =>
            `V${index % 2 === 0 ? 100 : 104}H${index === HILL_COMMANDS_MAX / 2 - 1 ? W : (index + 1) * 4}`,
        ).join("") +
        `V${H}Z`,
    ],
  ])("rejects %s", (_case, d) => {
    expect(() => hillProfile(d)).toThrow();
  });

  it("finds a single highest plateau and rejects two at the same height", () => {
    const peaked = hillProfile(`M0 ${H}V100H2000V40H2100V100H${W}V${H}Z`);
    expect(summit(peaked)).toEqual({ from: 2000, to: 2100, y: 40 });
    expect(middle(summit(peaked))).toBe(2050);
    const twin = hillProfile(`M0 ${H}V40H200V100H2000V40H2100V100H${W}V${H}Z`);
    expect(() => summit(twin)).toThrow();
  });
});

describe("hill.svg and hill-back.svg, pixel art (spec 012, RF-8 and RF-9)", () => {
  let front = "";
  let back = "";
  let frontTreads: Tread[] = [];
  let backTreads: Tread[] = [];

  const paths = (svg: string) =>
    parseElements(svg)
      .slice(1)
      .map(({ name, attributes }) => {
        if (name !== "path") throw new Error(`<${name}> in a hill`);
        return attributes;
      });

  beforeAll(() => {
    front = readPublic(WALLPAPER_HILL_SRC);
    back = readPublic(WALLPAPER_HILL_BACK_SRC);
    frontTreads = hillProfile(paths(front)[0].d);
    backTreads = hillProfile(paths(back)[0].d);
  });

  it("are pixel art at the size of their tile", () => {
    expect(WALLPAPER_HILL_BACK_SRC).toBe("/wallpaper/hill-back.svg");
    for (const svg of [front, back]) {
      expectPixelArt(svg);
      expect(rootAttributes(svg)).toMatchObject({
        width: String(HILL_TILE.width),
        height: String(HILL_TILE.height),
      });
    }
  });

  it("draw the back hill in hillBack and the front one in hill, with an optional hillLight rim on top", () => {
    expect(paths(back).map(({ fill }) => fill)).toEqual([
      WALLPAPER_PALETTE.hillBack,
    ]);
    expect([
      [WALLPAPER_PALETTE.hill],
      [WALLPAPER_PALETTE.hill, WALLPAPER_PALETTE.hillLight],
    ]).toContainEqual(paths(front).map(({ fill }) => fill));
  });

  it(`write every path as a single contour of at most ${HILL_COMMANDS_MAX} commands`, () => {
    for (const { d } of [...paths(front), ...paths(back)]) {
      const commands = parseRectilinearPath(d);
      expect(commands.filter(({ command }) => command === "M")).toHaveLength(1);
      expect(commands.length).toBeLessThanOrEqual(HILL_COMMANDS_MAX);
      expect(commands.at(-1)?.command).toBe("Z");
    }
  });

  it("cover the whole tile from edge to edge and down to the bottom", () => {
    for (const treads of [frontTreads, backTreads]) {
      expect(treads[0].from).toBe(0);
      expect(treads.at(-1)?.to).toBe(HILL_TILE.width);
      for (const { y } of treads) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(HILL_TILE.height);
      }
    }
  });

  it(`put the front peak within ${FRONT_PEAK_TOLERANCE} px of the share where its layer is anchored`, () => {
    const anchor = (HILL_TILE.width * HILL_FRONT_ANCHOR_PERCENT) / 100;
    expect(anchor).toBe(2880);
    expect(Math.abs(middle(summit(frontTreads)) - anchor)).toBeLessThanOrEqual(
      FRONT_PEAK_TOLERANCE,
    );
  });

  it(`put the back peak between x = ${BACK_PEAK_RANGE.min} and x = ${BACK_PEAK_RANGE.max}`, () => {
    const peak = middle(summit(backTreads));
    expect(peak).toBeGreaterThanOrEqual(BACK_PEAK_RANGE.min);
    expect(peak).toBeLessThanOrEqual(BACK_PEAK_RANGE.max);
  });

  it("paint the back hill darker than the front one", () => {
    expect(contrastRatio(WALLPAPER_PALETTE.hillBack, "#000000")).toBeLessThan(
      contrastRatio(WALLPAPER_PALETTE.hill, "#000000"),
    );
  });

  it.each(SCREEN_WIDTHS)(
    "at %i px keep the whole front plateau in view, its middle in the right third",
    (width) => {
      const plateau = summit(frontTreads);
      const offset = frontOffset(width);
      expect(plateau.from + offset).toBeGreaterThanOrEqual(0);
      expect(plateau.to + offset).toBeLessThanOrEqual(width);
      expect(middle(plateau) + offset).toBeGreaterThan((width * 2) / 3);
    },
  );

  it.each(SCREEN_WIDTHS)(
    "at %i px show the front plateau against the sky, above the back hill",
    (width) => {
      const plateau = summit(frontTreads);
      const offset = frontOffset(width);
      for (const x of columns(
        Math.floor(plateau.from + offset),
        Math.ceil(plateau.to + offset),
      )) {
        expect(topAt(backTreads, x), `column ${x}`).toBeGreaterThan(plateau.y);
      }
    },
  );

  it.each(SCREEN_WIDTHS)(
    "at %i px keep the back peak in the left third, its plateau above the front hill",
    (width) => {
      const plateau = summit(backTreads);
      const offset = frontOffset(width);
      expect(middle(plateau)).toBeLessThan(width / 3);
      expect(plateau.to).toBeLessThanOrEqual(width);
      for (const x of columns(plateau.from, plateau.to)) {
        expect(topAt(frontTreads, x - offset), `column ${x}`).toBeGreaterThan(
          plateau.y,
        );
      }
    },
  );

  it.each(SCREEN_WIDTHS)(
    `at %i px reach within ${HILL_RELIEF} px of the top in every column, so a cut layer stays green edge to edge`,
    (width) => {
      const offset = frontOffset(width);
      for (const x of columns(0, width)) {
        expect(
          Math.min(topAt(backTreads, x), topAt(frontTreads, x - offset)),
          `column ${x}`,
        ).toBeLessThanOrEqual(HILL_RELIEF);
      }
    },
  );
});

// Seven clouds, as in the tile of spec 007, each one drawn over its own base.
const CLOUD_PAIRS = 7;
// Horizontal middles of the seven clouds of spec 007, kept so the sky does not
// rearrange itself (plan 012, section 5).
const CLOUD_CENTERS = [150, 380, 600, 820, 1040, 1280, 1490];
const CLOUD_CENTER_TOLERANCE = 40;

type Segment = { vertical: boolean; at: number; from: number; to: number };

function touches(a: Segment, b: Segment): boolean {
  if (a.vertical === b.vertical) {
    return a.at === b.at && a.from <= b.to && b.from <= a.to;
  }
  const [vertical, horizontal] = a.vertical ? [a, b] : [b, a];
  return (
    horizontal.from <= vertical.at &&
    vertical.at <= horizontal.to &&
    vertical.from <= horizontal.at &&
    horizontal.at <= vertical.to
  );
}

// A single M, then H and V turning at every corner, and a Z that closes on a
// straight line without crossing the outline: one simple block shape, with no
// loose parts and no holes (spec 012, RF-8).
function cloudOutline(d: string): Segment[] {
  const commands = parseRectilinearPath(d);
  const moves = commands.filter(({ command }) => command === "M").length;
  if (moves !== 1) throw new Error(`${moves} M in ${d}`);
  if (commands.at(-1)?.command !== "Z") throw new Error(`Open outline: ${d}`);
  const [start, ...steps] = commands.slice(0, -1);
  let point = { x: start.numbers[0], y: start.numbers[1] };
  const points = [point];
  for (const { command, numbers } of steps) {
    if (command === "H") point = { x: numbers[0], y: point.y };
    else if (command === "V") point = { x: point.x, y: numbers[0] };
    else throw new Error(`${command} inside ${d}`);
    points.push(point);
  }
  const segments = points.map((from, index): Segment => {
    const to = points[(index + 1) % points.length];
    if (from.x !== to.x && from.y !== to.y) {
      throw new Error(`Diagonal close in ${d}`);
    }
    if (from.x === to.x && from.y === to.y) {
      throw new Error(`Empty side in ${d}`);
    }
    const vertical = from.x === to.x;
    const [a, b] = vertical ? [from.y, to.y] : [from.x, to.x];
    return {
      vertical,
      at: vertical ? from.x : from.y,
      from: Math.min(a, b),
      to: Math.max(a, b),
    };
  });
  const count = segments.length;
  segments.forEach((segment, index) => {
    if (segment.vertical === segments[(index + 1) % count].vertical) {
      throw new Error(`No turn after side ${index} in ${d}`);
    }
    for (let other = index + 2; other < count; other++) {
      if (index === 0 && other === count - 1) continue;
      if (touches(segment, segments[other])) {
        throw new Error(`Sides ${index} and ${other} meet in ${d}`);
      }
    }
  });
  return segments;
}

function expectInsideCloudTile(segments: readonly Segment[]): void {
  for (const { vertical, at, from, to } of segments) {
    const [across, along] = vertical
      ? [CLOUD_TILE_WIDTH, CLOUD_TILE_HEIGHT]
      : [CLOUD_TILE_HEIGHT, CLOUD_TILE_WIDTH];
    if (at > across || from < 0 || to > along) {
      throw new Error(`Side at ${at} from ${from} to ${to} leaves the tile`);
    }
  }
}

// Longest run of border two outlines have in common, so a base that only
// meets its cloud at a corner counts as loose.
function sharedEdge(a: readonly Segment[], b: readonly Segment[]): number {
  let longest = 0;
  for (const first of a) {
    for (const second of b) {
      if (first.vertical !== second.vertical || first.at !== second.at)
        continue;
      const overlap =
        Math.min(first.to, second.to) - Math.max(first.from, second.from);
      longest = Math.max(longest, overlap);
    }
  }
  return longest;
}

function outlineCenter(segments: readonly Segment[]): number {
  const xs = segments.flatMap(({ vertical, at, from, to }) =>
    vertical ? [at] : [from, to],
  );
  return (Math.min(...xs) + Math.max(...xs)) / 2;
}

// Rule of the cloud tile (plan 012, section 5): pixel art at the size of the
// tile, seven bases each followed by its cloud, every outline a single simple
// shape inside the tile, and each base sharing a stretch of border with its cloud.
function expectCloudTile(svg: string): Segment[][] {
  expectPixelArt(svg);
  expect(rootAttributes(svg)).toMatchObject({
    width: String(CLOUD_TILE_WIDTH),
    height: String(CLOUD_TILE_HEIGHT),
  });
  const shapes = parseElements(svg).slice(1);
  expect(shapes.map(({ name }) => name)).toEqual(
    Array.from({ length: CLOUD_PAIRS * 2 }, () => "path"),
  );
  expect(shapes.map(({ attributes }) => attributes.fill)).toEqual(
    Array.from({ length: CLOUD_PAIRS }, () => [
      WALLPAPER_PALETTE.cloudShade,
      WALLPAPER_PALETTE.cloud,
    ]).flat(),
  );
  const clouds: Segment[][] = [];
  for (let index = 0; index < shapes.length; index += 2) {
    const base = cloudOutline(shapes[index].attributes.d);
    const cloud = cloudOutline(shapes[index + 1].attributes.d);
    expectInsideCloudTile(base);
    expectInsideCloudTile(cloud);
    expect(
      sharedEdge(base, cloud),
      `cloud ${index / 2 + 1}`,
    ).toBeGreaterThanOrEqual(WALLPAPER_PIXEL);
    clouds.push(cloud);
  }
  return clouds;
}

describe("expectCloudTile, the rule of the cloud tile (spec 012)", () => {
  const { cloud, cloudShade, skyTop } = WALLPAPER_PALETTE;
  const tile = (shapes: string, height = CLOUD_TILE_HEIGHT) =>
    `<svg xmlns="${SVG_NAMESPACE}" width="${CLOUD_TILE_WIDTH}" height="${height}" viewBox="0 0 ${CLOUD_TILE_WIDTH} ${height}" shape-rendering="crispEdges">${shapes}</svg>`;
  const path = (d: string, fill: string) => `<path d="${d}" fill="${fill}"/>`;
  // A small cloud with its base right under it, moved by (dx, dy).
  const cloudD = (dx: number, dy = 0) =>
    `M${4 + dx} ${40 + dy}V${28 + dy}H${16 + dx}V${20 + dy}H${32 + dx}V${28 + dy}H${44 + dx}V${40 + dy}Z`;
  const baseD = (dx: number, dy = 0) =>
    `M${8 + dx} ${40 + dy}H${40 + dx}V${48 + dy}H${8 + dx}Z`;
  const pair = (dx: number, dy = 0) =>
    path(baseD(dx, dy), cloudShade) + path(cloudD(dx, dy), cloud);
  // `count` pairs, the last one replaced by `last`.
  const pairs = (count: number, last = pair(1200)) =>
    Array.from({ length: count - 1 }, (_pair, index) => pair(index * 200)).join(
      "",
    ) + last;
  const lastPair = (base: string, outline: string) =>
    tile(pairs(CLOUD_PAIRS, path(base, cloudShade) + path(outline, cloud)));
  const valid = tile(pairs(CLOUD_PAIRS));

  it("accepts seven clouds, each over a base that shares its bottom edge", () => {
    expect(() => expectCloudTile(valid)).not.toThrow();
    expect(() => expectCloudTile(`${XML_DECLARATION}${valid}`)).not.toThrow();
    expect(sharedEdge(cloudOutline(baseD(0)), cloudOutline(cloudD(0)))).toBe(
      32,
    );
  });

  it.each([
    ["six clouds", tile(pairs(6))],
    ["eight clouds", tile(pairs(8))],
    [
      "a cloud before its base",
      tile(
        pairs(
          CLOUD_PAIRS,
          path(cloudD(1200), cloud) + path(baseD(1200), cloudShade),
        ),
      ),
    ],
    [
      "a cloud in two pieces",
      lastPair(baseD(1200), `${cloudD(1200)}M1300 40V36H1304V40Z`),
    ],
    [
      "a base in two pieces",
      lastPair(`${baseD(1200)}M1300 40H1304V44H1300Z`, cloudD(1200)),
    ],
    [
      "a base that only meets its cloud at a corner",
      lastPair("M1244 40H1260V48H1244Z", cloudD(1200)),
    ],
    ["a base apart from its cloud", lastPair(baseD(1200, 12), cloudD(1200))],
    ["a cloud past the right edge", tile(pairs(CLOUD_PAIRS, pair(1580)))],
    ["a base past the bottom edge", tile(pairs(CLOUD_PAIRS, pair(1200, 84)))],
    ["an open outline", lastPair(baseD(1200), cloudD(1200).replace("Z", ""))],
    [
      "a diagonal close",
      lastPair(baseD(1200), "M1204 40V28H1216V20H1232V28H1244V36Z"),
    ],
    [
      "an outline that crosses itself",
      lastPair(baseD(1200), "M1204 40V20H1224V32H1212V12H1232V40Z"),
    ],
    [
      "a straight side split in two",
      lastPair(baseD(1200), "M1204 40V28H1216H1232V40Z"),
    ],
    [
      "a base drawn as a rect",
      tile(
        pairs(
          CLOUD_PAIRS,
          `<rect x="1208" y="40" width="32" height="8" fill="${cloudShade}"/>` +
            path(cloudD(1200), cloud),
        ),
      ),
    ],
    [
      "a cloud in another color",
      tile(
        pairs(
          CLOUD_PAIRS,
          path(baseD(1200), cloudShade) + path(cloudD(1200), skyTop),
        ),
      ),
    ],
    ["a tile of another height", tile(pairs(CLOUD_PAIRS), 240)],
  ])("rejects %s", (_case, svg) => {
    expect(() => expectCloudTile(svg)).toThrow();
  });
});

describe("clouds.svg, pixel art (spec 012, RF-8 and RF-9)", () => {
  it(`is a ${CLOUD_TILE_WIDTH} by ${CLOUD_TILE_HEIGHT} tile of seven compact clouds, each over its base`, () => {
    expectCloudTile(readPublic(WALLPAPER_CLOUDS_SRC));
  });

  it("keeps each cloud near its place along the tile in spec 007", () => {
    const clouds = expectCloudTile(readPublic(WALLPAPER_CLOUDS_SRC));
    clouds.forEach((cloud, index) => {
      expect(
        Math.abs(outlineCenter(cloud) - CLOUD_CENTERS[index]),
        `cloud ${index + 1}`,
      ).toBeLessThanOrEqual(CLOUD_CENTER_TOLERANCE);
    });
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

// RNF-1 caps the new drawings of spec 007 at 30 KB, and spec 012 (RNF-2) adds the
// back hill to the count; counted as 30 000 bytes so it holds whichever way a
// kilobyte is read.
const NEW_SVG_BYTES_MAX = 30_000;
const NEW_SVGS = [
  WALLPAPER_SKY_SRC,
  WALLPAPER_CLOUDS_SRC,
  WALLPAPER_HILL_SRC,
  WALLPAPER_HILL_BACK_SRC,
  WALLPAPER_TOGGLE_GLYPH,
  CURSOR_ARROW_SRC,
  CURSOR_HAND_SRC,
];

describe("weight of the new drawings (RNF-1)", () => {
  it("counts the seven new svg files, each one once", () => {
    expect(new Set(NEW_SVGS).size).toBe(7);
    for (const src of NEW_SVGS) expect(src).toMatch(/\.svg$/);
  });

  it(`keeps the seven of them within ${NEW_SVG_BYTES_MAX} bytes`, () => {
    const total = NEW_SVGS.reduce(
      (sum, src) => sum + statSync(join(process.cwd(), "public", src)).size,
      0,
    );
    expect(total).toBeLessThanOrEqual(NEW_SVG_BYTES_MAX);
  });
});

describe("layer styles (RF-1, RF-4)", () => {
  it("move the cloud tile at its own size in a strip as high as the tile, near the top (spec 012, D5)", () => {
    expect(CLOUDS_LAYER_STYLE).toEqual({
      backgroundImage: `url("${WALLPAPER_CLOUDS_SRC}")`,
      backgroundSize: `${CLOUD_TILE_WIDTH}px ${CLOUD_TILE_HEIGHT}px`,
      top: `${CLOUDS_TOP_PERCENT}%`,
      height: `${CLOUD_TILE_HEIGHT}px`,
      width: `calc(100% + ${CLOUD_TILE_WIDTH}px)`,
    });
    const { width, height } = rootAttributes(readPublic(WALLPAPER_CLOUDS_SRC));
    expect(CLOUDS_LAYER_STYLE.backgroundSize).toBe(`${width}px ${height}px`);
  });

  it.each([
    ["sky", SKY_LAYER_STYLE],
    ["clouds", CLOUDS_LAYER_STYLE],
    ["hills", HILLS_LAYER_STYLE],
  ])(
    "never stretch the %s to a share of the desktop (spec 012, D5)",
    (_layer, style) => {
      const size: unknown = Reflect.get(style, "backgroundSize");
      if (size === undefined) return;
      expect(size).toMatch(/^\d+px \d+px$/);
      expect(String(size)).not.toContain("%");
    },
  );

  it("repeat the sky tile sideways at its own size, from the top (spec 012, D5)", () => {
    expect(SKY_LAYER_STYLE).toEqual({
      backgroundImage: `url("${WALLPAPER_SKY_SRC}")`,
      backgroundRepeat: "repeat-x",
    });
  });

  it("stack both hills at their own size, the front one at its anchor and the back one on the left (spec 012, D5)", () => {
    expect(HILLS_LAYER_STYLE).toEqual({
      backgroundImage: `url("${WALLPAPER_HILL_SRC}"), url("${WALLPAPER_HILL_BACK_SRC}")`,
      backgroundPosition: `${HILL_FRONT_ANCHOR_PERCENT}% 0, 0 0`,
      backgroundRepeat: "no-repeat",
      height: `min(${HILL_TILE.height}px, ${HILLS_HEIGHT_PERCENT}%)`,
    });
  });

  it("fall back to the horizon color when a drawing does not load", () => {
    expect(WALLPAPER_FALLBACK_STYLE).toEqual({
      backgroundColor: WALLPAPER_PALETTE.skyBottom,
    });
  });
});

// Bottom of the cloud strip and top of the hills layer on a desktop this high.
function cloudsBottom(height: number): number {
  return (height * CLOUDS_TOP_PERCENT) / 100 + CLOUD_TILE_HEIGHT;
}

function hillsTop(height: number): number {
  return (
    height - Math.min(HILL_TILE.height, (height * HILLS_HEIGHT_PERCENT) / 100)
  );
}

describe("layer geometry (RF-1, RF-3 b)", () => {
  it("keeps the clouds in the top third of desktops from 440 to 2160 px high (spec 012, RF-9)", () => {
    expect(CLOUDS_TOP_PERCENT).toBeGreaterThanOrEqual(0);
    for (let height = 440; height <= 2160; height += WALLPAPER_PIXEL) {
      expect(cloudsBottom(height), `height ${height}`).toBeLessThanOrEqual(
        height / 3,
      );
    }
  });

  it("keeps the hills within the bottom 40 %", () => {
    expect(HILLS_HEIGHT_PERCENT).toBeGreaterThan(0);
    expect(HILLS_HEIGHT_PERCENT).toBeLessThanOrEqual(40);
  });

  it("keeps the fixed-size hills within the bottom 40 % of desktops 300 to 2160 px high (spec 012, RF-9)", () => {
    for (let height = 300; height <= 2160; height += WALLPAPER_PIXEL) {
      const hills = Math.min(
        HILL_TILE.height,
        (height * HILLS_HEIGHT_PERCENT) / 100,
      );
      expect(hills, `height ${height}`).toBeLessThanOrEqual(height * 0.4);
    }
  });

  it("ends the clouds above the hills on desktops 300 to 2160 px high, so no cloud passes behind them (spec 012, RF-9)", () => {
    for (let height = 300; height <= 2160; height += WALLPAPER_PIXEL) {
      expect(cloudsBottom(height), `height ${height}`).toBeLessThan(
        hillsTop(height),
      );
    }
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
    expect(wallpaper).toContain("style={SKY_LAYER_STYLE}");
    expect(wallpaper).not.toContain("WALLPAPER_SKY_SRC");
    expect(wallpaper).toContain("style={CLOUDS_LAYER_STYLE}");
    expect(wallpaper).toContain("style={HILLS_LAYER_STYLE}");
    expect(wallpaper).not.toContain("WALLPAPER_HILL_SRC");
    expect(wallpaper).not.toContain("<img");
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
