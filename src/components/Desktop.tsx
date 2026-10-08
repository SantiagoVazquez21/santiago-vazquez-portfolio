"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { DesktopIcon } from "@/components/DesktopIcon";
import type { Dictionary } from "@/i18n/types";
import {
  DESKTOP_ICONS,
  type DesktopIconEntry,
  type IconId,
} from "@/lib/desktop-catalog";
import { iconTexts } from "@/lib/desktop-icons";
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

type DesktopProps = {
  home: Dictionary["home"];
  texts: Dictionary["desktop"];
};

// The area scrolls on its own so the taskbar, outside it, never covers the last icon (plan, D3).
// The title stays in the flow above the grid, never on top of the icons (plan, decision (a)).
// The grid's minimum column is capped at 100% so a single column still fits at high zoom (RF-14).
export function Desktop({ home, texts }: DesktopProps) {
  const [selection, setSelection] = useState<Selection>(null);
  // Refs instead of closest() or data-* attributes, which the text lint would flag (plan, D10).
  const iconElements = useRef(new Map<IconId, HTMLElement>());
  // Neither changes what is painted, so they live in refs, not in state.
  const openLog = useRef<OpenLog>({});
  // Read on pointerdown because Safari gives click no pointerType (plan, D6).
  const lastPointerType = useRef<string | null>(null);

  function updateSelection(event: SelectionEvent) {
    setSelection((current) => nextSelection(current, event));
  }

  function registerIcon(id: IconId) {
    return (element: HTMLElement | null) => {
      if (element === null) {
        iconElements.current.delete(id);
      } else {
        iconElements.current.set(id, element);
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
    // Window icons have nothing to open until spec 003 (RF-9).
    if (entry.href === null) return;
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
  // The taskbar lives outside <main>, so its clicks never reach this handler (RF-5).
  function handleAreaClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const icons = [...iconElements.current.values()];
    if (icons.some((icon) => icon.contains(target))) return;
    updateSelection({ target: null });
    const active = document.activeElement;
    if (active instanceof HTMLElement && icons.includes(active)) {
      active.blur();
    }
  }

  return (
    <main
      onClick={handleAreaClick}
      className="min-h-0 flex-1 overflow-y-auto bg-[#008080] px-4 py-6 text-white"
    >
      <div className="text-center break-words">
        <h1 className="text-2xl font-bold">{home.name}</h1>
        <p>{home.role}</p>
      </div>
      <div
        role="group"
        aria-label={texts.groupName}
        className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(6rem,100%),1fr))] gap-4"
      >
        {DESKTOP_ICONS.map((entry) => (
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
    </main>
  );
}
