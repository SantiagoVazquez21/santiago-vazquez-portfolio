import {
  CLOUDS_LAYER_STYLE,
  HILLS_LAYER_STYLE,
  SKY_LAYER_STYLE,
  WALLPAPER_FALLBACK_STYLE,
} from "@/lib/wallpaper";

type WallpaperProps = {
  paused: boolean;
};

// Sky, drifting clouds and hills, in that order, under the icons and the windows
// (RF-1, RF-2). Purely decorative: hidden from assistive technology and from the
// pointer, so clicks still reach the desktop behind it (RF-5). The clouds move
// only with CSS; pausing freezes them where they are, and so does a reduced
// motion preference (plan 007, D1 and D5).
export function Wallpaper({ paused }: WallpaperProps) {
  return (
    <div
      aria-hidden={true}
      style={WALLPAPER_FALLBACK_STYLE}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div style={SKY_LAYER_STYLE} className="absolute inset-0" />
      <div
        style={CLOUDS_LAYER_STYLE}
        className={
          paused
            ? "absolute left-0 animate-clouds bg-repeat-x will-change-transform motion-reduce:[animation-play-state:paused] [animation-play-state:paused]"
            : "absolute left-0 animate-clouds bg-repeat-x will-change-transform motion-reduce:[animation-play-state:paused]"
        }
      />
      <div
        style={HILLS_LAYER_STYLE}
        className="absolute bottom-0 left-0 w-full"
      />
    </div>
  );
}
