import { describe, expect, it } from "vitest";
import { LAYOUT_MODE } from "@/lib/window-geometry";
import {
  TASKBAR_BUTTON_GAP,
  TASKBAR_BUTTON_VARIANT,
  TASKBAR_ICON_BUTTON_WIDTH,
  canDrag,
  canMaximize,
  iconOnlyRowWidth,
  isCloseKey,
  taskbarButtonVariant,
} from "@/lib/window-controls";

describe("isCloseKey", () => {
  it("accepts Escape", () => {
    expect(isCloseKey("Escape")).toBe(true);
  });

  it("rejects the legacy name, other casings and other keys", () => {
    expect(isCloseKey("Esc")).toBe(false);
    expect(isCloseKey("escape")).toBe(false);
    expect(isCloseKey("Enter")).toBe(false);
    expect(isCloseKey(" ")).toBe(false);
    expect(isCloseKey("")).toBe(false);
  });
});

describe("TASKBAR_BUTTON_VARIANT", () => {
  it("keeps the variants as their own names", () => {
    expect(TASKBAR_BUTTON_VARIANT).toEqual({
      labeled: "labeled",
      iconOnly: "iconOnly",
    });
  });
});

describe("taskbarButtonVariant", () => {
  it("is icon only in fullscreen, measured or not", () => {
    expect(taskbarButtonVariant(LAYOUT_MODE.fullscreen, null, null)).toBe(
      TASKBAR_BUTTON_VARIANT.iconOnly,
    );
    expect(taskbarButtonVariant(LAYOUT_MODE.fullscreen, 500, 100)).toBe(
      TASKBAR_BUTTON_VARIANT.iconOnly,
    );
  });

  it("is labeled in floating mode before measuring", () => {
    expect(taskbarButtonVariant(LAYOUT_MODE.floating, null, null)).toBe(
      TASKBAR_BUTTON_VARIANT.labeled,
    );
    expect(taskbarButtonVariant(LAYOUT_MODE.floating, 300, null)).toBe(
      TASKBAR_BUTTON_VARIANT.labeled,
    );
    expect(taskbarButtonVariant(LAYOUT_MODE.floating, null, 300)).toBe(
      TASKBAR_BUTTON_VARIANT.labeled,
    );
  });

  it("is labeled when the labeled buttons fit, also exactly", () => {
    expect(taskbarButtonVariant(LAYOUT_MODE.floating, 500, 300)).toBe(
      TASKBAR_BUTTON_VARIANT.labeled,
    );
    expect(taskbarButtonVariant(LAYOUT_MODE.floating, 300, 300)).toBe(
      TASKBAR_BUTTON_VARIANT.labeled,
    );
  });

  it("is icon only when the labeled buttons do not fit", () => {
    expect(taskbarButtonVariant(LAYOUT_MODE.floating, 300, 301)).toBe(
      TASKBAR_BUTTON_VARIANT.iconOnly,
    );
  });
});

describe("icon-only button sizes", () => {
  it("are 20 px wide with a 1 px gap", () => {
    expect(TASKBAR_ICON_BUTTON_WIDTH).toBe(20);
    expect(TASKBAR_BUTTON_GAP).toBe(1);
  });
});

describe("iconOnlyRowWidth", () => {
  it("is 0, 20 and 125 for 0, 1 and 6 windows", () => {
    expect(iconOnlyRowWidth(0)).toBe(0);
    expect(iconOnlyRowWidth(1)).toBe(20);
    expect(iconOnlyRowWidth(6)).toBe(125);
  });

  it("adds one gap between each pair of buttons", () => {
    expect(iconOnlyRowWidth(2)).toBe(41);
  });

  it("is 0 for a negative count", () => {
    expect(iconOnlyRowWidth(-1)).toBe(0);
  });
});

describe("canDrag", () => {
  it("drags a restored floating window with the primary button", () => {
    expect(canDrag(LAYOUT_MODE.floating, false, 0)).toBe(true);
  });

  it("does not drag a maximized window", () => {
    expect(canDrag(LAYOUT_MODE.floating, true, 0)).toBe(false);
  });

  it("does not drag in fullscreen, maximized or not", () => {
    expect(canDrag(LAYOUT_MODE.fullscreen, false, 0)).toBe(false);
    expect(canDrag(LAYOUT_MODE.fullscreen, true, 0)).toBe(false);
  });

  it("does not drag with the middle, secondary or other buttons", () => {
    expect(canDrag(LAYOUT_MODE.floating, false, 1)).toBe(false);
    expect(canDrag(LAYOUT_MODE.floating, false, 2)).toBe(false);
    expect(canDrag(LAYOUT_MODE.floating, false, 5)).toBe(false);
    expect(canDrag(LAYOUT_MODE.floating, false, -1)).toBe(false);
  });
});

describe("canMaximize", () => {
  it("offers maximize and restore in floating mode", () => {
    expect(canMaximize(LAYOUT_MODE.floating)).toBe(true);
  });

  it("offers neither in fullscreen", () => {
    expect(canMaximize(LAYOUT_MODE.fullscreen)).toBe(false);
  });
});
