import type { Dictionary } from "@/i18n/types";
import { DESKTOP_ICONS, type IconId } from "@/lib/desktop-catalog";

type DesktopTexts = Dictionary["desktop"];
type ActionNameKey = keyof DesktopTexts["actionNames"];

export type IconTexts = { label: string; ariaLabel: string | null };

// A full record forces a decision for every new IconId; null means the label
// alone already names the icon (window icons, RF-10).
const ACTION_NAME_KEYS: Readonly<Record<IconId, ActionNameKey | null>> = {
  projects: null,
  about: null,
  experience: null,
  skills: null,
  education: null,
  contact: null,
  resume: "resume",
  github: "github",
  linkedin: "linkedin",
};

// Texts come from the active language's dictionary, so the caller passes that one (RF-15).
export function iconTexts(id: IconId, texts: DesktopTexts): IconTexts {
  const actionKey = ACTION_NAME_KEYS[id];
  return {
    label: texts.labels[id],
    ariaLabel: actionKey === null ? null : texts.actionNames[actionKey],
  };
}

const GLYPHS: ReadonlyMap<IconId, string> = new Map(
  DESKTOP_ICONS.map((entry) => [entry.id, entry.glyphSrc]),
);

// Small glyph for the title bar and the taskbar window button (RF-3, RF-10).
export function iconGlyph(id: IconId): string {
  const glyph = GLYPHS.get(id);
  if (glyph === undefined) {
    throw new Error(`The catalog has no entry for icon "${id}".`);
  }
  return glyph;
}
