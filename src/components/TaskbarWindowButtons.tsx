import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Dictionary } from "@/i18n/types";
import type { WindowId } from "@/lib/desktop-catalog";
import { iconGlyph } from "@/lib/desktop-icons";
import {
  TASKBAR_BUTTON_VARIANT,
  TASKBAR_ICON_BUTTON_WIDTH,
  iconOnlyRowWidth,
  taskbarButtonVariant,
} from "@/lib/window-controls";
import type { LayoutMode } from "@/lib/window-geometry";

type TaskbarWindowButtonsProps = {
  // Opening order, which is also the Tab order (RF-10, RF-14).
  ids: readonly WindowId[];
  active: WindowId | null;
  mode: LayoutMode;
  labels: Dictionary["desktop"]["labels"];
  groupName: string;
  buttonElements: Map<WindowId, HTMLElement>;
  onPress: (id: WindowId) => void;
};

// One button per open window, named by its section label (RF-10, RF-15). The active
// window's button is sunken and exposes aria-pressed, so its state is not told by colour
// alone (003 plan, section 6). The dotted focus ring sits inside the bevel, so the group
// can clip its overflow without hiding it.
// The group's declared width is what the open windows need as icon-only buttons and grow
// gives it the rest of its line, so its size never depends on the variant it shows and the
// choice cannot flip back and forth (RF-13). An invisible labeled copy gives the width the
// labeled buttons would take; when it is wider than the group, they show only the glyph.
export function TaskbarWindowButtons({
  ids,
  active,
  mode,
  labels,
  groupName,
  buttonElements,
  onPress,
}: TaskbarWindowButtonsProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const [labeled, setLabeled] = useState<number | null>(null);

  // Layout effect: the first measurement lands before the first paint, so opening a window
  // in a narrow taskbar never shows the clipped labeled buttons.
  useLayoutEffect(() => {
    const group = groupRef.current;
    const copy = copyRef.current;
    if (group === null || copy === null) return;
    setAvailable(group.getBoundingClientRect().width);
    setLabeled(copy.getBoundingClientRect().width);
    // flushSync renders the new variant before this frame is painted, so opening one more
    // window or narrowing the browser never shows a frame of clipped labeled buttons.
    const observer = new ResizeObserver((entries) => {
      flushSync(() => {
        for (const entry of entries) {
          if (entry.target === group) setAvailable(entry.contentRect.width);
          if (entry.target === copy) setLabeled(entry.contentRect.width);
        }
      });
    });
    observer.observe(group);
    observer.observe(copy);
    return () => observer.disconnect();
  }, []);

  const variant = taskbarButtonVariant(mode, available, labeled);
  const iconOnly = variant === TASKBAR_BUTTON_VARIANT.iconOnly;

  // A Map of elements, as for the icons, so a transition can send the focus here (RF-9).
  function registerButton(id: WindowId) {
    return (element: HTMLElement | null) => {
      if (element === null) {
        buttonElements.delete(id);
      } else {
        buttonElements.set(id, element);
      }
    };
  }

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label={groupName}
      style={{ width: iconOnlyRowWidth(ids.length) }}
      className="relative flex min-w-0 shrink-0 grow items-center gap-px overflow-hidden"
    >
      {ids.map((id) => (
        <button
          key={id}
          ref={registerButton(id)}
          type="button"
          aria-pressed={active === id}
          onClick={() => onPress(id)}
          style={iconOnly ? { width: TASKBAR_ICON_BUTTON_WIDTH } : undefined}
          className={
            iconOnly
              ? active === id
                ? "flex h-6 shrink-0 items-center justify-center border-2 border-t-black border-r-white border-b-white border-l-black bg-[#C0C0C0] text-black focus-visible:outline-1 focus-visible:-outline-offset-3 focus-visible:outline-black focus-visible:outline-dotted"
                : "flex h-6 shrink-0 items-center justify-center border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] text-black focus-visible:outline-1 focus-visible:-outline-offset-3 focus-visible:outline-black focus-visible:outline-dotted"
              : active === id
                ? "flex h-6 shrink-0 items-center gap-1 border-2 border-t-black border-r-white border-b-white border-l-black bg-[#C0C0C0] px-1 whitespace-nowrap text-black focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted"
                : "flex h-6 shrink-0 items-center gap-1 border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] px-1 whitespace-nowrap text-black focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted"
          }
        >
          <img
            src={iconGlyph(id)}
            alt=""
            width={16}
            height={16}
            draggable={false}
            className="h-4 w-4 shrink-0"
          />
          {/* Icon-only, the label stays in the accessibility tree as the button's name. */}
          <span className={iconOnly ? "sr-only" : undefined}>{labels[id]}</span>
        </button>
      ))}
      {/* Spans, not buttons, so the copy never takes the focus; w-max keeps the group's width from squeezing it. */}
      <div
        ref={copyRef}
        aria-hidden={true}
        className="pointer-events-none invisible absolute top-0 left-0 flex w-max items-center gap-px"
      >
        {ids.map((id) => (
          <span
            key={id}
            className="flex h-6 shrink-0 items-center gap-1 border-2 px-1 whitespace-nowrap"
          >
            <span className="block h-4 w-4 shrink-0" />
            <span>{labels[id]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
