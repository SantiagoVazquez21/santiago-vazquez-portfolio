"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { AppWindow } from "@/components/AppWindow";
import { Desktop } from "@/components/Desktop";
import { Taskbar } from "@/components/Taskbar";
import { TaskbarWindowButtons } from "@/components/TaskbarWindowButtons";
import { Wallpaper } from "@/components/Wallpaper";
import { WallpaperToggle } from "@/components/WallpaperToggle";
import { WindowContent } from "@/components/WindowContent";
import type { PortfolioContent } from "@/content/types";
import type { Dictionary } from "@/i18n/types";
import type { IconId, WindowId } from "@/lib/desktop-catalog";
import type { Lang } from "@/lib/locale";
import { canDrag, canMaximize } from "@/lib/window-controls";
import {
  LAYOUT_MODE,
  layoutMode,
  occupiedBottom,
  windowFrame,
  type Point,
  type Size,
} from "@/lib/window-geometry";
import {
  FOCUS_TARGET,
  NO_WINDOWS,
  activateWindow,
  closeWindow,
  deactivateAll,
  fitWindows,
  minimizeWindow,
  moveWindow,
  openWindow,
  pressTaskbarButton,
  toggleMaximize,
  topVisibleWindow,
  type FocusTarget,
  type Transition,
  type WindowState,
  type WindowsState,
} from "@/lib/window-manager";

// from is the window's position and start the pointer's when the drag began.
type Drag = { id: WindowId; pointerId: number; from: Point; start: Point };

// The title sits above the icon grid, so the lowest icon closes the zone new windows open
// under (RF-5). Measured where it is painted: the rows change with the width and the font,
// and a scrolled icon area counts as seen (plan, section 6, "Posición inicial (T16)").
function measureOccupied(
  main: HTMLElement,
  icons: ReadonlyMap<IconId, HTMLElement>,
): number {
  return occupiedBottom(
    [...icons.values()].map((icon) => icon.getBoundingClientRect().bottom),
    main.getBoundingClientRect().top,
  );
}

type DesktopShellProps = {
  lang: Lang;
  home: Dictionary["home"];
  desktopTexts: Dictionary["desktop"];
  windowTexts: Dictionary["windows"];
  switcherTexts: Dictionary["switcher"];
  // Only the active language's content reaches the client (spec 004, RF-14).
  content: PortfolioContent;
  sectionTexts: Dictionary["sections"];
  contactTexts: Dictionary["contact"];
};

// Owns the window state, shared by the icons, the windows and the taskbar (plan, D1).
// Windows live only in this state, so a reload or the other language starts with none (RNF-3).
// <main> is the desktop of spec 003: the icon area and, above it, the window layer (plan, D5).
// The layer lets pointer events through, so outside a window clicks, taps and the wheel
// still reach the icons and the background as in spec 002; each window takes them back.
export function DesktopShell({
  lang,
  home,
  desktopTexts,
  windowTexts,
  switcherTexts,
  content,
  sectionTexts,
  contactTexts,
}: DesktopShellProps) {
  const [windows, setWindows] = useState<WindowsState>(NO_WINDOWS);
  // Shared by the wallpaper and its tray button; it lives with the page and is never stored,
  // apart from the Skills pause (spec 007, RF-9).
  const [wallpaperPaused, setWallpaperPaused] = useState(false);
  // Null until the first measurement; never read before hydration (plan, section 6).
  const [desktop, setDesktop] = useState<Size | null>(null);
  // A state-held Map keeps one instance across renders without reading a ref while rendering.
  const [iconElements] = useState(() => new Map<IconId, HTMLElement>());
  const [windowElements] = useState(() => new Map<WindowId, HTMLElement>());
  const [buttonElements] = useState(() => new Map<WindowId, HTMLElement>());
  const mainRef = useRef<HTMLElement>(null);
  // Set by a transition and applied once its render is committed (plan, D2).
  const pendingFocus = useRef<FocusTarget | null>(null);
  // Only the pointer that pressed the handle moves the window (plan, section 6).
  const drag = useRef<Drag | null>(null);

  // The mode follows the area left above the taskbar, which can grow taller (plan, D3).
  useEffect(() => {
    const main = mainRef.current;
    if (main === null) return;
    // Every measurement also clamps the windows: resizing the browser, turning the phone
    // or a taller taskbar keeps each title bar inside the desktop (RF-7, RF-12).
    const observer = new ResizeObserver(([entry]) => {
      const size: Size = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      // Read now, after layout, with the icon rows already rearranged for this size.
      const occupied = measureOccupied(main, iconElements);
      setDesktop(size);
      setWindows((current) => fitWindows(current, size, occupied));
    });
    observer.observe(main);
    return () => observer.disconnect();
  }, [iconElements]);

  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    // Without preventScroll the clipped window layer would scroll to reveal the whole window.
    if (target.kind === FOCUS_TARGET.window) {
      windowElements.get(target.id)?.focus({ preventScroll: true });
    } else if (target.kind === FOCUS_TARGET.icon) {
      // The icon's own focus handler selects it (RF-8); its area may scroll to show it.
      iconElements.get(target.id)?.focus();
    } else if (target.kind === FOCUS_TARGET.taskbarButton) {
      buttonElements.get(target.id)?.focus();
    }
  });

  // Without a measurement yet (a double click right at hydration), the desktop is measured
  // now instead of dropping the opening (plan, section 6).
  function measuredDesktop(): Size | null {
    if (desktop !== null) return desktop;
    const main = mainRef.current;
    if (main === null) return null;
    const size: Size = { width: main.clientWidth, height: main.clientHeight };
    setDesktop(size);
    return size;
  }

  function handleOpenWindow(id: WindowId) {
    const size = measuredDesktop();
    const main = mainRef.current;
    if (size === null || main === null) return;
    const occupied = measureOccupied(main, iconElements);
    setWindows((current) => openWindow(current, id, size, occupied));
    pendingFocus.current = { kind: FOCUS_TARGET.window, id };
  }

  function handleSelect() {
    setWindows((current) => deactivateAll(current));
  }

  function handleActivate(id: WindowId) {
    setWindows((current) => activateWindow(current, id));
  }

  // Each title button, taskbar button or Escape is its own event, already rendered after the pointerdown
  // or focus that activated the window, so the rendered state is the current one.
  function applyTransition(transition: Transition) {
    setWindows(transition.state);
    pendingFocus.current = transition.focus;
  }

  function handleMinimize(id: WindowId) {
    applyTransition(minimizeWindow(windows, id));
  }

  function handleToggleMaximize(id: WindowId) {
    setWindows((current) => toggleMaximize(current, id));
  }

  function handleClose(id: WindowId) {
    applyTransition(closeWindow(windows, id));
  }

  function handleTaskbarButton(id: WindowId) {
    applyTransition(pressTaskbarButton(windows, id));
  }

  // The window's own pointerdown has already activated it, raising it to the top (RF-6).
  // Capturing the pointer keeps the drag going when it leaves the handle.
  function handleDragStart(win: WindowState, event: PointerEvent<HTMLElement>) {
    if (win.rect === null || !canDrag(mode, win.maximized, event.button)) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: win.id,
      pointerId: event.pointerId,
      from: { x: win.rect.x, y: win.rect.y },
      start: { x: event.clientX, y: event.clientY },
    };
  }

  function handleDragMove(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    if (current === null || current.pointerId !== event.pointerId) return;
    // A turn to fullscreen mid-drag must not squeeze the floating rect to the phone.
    if (desktop === null || mode !== LAYOUT_MODE.floating) return;
    const delta: Point = {
      x: event.clientX - current.start.x,
      y: event.clientY - current.start.y,
    };
    setWindows((state) =>
      moveWindow(state, current.id, current.from, delta, desktop),
    );
  }

  function handleDragEnd(event: PointerEvent<HTMLElement>) {
    if (drag.current?.pointerId === event.pointerId) {
      drag.current = null;
    }
  }

  function registerWindow(id: WindowId) {
    return (element: HTMLElement | null) => {
      if (element === null) {
        windowElements.delete(id);
      } else {
        windowElements.set(id, element);
      }
    };
  }

  const mode = desktop === null ? LAYOUT_MODE.floating : layoutMode(desktop);
  const covered =
    mode === LAYOUT_MODE.fullscreen && topVisibleWindow(windows) !== null;

  return (
    <div className="flex h-dvh flex-col">
      <main ref={mainRef} className="relative min-h-0 flex-1">
        {/* First, so it stays under the icons and the windows (spec 007, RF-2). */}
        <Wallpaper paused={wallpaperPaused} />
        <Desktop
          home={home}
          texts={desktopTexts}
          iconElements={iconElements}
          inert={covered}
          onOpenWindow={handleOpenWindow}
          onSelect={handleSelect}
        />
        {/* Opening order gives the Tab order; the stack only sets zIndex (RF-4, RF-14). */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {desktop !== null &&
            windows.windows.map((win) => (
              <AppWindow
                key={win.id}
                id={win.id}
                title={desktopTexts.labels[win.id]}
                texts={windowTexts}
                frame={windowFrame(win.rect, win.maximized, mode, desktop)}
                zIndex={windows.stack.indexOf(win.id) + 1}
                active={windows.active === win.id}
                minimized={win.minimized}
                maximized={win.maximized}
                maximizable={canMaximize(mode)}
                elementRef={registerWindow(win.id)}
                onActivate={() => handleActivate(win.id)}
                onMinimize={() => handleMinimize(win.id)}
                onToggleMaximize={() => handleToggleMaximize(win.id)}
                onClose={() => handleClose(win.id)}
                onHandlePointerDown={(event) => handleDragStart(win, event)}
                onHandlePointerMove={handleDragMove}
                onHandlePointerEnd={handleDragEnd}
              >
                <WindowContent
                  id={win.id}
                  content={content}
                  texts={sectionTexts}
                  contactTexts={contactTexts}
                  onOpenWindow={handleOpenWindow}
                  layout={mode}
                />
              </AppWindow>
            ))}
        </div>
      </main>
      <Taskbar
        lang={lang}
        home={home}
        switcherTexts={switcherTexts}
        clockName={desktopTexts.clockName}
        compactTray={windows.windows.length > 0}
        trayButton={
          <WallpaperToggle
            paused={wallpaperPaused}
            pauseName={desktopTexts.wallpaperPause}
            resumeName={desktopTexts.wallpaperResume}
            onToggle={() => setWallpaperPaused((current) => !current)}
          />
        }
      >
        {/* Without open windows the taskbar stays exactly as in spec 002 (RF-13). */}
        {windows.windows.length > 0 && (
          <TaskbarWindowButtons
            ids={windows.windows.map((win) => win.id)}
            active={windows.active}
            mode={mode}
            labels={desktopTexts.labels}
            groupName={windowTexts.taskbarGroup}
            buttonElements={buttonElements}
            onPress={handleTaskbarButton}
          />
        )}
      </Taskbar>
    </div>
  );
}
