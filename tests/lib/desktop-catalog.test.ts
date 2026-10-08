import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as catalog from "@/lib/desktop-catalog";
import { DESKTOP_ICONS, type IconId } from "@/lib/desktop-catalog";

const PUBLIC_DIR = fileURLToPath(new URL("../../public", import.meta.url));

// Order of RF-2, read left to right and top to bottom.
const EXPECTED_ORDER: readonly IconId[] = [
  "projects",
  "about",
  "experience",
  "skills",
  "education",
  "contact",
  "resume",
  "github",
  "linkedin",
];

const WINDOW_IDS: readonly IconId[] = [
  "projects",
  "about",
  "experience",
  "skills",
  "education",
  "contact",
];

function entryFor(id: IconId) {
  const matches = DESKTOP_ICONS.filter((entry) => entry.id === id);
  expect(matches).toHaveLength(1);
  return matches[0];
}

function publicFileExists(publicPath: string): boolean {
  return existsSync(`${PUBLIC_DIR}${publicPath}`);
}

describe("DESKTOP_ICONS", () => {
  it("lists the 9 icons once each, in the order of RF-2", () => {
    const ids = DESKTOP_ICONS.map((entry) => entry.id);
    expect(ids).toEqual(EXPECTED_ORDER);
    expect(new Set(ids).size).toBe(9);
  });

  it("gives every icon its own glyph under /icons/", () => {
    const glyphs = DESKTOP_ICONS.map((entry) => entry.glyphSrc);
    expect(new Set(glyphs).size).toBe(DESKTOP_ICONS.length);
    for (const entry of DESKTOP_ICONS) {
      expect(entry.glyphSrc).toBe(`/icons/${entry.id}.svg`);
    }
  });

  it.each(EXPECTED_ORDER)("the glyph of %s exists in public/", (id) => {
    expect(publicFileExists(entryFor(id).glyphSrc)).toBe(true);
  });

  it("GitHub opens its exact profile URL in a new tab (RF-7)", () => {
    expect(entryFor("github")).toEqual({
      id: "github",
      glyphSrc: "/icons/github.svg",
      href: "https://github.com/SantiagoVazquez21",
      opensNewTab: true,
      downloadName: null,
    });
  });

  it("LinkedIn opens its exact profile URL in a new tab (RF-7)", () => {
    expect(entryFor("linkedin")).toEqual({
      id: "linkedin",
      glyphSrc: "/icons/linkedin.svg",
      href: "https://www.linkedin.com/in/santiago-vazquez-b266b3374/",
      opensNewTab: true,
      downloadName: null,
    });
  });

  it("the resume downloads the PDF with its fixed name, in the same tab (RF-8)", () => {
    expect(entryFor("resume")).toEqual({
      id: "resume",
      glyphSrc: "/icons/resume.svg",
      href: "/CV_SantiagoElianVazquez.pdf",
      opensNewTab: false,
      downloadName: "CV_SantiagoElianVazquez.pdf",
    });
  });

  it("the resume PDF exists in public/", () => {
    const href = entryFor("resume").href;
    expect(href).not.toBeNull();
    expect(publicFileExists(href ?? "")).toBe(true);
  });

  it.each(WINDOW_IDS)(
    "%s is a window icon: no destination, no new tab, no download (RF-9)",
    (id) => {
      expect(entryFor(id)).toEqual({
        id,
        glyphSrc: `/icons/${id}.svg`,
        href: null,
        opensNewTab: false,
        downloadName: null,
      });
    },
  );
});

describe("desktop-catalog module", () => {
  // Data only (plan, D7): logic lives in desktop-icons and desktop-selection.
  it("exports no functions", () => {
    const exported = Object.values(catalog);
    expect(exported.length).toBeGreaterThan(0);
    expect(exported.filter((value) => typeof value === "function")).toEqual([]);
  });
});
