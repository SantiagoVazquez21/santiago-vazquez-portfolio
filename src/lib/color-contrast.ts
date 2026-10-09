// Window body color from spec 003: the background every skill logo is drawn on.
export const WINDOW_BODY_BACKGROUND = "#FFFFFF";
export const LOGO_FALLBACK = "#000000";
// WCAG 1.4.11 non-text contrast: logos are graphics, not text (RF-12).
export const NON_TEXT_CONTRAST_MIN = 3;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function channelLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function parseHex(color: string): [number, number, number] {
  if (!HEX_COLOR.test(color)) {
    throw new Error(`Expected a #RRGGBB color, got "${color}"`);
  }
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}

function relativeLuminance(color: string): number {
  const [red, green, blue] = parseHex(color);
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
}

export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

// A brand color too pale for the white body goes black instead of disappearing (RF-12).
export function logoFill(
  brandHex: string,
  background = WINDOW_BODY_BACKGROUND,
): string {
  return contrastRatio(brandHex, background) >= NON_TEXT_CONTRAST_MIN
    ? brandHex.toUpperCase()
    : LOGO_FALLBACK;
}

// Solid color seen when a translucent backing is painted over the wallpaper (RF-11).
export function blendOver(
  foreground: string,
  alpha: number,
  background: string,
): string {
  if (!(alpha >= 0 && alpha <= 1)) {
    throw new Error(`Expected an alpha between 0 and 1, got ${alpha}`);
  }
  const front = parseHex(foreground);
  const back = parseHex(background);
  const channels = front.map((channel, index) =>
    Math.round(alpha * channel + (1 - alpha) * back[index]),
  );
  return `#${channels
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}
