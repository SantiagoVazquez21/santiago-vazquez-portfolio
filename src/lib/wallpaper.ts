import { blendOver, contrastRatio } from "@/lib/color-contrast";

export const WALLPAPER_SKY_SRC = "/wallpaper/sky.svg";
export const WALLPAPER_HILL_SRC = "/wallpaper/hill.svg";
export const WALLPAPER_HILL_BACK_SRC = "/wallpaper/hill-back.svg";
export const WALLPAPER_CLOUDS_SRC = "/wallpaper/clouds.svg";
export const WALLPAPER_TOGGLE_GLYPH = "/icons/cloud.svg";

// Closed pixel art palette (spec 012, RF-8): every wallpaper SVG may only use
// these colors. All of them are darker than white, so the label backing and the
// focus ring keep their contrast over each one (RF-10).
export const WALLPAPER_PALETTE = {
  skyTop: "#2F6FD0",
  skyHigh: "#4A86DA",
  skyMid: "#6A9FE3",
  skyLow: "#8BBAEC",
  skyBottom: "#A9D3F5",
  hillBack: "#3E8E2F",
  hill: "#5DB043",
  hillLight: "#7CC95A",
  cloudShade: "#E3EEF8",
  cloud: "#FFFFFF",
} as const;

// Side of one drawing pixel. Every layer shows its SVG at its own size, so one
// drawing unit is one CSS px and the pixel is the same on any screen (plan 012, D5).
export const WALLPAPER_PIXEL = 4;
// Narrow tile repeated sideways: its two 4 px dithering columns turn into a
// checkerboard (plan 012, D4).
export const SKY_TILE = { width: 8, height: 480 } as const;
export const HILL_TILE = { width: 3840, height: 320 } as const;
// In every column one of the two hills reaches this close to the top of its
// drawing, so a layer cut down on short desktops still shows green edge to edge.
export const HILL_RELIEF = 112;
// The front hill's peak sits at this share of its drawing, which lands it in
// the right third of any screen when the layer is placed at the same percentage.
export const HILL_FRONT_ANCHOR_PERCENT = 75;

// Fixed on-screen width of the cloud tile, which is also how far one loop
// moves, so the loop closes the same way on any screen (plan 007, D4 and D16).
export const CLOUD_TILE_WIDTH = 1600;
// Height of the tile and of the cloud strip, which shows it at its own size
// (plan 012, D5).
export const CLOUD_TILE_HEIGHT = 128;
// Owner's choice (doubt 2c): one tile every 200 s is 8 px/s.
export const CLOUD_LOOP_SECONDS = 200;
// Fastest the clouds may drift and still read as "slow" (RF-4), in px/s.
export const CLOUD_SPEED_MAX = 10;

// Percentages of the desktop height. With the strip 128 px high from 4 % and
// the hills at most 38 %, the clouds end above the hills on desktops 300 to
// 2160 px high, and in the top third from 440 px (spec 012, RF-9).
export const CLOUDS_TOP_PERCENT = 4;
export const HILLS_HEIGHT_PERCENT = 38;

// If a drawing fails to load, a plain sky keeps the text readable.
export const WALLPAPER_FALLBACK_STYLE = {
  backgroundColor: WALLPAPER_PALETTE.skyBottom,
};

// The narrow tile at its own size, repeated only sideways: below its 480 px the
// fallback color, its last band, carries on as a plain sky (plan 012, section 5).
export const SKY_LAYER_STYLE = {
  backgroundImage: `url("${WALLPAPER_SKY_SRC}")`,
  backgroundRepeat: "repeat-x",
};

// The tile at its own size whatever the screen, so its pixels match the other
// layers and moving the layer by one tile always closes the loop at the same
// speed (plan 007, D4; plan 012, D5). The extra tile of width covers the gap
// the translation leaves on the right.
export const CLOUDS_LAYER_STYLE = {
  backgroundImage: `url("${WALLPAPER_CLOUDS_SRC}")`,
  backgroundSize: `${CLOUD_TILE_WIDTH}px ${CLOUD_TILE_HEIGHT}px`,
  top: `${CLOUDS_TOP_PERCENT}%`,
  height: `${CLOUD_TILE_HEIGHT}px`,
  width: `calc(100% + ${CLOUD_TILE_WIDTH}px)`,
};

// Both hills at their own size, anchored to the top of a layer that sits on the
// bottom edge: a short desktop only loses plain green from the bottom. The first
// image is painted on top (plan 012, section 5 and D5).
export const HILLS_LAYER_STYLE = {
  backgroundImage: `url("${WALLPAPER_HILL_SRC}"), url("${WALLPAPER_HILL_BACK_SRC}")`,
  backgroundPosition: `${HILL_FRONT_ANCHOR_PERCENT}% 0, 0 0`,
  backgroundRepeat: "no-repeat",
  height: `min(${HILL_TILE.height}px, ${HILLS_HEIGHT_PERCENT}%)`,
};

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
