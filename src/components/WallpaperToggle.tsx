import type { KeyboardEvent } from "react";
import { WALLPAPER_TOGGLE_GLYPH } from "@/lib/wallpaper";

type WallpaperToggleProps = {
  paused: boolean;
  pauseName: string;
  resumeName: string;
  onToggle: () => void;
};

// Icon-only tray button, sunken while the wallpaper is paused, like the window buttons of
// spec 003. Its name and relief follow only the visitor's pause, never the reduced motion
// preference, so it does not claim a pause the visitor never asked for (RF-6, plan, D12).
// The name changes instead of exposing aria-pressed, as the Skills pause does (plan, D11).
export function WallpaperToggle({
  paused,
  pauseName,
  resumeName,
  onToggle,
}: WallpaperToggleProps) {
  const name = paused ? resumeName : pauseName;

  // A held Enter or Space repeats keydown; only the first press may toggle (RF-7).
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.repeat) event.preventDefault();
  }

  return (
    <button
      type="button"
      title={name}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className={
        paused
          ? "flex h-6 w-5 shrink-0 items-center justify-center border-2 border-t-black border-r-white border-b-white border-l-black bg-[#C0C0C0] text-black focus-visible:outline-1 focus-visible:-outline-offset-3 focus-visible:outline-black focus-visible:outline-dotted"
          : "flex h-6 w-5 shrink-0 items-center justify-center border-2 border-t-white border-r-black border-b-black border-l-white bg-[#C0C0C0] text-black focus-visible:outline-1 focus-visible:-outline-offset-3 focus-visible:outline-black focus-visible:outline-dotted"
      }
    >
      <img
        src={WALLPAPER_TOGGLE_GLYPH}
        alt=""
        width={16}
        height={16}
        draggable={false}
        className="h-4 w-4"
      />
      <span className="sr-only">{name}</span>
    </button>
  );
}
