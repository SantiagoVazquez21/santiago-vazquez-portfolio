import { describe, expect, it } from "vitest";
import {
  blendOver,
  contrastRatio,
  LOGO_FALLBACK,
  logoFill,
  NON_TEXT_CONTRAST_MIN,
  WINDOW_BODY_BACKGROUND,
} from "@/lib/color-contrast";

describe("constants", () => {
  it("use the white window body, black fallback and the WCAG 1.4.11 threshold", () => {
    expect(WINDOW_BODY_BACKGROUND).toBe("#FFFFFF");
    expect(LOGO_FALLBACK).toBe("#000000");
    expect(NON_TEXT_CONTRAST_MIN).toBe(3);
  });
});

describe("contrastRatio", () => {
  it("gives 21:1 between white and black", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });

  it("gives 1:1 between a color and itself", () => {
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#E34F26", "#FFFFFF")).toBe(
      contrastRatio("#FFFFFF", "#E34F26"),
    );
  });

  it("treats lowercase and uppercase hex the same", () => {
    expect(contrastRatio("#e34f26", "#ffffff")).toBe(
      contrastRatio("#E34F26", "#FFFFFF"),
    );
  });

  it.each(["E34F26", "#FFF", "#GGGGGG", "#FFFFFF0", "", " #FFFFFF"])(
    "throws on a color that is not #RRGGBB (%j)",
    (color) => {
      expect(() => contrastRatio(color, "#FFFFFF")).toThrow();
      expect(() => contrastRatio("#FFFFFF", color)).toThrow();
    },
  );
});

describe("logoFill", () => {
  it("draws JavaScript yellow (#F7DF1E, about 1.4:1) in black (RF-12)", () => {
    expect(logoFill("#F7DF1E")).toBe(LOGO_FALLBACK);
  });

  it("keeps HTML orange (#E34F26, about 3.9:1) (RF-12)", () => {
    expect(logoFill("#E34F26")).toBe("#E34F26");
  });

  it("keeps a color just above 3:1 (#949494)", () => {
    expect(contrastRatio("#949494", "#FFFFFF")).toBeGreaterThanOrEqual(3);
    expect(logoFill("#949494")).toBe("#949494");
  });

  it("turns black a color just below 3:1 (#959595)", () => {
    expect(contrastRatio("#959595", "#FFFFFF")).toBeLessThan(3);
    expect(logoFill("#959595")).toBe(LOGO_FALLBACK);
  });

  it("returns the brand color in uppercase", () => {
    expect(logoFill("#e34f26")).toBe("#E34F26");
  });

  it("uses the given background instead of the window body", () => {
    expect(logoFill("#F7DF1E", "#000000")).toBe("#F7DF1E");
  });

  it("throws on an invalid brand color", () => {
    expect(() => logoFill("F7DF1E")).toThrow();
  });
});

describe("blendOver", () => {
  it("returns the foreground with alpha 1", () => {
    expect(blendOver("#0A246A", 1, "#FFFFFF")).toBe("#0A246A");
  });

  it("returns the background with alpha 0", () => {
    expect(blendOver("#0A246A", 0, "#A9D3F5")).toBe("#A9D3F5");
  });

  it("paints black at 0.5 over white as #808080", () => {
    expect(blendOver("#000000", 0.5, "#FFFFFF")).toBe("#808080");
  });

  it("paints #0A246A at 0.75 over white as #475B8F (RF-11)", () => {
    expect(blendOver("#0A246A", 0.75, "#FFFFFF")).toBe("#475B8F");
  });

  it("returns an uppercase #RRGGBB color", () => {
    expect(blendOver("#0a246a", 0.75, "#ffffff")).toBe("#475B8F");
  });

  it("throws on a color that is not #RRGGBB", () => {
    expect(() => blendOver("#FFF", 0.5, "#FFFFFF")).toThrow();
    expect(() => blendOver("#FFFFFF", 0.5, "#FFF")).toThrow();
  });

  it.each([-0.1, 1.1, Number.NaN])(
    "throws on an alpha outside [0, 1] (%s)",
    (alpha) => {
      expect(() => blendOver("#000000", alpha, "#FFFFFF")).toThrow();
    },
  );
});
