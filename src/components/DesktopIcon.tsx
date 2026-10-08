import type {
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  RefCallback,
} from "react";
import type { DesktopIconEntry } from "@/lib/desktop-catalog";
import type { IconTexts } from "@/lib/desktop-icons";

type DesktopIconProps = {
  entry: DesktopIconEntry;
  texts: IconTexts;
  selected: boolean;
  elementRef: RefCallback<HTMLElement>;
  onFocus: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onDoubleClick: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

// Native <a>/<button> give the role, the name and Enter for free (plan, D1). select-none keeps
// a double click from highlighting the label, and draggable={false} keeps a drag from carrying
// the link or the image away, since moving icons is out of scope. The white focus outline
// (4.8:1 on the teal) wraps the whole icon, so keyboard focus reads apart from the selected
// label (RF-10); max-w-full lets the icon shrink with the grid at high zoom (RF-14).
export function DesktopIcon({
  entry,
  texts,
  selected,
  elementRef,
  onFocus,
  onPointerDown,
  onClick,
  onDoubleClick,
  onKeyDown,
}: DesktopIconProps) {
  const content = (
    <>
      <img
        src={entry.glyphSrc}
        alt=""
        width={48}
        height={48}
        draggable={false}
        className="h-12 w-12"
      />
      {/* The selected label is told apart by the dotted border too, not only by color (RF-4). */}
      <span
        className={
          selected
            ? "max-w-full border border-dotted border-white bg-[#000080] px-1 break-words text-white"
            : "max-w-full border border-transparent px-1 break-words"
        }
      >
        {texts.label}
      </span>
    </>
  );

  if (entry.href === null) {
    return (
      <button
        ref={elementRef}
        type="button"
        onFocus={onFocus}
        onPointerDown={onPointerDown}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
        className="flex w-24 max-w-full flex-col items-center gap-1 justify-self-center p-1 text-center text-sm select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {content}
      </button>
    );
  }

  return (
    <a
      ref={elementRef}
      href={entry.href}
      aria-label={texts.ariaLabel ?? undefined}
      // Without opener or referrer the new tab cannot steer or redirect the portfolio (RF-7).
      target={entry.opensNewTab ? "_blank" : undefined}
      rel={entry.opensNewTab ? "noopener noreferrer" : undefined}
      download={entry.downloadName ?? undefined}
      draggable={false}
      onFocus={onFocus}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className="flex w-24 max-w-full flex-col items-center gap-1 justify-self-center p-1 text-center text-sm select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {content}
    </a>
  );
}
