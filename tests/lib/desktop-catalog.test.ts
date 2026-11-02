import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as catalog from "@/lib/desktop-catalog";
import {
  CONTACT_WINDOW_ID,
  DESKTOP_ICONS,
  DESKTOP_ROWS,
  GITHUB_URL,
  LINKEDIN_URL,
  RESUME_FILE_NAME,
  RESUME_HREF,
  WINDOW_CONTROL_GLYPHS,
  WINDOW_IDS,
  type IconId,
  type WindowId,
} from "@/lib/desktop-catalog";

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

const EXPECTED_WINDOW_IDS: readonly WindowId[] = [
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
      href: "https://www.linkedin.com/in/santiagoelianvazquez/",
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

  it.each(EXPECTED_WINDOW_IDS)(
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

describe("DESKTOP_ROWS (spec 012)", () => {
  it("is exactly the rows of RF-1, top to bottom", () => {
    expect(DESKTOP_ROWS).toEqual([
      ["projects"],
      ["experience"],
      ["about", "resume"],
      ["skills", "education"],
      ["contact"],
      ["github", "linkedin"],
    ]);
  });

  it("holds each of the 9 icons exactly once (RF-1)", () => {
    const ids = DESKTOP_ROWS.flat();
    expect(ids).toHaveLength(EXPECTED_ORDER.length);
    expect([...ids].sort()).toEqual([...EXPECTED_ORDER].sort());
  });

  it("has 1 or 2 icons in every row (RF-1)", () => {
    for (const row of DESKTOP_ROWS) {
      expect(row.length).toBeGreaterThanOrEqual(1);
      expect(row.length).toBeLessThanOrEqual(2);
    }
  });
});

describe("LINKEDIN_URL", () => {
  it("is the exact profile URL (spec 005, RF-8)", () => {
    expect(LINKEDIN_URL).toBe(
      "https://www.linkedin.com/in/santiagoelianvazquez/",
    );
  });

  it("is the destination of the LinkedIn icon (plan 005, D11)", () => {
    expect(entryFor("linkedin").href).toBe(LINKEDIN_URL);
  });
});

describe("shared destinations (spec 010)", () => {
  it("RESUME_HREF is the resume file at the public root (RF-7)", () => {
    expect(RESUME_FILE_NAME).toBe("CV_SantiagoElianVazquez.pdf");
    expect(RESUME_HREF).toBe(`/${RESUME_FILE_NAME}`);
  });

  it("the resume icon uses RESUME_HREF and RESUME_FILE_NAME (RF-7)", () => {
    const resume = entryFor("resume");
    expect(resume.href).toBe(RESUME_HREF);
    expect(resume.downloadName).toBe(RESUME_FILE_NAME);
  });

  it("GITHUB_URL is the exact profile URL (RF-8)", () => {
    expect(GITHUB_URL).toBe("https://github.com/SantiagoVazquez21");
  });

  it("the GitHub icon uses GITHUB_URL (RF-8)", () => {
    expect(entryFor("github").href).toBe(GITHUB_URL);
  });

  it("CONTACT_WINDOW_ID is a window id whose icon opens a window (RF-9)", () => {
    expect(WINDOW_IDS).toContain(CONTACT_WINDOW_ID);
    expect(entryFor(CONTACT_WINDOW_ID).href).toBeNull();
  });
});

describe("WINDOW_IDS", () => {
  it("lists the 6 window icons in the order of RF-2 (RF-1)", () => {
    expect(WINDOW_IDS).toEqual(EXPECTED_WINDOW_IDS);
  });

  it("is exactly the icons without a destination, in catalog order", () => {
    const withoutDestination = DESKTOP_ICONS.filter(
      (entry) => entry.href === null,
    ).map((entry) => entry.id);
    expect(WINDOW_IDS).toEqual(withoutDestination);
  });
});

describe("WINDOW_CONTROL_GLYPHS", () => {
  const CONTROLS = ["minimize", "maximize", "restore", "close"] as const;

  it("has one glyph per title bar button, and nothing else (RF-3)", () => {
    expect(Object.keys(WINDOW_CONTROL_GLYPHS).sort()).toEqual(
      [...CONTROLS].sort(),
    );
  });

  it.each(CONTROLS)(
    "the %s glyph lives under /icons/window-*.svg",
    (control) => {
      expect(WINDOW_CONTROL_GLYPHS[control]).toBe(
        `/icons/window-${control}.svg`,
      );
    },
  );

  it.each(CONTROLS)("the %s glyph exists in public/", (control) => {
    expect(publicFileExists(WINDOW_CONTROL_GLYPHS[control])).toBe(true);
  });

  it("the 4 glyphs are different drawings (RF-3)", () => {
    const paths = CONTROLS.map((control) => WINDOW_CONTROL_GLYPHS[control]);
    expect(new Set(paths).size).toBe(CONTROLS.length);
    const drawings = paths.map((path) =>
      readFileSync(`${PUBLIC_DIR}${path}`, "utf8"),
    );
    expect(new Set(drawings).size).toBe(CONTROLS.length);
  });
});

describe("desktop-catalog module", () => {
  // Data only (plan, D7): logic lives in desktop-icons and desktop-selection.
  it("exports no functions", () => {
    const exported = Object.values(catalog);
    expect(exported.length).toBeGreaterThan(0);
    expect(exported.filter((value) => typeof value === "function")).toEqual([]);
  });
});
