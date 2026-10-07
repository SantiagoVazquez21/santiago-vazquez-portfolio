export const SUPPORTED_LANGS = ["es", "en"] as const;

export type Lang = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_LANG: Lang = "es";

export type SegmentClass =
  | { kind: "supported"; lang: Lang }
  | { kind: "normalizable"; lang: Lang }
  | { kind: "unsupported" }
  | { kind: "notLanguage" };

// Two ASCII letters, optionally followed by "-" and a two-letter region, in any case.
const LANG_SHAPE = /^[A-Za-z]{2}(-[A-Za-z]{2})?$/;

export function isSupportedLang(value: string): value is Lang {
  return SUPPORTED_LANGS.some((lang) => lang === value);
}

export function classifySegment(segment: string): SegmentClass {
  if (isSupportedLang(segment)) {
    return { kind: "supported", lang: segment };
  }
  if (!LANG_SHAPE.test(segment)) {
    return { kind: "notLanguage" };
  }
  const base = segment.slice(0, 2).toLowerCase();
  if (isSupportedLang(base)) {
    return { kind: "normalizable", lang: base };
  }
  return { kind: "unsupported" };
}

export function langFromSegment(segment: string): Lang | null {
  const segmentClass = classifySegment(segment);
  return segmentClass.kind === "supported" ? segmentClass.lang : null;
}

// Normalizable variants also fall back: only an exact supported segment sets the language.
export function langForSegment(segment: string): Lang {
  return langFromSegment(segment) ?? DEFAULT_LANG;
}
