import { LAYOUT_MODE, type LayoutMode } from "@/lib/window-geometry";

const CLOSE_KEY = "Escape";

// Escape closes the window that holds the focus (RF-8).
export function isCloseKey(key: string): boolean {
  return key === CLOSE_KEY;
}

export const TASKBAR_BUTTON_VARIANT = {
  labeled: "labeled",
  iconOnly: "iconOnly",
} as const;
export type TaskbarButtonVariant =
  (typeof TASKBAR_BUTTON_VARIANT)[keyof typeof TASKBAR_BUTTON_VARIANT];

// available is the group's real width and labeled the width of the invisible labeled copy;
// null means not measured yet. Measuring the copy, not the group's overflow, keeps the
// choice from flipping back and forth (RF-13).
export function taskbarButtonVariant(
  mode: LayoutMode,
  available: number | null,
  labeled: number | null,
): TaskbarButtonVariant {
  if (mode === LAYOUT_MODE.fullscreen) return TASKBAR_BUTTON_VARIANT.iconOnly;
  if (available === null || labeled === null) {
    return TASKBAR_BUTTON_VARIANT.labeled;
  }
  return labeled > available
    ? TASKBAR_BUTTON_VARIANT.iconOnly
    : TASKBAR_BUTTON_VARIANT.labeled;
}

// 16 px glyph plus 2 px of bevel per side: the width that lets six fit at 320 px.
export const TASKBAR_ICON_BUTTON_WIDTH = 20;
export const TASKBAR_BUTTON_GAP = 1;

// Base width of the window-button group: what the open windows need as icon-only
// buttons, so the taskbar only makes room for windows that exist (RF-13).
export function iconOnlyRowWidth(count: number): number {
  if (count <= 0) return 0;
  return count * TASKBAR_ICON_BUTTON_WIDTH + (count - 1) * TASKBAR_BUTTON_GAP;
}

// PointerEvent.button for the mouse's left button, a touch contact and a pen tip.
const PRIMARY_BUTTON = 0;

// Only a restored window in floating mode follows the pointer (RF-6, RF-11, RF-12),
// and only with the primary button, so a right or middle click on the title just activates it.
export function canDrag(
  mode: LayoutMode,
  maximized: boolean,
  button: number,
): boolean {
  return (
    mode === LAYOUT_MODE.floating && !maximized && button === PRIMARY_BUTTON
  );
}

// In fullscreen every window already fills the desktop, so the title bar offers only
// minimize and close (RF-12); maximized stays stored for the way back to floating.
export function canMaximize(mode: LayoutMode): boolean {
  return mode === LAYOUT_MODE.floating;
}
