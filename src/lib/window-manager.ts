import { WINDOW_IDS, type IconId, type WindowId } from "@/lib/desktop-catalog";
import {
  LAYOUT_MODE,
  fitRect,
  initialRect,
  layoutMode,
  type OccupiedZone,
  type Point,
  type Rect,
  type Size,
} from "@/lib/window-geometry";

export type WindowState = {
  id: WindowId;
  // Last floating rect; null means the window was never floating (opened in fullscreen).
  // Maximizing or switching to fullscreen never overwrites it (RF-11, RF-12).
  rect: Rect | null;
  // Initial floating position, the cascade base even after a move (RF-5); null together with rect.
  origin: Point | null;
  minimized: boolean;
  maximized: boolean;
};

export type WindowsState = {
  // Opening order: taskbar buttons and Tab (RF-10, RF-14).
  windows: readonly WindowState[];
  // Bottom to top, by last activation (RF-4).
  stack: readonly WindowId[];
  // null leaves every title bar grey (RF-4).
  active: WindowId | null;
};

export const NO_WINDOWS: WindowsState = {
  windows: [],
  stack: [],
  active: null,
};

const WINDOW_ID_SET: ReadonlySet<IconId> = new Set<IconId>(WINDOW_IDS);

export function isWindowId(id: IconId): id is WindowId {
  return WINDOW_ID_SET.has(id);
}

function raise(stack: readonly WindowId[], id: WindowId): readonly WindowId[] {
  return [...stack.filter((other) => other !== id), id];
}

function newWindow(
  state: WindowsState,
  id: WindowId,
  desktop: Size,
  zone: OccupiedZone,
): WindowState {
  if (layoutMode(desktop) === LAYOUT_MODE.fullscreen) {
    // A phone-sized rect would be useless back in floating mode; fitWindows sizes it then.
    return { id, rect: null, origin: null, minimized: false, maximized: false };
  }
  const lastOpened = state.windows.at(-1);
  const rect = initialRect(lastOpened?.origin ?? null, desktop, zone);
  return {
    id,
    rect,
    origin: { x: rect.x, y: rect.y },
    minimized: false,
    maximized: false,
  };
}

// zone is the icon column and the title, measured where they are painted: a new floating
// window opens beside the column and under the title (spec 012, RF-5).
export function openWindow(
  state: WindowsState,
  id: WindowId,
  desktop: Size,
  zone: OccupiedZone,
): WindowsState {
  const isOpen = state.windows.some((win) => win.id === id);
  if (!isOpen) {
    return {
      windows: [...state.windows, newWindow(state, id, desktop, zone)],
      stack: [...state.stack, id],
      active: id,
    };
  }
  return {
    windows: state.windows.map((win) =>
      win.id === id && win.minimized ? { ...win, minimized: false } : win,
    ),
    stack: raise(state.stack, id),
    active: id,
  };
}

export function activateWindow(
  state: WindowsState,
  id: WindowId,
): WindowsState {
  const target = state.windows.find((win) => win.id === id);
  if (target === undefined || target.minimized) {
    return state;
  }
  return { ...state, stack: raise(state.stack, id), active: id };
}

export function deactivateAll(state: WindowsState): WindowsState {
  return { ...state, active: null };
}

export function topVisibleWindow(state: WindowsState): WindowId | null {
  const minimized = new Set(
    state.windows.filter((win) => win.minimized).map((win) => win.id),
  );
  for (let index = state.stack.length - 1; index >= 0; index -= 1) {
    const id = state.stack[index];
    if (id !== undefined && !minimized.has(id)) {
      return id;
    }
  }
  return null;
}

export const FOCUS_TARGET = {
  window: "window",
  icon: "icon",
  taskbarButton: "taskbarButton",
} as const;

export type FocusTargetKind = (typeof FOCUS_TARGET)[keyof typeof FOCUS_TARGET];

export type FocusTarget = { kind: FocusTargetKind; id: WindowId };

// The component only maps the focus target to an element; where it goes is decided here (D2).
export type Transition = { state: WindowsState; focus: FocusTarget };

// After closing or minimizing, the top visible window takes over; without one, the
// focus falls back to the closed window's icon (RF-8) or its taskbar button (RF-9).
function handOverFocus(
  state: WindowsState,
  fallback: FocusTargetKind,
  id: WindowId,
): FocusTarget {
  const next = topVisibleWindow(state);
  return next === null
    ? { kind: fallback, id }
    : { kind: FOCUS_TARGET.window, id: next };
}

function handOver(
  state: WindowsState,
  fallback: FocusTargetKind,
  id: WindowId,
): Transition {
  return {
    state: { ...state, active: topVisibleWindow(state) },
    focus: handOverFocus(state, fallback, id),
  };
}

function findWindow(
  state: WindowsState,
  id: WindowId,
): WindowState | undefined {
  return state.windows.find((win) => win.id === id);
}

export function closeWindow(state: WindowsState, id: WindowId): Transition {
  if (findWindow(state, id) === undefined) {
    return { state, focus: handOverFocus(state, FOCUS_TARGET.icon, id) };
  }
  return handOver(
    {
      ...state,
      windows: state.windows.filter((win) => win.id !== id),
      stack: state.stack.filter((other) => other !== id),
    },
    FOCUS_TARGET.icon,
    id,
  );
}

export function minimizeWindow(state: WindowsState, id: WindowId): Transition {
  if (findWindow(state, id) === undefined) {
    return {
      state,
      focus: handOverFocus(state, FOCUS_TARGET.taskbarButton, id),
    };
  }
  return handOver(
    {
      ...state,
      windows: state.windows.map((win) =>
        win.id === id ? { ...win, minimized: true } : win,
      ),
    },
    FOCUS_TARGET.taskbarButton,
    id,
  );
}

export function pressTaskbarButton(
  state: WindowsState,
  id: WindowId,
): Transition {
  const target = findWindow(state, id);
  if (target === undefined) {
    // Without a window there is no button either: the focus stays where it was pressed.
    return { state, focus: { kind: FOCUS_TARGET.taskbarButton, id } };
  }
  if (state.active === id && !target.minimized) {
    return minimizeWindow(state, id);
  }
  return {
    state: {
      windows: state.windows.map((win) =>
        win === target && win.minimized ? { ...win, minimized: false } : win,
      ),
      stack: raise(state.stack, id),
      active: id,
    },
    focus: { kind: FOCUS_TARGET.window, id },
  };
}

export function toggleMaximize(
  state: WindowsState,
  id: WindowId,
): WindowsState {
  if (findWindow(state, id) === undefined) {
    return state;
  }
  return {
    windows: state.windows.map((win) =>
      win.id === id ? { ...win, maximized: !win.maximized } : win,
    ),
    stack: raise(state.stack, id),
    active: id,
  };
}

export function moveWindow(
  state: WindowsState,
  id: WindowId,
  from: Point,
  delta: Point,
  desktop: Size,
): WindowsState {
  const target = findWindow(state, id);
  if (target === undefined || target.rect === null || target.maximized) {
    return state;
  }
  const rect = fitRect(
    { ...target.rect, x: from.x + delta.x, y: from.y + delta.y },
    desktop,
  );
  return {
    ...state,
    windows: state.windows.map((win) =>
      win === target ? { ...win, rect } : win,
    ),
  };
}

// Floating rects survive fullscreen untouched, so going back recovers them (RF-12).
// A window that was never floating is placed as if it opened now, cascading
// after the previous one in opening order (RF-5); the rest are clamped (RF-7) and never
// move because the occupied zone grew: it only places windows as they open.
export function fitWindows(
  state: WindowsState,
  desktop: Size,
  zone: OccupiedZone,
): WindowsState {
  if (layoutMode(desktop) === LAYOUT_MODE.fullscreen) {
    return state;
  }
  let previousOrigin: Point | null = null;
  const windows = state.windows.map((win): WindowState => {
    if (win.rect === null) {
      const rect = initialRect(previousOrigin, desktop, zone);
      const origin: Point = { x: rect.x, y: rect.y };
      previousOrigin = origin;
      return { ...win, rect, origin };
    }
    previousOrigin = win.origin;
    return { ...win, rect: fitRect(win.rect, desktop) };
  });
  return { ...state, windows };
}
