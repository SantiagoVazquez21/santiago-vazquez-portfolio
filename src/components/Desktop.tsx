"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import { DesktopIcon } from "@/components/DesktopIcon";
import type { Dictionary } from "@/i18n/types";
import {
  DESKTOP_ROWS,
  type DesktopIconEntry,
  type IconId,
  type WindowId,
} from "@/lib/desktop-catalog";
import { desktopIconRows, iconTexts } from "@/lib/desktop-icons";
import {
  INTENT,
  canOpen,
  clickIntent,
  keyIntent,
  nextSelection,
  recordOpen,
  type OpenLog,
  type Selection,
  type SelectionEvent,
} from "@/lib/desktop-selection";
import { isWindowId } from "@/lib/window-manager";

type DesktopProps = {
  home: Dictionary["home"];
  texts: Dictionary["desktop"];
  // Owned by DesktopShell, which moves focus back to an icon after closing a window (RF-8).
  iconElements: Map<IconId, HTMLElement>;
  // Owned by DesktopShell, which measures the title's bottom edge to open windows under it (spec 012, RF-5).
  titleRef: RefObject<HTMLDivElement | null>;
  // Fullscreen windows cover the icons: Tab and screen readers skip them (RF-12).
  inert: boolean;
  onOpenWindow: (id: WindowId) => void;
  // Selecting an icon or clicking the background leaves every window inactive (RF-4).
  onSelect: () => void;
};

// The area scrolls on its own so the taskbar, outside it, never covers the last icon (plan, D3).
// It fills <main> under the window layer, so windows never scroll with the icons (003 plan, D5).
// From sm (640 px, the floating-mode threshold) the title sits in a second column, centered
// beside the icons; below it, it stays above them. It comes first in the DOM because it takes
// no focus, so the first Tab still reaches Projects (spec 012, RF-2 and RF-3; plan 012, D2).
export function Desktop({
  home,
  texts,
  iconElements,
  titleRef,
  inert,
  onOpenWindow,
  onSelect,
}: DesktopProps) {
  const [selection, setSelection] = useState<Selection>(null);
  // Neither changes what is painted, so they live in refs, not in state.
  const openLog = useRef<OpenLog>({});
  // Read on pointerdown because Safari gives click no pointerType (plan, D6).
  const lastPointerType = useRef<string | null>(null);

  function updateSelection(event: SelectionEvent) {
    setSelection((current) => nextSelection(current, event));
    onSelect();
  }

  // A Map of elements instead of closest() or data-* attributes, which the text lint would flag (plan, D10).
  function registerIcon(id: IconId) {
    return (element: HTMLElement | null) => {
      if (element === null) {
        iconElements.delete(id);
      } else {
        iconElements.set(id, element);
      }
    };
  }

  function selectIcon(id: IconId) {
    updateSelection({ target: id, intent: INTENT.select });
  }

  function handleIconPointerDown(event: PointerEvent<HTMLElement>) {
    lastPointerType.current = event.pointerType;
  }

  // A mouse click only selects; a tap, Enter or the click replayed by a double click opens.
  // Opening lets the native activation through, so the new tab comes from the visitor's
  // gesture and the popup blocker lets it be (RF-4, RF-6, plan section 4).
  function handleIconClick(
    entry: DesktopIconEntry,
    event: MouseEvent<HTMLElement>,
  ) {
    const intent = clickIntent(lastPointerType.current, event.detail);
    updateSelection({ target: entry.id, intent });
    if (intent !== INTENT.open) {
      event.preventDefault();
      return;
    }
    // Window icons open their window, after the selection above left all inactive (003 RF-1, RF-4).
    if (entry.href === null) {
      if (isWindowId(entry.id)) onOpenWindow(entry.id);
      return;
    }
    const now = Date.now();
    // Swallows the second tap of a double tap, per icon so another icon still opens (D5).
    if (!canOpen(openLog.current, entry.id, now)) {
      event.preventDefault();
      return;
    }
    openLog.current = recordOpen(openLog.current, entry.id, now);
  }

  // A touch double tap already opened on its first tap; only a pointer whose clicks merely
  // select gets the double click turned into an opening click (detail 0).
  function handleIconDoubleClick(event: MouseEvent<HTMLElement>) {
    if (clickIntent(lastPointerType.current, event.detail) === INTENT.select) {
      event.currentTarget.click();
    }
  }

  // Space would scroll the area when the icon is a link; it selects instead (RF-10).
  // A held Enter repeats keydown and each repeat would activate the icon again (RF-6).
  function handleIconKeyDown(id: IconId, event: KeyboardEvent<HTMLElement>) {
    if (keyIntent(event.key, event.repeat) === INTENT.select) {
      event.preventDefault();
      selectIcon(id);
    } else if (event.repeat && keyIntent(event.key, false) === INTENT.open) {
      event.preventDefault();
    }
  }

  // Any point of the area outside an icon counts as background, title and grid gaps included.
  // The taskbar and the window layer are outside this area, so their clicks never reach it (RF-5).
  function handleAreaClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const icons = [...iconElements.values()];
    if (icons.some((icon) => icon.contains(target))) return;
    updateSelection({ target: null });
    const active = document.activeElement;
    if (active instanceof HTMLElement && icons.includes(active)) {
      active.blur();
    }
  }

  return (
    <div
      onClick={handleAreaClick}
      inert={inert}
      className="absolute inset-0 overflow-y-auto px-4 py-6 text-white sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-start sm:gap-x-6"
    >
      {/* Two equal 1fr tracks centre the title on the whole desktop; the first one never
          shrinks below the column, so on narrow screens the title moves right instead of
          covering an icon (spec 012, RF-3, change 1). */}
      <div
        ref={titleRef}
        className="mx-auto w-fit max-w-full bg-[#0A246A]/75 px-3 py-1 text-center break-words text-shadow-[1px_1px_0_#000] sm:col-start-2 sm:row-start-1"
      >
        <h1 className="text-2xl font-bold">{home.name}</h1>
        <p>{home.role}</p>
      </div>
      {/* The rows are the DOM order, so Tab and screen readers go row by row (spec 012, RF-2). */}
      <div
        role="group"
        aria-label={texts.groupName}
        className="mt-6 flex w-fit max-w-full flex-col gap-4 sm:col-start-1 sm:row-start-1 sm:mt-0"
      >
        {desktopIconRows(DESKTOP_ROWS).map((row) => (
          <div key={row[0].id} className="flex gap-4">
            {row.map((entry) => (
              <DesktopIcon
                key={entry.id}
                entry={entry}
                texts={iconTexts(entry.id, texts)}
                selected={selection === entry.id}
                elementRef={registerIcon(entry.id)}
                onFocus={() => selectIcon(entry.id)}
                onPointerDown={handleIconPointerDown}
                onClick={(event) => handleIconClick(entry, event)}
                onDoubleClick={handleIconDoubleClick}
                onKeyDown={(event) => handleIconKeyDown(entry.id, event)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
