export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = Point & Size;

export const LAYOUT_MODE = {
  floating: "floating",
  fullscreen: "fullscreen",
} as const;
export type LayoutMode = (typeof LAYOUT_MODE)[keyof typeof LAYOUT_MODE];

export const FLOATING_MIN_SIZE: Size = { width: 640, height: 500 };
// At least TITLE_BAR_HEIGHT, so the title bar of the window below stays visible.
export const CASCADE_OFFSET = 32;
export const DEFAULT_WINDOW_SIZE: Size = { width: 720, height: 480 };
// Top frame plus title bar: the part that must never leave the desktop.
export const TITLE_BAR_HEIGHT = 32;
// Space under the title and the icons, and the smallest side margin (RF-5).
export const WINDOW_GAP = 16;
// Title bar, heading and notice without scrolling the body (RF-5; plan, section 6).
export const MIN_WINDOW_HEIGHT = 160;

export function layoutMode(desktop: Size): LayoutMode {
  return desktop.width < FLOATING_MIN_SIZE.width ||
    desktop.height < FLOATING_MIN_SIZE.height
    ? LAYOUT_MODE.fullscreen
    : LAYOUT_MODE.floating;
}

// Right edge of the icon column and bottom edge of the title, in px from the desktop's
// left and top edges (spec 012, RF-5).
export type OccupiedZone = { iconsRight: number; titleBottom: number };
// Narrowest window that opens beside the column instead of over it (spec 012, RF-6).
export const MIN_FREE_WIDTH = 480;

// The farthest of some edges, in px from the desktop's origin on the same axis. Both come
// in viewport coordinates; rounding up keeps a fraction of a pixel from being covered.
export function farthestEdge(edges: readonly number[], origin: number): number {
  if (edges.length === 0) return 0;
  return Math.max(0, Math.ceil(Math.max(...edges) - origin));
}

function firstColumn(
  desktop: Size,
  zone: OccupiedZone,
): Pick<Rect, "x" | "width"> {
  const freeLeft = zone.iconsRight + WINDOW_GAP;
  const freeWidth = desktop.width - freeLeft - WINDOW_GAP;
  if (freeWidth >= MIN_FREE_WIDTH) {
    const width = Math.min(DEFAULT_WINDOW_SIZE.width, freeWidth);
    return { x: freeLeft + Math.round((freeWidth - width) / 2), width };
  }
  // Too little room beside the column: centered on the whole desktop, over it (RF-6).
  const width = Math.min(
    DEFAULT_WINDOW_SIZE.width,
    desktop.width - 2 * WINDOW_GAP,
  );
  return { x: Math.round((desktop.width - width) / 2), width };
}

// Beside the icon column and under the title, or cascaded from the previous origin; each
// window takes the height left under its position, down to MIN_WINDOW_HEIGHT (spec 012,
// RF-5 to RF-7; spec 003, D1 option A). When not even that fits under the title, the lower
// edge wins: the window sits as low as possible, covering as little of the title as it
// can, with its title bar visible.
export function initialRect(
  previousOrigin: Point | null,
  desktop: Size,
  zone: OccupiedZone,
): Rect {
  const { x: firstX, width } = firstColumn(desktop, zone);
  const first: Point = {
    x: firstX,
    y: Math.max(
      0,
      Math.min(
        zone.titleBottom + WINDOW_GAP,
        desktop.height - MIN_WINDOW_HEIGHT,
      ),
    ),
  };
  const heightAt = (y: number) =>
    Math.min(DEFAULT_WINDOW_SIZE.height, desktop.height - y);
  if (previousOrigin !== null) {
    const cascaded: Point = {
      x: previousOrigin.x + CASCADE_OFFSET,
      y: previousOrigin.y + CASCADE_OFFSET,
    };
    // Left of or above the first position only when the zone grew since the previous
    // window opened; then the cascade would cover the column or the title.
    if (
      cascaded.y >= first.y &&
      cascaded.x >= first.x &&
      cascaded.x + width <= desktop.width &&
      heightAt(cascaded.y) >= MIN_WINDOW_HEIGHT
    ) {
      return { ...cascaded, width, height: heightAt(cascaded.y) };
    }
  }
  return { ...first, width, height: heightAt(first.y) };
}

function clamp(value: number, min: number, max: number): number {
  // The lower bound wins, so a desktop shorter than the title bar keeps y at 0.
  return Math.max(min, Math.min(value, max));
}

export function fitRect(rect: Rect, desktop: Size): Rect {
  const width = Math.min(rect.width, desktop.width);
  const height = Math.min(rect.height, desktop.height);
  return {
    x: clamp(rect.x, 0, desktop.width - width),
    y: clamp(rect.y, 0, desktop.height - TITLE_BAR_HEIGHT),
    width,
    height,
  };
}

export function windowFrame(
  rect: Rect | null,
  maximized: boolean,
  mode: LayoutMode,
  desktop: Size,
): Rect {
  if (rect === null || maximized || mode === LAYOUT_MODE.fullscreen) {
    return { x: 0, y: 0, width: desktop.width, height: desktop.height };
  }
  return rect;
}
