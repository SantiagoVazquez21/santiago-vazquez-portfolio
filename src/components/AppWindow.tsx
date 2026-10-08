import {
  useId,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefCallback,
} from "react";
import type { Dictionary } from "@/i18n/types";
import { WINDOW_CONTROL_GLYPHS, type WindowId } from "@/lib/desktop-catalog";
import { iconGlyph } from "@/lib/desktop-icons";
import { isCloseKey } from "@/lib/window-controls";
import type { Rect } from "@/lib/window-geometry";

type AppWindowProps = {
  id: WindowId;
  title: string;
  texts: Dictionary["windows"];
  frame: Rect;
  zIndex: number;
  active: boolean;
  minimized: boolean;
  maximized: boolean;
  // False in fullscreen, where the title bar has no maximize or restore button (RF-12).
  maximizable: boolean;
  elementRef: RefCallback<HTMLElement>;
  onActivate: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  onHandlePointerDown: (event: PointerEvent<HTMLElement>) => void;
  onHandlePointerMove: (event: PointerEvent<HTMLElement>) => void;
  onHandlePointerEnd: (event: PointerEvent<HTMLElement>) => void;
  // The section's content, painted under its heading (spec 004, RF-1).
  children: ReactNode;
};

type TitleButtonProps = {
  label: string;
  glyph: string;
  onClick: () => void;
};

// Raised like the Windows 95 buttons, sunken while pressed. The dotted focus ring sits
// inside the bevel, so it never runs over the neighbouring button.
function TitleButton({ label, glyph, onClick }: TitleButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
    >
      <img
        src={glyph}
        alt=""
        width={16}
        height={16}
        draggable={false}
        className="h-4 w-4"
      />
    </button>
  );
}

// A non-modal dialog named by its title (RF-14). The window itself takes the focus
// (tabIndex -1), so a screen reader announces "<title>, dialog" and a click on any
// non-focusable part focuses it too (003 plan, section 6). pointer-events-auto takes back
// the events the window layer lets through (003 plan, section 1). The frame (2 px border
// plus 2 px padding) and the h-7 title bar add up to TITLE_BAR_HEIGHT. The dotted focus
// ring fills that grey padding, not the bevel: over the black bottom and right edges a
// black ring would not show (RNF-1).
// The title buttons sit outside the handle, so pressing them never starts a drag (RF-6).
// touch-none and select-none keep a drag on the handle from scrolling the page or
// selecting text (RF-6).
export function AppWindow({
  id,
  title,
  texts,
  frame,
  zIndex,
  active,
  minimized,
  maximized,
  maximizable,
  elementRef,
  onActivate,
  onMinimize,
  onToggleMaximize,
  onClose,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerEnd,
  children,
}: AppWindowProps) {
  const titleId = useId();

  // A held Escape repeats keydown and would close, one after another, every window
  // that takes the focus next (RF-8).
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.repeat || !isCloseKey(event.key)) return;
    event.preventDefault();
    onClose();
  }

  return (
    <div
      ref={elementRef}
      role="dialog"
      aria-modal={false}
      aria-labelledby={titleId}
      tabIndex={-1}
      hidden={minimized}
      onPointerDown={onActivate}
      onFocus={onActivate}
      onKeyDown={handleKeyDown}
      style={{
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
        zIndex,
      }}
      className="pointer-events-auto absolute flex flex-col border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] p-0.5 text-black focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-dotted"
    >
      <div
        className={
          active
            ? "flex h-7 shrink-0 items-center gap-1 bg-[#000080] px-1 text-white"
            : "flex h-7 shrink-0 items-center gap-1 bg-[#808080] px-1 text-black"
        }
      >
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerEnd}
          onPointerCancel={onHandlePointerEnd}
          className="flex h-full min-w-0 flex-1 touch-none items-center gap-1 select-none"
        >
          <img
            src={iconGlyph(id)}
            alt=""
            width={16}
            height={16}
            draggable={false}
            className="h-4 w-4 shrink-0"
          />
          <span id={titleId} className="truncate font-bold">
            {title}
          </span>
        </div>
        <TitleButton
          label={texts.minimize}
          glyph={WINDOW_CONTROL_GLYPHS.minimize}
          onClick={onMinimize}
        />
        {maximizable && (
          <TitleButton
            label={maximized ? texts.restore : texts.maximize}
            glyph={
              maximized
                ? WINDOW_CONTROL_GLYPHS.restore
                : WINDOW_CONTROL_GLYPHS.maximize
            }
            onClick={onToggleMaximize}
          />
        )}
        <TitleButton
          label={texts.close}
          glyph={WINDOW_CONTROL_GLYPHS.close}
          onClick={onClose}
        />
      </div>
      {/* A column, so a section can stretch over the blank rest of the body (spec 004, RF-8). */}
      <div className="mt-0.5 flex min-h-0 flex-1 flex-col overflow-y-auto border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white p-4 break-words">
        <h2 className="text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
