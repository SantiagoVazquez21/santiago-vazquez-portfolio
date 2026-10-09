import { blendOver, contrastRatio } from "@/lib/color-contrast";

export const WALLPAPER_SKY_SRC = "/wallpaper/sky.svg";
export const WALLPAPER_HILL_SRC = "/wallpaper/hill.svg";
export const WALLPAPER_CLOUDS_SRC = "/wallpaper/clouds.svg";
export const WALLPAPER_TOGGLE_GLYPH = "/icons/cloud.svg";

// Owner's choice for spec 007 (doubt 2a): every wallpaper SVG may only use these colors.
export const WALLPAPER_PALETTE = {
  skyTop: "#2F6FD0",
  skyBottom: "#A9D3F5",
  hill: "#5DB043",
  hillBack: "#3E8E2F",
  cloud: "#FFFFFF",
  cloudShade: "#E3EEF8",
} as const;

// Fixed on-screen width of the cloud tile, which is also how far one loop
// moves, so the loop closes the same way on any screen (plan 007, D4 and D16).
export const CLOUD_TILE_WIDTH = 1600;
// Height of the tile's viewBox and the tallest the cloud strip ever gets.
export const CLOUD_TILE_HEIGHT = 240;
// Owner's choice (doubt 2c): one tile every 200 s is 8 px/s.
export const CLOUD_LOOP_SECONDS = 200;
// Fastest the clouds may drift and still read as "slow" (RF-4), in px/s.
export const CLOUD_SPEED_MAX = 10;

// Percentages of the desktop height. The strip ends by 32 % and the hills start
// at 62 %, so the clouds stay in the top third and never pass behind the hills
// on any screen (RF-3 b, plan 007, D16).
export const CLOUDS_TOP_PERCENT = 4;
export const CLOUDS_HEIGHT_PERCENT = 28;
export const HILLS_HEIGHT_PERCENT = 38;

// If a drawing fails to load, a plain sky keeps the text readable.
export const WALLPAPER_FALLBACK_STYLE = {
  backgroundColor: WALLPAPER_PALETTE.skyBottom,
};

// The tile keeps its width in px whatever the screen, so moving the layer by
// one tile always closes the loop at the same speed; only its height follows
// the strip (plan 007, D4 and D16). The extra tile of width covers the gap the
// translation leaves on the right.
export const CLOUDS_LAYER_STYLE = {
  backgroundImage: `url("${WALLPAPER_CLOUDS_SRC}")`,
  backgroundSize: `${CLOUD_TILE_WIDTH}px 100%`,
  top: `${CLOUDS_TOP_PERCENT}%`,
  height: `min(${CLOUD_TILE_HEIGHT}px, ${CLOUDS_HEIGHT_PERCENT}%)`,
  width: `calc(100% + ${CLOUD_TILE_WIDTH}px)`,
};

export const HILLS_LAYER_STYLE = { height: `${HILLS_HEIGHT_PERCENT}%` };

export const DESKTOP_TEXT = "#FFFFFF";
// Owner's choice (doubt 2b): without this backing, white text drops to about
// 1.6:1 on the horizon and 1:1 on a cloud (RF-11).
export const LABEL_BACKING = "#0A246A";
export const LABEL_BACKING_ALPHA = 0.75;
// WCAG 1.4.3 text contrast (RF-11).
export const TEXT_CONTRAST_MIN = 4.5;
export const FOCUS_RING_COLORS = ["#FFFFFF", "#000000"] as const;

export function labelContrast(behind: string): number {
  return contrastRatio(
    DESKTOP_TEXT,
    blendOver(LABEL_BACKING, LABEL_BACKING_ALPHA, behind),
  );
}

// The double ring stays visible as long as one of its two colors stands out
// from what surrounds it (RF-12).
export function focusRingContrast(behind: string): number {
  return Math.max(
    ...FOCUS_RING_COLORS.map((ring) => contrastRatio(ring, behind)),
  );
}
