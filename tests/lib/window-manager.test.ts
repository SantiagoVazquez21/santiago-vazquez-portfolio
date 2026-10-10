import { describe, expect, it } from "vitest";
import {
  CONTACT_WINDOW_ID,
  DESKTOP_ICONS,
  type WindowId,
} from "@/lib/desktop-catalog";
import {
  CASCADE_OFFSET,
  DEFAULT_WINDOW_SIZE,
  TITLE_BAR_HEIGHT,
  type Point,
  type Rect,
  type Size,
} from "@/lib/window-geometry";
import {
  FOCUS_TARGET,
  NO_WINDOWS,
  activateWindow,
  closeWindow,
  deactivateAll,
  fitWindows,
  isWindowId,
  minimizeWindow,
  moveWindow,
  openWindow,
  pressTaskbarButton,
  toggleMaximize,
  topVisibleWindow,
  type WindowState,
  type WindowsState,
} from "@/lib/window-manager";

const LARGE_DESKTOP: Size = { width: 1280, height: 760 };
const PHONE_DESKTOP: Size = { width: 360, height: 700 };
// Title plus one row of icons at 1280×800, and the first position it gives (RF-5).
const ONE_ROW_BOTTOM = 186;
const FIRST: Point = { x: 280, y: 202 };
// Title plus two rows of icons at 800×600.
const TWO_ROWS_DESKTOP: Size = { width: 800, height: 560 };
const TWO_ROWS_BOTTOM = 284;

// Freezing the input makes any mutation throw, so "does not mutate" is checked everywhere.
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) {
      deepFreeze(inner);
    }
  }
  return value;
}

function openAll(
  ids: readonly WindowId[],
  desktop: Size,
  occupied = ONE_ROW_BOTTOM,
): WindowsState {
  return ids.reduce(
    (state, id) => deepFreeze(openWindow(state, id, desktop, occupied)),
    deepFreeze(NO_WINDOWS),
  );
}

function windowOf(state: WindowsState, id: WindowId): WindowState {
  const found = state.windows.find((win) => win.id === id);
  if (found === undefined) {
    throw new Error(`Window "${id}" is not open.`);
  }
  return found;
}

function withWindow(
  state: WindowsState,
  id: WindowId,
  change: Partial<WindowState>,
): WindowsState {
  return deepFreeze({
    ...state,
    windows: state.windows.map((win) =>
      win.id === id ? { ...win, ...change } : win,
    ),
  });
}

describe("NO_WINDOWS", () => {
  it("has no windows, an empty stack and no active window", () => {
    expect(NO_WINDOWS).toEqual({ windows: [], stack: [], active: null });
  });
});

describe("isWindowId", () => {
  it("is true exactly for the icons without a destination", () => {
    for (const entry of DESKTOP_ICONS) {
      expect(isWindowId(entry.id)).toBe(entry.href === null);
    }
  });

  it("covers the nine catalog ids", () => {
    expect(DESKTOP_ICONS.filter((entry) => isWindowId(entry.id))).toHaveLength(
      6,
    );
    expect(isWindowId("resume")).toBe(false);
    expect(isWindowId("github")).toBe(false);
    expect(isWindowId("linkedin")).toBe(false);
  });
});

describe("openWindow", () => {
  it("opens a new window as the active one, at the end of windows and stack", () => {
    const state = openAll(["projects"], LARGE_DESKTOP);
    expect(state).toEqual({
      windows: [
        {
          id: "projects",
          rect: { ...FIRST, width: 720, height: 480 },
          origin: FIRST,
          minimized: false,
          maximized: false,
        },
      ],
      stack: ["projects"],
      active: "projects",
    });
  });

  it("places the first window under the occupied zone it receives", () => {
    const empty = deepFreeze(NO_WINDOWS);
    expect(
      windowOf(openWindow(empty, "projects", LARGE_DESKTOP, 0), "projects")
        .rect,
    ).toEqual({ x: 280, y: 16, width: 720, height: 480 });
    expect(
      windowOf(openWindow(empty, "projects", LARGE_DESKTOP, 300), "projects")
        .rect,
    ).toEqual({ x: 280, y: 316, width: 720, height: 444 });
  });

  it("cascades the second window from the first one", () => {
    const state = openAll(["projects", "about"], LARGE_DESKTOP);
    expect(state.windows.map((win) => win.id)).toEqual(["projects", "about"]);
    expect(state.stack).toEqual(["projects", "about"]);
    expect(state.active).toBe("about");
    expect(windowOf(state, "about").rect).toEqual({
      x: FIRST.x + CASCADE_OFFSET,
      y: FIRST.y + CASCADE_OFFSET,
      width: 720,
      height: 480,
    });
    expect(windowOf(state, "about").origin).toEqual({ x: 312, y: 234 });
  });

  it("cascades from the origin of the last opened window even after it moved", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const moved = withWindow(opened, "about", {
      rect: { x: 400, y: 0, width: 720, height: 480 },
    });
    const state = openWindow(moved, "skills", LARGE_DESKTOP, ONE_ROW_BOTTOM);
    expect(windowOf(state, "skills").rect).toEqual({
      x: 344,
      y: 266,
      width: 720,
      height: 480,
    });
  });

  it("cascades from the last opened window even when it is minimized", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const minimized = withWindow(opened, "about", { minimized: true });
    const state = openWindow(
      minimized,
      "skills",
      LARGE_DESKTOP,
      ONE_ROW_BOTTOM,
    );
    expect(windowOf(state, "skills").origin).toEqual({ x: 344, y: 266 });
  });

  it("cascades from the last opened window, not from the active one", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const reactivated = deepFreeze(activateWindow(opened, "projects"));
    const state = openWindow(
      reactivated,
      "skills",
      LARGE_DESKTOP,
      ONE_ROW_BOTTOM,
    );
    expect(windowOf(state, "skills").origin).toEqual({ x: 344, y: 266 });
  });

  it("shrinks the later cascades and goes back to the first position when the cascade does not fit", () => {
    const state = openAll(
      ["projects", "about", "skills", "contact"],
      TWO_ROWS_DESKTOP,
      TWO_ROWS_BOTTOM,
    );
    expect(state.windows.map((win) => win.rect)).toEqual([
      { x: 40, y: 300, width: 720, height: 260 },
      { x: 72, y: 332, width: 720, height: 228 },
      { x: 40, y: 300, width: 720, height: 260 },
      { x: 72, y: 332, width: 720, height: 228 },
    ]);
    expect(state.windows.map((win) => win.origin)).toEqual([
      { x: 40, y: 300 },
      { x: 72, y: 332 },
      { x: 40, y: 300 },
      { x: 72, y: 332 },
    ]);
  });

  it("opens the six windows cascaded under one row of icons, the last ones shorter", () => {
    const state = openAll(
      ["projects", "about", "experience", "skills", "education", "contact"],
      LARGE_DESKTOP,
    );
    expect(state.windows.map((win) => win.rect)).toEqual([
      { x: 280, y: 202, width: 720, height: 480 },
      { x: 312, y: 234, width: 720, height: 480 },
      { x: 344, y: 266, width: 720, height: 480 },
      { x: 376, y: 298, width: 720, height: 462 },
      { x: 408, y: 330, width: 720, height: 430 },
      { x: 440, y: 362, width: 720, height: 398 },
    ]);
  });

  it("opens a window with a null rect and origin on a fullscreen desktop", () => {
    const state = openAll(["projects"], PHONE_DESKTOP);
    expect(state).toEqual({
      windows: [
        {
          id: "projects",
          rect: null,
          origin: null,
          minimized: false,
          maximized: false,
        },
      ],
      stack: ["projects"],
      active: "projects",
    });
  });

  it("uses the first position after a window opened in fullscreen", () => {
    const onPhone = openAll(["projects"], PHONE_DESKTOP);
    const state = openWindow(onPhone, "about", LARGE_DESKTOP, ONE_ROW_BOTTOM);
    expect(windowOf(state, "about").rect).toEqual({
      ...FIRST,
      width: 720,
      height: 480,
    });
  });

  it("does not duplicate an open window: raises it and makes it active", () => {
    const opened = openAll(["projects", "about", "skills"], LARGE_DESKTOP);
    const state = openWindow(opened, "projects", LARGE_DESKTOP, 400);
    expect(state.windows).toEqual(opened.windows);
    expect(state.stack).toEqual(["about", "skills", "projects"]);
    expect(state.active).toBe("projects");
  });

  it("restores a minimized window with its rect and its maximized flag", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const rect: Rect = { x: 300, y: 150, width: 720, height: 480 };
    const minimized = withWindow(opened, "projects", {
      rect,
      minimized: true,
      maximized: true,
    });
    const state = openWindow(minimized, "projects", LARGE_DESKTOP, 400);
    expect(windowOf(state, "projects")).toEqual({
      id: "projects",
      rect,
      origin: FIRST,
      minimized: false,
      maximized: true,
    });
    expect(state.stack).toEqual(["about", "projects"]);
    expect(state.active).toBe("projects");
  });

  it("reopening an open window from an inactive desktop makes it active", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const inactive = deepFreeze(deactivateAll(opened));
    const state = openWindow(inactive, "about", LARGE_DESKTOP, ONE_ROW_BOTTOM);
    expect(state.active).toBe("about");
    expect(state.stack).toEqual(["projects", "about"]);
  });
});

describe("activateWindow", () => {
  it("raises the window to the top without changing the others' order", () => {
    const opened = openAll(
      ["projects", "about", "skills", "contact"],
      LARGE_DESKTOP,
    );
    const state = activateWindow(opened, "about");
    expect(state.stack).toEqual(["projects", "skills", "contact", "about"]);
    expect(state.active).toBe("about");
    expect(state.windows).toEqual(opened.windows);
  });

  it("keeps everything when the window is already on top and active", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    expect(activateWindow(opened, "about")).toEqual(opened);
  });

  it("activates the top window after the desktop was deactivated", () => {
    const inactive = deepFreeze(
      deactivateAll(openAll(["projects", "about"], LARGE_DESKTOP)),
    );
    const state = activateWindow(inactive, "about");
    expect(state.active).toBe("about");
    expect(state.stack).toEqual(["projects", "about"]);
  });

  it("leaves a minimized window as it is", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const minimized = withWindow(opened, "projects", { minimized: true });
    expect(activateWindow(minimized, "projects")).toEqual(minimized);
  });

  it("leaves the state as it is for a window that is not open", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    expect(activateWindow(opened, "about")).toEqual(opened);
  });
});

describe("deactivateAll", () => {
  it("leaves no active window without touching order or rects", () => {
    const opened = openAll(["projects", "about", "skills"], LARGE_DESKTOP);
    const state = deactivateAll(opened);
    expect(state.active).toBeNull();
    expect(state.stack).toEqual(opened.stack);
    expect(state.windows).toEqual(opened.windows);
  });

  it("keeps an empty desktop empty", () => {
    expect(deactivateAll(deepFreeze(NO_WINDOWS))).toEqual(NO_WINDOWS);
  });
});

describe("topVisibleWindow", () => {
  it("is null without windows", () => {
    expect(topVisibleWindow(NO_WINDOWS)).toBeNull();
  });

  it("is the highest window of the stack", () => {
    const opened = openAll(["projects", "about", "skills"], LARGE_DESKTOP);
    expect(topVisibleWindow(activateWindow(opened, "projects"))).toBe(
      "projects",
    );
  });

  it("skips minimized windows", () => {
    const opened = openAll(["projects", "about", "skills"], LARGE_DESKTOP);
    const minimized = withWindow(opened, "skills", { minimized: true });
    expect(topVisibleWindow(minimized)).toBe("about");
  });

  it("does not depend on the active window", () => {
    const inactive = deactivateAll(
      openAll(["projects", "about"], LARGE_DESKTOP),
    );
    expect(topVisibleWindow(inactive)).toBe("about");
  });

  it("is null when every window is minimized", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const allMinimized = withWindow(
      withWindow(opened, "projects", { minimized: true }),
      "about",
      { minimized: true },
    );
    expect(topVisibleWindow(allMinimized)).toBeNull();
  });
});

describe("FOCUS_TARGET", () => {
  it("names the three places the focus can go", () => {
    expect(FOCUS_TARGET).toEqual({
      window: "window",
      icon: "icon",
      taskbarButton: "taskbarButton",
    });
  });
});

describe("closeWindow", () => {
  it("removes the window from windows and stack", () => {
    const opened = openAll(["projects", "about", "skills"], LARGE_DESKTOP);
    const { state } = closeWindow(opened, "about");
    expect(state.windows.map((win) => win.id)).toEqual(["projects", "skills"]);
    expect(state.stack).toEqual(["projects", "skills"]);
  });

  it("activates and focuses the top visible window when another one is left", () => {
    const opened = openAll(["projects", "about", "skills"], LARGE_DESKTOP);
    const { state, focus } = closeWindow(opened, "skills");
    expect(state.active).toBe("about");
    expect(focus).toEqual({ kind: FOCUS_TARGET.window, id: "about" });
  });

  it("skips minimized windows when choosing the next one", () => {
    const opened = openAll(["projects", "about", "skills"], LARGE_DESKTOP);
    const minimized = withWindow(opened, "about", { minimized: true });
    const { state, focus } = closeWindow(minimized, "skills");
    expect(state.active).toBe("projects");
    expect(focus).toEqual({ kind: FOCUS_TARGET.window, id: "projects" });
  });

  it("closing a window behind the active one keeps the top one active", () => {
    const opened = openAll(["projects", "about", "skills"], LARGE_DESKTOP);
    const { state, focus } = closeWindow(opened, "projects");
    expect(state.active).toBe("skills");
    expect(state.stack).toEqual(["about", "skills"]);
    expect(focus).toEqual({ kind: FOCUS_TARGET.window, id: "skills" });
  });

  it("sends the focus to the icon and leaves no active window when none is visible", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const minimized = withWindow(opened, "projects", { minimized: true });
    const { state, focus } = closeWindow(minimized, "about");
    expect(state.active).toBeNull();
    expect(state.windows.map((win) => win.id)).toEqual(["projects"]);
    expect(focus).toEqual({ kind: FOCUS_TARGET.icon, id: "about" });
  });

  it("closing the last window empties the desktop and focuses its icon", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    const { state, focus } = closeWindow(opened, "projects");
    expect(state).toEqual(NO_WINDOWS);
    expect(focus).toEqual({ kind: FOCUS_TARGET.icon, id: "projects" });
  });

  it("reopening a closed window gives a new, non-maximized window", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const changed = withWindow(opened, "about", {
      rect: { x: 400, y: 200, width: 720, height: 480 },
      maximized: true,
    });
    const closed = deepFreeze(closeWindow(changed, "about").state);
    const state = openWindow(closed, "about", LARGE_DESKTOP, ONE_ROW_BOTTOM);
    expect(windowOf(state, "about")).toEqual({
      id: "about",
      rect: { x: 312, y: 234, width: 720, height: 480 },
      origin: { x: 312, y: 234 },
      minimized: false,
      maximized: false,
    });
    expect(state.active).toBe("about");
  });
});

describe("minimizeWindow", () => {
  it("hides the window and keeps it open in the same order", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const { state } = minimizeWindow(opened, "about");
    expect(windowOf(state, "about").minimized).toBe(true);
    expect(state.windows.map((win) => win.id)).toEqual(["projects", "about"]);
    expect(state.stack).toEqual(opened.stack);
  });

  it("activates and focuses the top visible window when another one is left", () => {
    const opened = openAll(["projects", "about", "skills"], LARGE_DESKTOP);
    const { state, focus } = minimizeWindow(opened, "skills");
    expect(state.active).toBe("about");
    expect(focus).toEqual({ kind: FOCUS_TARGET.window, id: "about" });
  });

  it("sends the focus to its taskbar button and leaves no active window when none is visible", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const minimized = withWindow(opened, "projects", { minimized: true });
    const { state, focus } = minimizeWindow(minimized, "about");
    expect(state.active).toBeNull();
    expect(focus).toEqual({ kind: FOCUS_TARGET.taskbarButton, id: "about" });
  });

  it("keeps the rect and the maximized flag, so it comes back maximized", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    const maximized = deepFreeze(toggleMaximize(opened, "projects"));
    const { state } = minimizeWindow(maximized, "projects");
    expect(windowOf(state, "projects")).toEqual({
      ...windowOf(opened, "projects"),
      minimized: true,
      maximized: true,
    });
    const restored = pressTaskbarButton(deepFreeze(state), "projects").state;
    expect(windowOf(restored, "projects").maximized).toBe(true);
    expect(windowOf(restored, "projects").minimized).toBe(false);
  });
});

describe("pressTaskbarButton", () => {
  it("minimizes the active window", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const transition = pressTaskbarButton(opened, "about");
    expect(transition).toEqual(minimizeWindow(opened, "about"));
    expect(windowOf(transition.state, "about").minimized).toBe(true);
    expect(transition.focus).toEqual({
      kind: FOCUS_TARGET.window,
      id: "projects",
    });
  });

  it("minimizing the only visible window focuses its button", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    const { state, focus } = pressTaskbarButton(opened, "projects");
    expect(state.active).toBeNull();
    expect(focus).toEqual({
      kind: FOCUS_TARGET.taskbarButton,
      id: "projects",
    });
  });

  it("shows a minimized window on top, active and focused", () => {
    const opened = openAll(["projects", "about", "skills"], LARGE_DESKTOP);
    const minimized = withWindow(opened, "projects", { minimized: true });
    const { state, focus } = pressTaskbarButton(minimized, "projects");
    expect(windowOf(state, "projects").minimized).toBe(false);
    expect(windowOf(state, "projects").rect).toEqual(
      windowOf(opened, "projects").rect,
    );
    expect(state.stack).toEqual(["about", "skills", "projects"]);
    expect(state.active).toBe("projects");
    expect(focus).toEqual({ kind: FOCUS_TARGET.window, id: "projects" });
  });

  it("raises a window that is behind another one", () => {
    const opened = openAll(["projects", "about", "skills"], LARGE_DESKTOP);
    const { state, focus } = pressTaskbarButton(opened, "about");
    expect(state.windows).toEqual(opened.windows);
    expect(state.stack).toEqual(["projects", "skills", "about"]);
    expect(state.active).toBe("about");
    expect(focus).toEqual({ kind: FOCUS_TARGET.window, id: "about" });
  });

  it("activates the top window when no window is active instead of minimizing it", () => {
    const inactive = deepFreeze(
      deactivateAll(openAll(["projects", "about"], LARGE_DESKTOP)),
    );
    const { state, focus } = pressTaskbarButton(inactive, "about");
    expect(windowOf(state, "about").minimized).toBe(false);
    expect(state.stack).toEqual(["projects", "about"]);
    expect(state.active).toBe("about");
    expect(focus).toEqual({ kind: FOCUS_TARGET.window, id: "about" });
  });
});

describe("transitions on a window that is not open", () => {
  it("leave the same state object", () => {
    const inactive = deepFreeze(
      deactivateAll(openAll(["projects"], LARGE_DESKTOP)),
    );
    expect(closeWindow(inactive, "about").state).toBe(inactive);
    expect(minimizeWindow(inactive, "about").state).toBe(inactive);
    expect(pressTaskbarButton(inactive, "about").state).toBe(inactive);
  });
});

describe("toggleMaximize", () => {
  it("maximizes and restores keeping the rect intact", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const maximized = deepFreeze(toggleMaximize(opened, "projects"));
    expect(windowOf(maximized, "projects")).toEqual({
      ...windowOf(opened, "projects"),
      maximized: true,
    });
    const restored = toggleMaximize(maximized, "projects");
    expect(windowOf(restored, "projects")).toEqual(
      windowOf(opened, "projects"),
    );
  });

  it("activates and raises the window", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const state = toggleMaximize(opened, "projects");
    expect(state.stack).toEqual(["about", "projects"]);
    expect(state.active).toBe("projects");
  });

  it("does not touch the other windows", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const state = toggleMaximize(opened, "projects");
    expect(windowOf(state, "about")).toEqual(windowOf(opened, "about"));
  });

  it("leaves the state as it is for a window that is not open", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    expect(toggleMaximize(opened, "about")).toBe(opened);
  });
});

describe("moveWindow", () => {
  it("moves the window from its drag start by the pointer delta", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const state = moveWindow(
      opened,
      "projects",
      FIRST,
      { x: 100, y: 50 },
      LARGE_DESKTOP,
    );
    expect(windowOf(state, "projects").rect).toEqual({
      x: 380,
      y: 252,
      width: 720,
      height: 480,
    });
  });

  it("keeps the origin, the order, the active window and the other windows", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const state = moveWindow(
      opened,
      "projects",
      FIRST,
      { x: 100, y: 50 },
      LARGE_DESKTOP,
    );
    expect(windowOf(state, "projects").origin).toEqual(FIRST);
    expect(windowOf(state, "about")).toEqual(windowOf(opened, "about"));
    expect(state.stack).toEqual(opened.stack);
    expect(state.active).toBe(opened.active);
  });

  it("stops at the left and top edges, over the title and the icons", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    const state = moveWindow(
      opened,
      "projects",
      FIRST,
      { x: -500, y: -500 },
      LARGE_DESKTOP,
    );
    expect(windowOf(state, "projects").rect).toEqual({
      x: 0,
      y: 0,
      width: 720,
      height: 480,
    });
  });

  it("stops at the right edge and keeps the title bar above the taskbar", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    const state = moveWindow(
      opened,
      "projects",
      FIRST,
      { x: 5000, y: 5000 },
      LARGE_DESKTOP,
    );
    expect(windowOf(state, "projects").rect).toEqual({
      x: LARGE_DESKTOP.width - 720,
      y: LARGE_DESKTOP.height - TITLE_BAR_HEIGHT,
      width: 720,
      height: 480,
    });
  });

  it("ignores a maximized window", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    const maximized = deepFreeze(toggleMaximize(opened, "projects"));
    const state = moveWindow(
      maximized,
      "projects",
      FIRST,
      { x: 100, y: 50 },
      LARGE_DESKTOP,
    );
    expect(state).toBe(maximized);
  });

  it("ignores a window with a null rect", () => {
    const onPhone = openAll(["projects"], PHONE_DESKTOP);
    const state = moveWindow(
      onPhone,
      "projects",
      FIRST,
      { x: 100, y: 50 },
      LARGE_DESKTOP,
    );
    expect(state).toBe(onPhone);
  });

  it("ignores a window that is not open", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    const state = moveWindow(
      opened,
      "about",
      FIRST,
      { x: 100, y: 50 },
      LARGE_DESKTOP,
    );
    expect(state).toBe(opened);
  });
});

describe("fitWindows", () => {
  it("returns the same state on a fullscreen desktop, keeping the floating rects", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    expect(fitWindows(opened, PHONE_DESKTOP, ONE_ROW_BOTTOM)).toBe(opened);
    expect(
      fitWindows(opened, { width: 1280, height: 499 }, ONE_ROW_BOTTOM),
    ).toBe(opened);
  });

  it("leaves windows that already fit as they are", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    expect(fitWindows(opened, LARGE_DESKTOP, ONE_ROW_BOTTOM)).toEqual(opened);
  });

  it("does not move a window that already has a rect when the occupied zone grows", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    expect(fitWindows(opened, LARGE_DESKTOP, 500)).toEqual(opened);
  });

  it("shrinks a window larger than the desktop and moves it back inside", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    const moved = withWindow(opened, "projects", {
      rect: { x: 500, y: 300, width: 720, height: 480 },
    });
    const state = fitWindows(
      moved,
      { width: 680, height: 520 },
      ONE_ROW_BOTTOM,
    );
    expect(windowOf(state, "projects").rect).toEqual({
      x: 0,
      y: 300,
      width: 680,
      height: 480,
    });
  });

  it("brings a title bar left below the desktop back above the taskbar", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    const moved = withWindow(opened, "projects", {
      rect: { x: 200, y: 700, width: 720, height: 480 },
    });
    const desktop: Size = { width: 1000, height: 600 };
    expect(
      windowOf(fitWindows(moved, desktop, ONE_ROW_BOTTOM), "projects").rect,
    ).toEqual({
      x: 200,
      y: desktop.height - TITLE_BAR_HEIGHT,
      width: 720,
      height: 480,
    });
  });

  it("keeps the origins, the flags, the order and the active window", () => {
    const opened = openAll(["projects", "about", "skills"], LARGE_DESKTOP);
    const changed = withWindow(
      withWindow(opened, "projects", { maximized: true }),
      "about",
      { minimized: true },
    );
    const state = fitWindows(
      changed,
      { width: 700, height: 520 },
      ONE_ROW_BOTTOM,
    );
    expect(state.stack).toEqual(changed.stack);
    expect(state.active).toBe(changed.active);
    expect(state.windows.map((win) => win.id)).toEqual([
      "projects",
      "about",
      "skills",
    ]);
    expect(windowOf(state, "projects").maximized).toBe(true);
    expect(windowOf(state, "about").minimized).toBe(true);
    expect(state.windows.map((win) => win.origin)).toEqual(
      changed.windows.map((win) => win.origin),
    );
  });

  it("gives a window opened in fullscreen the default size at the first position", () => {
    const onPhone = openAll(["projects"], PHONE_DESKTOP);
    const state = fitWindows(onPhone, LARGE_DESKTOP, ONE_ROW_BOTTOM);
    expect(windowOf(state, "projects")).toEqual({
      id: "projects",
      rect: { ...FIRST, ...DEFAULT_WINDOW_SIZE },
      origin: FIRST,
      minimized: false,
      maximized: false,
    });
  });

  it("places a window opened in fullscreen under the occupied zone measured in this call", () => {
    const onPhone = openAll(["projects"], PHONE_DESKTOP, 0);
    const state = fitWindows(onPhone, LARGE_DESKTOP, 300);
    expect(windowOf(state, "projects").rect).toEqual({
      x: 280,
      y: 316,
      width: 720,
      height: 444,
    });
  });

  it("gives it what fits when the desktop is smaller than the default size", () => {
    const onPhone = openAll(["projects"], PHONE_DESKTOP);
    const desktop: Size = { width: 650, height: 500 };
    expect(
      windowOf(fitWindows(onPhone, desktop, 100), "projects").rect,
    ).toEqual({ x: 16, y: 116, width: 618, height: 384 });
  });

  it("cascades a window opened in fullscreen after the previous one in opening order", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    const state = fitWindows(
      deepFreeze(openWindow(opened, "about", PHONE_DESKTOP, ONE_ROW_BOTTOM)),
      LARGE_DESKTOP,
      ONE_ROW_BOTTOM,
    );
    expect(windowOf(state, "projects")).toEqual(windowOf(opened, "projects"));
    expect(windowOf(state, "about").rect).toEqual({
      x: 312,
      y: 234,
      width: 720,
      height: 480,
    });
    expect(windowOf(state, "about").origin).toEqual({ x: 312, y: 234 });
  });

  it("cascades from the origin of the previous window, not from where it was moved", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    const moved = withWindow(opened, "projects", {
      rect: { x: 400, y: 0, width: 720, height: 480 },
    });
    const state = fitWindows(
      deepFreeze(openWindow(moved, "about", PHONE_DESKTOP, ONE_ROW_BOTTOM)),
      LARGE_DESKTOP,
      ONE_ROW_BOTTOM,
    );
    expect(windowOf(state, "about").origin).toEqual({ x: 312, y: 234 });
  });

  it("restarts at the first position when the zone grew above the cascade", () => {
    const opened = openAll(["projects"], LARGE_DESKTOP);
    const state = fitWindows(
      deepFreeze(openWindow(opened, "about", PHONE_DESKTOP, ONE_ROW_BOTTOM)),
      LARGE_DESKTOP,
      400,
    );
    expect(windowOf(state, "projects")).toEqual(windowOf(opened, "projects"));
    expect(windowOf(state, "about").rect).toEqual({
      x: 280,
      y: 416,
      width: 720,
      height: 344,
    });
  });

  it("cascades windows opened in fullscreen between themselves", () => {
    const onPhone = openAll(["projects", "about", "skills"], PHONE_DESKTOP);
    const state = fitWindows(onPhone, LARGE_DESKTOP, ONE_ROW_BOTTOM);
    expect(state.windows.map((win) => win.rect)).toEqual([
      { x: 280, y: 202, width: 720, height: 480 },
      { x: 312, y: 234, width: 720, height: 480 },
      { x: 344, y: 266, width: 720, height: 480 },
    ]);
  });

  it("goes back to the first position when the cascade does not fit", () => {
    const onPhone = openAll(
      ["projects", "about", "skills", "contact"],
      PHONE_DESKTOP,
    );
    const state = fitWindows(onPhone, TWO_ROWS_DESKTOP, TWO_ROWS_BOTTOM);
    expect(state.windows.map((win) => win.origin)).toEqual([
      { x: 40, y: 300 },
      { x: 72, y: 332 },
      { x: 40, y: 300 },
      { x: 72, y: 332 },
    ]);
  });

  it("keeps the maximized flag of a window that never was floating", () => {
    const onPhone = openAll(["projects"], PHONE_DESKTOP);
    const maximized = deepFreeze(toggleMaximize(onPhone, "projects"));
    const state = fitWindows(maximized, LARGE_DESKTOP, ONE_ROW_BOTTOM);
    expect(windowOf(state, "projects").maximized).toBe(true);
    expect(windowOf(state, "projects").rect).toEqual({
      ...FIRST,
      ...DEFAULT_WINDOW_SIZE,
    });
  });

  it("leaves no window with a null rect or origin on a floating desktop", () => {
    const mixed = deepFreeze(
      openWindow(
        openAll(["projects", "about"], PHONE_DESKTOP),
        "skills",
        LARGE_DESKTOP,
        ONE_ROW_BOTTOM,
      ),
    );
    const state = fitWindows(mixed, LARGE_DESKTOP, ONE_ROW_BOTTOM);
    for (const win of state.windows) {
      expect(win.rect).not.toBeNull();
      expect(win.origin).not.toBeNull();
    }
  });

  it("recovers the last floating rects after a round trip through fullscreen", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const onPhone = deepFreeze(
      fitWindows(opened, PHONE_DESKTOP, ONE_ROW_BOTTOM),
    );
    expect(fitWindows(onPhone, LARGE_DESKTOP, 400)).toEqual(opened);
  });

  it("keeps an empty desktop empty", () => {
    expect(
      fitWindows(deepFreeze(NO_WINDOWS), LARGE_DESKTOP, ONE_ROW_BOTTOM),
    ).toEqual(NO_WINDOWS);
  });
});

describe("immutability", () => {
  it("returns new states and never mutates the one it receives", () => {
    const opened = openAll(["projects", "about"], LARGE_DESKTOP);
    const snapshot = structuredClone(opened);
    openWindow(opened, "skills", LARGE_DESKTOP, ONE_ROW_BOTTOM);
    openWindow(opened, "projects", LARGE_DESKTOP, ONE_ROW_BOTTOM);
    activateWindow(opened, "projects");
    deactivateAll(opened);
    topVisibleWindow(opened);
    closeWindow(opened, "about");
    minimizeWindow(opened, "about");
    pressTaskbarButton(opened, "about");
    pressTaskbarButton(opened, "projects");
    toggleMaximize(opened, "about");
    moveWindow(
      opened,
      "about",
      { x: 312, y: 234 },
      { x: 10, y: 10 },
      LARGE_DESKTOP,
    );
    fitWindows(opened, { width: 700, height: 520 }, ONE_ROW_BOTTOM);
    expect(opened).toEqual(snapshot);
  });
});

// Reuse of openWindow: these pass from the start, no new code (spec 010, T2).
describe("opening Contact from About (spec 010)", () => {
  it("adds Contact last, on top and active, leaving About untouched", () => {
    const withAbout = openAll(["about"], LARGE_DESKTOP);
    const next = openWindow(
      withAbout,
      CONTACT_WINDOW_ID,
      LARGE_DESKTOP,
      ONE_ROW_BOTTOM,
    );
    expect(next.windows.map((win) => win.id)).toEqual([
      "about",
      CONTACT_WINDOW_ID,
    ]);
    expect(next.stack).toEqual(["about", CONTACT_WINDOW_ID]);
    expect(next.active).toBe(CONTACT_WINDOW_ID);
    expect(windowOf(next, "about")).toEqual(windowOf(withAbout, "about"));
  });

  it("raises an open Contact under About without duplicating it or moving its rect", () => {
    const opened = openAll([CONTACT_WINDOW_ID, "about"], LARGE_DESKTOP);
    const next = openWindow(
      opened,
      CONTACT_WINDOW_ID,
      LARGE_DESKTOP,
      ONE_ROW_BOTTOM,
    );
    expect(
      next.windows.filter((win) => win.id === CONTACT_WINDOW_ID),
    ).toHaveLength(1);
    expect(next.stack).toEqual(["about", CONTACT_WINDOW_ID]);
    expect(next.active).toBe(CONTACT_WINDOW_ID);
    expect(windowOf(next, CONTACT_WINDOW_ID).rect).toEqual(
      windowOf(opened, CONTACT_WINDOW_ID).rect,
    );
    expect(windowOf(next, "about")).toEqual(windowOf(opened, "about"));
  });

  it("restores a minimized and maximized Contact, still maximized and with the same rect", () => {
    const opened = withWindow(
      openAll([CONTACT_WINDOW_ID, "about"], LARGE_DESKTOP),
      CONTACT_WINDOW_ID,
      { minimized: true, maximized: true },
    );
    const next = openWindow(
      opened,
      CONTACT_WINDOW_ID,
      LARGE_DESKTOP,
      ONE_ROW_BOTTOM,
    );
    const contact = windowOf(next, CONTACT_WINDOW_ID);
    expect(contact.minimized).toBe(false);
    expect(contact.maximized).toBe(true);
    expect(contact.rect).toEqual(windowOf(opened, CONTACT_WINDOW_ID).rect);
    expect(next.stack.at(-1)).toBe(CONTACT_WINDOW_ID);
    expect(next.active).toBe(CONTACT_WINDOW_ID);
  });

  it("keeps a single Contact when opened twice in a row", () => {
    const withAbout = openAll(["about"], LARGE_DESKTOP);
    const once = deepFreeze(
      openWindow(withAbout, CONTACT_WINDOW_ID, LARGE_DESKTOP, ONE_ROW_BOTTOM),
    );
    const twice = openWindow(
      once,
      CONTACT_WINDOW_ID,
      LARGE_DESKTOP,
      ONE_ROW_BOTTOM,
    );
    expect(
      twice.windows.filter((win) => win.id === CONTACT_WINDOW_ID),
    ).toHaveLength(1);
    expect(twice.stack.filter((id) => id === CONTACT_WINDOW_ID)).toHaveLength(
      1,
    );
    expect(twice).toEqual(once);
  });
});
