import { describe, expect, it } from "vitest";
import {
  classifySegment,
  DEFAULT_LANG,
  isSupportedLang,
  langForSegment,
  langFromSegment,
  type SegmentClass,
  SUPPORTED_LANGS,
} from "@/lib/locale";

// RF-41 (a): the 16 required segments with their expected class.
const SEGMENT_CASES: ReadonlyArray<readonly [string, SegmentClass]> = [
  ["es", { kind: "supported", lang: "es" }],
  ["en", { kind: "supported", lang: "en" }],
  ["EN", { kind: "normalizable", lang: "en" }],
  ["Es", { kind: "normalizable", lang: "es" }],
  ["en-US", { kind: "normalizable", lang: "en" }],
  ["en-us", { kind: "normalizable", lang: "en" }],
  ["es-CL", { kind: "normalizable", lang: "es" }],
  ["ES-cl", { kind: "normalizable", lang: "es" }],
  ["fr", { kind: "unsupported" }],
  ["pt-BR", { kind: "unsupported" }],
  ["es-419", { kind: "notLanguage" }],
  ["en-Latn-US", { kind: "notLanguage" }],
  ["en_US", { kind: "notLanguage" }],
  ["esp", { kind: "notLanguage" }],
  ["proyectos", { kind: "notLanguage" }],
  ["", { kind: "notLanguage" }],
];

describe("SUPPORTED_LANGS", () => {
  it("lists exactly es and en, in that order", () => {
    expect(SUPPORTED_LANGS).toEqual(["es", "en"]);
  });
});

describe("DEFAULT_LANG", () => {
  it("is es", () => {
    expect(DEFAULT_LANG).toBe("es");
  });

  it("is one of the supported languages", () => {
    expect(SUPPORTED_LANGS).toContain(DEFAULT_LANG);
  });
});

describe("isSupportedLang", () => {
  it.each(["es", "en"])("accepts %j", (value) => {
    expect(isSupportedLang(value)).toBe(true);
  });

  it.each([
    "EN",
    "Es",
    "en-US",
    "es-CL",
    "fr",
    "pt-BR",
    "es-419",
    "en_US",
    "esp",
    "proyectos",
    "",
    " es",
    "es ",
  ])("rejects %j", (value) => {
    expect(isSupportedLang(value)).toBe(false);
  });
});

describe("classifySegment", () => {
  it("covers exactly the 16 segments of RF-41 (a)", () => {
    expect(SEGMENT_CASES).toHaveLength(16);
  });

  it.each(SEGMENT_CASES)("classifies %j as %j", (segment, expected) => {
    expect(classifySegment(segment)).toEqual(expected);
  });
});

describe("langFromSegment", () => {
  it.each(["es", "en"] as const)(
    "returns %j for a supported segment",
    (segment) => {
      expect(langFromSegment(segment)).toBe(segment);
    },
  );

  it.each(
    SEGMENT_CASES.filter(([, expected]) => expected.kind !== "supported").map(
      ([segment]) => segment,
    ),
  )("returns null for %j", (segment) => {
    expect(langFromSegment(segment)).toBeNull();
  });
});

describe("langForSegment", () => {
  it.each(["es", "en"] as const)(
    "returns %j for a supported segment",
    (segment) => {
      expect(langForSegment(segment)).toBe(segment);
    },
  );

  it.each(
    SEGMENT_CASES.filter(([, expected]) => expected.kind !== "supported").map(
      ([segment]) => segment,
    ),
  )("falls back to the default language for %j", (segment) => {
    expect(langForSegment(segment)).toBe(DEFAULT_LANG);
  });

  it("falls back to es, not to the language of a normalizable variant", () => {
    expect(langForSegment("EN")).toBe("es");
    expect(langForSegment("en-US")).toBe("es");
  });
});
