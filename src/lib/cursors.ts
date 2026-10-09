export const CURSOR_ARROW_SRC = "/cursors/arrow.svg";
export const CURSOR_HAND_SRC = "/cursors/hand.svg";
// Hotspots in px of the drawing: the arrow's tip and the middle of the
// index fingertip (plan 007, section 7).
export const CURSOR_ARROW_HOTSPOT = { x: 0, y: 0 } as const;
export const CURSOR_HAND_HOTSPOT = { x: 7, y: 0 } as const;
// Chrome and Firefox only take an SVG cursor with an explicit size.
export const CURSOR_SIZE = 32;
// Screen px per "pixel" of each drawing (RF-3 c): the classic arrow in 1 by 1 px
// for a fine 45 degree side and leg (plan 007, D17), the hand in coarse 2 by 2 cells.
export const CURSOR_ARROW_CELL = 1;
export const CURSOR_HAND_CELL = 2;
